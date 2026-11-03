// Mode RUN (HANDOFF §6.4) : prises dans l'ordre, écart au plan, emplacements, enclumes, autres choix, fin du run.
import { useState } from "react";
import { applyPick, buildOwned, itemIndex, runProgress, type Build, type Run } from "@rogue/core";
import { anvilGroups } from "./anvils";
import { useApp } from "./context";
import { FaeDot } from "./items";
import { KitFields } from "./KitFields";
import { typeLine } from "./labels";
import { useKit } from "./Library";
import { Picker } from "./Picker";
import { activeRun } from "./state";
import { strings as t } from "./strings";
import { useStartRun } from "./useStartRun";

export function RunView() {
  const { state } = useApp();
  const run = activeRun(state);
  if (!run) return <NoRun />;
  const build = state.builds.find((b) => b.id === run.buildId) ?? null;
  return <ActiveRun run={run} build={build} />;
}

function NoRun() {
  const { state } = useApp();
  const { start, confirmFor } = useStartRun();
  return (
    <section className="view">
      <div className="panel" style={{ maxWidth: 560 }}>
        <div className="eyebrow">{t.runEyebrow}</div>
        <h2>{t.noRun}</h2>
        <p className="muted" style={{ margin: 0 }}>{t.noRunHelp}</p>
        <div className="row">
          {state.builds.slice(0, 3).map((b) => (
            <button key={b.id} className="btn" onClick={() => start(b.id)}>{b.name}</button>
          ))}
          <button className="btn ghost" onClick={() => start(null)}>{t.freeRun}</button>
        </div>
        {confirmFor(null)}
      </div>
    </section>
  );
}

