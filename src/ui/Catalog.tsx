// Catalogue des bénédictions (HANDOFF §6.6) : filtre par fae, recherche, prérequis en texte, ajouts manuels.
import { useState } from "react";
import { useApp } from "./context";
import { FaeDot } from "./items";
import { requirementsLabel, typeLine } from "./labels";
import { strings as t } from "./strings";

/** `custom:<nom-normalisé>-<4 caractères>` (HANDOFF §3.4). */
export function customId(name: string, random: string): string {
  const slug = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `custom:${slug}-${random.replace(/[^a-z0-9]/gi, "").slice(0, 4).toLowerCase()}`;
}

export function Catalog() {
  const { state, dispatch, pack } = useApp();
  const [query, setQuery] = useState("");
  const family = state.codexFamily;
  const q = query.trim().toLowerCase();
  const list = pack.items.filter(
    (x) => (family === "all" || x.families.includes(family)) && (!q || x.name.toLowerCase().includes(q) || x.effect.toLowerCase().includes(q)),
  );

  return (
    <section className="view">
      <div>
        <div className="eyebrow">{t.catalogEyebrow(pack.game.name, pack.items.length)}</div>
        <h2>{t.catalogTitle}</h2>
        <p className="muted" style={{ margin: "6px 0 0", fontSize: ".85rem" }}>
          {t.sources} :{" "}
          {pack.game.sources.map((s, i) => (
            <span key={s.url}>
              {i > 0 && " · "}
              <a href={s.url} target="_blank" rel="noreferrer" style={{ color: "inherit" }}>{s.name}</a>
              {s.license && ` (${s.license})`}
            </span>
          ))}
        </p>
      </div>
      <div className="faes">
        <button className="chip fae" aria-pressed={family === "all"} onClick={() => dispatch({ type: "codexFamily", family: "all" })}>
          {t.allFamilies}
        </button>
        {pack.families.map((f) => (
          <button key={f.id} className="chip fae" data-fae={f.id} aria-pressed={family === f.id} onClick={() => dispatch({ type: "codexFamily", family: f.id })}>
            <span className="dot" />
            {f.name}
          </button>
        ))}
      </div>
      <input className="search" type="search" aria-label={t.catalogSearch} placeholder={t.catalogSearch} value={query} onChange={(e) => setQuery(e.target.value)} />
      <div className="split">
        <div className="blist" style={{ minWidth: 0 }}>
          {list.length ? (
            list.map((x) => (
              <div key={x.id} className="bitem">
                <FaeDot item={x} />
                <div>
                  <div className="bn">{x.name}</div>
                  <div className="be">{x.effect}</div>
                  <div className="bt">{typeLine(pack, x)}</div>
                  {x.kind !== "ability" && <div className="bt">{requirementsLabel(pack, x)}</div>}
                </div>
                {x.kind === "custom" && (
                  <button className="btn small ghost danger" aria-label={`${t.customRemove} ${x.name}`} onClick={() => dispatch({ type: "customRemoved", id: x.id })}>
                    {t.customRemove}
                  </button>
                )}
              </div>
            ))
          ) : (
            <p className="empty">{t.catalogEmpty}</p>
          )}
        </div>
        <CustomForm />
      </div>
    </section>
  );
}

function CustomForm() {
  const { dispatch, pack, env } = useApp();
  const [name, setName] = useState("");
  const [family, setFamily] = useState(pack.families[0]?.id ?? "other");
  const [slot, setSlot] = useState("");
  const [effect, setEffect] = useState("");

  const add = () => {
    const n = name.trim();
    if (!n) return dispatch({ type: "toast", text: t.customNameMissing });
    dispatch({
      type: "customAdded",
      item: {
        id: customId(n, env.uuid()), game: pack.game.id, name: n, family,
        ...(slot ? { slot } : {}), effect: effect.trim() || t.customEffectDefault,
      },
      toast: t.toastPicked(n),
    });
    setName("");
    setEffect("");
    setSlot("");
  };

  return (
    <form
      className="side panel"
      onSubmit={(e) => {
        e.preventDefault();
        add();
      }}
    >
      <h3>{t.customTitle}</h3>
      <p className="muted" style={{ margin: 0, fontSize: ".88rem" }}>{t.customHelp}</p>
      <label className="field">
        {t.customName}
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <div className="grid-fields">
        <label className="field">
          {t.customFamily}
          <select value={family} onChange={(e) => setFamily(e.target.value)}>
            {pack.families.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            <option value="other">{t.otherFamily}</option>
          </select>
        </label>
        <label className="field">
          {t.customSlot}
          <select value={slot} onChange={(e) => setSlot(e.target.value)}>
            <option value="">{t.customStandard}</option>
            {pack.slots.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </label>
      </div>
      <label className="field">
        {t.customEffect}
        <input value={effect} onChange={(e) => setEffect(e.target.value)} />
      </label>
      <button className="btn primary" type="submit">{t.customAdd}</button>
    </form>
  );
}
