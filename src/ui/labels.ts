// Libellés des prérequis et des bénédictions (HANDOFF §6.3), construits depuis le pack.
import { itemIndex, type Alternative, type Item, type Pack } from "@rogue/core";
import { strings as t } from "./strings";

export const familyName = (pack: Pack, id: string) => pack.families.find((f) => f.id === id)?.name ?? t.otherFamily;

export function alternativeLabel(pack: Pack, alt: Alternative): string {
  const index = itemIndex(pack);
  if ("item" in alt) return index.get(alt.item)?.name ?? alt.item;
  if ("trigger" in alt) {
    const label = pack.triggers.find((x) => x.id === alt.trigger)?.label ?? alt.trigger;
    return t.req.trigger(label, alt.except && (index.get(alt.except)?.name ?? alt.except));
  }
  if ("slot" in alt) {
    const slots = alt.slot.slots.map((id) => {
      const slot = pack.slots.find((s) => s.id === id);
      return slot?.short ?? slot?.label.toLowerCase() ?? id;
    });
    return t.req.slot(t.req.of(familyName(pack, alt.slot.family)), slots);
  }
  return t.req.count(alt.count.min, t.req.of(familyName(pack, alt.count.family)));
}

/** Un groupe : ses alternatives jointes par « ou ». */
export const groupLabel = (pack: Pack, group: Alternative[]) => group.map((a) => alternativeLabel(pack, a)).join(t.req.or);

/** Tous les groupes, joints par « et » ; « Aucun prérequis » sans prérequis. */
export function requirementsLabel(pack: Pack, item: Item): string {
  if (!item.requires.length) return t.req.none;
  return t.req.prefix + item.requires.map((g) => groupLabel(pack, g)).join(t.req.and);
}

/** « Aptitude · Attaque légère · Lugh » ; les fae d'un duo jointes par « + ». */
export function typeLine(pack: Pack, item: Item): string {
  const kind = pack.kinds.find((k) => k.id === item.kind)?.label ?? item.kind;
  const slot = item.slot ? pack.slots.find((s) => s.id === item.slot)?.label : undefined;
  const families = item.families.map((f) => familyName(pack, f)).join(" + ");
  return [kind, slot, families].filter(Boolean).join(" · ");
}
