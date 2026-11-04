# Rogue Planner — Handoff pour implémentation (v0.1, révision 2 du 04/11/2026)

Planner de builds pour jeux rogue-like, utilisable sur ordinateur et sur mobile. Premier jeu : **SWORN**.
Le joueur prépare des builds (mode **Création**), puis suit sa partie en direct (mode **RUN**) : il note chaque
bénédiction prise et l'outil montre l'écart au plan, l'étape suivante, ce qui reste à trouver et les duos qui s'ouvrent.

Ce document est la référence. Le prototype validé est `reference/prototype.html` : en cas de doute sur un
comportement ou un texte, il fait foi, sauf mention contraire ici.

Architecture et méthode reprises du Carnet de Rokugan (`nelsio/carnet-l5r`).

> **Révision 2** : ordre d'acquisition et mode pas à pas, totaux par fae, potions, tri du RUN par fae ou par type,
> fae prévue dans les aptitudes du RUN, aptitudes dans « Encore à trouver », descriptions en anglais.
> Le détail des changements et leur effet sur les lots est en **annexe D**.

**Fichiers fournis avec ce handoff**

| Fichier | Rôle | Modifiable ? |
|---|---|---|
| `HANDOFF.md` | Ce document | Oui, par lot (annexe ajoutée à chaque lot) |
| `reference/prototype.html` | Prototype cliquable validé (révision 2) | Non |
| `src/games/sworn/pack.json` | Données SWORN : fae, bénédictions, prérequis, classes, enclumes, potions | Oui, pour corriger une donnée (voir §4.5) |
| `tests/core.engine.spec.ts` | Spécification exécutable du moteur (30 tests ; une valeur attendue révisée, annexe D) | Non : les valeurs attendues font foi |
| `tests/core.plan.spec.ts` | Spécification de la révision 2 : ordre, pas à pas, totaux, potions (20 tests) | Non |
| `tests/fixtures/export-prototype.json` | Export JSON du prototype, révision 1 (sans ordre ni potions) | Non |
| `tests/fixtures/export-prototype-v2.json` | Export JSON du prototype, révision 2 (ordre, potions, run actif avec étape passée) | Non |

Les deux specs ont été validées contre une implémentation de référence : **50 tests sur 50 passent**, et les fichiers
compilent en TypeScript strict.

---

## 1. Périmètre v0.1

### Inclus
- Un seul jeu : SWORN. L'architecture est multi-jeu dès le départ (§2) ; le sélecteur de jeu n'affiche que SWORN.
- **Bibliothèque** de builds : créer, ouvrir, dupliquer, supprimer (avec confirmation dans la page), lancer un run.
- **Création** : classe, arme, sort ; mode **Libre** ou **Restreint** ; une aptitude par emplacement ; bénédictions
  visées avec priorité (Essentielle / Bonus) ; prérequis affichés et colorés ; **total de bénédictions nécessaires par fae** ;
  **4 potions dans l'ordre** ; **ordre d'acquisition** ; duos atteignables ; enclumes visées ; notes.
- **RUN** : un run actif à la fois, avec ou sans build ; **pas à pas** dans l'ordre d'acquisition ; prises dans l'ordre ;
  écart au plan ; **totaux par fae (pris / nécessaires)** ; emplacements avec **fae prévue** ; **potions** ; ce qui reste à trouver
  (**aptitudes comprises**) ; **tri par ordre, fae ou type** ; duos ouverts ; enclumes prises ; autres choix (Merlin, Morgane,
  sanctuaire, autre) ; fin du run (victoire ou défaite, zone atteinte, notes) ou abandon.
- **Historique** des runs terminés, filtrable par build, avec totaux.
- **Catalogue** des bénédictions (filtre par fae, recherche, prérequis) et ajout manuel d'une bénédiction manquante.
- **Import / export** JSON par fusion.
- Stockage local (IndexedDB), thème clair / sombre / auto, mobile validé.

### Hors périmètre v0.1 (prévu plus tard)
- Indicateurs partiels de dégâts (valeurs par rareté du wiki). Le modèle de données doit pouvoir les accueillir sans migration lourde.
- Coop (plusieurs joueurs dans un run), rareté et niveau des bénédictions, autres jeux, interface en anglais, PWA installable.
- Glisser-déposer pour l'ordre d'acquisition (v0.1 : boutons ↑ / ↓, accessibles au clavier et au toucher).
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
│  ├─ core/          # schémas Zod (pack, build, run, export), moteur (prérequis, duos, ordre, progression, potions), fusion d'import
│  ├─ games/
│  │  └─ sworn/      # pack.json (fourni), index.ts (charge et exporte le pack validé)
│  ├─ storage/       # LibraryStore, PrefsStore : IndexedDB et mémoire
│  ├─ ui/            # composants React, store (reducer), thème CSS, textes (strings.ts)
│  └─ main.tsx
├─ tests/
│  ├─ core.engine.spec.ts   # fourni
│  ├─ core.plan.spec.ts     # fourni (révision 2)
│  ├─ core.*.spec.ts        # tests ajoutés par l'agent (schémas, libellés, cas limites)
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
Alias : `@rogue/core` → `src/core/index.ts`, à déclarer dans `vite.config.ts` et `tsconfig.json` (utilisé par les specs fournies).

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

Conventions : commentaires, messages d'erreur et textes d'interface en français ; identifiants techniques en anglais.
Tous les textes d'interface passent par `src/ui/strings.ts` (préparation de l'anglais, hors v0.1).
**Exception voulue** : les noms et descriptions des bénédictions et des enclumes restent en anglais (texte du jeu), tels que dans le pack.

---

## 3. Modèle de données

### 3.1 Pack de jeu (`src/games/sworn/pack.json`)
Format complet en annexe A. En résumé :

