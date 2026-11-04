// Création (bénédictions visées) et RUN (prises, écart au plan).
import { getItem, type Pack, type SlotId } from "./pack";
import { buildPotions, familyProgress, nextStep, planOrder, type FamilyProgress } from "./plan";
import { buildOwned, reachableDuos } from "./requires";
import type { Build, Prio, Run } from "./schemas";

/** Aptitude : occupe / libère son emplacement. Sinon : absente → bonus → essentielle → absente. */
export function toggleTarget(pack: Pack, build: Build, itemId: string): Build {
  const item = getItem(pack, itemId);
  if (item.kind === "ability") {
    const slot = item.slot!;
    return { ...build, abilities: { ...build.abilities, [slot]: build.abilities[slot] === itemId ? null : itemId } };
  }
  const current = build.targets.find((t) => t.id === itemId);
  if (!current) return { ...build, targets: [...build.targets, { id: itemId, prio: "bonus" }] };
  if (current.prio === "bonus") {
    return { ...build, targets: build.targets.map((t) => (t.id === itemId ? { id: itemId, prio: "core" } : t)) };
  }
  return { ...build, targets: build.targets.filter((t) => t.id !== itemId) };
}

/**
 * Ajoute une prise ; une aptitude remplace celle du même emplacement ; pas de doublon.
 * Une étape passée qui est prise quitte les passées.
 */
export function applyPick(pack: Pack, run: Run, itemId: string, at: string): Run {
  if (run.picks.some((p) => p.id === itemId)) return run;
  const item = getItem(pack, itemId);
  const index = pack.byId;
  // Une prise inconnue du pack (bénédiction ajoutée puis retirée) est gardée telle quelle.
  const picks =
    item.kind === "ability"
      ? run.picks.filter((p) => {
          const other = index.get(p.id);
          return !(other?.kind === "ability" && other.slot === item.slot);
        })
      : run.picks;
  const skipped = run.skipped && { skipped: run.skipped.filter((id) => id !== itemId) };
  return { ...run, picks: [...picks, { id: itemId, at }], ...skipped };
}

export interface SlotProgress {
  current: string | null;
  planned: string | null;
  mismatch: boolean;
}

export interface RunProgress {
  coreTotal: number;
  coreTaken: number;
  taken: number;
  offPlan: string[];
  /** Plan non pris, dans l'ordre d'acquisition, aptitudes comprises. */
  remaining: { id: string; prio: Prio | "ability" }[];
  slots: Record<SlotId, SlotProgress>;
  openDuos: string[];
  next: { index: number; id: string } | null;
  families: FamilyProgress["families"];
  duos: FamilyProgress["duos"];
  potions: { index: number; planned: string | null; taken: string | null }[];
}

export function runProgress(pack: Pack, build: Build | null, run: Run): RunProgress {
  const picked = run.picks.map((p) => p.id);
  const pickedSet = new Set(picked);
  const targets = build?.targets ?? [];
  const core = targets.filter((t) => t.prio === "core");
  const plan = build ? buildOwned(build) : null;
  const order = build ? planOrder(pack, build) : [];
  const prio = new Map<string, Prio | "ability">(targets.map((t) => [t.id, t.prio]));
  for (const id of Object.values(build?.abilities ?? {})) if (id) prio.set(id, "ability");

  const { families, duos } = familyProgress(pack, order, picked);
  const plannedPotions = build ? buildPotions(pack, build) : [];

  const slots: Record<SlotId, SlotProgress> = {};
  for (const { id: slot } of pack.slots) {
    const current =
      picked.findLast((id) => {
        const item = pack.byId.get(id);
        return item?.kind === "ability" && item.slot === slot;
      }) ?? null;
    const planned = build?.abilities[slot] ?? null;
    slots[slot] = { current, planned, mismatch: current !== null && planned !== null && current !== planned };
  }

  return {
    coreTotal: core.length,
    coreTaken: core.filter((t) => pickedSet.has(t.id)).length,
    taken: picked.length,
    offPlan: plan ? picked.filter((id) => !plan.has(id)) : [],
    remaining: order.filter((id) => !pickedSet.has(id)).map((id) => ({ id, prio: prio.get(id)! })),
    slots,
    openDuos: reachableDuos(pack, picked, { restricted: false }),
    next: build ? nextStep(pack, build, run) : null,
    families,
    duos,
    potions: Array.from({ length: pack.potions.perRun }, (_, index) => ({
      index,
      planned: plannedPotions[index] ?? null,
      taken: run.potions?.[index] ?? null,
    })),
  };
}
