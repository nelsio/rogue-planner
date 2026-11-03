// Import par fusion : un élément de même identifiant est remplacé, les autres sont ajoutés.
import { BuildSchema, CustomItemSchema, RunSchema, type Library } from "./schemas";
import { z, zodErrors, type FieldError } from "./zod";

export const EXPORT_FORMAT = "rogue-planner";
/** Exports du prototype. */
const LEGACY_FORMAT = "carnet-runs";

export type MergeResult =
  | { ok: true; library: Library; added: number; replaced: number }
  | { ok: false; errors: FieldError[] };

const EnvelopeSchema = z.object({
  format: z.enum([EXPORT_FORMAT, LEGACY_FORMAT]),
  version: z.literal(1).optional(),
  game: z.string().min(1).optional(),
  builds: z.array(z.unknown()).default([]),
  runs: z.array(z.unknown()).default([]),
  custom: z.array(z.unknown()).default([]),
});

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

export function mergeImport(library: Library, json: unknown): MergeResult {
  if (!isObject(json) || (json.format !== EXPORT_FORMAT && json.format !== LEGACY_FORMAT)) {
    const message =
      isObject(json) && "format" in json
        ? `Ce fichier ne vient pas de Rogue Planner : format « ${String(json.format)} » inconnu.`
        : "Ce fichier ne vient pas de Rogue Planner : le champ « format » est absent.";
    return { ok: false, errors: [{ path: "format", message }] };
  }
  const envelope = EnvelopeSchema.safeParse(json);
  if (!envelope.success) return { ok: false, errors: zodErrors(envelope.error) };
  const { game, builds, runs, custom } = envelope.data;

  // Le jeu de l'enveloppe sert de valeur par défaut aux objets qui ne le précisent pas.
  const withGame = (v: unknown) => (isObject(v) && game !== undefined && !("game" in v) ? { ...v, game } : v);
  const errors: FieldError[] = [];
  const parseAll = <T>(schema: z.ZodType<T>, list: unknown[], key: string): T[] =>
    list.flatMap((raw, i) => {
      const res = schema.safeParse(withGame(raw));
      if (res.success) return [res.data];
      errors.push(...zodErrors(res.error, [key, i]));
      return [];
    });
  const incoming: Library = {
    builds: parseAll(BuildSchema, builds, "builds"),
    runs: parseAll(RunSchema, runs, "runs"),
    custom: parseAll(CustomItemSchema, custom, "custom"),
  };
  if (errors.length) return { ok: false, errors };

  let added = 0;
  let replaced = 0;
  const merge = <T extends { id: string }>(current: T[], next: T[]): T[] => {
    const out = [...current];
    for (const item of next) {
      const i = out.findIndex((x) => x.id === item.id);
      if (i >= 0) {
        out[i] = item;
        replaced++;
      } else {
        out.push(item);
        added++;
      }
    }
    return out;
  };
  return {
    ok: true,
    library: {
      builds: merge(library.builds, incoming.builds),
      runs: merge(library.runs, incoming.runs),
      custom: merge(library.custom, incoming.custom),
    },
    added,
    replaced,
  };
}