| Champ | Contenu |
|---|---|
| `format`, `version` | `"rogue-planner-pack"`, `1` |
| `game` | `id`, `name`, `dataVersion` (`2026.11.04`), `sources` (nom, URL, licence, `what`) |
| `labels` | Vocabulaire du jeu : « Fae », « Bénédiction », « Enclume », « Classe », « Arme », « Sort », « Potion » |
| `slots` | Les 6 emplacements d'aptitude : `light`, `heavy`, `spell`, `dash`, `companion`, `ultimate` |
| `kinds` | `ability`, `standard`, `duo`, `roundtable` (+ `custom` ajouté par le moteur pour les saisies manuelles) |
| `families` | Les 8 fae : `id`, `name`, `title`, `status`, `color.light`, `color.dark` |
| `triggers` | Les 32 effets déclencheurs (Critique, Ombre, Froid…) |
| `loadouts` | Les 4 classes, chacune avec ses 4 armes et ses 4 sorts |
| `items` | Les 256 bénédictions : `id`, `name`, `kind`, `families`, `slot?`, `effect` (**anglais**), `provides?`, `requires` |
| `augments` | Les enclumes : pour chaque arme ou sort (`for`), la liste des options (`id`, `name`, `effect` en anglais) |
| `potions` | `{ "perRun": 4, "from": "families" }` : 4 potions par run, une potion par fae (§4.8) |
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
  order?: string[];           // ordre d'acquisition choisi (§4.6) ; absent ou [] = ordre par défaut
  potions?: (string | null)[];   // potions prévues, dans l'ordre (ids de fae), au plus pack.potions.perRun
  notes: string;
  updatedAt: string;          // ISO
  example?: boolean;          // données d'exemple (badge « Exemple »)
}
```
`order` et `potions` sont optionnels dans le type (les builds de la révision 1 restent valides) ; le schéma Zod
les complète à `[]` au chargement et à l'import. `order` peut contenir des ids sortis du plan : ils sont ignorés
par `planOrder` et nettoyés à la sauvegarde suivante.

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
  potions?: string[];                            // potions prises, dans l'ordre (ids de fae), au plus 4
  skipped?: string[];                            // étapes du pas à pas « passées pour l'instant »
  others: { kind: string; text: string }[];      // Merlin, Morgane, sanctuaire, autre
  result: { outcome: "win" | "loss"; reached: string; notes: string } | null;
  example?: boolean;
}
```
Un seul run `active` à la fois. Lancer un run alors qu'un autre est actif demande confirmation dans la page
(« Un run est en cours. L'abandonner et en lancer un nouveau ? ») ; l'ancien passe en `abandoned`.
« Abandonner sans enregistrer » supprime le run. `potions` et `skipped` : même règle que §3.2 (complétés à `[]`).

### 3.4 Bénédiction ajoutée à la main
```ts
interface CustomItem { id: string; game: string; name: string; family: string; slot?: SlotId; effect: string }
```
Identifiant : `custom:<nom-normalisé>-<4 caractères aléatoires>`. Aucun prérequis. Fusionnée au pack par `withCustom`.
Le prototype exporte `fae: [id]` au lieu de `family` : l'import convertit.

### 3.5 Préférences
`theme` (`auto` | `light` | `dark`), `lastView`, `lastBuildId`, `codexFamily` (dernier filtre du catalogue),
`runSort` (`order` | `family` | `kind`, défaut `order`), `persistRequested`.

### 3.6 Fichier d'export
```json
{ "format": "rogue-planner", "version": 1, "game": "sworn", "builds": [], "runs": [], "custom": [] }
```
L'import accepte aussi `"format": "carnet-runs"` (anciens exports du prototype). La révision 2 n'ajoute que des champs
optionnels : le numéro de version du fichier reste `1`.

---

## 4. Moteur (`src/core`)

### 4.1 API attendue par les specs
```ts
loadPack(json: unknown): Pack                          // Zod + contrôles croisés ; lève PackFormatError { errors: { path, message }[] }
withCustom(pack: Pack, custom: CustomItem[]): Pack     // ajoute les saisies manuelles (kind "custom")
missing(pack, itemId, owned: Iterable<string>): Alternative[][]   // groupes non remplis, dans l'ordre déclaré
isUnlocked(pack, itemId, owned): boolean
buildOwned(build: Build): Set<string>                  // aptitudes + bénédictions visées
reachableDuos(pack, owned, { restricted }): string[]   // duos dont les fae sont présentes (hors duos possédés) ; en restreint, débloqués seulement
toggleTarget(pack, build, itemId): Build               // aptitude : occupe / libère son emplacement ; sinon absente → bonus → essentielle → absente
applyPick(pack, run, itemId, at): Run                  // ajoute ; une aptitude remplace celle du même emplacement ; pas de doublon ; retire l'id de run.skipped
runProgress(pack, build | null, run): RunProgress
mergeImport(library: Library, json: unknown): MergeResult

// Révision 2
planOrder(pack, build): string[]                       // §4.6
moveInOrder(pack, build, from: number, to: number): Build
nextStep(pack, build, run): { index: number; id: string } | null
skipStep(run, id): Run
unskipStep(run, id?: string): Run                      // sans id : reprend toutes les étapes passées
familyTotals(pack, ids: Iterable<string>): { families: Record<string, number>; duos: string[] }   // §4.7
buildPotions(pack, build): (string | null)[]           // §4.8 ; toujours pack.potions.perRun cases
applyPotion(pack, run, familyId): Run
undoPotion(run): Run
```
`Pack` expose aussi `byId: Map<string, Item>` (utilisé par la spec de la révision 2).
Toutes les fonctions sont pures : elles ne modifient jamais leurs arguments, et rendent l'objet d'origine
(même référence) quand l'opération est refusée (déplacement hors bornes, 5e potion, fae inconnue).

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
  remaining: { id: string; prio: "ability" | "core" | "bonus" }[];   // plan non pris, dans l'ordre d'acquisition (révision 2)
  slots: Record<SlotId, { current: string | null; planned: string | null; mismatch: boolean }>;
  openDuos: string[];                       // reachableDuos sur les prises, mode libre
  next: { index: number; id: string } | null;                        // nextStep ; null sans build
  families: { family: string; planned: number; taken: number }[];    // §4.7
  duos: { planned: number; taken: number };                          // §4.7
  potions: { index: number; planned: string | null; taken: string | null }[];   // §4.8, toujours 4 cases
}
```

### 4.4 Ensemble « possédé »
- En Création : `buildOwned(build)`.
- En RUN : les ids de `run.picks`.
- Le déblocage en RUN est **indicatif** : une bénédiction verrouillée reste choisissable (le jeu fait foi).

### 4.5 Corriger une donnée
Modifier `pack.json`, puis `npm test` : `loadPack` refuse toute référence cassée. Chaque correction de donnée
est une PR courte avec la source dans la description. `game.dataVersion` prend la date du jour.

### 4.6 Ordre d'acquisition et pas à pas
- **Plan** = aptitudes du build dans l'ordre des emplacements (`light` → `ultimate`), puis bénédictions visées dans
  l'ordre d'ajout ; sans doublon ; ids inconnus du pack ignorés.
- `planOrder` : les ids de `build.order` encore dans le plan, dans cet ordre, puis les éléments du plan absents de
  `order`, dans l'ordre du plan. Un élément ajouté au build arrive donc **en fin d'ordre** ; un élément retiré disparaît.
- `moveInOrder` part de `planOrder`, déplace l'élément, et écrit l'ordre complet dans `order`.
  « Ordre par défaut » = `order: []`.
- `nextStep` : premier élément de `planOrder` ni pris ni dans `run.skipped`. `index` est sa position dans l'ordre complet
  (affiché « Étape index+1 »).
- « Passer pour l'instant » = `skipStep` ; l'étape reste visible, barrée, avec un bouton Reprendre. Prendre une étape
  passée (par le pas à pas ou par « + Bénédiction ») la retire de `skipped` (fait par `applyPick`).

### 4.7 Totaux par fae
- `familyTotals` : chaque bénédiction non duo compte **1 pour sa fae** (aptitude, standard, Table ronde, ajout manuel) ;
  les duos sont listés à part ; les ids inconnus sont ignorés.
- `runProgress.families` : une entrée par fae **présente dans le plan** ; `planned` = total du plan, `taken` = toutes les
  prises de cette fae, **hors plan comprises** (le compte sert aussi aux seuils de Table ronde). Tri : `planned`
  décroissant, puis ordre des fae dans le pack.
- `runProgress.duos` : `planned` = duos du plan ; `taken` = duos du plan déjà pris.

### 4.8 Potions
- Une potion par fae ; **4 par run** (`pack.potions.perRun`). Le pack ne liste pas les potions : les options sont les
  `families` (`from: "families"`). Voir P8.
- Build : `buildPotions` rend toujours 4 cases (`null` = non prévue) ; une même fae peut revenir plusieurs fois.
- Run : `applyPotion` ajoute à la fin ; refuse au-delà de 4 et pour une fae inconnue. `undoPotion` retire la dernière.
- `runProgress.potions[i]` : potion prévue et potion prise à la position `i`.

---

## 5. Stockage (`src/storage`)

- `LibraryStore` : `listBuilds`, `putBuild`, `removeBuild`, `listRuns`, `putRun`, `removeRun`, `listCustom`, `putCustom`, `removeCustom`.
- `PrefsStore` : `get`, `set(patch)` (une clé à `undefined` est supprimée).
- Implémentations : IndexedDB (base `rogue-planner`, magasins `builds`, `runs`, `custom`, `prefs`) et mémoire.
- `openStorage()` : IndexedDB, ou repli en mémoire si absent ou sans réponse en 3 s. En repli, un bandeau
  le dit : « Le navigateur refuse le stockage : vos données disparaîtront à la fermeture. Exportez-les avant de partir. »
- Au premier lancement, `navigator.storage.persist()` est demandé une fois ; un refus est silencieux.
- Bibliothèque vide au premier lancement : on charge les deux builds et le run d'exemple du prototype (badge « Exemple »),
  **avec l'ordre et les potions de la révision 2** (voir `sample()` dans le prototype).
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
Cartes de build : nom, badge Exemple, « Classe · Arme · Sort · mode restreint|libre », **puces de totaux par fae**
(« Lugh ×5 », « Duos ×1 », §6.8), « N essentielles · N visées · N runs · N victoires », boutons Lancer un run, Modifier,
Dupliquer, Supprimer. En tête : Nouveau build, Run sans build, Importer / exporter.

### 6.3 Création (ordre des blocs)
Colonne principale :
1. **Départ** : nom ; Classe, Arme, Sort (arme et sort filtrés par classe ; changer de classe prend la première arme et le premier sort) ; sélecteur **Libre / Restreint** avec sa phrase d'aide.
2. **Aptitudes visées** : 6 listes déroulantes, une par emplacement.
3. **Bénédictions visées** : bouton Ajouter ; chaque ligne montre nom, effet, type, **prérequis**, bouton de priorité (Essentielle / Bonus) et ✕.

Colonne de droite sur ordinateur (dessous sur mobile) :
4. **Fae du build · bénédictions nécessaires** : puces de totaux (§6.8) + « Aptitudes, standards et table ronde comptent pour leur fae ; les duos sont comptés à part. »
5. **Potions · ordre de prise** : 4 cases « Potion 1 » à « Potion 4 », chacune une liste « — » + les 8 fae ; la case prend la couleur de la fae ; aide « Une potion par fae ; elle oriente vers le sanctuaire de cette fae. »
6. **Duos atteignables** (bouton Viser).

Pleine largeur :
7. **Ordre d'acquisition · N** : liste numérotée de `planOrder` (pastille, nom, type) avec boutons **↑ / ↓** (désactivés aux extrémités ;
   le focus suit l'élément déplacé). Bouton « Ordre par défaut » visible seulement si un ordre a été choisi. Aide :
   « L'ordre dans lequel prendre aptitudes et bénédictions. Le mode RUN le suit pas à pas. » Vide : « Choisissez des aptitudes et des bénédictions pour les ordonner. »
8. **Enclumes** : les augments de l'arme puis du sort du build ; un toucher vise / retire.
9. **Notes**.

**Prérequis affichés** partout où une bénédiction apparaît avec un contexte (visées, sélecteurs, pas à pas) :
« Prérequis : » puis chaque groupe, **vert avec ✓** s'il est rempli, **orange** sinon ; groupes joints par « et »,
alternatives par « ou ». Sans prérequis : « Aucun prérequis ». Libellés : nom de la bénédiction ;
« un effet Critique » ; « un effet Saignement (hors Bloody Shadows) » ; « une aptitude de Lugh (légère, lourde, sort, esquive) » ;
« 5 bénédictions de Lugh (solo) ». Élision : « d'Oberon ».

**Sélecteur « Ajouter »** (feuille en bas sur mobile, fenêtre centrée sur ordinateur) : sélecteur Libre / Restreint
repris dans l'en-tête ; recherche ; puces de fae ; **filtre de type** (Tous types, Aptitudes, Standard, Duos, Table ronde).
En restreint : section « Disponibles · N », puis section « Verrouillées · N (il manque une aptitude) » **dépliée par défaut**,
éléments grisés et non cliquables. En libre : tout est cliquable. Choisir une aptitude la place dans son emplacement.

### 6.4 RUN
Ordre des blocs :
- En-tête : « Mode RUN · commencé à HH:MM », nom du build ou « Run libre », kit ; lien repliable
  « Changer la classe, l'arme ou le sort de ce run » ; bouton Terminer le run.
- Avec build : compteurs Essentielles `x/y`, Prises, Hors plan, barre de progression des essentielles, puis
  **Fae · prises / nécessaires** : puces « Lugh 1/5 », vertes quand le total est atteint, et « Duos 0/1 ».

Colonne principale :
1. **Pas à pas · N/M pris** (avec build et plan non vide) : carte de l'étape en cours — « Étape k · aptitude|essentielle|bonus »,
   nom, effet, type, prérequis colorés (contre les prises), boutons **Prise** et **Passer pour l'instant** ; puis « Ensuite » (3 étapes à venir) ;
   puis « Tout l'ordre (M) » repliable (prises cochées, passées barrées avec Reprendre, étape en cours encadrée). Bouton
   « Reprendre les passées (N) » dans l'en-tête quand il y en a. Plus d'étape : « Plus aucune étape. » + « Tout le plan est pris. » ou « Il reste des étapes passées. »
2. **Aptitudes** : 6 emplacements. Pris : pastille + nom + **nom de la fae** ; si conforme au plan, « ✓ prévu ».
   Vide avec plan : « — » et « Prévu : ● Fae · Nom », cadre pointillé à la couleur de la fae prévue. Différent du plan : contour pointillé orange + « Prévu : ● Fae · Nom ».
3. **Potions · n/4** : 4 cases ; la prochaine est encadrée ; chaque case montre la potion prise et/ou « Prévue : ● Fae »
   (« ✓ prévue » si conforme). Tant que n < 4 : bouton « Prendre la prévue : Fae » (si prévue) et une puce par fae.
   Bouton « Annuler la dernière » dès qu'une potion est prise.
4. **Prises** (+ « , dans l'ordre » en tri Ordre) avec le sélecteur de tri (§6.9) : numéro de prise, nom, type, étiquette « prévue » / « hors plan », ✕.
5. **Enclumes · N pris** : options de l'arme et du sort du run ; prévues en pointillé avec étiquette « prévu » ; un toucher prend / retire.
6. **Autres choix du run** : Merlin, Morgane, Sanctuaire, Autre → champ texte puis Ajouter.

Colonne de droite :
- **Encore à trouver · N** (avec build) avec le sélecteur de tri : `runProgress.remaining` — **aptitudes comprises** — étiquette
  « aptitude », « essentielle » ou « bonus » ; les étapes passées sont atténuées.
- **Duos atteignables maintenant** (« prévu » ou « ouvert »), **Notes du build**.

Bouton flottant **+ Bénédiction** : sélecteur avec « Prévues dans le build » d'abord ; filtre de type ; prérequis colorés ;
verrouillées affichées en bas, grisées mais choisissables.

**Fin du run** (dans la page) : Victoire / Défaite, « Jusqu'où ? », Notes ; Enregistrer, Continuer le run, Abandonner sans enregistrer.

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
- Cibles tactiles d'au moins 40 px (les boutons ↑ / ↓ de l'ordre font 30 px dans le prototype : **les porter à 40 px**).

### 6.8 Puces de totaux par fae
Composant partagé (bibliothèque, Création, RUN) : pastille de couleur + nom de fae + compte en chiffres tabulaires.
Création / bibliothèque : « ×N ». RUN : « pris/N », bordure verte quand pris ≥ N. Une puce « Duos » à part si le plan en contient.
Infobulle : « Lugh : 1 prise(s) sur 5 prévue(s) ». Ordre des puces : celui de `runProgress.families` (§4.7).

### 6.9 Tri du RUN
Sélecteur segmenté **Ordre · Fae · Type**, partagé par « Prises » et « Encore à trouver », mémorisé dans `prefs.runSort`.
- Ordre : ordre de prise (Prises) ou ordre d'acquisition (Encore à trouver).
- Fae : groupes dans l'ordre des fae du pack, duos en dernier ; titre de groupe « ● Lugh · N », « Duos · N ».
- Type : groupes Aptitude, Standard, Duo, Table ronde, Ajoutée ; titre « Aptitude · N ».
Dans les groupes, l'ordre de base est conservé. Le numéro de prise reste le rang réel dans le run.

---

## 7. Import et export
- Export : téléchargement `rogue-planner-AAAA-MM-JJ.json` et bouton Copier (repli : sélection du texte).
- Import : fichier ou texte collé ; `mergeImport` ; message « N éléments importés (N ajoutés, N remplacés) » ou erreurs par champ.
- Les champs absents prennent leur valeur par défaut (`mode: "restricted"`, `anvils: []`, `order: []`, `potions: []`,
  `skipped: []`, emplacements vides → `null`, `""` dans `potions` → `null`, run sans `game` → celui du fichier).

---

## 8. Distribution GitHub
- Dépôt `nelsio/rogue-planner` (à créer), public, licence MIT pour le code.
- `pages.yml` : build puis publication de `dist/rogue-planner.html` en `index.html` sur `https://nelsio.github.io/rogue-planner/`.
- `release.yml` : sur tag `v*`, joint `rogue-planner.html` à la release.
- README (vitrine, captures, démarrage), `docs/GUIDE.md` (guide joueur), `docs/CREDITS.md` (annexe C).

