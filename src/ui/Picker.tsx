// Sélecteur de bénédiction : feuille en bas sur mobile, fenêtre centrée sur ordinateur.
// Recherche, puces de fae et filtre de type. Création (HANDOFF §6.3) : en restreint, les verrouillées sont listées à part,
// grisées et non cliquables.
// RUN (§6.4) : « Prévues dans le build » d'abord ; les verrouillées en bas, grisées mais choisissables (le jeu fait foi).
import { useEffect, useRef, useState } from "react";
import { buildOwned, missing, type Build, type Item, type Run } from "@rogue/core";
import { useApp } from "./context";
import { FaeDot, ItemText } from "./items";
import { ModeSwitch } from "./ModeSwitch";
import { strings as t } from "./strings";

/** Au plus 120 lignes par section, comme le prototype : la recherche affine. */
const MAX_ROWS = 120;

type KindFilter = keyof typeof t.types;
const KIND_FILTERS = Object.keys(t.types) as KindFilter[];

type PickerProps =
  | { mode: "build"; build: Build; onSave(build: Build, toast?: string): void; onMode(mode: Build["mode"]): void; onClose(): void }
  | { mode: "run"; run: Run; build: Build | null; onPick(item: Item): void; onClose(): void };

export function Picker(props: PickerProps) {
  const { onClose } = props;
  const { pack } = useApp();
  const [query, setQuery] = useState("");
  const [family, setFamily] = useState("all");
  const [kind, setKind] = useState<KindFilter>("all");
  const search = useRef<HTMLInputElement>(null);

  useEffect(() => {
    search.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const run = props.mode === "run";
  const build = props.build;
  // Possédé : prises en RUN, aptitudes + visées en Création. Prévu : le plan du build.
  const owned = run ? new Set(props.run.picks.map((p) => p.id)) : buildOwned(props.build);
  const planned = build ? buildOwned(build) : new Set<string>();
  const restricted = !run && props.build.mode === "restricted";

  const q = query.trim().toLowerCase();
  // Filtre de type : un ajout manuel avec emplacement compte comme une aptitude.
  const ofKind = (x: Item) => kind === "all" || x.kind === kind || (kind === "ability" && x.kind === "custom" && !!x.slot);
  const shown = pack.items.filter(
    (x) =>
      (family === "all" || x.families.includes(family)) &&
      ofKind(x) &&
      (!q || x.name.toLowerCase().includes(q) || x.effect.toLowerCase().includes(q)),
  );
  const isLocked = (x: Item) => missing(pack, x.id, owned).length > 0;
  const firstPlanned = run && build && !q ? shown.filter((x) => planned.has(x.id) && !owned.has(x.id)) : [];
  const rest = shown.filter((x) => !firstPlanned.includes(x));
  const open = restricted || run ? rest.filter((x) => !isLocked(x)) : rest;
  const locked = restricted || run ? rest.filter(isLocked) : [];

  const choose = (x: Item) => {
    if (props.mode === "run") props.onPick(x);
    else {
      // Une aptitude (ou un ajout manuel avec emplacement) prend sa place ; sinon la bénédiction est visée en bonus.
      const b = props.build;
      let next = b;
      if (x.slot && (x.kind === "ability" || x.kind === "custom")) next = { ...b, abilities: { ...b.abilities, [x.slot]: x.id } };
      else if (!b.targets.some((target) => target.id === x.id)) next = { ...b, targets: [...b.targets, { id: x.id, prio: "bonus" }] };
      props.onSave(next, t.toastAimed(x.name));
    }
    onClose();
  };

  const row = (x: Item, state: "open" | "dim" | "locked") => {
    const body = (
      <>
        <FaeDot item={x} />
        <ItemText pack={pack} item={x} owned={owned} />
        {run && planned.has(x.id) && <span className="tag plan">{t.tagPlanned}</span>}
      </>
    );
    if (state === "locked") return <div key={x.id} className="bitem locked" aria-disabled="true">{body}</div>;
    const cls = ["bitem", owned.has(x.id) && "got", state === "dim" && "dim"].filter(Boolean).join(" ");
    return <button key={x.id} className={cls} onClick={() => choose(x)}>{body}</button>;
  };

  const list = run ? [...open.map((x) => row(x, "open")), ...locked.map((x) => row(x, "dim"))] : open.map((x) => row(x, "open"));

  return (
    <div className="sheet-scrim" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={t.pickerLabel}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h2>{run ? t.pickerTitleRun : t.pickerTitleBuild}</h2>
          {props.mode === "build" && <ModeSwitch mode={props.build.mode} onChange={props.onMode} />}
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
          <div className="seg small" role="group" aria-label={t.typeGroup}>
            {KIND_FILTERS.map((k) => (
              <button key={k} aria-pressed={kind === k} onClick={() => setKind(k)}>{t.types[k]}</button>
            ))}
          </div>
        </div>
        <div className="scroll">
          {firstPlanned.length > 0 && (
            <div className="blist">
              <h3>{t.plannedInBuild}</h3>
              {firstPlanned.map((x) => row(x, isLocked(x) ? "dim" : "open"))}
            </div>
          )}
          <div className="blist">
            {firstPlanned.length > 0 && <h3>{t.everything}</h3>}
            {restricted && <h3>{t.available(open.length)}</h3>}
            {list.length ? list.slice(0, MAX_ROWS) : <p className="empty">{restricted ? t.nothingUnlocked : t.noResult}</p>}
          </div>
          {locked.length > 0 && !run && (
            <details className="blist" open>
              <summary className="muted">{t.locked(locked.length)}</summary>
              <div className="blist" style={{ marginTop: 6 }}>
                {locked.slice(0, MAX_ROWS).map((x) => row(x, "locked"))}
              </div>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}
