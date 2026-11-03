# Rogue Planner — Handoff pour implémentation (v0.1)

Planner de builds pour jeux rogue-like, utilisable sur ordinateur et sur mobile. Premier jeu : **SWORN**.
Le joueur prépare des builds (mode **Création**), puis suit sa partie en direct (mode **RUN**) : il note chaque
bénédiction prise et l'outil montre l'écart au plan, ce qui reste à trouver et les duos qui s'ouvrent.

Ce document est la référence. Le prototype validé est `reference/prototype.html` : en cas de doute sur un
comportement ou un texte, il fait foi, sauf mention contraire ici.

Architecture et méthode reprises du Carnet de Rokugan (`nelsio/carnet-l5r`).

**Fichiers fournis avec ce handoff**

| Fichier | Rôle | Modifiable ? |
|---|---|---|
| `HANDOFF.md` | Ce document | Oui, par lot (annexe ajoutée à chaque lot) |
| `reference/prototype.html` | Prototype cliquable validé | Non |
| `src/games/sworn/pack.json` | Données SWORN : fae, bénédictions, prérequis, classes, enclumes | Oui, pour corriger une donnée (voir §4.5) |
| `tests/core.engine.spec.ts` | Spécification exécutable du moteur (30 tests) | Non : les valeurs attendues font foi |
| `tests/fixtures/export-prototype.json` | Export JSON produit par le prototype | Non |

La spec a été validée contre une implémentation de référence : 30 tests sur 30 passent, et le fichier compile en TypeScript strict.

---

## 1. Périmètre v0.1

### Inclus
- Un seul jeu : SWORN. L'architecture est multi-jeu dès le départ (§2) ; le sélecteur de jeu n'affiche que SWORN.
- **Bibliothèque** de builds : créer, ouvrir, dupliquer, supprimer (avec confirmation dans la page), lancer un run.
- **Création** : classe, arme, sort ; mode **Libre** ou **Restreint** ; une aptitude par emplacement ; bénédictions
  visées avec priorité (Essentielle / Bonus) ; prérequis affichés et colorés ; duos atteignables ; enclumes visées ; notes.
- **RUN** : un run actif à la fois, avec ou sans build ; prises dans l'ordre ; écart au plan ; emplacements ;
  ce qui reste à trouver ; duos ouverts ; enclumes prises ; autres choix (Merlin, Morgane, sanctuaire, autre) ;
  fin du run (victoire ou défaite, zone atteinte, notes) ou abandon.
- **Historique** des runs terminés, filtrable par build, avec totaux.
- **Catalogue** des bénédictions (filtre par fae, recherche, prérequis) et ajout manuel d'une bénédiction manquante.
- **Import / export** JSON par fusion.
- Stockage local (IndexedDB), thème clair / sombre / auto, mobile validé.

### Hors périmètre v0.1 (prévu plus tard)
- Indicateurs partiels de dégâts (valeurs par rareté du wiki). Le modèle de données doit pouvoir les accueillir sans migration lourde.
- Coop (plusieurs joueurs dans un run), rareté et niveau des bénédictions, autres jeux, anglais, PWA installable.
- Aucune synchronisation, aucun serveur, aucun compte.

---

## 2. Architecture

### Principes
1. **Le moteur est du TypeScript pur** (`src/core`), sans DOM ni React, testé à 100 % des lignes. Il ne connaît aucun nom propre de SWORN.
2. **Un jeu = un pack de données JSON** (`src/games/<jeu>/pack.json`), validé par un schéma Zod. Corriger un prérequis = modifier le JSON, pas le code.
3. **Le stockage passe par des interfaces** (`LibraryStore`, `PrefsStore`), indépendantes de l'interface.
4. **Un schéma Zod par objet persisté** (build, run, bénédiction ajoutée), utilisé au chargement et à l'import.
5. **Un seul livrable** : `dist/rogue-planner.html`, un fichier HTML autonome qui fonctionne aussi en `file://`.