---

## 9. Tests
« Terminé » = lint propre, `tsc --noEmit` sans erreur, tests Vitest verts avec 100 % des lignes de `src/core`, build, Playwright vert, CI verte.

### 9.1 Moteur — fourni (50 tests)
- `tests/core.engine.spec.ts` (30 tests) et `tests/core.plan.spec.ts` (20 tests).
Implémenter `src/core` jusqu'à ce que les deux fichiers passent, **sans modifier les valeurs attendues**.

### 9.2 À écrire par l'agent
- `core.schemas.spec.ts` : schémas Build / Run / CustomItem (valeurs par défaut, refus avec chemin d'erreur).
- `core.labels.spec.ts` : libellés de prérequis (§6.3), y compris l'élision et la forme « hors X ».
- `storage/*.spec.ts` : IndexedDB et mémoire, repli après délai, persistance demandée une seule fois, exemples au premier lancement.
- `ui/*.spec.tsx` : bibliothèque (puces de totaux), création (mode, sélecteur et filtre de type, prérequis colorés, potions,
  ordre ↑ / ↓ et « Ordre par défaut », enclumes), run (pas à pas Prise / Passer / Reprendre, prises, remplacement d'aptitude,
  aptitudes avec fae prévue, potions, tri Ordre / Fae / Type, enclumes, fin du run), historique, catalogue, import.
- `e2e/*.spec.ts` (chromium, webkit, iPhone 13, Pixel 7) :
  1. Créer un build en restreint, viser une aptitude Lugh, vérifier que Critical Clover passe de verrouillée à disponible.
  2. Lancer le run, prendre 3 bénédictions dont une hors plan, prendre une enclume prévue, terminer en victoire, retrouver le run dans l'historique.
  3. Exporter, vider le stockage, importer : tout est revenu (ordre, potions et étapes passées compris).
  4. Mobile : barre d'onglets en bas, aucun défilement horizontal sur chaque écran.
  5. Rechargement : le run actif est retrouvé, avec son étape en cours.
  6. **Pas à pas** : sur le build d'exemple, remonter une bénédiction en tête de l'ordre, lancer le run, vérifier qu'elle est l'étape 1 ;
     « Prise » → l'étape 2 s'affiche et la puce de sa fae passe à 1/N ; « Passer » → étape 3 ; prendre la potion prévue → « Potion 1 » remplie et la case 2 encadrée.

---

## 10. Plan de livraison (lots)
**Un lot = une PR = une version.** Chaque lot ajoute son annexe au HANDOFF et son entrée au `CHANGELOG.md`.

| Lot | Version | Contenu | Fini quand |
|---|---|---|---|
| 0 | v0.0.1 | Squelette : Vite + React + TS strict, ESLint, Vitest, Playwright, singlefile, alias `@rogue/core`, polices, workflows ci / pages / release, README minimal, LICENSE | Une page « Rogue Planner » vide est en ligne sur Pages ; CI verte |
| 1 | v0.0.2 | Moteur : schéma du pack (avec `potions`), `loadPack`, `withCustom`, prérequis, duos, `toggleTarget`, `applyPick`, ordre et pas à pas, totaux, potions, `runProgress` ; schémas Build / Run / CustomItem ; `mergeImport` ; pack SWORN chargé par `src/games/sworn` | Les deux specs fournies vertes ; 100 % des lignes de `src/core` |
| 2 | v0.0.3 | Stockage : interfaces, IndexedDB, mémoire, repli, persistance, exemples au premier lancement | Tests de stockage verts |
| 3 | v0.0.4 | Coquille + Bibliothèque + Création (§6.1 à §6.3, §6.8) : potions, ordre d'acquisition, filtre de type | Scénario e2e 1 vert ; mobile sans défilement horizontal |
| 4 | v0.0.5 | RUN + Historique (§6.4, §6.5, §6.9) : pas à pas, totaux, potions, tri | Scénarios e2e 2, 5 et 6 verts |
| 5 | v0.1.0 | Catalogue, import / export, finitions mobiles, README + GUIDE + CREDITS + captures, release | Scénarios e2e 3 et 4 verts ; release v0.1.0 avec `rogue-planner.html` |

Si un lot dépasse une PR raisonnable (plus de ~1 500 lignes hors tests et données), le découper (ex. 3a Coquille + Bibliothèque, 3b Création) et le signaler.
**Si des lots sont déjà livrés** quand cette révision arrive : voir annexe D, « Rattrapage ».

---

## 11. Méthode
- Ne pas modifier `reference/`, les specs fournies ni les fixtures.
- Un désaccord avec une spec ou le prototype se note en §12, avec la raison ; il ne se corrige pas en silence.
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
| P7 | Descriptions anglaises : 246 bénédictions reprennent le texte du jeu (guide Steam, coquilles corrigées). Les 10 relevées sur le wiki (Compounding Flood, Enduring Storm, Hurricane, Fury Of Blows, Burn Bright, Eruption, Proximity Burns, Wildfire ×3) et les enclumes ont un **résumé anglais rédigé**, pas le texte exact | Remplacer par le texte du jeu en jouant |
| P8 | Potions : aucune liste officielle trouvée ; les sources parlent seulement de « Fae potions » (orientent vers le sanctuaire de la fae). Modèle retenu : une potion par fae, 4 par run | À confirmer en jeu ; si d'autres potions existent, ajouter une liste `potions.options` au pack (`from: "list"`) |
| P9 | Le compte « pris » d'une fae inclut les prises hors plan ; le compte « Duos pris » ne compte que les duos du plan | Choix du prototype ; à revoir à l'usage |
| P10 | Cartes de build : le prototype écrit toujours « N runs · N victoires » ; la v0.1 accorde (« 1 run · 0 victoire ») | Écart volontaire (lot 3a), à confirmer |
| P11 | Crédits : liens directs vers les pages de fae du wiki (Fandom répond 403 aux requêtes automatiques) | Ajouter les liens après vérification à la main |
| P12 | Run d'un build supprimé : « Build supprimé » au lieu de « Run libre » (prototype) | Validé le 2026-11-03 (lot 5) |

---

## Annexe A — Pack : extrait commenté
```json
{
  "format": "rogue-planner-pack", "version": 1,
  "game": { "id": "sworn", "name": "SWORN", "dataVersion": "2026.11.04", "sources": [
    { "what": "Liste des bénédictions et descriptions anglaises", "name": "SWORN: All Blessings Guide (Steam)", "url": "https://steamcommunity.com/sharedfiles/filedetails/?id=3432002004" },
    { "what": "Prérequis, effets produits, bénédictions ajoutées, augments", "name": "SWORN Wiki (Fandom)", "url": "https://sworn-game.fandom.com/", "license": "CC BY-SA 3.0" } ] },
  "slots": [ { "id": "light", "label": "Attaque légère" } ],
  "families": [ { "id": "lugh", "name": "Lugh", "title": "La Main du Destin", "status": "Critique", "color": { "light": "#856700", "dark": "#ecc95a" } } ],
  "triggers": [ { "id": "crit", "label": "Critique" } ],
  "items": [
    { "id": "lugh:lucky-touch", "name": "Lucky Touch", "kind": "ability", "families": ["lugh"], "slot": "light",
      "effect": "Your Light Attack is stronger and can Critical Hit.", "provides": ["crit"], "requires": [] },
    { "id": "duo:flash-freeze", "name": "Flash Freeze", "kind": "duo", "families": ["beira", "lugh"],
      "effect": "Every time you apply Chill, you have a chance to instantly Freeze the target.",
      "requires": [ [ { "item": "beira:bitter-frost" } ], [ { "trigger": "crit" } ] ] }
  ],
  "augments": [ { "for": "Chakrams", "options": [ { "id": "chakrams:spare-blade", "name": "Spare Blade", "effect": "One extra chakram to throw" } ] } ],
  "potions": { "perRun": 4, "from": "families" }
}
```

## Annexe B — Du prototype à la v0.1
| Prototype | v0.1 |
|---|---|
| `localStorage` (clé `carnet-runs-proto-v1`) | IndexedDB (§5) |
| Données dans le HTML (`FAE_RAW`, `REQUIRES` en texte, table `EN`) | `pack.json` structuré (§3.1) |
| `b.abilities[slot] = ""`, `b.potions[i] = ""` | `null` |
| Prérequis en chaîne `"t:crit & Bitter Frost"` | Groupes d'alternatives JSON |
| `fae` / `type` | `families` / `kind` |
| `S.ui.runSort` (non persisté) | `prefs.runSort` (persisté) |
| Boutons ↑ / ↓ de 30 px | 40 px (§6.7) |
| Un seul fichier HTML | Projet Vite, livrable unique `rogue-planner.html` |

## Annexe C — Licences et crédits (`docs/CREDITS.md`)
- **Code** : MIT.
- **Données SWORN** (`src/games/sworn/pack.json`) : prérequis, effets produits, bénédictions ajoutées et enclumes
  tirés du **SWORN Wiki** (Fandom), sous **CC BY-SA 3.0**. Le fichier de données est donc diffusé sous CC BY-SA 3.0,
  avec attribution (lien vers le wiki et ses pages de fae) dans `CREDITS.md`, le README et le catalogue.
  Liste initiale et descriptions anglaises : guide Steam « SWORN: All Blessings Guide » (texte du jeu, cité avec lien).
- **Polices** : licences OFL jointes.
- **SWORN** est une marque de ses éditeurs (Team17, Windwalk Games). Projet de fan non affilié ; aucun contenu graphique du jeu.

## Annexe D — Révision 2 (04/11/2026)

### Demandes couvertes
| Demande | Où |
|---|---|
| Définir un ordre d'acquisition, puis le suivre pas à pas en RUN | §4.6, §6.3 (bloc 7), §6.4 (bloc 1) |
| Nombre total de bénédictions nécessaires par fae, en Création et en RUN | §4.7, §6.2, §6.3 (bloc 4), §6.4, §6.8 |
| Choisir les 4 potions dans l'ordre | §4.8, §6.3 (bloc 5), §6.4 (bloc 3) |
| En RUN, trier aussi par type (et par fae) | §6.9 ; filtre de type dans les sélecteurs (§6.3) |
| En RUN, aptitudes : couleur et fae prévue en plus du nom | §6.4 (bloc 2) |
| Descriptions en anglais | §3.1, P7 |
| Aptitudes dans « Encore à trouver » | §4.3 (`remaining`), §6.4 |

### Changements de contrat
- `pack.json` : `effect` des bénédictions et des enclumes en anglais ; nouvelle clé `potions` ; libellés `potion(s)` ; `dataVersion` `2026.11.04`.
- Types : `Build.order?`, `Build.potions?`, `Run.potions?`, `Run.skipped?` ; `prefs.runSort`.
- `runProgress().remaining` : suit `planOrder` et inclut les aptitudes, `prio` vaut `"ability"` pour elles.
  **Une valeur attendue de `core.engine.spec.ts` a changé en conséquence** (test « écart au plan, essentielles, emplacements »).
  C'est la seule modification de cette spec.
- `applyPick` retire l'id de `run.skipped`.
- Nouvelles fonctions : `planOrder`, `moveInOrder`, `nextStep`, `skipStep`, `unskipStep`, `familyTotals`, `buildPotions`,
  `applyPotion`, `undoPotion` ; `Pack.byId`.
- Nouveaux fichiers : `tests/core.plan.spec.ts`, `tests/fixtures/export-prototype-v2.json`.

### Rattrapage, si des lots sont déjà livrés
- **Lot 1 livré** : PR « Révision 2 — moteur » : nouveau pack, champs optionnels dans les schémas, nouvelles fonctions,
  `remaining` révisé ; les deux specs vertes. Version de rattrapage : incrément de patch du dernier tag.
- **Lot 3 livré** : PR « Révision 2 — Création » : puces de totaux, potions, ordre d'acquisition, filtre de type.
- **Lot 4 livré** : PR « Révision 2 — RUN » : pas à pas, totaux, potions, aptitudes avec fae, tri, « Encore à trouver » avec aptitudes ; e2e 6.
- Lots non livrés : intégrer directement selon le tableau du §10.

## Annexe Lot 0 — Squelette (v0.0.1)
- Versions retenues : React 18.3, Vite 8, TypeScript 6, Zod 4, Vitest 5, ESLint 10 (config plate), Playwright 1.64.
- Polices via `@fontsource/*` (sous-ensembles latins, graisses du prototype), inlinées en woff2 dans le livrable ;
  licences OFL copiées dans `docs/licenses/`.
- `tests/core.engine.spec.ts` est exclu de `tsc` et de Vitest le temps du lot 0 (il attend l'API du lot 1).
  L'exclusion est retirée au lot 1.
- Règle ESLint `no-non-null-assertion` désactivée : la spec fournie, non modifiable, utilise `!`.
- `tests/e2e/smoke.spec.ts` : la page s'affiche sans défilement horizontal, sur les 4 projets Playwright.
- Le `README.MD` vide fourni a été remplacé par `README.md`.

## Annexe Lot 1 — Moteur (v0.0.2)
- Fichiers : `core/zod.ts` (Zod en français, chemins d'erreur), `core/pack.ts`, `core/schemas.ts`, `core/requires.ts`,
  `core/progress.ts`, `core/import.ts`. Types `Build`, `Run`, `CustomItem`, `Pack` déduits des schémas Zod.
- `SlotId` vaut `string` : le moteur ne fige pas les 6 emplacements de SWORN, ils viennent de `pack.slots`.
  Un emplacement absent de `build.abilities` se lit comme `null`.
- Les contrôles croisés vérifient aussi : fae et emplacement de chaque bénédiction, aptitude sans emplacement,
  `augments[].for` parmi les armes et sorts des classes, options d'enclume uniques.
- `reachableDuos` : la présence d'une fae se juge sur les bénédictions possédées hors duos.
- `withCustom` ajoute le type `{ id: "custom", label: "Ajout manuel" }` à `pack.kinds` ; une saisie manuelle
  n'occupe jamais d'emplacement d'aptitude, même si elle en précise un.
- `mergeImport` est atomique : un seul objet invalide fait refuser tout le fichier, avec chaque erreur à son chemin
  (`builds.1.hero`). Le `game` de l'enveloppe complète les objets qui n'en ont pas (runs du prototype).
  Il ne contrôle pas l'unicité du run actif : à traiter par l'interface (lot 5).
- `toggleTarget` et `applyPick` ne touchent pas `updatedAt` : les dates sont posées avant le dispatch (§2).
- Les libellés de prérequis (`core.labels.spec.ts`, §6.3) sont reportés au lot 3, où l'interface les affiche.
- Tests ajoutés : `core.schemas.spec.ts`, `core.pack.spec.ts`.

## Annexe Lot 2 — Stockage (v0.0.3)
- `src/storage` : `types.ts` (interfaces, `PrefsSchema`), `memory.ts`, `indexeddb.ts`, `index.ts`
  (`openStorage`, `requestPersistence`, `loadExamples`). `openStorage` renvoie `{ kind, library, prefs }` ;
  `kind: "memory"` signale le repli, et le texte du bandeau est dans `strings.storageFallback` (affiché au lot 3).
- Préférence ajoutée à §3.5 : `examplesLoaded`. Les exemples sont chargés une seule fois, et seulement si la
  bibliothèque est vide ; un joueur qui supprime tout ne les voit pas revenir.
- Exemples SWORN : `src/games/sworn/examples.json`, copie de la fixture du prototype (un test vérifie l'égalité),
  importée par `mergeImport`. Le stockage reste indépendant du jeu : les exemples lui sont passés en paramètre.
- Préférences en IndexedDB : une entrée par clé dans le magasin `prefs`. Lecture clé par clé : une valeur invalide
  est ignorée et signalée, les autres sont gardées.
- Persistance non demandée en repli mémoire (sans objet).
- Si la base s'ouvre après le délai de 3 s, elle est refermée aussitôt : on reste en mémoire pour la session.
- L'ordre de `list*` n'est pas garanti (ordre des clés en IndexedDB, d'insertion en mémoire) : l'interface trie.
- `tests/setup.ts` charge `fake-indexeddb/auto` (classes IndexedDB globales).

## Annexe Lot 3a — Coquille et bibliothèque
- Lot 3 découpé : 3a (coquille + bibliothèque), 3b (Création). La version 0.0.4 sort à la fin du 3b.
- `src/ui` : `state.ts` (reducer pur, actions avec identifiants et dates déjà calculés), `context.tsx`
  (`AppProvider`, pack fusionné avec les ajouts manuels, recopie dans le stockage), `factory.ts` (création des
  builds et runs, `Env` = horloge + UUID injectables), `boot.ts`, `theme.ts`, `fae.tsx`, `Library.tsx`, `App.tsx`.
- Recopie dans le stockage : après chaque action, les objets dont la référence a changé sont enregistrés et les
  absents supprimés ; le reducer étant immuable, il n'y a pas d'écriture à faire à la main.
- CSS du prototype porté tel quel dans `theme.css` ; seules les règles `.fae[data-fae]` et le sigil, propres à SWORN,
  sont générés depuis `pack.families` par `theme.ts`.
- Builds triés du plus récent au plus ancien (`updatedAt`) au chargement ; un nouveau build ou une copie arrive en tête.
- Confirmation de remplacement du run actif : affichée sur la carte du build lancé, ou sous l'en-tête pour un run sans build.
- Classe, arme et sort par défaut (nouveau build, run libre) : la première classe du pack et ses premiers arme et sort.
- « Importer / exporter » est affiché désactivé jusqu'au lot 5. Run, Historique, Catalogue et Création affichent
  « Cet écran arrive dans une prochaine version. »
- Cibles tactiles de 40 px (§6.7) : les boutons `.small` du prototype en font ~30 ; reporté aux finitions mobiles du lot 5.
- e2e : `tests/e2e/library.spec.ts` (bibliothèque, aucun défilement horizontal sur chaque onglet, barre d'onglets en
  bas sur mobile, rechargement). Le livrable a aussi été vérifié ouvert en `file://`.

## Annexe Lot 3b — Création (v0.0.4)
- `src/ui` : `Editor.tsx`, `Picker.tsx`, `ModeSwitch.tsx`, `items.tsx` (pastille, texte, prérequis colorés),
  `labels.ts` (libellés), `useStartRun.tsx` (lancement de run partagé avec la bibliothèque).
- **Pack** : champ optionnel `slots[].short` (« légère », « lourde »…) pour les libellés de prérequis ; à défaut, le
  libellé de l'emplacement en minuscules. Ajouté au pack SWORN (réécriture JSON sans autre changement).
- Libellés de prérequis dans `src/ui/labels.ts` et non dans `src/core` : ce sont des textes affichés, qui passent
  par `strings.ts` (élision comprise). Le test prévu « `core.labels.spec.ts` » est donc `tests/ui/labels.spec.ts`.
- Type « custom » renommé « Ajoutée » (libellé du prototype) dans `withCustom`.
- Pas de ligne de prérequis pour une aptitude (elles n'en ont jamais), comme dans le prototype.
- Sélecteur en Création : choisir une bénédiction déjà visée ne change pas sa priorité ; au plus 120 lignes par
  section (comme le prototype), la recherche affine. Un ajout manuel avec emplacement va dans cet emplacement.
- Listes d'aptitudes : aptitudes de l'emplacement et ajouts manuels qui le précisent.
- Changer d'arme ou de sort garde dans `build.anvils` les enclumes de l'ancien choix (masquées), comme le prototype.
- Duos atteignables listés sans prérequis, comme le prototype.
- Accessibilité : « Sort » nomme à la fois le sort du kit et l'emplacement d'aptitude Sort ; les deux listes sont
  dans des blocs distincts (Départ, Aptitudes visées). À revoir si un lecteur d'écran s'y perd.
- e2e : `tests/e2e/creation.spec.ts` (scénario 1, et sélecteur tenu dans l'écran sans défilement horizontal).

## Annexe Lot 4 — RUN et Historique (v0.0.5)
- `src/ui` : `RunView.tsx` (RUN, autres choix, fin du run), `History.tsx`, `KitFields.tsx` (classe, arme, sort,
  partagé avec la Création), `anvils.ts`. `Picker.tsx` prend un mode `build` ou `run`.
- Reducer : actions `runSaved` (prise, enclume, kit, autres choix, fin du run, avec changement d'écran facultatif)
  et `runRemoved` (« Abandonner sans enregistrer »).
- Les calculs du RUN viennent du moteur : `runProgress` (compteurs, hors plan, emplacements, encore à trouver,
  duos ouverts) et `applyPick` (une aptitude remplace celle du même emplacement, pas de doublon).
- Sans run actif, l'onglet Run propose les trois premiers builds et « Run sans build » (prototype).
- Sélecteur en RUN : « Prévues dans le build » (non prises) en tête quand la recherche est vide, puis « Toutes » ;
  les verrouillées suivent les débloquées, grisées (`dim`) mais choisissables.
- Autres choix : la saisie se valide aussi par Entrée ; un texte vide n'ajoute rien.
- Historique : un run dont le build a été supprimé s'affiche « Run libre », comme dans le prototype. Le filtre
  n'est pas retenu entre deux visites.
- Enclumes en RUN : les augments affichés suivent l'arme et le sort du run ; un changement de kit garde les enclumes prises.
- e2e : `tests/e2e/run.spec.ts` (scénarios 2 et 5, pas de défilement horizontal en RUN et dans l'historique) ;
  `tests/e2e/helpers.ts` lit IndexedDB pour attendre les écritures avant un rechargement.

## Annexe Lot 5 — Catalogue, import / export, finitions (v0.1.0)
- `src/ui` : `Catalog.tsx` (liste, formulaire, `customId`), `ImportExport.tsx`. Reducer : `codexFamily`,
  `customAdded`, `customRemoved`, `libraryImported` ; le filtre de fae du catalogue est retenu (`prefs.codexFamily`).
- **« Build supprimé »** (décision du 2026-11-03) : un run dont le build n'existe plus l'affiche dans l'historique et
  en tête du RUN, au lieu de « Run libre » (prototype). « Run libre » reste pour un run lancé sans build.
- Ajout manuel : fae au choix ou « Autre » (pastille neutre `--f-custom`), emplacement facultatif, effet par défaut
  « Effet à préciser », identifiant `custom:<nom-normalisé>-<4 caractères>` tirés de l'UUID de `Env`.
- Retirer un ajout manuel ne touche ni les builds ni les runs qui le citent : la ligne disparaît de l'affichage ;
  le moteur (`applyPick`, `runProgress`) tolère désormais une prise inconnue du pack, et un test le couvre.
- Import : refus atomique avec au plus 10 erreurs affichées (`chemin : message`) ; « Ce texte n'est pas un JSON
  valide. » ; texte vide signalé. Après fusion, **un seul run reste actif** : celui commencé le plus tard ; les
  autres passent en abandonné (`singleActiveRun`, point laissé ouvert au lot 1).
- Export : le JSON affiché est celui téléchargé et copié (builds, runs, ajouts, exemples compris).
- **Cibles tactiles** (`@media (pointer:coarse)`) : boutons, puces, priorités, onglets, champs et select d'au moins
  40 px. WebKit fige la hauteur d'un select natif : sur écran tactile, les select perdent leur apparence native et
  le chevron est dessiné en CSS. Sur ordinateur, rien ne change par rapport au prototype. La cible du sélecteur de
  jeu est toute sa pastille.
- IndexedDB : `onversionchange` referme la base (mise à niveau ou suppression demandée par une autre page).
- e2e : `io.spec.ts` (scénario 3), `mobile.spec.ts` (scénario 4 : onglets en bas, aucun défilement horizontal et
  cibles ≥ 40 px sur chaque écran et chaque feuille). `scripts/screenshots.mjs` produit `docs/img` (hors CI).
- Crédits : les pages de fae du wiki sont nommées mais pas liées, Fandom refusant les vérifications automatiques (P11).

## Annexe Révision 2 — Moteur (v0.1.1)
- Rattrapage du lot 1 (annexe D). Les deux specs fournies passent (50 tests), 100 % des lignes de `src/core`.
- Fichiers de la révision 2 placés : `reference/prototype.html`, `src/games/sworn/pack.json`, `tests/core.engine.spec.ts`,
  `tests/core.plan.spec.ts`, `tests/fixtures/export-prototype-v2.json`. Ce HANDOFF reprend les annexes des lots et
  les anciens points P8 à P10, renumérotés P10 à P12 (la révision 2 réutilise P8 et P9).
- Pack : le champ `short` des emplacements (libellés courts des prérequis, ajouté au lot 3b) manquait au nouveau
  pack ; il est remis.
- `src/core/plan.ts` : ordre, pas à pas, totaux, potions. `Pack.byId` est construit par `loadPack` et `withCustom`
  et remplace `itemIndex(pack)`. Schéma : `potions.from` n'accepte que `"families"` (P8).
- Types : `Build.order?`, `Build.potions?`, `Run.potions?`, `Run.skipped?` restent optionnels ; les schémas Zod les
  complètent à `[]`. `applyPick` ne crée `skipped` que si le run en a déjà.
- `familyTotals` compte une bénédiction pour sa première fae (seuls les duos en ont plusieurs).
- Interface, seul changement de ce lot : « Encore à trouver » suit `remaining` révisé, avec l'étiquette « aptitude »
  (comme le prototype). Le reste de l'interface de la révision 2 arrive avec les PR Création et RUN.
- Exemples du premier lancement : `examples.json` = export v2 du prototype sans le run actif `ex-r2` (= `sample()`).
