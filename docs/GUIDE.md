# Guide du joueur

Rogue Planner sert à deux moments : **avant** une partie, pour préparer un build, et **pendant**, pour noter chaque
bénédiction prise et voir où vous en êtes par rapport au plan. Tout reste dans votre navigateur : aucun compte,
aucun serveur.

## 1. La bibliothèque (onglet Builds)

Chaque carte est un build : sa classe, son arme, son sort, ses fae, et le bilan de ses runs.

- **Nouveau build** ouvre la Création.
- **Lancer un run** démarre le suivi en direct avec ce build.
- **Run sans build** suit une partie sans plan.
- **Dupliquer** copie un build pour en tester une variante ; **Supprimer** demande confirmation et garde l'historique.

Au premier lancement, deux builds et un run d'**exemple** sont proposés. Supprimez-les quand vous voulez :
ils ne reviendront pas.

## 2. Préparer un build (Création)

1. **Départ** : nommez le build, choisissez classe, arme et sort.
2. **Libre ou Restreint** :
   - en **Restreint**, l'outil ne propose que les bénédictions que vos aptitudes débloquent ;
   - en **Libre**, tout est proposé, sans prérequis.
3. **Aptitudes visées** : une par emplacement (attaque légère, lourde, sort, esquive, compagnon, ultime).
   Elles fixent les fae du build.
4. **Bénédictions visées** : touchez **Ajouter**, cherchez, choisissez. Chaque ligne montre ses **prérequis** :
   en vert avec ✓ s'ils sont remplis par le build, en orange sinon. Touchez la priorité pour passer de
   **Bonus** à **Essentielle** (celles qui font tourner le build).
5. **Duos atteignables** : les duos que vos fae ouvrent ; **Viser** les ajoute.
6. **Enclumes** : les augments de votre arme et de votre sort ; touchez ceux que vous visez.
7. **Notes** : ordre de prise, pièges à éviter…

## 3. Suivre une partie (onglet Run)

- À chaque bénédiction prise en jeu, touchez **+ Bénédiction**. Celles prévues par le build sont en tête.
  Une bénédiction verrouillée reste choisissable : c'est le jeu qui fait foi.
- Les compteurs montrent les **essentielles** prises, le nombre de **prises** et celles **hors plan**.
- **Aptitudes** : une aptitude prise remplace celle du même emplacement ; « Prévu : … » rappelle le plan.
- **Encore à trouver** liste ce qui manque, essentielles d'abord. **Duos atteignables maintenant** suit vos prises.
- Notez les **enclumes** prises et les **autres choix** (Merlin, Morgane, sanctuaire…).
- **Terminer le run** : victoire ou défaite, jusqu'où vous êtes allé, vos notes. Le run part dans l'historique.
  « Abandonner sans enregistrer » l'efface.

Un seul run est en cours à la fois ; un point rouge le signale sur l'onglet Run. Fermer la page ne le perd pas.

## 4. Historique et catalogue

- **Historique** : tous les runs terminés, filtrables par build, avec le taux de réussite.
- **Catalogue** : toutes les bénédictions du jeu, par fae ou par recherche, avec leurs prérequis.
  Une bénédiction manque (patch récent) ? Ajoutez-la avec le formulaire ; elle devient utilisable partout.

## 5. Sauvegarder et changer d'appareil

**Importer / exporter** (bibliothèque) :

- **Télécharger** enregistre un fichier `rogue-planner-AAAA-MM-JJ.json` ; **Copier** le met dans le presse-papiers.
- **Importer par fusion** lit un fichier ou un texte collé : un élément de même identifiant est remplacé,
  les autres sont ajoutés.

Exportez de temps en temps : vider les données du navigateur efface tout. Si un bandeau indique que le navigateur
refuse le stockage (navigation privée…), exportez avant de fermer la page.

## 6. Hors ligne

`rogue-planner.html` (joint à chaque release) est un fichier unique : enregistrez-le et ouvrez-le directement,
même sans connexion.
