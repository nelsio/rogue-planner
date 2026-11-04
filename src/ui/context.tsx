// Contexte de l'application : état, pack (avec ajouts manuels), stockage et environnement.
// Chaque changement d'état est recopié dans le stockage : objets nouveaux ou modifiés enregistrés, absents supprimés.
import { createContext, useContext, useEffect, useMemo, useReducer, useRef, type Dispatch, type ReactNode } from "react";
import { withCustom, type Pack } from "@rogue/core";
import type { Storage } from "../storage";
import type { Env } from "./factory";
import { reducer, type Action, type AppState } from "./state";

interface AppContextValue {
  state: AppState;
  dispatch: Dispatch<Action>;
  pack: Pack;
  storage: Storage;
  env: Env;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp hors de AppProvider");
  return ctx;
}

type Row = { id: string };

/** Enregistre les objets nouveaux ou modifiés (référence changée), supprime les disparus. */
function syncRows<T extends Row>(prev: T[], next: T[], put: (row: T) => Promise<void>, remove: (id: string) => Promise<void>) {
  if (prev === next) return;
  const before = new Map(prev.map((r) => [r.id, r]));
  const ids = new Set(next.map((r) => r.id));
  const failed = (e: unknown) => console.error("Échec de l'enregistrement", e);
  for (const row of next) if (before.get(row.id) !== row) put(row).catch(failed);
  for (const id of before.keys()) if (!ids.has(id)) remove(id).catch(failed);
}

export function AppProvider(props: { initial: AppState; basePack: Pack; storage: Storage; env: Env; children: ReactNode }) {
  const { basePack, storage, env } = props;
  const [state, dispatch] = useReducer(reducer, props.initial);
  const pack = useMemo(() => withCustom(basePack, state.custom), [basePack, state.custom]);

  const saved = useRef(props.initial);
  useEffect(() => {
    const prev = saved.current;
    const lib = storage.library;
    syncRows(prev.builds, state.builds, lib.putBuild, lib.removeBuild);
    syncRows(prev.runs, state.runs, lib.putRun, lib.removeRun);
    syncRows(prev.custom, state.custom, lib.putCustom, lib.removeCustom);
    if (
      prev.theme !== state.theme || prev.view !== state.view || prev.editingId !== state.editingId ||
      prev.codexFamily !== state.codexFamily || prev.runSort !== state.runSort
    ) {
      storage.prefs
        .set({
          theme: state.theme, lastView: state.view, lastBuildId: state.editingId ?? undefined,
          codexFamily: state.codexFamily, runSort: state.runSort,
        })
        .catch((e: unknown) => console.error("Échec de l'enregistrement des préférences", e));
    }
    saved.current = state;
  }, [state, storage]);

  const value = useMemo(() => ({ state, dispatch, pack, storage, env }), [state, pack, storage, env]);
  return <AppContext.Provider value={value}>{props.children}</AppContext.Provider>;
}
