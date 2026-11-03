// Sélecteur Libre / Restreint, dans la Création et repris dans l'en-tête du sélecteur « Ajouter ».
import type { Build } from "@rogue/core";
import { strings as t } from "./strings";

export function ModeSwitch({ mode, onChange }: { mode: Build["mode"]; onChange(mode: Build["mode"]): void }) {
  return (
    <div className="seg" role="group" aria-label={t.modeGroup}>
      <button aria-pressed={mode === "free"} onClick={() => onChange("free")}>{t.free}</button>
      <button aria-pressed={mode === "restricted"} onClick={() => onChange("restricted")}>{t.restricted}</button>
    </div>
  );
}