### Structure du dépôt
```
rogue-planner/
├─ src/
│  ├─ core/          # schémas Zod (pack, build, run, export), moteur (prérequis, duos, progression), fusion d'import
│  ├─ games/
│  │  └─ sworn/      # pack.json (fourni), index.ts (charge et exporte le pack validé)
│  ├─ storage/       # LibraryStore, PrefsStore : IndexedDB et mémoire
│  ├─ ui/            # composants React, store (reducer), thème CSS, textes (strings.ts)
│  └─ main.tsx
├─ tests/
│  ├─ core.engine.spec.ts   # fourni : spécification exécutable du moteur
│  ├─ core.*.spec.ts        # tests ajoutés par l'agent (schémas, cas limites)
│  ├─ storage/              # Vitest + fake-indexeddb
│  ├─ ui/                   # Vitest + Testing Library
│  ├─ e2e/                  # Playwright
│  └─ fixtures/
├─ reference/        # prototype.html (ne pas modifier)
├─ docs/             # GUIDE.md (guide joueur), CREDITS.md (licences et sources), img/
├─ scripts/          # screenshots.mjs (captures du README, hors CI)
├─ .github/workflows/  # ci.yml, pages.yml, release.yml
├─ README.md
└─ HANDOFF.md
```
Alias : `@rogue/core` → `src/core/index.ts`, à déclarer dans `vite.config.ts` et `tsconfig.json` (utilisé par la spec fournie).

### Choix techniques
| Brique | Choix | Raison |
|---|---|---|
| Langage | TypeScript strict (`noUnusedLocals`, `verbatimModuleSyntax`, `resolveJsonModule`) | Moteur typé |
| Interface | React 18 + Vite, sans librairie UI | CSS porté du prototype |
| Fichier unique | `vite-plugin-singlefile` + renommage en `rogue-planner.html` + icônes en data URI | Comme le Carnet |
| État | `useReducer` + contexte, reducer pur | Le hasard et les dates sont fournis avant le dispatch |
| Validation | Zod 4 | Messages par champ, en français |
| Stockage | IndexedDB via `idb` | Repli en mémoire si indisponible |
| Tests | Vitest, Testing Library, fake-indexeddb, Playwright (chromium, webkit, iPhone 13, Pixel 7) | |
| CI/CD | GitHub Actions + GitHub Pages | Rien à héberger |

