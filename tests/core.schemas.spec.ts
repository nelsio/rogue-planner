import { describe, expect, it } from "vitest";
import { BuildSchema, CustomItemSchema, mergeImport, RunSchema, type Library } from "@rogue/core";

const empty: Library = { builds: [], runs: [], custom: [] };
const minimalBuild = { id: "b1", game: "sworn", name: "B", hero: "vigilante", weapon: "Sword", spell: "Shadow Strike", updatedAt: "t" };
const minimalRun = { id: "r1", game: "sworn", status: "active", startedAt: "t", hero: "vigilante", weapon: "Sword", spell: "Shadow Strike" };

describe("BuildSchema", () => {
  it("complète les valeurs par défaut", () => {
    expect(BuildSchema.parse(minimalBuild)).toEqual({
      ...minimalBuild, mode: "restricted", abilities: {}, targets: [], anvils: [], notes: "",
    });
  });

  it("convertit les emplacements vides du prototype en null", () => {
    const b = BuildSchema.parse({ ...minimalBuild, abilities: { light: "", heavy: null, dash: "lugh:lucky-dash" } });
    expect(b.abilities).toEqual({ light: null, heavy: null, dash: "lugh:lucky-dash" });
  });

  it("refuse une priorité inconnue, avec le chemin fautif", () => {
    const res = BuildSchema.safeParse({ ...minimalBuild, targets: [{ id: "x", prio: "urgente" }] });
    expect(res.success).toBe(false);
    expect(res.error?.issues[0].path).toEqual(["targets", 0, "prio"]);
  });
});

describe("RunSchema", () => {
  it("complète les valeurs par défaut", () => {
    expect(RunSchema.parse(minimalRun)).toEqual({
      ...minimalRun, buildId: null, picks: [], anvils: [], others: [], result: null,
    });
  });

  it("complète le résultat", () => {
    expect(RunSchema.parse({ ...minimalRun, result: { outcome: "win" } }).result).toEqual({ outcome: "win", reached: "", notes: "" });
  });

  it("refuse un statut inconnu", () => {
    expect(RunSchema.safeParse({ ...minimalRun, status: "pause" }).success).toBe(false);
  });
});

describe("CustomItemSchema", () => {
  it("accepte une saisie sans effet ni emplacement", () => {
    expect(CustomItemSchema.parse({ id: "custom:x-1a2b", game: "sworn", name: "X", family: "badb" }).effect).toBe("");
  });

  it("refuse un nom vide", () => {
    expect(CustomItemSchema.safeParse({ id: "custom:x", game: "sworn", name: "", family: "badb" }).success).toBe(false);
  });
});

describe("mergeImport : cas limites", () => {
  it("refuse ce qui n'est pas un objet", () => {
    for (const json of [null, "texte", [1]]) {
      const res = mergeImport(empty, json);
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.errors[0]).toMatchObject({ path: "format", message: expect.stringMatching(/absent/) });
    }
  });

  it("refuse une version inconnue", () => {
    const res = mergeImport(empty, { format: "rogue-planner", version: 2 });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.errors[0].path).toBe("version");
  });

  it("accepte le format du prototype et une enveloppe sans listes", () => {
    expect(mergeImport(empty, { format: "carnet-runs" })).toEqual({ ok: true, library: empty, added: 0, replaced: 0 });
  });

  it("prend le jeu de l'enveloppe quand un objet ne le précise pas", () => {
    const noGame: Partial<typeof minimalBuild> = { ...minimalBuild };
    delete noGame.game;
    const res = mergeImport(empty, { format: "rogue-planner", game: "sworn", builds: [noGame] });
    expect(res.ok && res.library.builds[0].game).toBe("sworn");
  });

  it("signale chaque objet invalide par son chemin, sans rien importer", () => {
    const res = mergeImport(empty, {
      format: "rogue-planner",
      builds: [minimalBuild, { ...minimalBuild, hero: "" }],
      runs: [{ ...minimalRun, status: "pause" }],
      custom: [{ id: "custom:x" }],
    });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    const paths = res.errors.map((e) => e.path);
    expect(paths).toContain("builds.1.hero");
    expect(paths).toContain("runs.0.status");
    expect(paths).toContain("custom.0.name");
  });

  it("importe des runs et des bénédictions ajoutées", () => {
    const custom = { id: "custom:x-1a2b", game: "sworn", name: "X", family: "badb", effect: "" };
    const res = mergeImport(empty, { format: "rogue-planner", runs: [minimalRun], custom: [custom] });
    expect(res.ok && res.added).toBe(2);
  });
});
