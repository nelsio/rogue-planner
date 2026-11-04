// Interfaces de stockage, indépendantes de l'interface (HANDOFF §5).
import { z, type Build, type CustomItem, type Run } from "@rogue/core";

export interface LibraryStore {
  listBuilds(): Promise<Build[]>;
  putBuild(build: Build): Promise<void>;
  removeBuild(id: string): Promise<void>;
  listRuns(): Promise<Run[]>;
  putRun(run: Run): Promise<void>;
  removeRun(id: string): Promise<void>;
  listCustom(): Promise<CustomItem[]>;
  putCustom(item: CustomItem): Promise<void>;
  removeCustom(id: string): Promise<void>;
}

export const PrefsSchema = z.object({
  theme: z.enum(["auto", "light", "dark"]).optional(),
  lastView: z.string().optional(),
  lastBuildId: z.string().optional(),
  codexFamily: z.string().optional(),
  // Tri des listes du RUN (HANDOFF §6.9).
  runSort: z.enum(["order", "family", "kind"]).optional(),
  persistRequested: z.boolean().optional(),
  // Les exemples ne sont chargés qu'une fois : une bibliothèque vidée par le joueur reste vide.
  examplesLoaded: z.boolean().optional(),
});

export type Prefs = z.output<typeof PrefsSchema>;
export type PrefKey = keyof Prefs;

export interface PrefsStore {
  get(): Promise<Prefs>;
  /** Une clé à `undefined` est supprimée. */
  set(patch: Partial<Prefs>): Promise<void>;
}

export interface Storage {
  kind: "indexeddb" | "memory";
  library: LibraryStore;
  prefs: PrefsStore;
}

/** Garde les préférences valides, clé par clé ; une valeur invalide est ignorée et signalée. */
export function readPrefs(raw: Record<string, unknown>): Prefs {
  const prefs: Record<string, unknown> = {};
  const shape = PrefsSchema.shape;
  for (const [key, value] of Object.entries(raw)) {
    if (!(key in shape)) continue;
    const res = shape[key as PrefKey].safeParse(value);
    if (res.success) prefs[key] = res.data;
    else console.warn(`Préférence ignorée (${key}) :`, value);
  }
  return prefs as Prefs;
}

/** Valide chaque objet lu ; un objet invalide est ignoré et signalé dans la console. */
export function readValid<T>(schema: z.ZodType<T>, rows: unknown[], label: string): T[] {
  return rows.flatMap((row) => {
    const res = schema.safeParse(row);
    if (res.success) return [res.data];
    console.warn(`${label} ignoré : objet invalide`, row, res.error.issues);
    return [];
  });
}
