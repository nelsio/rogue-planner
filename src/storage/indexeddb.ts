// Stockage IndexedDB : base « rogue-planner », magasins builds, runs, custom (clé id) et prefs (clé = nom).
import { wrap, type DBSchema, type IDBPDatabase } from "idb";
import { BuildSchema, CustomItemSchema, RunSchema, type Build, type CustomItem, type Run } from "@rogue/core";
import { readPrefs, readValid, type LibraryStore, type Prefs, type PrefsStore, type Storage } from "./types";

export const DB_NAME = "rogue-planner";
const DB_VERSION = 1;

interface PlannerDB extends DBSchema {
  builds: { key: string; value: Build };
  runs: { key: string; value: Run };
  custom: { key: string; value: CustomItem };
  prefs: { key: string; value: unknown };
}

/** Ouvre la base sur la fabrique fournie (globale dans le navigateur, fake-indexeddb en test). */
export async function openDatabase(factory: IDBFactory): Promise<IDBPDatabase<PlannerDB>> {
  const request = factory.open(DB_NAME, DB_VERSION);
  request.onupgradeneeded = () => {
    const db = request.result;
    for (const name of ["builds", "runs", "custom"]) {
      if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath: "id" });
    }
    if (!db.objectStoreNames.contains("prefs")) db.createObjectStore("prefs");
  };
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    request.onsuccess = () => {
      // Une autre page demande une mise à niveau ou la suppression de la base : on la libère.
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
    request.onerror = () => reject(request.error);
  });
  return wrap(db) as unknown as IDBPDatabase<PlannerDB>;
}

export function indexedDbStorage(db: IDBPDatabase<PlannerDB>): Storage {
  const library: LibraryStore = {
    listBuilds: async () => readValid(BuildSchema, await db.getAll("builds"), "Build"),
    putBuild: async (b) => void (await db.put("builds", b)),
    removeBuild: (id) => db.delete("builds", id),
    listRuns: async () => readValid(RunSchema, await db.getAll("runs"), "Run"),
    putRun: async (r) => void (await db.put("runs", r)),
    removeRun: (id) => db.delete("runs", id),
    listCustom: async () => readValid(CustomItemSchema, await db.getAll("custom"), "Bénédiction ajoutée"),
    putCustom: async (c) => void (await db.put("custom", c)),
    removeCustom: (id) => db.delete("custom", id),
  };
  const prefs: PrefsStore = {
    async get() {
      const tx = db.transaction("prefs");
      const [keys, values] = await Promise.all([tx.store.getAllKeys(), tx.store.getAll()]);
      return readPrefs(Object.fromEntries(keys.map((k, i) => [k, values[i]])));
    },
    async set(patch: Partial<Prefs>) {
      const tx = db.transaction("prefs", "readwrite");
      await Promise.all([
        ...Object.entries(patch).map(([key, value]) => (value === undefined ? tx.store.delete(key) : tx.store.put(value, key))),
        tx.done,
      ]);
    },
  };
  return { kind: "indexeddb", library, prefs };
}
