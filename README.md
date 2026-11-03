# Rogue Planner

Planner de builds pour jeux rogue-like, sur ordinateur et sur mobile. Premier jeu : **SWORN**.

Préparez vos builds (bénédictions visées, aptitudes, enclumes), puis suivez votre partie en direct :
l'outil montre l'écart au plan, ce qui reste à trouver et les duos qui s'ouvrent.

**Utiliser** : <https://nelsio.github.io/rogue-planner/>, ou téléchargez `rogue-planner.html` depuis la
dernière release : un seul fichier, qui marche hors ligne. Vos données restent dans votre navigateur.

> En construction (v0.0.1 : squelette). Plan de livraison dans [HANDOFF.md](HANDOFF.md) §10.

## Développer

```sh
npm install
npm run dev        # serveur de développement
npm test           # tests Vitest
npm run e2e        # scénarios Playwright (npx playwright install au premier lancement)
npm run build      # produit dist/rogue-planner.html
```

## Licences

Code sous licence MIT. Données SWORN tirées du SWORN Wiki (Fandom), sous CC BY-SA 3.0.
Polices sous licence OFL ([docs/licenses](docs/licenses)). Détails dans [docs/CREDITS.md](docs/CREDITS.md).

Projet de fan non affilié. SWORN est une marque de ses éditeurs (Team17, Windwalk Games).
