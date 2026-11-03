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
} as const;
