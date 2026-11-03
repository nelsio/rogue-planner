// Sélecteur « Ajouter » de la Création (HANDOFF §6.3) : feuille en bas sur mobile, fenêtre centrée sur ordinateur.
// En restreint, les bénédictions verrouillées sont listées à part, grisées et non cliquables.
import { useEffect, useRef, useState } from "react";
import { buildOwned, missing, type Build, type Item } from "@rogue/core";
import { useApp } from "./context";
import { ModeSwitch } from "./ModeSwitch";
import { FaeDot, ItemText } from "./items";
import { strings as t } from "./strings";

/** Au plus 120 lignes par section, comme le prototype : la recherche affine. */
const MAX_ROWS = 120;

export function Picker(props: { build: Build; onSave(build: Build, toast?: string): void; onClose(): void; onMode(mode: Build["mode"]): void }) {
  const { build: b, onClose } = props;
  const { pack } = useApp();
  const [query, setQuery] = useState("");
  const [family, setFamily] = useState("all");
  const search = useRef<HTMLInputElement>(null);

  useEffect(() => {
    search.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const owned = buildOwned(b);
  const restricted = b.mode === "restricted";
  const q = query.trim().toLowerCase();
  const shown = pack.items.filter(
    (x) => (family === "all" || x.families.includes(family)) && (!q || x.name.toLowerCase().includes(q) || x.effect.toLowerCase().includes(q)),
  );
  const isLocked = (x: Item) => missing(pack, x.id, owned).length > 0;
  const open = restricted ? shown.filter((x) => !isLocked(x)) : shown;
  const locked = restricted ? shown.filter(isLocked) : [];

  const choose = (x: Item) => {
    // Une aptitude (ou un ajout manuel avec emplacement) prend sa place ; sinon la bénédiction est visée en bonus.
    let next = b;
    if (x.slot && (x.kind === "ability" || x.kind === "custom")) next = { ...b, abilities: { ...b.abilities, [x.slot]: x.id } };
    else if (!b.targets.some((target) => target.id === x.id)) next = { ...b, targets: [...b.targets, { id: x.id, prio: "bonus" }] };
    props.onSave(next, t.toastAimed(x.name));
    onClose();
  };

  const row = (x: Item, disabled: boolean) => {
    const body = (
      <>
        <FaeDot item={x} />
        <ItemText pack={pack} item={x} owned={owned} />
      </>
    );
    return disabled ? (
      <div key={x.id} className="bitem locked" aria-disabled="true">{body}</div>
    ) : (
      <button key={x.id} className={owned.has(x.id) ? "bitem got" : "bitem"} onClick={() => choose(x)}>{body}</button>
    );
  };

  return (
    <div className="sheet-scrim" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={t.pickerLabel}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h2>{t.pickerTitleBuild}</h2>
          <ModeSwitch mode={b.mode} onChange={props.onMode} />
          <button className="btn small ghost" onClick={onClose}>{t.close}</button>
        </div>
        <div style={{ display: "grid", gap: 8 }}>
          <input
            ref={search}
            className="search"
            type="search"
            aria-label={t.searchPlaceholder}
            placeholder={t.searchPlaceholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="faes">
            <button className="chip fae" aria-pressed={family === "all"} onClick={() => setFamily("all")}>{t.allFamilies}</button>
            {pack.families.map((f) => (
              <button key={f.id} className="chip fae" data-fae={f.id} aria-pressed={family === f.id} onClick={() => setFamily(f.id)}>
                <span className="dot" />
                {f.name}
              </button>
            ))}
          </div>
        </div>
        <div className="scroll">
          <div className="blist">
            {restricted && <h3>{t.available(open.length)}</h3>}
            {open.length ? open.slice(0, MAX_ROWS).map((x) => row(x, false)) : <p className="empty">{restricted ? t.nothingUnlocked : t.noResult}</p>}
          </div>
          {locked.length > 0 && (
            <details className="blist" open>
              <summary className="muted">{t.locked(locked.length)}</summary>
              <div className="blist" style={{ marginTop: 6 }}>
                {locked.slice(0, MAX_ROWS).map((x) => row(x, true))}
              </div>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}
