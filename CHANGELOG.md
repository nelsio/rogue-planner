# Journal des versions

## v0.1.3 — Révision 2 : RUN
- Pas à pas : étape en cours (type, effet, prérequis colorés contre les prises), Prise, Passer pour l'instant,
  « Ensuite » (3 étapes), « Tout l'ordre » repliable avec Reprendre, « Reprendre les passées (N) ».
- Fae · prises / nécessaires : puces « Lugh 1/5 », vertes quand le total est atteint, et « Duos 0/1 ».
- Aptitudes : nom de la fae prise, fae et aptitude prévues sur les emplacements vides (cadre pointillé à sa
  couleur), « ✓ prévu » quand c'est conforme.
- Potions : 4 cases, la prochaine encadrée, « Prendre la prévue », une puce par fae, « Annuler la dernière ».
- Tri Ordre · Fae · Type de « Prises » et « Encore à trouver », mémorisé (`prefs.runSort`) ; le numéro de prise
  reste le rang réel. « Encore à trouver · N » atténue les étapes passées.
- e2e : scénario 6 (pas à pas) ; scénario 5 vérifie l'étape en cours après rechargement.
- README (captures refaites) et guide du joueur à jour.

## v0.1.2 — Révision 2 : Création
- Bibliothèque et Création : puces de bénédictions nécessaires par fae (« Lugh ×5 », « Duos ×1 »), triées par
  nombre décroissant puis dans l'ordre des fae du pack.
- Création : 4 potions dans l'ordre (une fae par case, case à la couleur de la fae).
- Création : ordre d'acquisition numéroté, boutons ↑ / ↓ de 40 px (le focus suit l'élément déplacé),
  « Ordre par défaut » ; les étapes sorties du plan sont nettoyées à l'enregistrement.
- Sélecteur « Ajouter » et « + Bénédiction » : filtre de type (Tous types, Aptitudes, Standard, Duos, Table ronde).
- Moteur : `familyProgress`, totaux triés d'un plan, partagés par la bibliothèque, la Création et le RUN.
- Guide du joueur mis à jour.

## v0.1.1 — Révision 2 : moteur
- Pack SWORN du 2026-11-04 : descriptions en anglais (texte du jeu), potions (4 par run, une par fae),
  libellés « Potion(s) ». Les libellés courts des emplacements sont conservés.
- Moteur : ordre d'acquisition (`planOrder`, `moveInOrder`), pas à pas (`nextStep`, `skipStep`, `unskipStep`),
  totaux par fae (`familyTotals`), potions (`buildPotions`, `applyPotion`, `undoPotion`), index `Pack.byId`.
- `runProgress` : étape suivante, totaux par fae et duos, potions ; « encore à trouver » suit l'ordre d'acquisition
  et comprend les aptitudes. `applyPick` retire la prise des étapes passées.
- Schémas : `order` et `potions` (build), `potions` et `skipped` (run), complétés à `[]` au chargement et à l'import.
- RUN : « Encore à trouver » affiche les aptitudes (étiquette « aptitude »), dans l'ordre d'acquisition.
- Exemples du premier lancement : ordre et potions de la révision 2.

## v0.1.0 — Lot 5 : catalogue, import / export, finitions
- Catalogue : « Catalogue SWORN · N bénédictions » et sources du pack, puces de fae (filtre retenu), recherche
  par nom ou effet, prérequis en texte ; ajout d'une bénédiction manquante (nom, fae, emplacement, effet) et retrait.
- Import / export : téléchargement `rogue-planner-AAAA-MM-JJ.json`, Copier (repli : sélection du texte) ;
  import par fusion d'un fichier ou d'un texte collé, avec le bilan ou les erreurs par champ. Un seul run reste actif.
- Historique et RUN : « Build supprimé » pour un run dont le build n'existe plus.
- Mobile : cibles tactiles d'au moins 40 px sur écran tactile ; select redessinés (WebKit en fige la hauteur).
- Moteur : une prise inconnue du pack (bénédiction ajoutée puis retirée) est tolérée par `applyPick` et `runProgress`.
- IndexedDB : la base se ferme quand une autre page demande sa mise à niveau ou sa suppression.
- README avec captures, guide du joueur (`docs/GUIDE.md`), crédits complétés.

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
