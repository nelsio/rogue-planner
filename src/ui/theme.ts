// Couleurs de fae injectées depuis le pack (HANDOFF §6.1) et application du thème.
import type { Pack } from "@rogue/core";
import type { Theme } from "./state";

/** CSS des couleurs de fae : variables --f-<id> (sombre, puis clair), règles .fae[data-fae] et sigil du jeu. */
export function faeCss(pack: Pack): string {
  const vars = (tone: "light" | "dark") => pack.families.map((f) => `--f-${f.id}:${f.color[tone]};`).join("");
  const ids = pack.families.map((f) => f.id);
  const sigil = `conic-gradient(${[...ids, ids[0]].map((id) => `var(--f-${id})`).join(",")})`;
  return [
    `:root{${vars("dark")}--sigil:${sigil}}`,
    `@media (prefers-color-scheme:light){:root:not([data-theme="dark"]){${vars("light")}}}`,
    `:root[data-theme="light"]{${vars("light")}}`,
    ...ids.map((id) => `.fae[data-fae="${id}"]{--c:var(--f-${id})}`),
  ].join("\n");
}

export function injectFaeColors(pack: Pack, doc: Document = document): void {
  const id = "fae-colors";
  const style = doc.getElementById(id) ?? doc.head.appendChild(Object.assign(doc.createElement("style"), { id }));
  style.textContent = faeCss(pack);
}

export function applyTheme(theme: Theme, root: HTMLElement = document.documentElement): void {
  if (theme === "auto") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);
}

export const nextTheme = (t: Theme): Theme => ({ auto: "light", light: "dark", dark: "auto" } as const)[t];
