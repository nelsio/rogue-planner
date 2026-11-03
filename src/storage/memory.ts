// Stockage en mémoire : repli quand IndexedDB est refusé, et base des tests.
import { BuildSchema, CustomItemSchema, RunSchema } from "@rogue/core";
import { readPrefs, readValid, type LibraryStore, type Prefs, type PrefsStore, type Storage } from "./types";

function table<T extends { id: string }>() {
  const rows = new Map<string, T>();
  return {
    // Copies profondes, comme IndexedDB : l'appelant ne partage jamais d'objet avec le magasin.
    list: () => [...rows.values()].map((r) => structuredClone(r)),
    put: async (row: T) => void rows.set(row.id, structuredClone(row)),
    remove: async (id: string) => void rows.delete(id),
  };
}

export function memoryLibrary(): LibraryStore {
  const builds = table<{ id: string }>();
  const runs = table<{ id: string }>();
  const custom = table<{ id: string }>();
  return {
    listBuilds: async () => readValid(BuildSchema, builds.list(), "Build"),
    putBuild: builds.put,
    removeBuild: builds.remove,
    listRuns: async () => readValid(RunSchema, runs.list(), "Run"),
    putRun: runs.put,
    removeRun: runs.remove,
    listCustom: async () => readValid(CustomItemSchema, custom.list(), "Bénédiction ajoutée"),
    putCustom: custom.put,
    removeCustom: custom.remove,
  };
}

export function memoryPrefs(): PrefsStore {
  let prefs: Record<string, unknown> = {};
  return {
    get: async () => readPrefs(prefs),
    set: async (patch: Partial<Prefs>) => {
      prefs = Object.fromEntries(
        Object.entries({ ...prefs, ...patch }).filter(([key]) => !(key in patch) || patch[key as keyof Prefs] !== undefined),
      );
    },
  };
}

export function memoryStorage(): Storage {
  return { kind: "memory", library: memoryLibrary(), prefs: memoryPrefs() };
}
