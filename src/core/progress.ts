// Création (bénédictions visées) et RUN (prises, écart au plan).
import { getItem, itemIndex, type Pack, type SlotId } from "./pack";
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

/** Ajoute une prise ; une aptitude remplace celle du même emplacement ; pas de doublon. */
export function applyPick(pack: Pack, run: Run, itemId: string, at: string): Run {
  if (run.picks.some((p) => p.id === itemId)) return run;
  const item = getItem(pack, itemId);
  const index = itemIndex(pack);
  // Une prise inconnue du pack (bénédiction ajoutée puis retirée) est gardée telle quelle.
  const picks =
    item.kind === "ability"
      ? run.picks.filter((p) => {
          const other = index.get(p.id);
          return !(other?.kind === "ability" && other.slot === item.slot);
        })
      : run.picks;
  return { ...run, picks: [...picks, { id: itemId, at }] };
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
  remaining: { id: string; prio: Prio }[];
  slots: Record<SlotId, SlotProgress>;
  openDuos: string[];
}

export function runProgress(pack: Pack, build: Build | null, run: Run): RunProgress {
  const picked = run.picks.map((p) => p.id);
  const pickedSet = new Set(picked);
  const targets = build?.targets ?? [];
  const core = targets.filter((t) => t.prio === "core");
  const plan = build ? buildOwned(build) : null;
  const left = targets.filter((t) => !pickedSet.has(t.id));

  const slots: Record<SlotId, SlotProgress> = {};
  for (const { id: slot } of pack.slots) {
    const current =
      picked.findLast((id) => {
        const item = itemIndex(pack).get(id);
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
    remaining: [...left.filter((t) => t.prio === "core"), ...left.filter((t) => t.prio === "bonus")],
    slots,
    openDuos: reachableDuos(pack, picked, { restricted: false }),
  };
}
