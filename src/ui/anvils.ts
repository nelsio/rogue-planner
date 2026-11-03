// Enclumes : augments de l'arme puis du sort d'un kit (Création et RUN).
import type { Pack } from "@rogue/core";

export function anvilGroups(pack: Pack, kit: { weapon: string; spell: string }) {
  const options = (name: string) => pack.augments.find((a) => a.for === name)?.options ?? [];
  return [
    { kind: pack.labels.loadoutWeapon ?? "", name: kit.weapon, options: options(kit.weapon) },
    { kind: pack.labels.loadoutSpell ?? "", name: kit.spell, options: options(kit.spell) },
  ];
}
