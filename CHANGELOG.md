# Journal des versions

## v0.0.1 — Lot 0 : squelette
- Vite + React 18 + TypeScript strict, ESLint, Vitest (couverture 100 % exigée sur `src/core`), Playwright
  (chromium, webkit, iPhone 13, Pixel 7).
- Livrable unique `dist/rogue-planner.html` (vite-plugin-singlefile), polices embarquées en woff2.
- Alias `@rogue/core`.
- Workflows GitHub : CI, publication Pages, release sur tag `v*`.
- Fichiers du handoff rangés : `reference/prototype.html`, `src/games/sworn/pack.json`,
  `tests/core.engine.spec.ts`, `tests/fixtures/export-prototype.json`.
