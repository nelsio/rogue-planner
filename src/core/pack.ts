// Pack de jeu : schéma, chargement avec contrôles croisés, ajout des bénédictions saisies à la main.
import type { CustomItem } from "./schemas";
import { z, zodErrors, type FieldError } from "./zod";

const Id = z.string().min(1);

const AlternativeSchema = z.union([
  z.strictObject({ item: Id }),
  z.strictObject({ trigger: Id, except: Id.optional() }),
  z.strictObject({ slot: z.strictObject({ family: Id, slots: z.array(Id).min(1) }) }),
  z.strictObject({ count: z.strictObject({ family: Id, min: z.number().int().positive() }) }),
]);

export const ITEM_KINDS = ["ability", "standard", "duo", "roundtable", "custom"] as const;

const ItemSchema = z.strictObject({
  id: Id,
  name: z.string().min(1),
  kind: z.enum(ITEM_KINDS),
  families: z.array(Id).min(1),
  slot: Id.optional(),
  effect: z.string(),
  provides: z.array(Id).optional(),
  // Groupes tous requis ; dans un groupe, une alternative suffit.
  requires: z.array(z.array(AlternativeSchema).min(1)),
});

const Labelled = z.strictObject({ id: Id, label: z.string().min(1) });

export const PackSchema = z.strictObject({
  $schema: z.string().optional(),
  format: z.literal("rogue-planner-pack"),
  version: z.literal(1),
  game: z.strictObject({
    id: Id,
    name: z.string().min(1),
    dataVersion: z.string().min(1),
    sources: z.array(
      z.strictObject({ what: z.string().optional(), name: z.string().min(1), url: z.url(), license: z.string().optional() }),
    ),
  }),
  labels: z.record(z.string(), z.string()),
  // `short` : libellé court dans les prérequis (« une aptitude de Lugh (légère, lourde) »).
  slots: z.array(z.strictObject({ id: Id, label: z.string().min(1), short: z.string().min(1).optional() })).min(1),
  kinds: z.array(Labelled),
  families: z.array(
    z.strictObject({
      id: Id,
      name: z.string().min(1),
      title: z.string(),
      status: z.string(),
      color: z.strictObject({ light: z.string().min(1), dark: z.string().min(1) }),
    }),
  ),
  triggers: z.array(Labelled),
  loadouts: z.array(z.strictObject({ id: Id, name: z.string().min(1), weapons: z.array(Id), spells: z.array(Id) })),
  items: z.array(ItemSchema),
  augments: z.array(
    z.strictObject({
      for: Id,
      options: z.array(z.strictObject({ id: Id, name: z.string().min(1), effect: z.string() })),
    }),
  ),
  // Potions d'un run : une par fae (§4.8).
  potions: z.strictObject({ perRun: z.number().int().positive(), from: z.literal("families") }),
  otherChoices: z.array(Labelled),
});

export type PackData = z.output<typeof PackSchema>;
/** Pack validé, avec l'index des bénédictions par identifiant. */
export type Pack = PackData & { byId: Map<string, Item> };
export type Item = PackData["items"][number];
export type ItemKind = Item["kind"];
export type Alternative = z.output<typeof AlternativeSchema>;
export type SlotId = string;

export class PackFormatError extends Error {
  readonly errors: FieldError[];
  constructor(errors: FieldError[]) {
    super(`Pack de jeu invalide :\n${errors.map((e) => `- ${e.path} : ${e.message}`).join("\n")}`);
    this.name = "PackFormatError";
    this.errors = errors;
  }
}

/** Valide un pack (schéma puis références croisées). Lève PackFormatError. */
export function loadPack(json: unknown): Pack {
  const parsed = PackSchema.safeParse(json);
  if (!parsed.success) throw new PackFormatError(zodErrors(parsed.error));
  const errors = crossCheck(parsed.data);
  if (errors.length) throw new PackFormatError(errors);
  return indexed(parsed.data);
}

function indexed(data: PackData): Pack {
  return { ...data, byId: new Map(data.items.map((i) => [i.id, i])) };
}

