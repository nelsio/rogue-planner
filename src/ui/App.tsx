// Coquille : en-tête collant, sélecteur de jeu, onglets, thème, bandeau de repli, toast (HANDOFF §6.1).
import { useEffect } from "react";
import { useApp } from "./context";
import { Editor } from "./Editor";
import { Library } from "./Library";
import { activeRun, type View } from "./state";
import { strings as t } from "./strings";
import { applyTheme, nextTheme } from "./theme";

const TABS = ["builds", "run", "history", "catalog"] as const;

export function App() {
  const { state, dispatch, pack, storage } = useApp();
  const live = !!activeRun(state);

  useEffect(() => applyTheme(state.theme), [state.theme]);

  return (
    <>
      <div className="wrap">
        <header className="top">
          <h1 className="brand">{t.appName}</h1>
          <label className="game" title={t.game}>
            <span className="sigil" aria-hidden="true" />
            <select aria-label={t.game} value={pack.game.id} onChange={() => undefined}>
              <option value={pack.game.id}>{pack.game.name}</option>
              <option disabled>{t.otherGames}</option>
            </select>
          </label>
          <span className="spacer" />
          <nav className="tabs">
            {TABS.map((v) => (
              <button
                key={v}
                aria-current={state.view === v || (v === "builds" && state.view === "edit") ? "page" : undefined}
                onClick={() => {
                  dispatch({ type: "go", view: v });
                  window.scrollTo(0, 0);
                }}
              >
                {t.tabs[v]}
                {v === "run" && live && <span className="live" title={t.runLive} aria-label={t.runLive} />}
              </button>
            ))}
          </nav>
          <button
            className="icon-btn"
            aria-label={t.themeButton}
            title={t.themeTitle(state.theme)}
            onClick={() => dispatch({ type: "theme", theme: nextTheme(state.theme) })}
          >
            ◐
          </button>
        </header>
        {storage.kind === "memory" && (
          <p className="banner" role="status">
            {t.storageFallback}
          </p>
        )}
        <main>
          <Screen view={state.view} />
        </main>
      </div>
      <Toast />
    </>
  );
}

function Screen({ view }: { view: View }) {
  if (view === "builds") return <Library />;
  if (view === "edit") return <Editor />;
  // Run et Historique : lot 4 ; Catalogue : lot 5.
  return (
    <section className="view">
      <p className="empty">{t.comingSoon}</p>
    </section>
  );
}

function Toast() {
  const { state, dispatch } = useApp();
  const toast = state.toast;
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => dispatch({ type: "toastDone", seq: toast.seq }), 1600);
    return () => clearTimeout(timer);
  }, [toast, dispatch]);
  return toast ? (
    <div className="toast" role="status">
      {toast.text}
    </div>
  ) : null;
}
