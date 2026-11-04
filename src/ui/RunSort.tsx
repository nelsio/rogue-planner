// Tri du RUN (HANDOFF §6.9) : Ordre · Fae · Type, partagé par « Prises » et « Encore à trouver », mémorisé.
import { Fragment, type ReactNode } from "react";
import type { Item, Pack } from "@rogue/core";
import { useApp } from "./context";
import { familyName } from "./labels";
import type { RunSort } from "./state";
import { strings as t } from "./strings";

const SORTS = Object.keys(t.sorts) as RunSort[];

export function SortSwitch() {
  const { state, dispatch } = useApp();
  return (
    <div className="seg small" role="group" aria-label={t.sortGroup}>
      {SORTS.map((s) => (
        <button key={s} aria-pressed={state.runSort === s} onClick={() => dispatch({ type: "runSort", sort: s })}>
          {t.sorts[s]}
        </button>
      ))}
    </div>
  );
}

interface Group<T> {
  key: string;
  label: string;
  family?: string;
  entries: T[];
}

/**
 * Groupes d'une liste, dans l'ordre de base conservé à l'intérieur de chaque groupe.
 * Fae : ordre des fae du pack, fae hors pack (« Autre ») puis duos ; Type : ordre des types du pack.
 */
export function groupBy<T>(pack: Pack, entries: T[], itemOf: (e: T) => Item, sort: Exclude<RunSort, "order">): Group<T>[] {
  const keyOf = (x: Item) => (sort === "kind" ? x.kind : x.kind === "duo" ? "duo" : x.families[0]);
  const keys =
    sort === "kind"
      ? pack.kinds.map((k) => ({ key: k.id, label: k.label }))
      : [
          ...pack.families.map((f) => ({ key: f.id, label: f.name, family: f.id })),
          ...[...new Set(entries.map((e) => keyOf(itemOf(e))))]
            .filter((k) => k !== "duo" && !pack.families.some((f) => f.id === k))
            .map((k) => ({ key: k, label: familyName(pack, k) })),
          { key: "duo", label: t.duos },
        ];
  return keys
    .map((k) => ({ ...k, entries: entries.filter((e) => keyOf(itemOf(e)) === k.key) }))
    .filter((g) => g.entries.length > 0);
}

/** Liste triée selon la préférence : à plat en « Ordre », sinon par groupes titrés « ● Lugh · N ». */
export function SortedList<T>(props: { entries: T[]; itemOf(e: T): Item; render(e: T): ReactNode }) {
  const { state, pack } = useApp();
  const sort = state.runSort;
  if (sort === "order") return <>{props.entries.map(props.render)}</>;
  return (
    <>
      {groupBy(pack, props.entries, props.itemOf, sort).map((g) => (
        <Fragment key={g.key}>
          <div className="grp">
            {g.family && <span className="fae dot" data-fae={g.family} aria-hidden="true" />}
            <h3>{t.groupTitle(g.label, g.entries.length)}</h3>
          </div>
          {g.entries.map(props.render)}
        </Fragment>
      ))}
    </>
  );
}
