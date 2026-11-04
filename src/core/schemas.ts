// Schémas des objets persistés (build, run, bénédiction ajoutée), utilisés au chargement et à l'import.
// Les champs absents prennent leur valeur par défaut (HANDOFF §7).
import { z } from "./zod";

const Id = z.string().min(1);
const Prio = z.enum(["core", "bonus"]);

export const BuildSchema = z.object({
  id: Id,
  game: Id,
  name: z.string(),
  mode: z.enum(["free", "restricted"]).default("restricted"),
  hero: Id,
  weapon: Id,
  spell: Id,
  // Une aptitude visée par emplacement ; "" (prototype) devient null.
  abilities: z.record(z.string(), z.string().nullable().transform((v) => v || null)).default({}),
  targets: z.array(z.object({ id: Id, prio: Prio })).default([]),
  anvils: z.array(Id).default([]),
  // Ordre d'acquisition choisi ; [] = ordre par défaut (§4.6).
  order: z.array(Id).default([]),
  // Potions prévues, dans l'ordre (ids de fae) ; "" (prototype) devient null.
  potions: z.array(z.string().nullable().transform((v) => v || null)).default([]),
  notes: z.string().default(""),
  updatedAt: z.string().min(1),
  example: z.boolean().optional(),
});

export const RunSchema = z.object({
  id: Id,
  game: Id,
  buildId: Id.nullable().default(null),
  status: z.enum(["active", "done", "abandoned"]),
  startedAt: z.string().min(1),
  endedAt: z.string().min(1).optional(),
  hero: Id,
  weapon: Id,
  spell: Id,
  picks: z.array(z.object({ id: Id, at: z.string() })).default([]),
  anvils: z.array(Id).default([]),
  // Potions prises, dans l'ordre (ids de fae).
  potions: z.array(Id).default([]),
  // Étapes du pas à pas « passées pour l'instant ».
  skipped: z.array(Id).default([]),
  others: z.array(z.object({ kind: Id, text: z.string() })).default([]),
  result: z
    .object({ outcome: z.enum(["win", "loss"]), reached: z.string().default(""), notes: z.string().default("") })
    .nullable()
    .default(null),
  example: z.boolean().optional(),
});

export const CustomItemSchema = z.object({
  id: Id,
  game: Id,
  name: z.string().min(1),
  family: Id,
  slot: Id.optional(),
  effect: z.string().default(""),
});

export type Prio = z.output<typeof Prio>;
// Les champs de la révision 2 restent optionnels dans les types : les objets de la révision 1 restent valides,
// et les schémas les complètent à [] au chargement et à l'import.
type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type Build = Optional<z.output<typeof BuildSchema>, "order" | "potions">;
export type Run = Optional<z.output<typeof RunSchema>, "potions" | "skipped">;
export type CustomItem = z.output<typeof CustomItemSchema>;

export interface Library {
  builds: Build[];
  runs: Run[];
  custom: CustomItem[];
}
