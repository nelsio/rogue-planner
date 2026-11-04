// Mode Création (HANDOFF §6.3) : départ, aptitudes, bénédictions visées, totaux par fae, potions, duos,
// ordre d'acquisition, enclumes, notes.
import { useState } from "react";
import { buildOwned, buildPotions, familyProgress, missing, planOrder, reachableDuos, toggleTarget, type Build } from "@rogue/core";
import { anvilGroups } from "./anvils";
import { useApp } from "./context";
import { FamilyTotals } from "./fae";
import { FaeDot, ItemText } from "./items";
import { KitFields } from "./KitFields";
import { familyName } from "./labels";
import { Library } from "./Library";
import { ModeSwitch } from "./ModeSwitch";
import { OrderPanel } from "./OrderPanel";
import { Picker } from "./Picker";
import { strings as t } from "./strings";
import { useStartRun } from "./useStartRun";

export function Editor() {
  const { state } = useApp();
  const build = state.builds.find((b) => b.id === state.editingId);
  return build ? <BuildEditor build={build} /> : <Library />;
}

function BuildEditor({ build: b }: { build: Build }) {
  const { dispatch, pack, env } = useApp();
  const [picking, setPicking] = useState(false);
  const { start, confirmFor } = useStartRun();
  const save = (next: Build, toast?: string) => {
    // Les ids d'ordre sortis du plan sont nettoyés à la sauvegarde (§3.2).
    const plan = new Set(planOrder(pack, next));
    const order = (next.order ?? []).filter((id) => plan.has(id));
    dispatch({ type: "buildSaved", build: { ...next, order, updatedAt: env.now() }, toast });
  };

  const index = pack.byId;
  const owned = buildOwned(b);
  const restricted = b.mode === "restricted";
  const totals = familyProgress(pack, planOrder(pack, b));
  const potions = buildPotions(pack, b);
  const setPotion = (i: number, family: string) => save({ ...b, potions: potions.map((p, j) => (j === i ? family || null : p)) });
  const duos = reachableDuos(pack, owned, { restricted }).filter((id) => !b.targets.some((x) => x.id === id));

  const setMode = (mode: Build["mode"]) => mode !== b.mode && save({ ...b, mode }, t.toastMode[mode]);

  return (
    <section className="view">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <div className="eyebrow">{t.editorEyebrow}</div>
          <h2>{b.name}</h2>
        </div>
        <div className="row">
          <button className="btn primary" onClick={() => start(b.id)}>{t.startRun}</button>
          <button className="btn ghost" onClick={() => dispatch({ type: "go", view: "builds" })}>{t.backToLibrary}</button>
        </div>
      </div>
      {confirmFor(b.id)}
      <div className="split">
        <div style={{ display: "grid", gap: 16, minWidth: 0 }}>
          <div className="panel">
            <h3>{t.start}</h3>
            <label className="field">
              {t.buildName}
              <input value={b.name} onChange={(e) => save({ ...b, name: e.target.value })} />
            </label>
            <KitFields kit={b} onChange={(kit) => save({ ...b, ...kit })} />
            <div className="row">
              <ModeSwitch mode={b.mode} onChange={setMode} />
              <span className="muted" style={{ fontSize: ".88rem" }}>{t.modeHelp[b.mode]}</span>
            </div>
          </div>

          <div className="panel">
            <h3>{t.abilitiesTitle}</h3>
            <p className="muted" style={{ margin: 0, fontSize: ".88rem" }}>{t.abilitiesHelp}</p>
            <div className="slots">
              {pack.slots.map((slot) => {
                const current = b.abilities[slot.id] ? index.get(b.abilities[slot.id]!) : undefined;
                const options = pack.items.filter((x) => (x.kind === "ability" || x.kind === "custom") && x.slot === slot.id);
                return (
                  <label key={slot.id} className={current ? "slot filled fae" : "slot empty-slot"} data-fae={current?.families[0]}>
                    <span className="sl">{slot.label}</span>
                    <select
                      className="slot-select"
                      value={b.abilities[slot.id] ?? ""}
                      onChange={(e) => save({ ...b, abilities: { ...b.abilities, [slot.id]: e.target.value || null } })}
                    >
                      <option value="">{t.slotFree}</option>
                      {options.map((o) => (
                        <option key={o.id} value={o.id}>{familyName(pack, o.families[0])} · {o.name}</option>
                      ))}
                    </select>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="panel">
            <div className="row" style={{ justifyContent: "space-between" }}>
              <h3>{t.targetsTitle}</h3>
              <button className="btn small" onClick={() => setPicking(true)}>{t.add}</button>
            </div>
            <div className="blist">
              {b.targets.length ? (
                b.targets.map((target) => {
                  const item = index.get(target.id);
                  if (!item) return null;
                  const warn = restricted && missing(pack, item.id, owned).length > 0;
                  return (
                    <div key={item.id} className={warn ? "bitem warn" : "bitem"}>
                      <FaeDot item={item} />
                      <ItemText pack={pack} item={item} owned={owned} />
                      <div className="row" style={{ flexWrap: "nowrap" }}>
                        <button
                          className="prio"
                          data-p={target.prio}
                          title={t.prioTitle}
                          onClick={() =>
                            save({ ...b, targets: b.targets.map((x) => (x.id === item.id ? { ...x, prio: x.prio === "core" ? "bonus" : "core" } : x)) })
                          }
                        >
                          {t.prio[target.prio]}
                        </button>
                        <button
                          className="btn small ghost"
                          aria-label={t.removeItem(item.name)}
                          onClick={() => save({ ...b, targets: b.targets.filter((x) => x.id !== item.id) })}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="empty">{t.noTargets}</p>
              )}
            </div>
          </div>
        </div>

        <aside className="side" style={{ display: "grid", gap: 16, minWidth: 0 }}>
          <div className="panel">
            <h3>{t.buildFamilies}</h3>
            <div className="faes">
              <FamilyTotals pack={pack} totals={totals} empty={t.noBuildFamilies} />
            </div>
            <p className="muted" style={{ margin: 0, fontSize: ".82rem" }}>{t.buildFamiliesHelp}</p>
          </div>
          <div className="panel">
            <h3>{t.potionsTitle}</h3>
            <div className="pots">
              {potions.map((f, i) => (
                <label key={i} className={f ? "pot fae filled" : "pot fae"} data-fae={f ?? undefined}>
                  <span className="sl">{t.potion(i)}</span>
                  <select aria-label={t.potion(i)} value={f ?? ""} onChange={(e) => setPotion(i, e.target.value)}>
                    <option value="">{t.noPotion}</option>
                    {pack.families.map((x) => (
                      <option key={x.id} value={x.id}>{x.name}</option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
            <p className="muted" style={{ margin: 0, fontSize: ".82rem" }}>{t.potionsHelp}</p>
          </div>
          <div className="panel">
            <h3>{t.duosTitle}</h3>
            <div className="blist">
              {duos.length ? (
                duos.map((id) => {
                  const duo = index.get(id)!;
                  return (
                    <div key={id} className="bitem">
                      <FaeDot item={duo} />
                      <div>
                        <div className="bn">{duo.name}</div>
                        <div className="be">{duo.effect}</div>
                      </div>
                      <button className="btn small" onClick={() => save(toggleTarget(pack, b, id))}>{t.aim}</button>
                    </div>
                  );
                })
              ) : (
                <p className="empty">{t.noDuos}</p>
              )}
            </div>
          </div>
        </aside>
      </div>

      <OrderPanel build={b} onSave={save} />

      <div className="panel">
        <h3>{t.anvilsTitle}</h3>
        {anvilGroups(pack, b).map((g) => (
          <div key={g.kind} className="stack-s">
            <div className="eyebrow">{g.kind} · {g.name}</div>
            <div className="aug-grid">
              {g.options.length ? (
                g.options.map((a) => {
                  const on = b.anvils.includes(a.id);
                  return (
                    <button
                      key={a.id}
                      className="aug"
                      aria-pressed={on}
                      onClick={() => save({ ...b, anvils: on ? b.anvils.filter((x) => x !== a.id) : [...b.anvils, a.id] })}
                    >
                      <span className="bn">{a.name}</span>
                      <span className="be">{a.effect}</span>
                    </button>
                  );
                })
              ) : (
                <p className="empty">{t.noAnvils}</p>
              )}
            </div>
          </div>
        ))}
        <p className="muted" style={{ margin: 0, fontSize: ".85rem" }}>{t.anvilsHelp}</p>
      </div>

      <div className="panel">
        <h3>{t.notes}</h3>
        <label className="field">
          <span className="muted">{t.notesHelp}</span>
          <textarea value={b.notes} onChange={(e) => save({ ...b, notes: e.target.value })} />
        </label>
      </div>

      {picking && <Picker mode="build" build={b} onSave={save} onClose={() => setPicking(false)} onMode={setMode} />}
    </section>
  );
}
