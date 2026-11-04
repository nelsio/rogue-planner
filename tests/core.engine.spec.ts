/**
 * Spécification exécutable du moteur (HANDOFF §4, §9.1). Fournie : ne pas modifier les valeurs attendues.
 * Un désaccord se signale dans HANDOFF §12 (points ouverts), il ne se corrige pas ici.
 * Révision 2 (04/11/2026) : `runProgress().remaining` suit l'ordre d'acquisition et inclut les aptitudes (HANDOFF annexe D).
 */
import { describe, expect, it } from "vitest";
import {
  applyPick, buildOwned, isUnlocked, loadPack, mergeImport, missing, PackFormatError, reachableDuos, runProgress,
  toggleTarget, withCustom, type Build, type Library, type Pack, type Run,
} from "@rogue/core";
import packJson from "../src/games/sworn/pack.json";
import exportPrototype from "./fixtures/export-prototype.json";

const pack: Pack = loadPack(packJson);
const clone = <T>(v: T): T => structuredClone(v);

function build(over: Partial<Build> = {}): Build {
  return {
    id: "b1", game: "sworn", name: "Test", mode: "restricted", hero: "vigilante", weapon: "Chakrams", spell: "Shadow Strike",
    abilities: { light: null, heavy: null, spell: null, dash: null, companion: null, ultimate: null },
    targets: [], anvils: [], notes: "", updatedAt: "2026-11-03T10:00:00.000Z", ...over,
  };
}
function run(over: Partial<Run> = {}): Run {
  return {
    id: "r1", game: "sworn", buildId: null, status: "active", startedAt: "2026-11-03T10:00:00.000Z",
    hero: "vigilante", weapon: "Chakrams", spell: "Shadow Strike", picks: [], anvils: [], others: [], result: null, ...over,
  };
}
const ids = (p: { id: string }[]) => p.map((x) => x.id);

describe("loadPack", () => {
  it("charge le pack SWORN fourni", () => {
    expect(pack.game.id).toBe("sworn");
    expect(pack.families).toHaveLength(8);
    expect(pack.slots.map((s) => s.id)).toEqual(["light", "heavy", "spell", "dash", "companion", "ultimate"]);
    expect(pack.items).toHaveLength(256);
    expect(pack.items.filter((i) => i.kind === "duo")).toHaveLength(28);
  });

  it("refuse un prérequis vers une bénédiction inconnue, avec le chemin fautif", () => {
    const bad = clone(packJson) as typeof packJson;
    const i = bad.items.findIndex((x) => x.id === "lugh:golden-mark");
    bad.items[i].requires = [[{ item: "lugh:n-existe-pas" }]];
    expect(() => loadPack(bad)).toThrow(PackFormatError);
    try { loadPack(bad); } catch (e) {
      expect((e as PackFormatError).errors.some((x) => x.path === `items.${i}.requires.0.0.item`)).toBe(true);
    }
  });

  it("refuse un déclencheur inconnu", () => {
    const bad = clone(packJson) as typeof packJson;
    const i = bad.items.findIndex((x) => x.id === "lugh:critical-clover");
    bad.items[i].requires = [[{ trigger: "inconnu" }]];
    expect(() => loadPack(bad)).toThrow(PackFormatError);
  });

  it("refuse deux bénédictions de même identifiant", () => {
    const bad = clone(packJson) as typeof packJson;
    bad.items.push(clone(bad.items[0]));
    expect(() => loadPack(bad)).toThrow(PackFormatError);
  });
});

