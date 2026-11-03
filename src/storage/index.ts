// Ouverture du stockage, repli en mémoire, persistance et exemples du premier lancement.
import { mergeImport } from "@rogue/core";
import { indexedDbStorage, openDatabase } from "./indexeddb";
import { memoryStorage } from "./memory";
import type { Storage } from "./types";

export { memoryLibrary, memoryPrefs, memoryStorage } from "./memory";
export { DB_NAME, indexedDbStorage, openDatabase } from "./indexeddb";
export * from "./types";

export const OPEN_TIMEOUT_MS = 3000;

export interface OpenOptions {
  /** Par défaut : `globalThis.indexedDB`. */
  factory?: IDBFactory | null;
  timeoutMs?: number;
}

/** IndexedDB, ou repli en mémoire si absent, en erreur ou sans réponse dans le délai. */
export async function openStorage(opts: OpenOptions = {}): Promise<Storage> {
  const factory = opts.factory === undefined ? globalThis.indexedDB : opts.factory;
  if (!factory) return memoryStorage();
  const timeoutMs = opts.timeoutMs ?? OPEN_TIMEOUT_MS;
  const opening = openDatabase(factory);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>((resolve) => (timer = setTimeout(() => resolve(null), timeoutMs)));
  try {
    const db = await Promise.race([opening, timeout]);
    if (db) return indexedDbStorage(db);
    // Trop tard : si la base finit par s'ouvrir, on la referme.
    opening.then((late) => late.close(), () => undefined);
    console.warn("IndexedDB ne répond pas : stockage en mémoire.");
  } catch (e) {
    console.warn("IndexedDB indisponible : stockage en mémoire.", e);
  } finally {
    clearTimeout(timer);
  }
  return memoryStorage();
}

/** Demande une fois la persistance du stockage ; un refus est silencieux. */
export async function requestPersistence(storage: Storage, manager: StorageManager | undefined = globalThis.navigator?.storage) {
  if (storage.kind !== "indexeddb") return;
  const prefs = await storage.prefs.get();
  if (prefs.persistRequested) return;
  try {
    await manager?.persist?.();
  } catch {
    // Refus ou API absente : rien à signaler.
  }
  await storage.prefs.set({ persistRequested: true });
}

/** Au premier lancement, une bibliothèque vide reçoit les exemples (export au format Rogue Planner). */
export async function loadExamples(storage: Storage, examples: unknown): Promise<boolean> {
  const prefs = await storage.prefs.get();
  if (prefs.examplesLoaded) return false;
  const { library } = storage;
  const [builds, runs] = await Promise.all([library.listBuilds(), library.listRuns()]);
  let loaded = false;
  if (builds.length === 0 && runs.length === 0) {
    const res = mergeImport({ builds: [], runs: [], custom: [] }, examples);
    if (!res.ok) throw new Error(`Exemples invalides : ${res.errors.map((e) => `${e.path} : ${e.message}`).join(" ; ")}`);
    await Promise.all([
      ...res.library.builds.map((b) => library.putBuild(b)),
      ...res.library.runs.map((r) => library.putRun(r)),
      ...res.library.custom.map((c) => library.putCustom(c)),
    ]);
    loaded = true;
  }
  await storage.prefs.set({ examplesLoaded: true });
  return loaded;
}
