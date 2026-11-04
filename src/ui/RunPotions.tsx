// Potions du run (HANDOFF §4.8, §6.4 bloc 3) : 4 cases dans l'ordre, la prochaine encadrée, la prévue proposée.
import { applyPotion, undoPotion, type Run, type RunProgress } from "@rogue/core";
import { useApp } from "./context";
import { familyName } from "./labels";
import { strings as t } from "./strings";

export function RunPotions({ run: r, progress }: { run: Run; progress: RunProgress }) {
  const { dispatch, pack } = useApp();
  const cells = progress.potions;
  const n = cells.filter((c) => c.taken).length;
  const nextPlanned = cells[n]?.planned ?? null;
  const name = (family: string) => familyName(pack, family);
  const take = (family: string) =>
    dispatch({ type: "runSaved", run: applyPotion(pack, r, family), toast: t.toastPotion(t.req.of(name(family))) });

  return (
    <div className="panel">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h3>{t.runPotionsTitle(n, cells.length)}</h3>
        {n > 0 && (
          <button className="btn small ghost" onClick={() => dispatch({ type: "runSaved", run: undoPotion(r) })}>{t.potionUndo}</button>
        )}
      </div>
      <div className="pots">
        {cells.map(({ index, planned, taken }) => {
          const shown = taken ?? planned;
          const cls = ["pot fae", taken && "filled", index === n && "next"].filter(Boolean).join(" ");
          return (
            <div key={index} className={cls} data-fae={shown ?? undefined} aria-label={t.potion(index)}>
              <span className="sl">{t.potion(index)}</span>
              <span className="sv">
                {taken ? (
                  <>
                    <span className="dot" />
                    {name(taken)}
                  </>
                ) : (
                  "—"
                )}
              </span>
              {planned && (
                <span className="planned muted" style={{ fontSize: ".78rem" }}>
                  {taken === planned ? (
                    <span className="ok">{t.potionPlannedOk}</span>
                  ) : (
                    <>
                      {t.potionPlanned}
                      {!taken && <span className="fae dot" data-fae={planned} />} {name(planned)}
                    </>
                  )}
                </span>
              )}
            </div>
          );
        })}
      </div>
      {n < cells.length && (
        <div className="faes">
          {nextPlanned && (
            <button className="btn small primary" onClick={() => take(nextPlanned)}>{t.potionTakePlanned(name(nextPlanned))}</button>
          )}
          {pack.families.map((f) => (
            <button key={f.id} className="chip fae" data-fae={f.id} onClick={() => take(f.id)}>
              <span className="dot" />
              {f.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
