// Bibliothèque de builds (HANDOFF §6.2).
import { useState, type ReactNode } from "react";
import { familyProgress, planOrder, type Build } from "@rogue/core";
import { useApp } from "./context";
import { FamilyTotals } from "./fae";
import { duplicateBuild, newBuild } from "./factory";
import { ImportExport } from "./ImportExport";
import { strings as t } from "./strings";
import { useStartRun } from "./useStartRun";

/** « Classe · Arme · Sort » ; la classe inconnue du pack s'affiche comme à choisir. */
export function useKit() {
  const { pack } = useApp();
  return (o: { hero: string; weapon: string; spell: string }) => {
    const hero = pack.loadouts.find((l) => l.id === o.hero);
    return hero ? `${hero.name} · ${o.weapon} · ${o.spell}` : t.noHero;
  };
}

export function Library() {
  const { state, dispatch, pack, env } = useApp();
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const { start, confirmFor } = useStartRun();
  const [io, setIo] = useState(false);

  return (
    <section className="view">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <div className="eyebrow">{t.libraryEyebrow(pack.game.name)}</div>
          <h2>{t.libraryTitle}</h2>
        </div>
        <div className="row">
          <button className="btn primary" onClick={() => dispatch({ type: "buildCreated", build: newBuild(pack, env.uuid(), env.now()) })}>
            {t.newBuild}
          </button>
          <button className="btn" onClick={() => start(null)}>{t.freeRun}</button>
          <button className="btn ghost" onClick={() => setIo(true)}>{t.importExport}</button>
        </div>
      </div>
      {confirmFor(null)}
      {state.builds.length ? (
        <div className="cards">
          {state.builds.map((b) => (
            <BuildCard
              key={b.id}
              build={b}
              confirming={confirmRemove === b.id}
              onAskRemove={() => setConfirmRemove(b.id)}
              onCancelRemove={() => setConfirmRemove(null)}
              onStart={() => start(b.id)}
              startConfirm={confirmFor(b.id)}
            />
          ))}
        </div>
      ) : (
        <p className="empty">{t.noBuilds}</p>
      )}
      {io && <ImportExport onClose={() => setIo(false)} />}
    </section>
  );
}

function BuildCard(props: {
  build: Build;
  confirming: boolean;
  onAskRemove(): void;
  onCancelRemove(): void;
  onStart(): void;
  startConfirm: ReactNode;
}) {
  const { build: b } = props;
  const { state, dispatch, pack, env } = useApp();
  const kit = useKit();
  const done = state.runs.filter((r) => r.buildId === b.id && r.status === "done");
  const wins = done.filter((r) => r.result?.outcome === "win").length;
  const totals = familyProgress(pack, planOrder(pack, b));

  return (
    <article className="card" aria-label={b.name}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h2>{b.name}</h2>
        {b.example && <span className="example">{t.example}</span>}
      </div>
      <div className="kit">
        {kit(b)} · {b.mode === "restricted" ? t.modeRestricted : t.modeFree}
      </div>
      <div className="faes">
        <FamilyTotals pack={pack} totals={totals} empty={t.noFae} />
      </div>
      <div className="stats">
        <span><b>{b.targets.filter((x) => x.prio === "core").length}</b> {t.coreCount}</span>
        <span><b>{b.targets.length}</b> {t.targetCount}</span>
        <span>
          <b>{done.length}</b> {t.runCount(done.length)} · <b>{wins}</b> {t.winCount(wins)}
        </span>
      </div>
      <div className="row">
        <button className="btn primary small" onClick={props.onStart}>{t.startRun}</button>
        <button className="btn small" onClick={() => dispatch({ type: "editBuild", id: b.id })}>{t.edit}</button>
        <button
          className="btn small ghost"
          onClick={() => dispatch({ type: "buildDuplicated", build: duplicateBuild(b, env.uuid(), env.now()), toast: t.toastDuplicated })}
        >
          {t.duplicate}
        </button>
        <button className="btn small ghost danger" onClick={props.onAskRemove}>{t.remove}</button>
      </div>
      {props.startConfirm}
      {props.confirming && (
        <div className="confirm" role="alert">
          {t.confirmRemoveBuild}
          <button className="btn small danger" onClick={() => dispatch({ type: "buildRemoved", id: b.id, toast: t.toastRemoved })}>
            {t.remove}
          </button>
          <button className="btn small ghost" onClick={props.onCancelRemove}>{t.cancel}</button>
        </div>
      )}
    </article>
  );
}