function ActiveRun({ run: r, build: b }: { run: Run; build: Build | null }) {
  const { dispatch, pack, env } = useApp();
  const kit = useKit();
  const [picking, setPicking] = useState(false);
  const [ending, setEnding] = useState(false);
  const save = (run: Run, toast?: string) => dispatch({ type: "runSaved", run, toast });

  const index = itemIndex(pack);
  const progress = runProgress(pack, b, r);
  const planned = b ? buildOwned(b) : new Set<string>();
  const nameOf = (id: string | null) => (id ? (index.get(id)?.name ?? id) : "");

  return (
    <section className="view">
      <div className="runhead">
        <div className="eyebrow">{t.runStartedAt(r.startedAt)}</div>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h2>{b ? b.name : r.buildId ? t.deletedBuild : t.freeRunTitle}</h2>
          <button
            className="btn small"
            onClick={() => {
              setEnding(true);
              window.scrollTo(0, 0);
            }}
          >
            {t.endRun}
          </button>
        </div>
        <div className="kit">{kit(r)}</div>
        <details>
          <summary className="muted">{t.changeKit}</summary>
          <div style={{ marginTop: 8 }}>
            <KitFields kit={r} onChange={(k) => save({ ...r, ...k })} />
          </div>
        </details>
      </div>

      {ending && <EndRun run={r} onCancel={() => setEnding(false)} />}

      {b && (
        <>
          <div className="meter">
            <div className="k-core"><b>{progress.coreTaken}/{progress.coreTotal}</b><span>{t.meter.core}</span></div>
            <div><b>{progress.taken}</b><span>{t.meter.taken}</span></div>
            <div className="k-off"><b>{progress.offPlan.length}</b><span>{t.meter.off}</span></div>
          </div>
          <div className="bar" aria-hidden="true">
            <i style={{ width: `${progress.coreTotal ? Math.round((progress.coreTaken / progress.coreTotal) * 100) : 0}%` }} />
          </div>
        </>
      )}

      <div className="split">
        <div style={{ display: "grid", gap: 16, minWidth: 0 }}>
          <div className="panel">
            <h3>{t.slotsTitle}</h3>
            <div className="slots">
              {pack.slots.map((slot) => {
                const s = progress.slots[slot.id];
                const current = s.current ? index.get(s.current) : undefined;
                const cls = ["slot", current ? "filled fae" : "empty-slot", s.mismatch && "off"].filter(Boolean).join(" ");
                return (
                  <div key={slot.id} className={cls} data-fae={current?.families[0]} aria-label={slot.label}>
                    <span className="sl">{slot.label}</span>
                    <span className="sv">
                      {current ? (
                        <>
                          <FaeDot item={current} />
                          {current.name}
                        </>
                      ) : (
                        "—"
                      )}
                    </span>
                    {s.planned && (!current || s.mismatch) && <span className="planned">{t.plannedSlot(nameOf(s.planned))}</span>}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="panel">
            <h3>{t.picksTitle}</h3>
            <div className="blist log">
              {r.picks.length ? (
                r.picks.map((p, i) => {
                  const x = index.get(p.id);
                  if (!x) return null;
                  const inPlan = planned.has(x.id);
                  return (
                    <div key={p.id} className="bitem">
                      <span className="n">{i + 1}</span>
                      <FaeDot item={x} />
                      <div>
                        <div className="bn">{x.name}</div>
                        <div className="bt">{typeLine(pack, x)}</div>
                      </div>
                      <div className="row" style={{ flexWrap: "nowrap" }}>
                        {b && <span className={inPlan ? "tag plan" : "tag off"}>{inPlan ? t.tagPlanned : t.tagOffPlan}</span>}
                        <button
                          className="btn small ghost"
                          aria-label={t.removeItem(x.name)}
                          onClick={() => save({ ...r, picks: r.picks.filter((_, j) => j !== i) })}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="empty">{t.noPicks}</p>
              )}
            </div>
          </div>

          <div className="panel">
            <h3>{t.runAnvilsTitle(r.anvils.length)}</h3>
            {anvilGroups(pack, r).map((g) => (
              <div key={g.kind} className="stack-s">
                <div className="eyebrow">{g.kind} · {g.name}</div>
                <div className="aug-grid">
                  {g.options.map((a) => {
                    const taken = r.anvils.includes(a.id);
                    const plannedAnvil = !!b?.anvils.includes(a.id);
                    return (
                      <button
                        key={a.id}
                        className={plannedAnvil ? "aug planned" : "aug"}
                        aria-pressed={taken}
                        onClick={() => save({ ...r, anvils: taken ? r.anvils.filter((x) => x !== a.id) : [...r.anvils, a.id] }, t.toastAnvil(!taken))}
                      >
                        <span className="bn">{a.name}</span>
                        <span className="be">{a.effect}</span>
                        {plannedAnvil && <span className="tag plan">{t.tagPlannedShort}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <OtherChoices run={r} onSave={save} />
        </div>

        <aside className="side" style={{ display: "grid", gap: 16, minWidth: 0 }}>
          {b && (
            <div className="panel">
              <h3>{t.remainingTitle}</h3>
              <div className="blist">
                {progress.remaining.length ? (
                  progress.remaining.map(({ id, prio }) => {
                    const x = index.get(id);
                    if (!x) return null;
                    return (
                      <div key={id} className="bitem">
                        <FaeDot item={x} />
                        <div>
                          <div className="bn">{x.name}</div>
                          <div className="bt">{typeLine(pack, x)}</div>
                        </div>
                        <span className={prio === "core" ? "tag plan" : "tag"}>{prio === "core" ? t.tagCore : t.tagBonus}</span>
                      </div>
                    );
                  })
                ) : (
                  <p className="empty">{t.allTaken}</p>
                )}
              </div>
            </div>
          )}
          <div className="panel">
            <h3>{t.openDuosTitle}</h3>
            <div className="blist">
              {progress.openDuos.length ? (
                progress.openDuos.map((id) => {
                  const d = index.get(id)!;
                  return (
                    <div key={id} className="bitem">
                      <FaeDot item={d} />
                      <div>
                        <div className="bn">{d.name}</div>
                        <div className="be">{d.effect}</div>
                      </div>
                      {planned.has(id) ? <span className="tag plan">{t.tagPlannedShort}</span> : <span className="tag duo">{t.tagOpen}</span>}
                    </div>
                  );
                })
              ) : (
                <p className="empty">{t.noOpenDuos}</p>
              )}
            </div>
          </div>
          {b?.notes && (
            <div className="panel">
              <h3>{t.buildNotes}</h3>
              <p style={{ margin: 0 }}>{b.notes}</p>
            </div>
          )}
        </aside>
      </div>

      <button className="btn primary fab" onClick={() => setPicking(true)}>{t.fab}</button>
      {picking && (
        <Picker
          mode="run"
          run={r}
          build={b}
          onClose={() => setPicking(false)}
          onPick={(x) => save(applyPick(pack, r, x.id, env.now()), t.toastPicked(x.name))}
        />
      )}
    </section>
  );
}

function OtherChoices({ run: r, onSave }: { run: Run; onSave(run: Run): void }) {
  const { pack } = useApp();
  const [kind, setKind] = useState<string | null>(null);
  const [text, setText] = useState("");
  const label = (id: string) => pack.otherChoices.find((k) => k.id === id)?.label ?? id;
  const add = () => {
    if (!kind || !text.trim()) return;
    onSave({ ...r, others: [...r.others, { kind, text: text.trim() }] });
    setKind(null);
    setText("");
  };
  return (
    <div className="panel">
      <h3>{t.othersTitle}</h3>
      <div className="row">
        {pack.otherChoices.map((k) => (
          <button key={k.id} className="btn small" onClick={() => setKind(k.id)}>{t.addOther(k.label)}</button>
        ))}
      </div>
      {kind && (
        <form
          className="row"
          onSubmit={(e) => {
            e.preventDefault();
            add();
          }}
        >
          <label className="field" style={{ flex: 1 }}>
            {label(kind)}
            <input autoFocus placeholder={t.otherPlaceholder} value={text} onChange={(e) => setText(e.target.value)} />
          </label>
          <button className="btn primary small" type="submit">{t.add}</button>
          <button className="btn ghost small" type="button" onClick={() => setKind(null)}>{t.cancel}</button>
        </form>
      )}
      <div className="blist">
        {r.others.map((o, i) => (
          <div key={i} className="bitem">
            <span className="tag">{label(o.kind)}</span>
            <div className="bn">{o.text}</div>
            <button
              className="btn small ghost"
              aria-label={t.removeOther}
              onClick={() => onSave({ ...r, others: r.others.filter((_, j) => j !== i) })}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function EndRun({ run: r, onCancel }: { run: Run; onCancel(): void }) {
  const { dispatch, env } = useApp();
  const [outcome, setOutcome] = useState<"win" | "loss">("loss");
  const [reached, setReached] = useState("");
  const [notes, setNotes] = useState("");
  return (
    <div className="panel">
      <h3>{t.endTitle}</h3>
      <div className="seg" role="group" aria-label={t.outcomeGroup}>
        <button aria-pressed={outcome === "win"} onClick={() => setOutcome("win")}>{t.win}</button>
        <button aria-pressed={outcome === "loss"} onClick={() => setOutcome("loss")}>{t.loss}</button>
      </div>
      <label className="field">
        {t.reached}
        <input placeholder={t.reachedPlaceholder} value={reached} onChange={(e) => setReached(e.target.value)} />
      </label>
      <label className="field">
        {t.notes}
        <textarea placeholder={t.endNotesPlaceholder} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>
      <div className="row">
        <button
          className="btn primary"
          onClick={() =>
            dispatch({
              type: "runSaved",
              run: { ...r, status: "done", endedAt: env.now(), result: { outcome, reached: reached.trim(), notes: notes.trim() } },
              toast: t.toastRunSaved,
              view: "history",
            })
          }
        >
          {t.saveRun}
        </button>
        <button className="btn ghost" onClick={onCancel}>{t.continueRun}</button>
        <button className="btn ghost danger" onClick={() => dispatch({ type: "runRemoved", id: r.id, view: "builds" })}>{t.abandonRun}</button>
      </div>
    </div>
  );
}
