// Pastilles de fae : seules marques visuelles du jeu (aucune ressource graphique de SWORN).
import type { CSSProperties, ReactNode } from "react";
import type { FamilyProgress, Pack } from "@rogue/core";
import { familyName } from "./labels";
import { strings as t } from "./strings";

const duoDot = { "--c1": "var(--muted)", "--c2": "var(--ok)" } as CSSProperties;

/**
 * Puces de totaux par fae (HANDOFF §6.8) : « ×N » en Création et en bibliothèque ; « pris/N » en RUN (`run`),
 * bordure verte quand le total est atteint. Une puce « Duos » à part si le plan en contient.
 */
export function FamilyTotals({ pack, totals, run, empty }: { pack: Pack; totals: FamilyProgress; run?: boolean; empty: ReactNode }) {
  const { families, duos } = totals;
  if (!families.length && !duos.planned) return <span className="muted">{empty}</span>;
  const count = (taken: number, planned: number) => (run ? `${taken}/${planned}` : `×${planned}`);
  return (
    <>
      {families.map(({ family, planned, taken }) => {
        const name = familyName(pack, family);
        return (
          <span
            key={family}
            className={run && taken >= planned ? "fae chip done" : "fae chip"}
            data-fae={family}
            title={t.totalTitle(name, planned, run ? taken : undefined)}
          >
            <span className="dot" />
            {name} <span className="n">{count(taken, planned)}</span>
          </span>
        );
      })}
      {duos.planned > 0 && (
        <span className="chip" style={{ "--c": "var(--ok)" } as CSSProperties}>
          <span className="duo-dot" style={duoDot} />
          {t.duos} <span className="n">{count(duos.taken, duos.planned)}</span>
        </span>
      )}
    </>
  );
}
