# Journal des versions

## v0.0.3 — Lot 2 : stockage
- Interfaces `LibraryStore` et `PrefsStore`, implémentations IndexedDB (base `rogue-planner`) et mémoire.
- `openStorage` : repli en mémoire si IndexedDB est absent, en erreur ou sans réponse en 3 s.
- `requestPersistence` : `navigator.storage.persist()` demandé une seule fois, refus silencieux.
- `loadExamples` : deux builds et un run d'exemple du prototype au premier lancement.
- Chaque objet lu est validé par son schéma ; un objet invalide est ignoré et signalé dans la console.

## v0.0.2 — Lot 1 : moteur
- Schéma Zod du pack et `loadPack` avec contrôles croisés (identifiants uniques, références), erreurs au chemin JSON.
- Prérequis (`missing`, `isUnlocked`), `buildOwned`, `reachableDuos`, `toggleTarget`, `applyPick`, `runProgress`.
- Schémas Build / Run / CustomItem avec valeurs par défaut ; `withCustom` ; `mergeImport` (formats `rogue-planner`
  et `carnet-runs`).
- Pack SWORN chargé et validé par `src/games/sworn`.
- Spec fournie verte (30 tests) ; 100 % des lignes de `src/core`.

## v0.0.1 — Lot 0 : squelette
- Vite + React 18 + TypeScript strict, ESLint, Vitest (couverture 100 % exigée sur `src/core`), Playwright
  (chromium, webkit, iPhone 13, Pixel 7).
- Livrable unique `dist/rogue-planner.html` (vite-plugin-singlefile), polices embarquées en woff2.
- Alias `@rogue/core`.
- Workflows GitHub : CI, publication Pages, release sur tag `v*`.
- Fichiers du handoff rangés : `reference/prototype.html`, `src/games/sworn/pack.json`,
  `tests/core.engine.spec.ts`, `tests/fixtures/export-prototype.json`.
