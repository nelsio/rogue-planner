// Tous les textes affichés passent par ce fichier (préparation de l'anglais, hors v0.1).
import type { Theme, View } from "./state";

const plural = (n: number, one: string, many: string) => (n > 1 ? many : one);

export const strings = {
  appName: "Rogue Planner",
  storageFallback:
    "Le navigateur refuse le stockage : vos données disparaîtront à la fermeture. Exportez-les avant de partir.",

  // Coquille
  game: "Jeu",
  otherGames: "Autres jeux : bientôt",
  tabs: { builds: "Builds", run: "Run", history: "Historique", catalog: "Catalogue" } satisfies Partial<Record<View, string>>,
  runLive: "Run en cours",
  themeButton: "Changer de thème",
  themeTitle: (t: Theme) => `Thème : ${{ auto: "auto", light: "clair", dark: "sombre" }[t]}`,
  comingSoon: "Cet écran arrive dans une prochaine version.",

  // Bibliothèque
  libraryEyebrow: (game: string) => `${game} · bibliothèque`,
  libraryTitle: "Mes builds",
  newBuild: "Nouveau build",
  newBuildName: "Nouveau build",
  freeRun: "Run sans build",
  importExport: "Importer / exporter",
  noBuilds: "Aucun build. Créez-en un ou lancez un run sans build.",
  example: "Exemple",
  modeRestricted: "mode restreint",
  modeFree: "mode libre",
  noFae: "Aucune fae choisie",
  coreCount: "essentielles",
  targetCount: "visées",
  runCount: (n: number) => plural(n, "run", "runs"),
  winCount: (n: number) => plural(n, "victoire", "victoires"),
  startRun: "Lancer un run",
  edit: "Modifier",
  duplicate: "Dupliquer",
  remove: "Supprimer",
  cancel: "Annuler",
  copySuffix: " (copie)",
  confirmRemoveBuild: "Supprimer ce build et garder son historique ?",
  confirmReplaceRun: "Un run est en cours. L'abandonner et en lancer un nouveau ?",
  replaceRun: "Abandonner et lancer",
  noHero: "Classe à choisir",
  toastDuplicated: "Build dupliqué",
  toastRemoved: "Build supprimé",

  // Prérequis (HANDOFF §6.3)
  req: {
    prefix: "Prérequis : ",
    none: "Aucun prérequis",
    and: " et ",
    or: " ou ",
    /** Élision devant une voyelle : « d'Oberon », « de Lugh ». */
    of: (name: string) => (/^[aeiouyàâéèêëîïôûüh]/i.test(name) ? `d'${name}` : `de ${name}`),
    trigger: (label: string, except?: string) => `un effet ${label}${except ? ` (hors ${except})` : ""}`,
    slot: (ofFamily: string, slots: string[]) => `une aptitude ${ofFamily} (${slots.join(", ")})`,
    count: (min: number, ofFamily: string) => `${min} bénédictions ${ofFamily} (solo)`,
  },
  otherFamily: "Autre",

  // Création (HANDOFF §6.3)
  editorEyebrow: "Mode Création",
  backToLibrary: "Retour à la bibliothèque",
  start: "Départ",
  buildName: "Nom du build",
  modeGroup: "Mode du build",
  free: "Libre",
  restricted: "Restreint",
  modeHelp: { restricted: "Seules les bénédictions débloquées par vos aptitudes sont proposées.", free: "Toutes les bénédictions sont proposées, sans prérequis." },
  toastMode: { restricted: "Mode restreint", free: "Mode libre" },
  abilitiesTitle: "Aptitudes visées",
  abilitiesHelp: "Une bénédiction par emplacement. Elle fixe aussi les fae du build.",
  slotFree: "— libre —",
  targetsTitle: "Bénédictions visées",
  add: "Ajouter",
  noTargets: "Aucune bénédiction visée. Ajoutez celles qui font tourner le build.",
  prio: { core: "Essentielle", bonus: "Bonus" },
  prioTitle: "Changer la priorité",
  removeItem: (name: string) => `Retirer ${name}`,
  buildFamilies: "Fae du build",
  noBuildFamilies: "Choisissez une aptitude ou une bénédiction.",
  duosTitle: "Duos atteignables",
  noDuos: "Il faut deux fae pour débloquer un duo.",
  aim: "Viser",
  anvilsTitle: "Enclumes · augments de l'arme et du sort",
  anvilsHelp: "Touchez un augment pour le viser. Ils changent avec l'arme et le sort choisis.",
  noAnvils: "Aucun augment connu.",
  notes: "Notes",
  notesHelp: "Ordre de prise, pièges à éviter…",

  // Sélecteur « Ajouter »
  pickerLabel: "Choisir une bénédiction",
  pickerTitleBuild: "Viser une bénédiction",
  close: "Fermer",
  searchPlaceholder: "Taper les premières lettres",
  allFamilies: "Toutes",
  available: (n: number) => `Disponibles · ${n}`,
  locked: (n: number) => `Verrouillées · ${n} (il manque une aptitude)`,
  nothingUnlocked: "Rien de débloqué ici. Choisissez d'abord une aptitude de cette fae.",
  noResult: "Aucun résultat. Ajoutez-la depuis le Catalogue.",
  toastAimed: (name: string) => `${name} visée`,
} as const;
