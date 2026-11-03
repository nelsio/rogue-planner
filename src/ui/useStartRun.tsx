// Lancer un run depuis la bibliothèque ou la Création : confirmation dans la page si un run est déjà actif.
import { useState, type ReactNode } from "react";
import { useApp } from "./context";
import { newRun } from "./factory";
import { activeRun } from "./state";
import { strings as t } from "./strings";

export function useStartRun(): { start(buildId: string | null): void; confirmFor(buildId: string | null): ReactNode } {
  const { state, dispatch, pack, env } = useApp();
  const [pending, setPending] = useState<{ buildId: string | null } | null>(null);

  const launch = (buildId: string | null) => {
    const build = state.builds.find((b) => b.id === buildId) ?? null;
    const now = env.now();
    setPending(null);
    dispatch({ type: "runStarted", run: newRun(pack, build, env.uuid(), now), at: now });
  };

  return {
    start: (buildId) => (activeRun(state) ? setPending({ buildId }) : launch(buildId)),
    confirmFor: (buildId) =>
      pending && pending.buildId === buildId ? (
        <div className="confirm" role="alert">
          {t.confirmReplaceRun}
          <button className="btn small danger" onClick={() => launch(buildId)}>{t.replaceRun}</button>
          <button className="btn small ghost" onClick={() => setPending(null)}>{t.cancel}</button>
        </div>
      ) : null,
  };
}