describe("prérequis : missing et isUnlocked", () => {
  it("une aptitude est toujours débloquée", () => {
    expect(isUnlocked(pack, "badb:shadow-touch", [])).toBe(true);
  });

  it("une bénédiction sans prérequis est débloquée d'emblée", () => {
    expect(isUnlocked(pack, "badb:fleetfooted", [])).toBe(true);
    expect(missing(pack, "badb:fleetfooted", [])).toEqual([]);
  });

  it("un déclencheur débloque : Critical Clover demande un effet Critique", () => {
    expect(isUnlocked(pack, "lugh:critical-clover", [])).toBe(false);
    expect(isUnlocked(pack, "lugh:critical-clover", ["lugh:lucky-touch"])).toBe(true);
  });

  it("une bénédiction ne se débloque pas elle-même", () => {
    expect(isUnlocked(pack, "lugh:critical-clover", ["lugh:critical-clover"])).toBe(false);
  });

  it("« sauf » : Grievous Wounds n'accepte pas le Saignement de Bloody Shadows", () => {
    expect(isUnlocked(pack, "badb:grievous-wounds", ["badb:shadow-dash", "badb:bloody-shadows"])).toBe(false);
    expect(isUnlocked(pack, "badb:grievous-wounds", ["badb:shadow-touch", "badb:tragic-aura"])).toBe(true);
  });

  it("emplacement : Gambler Mentality demande une aptitude de Lugh hors Ultime", () => {
    expect(isUnlocked(pack, "lugh:gambler-mentality", ["lugh:stroke-of-luck"])).toBe(false);
    expect(isUnlocked(pack, "lugh:gambler-mentality", ["lugh:golden-squirrel"])).toBe(true);
  });

  it("groupes cumulés : Iron Flesh demande Armored Skin et Fully Armored", () => {
    const m = missing(pack, "gogmagog:iron-flesh", ["gogmagog:mighty-touch", "gogmagog:armored-skin"]);
    expect(m).toEqual([[{ item: "gogmagog:fully-armored" }]]);
  });

  it("duo : Critical Opening demande un Choc et une aptitude principale de Lugh", () => {
    expect(missing(pack, "duo:critical-opening", ["gogmagog:mighty-touch"])).toEqual([
      [{ slot: { family: "lugh", slots: ["light", "heavy", "spell", "dash"] } }],
    ]);
    expect(isUnlocked(pack, "duo:critical-opening", ["gogmagog:mighty-touch", "lugh:lucky-dash"])).toBe(true);
  });

  it("Table ronde : 5 bénédictions de la fae, duos non comptés", () => {
    const four = ["lugh:lucky-touch", "lugh:lucky-dash", "lugh:collector", "lugh:greed"];
    expect(isUnlocked(pack, "lugh:treasure-trove", [...four, "duo:critical-opening"])).toBe(false);
    expect(isUnlocked(pack, "lugh:treasure-trove", [...four, "lugh:death-tax"])).toBe(true);
  });

  it("buildOwned réunit les aptitudes et les bénédictions visées", () => {
    const b = build({ abilities: { ...build().abilities, light: "lugh:lucky-touch" }, targets: [{ id: "lugh:collector", prio: "bonus" }] });
    expect([...buildOwned(b)].sort()).toEqual(["lugh:collector", "lugh:lucky-touch"]);
  });
});

describe("reachableDuos", () => {
  it("mode libre : les duos dont les deux fae sont présentes", () => {
    const d = reachableDuos(pack, ["lugh:lucky-touch", "gogmagog:mighty-touch"], { restricted: false });
    expect(d).toContain("duo:critical-opening");
    expect(d).not.toContain("duo:shatter");
  });

  it("mode restreint : seulement ceux dont les prérequis sont remplis", () => {
    const owned = ["lugh:lucky-touch", "beira:chilling-touch"];
    expect(reachableDuos(pack, owned, { restricted: false })).toContain("duo:flash-freeze");
    expect(reachableDuos(pack, owned, { restricted: true })).not.toContain("duo:flash-freeze");
  });

  it("exclut les duos déjà possédés", () => {
    const d = reachableDuos(pack, ["lugh:lucky-touch", "gogmagog:mighty-touch", "duo:critical-opening"], { restricted: false });
    expect(d).not.toContain("duo:critical-opening");
  });
});

describe("toggleTarget", () => {
  it("bénédiction : absente → bonus → essentielle → absente", () => {
    let b = build();
    b = toggleTarget(pack, b, "lugh:collector");
    expect(b.targets).toEqual([{ id: "lugh:collector", prio: "bonus" }]);
    b = toggleTarget(pack, b, "lugh:collector");
    expect(b.targets).toEqual([{ id: "lugh:collector", prio: "core" }]);
    b = toggleTarget(pack, b, "lugh:collector");
    expect(b.targets).toEqual([]);
  });

  it("aptitude : occupe son emplacement, remplace la précédente, se retire au second appel", () => {
    let b = toggleTarget(pack, build(), "lugh:lucky-touch");
    expect(b.abilities.light).toBe("lugh:lucky-touch");
    b = toggleTarget(pack, b, "badb:shadow-touch");
    expect(b.abilities.light).toBe("badb:shadow-touch");
    b = toggleTarget(pack, b, "badb:shadow-touch");
    expect(b.abilities.light).toBeNull();
  });

  it("ne modifie pas le build d'origine", () => {
    const b = build();
    toggleTarget(pack, b, "lugh:collector");
    expect(b.targets).toEqual([]);
  });
});

describe("applyPick", () => {
  it("ajoute la prise avec sa date, sans modifier le run d'origine", () => {
    const r = run();
    const r2 = applyPick(pack, r, "lugh:collector", "2026-11-03T10:05:00.000Z");
    expect(r2.picks).toEqual([{ id: "lugh:collector", at: "2026-11-03T10:05:00.000Z" }]);
    expect(r.picks).toEqual([]);
  });

  it("une aptitude remplace celle du même emplacement", () => {
    let r = applyPick(pack, run(), "lugh:lucky-touch", "t1");
    r = applyPick(pack, r, "lugh:collector", "t2");
    r = applyPick(pack, r, "badb:shadow-touch", "t3");
    expect(ids(r.picks)).toEqual(["lugh:collector", "badb:shadow-touch"]);
  });

  it("une bénédiction déjà prise n'est pas ajoutée deux fois", () => {
    let r = applyPick(pack, run(), "lugh:collector", "t1");
    r = applyPick(pack, r, "lugh:collector", "t2");
    expect(r.picks).toHaveLength(1);
  });
});