Conventions : commentaires, messages d'erreur et textes en français ; identifiants techniques en anglais.
Tous les textes affichés passent par `src/ui/strings.ts` (préparation de l'anglais, hors v0.1).

---

## 3. Modèle de données

### 3.1 Pack de jeu (`src/games/sworn/pack.json`)
Format complet en annexe A. En résumé :

| Champ | Contenu |
|---|---|
| `format`, `version` | `"rogue-planner-pack"`, `1` |
| `game` | `id`, `name`, `dataVersion`, `sources` (nom, URL, licence) |
| `labels` | Vocabulaire du jeu : « Fae », « Bénédiction », « Enclume », « Classe », « Arme », « Sort » |
| `slots` | Les 6 emplacements d'aptitude : `light`, `heavy`, `spell`, `dash`, `companion`, `ultimate` |
| `kinds` | `ability`, `standard`, `duo`, `roundtable` (+ `custom` ajouté par le moteur pour les saisies manuelles) |
| `families` | Les 8 fae : `id`, `name`, `title`, `status`, `color.light`, `color.dark` |
| `triggers` | Les 32 effets déclencheurs (Critique, Ombre, Froid…) |
| `loadouts` | Les 4 classes, chacune avec ses 4 armes et ses 4 sorts |
| `items` | Les 256 bénédictions : `id`, `name` (nom anglais du jeu), `kind`, `families`, `slot?`, `effect` (résumé français), `provides?`, `requires` |
| `augments` | Les enclumes : pour chaque arme ou sort (`for`), la liste des options (`id`, `name`, `effect`) |
| `otherChoices` | Autres choix notables d'un run : Merlin, Morgane, sanctuaire, autre |

**Prérequis** (`requires`) : liste de groupes, **tous** requis ; chaque groupe est une liste d'alternatives, **une** suffit.
Une alternative prend l'une de ces formes :

| Forme | Remplie si l'ensemble possédé contient… |
|---|---|
| `{ "item": "lugh:good-fortune" }` | cette bénédiction |
| `{ "trigger": "crit" }` | une bénédiction, **autre que celle évaluée**, dont `provides` contient ce déclencheur |
| `{ "trigger": "bleed", "except": "badb:bloody-shadows" }` | idem, en ignorant aussi la bénédiction citée |
| `{ "slot": { "family": "lugh", "slots": ["light","heavy","spell","dash"] } }` | une aptitude (`kind: ability`) de cette fae sur l'un de ces emplacements |
| `{ "count": { "family": "lugh", "min": 5 } }` | au moins 5 bénédictions de cette fae, hors duos et Tables rondes (Table ronde en solo) |

`requires: []` signifie « aucun prérequis ». Les aptitudes n'ont jamais de prérequis.

### 3.2 Build
```ts
interface Build {
  id: string;                 // UUID
  game: string;               // "sworn"
  name: string;
  mode: "free" | "restricted";   // défaut à l'import et à la création : "restricted"
  hero: string; weapon: string; spell: string;   // ids de loadout ; arme et sort de la classe choisie
  abilities: Record<SlotId, string | null>;      // une aptitude visée par emplacement
  targets: { id: string; prio: "core" | "bonus" }[];   // bénédictions visées, dans l'ordre d'ajout
  anvils: string[];           // enclumes visées (ids d'options d'augment)
  notes: string;
  updatedAt: string;          // ISO
  example?: boolean;          // données d'exemple (badge « Exemple »)
}
```

### 3.3 Run
```ts
interface Run {
  id: string; game: string;
  buildId: string | null;     // null = run libre
  status: "active" | "done" | "abandoned";
  startedAt: string; endedAt?: string;
  hero: string; weapon: string; spell: string;   // copiés du build au lancement, modifiables pendant le run
  picks: { id: string; at: string }[];           // bénédictions prises, dans l'ordre
  anvils: string[];                              // enclumes prises
  others: { kind: string; text: string }[];      // Merlin, Morgane, sanctuaire, autre
  result: { outcome: "win" | "loss"; reached: string; notes: string } | null;
  example?: boolean;
}
```
Un seul run `active` à la fois. Lancer un run alors qu'un autre est actif demande confirmation dans la page
(« Un run est en cours. L'abandonner et en lancer un nouveau ? ») ; l'ancien passe en `abandoned`.
« Abandonner sans enregistrer » supprime le run.

### 3.4 Bénédiction ajoutée à la main
```ts
interface CustomItem { id: string; game: string; name: string; family: string; slot?: SlotId; effect: string }
```
Identifiant : `custom:<nom-normalisé>-<4 caractères aléatoires>`. Aucun prérequis. Fusionnée au pack par `withCustom`.

### 3.5 Préférences
`theme` (`auto` | `light` | `dark`), `lastView`, `lastBuildId`, `codexFamily` (dernier filtre du catalogue), `persistRequested`.

### 3.6 Fichier d'export
```json
{ "format": "rogue-planner", "version": 1, "game": "sworn", "builds": [], "runs": [], "custom": [] }
```
L'import accepte aussi `"format": "carnet-runs"` (exports du prototype).

---

## 4. Moteur (`src/core`)

### 4.1 API attendue par la spec
```ts
loadPack(json: unknown): Pack                          // Zod + contrôles croisés ; lève PackFormatError { errors: { path, message }[] }
withCustom(pack: Pack, custom: CustomItem[]): Pack     // ajoute les saisies manuelles (kind "custom")
missing(pack, itemId, owned: Iterable<string>): Alternative[][]   // groupes non remplis, dans l'ordre déclaré
isUnlocked(pack, itemId, owned): boolean
buildOwned(build: Build): Set<string>                  // aptitudes + bénédictions visées
reachableDuos(pack, owned, { restricted }): string[]   // duos dont les fae sont présentes (hors duos possédés) ; en restreint, débloqués seulement
toggleTarget(pack, build, itemId): Build               // aptitude : occupe / libère son emplacement ; sinon absente → bonus → essentielle → absente
applyPick(pack, run, itemId, at): Run                  // ajoute ; une aptitude remplace celle du même emplacement ; pas de doublon
runProgress(pack, build | null, run): RunProgress
mergeImport(library: Library, json: unknown): MergeResult
```
Toutes les fonctions sont pures : elles ne modifient jamais leurs arguments.

### 4.2 Contrôles de `loadPack`
En plus du schéma : identifiants uniques ; tout `item`, `except`, `trigger`, `slot.family`, `slot.slots`,
`count.family` et `provides` référence un élément existant. Le chemin d'erreur suit la structure JSON
(ex. `items.123.requires.0.0.item`).

### 4.3 `runProgress`
```ts
interface RunProgress {
  coreTotal: number; coreTaken: number;     // bénédictions visées « essentielles »
  taken: number;                            // nombre de prises
  offPlan: string[];                        // prises hors plan (plan = aptitudes + visées) ; [] sans build
  remaining: { id: string; prio: "core" | "bonus" }[];   // visées non prises : essentielles d'abord, puis ordre d'ajout
  slots: Record<SlotId, { current: string | null; planned: string | null; mismatch: boolean }>;
  openDuos: string[];                       // reachableDuos sur les prises, mode libre
}
```

### 4.4 Ensemble « possédé »
- En Création : `buildOwned(build)`.
- En RUN : les ids de `run.picks`.
- Le déblocage en RUN est **indicatif** : une bénédiction verrouillée reste choisissable (le jeu fait foi).

### 4.5 Corriger une donnée
Modifier `pack.json`, puis `npm test` : `loadPack` refuse toute référence cassée. Chaque correction de donnée
est une PR courte avec la source dans la description. `game.dataVersion` prend la date du jour.

---

## 5. Stockage (`src/storage`)

- `LibraryStore` : `listBuilds`, `putBuild`, `removeBuild`, `listRuns`, `putRun`, `removeRun`, `listCustom`, `putCustom`, `removeCustom`.
- `PrefsStore` : `get`, `set(patch)` (une clé à `undefined` est supprimée).
- Implémentations : IndexedDB (base `rogue-planner`, magasins `builds`, `runs`, `custom`, `prefs`) et mémoire.
- `openStorage()` : IndexedDB, ou repli en mémoire si absent ou sans réponse en 3 s. En repli, un bandeau
  le dit : « Le navigateur refuse le stockage : vos données disparaîtront à la fermeture. Exportez-les avant de partir. »
- Au premier lancement, `navigator.storage.persist()` est demandé une fois ; un refus est silencieux.
- Bibliothèque vide au premier lancement : on charge les deux builds et le run d'exemple du prototype (badge « Exemple »).
- Chaque objet est validé par son schéma Zod à la lecture ; un objet invalide est ignoré et signalé dans la console.

---

## 6. Interface (`src/ui`)

Le prototype fait foi pour la mise en page, les textes et les couleurs. Points à respecter :

### 6.1 Coquille
- En-tête collant : nom « Rogue Planner », sélecteur de jeu (SWORN seul, « Autres jeux : bientôt » désactivé),
  onglets **Builds · Run · Historique · Catalogue**, bouton de thème (auto → clair → sombre).
- Un point rouge clignotant sur l'onglet Run tant qu'un run est actif (sans animation si `prefers-reduced-motion`).
- Couleurs uniquement en variables CSS ; couleurs de fae injectées depuis `pack.families[].color` par `ui/theme.ts`.
- Polices du prototype (Grenze Gotisch, Atkinson Hyperlegible, JetBrains Mono) **embarquées en woff2** avec leurs licences OFL.
- Aucune ressource du jeu (icône, illustration, logo) : seulement des pastilles de couleur.

### 6.2 Bibliothèque
Cartes de build : nom, badge Exemple, « Classe · Arme · Sort · mode restreint|libre », pastilles des fae,
« N essentielles · N visées · N runs · N victoires », boutons Lancer un run, Modifier, Dupliquer, Supprimer.
En tête : Nouveau build, Run sans build, Importer / exporter.

### 6.3 Création (ordre des blocs)
1. **Départ** : nom ; Classe, Arme, Sort (arme et sort filtrés par classe ; changer de classe prend la première arme et le premier sort) ; sélecteur **Libre / Restreint** avec sa phrase d'aide.
2. **Aptitudes visées** : 6 listes déroulantes, une par emplacement.
3. **Bénédictions visées** : bouton Ajouter ; chaque ligne montre nom, effet, type, **prérequis**, bouton de priorité (Essentielle / Bonus) et ✕.
4. Colonne de droite sur ordinateur : **Fae du build**, **Duos atteignables** (bouton Viser).
5. **Enclumes** (pleine largeur, avant-dernier) : les augments de l'arme puis du sort du build ; un toucher vise / retire.
6. **Notes** (pleine largeur, dernier).

**Prérequis affichés** partout où une bénédiction apparaît avec un contexte (visées, sélecteurs) :
« Prérequis : » puis chaque groupe, **vert avec ✓** s'il est rempli, **orange** sinon ; groupes joints par « et »,
alternatives par « ou ». Sans prérequis : « Aucun prérequis ». Libellés : nom de la bénédiction ;
« un effet Critique » ; « un effet Saignement (hors Bloody Shadows) » ; « une aptitude de Lugh (légère, lourde, sort, esquive) » ;
« 5 bénédictions de Lugh (solo) ». Élision : « d'Oberon ».

**Sélecteur « Ajouter »** (feuille en bas sur mobile, fenêtre centrée sur ordinateur) : sélecteur Libre / Restreint
repris dans l'en-tête ; recherche ; puces de fae. En restreint : section « Disponibles · N », puis section
« Verrouillées · N (il manque une aptitude) » **dépliée par défaut**, éléments grisés et non cliquables.
En libre : tout est cliquable. Choisir une aptitude la place dans son emplacement.

### 6.4 RUN
- En-tête : « Mode RUN · commencé à HH:MM », nom du build ou « Run libre », kit ; lien repliable
  « Changer la classe, l'arme ou le sort de ce run » ; bouton Terminer le run.
- Avec build : compteurs Essentielles `x/y`, Prises, Hors plan, et barre de progression des essentielles.
- **Aptitudes** : 6 emplacements ; « Prévu : X » quand vide ou différent ; contour pointillé orange si différent.
- **Prises, dans l'ordre** : numéro, nom, type, étiquette « prévue » / « hors plan », ✕.
- **Enclumes · N pris** : options de l'arme et du sort du run ; prévues en pointillé avec étiquette « prévu » ; un toucher prend / retire.
- **Autres choix du run** : Merlin, Morgane, Sanctuaire, Autre → champ texte puis Ajouter.
- Colonne de droite : **Encore à trouver**, **Duos atteignables maintenant** (« prévu » ou « ouvert »), **Notes du build**.
- Bouton flottant **+ Bénédiction** : sélecteur avec « Prévues dans le build » d'abord ; prérequis colorés ;
  verrouillées affichées en bas, grisées mais choisissables.
- **Fin du run** (dans la page) : Victoire / Défaite, « Jusqu'où ? », Notes ; Enregistrer, Continuer le run, Abandonner sans enregistrer.

### 6.5 Historique
Filtre par build ; totaux Runs, Victoires, Réussite (%) ; tableau Date, Build, Départ, Résultat, Prises (pastilles), Notes.
Le tableau défile horizontalement dans son conteneur sur mobile.

### 6.6 Catalogue
Puces de fae, recherche (nom ou effet), liste avec type et prérequis (sans coloration) ; formulaire
« Ajouter une bénédiction manquante » (nom, fae, emplacement, effet) ; les ajouts portent un bouton Retirer.
En tête : « Catalogue SWORN · N bénédictions » et les sources du pack.

### 6.7 Mobile (validé sur le prototype)
- Sous 720 px : barre d'onglets fixe en bas, bouton flottant au-dessus ; aucun défilement horizontal de la page.
- Zones sûres (`env(safe-area-inset-*)`) respectées en haut, en bas et sur les côtés.
- Cibles tactiles d'au moins 40 px.

---

## 7. Import et export
- Export : téléchargement `rogue-planner-AAAA-MM-JJ.json` et bouton Copier (repli : sélection du texte).
- Import : fichier ou texte collé ; `mergeImport` ; message « N éléments importés (N ajoutés, N remplacés) » ou erreurs par champ.
- Les champs absents prennent leur valeur par défaut (`mode: "restricted"`, `anvils: []`, emplacements vides → `null`).

---

## 8. Distribution GitHub
- Dépôt `nelsio/rogue-planner` (à créer), public, licence MIT pour le code.
- `pages.yml` : build puis publication de `dist/rogue-planner.html` en `index.html` sur `https://nelsio.github.io/rogue-planner/`.
- `release.yml` : sur tag `v*`, joint `rogue-planner.html` à la release.
- README (vitrine, captures, démarrage), `docs/GUIDE.md` (guide joueur), `docs/CREDITS.md` (annexe C).

---

## 9. Tests
« Terminé » = lint propre, `tsc --noEmit` sans erreur, tests Vitest verts avec 100 % des lignes de `src/core`, build, Playwright vert, CI verte.

### 9.1 Moteur — `tests/core.engine.spec.ts` (fourni, 30 tests)
Implémenter `src/core` jusqu'à ce que le fichier passe, **sans modifier les valeurs attendues**.

### 9.2 À écrire par l'agent
- `core.schemas.spec.ts` : schémas Build / Run / CustomItem (valeurs par défaut, refus avec chemin d'erreur).
- `core.labels.spec.ts` : libellés de prérequis (§6.3), y compris l'élision et la forme « hors X ».
- `storage/*.spec.ts` : IndexedDB et mémoire, repli après délai, persistance demandée une seule fois, exemples au premier lancement.
- `ui/*.spec.tsx` : bibliothèque, création (mode, sélecteur, prérequis colorés, enclumes), run (prises, remplacement
  d'aptitude, enclumes, fin du run), historique, catalogue, import.
- `e2e/*.spec.ts` (chromium, webkit, iPhone 13, Pixel 7) :
  1. Créer un build en restreint, viser une aptitude Lugh, vérifier que Critical Clover passe de verrouillée à disponible.
  2. Lancer le run, prendre 3 bénédictions dont une hors plan, prendre une enclume prévue, terminer en victoire, retrouver le run dans l'historique.
  3. Exporter, vider le stockage, importer : tout est revenu.
  4. Mobile : barre d'onglets en bas, aucun défilement horizontal sur chaque écran.
  5. Rechargement : le run actif est retrouvé.

---

## 10. Plan de livraison (lots)
**Un lot = une PR = une version.** Chaque lot ajoute son annexe au HANDOFF et son entrée au `CHANGELOG.md`.

| Lot | Version | Contenu | Fini quand |
|---|---|---|---|
| 0 | v0.0.1 | Squelette : Vite + React + TS strict, ESLint, Vitest, Playwright, singlefile, alias `@rogue/core`, polices, workflows ci / pages / release, README minimal, LICENSE | Une page « Rogue Planner » vide est en ligne sur Pages ; CI verte |
| 1 | v0.0.2 | Moteur : schéma du pack, `loadPack`, `withCustom`, prérequis, duos, `toggleTarget`, `applyPick`, `runProgress` ; schémas Build / Run / CustomItem ; `mergeImport` ; pack SWORN chargé par `src/games/sworn` | Spec fournie verte ; 100 % des lignes de `src/core` |
| 2 | v0.0.3 | Stockage : interfaces, IndexedDB, mémoire, repli, persistance, exemples au premier lancement | Tests de stockage verts |
| 3 | v0.0.4 | Coquille + Bibliothèque + Création (§6.1 à §6.3) | Scénario e2e 1 vert ; mobile sans défilement horizontal |
| 4 | v0.0.5 | RUN + Historique (§6.4, §6.5) | Scénarios e2e 2 et 5 verts |
| 5 | v0.1.0 | Catalogue, import / export, finitions mobiles, README + GUIDE + CREDITS + captures, release | Scénarios e2e 3 et 4 verts ; release v0.1.0 avec `rogue-planner.html` |

Si un lot dépasse une PR raisonnable (plus de ~1 500 lignes hors tests et données), le découper (ex. 3a Coquille + Bibliothèque, 3b Création) et le signaler.

---

## 11. Méthode
- Ne pas modifier `reference/`, la spec fournie ni la fixture.
- Un désaccord avec la spec ou le prototype se note en §12, avec la raison ; il ne se corrige pas en silence.
- Commits et PR en français ; description de PR : ce qui change, comment le vérifier, captures pour l'interface.

---

## 12. Points ouverts
| # | Sujet | État |
|---|---|---|
| P1 | « Main Slot » du wiki interprété comme légère + lourde + sort + esquive | À vérifier en jeu |
| P2 | Certains duos ont deux versions de prérequis selon la page du wiki ; une seule retenue dans le pack | À vérifier en jeu |
| P3 | Bénédictions de patchs récents absentes du wiki (ex. Blood Clot, Fleet Of Foot chez Badb) | Ajout manuel possible ; à intégrer au pack quand une source les liste |
| P4 | Table ronde : seuils 5 / 8 / 10 / 12 selon le nombre de joueurs ; seul le seuil solo est modélisé | Coop hors v0.1 |
| P5 | Rareté et niveau (5 paliers de valeurs sur le wiki) non modélisés | Base des futurs indicateurs de dégâts |
| P6 | Enclumes = augments de « Sword in the Stone » ; « Reaper » (Scythe) retiré par un correctif du jeu, absent du pack | Confirmer le vocabulaire en jeu |
| P7 | Effets résumés en français à partir de l'anglais du wiki | Relecture à faire en jouant |

---

## Annexe A — Pack : extrait commenté
```json
{
  "format": "rogue-planner-pack", "version": 1,
  "game": { "id": "sworn", "name": "SWORN", "dataVersion": "2026.11.03", "sources": [ { "name": "SWORN Wiki (Fandom)", "url": "https://sworn-game.fandom.com/", "license": "CC BY-SA 3.0" } ] },
  "slots": [ { "id": "light", "label": "Attaque légère" } ],
  "families": [ { "id": "lugh", "name": "Lugh", "title": "La Main du Destin", "status": "Critique", "color": { "light": "#856700", "dark": "#ecc95a" } } ],
  "triggers": [ { "id": "crit", "label": "Critique" } ],
  "items": [
    { "id": "lugh:lucky-touch", "name": "Lucky Touch", "kind": "ability", "families": ["lugh"], "slot": "light",
      "effect": "Attaque légère : peut faire un coup critique", "provides": ["crit"], "requires": [] },
    { "id": "duo:flash-freeze", "name": "Flash Freeze", "kind": "duo", "families": ["beira", "lugh"],
      "effect": "Le Froid peut geler net", "requires": [ [ { "item": "beira:bitter-frost" } ], [ { "trigger": "crit" } ] ] }
  ],
  "augments": [ { "for": "Chakrams", "options": [ { "id": "chakrams:spare-blade", "name": "Spare Blade", "effect": "Un chakram de plus à lancer" } ] } ]
}
```

## Annexe B — Du prototype à la v0.1
| Prototype | v0.1 |
|---|---|
| `localStorage` (clé `carnet-runs-proto-v1`) | IndexedDB (§5) |
| Données dans le HTML (`FAE_RAW`, `REQUIRES` en texte) | `pack.json` structuré (§3.1) |
| `b.abilities[slot] = ""` | `null` |
| Prérequis en chaîne `"t:crit & Bitter Frost"` | Groupes d'alternatives JSON |
| `fae` / `type` | `families` / `kind` |
| Un seul fichier HTML | Projet Vite, livrable unique `rogue-planner.html` |

## Annexe C — Licences et crédits (`docs/CREDITS.md`)
- **Code** : MIT.
- **Données SWORN** (`src/games/sworn/pack.json`) : prérequis, effets produits, bénédictions ajoutées et enclumes
  tirés du **SWORN Wiki** (Fandom), sous **CC BY-SA 3.0**. Le fichier de données est donc diffusé sous CC BY-SA 3.0,
  avec attribution (lien vers le wiki et ses pages de fae) dans `CREDITS.md`, le README et le catalogue.
  Liste initiale : guide Steam « SWORN: All Blessings Guide ».
- **Polices** : licences OFL jointes.
- **SWORN** est une marque de ses éditeurs (Team17, Windwalk Games). Projet de fan non affilié ; aucun contenu graphique du jeu.

## Annexe Lot 0 — Squelette (v0.0.1)
- Versions retenues : React 18.3, Vite 8, TypeScript 6, Zod 4, Vitest 5, ESLint 10 (config plate), Playwright 1.64.
- Polices via `@fontsource/*` (sous-ensembles latins, graisses du prototype), inlinées en woff2 dans le livrable ;
  licences OFL copiées dans `docs/licenses/`.
- `tests/core.engine.spec.ts` est exclu de `tsc` et de Vitest le temps du lot 0 (il attend l'API du lot 1).
  L'exclusion est retirée au lot 1.
- Règle ESLint `no-non-null-assertion` désactivée : la spec fournie, non modifiable, utilise `!`.
- `tests/e2e/smoke.spec.ts` : la page s'affiche sans défilement horizontal, sur les 4 projets Playwright.
- Le `README.MD` vide fourni a été remplacé par `README.md`.
