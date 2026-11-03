// Démarrage : stockage, exemples du premier lancement, persistance, état initial.
import { loadExamples, openStorage, requestPersistence, type OpenOptions, type Storage } from "../storage";
import { initialState, type AppState } from "./state";

export async function boot(examples: unknown, opts?: OpenOptions): Promise<{ storage: Storage; initial: AppState }> {
  const storage = await openStorage(opts);
  await loadExamples(storage, examples);
  // Sans attendre : le navigateur peut demander l'avis du joueur.
  void requestPersistence(storage);
  const lib = storage.library;
  const [builds, runs, custom, prefs] = await Promise.all([lib.listBuilds(), lib.listRuns(), lib.listCustom(), storage.prefs.get()]);
  return { storage, initial: initialState({ builds, runs, custom }, prefs) };
}
