// Moteur pur (sans DOM ni React) : schémas, prérequis, duos, progression, fusion d'import.
// Il ne connaît aucun nom propre de jeu : tout vient du pack.
export {
  getItem, itemIndex, loadPack, PackFormatError, PackSchema, withCustom, ITEM_KINDS,
  type Alternative, type Item, type ItemKind, type Pack, type SlotId,
} from "./pack";
export {
  BuildSchema, CustomItemSchema, RunSchema,
  type Build, type CustomItem, type Library, type Prio, type Run,
} from "./schemas";
export { buildOwned, isUnlocked, missing, reachableDuos } from "./requires";
export { applyPick, runProgress, toggleTarget, type RunProgress, type SlotProgress } from "./progress";
export { EXPORT_FORMAT, mergeImport, type MergeResult } from "./import";
export { z, type FieldError } from "./zod";
