// Pas à pas (HANDOFF §4.6, §6.4 bloc 1) : l'étape en cours de l'ordre d'acquisition, Prise ou Passer pour l'instant.
import { applyPick, planOrder, skipStep, unskipStep, type Build, type Run, type RunProgress } from "@rogue/core";
import { useApp } from "./context";
import { FaeDot, Requirements } from "./items";
import { typeLine } from "./labels";
import { strings as t } from "./strings";

const list = { margin: 0, padding: 0, listStyle: "none" } as const;

export function RunSteps({ run: r, build: b, progress }: { run: Run; build: Build; progress: RunProgress }) {
  const { dispatch, pack, env } = useApp();
  const order = planOrder(pack, b);
  if (!order.length) return null;

  const save = (run: Run, toast?: string) => dispatch({ type: "runSaved", run, toast });
  const got = new Set(r.picks.map((p) => p.id));
  const skipped = new Set(r.skipped ?? []);
  const prio = new Map(progress.remaining.map((x) => [x.id, x.prio]));
  const done = order.filter((id) => got.has(id)).length;
  const next = progress.next;

  const step = (id: string, i: number) => {
    const x = pack.byId.get(id)!;
    const cls = got.has(id) ? "done" : skipped.has(id) ? "skip" : i === next?.index ? "cur" : "";
    return (
      <li key={id} className={`bitem ${cls}`.trim()}>
        <span className="n">{i + 1}</span>
        <FaeDot item={x} />
        <div>
          <div className="bn">{x.name}</div>
          <div className="bt">{typeLine(pack, x)}</div>
        </div>
        {skipped.has(id) ? (
          <button className="btn small ghost" onClick={() => save(unskipStep(r, id))}>{t.stepUnskip}</button>
        ) : (
          !got.has(id) && (
            <span className={i === next?.index ? "tag plan" : "tag"}>{i === next?.index ? t.stepCurrent : t.stepLater}</span>
          )
        )}
      </li>
    );
  };

  const current = next && pack.byId.get(next.id)!;
  const upcoming = next ? order.map((id, i) => ({ id, i })).filter(({ id, i }) => i > next.index && !got.has(id) && !skipped.has(id)).slice(0, 3) : [];

  return (
    <div className="panel">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h3>{t.stepsTitle(done, order.length)}</h3>
        {skipped.size > 0 && (
          <button className="btn small ghost" onClick={() => save(unskipStep(r))}>{t.unskipAll(skipped.size)}</button>
        )}
      </div>
      {current ? (
        <>
          <div className="step">
            <div className="eyebrow">{t.stepEyebrow(next.index + 1, t.tagPrio[prio.get(current.id)!])}</div>
            <div className="bn">
              <FaeDot item={current} />
              {current.name}
            </div>
            <div className="be">{current.effect}</div>
            <div className="bt">{typeLine(pack, current)}</div>
            <Requirements pack={pack} item={current} owned={got} />
            <div className="row">
              <button
                className="btn primary"
                onClick={() => save(applyPick(pack, r, current.id, env.now()), t.toastStepTaken(current.name))}
              >
                {t.stepTake}
              </button>
              <button className="btn ghost" onClick={() => save(skipStep(r, current.id))}>{t.stepSkip}</button>
            </div>
          </div>
          {upcoming.length > 0 && (
            <section className="steps" aria-label={t.stepsNext}>
              <h3>{t.stepsNext}</h3>
              <ol className="steps" style={list}>
                {upcoming.map(({ id, i }) => step(id, i))}
              </ol>
            </section>
          )}
          <details>
            <summary className="muted">{t.stepsAll(order.length)}</summary>
            <ol className="steps" style={{ ...list, marginTop: 6 }}>
              {order.map(step)}
            </ol>
          </details>
        </>
      ) : (
        <p className="empty">
          {t.noStep} {done === order.length ? t.allTaken : t.stepsSkippedLeft}
        </p>
      )}
    </div>
  );
}
