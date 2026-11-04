// Révision 2 : ordre d'acquisition et pas à pas (§4.6), totaux par fae (§4.7), potions (§4.8).
import type { Pack } from "./pack";
import type { Build, Run } from "./schemas";

/** Plan par défaut : aptitudes dans l'ordre des emplacements, puis visées dans l'ordre d'ajout ; inconnues ignorées. */
function defaultPlan(pack: Pack, build: Build): string[] {
  const abilities = pack.slots.map((s) => build.abilities[s.id]).filter((id): id is string => !!id);
  const ids = new Set([...abilities, ...build.targets.map((t) => t.id)]);
  return [...ids].filter((id) => pack.byId.has(id));
}

/** Ordre choisi (limité au plan), puis les éléments du plan qui n'y figurent pas encore. */
export function planOrder(pack: Pack, build: Build): string[] {
  const plan = defaultPlan(pack, build);
  const inPlan = new Set(plan);
  const chosen = [...new Set(build.order ?? [])].filter((id) => inPlan.has(id));
  const placed = new Set(chosen);
  return [...chosen, ...plan.filter((id) => !placed.has(id))];
}

/** Déplace l'élément `from` en position `to` et écrit l'ordre complet ; hors bornes : build inchangé. */
export function moveInOrder(pack: Pack, build: Build, from: number, to: number): Build {
  const order = planOrder(pack, build);
  const inBounds = (i: number) => Number.isInteger(i) && i >= 0 && i < order.length;
  if (!inBounds(from) || !inBounds(to) || from === to) return build;
  const [moved] = order.splice(from, 1);
  order.splice(to, 0, moved);
  return { ...build, order };
}

/** Première étape de l'ordre ni prise ni passée ; `index` est sa position dans l'ordre complet. */
export function nextStep(pack: Pack, build: Build, run: Run): { index: number; id: string } | null {
  const done = new Set([...run.picks.map((p) => p.id), ...(run.skipped ?? [])]);
  const order = planOrder(pack, build);
  const index = order.findIndex((id) => !done.has(id));
  return index < 0 ? null : { index, id: order[index] };
}

/** « Passer pour l'instant ». */
export function skipStep(run: Run, id: string): Run {
  const skipped = run.skipped ?? [];
  return skipped.includes(id) ? run : { ...run, skipped: [...skipped, id] };
}

/** Reprend une étape passée ; sans id, toutes. */
export function unskipStep(run: Run, id?: string): Run {
  return { ...run, skipped: id === undefined ? [] : (run.skipped ?? []).filter((x) => x !== id) };
}

/** Une bénédiction non duo compte 1 pour sa fae ; les duos sont listés à part ; les inconnues sont ignorées. */
export function familyTotals(pack: Pack, ids: Iterable<string>): { families: Record<string, number>; duos: string[] } {
  const families: Record<string, number> = {};
  const duos: string[] = [];
  for (const id of new Set(ids)) {
    const item = pack.byId.get(id);
    if (!item) continue;
    if (item.kind === "duo") duos.push(id);
    else families[item.families[0]] = (families[item.families[0]] ?? 0) + 1;
  }
  return { families, duos };
}

export interface FamilyProgress {
  families: { family: string; planned: number; taken: number }[];
  duos: { planned: number; taken: number };
}

/**
 * Totaux d'un plan face aux prises : une entrée par fae du plan, triées par nombre prévu décroissant puis dans
 * l'ordre des fae du pack (une fae hors pack, ajout manuel « Autre », vient en dernier). `taken` compte aussi les
 * prises hors plan ; les duos pris ne comptent que ceux du plan.
 */
export function familyProgress(pack: Pack, plan: Iterable<string>, picked: Iterable<string> = []): FamilyProgress {
  const planned = familyTotals(pack, plan);
  const pickedIds = new Set(picked);
  const taken = familyTotals(pack, pickedIds);
  const rank = (family: string) => {
    const i = pack.families.findIndex((f) => f.id === family);
    return i < 0 ? pack.families.length : i;
  };
  const families = Object.entries(planned.families)
    .map(([family, n]) => ({ family, planned: n, taken: taken.families[family] ?? 0 }))
    .sort((a, b) => b.planned - a.planned || rank(a.family) - rank(b.family));
  return { families, duos: { planned: planned.duos.length, taken: planned.duos.filter((id) => pickedIds.has(id)).length } };
}

/** Potions prévues, toujours `pack.potions.perRun` cases (null = non prévue). */
export function buildPotions(pack: Pack, build: Build): (string | null)[] {
  return Array.from({ length: pack.potions.perRun }, (_, i) => build.potions?.[i] ?? null);
}

/** Ajoute une potion à la fin ; refuse au-delà de `perRun` et pour une fae inconnue. */
export function applyPotion(pack: Pack, run: Run, familyId: string): Run {
  const potions = run.potions ?? [];
  if (potions.length >= pack.potions.perRun || !pack.families.some((f) => f.id === familyId)) return run;
  return { ...run, potions: [...potions, familyId] };
}

/** Retire la dernière potion prise. */
export function undoPotion(run: Run): Run {
  return { ...run, potions: (run.potions ?? []).slice(0, -1) };
}
