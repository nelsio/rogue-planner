# Journal des versions

## v0.0.5 — Lot 4 : RUN et Historique
- RUN : en-tête (heure de début, build ou « Run libre », kit modifiable), compteurs Essentielles / Prises / Hors plan
  et barre de progression, emplacements avec « Prévu » et contour si différent, prises dans l'ordre (prévue / hors plan),
  enclumes (prévues en pointillé), autres choix (Merlin, Morgane, Sanctuaire, Autre).
- Colonne de droite : encore à trouver, duos atteignables maintenant, notes du build.
- Bouton flottant « + Bénédiction » : prévues d'abord, verrouillées grisées mais choisissables.
- Fin du run : victoire ou défaite, « Jusqu'où ? », notes ; enregistrer, continuer, abandonner sans enregistrer.
- Historique : filtre par build, totaux (runs, victoires, réussite), tableau défilant dans son conteneur sur mobile.

## v0.0.4 — Lot 3 : coquille, bibliothèque et Création
### Lot 3b : Création
- Départ : nom, classe, arme et sort (filtrés par classe), sélecteur Libre / Restreint avec sa phrase d'aide.
- Aptitudes visées : une liste par emplacement.
- Bénédictions visées : prérequis colorés (vert avec ✓ si remplis, orange sinon), priorité Essentielle / Bonus, retrait.
- Fae du build, duos atteignables (bouton Viser), enclumes de l'arme puis du sort, notes.
- Sélecteur « Ajouter » : recherche, puces de fae, mode repris dans l'en-tête ; en restreint, sections
  Disponibles et Verrouillées (grisées, non cliquables).
- Libellés de prérequis avec élision (« d'Oberon ») et forme « hors X ».
- Pack SWORN : libellé court par emplacement (`slots[].short`).

### Lot 3a : coquille et bibliothèque
- Coquille : en-tête collant, sélecteur de jeu, onglets (point rouge pendant un run), thème auto → clair → sombre,
  bandeau de repli mémoire, toasts ; barre d'onglets en bas sous 720 px.
- Couleurs de fae et sigil du jeu générés depuis le pack.
- Bibliothèque : cartes de build (kit, mode, fae, compteurs), nouveau build, dupliquer, supprimer avec confirmation,
  lancer un run (confirmation si un run est actif), run sans build.
- État par `useReducer` ; chaque changement est recopié dans le stockage ; onglet, build ouvert et thème retenus.

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
