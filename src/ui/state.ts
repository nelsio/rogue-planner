// État de l'application : reducer pur. Identifiants et dates sont fournis avant le dispatch.
import type { Build, CustomItem, Library, Run } from "@rogue/core";
import type { Prefs } from "../storage";

export const VIEWS = ["builds", "edit", "run", "history", "catalog"] as const;
export type View = (typeof VIEWS)[number];
export type Theme = NonNullable<Prefs["theme"]>;

export interface AppState {
  builds: Build[];
  runs: Run[];
  custom: CustomItem[];
  view: View;
  editingId: string | null;
  theme: Theme;
  toast: { seq: number; text: string } | null;
}

export type Action =
  | { type: "go"; view: View }
  | { type: "theme"; theme: Theme }
  | { type: "toast"; text: string }
  | { type: "toastDone"; seq: number }
  | { type: "buildCreated"; build: Build }
  | { type: "buildDuplicated"; build: Build; toast: string }
  | { type: "buildRemoved"; id: string; toast: string }
  | { type: "editBuild"; id: string }
  /** Lance un run ; un run actif passe en « abandonné » à la date `at`. */
  | { type: "runStarted"; run: Run; at: string };

/** Les builds les plus récents d'abord ; l'ordre de lecture départage. */
export const byRecent = (builds: Build[]) => [...builds].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

export function initialState(library: Library, prefs: Prefs): AppState {
  const builds = byRecent(library.builds);
  const editing = prefs.lastBuildId && builds.some((b) => b.id === prefs.lastBuildId) ? prefs.lastBuildId : null;
  let view: View = VIEWS.find((v) => v === prefs.lastView) ?? "builds";
  if (view === "edit" && !editing) view = "builds";
  return { ...library, builds, view, editingId: editing, theme: prefs.theme ?? "auto", toast: null };
}

const withToast = (state: AppState, text: string): AppState["toast"] => ({ seq: (state.toast?.seq ?? 0) + 1, text });

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "go":
      return { ...state, view: action.view };
    case "theme":
      return { ...state, theme: action.theme };
    case "toast":
      return { ...state, toast: withToast(state, action.text) };
    case "toastDone":
      return state.toast?.seq === action.seq ? { ...state, toast: null } : state;
    case "buildCreated":
      return { ...state, builds: [action.build, ...state.builds], editingId: action.build.id, view: "edit" };
    case "buildDuplicated":
      return { ...state, builds: [action.build, ...state.builds], toast: withToast(state, action.toast) };
    case "buildRemoved":
      return {
        ...state,
        builds: state.builds.filter((b) => b.id !== action.id),
        editingId: state.editingId === action.id ? null : state.editingId,
        toast: withToast(state, action.toast),
      };
    case "editBuild":
      return { ...state, editingId: action.id, view: "edit" };
    case "runStarted": {
      const runs = state.runs.map((r) => (r.status === "active" ? { ...r, status: "abandoned" as const, endedAt: action.at } : r));
      return { ...state, runs: [...runs, action.run], view: "run" };
    }
  }
}

export const activeRun = (state: Pick<AppState, "runs">): Run | undefined => state.runs.find((r) => r.status === "active");