function crossCheck(pack: PackData): FieldError[] {
  const errors: FieldError[] = [];
  const err = (path: string, message: string) => errors.push({ path, message });

  const uniqueIds = (list: { id: string }[], name: string, label: string) => {
    const seen = new Set<string>();
    list.forEach((x, i) => {
      if (seen.has(x.id)) err(`${name}.${i}.id`, `${label} en double : « ${x.id} »`);
      seen.add(x.id);
    });
    return seen;
  };
  const slots = uniqueIds(pack.slots, "slots", "Emplacement");
  uniqueIds(pack.kinds, "kinds", "Type");
  const families = uniqueIds(pack.families, "families", "Fae");
  const triggers = uniqueIds(pack.triggers, "triggers", "Déclencheur");
  uniqueIds(pack.loadouts, "loadouts", "Classe");
  const items = uniqueIds(pack.items, "items", "Bénédiction");
  uniqueIds(pack.otherChoices, "otherChoices", "Autre choix");

  const ref = (set: Set<string>, value: string, path: string, label: string) => {
    if (!set.has(value)) err(path, `${label} inconnu(e) : « ${value} »`);
  };

  pack.items.forEach((item, i) => {
    const at = `items.${i}`;
    item.families.forEach((f, j) => ref(families, f, `${at}.families.${j}`, "Fae"));
    if (item.slot !== undefined) ref(slots, item.slot, `${at}.slot`, "Emplacement");
    else if (item.kind === "ability") err(`${at}.slot`, "Une aptitude doit avoir un emplacement");
    item.provides?.forEach((t, j) => ref(triggers, t, `${at}.provides.${j}`, "Déclencheur"));
    item.requires.forEach((group, g) =>
      group.forEach((alt, a) => {
        const p = `${at}.requires.${g}.${a}`;
        if ("item" in alt) ref(items, alt.item, `${p}.item`, "Bénédiction");
        else if ("trigger" in alt) {
          ref(triggers, alt.trigger, `${p}.trigger`, "Déclencheur");
          if (alt.except !== undefined) ref(items, alt.except, `${p}.except`, "Bénédiction");
        } else if ("slot" in alt) {
          ref(families, alt.slot.family, `${p}.slot.family`, "Fae");
          alt.slot.slots.forEach((s, k) => ref(slots, s, `${p}.slot.slots.${k}`, "Emplacement"));
        } else ref(families, alt.count.family, `${p}.count.family`, "Fae");
      }),
    );
  });

  const kit = new Set(pack.loadouts.flatMap((l) => [...l.weapons, ...l.spells]));
  const options = new Set<string>();
  pack.augments.forEach((aug, i) => {
    ref(kit, aug.for, `augments.${i}.for`, "Arme ou sort");
    aug.options.forEach((o, j) => {
      if (options.has(o.id)) err(`augments.${i}.options.${j}.id`, `Enclume en double : « ${o.id} »`);
      options.add(o.id);
    });
  });
  return errors;
}

const CUSTOM_KIND = { id: "custom", label: "Ajoutée" };

/** Ajoute au pack les bénédictions saisies à la main (type « custom », sans prérequis). */
export function withCustom(pack: Pack, custom: readonly CustomItem[]): Pack {
  const added: Item[] = custom
    .filter((c) => !pack.byId.has(c.id))
    .map((c) => ({
      id: c.id,
      name: c.name,
      kind: "custom",
      families: [c.family],
      ...(c.slot ? { slot: c.slot } : {}),
      effect: c.effect,
      requires: [],
    }));
  const kinds = pack.kinds.some((k) => k.id === CUSTOM_KIND.id) ? pack.kinds : [...pack.kinds, CUSTOM_KIND];
  return indexed({ ...pack, kinds, items: [...pack.items, ...added] });
}

export function getItem(pack: Pack, itemId: string): Item {
  const item = pack.byId.get(itemId);
  if (!item) throw new Error(`Bénédiction inconnue : « ${itemId} »`);
  return item;
}
