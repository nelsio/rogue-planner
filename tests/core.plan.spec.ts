/**
 * Spécification exécutable — révision 2 (HANDOFF §4.6 à §4.8, annexe D) : ordre d'acquisition, pas à pas,
 * totaux par fae, potions. Fournie : ne pas modifier les valeurs attendues.
 */
import { describe, expect, it } from "vitest";
import {
  applyPick, applyPotion, buildPotions, familyTotals, loadPack, mergeImport, moveInOrder, nextStep, planOrder,
  runProgress, skipStep, undoPotion, unskipStep, withCustom, type Build, type Library, type Pack, type Run,
} from "@rogue/core";
import packJson from "../src/games/sworn/pack.json";
import exportV1 from "./fixtures/export-prototype.json";
import exportV2 from "./fixtures/export-prototype-v2.json";

const pack: Pack = loadPack(packJson);
const empty: Library = { builds: [], runs: [], custom: [] };

function build(over: Partial<Build> = {}): Build {
  return {
    id: "b1", game: "sworn", name: "Test", mode: "free", hero: "vigilante", weapon: "Chakrams", spell: "Shadow Strike",
    abilities: { light: "lugh:lucky-touch", heavy: null, spell: null, dash: "gogmagog:mighty-dash", companion: null, ultimate: null },
    targets: [{ id: "lugh:collector", prio: "bonus" }, { id: "lugh:critical-clover", prio: "core" }],
    anvils: [], notes: "", updatedAt: "2026-11-04T10:00:00.000Z", ...over,
  };
}
function run(over: Partial<Run> = {}): Run {
  return {
    id: "r1", game: "sworn", buildId: "b1", status: "active", startedAt: "2026-11-04T10:00:00.000Z",
    hero: "vigilante", weapon: "Chakrams", spell: "Shadow Strike", picks: [], anvils: [], others: [], result: null, ...over,
  };
}
function imported() {
  const res = mergeImport(empty, exportV2);
  if (!res.ok) throw new Error("import attendu");
  return res.library;
}

describe("pack, révision 2", () => {
  it("déclare 4 potions par run, une par fae", () => {
    expect(pack.potions).toEqual({ perRun: 4, from: "families" });
  });

  it("les effets sont le texte anglais du jeu", () => {
    expect(pack.byId.get("lugh:lucky-touch")?.effect).toBe("Your Light Attack is stronger and can Critical Hit.");
    expect(pack.byId.get("duo:critical-opening")?.effect).toBe("Increase your Critical Hit chance against Stunned enemies.");
  });
});

describe("planOrder et moveInOrder", () => {
  it("par défaut : aptitudes dans l'ordre des emplacements, puis bénédictions visées", () => {
    expect(planOrder(pack, build())).toEqual(["lugh:lucky-touch", "gogmagog:mighty-dash", "lugh:collector", "lugh:critical-clover"]);
  });

  it("garde l'ordre choisi, retire ce qui a quitté le plan, ajoute à la fin ce qui est nouveau", () => {
    const b = build({ order: ["lugh:critical-clover", "badb:nimble", "lugh:lucky-touch"] });
    expect(planOrder(pack, b)).toEqual(["lugh:critical-clover", "lugh:lucky-touch", "gogmagog:mighty-dash", "lugh:collector"]);
  });

  it("déplace un élément sans modifier le build d'origine", () => {
    const b = build();
    const b2 = moveInOrder(pack, b, 3, 0);
    expect(planOrder(pack, b2)).toEqual(["lugh:critical-clover", "lugh:lucky-touch", "gogmagog:mighty-dash", "lugh:collector"]);
    expect(b.order).toBeUndefined();
  });

  it("un déplacement hors bornes ne change rien", () => {
    const b = build();
    expect(moveInOrder(pack, b, 0, -1)).toBe(b);
    expect(moveInOrder(pack, b, 3, 4)).toBe(b);
  });
});

describe("pas à pas : nextStep, skipStep, unskipStep", () => {
  it("la prochaine étape est la première ni prise ni passée", () => {
    const b = build();
    expect(nextStep(pack, b, run())).toEqual({ index: 0, id: "lugh:lucky-touch" });
    const r = applyPick(pack, run(), "lugh:lucky-touch", "t1");
    expect(nextStep(pack, b, r)).toEqual({ index: 1, id: "gogmagog:mighty-dash" });
    expect(nextStep(pack, b, skipStep(r, "gogmagog:mighty-dash"))).toEqual({ index: 2, id: "lugh:collector" });
  });

  it("prendre une étape passée la retire des passées", () => {
    const r = applyPick(pack, skipStep(run(), "lugh:collector"), "lugh:collector", "t1");
    expect(r.skipped).toEqual([]);
  });

  it("reprendre une étape, ou toutes", () => {
    const r = skipStep(skipStep(run(), "lugh:collector"), "lugh:critical-clover");
    expect(unskipStep(r, "lugh:collector").skipped).toEqual(["lugh:critical-clover"]);
    expect(unskipStep(r).skipped).toEqual([]);
  });

  it("plus d'étape quand tout est pris ou passé", () => {
    let r = run();
    for (const id of ["lugh:lucky-touch", "gogmagog:mighty-dash", "lugh:collector"]) r = applyPick(pack, r, id, "t");
    expect(nextStep(pack, build(), skipStep(r, "lugh:critical-clover"))).toBeNull();
  });
});

