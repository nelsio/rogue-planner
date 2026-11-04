// Ordre d'acquisition (HANDOFF §6.3, bloc 7) : boutons ↑ / ↓, le focus suit l'élément déplacé.
import { useEffect, useRef } from "react";
import { moveInOrder, planOrder, type Build } from "@rogue/core";
import { useApp } from "./context";
import { FaeDot } from "./items";
import { typeLine } from "./labels";
import { strings as t } from "./strings";

type Dir = -1 | 1;

export function OrderPanel({ build: b, onSave }: { build: Build; onSave(build: Build, toast?: string): void }) {
  const { pack } = useApp();
  const order = planOrder(pack, b);
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const moved = useRef<{ id: string; dir: Dir } | null>(null);

  // Après un déplacement : même sens si possible ; à une extrémité, le bouton qui reste actif.
  useEffect(() => {
    if (!moved.current) return;
    const { id, dir } = moved.current;
    const same = buttons.current.get(`${id}:${dir}`);
    const other = buttons.current.get(`${id}:${-dir}`);
    (same && !same.disabled ? same : other)?.focus({ preventScroll: true });
    moved.current = null;
  });

  const move = (i: number, dir: Dir) => {
    moved.current = { id: order[i], dir };
    onSave(moveInOrder(pack, b, i, i + dir));
  };
  const ref = (id: string, dir: Dir) => (el: HTMLButtonElement | null) => {
    if (el) buttons.current.set(`${id}:${dir}`, el);
    else buttons.current.delete(`${id}:${dir}`);
  };

  return (
    <div className="panel">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h3>{t.orderTitle(order.length)}</h3>
        {(b.order ?? []).length > 0 && (
          <button className="btn small ghost" onClick={() => onSave({ ...b, order: [] }, t.orderReset)}>{t.orderReset}</button>
        )}
      </div>
      <p className="muted" style={{ margin: 0, fontSize: ".85rem" }}>{t.orderHelp}</p>
      {order.length ? (
        <ol className="ord" style={{ margin: 0, padding: 0, listStyle: "none" }}>
          {order.map((id, i) => {
            const x = pack.byId.get(id)!;
            return (
              <li key={id} className="bitem">
                <span className="n">{i + 1}</span>
                <FaeDot item={x} />
                <div style={{ minWidth: 0 }}>
                  <div className="bn">{x.name}</div>
                  <div className="bt">{typeLine(pack, x)}</div>
                </div>
                <div className="row" style={{ flexWrap: "nowrap", gap: 4 }}>
                  <button ref={ref(id, -1)} className="mv" aria-label={t.moveUp(x.name)} disabled={i === 0} onClick={() => move(i, -1)}>↑</button>
                  <button
                    ref={ref(id, 1)}
                    className="mv"
                    aria-label={t.moveDown(x.name)}
                    disabled={i === order.length - 1}
                    onClick={() => move(i, 1)}
                  >
                    ↓
                  </button>
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="empty">{t.noOrder}</p>
      )}
    </div>
  );
}
