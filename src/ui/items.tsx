// Éléments d'affichage d'une bénédiction : pastille, nom, effet, type, prérequis colorés.
import type { CSSProperties } from "react";
import { missing, type Item, type Pack } from "@rogue/core";
import { groupLabel, typeLine } from "./labels";
import { strings as t } from "./strings";

export function FaeDot({ item }: { item: Item }) {
  if (item.kind === "duo" && item.families.length > 1) {
    const style = { "--c1": `var(--f-${item.families[0]})`, "--c2": `var(--f-${item.families[1]})` } as CSSProperties;
    return <span className="duo-dot" style={style} aria-hidden="true" />;
  }
  return <span className="fae dot" data-fae={item.families[0]} aria-hidden="true" />;
}

/** Prérequis : chaque groupe en vert avec ✓ s'il est rempli par `owned`, en orange sinon. */
export function Requirements({ pack, item, owned }: { pack: Pack; item: Item; owned: Iterable<string> }) {
  // Les aptitudes n'ont jamais de prérequis : pas de ligne, comme dans le prototype.
  if (item.kind === "ability") return null;
  if (!item.requires.length) return <div className="req">{t.req.none}</div>;
  const unmet = new Set(missing(pack, item.id, owned));
  return (
    <div className="req">
      {t.req.prefix}
      {item.requires.map((group, i) => {
        const ok = !unmet.has(group);
        return (
          <span key={i}>
            {i > 0 && t.req.and}
            <span className={ok ? "req-ok" : "req-miss"}>
              {ok && "✓ "}
              {groupLabel(pack, group)}
            </span>
          </span>
        );
      })}
    </div>
  );
}

/** Corps commun d'une ligne de bénédiction (sans la pastille ni les actions). */
export function ItemText({ pack, item, owned }: { pack: Pack; item: Item; owned?: Iterable<string> }) {
  return (
    <div>
      <div className="bn">{item.name}</div>
      <div className="be">{item.effect}</div>
      <div className="bt">{typeLine(pack, item)}</div>
      {owned && <Requirements pack={pack} item={item} owned={owned} />}
    </div>
  );
}