describe("familyTotals", () => {
  it("compte une bénédiction par fae ; les duos à part ; les inconnues ignorées", () => {
    const t = familyTotals(pack, ["lugh:lucky-touch", "lugh:treasure-trove", "gogmagog:mighty-dash", "duo:critical-opening", "inconnue"]);
    expect(t).toEqual({ families: { lugh: 2, gogmagog: 1 }, duos: ["duo:critical-opening"] });
  });

  it("une bénédiction ajoutée à la main compte pour sa fae", () => {
    const p = withCustom(pack, [{ id: "custom:x-1a2b", game: "sworn", name: "X", family: "badb", effect: "?" }]);
    expect(familyTotals(p, ["custom:x-1a2b"]).families).toEqual({ badb: 1 });
  });
});

describe("potions", () => {
  it("buildPotions complète à 4 emplacements, vides à null", () => {
    expect(buildPotions(pack, build({ potions: ["lugh"] }))).toEqual(["lugh", null, null, null]);
    expect(buildPotions(pack, build())).toEqual([null, null, null, null]);
  });

  it("applyPotion ajoute dans l'ordre, refuse une 5e potion et une fae inconnue, sans modifier le run", () => {
    const r = run();
    let r2 = applyPotion(pack, r, "lugh");
    expect(r2.potions).toEqual(["lugh"]);
    expect(r.potions).toBeUndefined();
    expect(applyPotion(pack, r2, "inconnue")).toBe(r2);
    for (const f of ["lugh", "beira", "mab"]) r2 = applyPotion(pack, r2, f);
    expect(r2.potions).toEqual(["lugh", "lugh", "beira", "mab"]);
    expect(applyPotion(pack, r2, "badb")).toBe(r2);
  });

  it("undoPotion retire la dernière", () => {
    expect(undoPotion(run({ potions: ["lugh", "mab"] })).potions).toEqual(["lugh"]);
    expect(undoPotion(run()).potions).toEqual([]);
  });
});

describe("runProgress, révision 2", () => {
  it("export du prototype : prochaine étape, totaux par fae, duos, potions", () => {
    const lib = imported();
    const b = lib.builds.find((x) => x.id === "ex-1")!;
    const r = lib.runs.find((x) => x.id === "ex-r2")!;
    const p = runProgress(pack, b, r);
    expect(p.next).toEqual({ index: 2, id: "lugh:critical-clover" });
    expect(p.families).toEqual([
      { family: "gogmagog", planned: 5, taken: 0 },
      { family: "lugh", planned: 5, taken: 1 },
    ]);
    expect(p.duos).toEqual({ planned: 1, taken: 0 });
    expect(p.potions).toEqual([
      { index: 0, planned: "lugh", taken: "lugh" },
      { index: 1, planned: "gogmagog", taken: null },
      { index: 2, planned: "lugh", taken: null },
      { index: 3, planned: "gogmagog", taken: null },
    ]);
    expect(p.remaining[0]).toEqual({ id: "gogmagog:mighty-dash", prio: "ability" });
  });

  it("le total « pris » d'une fae compte aussi les prises hors plan", () => {
    const r = run({ picks: [{ id: "lugh:greed", at: "t1" }] });
    expect(runProgress(pack, build(), r).families.find((f) => f.family === "lugh")).toEqual({ family: "lugh", planned: 3, taken: 1 });
  });

  it("run sans build : ni étape, ni totaux prévus, potions sans plan", () => {
    const p = runProgress(pack, null, run({ buildId: null, potions: ["mab"] }));
    expect(p.next).toBeNull();
    expect(p.families).toEqual([]);
    expect(p.potions[0]).toEqual({ index: 0, planned: null, taken: "mab" });
  });
});

describe("mergeImport, révision 2", () => {
  it("conserve l'ordre, les potions prévues, les potions prises et les étapes passées", () => {
    const lib = imported();
    const b1 = lib.builds.find((x) => x.id === "ex-1")!;
    expect(b1.order?.slice(0, 3)).toEqual(["lugh:lucky-touch", "gogmagog:mighty-dash", "lugh:critical-clover"]);
    expect(b1.potions).toEqual(["lugh", "gogmagog", "lugh", "gogmagog"]);
    expect(lib.builds.find((x) => x.id === "ex-2")!.potions).toEqual(["beira", "beira", "oberon", null]);
    const r = lib.runs.find((x) => x.id === "ex-r2")!;
    expect(r.potions).toEqual(["lugh"]);
    expect(r.skipped).toEqual(["gogmagog:mighty-dash"]);
  });

  it("un export sans ces champs reçoit des listes vides", () => {
    const res = mergeImport(empty, exportV1);
    if (!res.ok) throw new Error("import attendu");
    expect(res.library.builds[0].order).toEqual([]);
    expect(res.library.builds[0].potions).toEqual([]);
    expect(res.library.runs[0].potions).toEqual([]);
    expect(res.library.runs[0].skipped).toEqual([]);
  });
});
