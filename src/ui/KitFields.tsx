// Classe, arme et sort : arme et sort filtrés par classe ; changer de classe prend la première arme et le premier sort.
import { useApp } from "./context";

export interface Kit {
  hero: string;
  weapon: string;
  spell: string;
}

export function KitFields({ kit, onChange }: { kit: Kit; onChange(kit: Kit): void }) {
  const { pack } = useApp();
  const hero = pack.loadouts.find((l) => l.id === kit.hero) ?? pack.loadouts[0];
  return (
    <div className="grid-fields">
      <label className="field">
        {pack.labels.loadoutHero}
        <select
          value={hero.id}
          onChange={(e) => {
            const h = pack.loadouts.find((l) => l.id === e.target.value)!;
            onChange({ hero: h.id, weapon: h.weapons[0], spell: h.spells[0] });
          }}
        >
          {pack.loadouts.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      </label>
      <label className="field">
        {pack.labels.loadoutWeapon}
        <select value={kit.weapon} onChange={(e) => onChange({ ...kit, weapon: e.target.value })}>
          {hero.weapons.map((w) => <option key={w}>{w}</option>)}
        </select>
      </label>
      <label className="field">
        {pack.labels.loadoutSpell}
        <select value={kit.spell} onChange={(e) => onChange({ ...kit, spell: e.target.value })}>
          {hero.spells.map((s) => <option key={s}>{s}</option>)}
        </select>
      </label>
    </div>
  );
}
