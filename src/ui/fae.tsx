// Pastilles de fae : seules marques visuelles du jeu (aucune ressource graphique de SWORN).
import type { Build, Pack } from "@rogue/core";
import { itemIndex } from "@rogue/core";

/** Fae d'un build : celles des aptitudes et des bénédictions visées (hors duos), dans l'ordre d'apparition. */
export function buildFamilies(pack: Pack, build: Build): string[] {
  const index = itemIndex(pack);
  const out = new Set<string>();
  for (const id of Object.values(build.abilities)) if (id) index.get(id)?.families.forEach((f) => out.add(f));
  for (const t of build.targets) {
    const item = index.get(t.id);
    if (item && item.kind !== "duo") item.families.forEach((f) => out.add(f));
  }
  return [...out];
}

export function FaeChip({ pack, family }: { pack: Pack; family: string }) {
  const name = pack.families.find((f) => f.id === family)?.name ?? family;
  return (
    <span className="fae chip" data-fae={family}>
      <span className="dot" />
      {name}
    </span>
  );
}
