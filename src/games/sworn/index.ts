// Pack SWORN validé au chargement : une donnée cassée fait échouer les tests (HANDOFF §4.5).
import { loadPack, type Pack } from "@rogue/core";
import packJson from "./pack.json";

export const swornPack: Pack = loadPack(packJson);
