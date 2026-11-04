// Prérequis et duos. L'ensemble « possédé » vaut buildOwned(build) en Création, les prises en RUN.
import { getItem, type Alternative, type Item, type Pack } from "./pack";
import type { Build } from "./schemas";

function ownedItems(pack: Pack, owned: Iterable<string>): Item[] {
  const index = pack.byId;
  return [...new Set(owned)].flatMap((id) => index.get(id) ?? []);
}

function satisfied(alt: Alternative, self: string, owned: Item[]): boolean {
  if ("item" in alt) return owned.some((o) => o.id === alt.item);
  if ("trigger" in alt) {
    // Une bénédiction ne se débloque pas elle-même ; « sauf » ignore aussi la bénédiction citée.
    return owned.some((o) => o.id !== self && o.id !== alt.except && !!o.provides?.includes(alt.trigger));
  }
  if ("slot" in alt) {
    const { family, slots } = alt.slot;
    return owned.some((o) => o.kind === "ability" && o.families.includes(family) && slots.includes(o.slot!));
  }
  // Table ronde : duos et Tables rondes ne comptent pas.
  const { family, min } = alt.count;
  const n = owned.filter((o) => o.families.includes(family) && o.kind !== "duo" && o.kind !== "roundtable").length;
  return n >= min;
}

/** Groupes de prérequis non remplis, dans l'ordre déclaré. */
export function missing(pack: Pack, itemId: string, owned: Iterable<string>): Alternative[][] {
  const item = getItem(pack, itemId);
  const have = ownedItems(pack, owned);
  return item.requires.filter((group) => !group.some((alt) => satisfied(alt, itemId, have)));
}

export function isUnlocked(pack: Pack, itemId: string, owned: Iterable<string>): boolean {
  return missing(pack, itemId, owned).length === 0;
}

/** Aptitudes et bénédictions visées d'un build. */
export function buildOwned(build: Build): Set<string> {
  const abilities = Object.values(build.abilities).filter((id): id is string => !!id);
  return new Set([...abilities, ...build.targets.map((t) => t.id)]);
}

/** Duos dont toutes les fae sont présentes (hors duos possédés) ; en restreint, seulement les débloqués. */
export function reachableDuos(pack: Pack, owned: Iterable<string>, opts: { restricted: boolean }): string[] {
  const ownedIds = new Set(owned);
  const have = ownedItems(pack, ownedIds);
  const families = new Set(have.filter((o) => o.kind !== "duo").flatMap((o) => o.families));
  return pack.items
    .filter((i) => i.kind === "duo" && !ownedIds.has(i.id) && i.families.every((f) => families.has(f)))
    .filter((i) => !opts.restricted || isUnlocked(pack, i.id, ownedIds))
    .map((i) => i.id);
}