describe("runProgress", () => {
  const plan = build({
    abilities: { light: "lugh:lucky-touch", heavy: "gogmagog:mighty-strike", spell: null, dash: "gogmagog:mighty-dash", companion: null, ultimate: null },
    targets: [
      { id: "lugh:collector", prio: "bonus" },
      { id: "lugh:critical-clover", prio: "core" },
      { id: "duo:critical-opening", prio: "core" },
    ],
  });

  it("écart au plan, essentielles, emplacements", () => {
    const r = run({
      buildId: "b1",
      picks: [
        { id: "lugh:lucky-touch", at: "t1" },
        { id: "gogmagog:press-the-attack", at: "t2" },
        { id: "badb:shadow-strike", at: "t3" },
        { id: "lugh:critical-clover", at: "t4" },
      ],
    });
    const p = runProgress(pack, plan, r);
    expect(p.coreTotal).toBe(2);
    expect(p.coreTaken).toBe(1);
    expect(p.taken).toBe(4);
    expect(p.offPlan).toEqual(["gogmagog:press-the-attack", "badb:shadow-strike"]);
    // Révision 2 : ordre d'acquisition (aptitudes par emplacement, puis visées), aptitudes comprises.
    expect(p.remaining).toEqual([
      { id: "gogmagog:mighty-strike", prio: "ability" },
      { id: "gogmagog:mighty-dash", prio: "ability" },
      { id: "lugh:collector", prio: "bonus" },
      { id: "duo:critical-opening", prio: "core" },
    ]);
    expect(p.slots.light).toEqual({ current: "lugh:lucky-touch", planned: "lugh:lucky-touch", mismatch: false });
    expect(p.slots.heavy).toEqual({ current: "badb:shadow-strike", planned: "gogmagog:mighty-strike", mismatch: true });
    expect(p.slots.dash).toEqual({ current: null, planned: "gogmagog:mighty-dash", mismatch: false });
    expect(p.openDuos).toContain("duo:weak-point");
  });

  it("run sans build : pas d'écart au plan", () => {
    const p = runProgress(pack, null, run({ picks: [{ id: "lugh:collector", at: "t1" }] }));
    expect(p).toMatchObject({ coreTotal: 0, coreTaken: 0, taken: 1, offPlan: [], remaining: [] });
    expect(p.slots.light).toEqual({ current: null, planned: null, mismatch: false });
  });
});

describe("withCustom", () => {
  it("ajoute une bénédiction saisie à la main, sans prérequis", () => {
    const p = withCustom(pack, [{ id: "custom:blood-clot-1a2b", game: "sworn", name: "Blood Clot", family: "badb", effect: "Your Bleed stacks don't decay" }]);
    expect(p.items).toHaveLength(257);
    expect(isUnlocked(p, "custom:blood-clot-1a2b", [])).toBe(true);
    expect(applyPick(p, run(), "custom:blood-clot-1a2b", "t1").picks).toHaveLength(1);
  });
});

describe("mergeImport", () => {
  const empty: Library = { builds: [], runs: [], custom: [] };

  it("importe un export du prototype dans une bibliothèque vide", () => {
    const res = mergeImport(empty, exportPrototype);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.added).toBe(3);
    expect(res.replaced).toBe(0);
    expect(res.library.builds.map((b) => b.name)).toEqual(["Critiques et séismes", "Spirale de givre"]);
  });

  it("réimporter remplace les éléments de même identifiant", () => {
    const first = mergeImport(empty, exportPrototype);
    if (!first.ok) throw new Error("import attendu");
    const again = mergeImport(first.library, exportPrototype);
    expect(again.ok && again.added).toBe(0);
    expect(again.ok && again.replaced).toBe(3);
  });

  it("complète les champs absents : mode restreint, enclumes vides, emplacements à null", () => {
    const res = mergeImport(empty, exportPrototype);
    if (!res.ok) throw new Error("import attendu");
    const b2 = res.library.builds.find((b) => b.id === "ex-2")!;
    expect(b2.mode).toBe("restricted");
    expect(b2.anvils).toEqual([]);
    expect(b2.abilities.light).toBeNull();
  });

  it("refuse un fichier d'un autre outil", () => {
    const res = mergeImport(empty, { format: "autre", builds: [] });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.errors[0].message).toMatch(/Rogue Planner/);
  });
});
