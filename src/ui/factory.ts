// Fabrique des objets créés par l'interface. Identifiant et date sont passés : les fonctions restent pures.
import type { Build, Pack, Run } from "@rogue/core";
import { strings } from "./strings";

/** Classe, arme et sort par défaut : la première classe du pack, sa première arme, son premier sort. */
function defaultKit(pack: Pack) {
  const hero = pack.loadouts[0];
  return { hero: hero.id, weapon: hero.weapons[0], spell: hero.spells[0] };
}

export function newBuild(pack: Pack, id: string, now: string): Build {
  return {
    id, game: pack.game.id, name: strings.newBuildName, mode: "restricted", ...defaultKit(pack),
    abilities: Object.fromEntries(pack.slots.map((s) => [s.id, null])),
    targets: [], anvils: [], notes: "", updatedAt: now,
  };
}

export function duplicateBuild(build: Build, id: string, now: string): Build {
  const copy: Build = { ...structuredClone(build), id, name: build.name + strings.copySuffix, updatedAt: now };
  delete copy.example;
  return copy;
}

/** Run copié du build (classe, arme, sort), ou run libre avec le kit par défaut. */
export function newRun(pack: Pack, build: Build | null, id: string, now: string): Run {
  const kit = build ? { hero: build.hero, weapon: build.weapon, spell: build.spell } : defaultKit(pack);
  return {
    id, game: pack.game.id, buildId: build?.id ?? null, status: "active", startedAt: now, ...kit,
    picks: [], anvils: [], others: [], result: null,
  };
}

/** Horloge et identifiants de l'interface, remplaçables en test. */
export interface Env {
  now(): string;
  uuid(): string;
}

export const browserEnv: Env = {
  now: () => new Date().toISOString(),
  uuid: () => crypto.randomUUID(),
};
