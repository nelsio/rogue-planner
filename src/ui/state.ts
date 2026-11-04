// État de l'application : reducer pur. Identifiants et dates sont fournis avant le dispatch.
import type { Build, CustomItem, Library, Run } from "@rogue/core";
import type { Prefs } from "../storage";

export const VIEWS = ["builds", "edit", "run", "history", "catalog"] as const;
export type View = (typeof VIEWS)[number];
export type Theme = NonNullable<Prefs["theme"]>;
export type RunSort = NonNullable<Prefs["runSort"]>;

export interface AppState {
  builds: Build[];
  runs: Run[];
  custom: CustomItem[];
  view: View;
  editingId: string | null;
  theme: Theme;
  /** Dernier filtre de fae du catalogue (« all » ou un id de fae). */
  codexFamily: string;
  /** Tri des listes du RUN (Prises, Encore à trouver). */
  runSort: RunSort;
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
  /** Build modifié en Création (date de modification déjà posée) ; il garde sa place dans la liste. */
  | { type: "buildSaved"; build: Build; toast?: string }
  /** Lance un run ; un run actif passe en « abandonné » à la date `at`. */
  | { type: "runStarted"; run: Run; at: string }
  /** Run modifié (prise, enclume, kit, fin) ; `view` change d'écran au passage. */
  | { type: "runSaved"; run: Run; toast?: string; view?: View }
  /** « Abandonner sans enregistrer » : le run est supprimé. */
  | { type: "runRemoved"; id: string; view?: View }
  | { type: "codexFamily"; family: string }
  | { type: "runSort"; sort: RunSort }
  | { type: "customAdded"; item: CustomItem; toast: string }
  | { type: "customRemoved"; id: string }
  /** Résultat d'un import par fusion ; un seul run reste actif (le plus récent), les autres sont abandonnés à `at`. */
  | { type: "libraryImported"; library: Library; at: string };

/** Les builds les plus récents d'abord ; l'ordre de lecture départage. */
export const byRecent = (builds: Build[]) => [...builds].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

export function initialState(library: Library, prefs: Prefs): AppState {
  const builds = byRecent(library.builds);
  const editing = prefs.lastBuildId && builds.some((b) => b.id === prefs.lastBuildId) ? prefs.lastBuildId : null;
  let view: View = VIEWS.find((v) => v === prefs.lastView) ?? "builds";
  if (view === "edit" && !editing) view = "builds";
  return {
    ...library, builds, view, editingId: editing, theme: prefs.theme ?? "auto", codexFamily: prefs.codexFamily ?? "all",
    runSort: prefs.runSort ?? "order", toast: null,
  };
}

/** Garde un seul run actif : celui commencé le plus tard ; les autres passent en abandonné à la date `at`. */
export function singleActiveRun(runs: Run[], at: string): Run[] {
  const active = runs.filter((r) => r.status === "active").sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  const extra = new Set(active.slice(1));
  return extra.size ? runs.map((r) => (extra.has(r) ? { ...r, status: "abandoned" as const, endedAt: at } : r)) : runs;
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
    case "buildSaved":
      return {
        ...state,
        builds: state.builds.map((b) => (b.id === action.build.id ? action.build : b)),
        toast: action.toast ? withToast(state, action.toast) : state.toast,
      };
    case "runStarted": {
      const runs = state.runs.map((r) => (r.status === "active" ? { ...r, status: "abandoned" as const, endedAt: action.at } : r));
      return { ...state, runs: [...runs, action.run], view: "run" };
    }
    case "runSaved":
      return {
        ...state,
        runs: state.runs.map((r) => (r.id === action.run.id ? action.run : r)),
        view: action.view ?? state.view,
        toast: action.toast ? withToast(state, action.toast) : state.toast,
      };
    case "runRemoved":
      return { ...state, runs: state.runs.filter((r) => r.id !== action.id), view: action.view ?? state.view };
    case "codexFamily":
      return { ...state, codexFamily: action.family };
    case "runSort":
      return { ...state, runSort: action.sort };
    case "customAdded":
      return { ...state, custom: [...state.custom, action.item], toast: withToast(state, action.toast) };
    case "customRemoved":
      return { ...state, custom: state.custom.filter((c) => c.id !== action.id) };
    case "libraryImported": {
      const { builds, runs, custom } = action.library;
      return { ...state, builds: byRecent(builds), runs: singleActiveRun(runs, action.at), custom };
    }
  }
}

export const activeRun = (state: Pick<AppState, "runs">): Run | undefined => state.runs.find((r) => r.status === "active");
