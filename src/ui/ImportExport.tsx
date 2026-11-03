// Importer / exporter (HANDOFF §7) : export téléchargé ou copié ; import par fusion d'un fichier ou d'un texte collé.
import { useEffect, useRef, useState } from "react";
import { EXPORT_FORMAT, mergeImport } from "@rogue/core";
import { useApp } from "./context";
import { strings as t } from "./strings";

type Message = { ok: true; text: string } | { ok: false; text: string; errors: string[] };

/** Au plus 10 erreurs affichées : le reste est du même ordre. */
const MAX_ERRORS = 10;

export function ImportExport({ onClose }: { onClose(): void }) {
  const { state, dispatch, pack, env } = useApp();
  const [text, setText] = useState("");
  const [message, setMessage] = useState<Message | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const out = useRef<HTMLPreElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const json = JSON.stringify(
    { format: EXPORT_FORMAT, version: 1, game: pack.game.id, builds: state.builds, runs: state.runs, custom: state.custom },
    null,
    2,
  );

  const download = () => {
    const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: t.exportFileName(env.now()) });
    document.body.append(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(json);
      dispatch({ type: "toast", text: t.toastCopied });
    } catch {
      // Presse-papiers refusé : on sélectionne le texte pour une copie à la main.
      const range = document.createRange();
      range.selectNodeContents(out.current!);
      const sel = getSelection()!;
      sel.removeAllRanges();
      sel.addRange(range);
      dispatch({ type: "toast", text: t.toastSelected });
    }
  };

  const runImport = async () => {
    const chosen = file.current?.files?.[0];
    const raw = chosen ? await chosen.text() : text;
    if (!raw.trim()) return setMessage({ ok: false, text: t.importEmpty, errors: [] });
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return setMessage({ ok: false, text: t.importInvalidJson, errors: [] });
    }
    const res = mergeImport({ builds: state.builds, runs: state.runs, custom: state.custom }, parsed);
    if (!res.ok) {
      const errors = res.errors.slice(0, MAX_ERRORS).map((e) => `${e.path} : ${e.message}`);
      return setMessage({ ok: false, text: t.importErrors, errors });
    }
    dispatch({ type: "libraryImported", library: res.library, at: env.now() });
    setMessage({ ok: true, text: t.imported(res.added + res.replaced, res.added, res.replaced) });
    setText("");
    if (file.current) file.current.value = "";
  };

  return (
    <div className="sheet-scrim" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={t.ioTitle}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h2>{t.ioTitle}</h2>
          <button className="btn small ghost" onClick={onClose}>{t.close}</button>
        </div>
        <p className="muted" style={{ margin: 0 }}>{t.ioHelp}</p>
        <div className="scroll">
          <div className="panel">
            <div className="row" style={{ justifyContent: "space-between" }}>
              <h3>{t.exportTitle}</h3>
              <div className="row">
                <button className="btn small" onClick={download}>{t.download}</button>
                <button className="btn small" onClick={copy}>{t.copy}</button>
              </div>
            </div>
            <pre className="json" ref={out} aria-label={t.exportTitle}>{json}</pre>
          </div>
          <div className="panel">
            <h3>{t.importTitle}</h3>
            <label className="field">
              {t.importFile}
              <input type="file" ref={file} accept="application/json,.json" />
            </label>
            <label className="field">
              {t.importText}
              <textarea rows={5} value={text} onChange={(e) => setText(e.target.value)} />
            </label>
            <button className="btn primary" onClick={runImport}>{t.importButton}</button>
            {message && (
              <div role="status" className={message.ok ? "muted" : "req-miss"} style={{ margin: 0 }}>
                {message.text}
                {!message.ok && message.errors.length > 0 && (
                  <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
                    {message.errors.map((e) => <li key={e} className="mono" style={{ fontSize: ".8rem" }}>{e}</li>)}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
