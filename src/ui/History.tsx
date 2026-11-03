// Historique des runs terminés (HANDOFF §6.5) : filtre par build, totaux, tableau défilant sur mobile.
import { useState } from "react";
import { itemIndex } from "@rogue/core";
import { useApp } from "./context";
import { FaeDot } from "./items";
import { useKit } from "./Library";
import { strings as t } from "./strings";

export function History() {
  const { state, pack } = useApp();
  const kit = useKit();
  const [filter, setFilter] = useState("all");
  const index = itemIndex(pack);
  const done = state.runs
    .filter((r) => r.status === "done" && (filter === "all" || r.buildId === filter))
    .sort((a, b) => (b.endedAt ?? "").localeCompare(a.endedAt ?? ""));
  const wins = done.filter((r) => r.result?.outcome === "win").length;

  return (
    <section className="view">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <div className="eyebrow">{t.historyEyebrow}</div>
          <h2>{t.historyTitle}</h2>
        </div>
        <label className="field" style={{ minWidth: 200 }}>
          {t.historyFilter}
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">{t.allBuilds}</option>
            {state.builds.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </label>
      </div>
      <div className="meter" style={{ maxWidth: 480 }}>
        <div><b>{done.length}</b><span>{t.totals.runs}</span></div>
        <div className="k-core"><b>{wins}</b><span>{t.totals.wins}</span></div>
        <div><b>{done.length ? Math.round((wins / done.length) * 100) : 0}%</b><span>{t.totals.rate}</span></div>
      </div>
      {done.length ? (
        <div className="tablewrap panel" style={{ padding: 0 }}>
          <table className="hist">
            <thead>
              <tr>
                {(["date", "build", "kit", "result", "picks", "notes"] as const).map((c) => <th key={c}>{t.columns[c]}</th>)}
              </tr>
            </thead>
            <tbody>
              {done.map((r) => {
                const b = state.builds.find((x) => x.id === r.buildId);
                const outcome = r.result?.outcome ?? "loss";
                return (
                  <tr key={r.id}>
                    <td className="mono">{r.endedAt ? t.formatDate(r.endedAt) : ""}</td>
                    <td>
                      {b ? b.name : t.freeRunTitle}
                      {r.example && <> <span className="example">{t.example}</span></>}
                    </td>
                    <td>{kit(r)}</td>
                    <td>
                      <span className={`outcome ${outcome}`}>{outcome === "win" ? t.win : t.loss}</span>
                      <br />
                      <span className="muted">{r.result?.reached}</span>
                    </td>
                    <td>
                      <div className="faes">
                        {r.picks.map((p) => {
                          const x = index.get(p.id);
                          return x ? <span key={p.id} title={x.name}><FaeDot item={x} /></span> : null;
                        })}
                      </div>
                      <span className="mono muted">{r.picks.length}</span>
                    </td>
                    <td>{r.result?.notes}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="empty">{t.noHistory}</p>
      )}
    </section>
  );
}
