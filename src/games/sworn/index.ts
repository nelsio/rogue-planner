// Pack SWORN validé au chargement : une donnée cassée fait échouer les tests (HANDOFF §4.5).
import { loadPack, type Pack } from "@rogue/core";
import packJson from "./pack.json";
import examplesJson from "./examples.json";

export const swornPack: Pack = loadPack(packJson);

/** Deux builds et un run d'exemple, repris du prototype, chargés au premier lancement. */
export const swornExamples: unknown = examplesJson;
