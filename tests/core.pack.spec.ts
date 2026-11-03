import { describe, expect, it } from "vitest";
import { applyPick, getItem, loadPack, PackFormatError, toggleTarget, withCustom, type Build, type Pack } from "@rogue/core";
import packJson from "../src/games/sworn/pack.json";
import { swornPack } from "../src/games/sworn";

const pack: Pack = loadPack(packJson);
const clone = () => structuredClone(packJson) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

function errorsOf(json: unknown): { path: string; message: string }[] {
  try {
    loadPack(json);
  } catch (e) {
    expect(e).toBeInstanceOf(PackFormatError);
    expect((e as Error).message).toMatch(/Pack de jeu invalide/);
    return (e as PackFormatError).errors;
  }
  throw new Error("PackFormatError attendue");
}
const itemAt = (p: Record<string, any>, id: string) => p.items.findIndex((x: { id: string }) => x.id === id); // eslint-disable-line @typescript-eslint/no-explicit-any

describe("loadPack : schéma", () => {
  it("le pack SWORN du jeu est chargé", () => {
    expect(swornPack.items).toHaveLength(256);
  });

  it("refuse un format inconnu, avec le chemin", () => {
    expect(errorsOf({ ...packJson, format: "autre" }).map((e) => e.path)).toContain("format");
  });

  it("refuse un prérequis de forme inconnue", () => {
    const bad = clone();
    bad.items[0].requires = [[{ famille: "lugh" }]];
    expect(errorsOf(bad).some((e) => e.path.startsWith("items.0.requires.0.0"))).toBe(true);
  });
});

describe("loadPack : références croisées", () => {
  it("signale chaque référence cassée à son chemin", () => {
    const bad = clone();
    const ability = itemAt(bad, "lugh:lucky-touch");
    const clover = itemAt(bad, "lugh:critical-clover");
    bad.items[ability].families = ["inconnue"];
    bad.items[ability].slot = "pied";
    bad.items[ability].provides = ["inconnu"];
    bad.items[clover].requires = [
      [{ trigger: "crit", except: "x:absent" }],
      [{ slot: { family: "inconnue", slots: ["pied"] } }],
      [{ count: { family: "inconnue", min: 5 } }],
    ];
    const paths = errorsOf(bad).map((e) => e.path);
    expect(paths).toEqual(expect.arrayContaining([
      `items.${ability}.families.0`,
      `items.${ability}.slot`,
      `items.${ability}.provides.0`,
      `items.${clover}.requires.0.0.except`,
      `items.${clover}.requires.1.0.slot.family`,
      `items.${clover}.requires.1.0.slot.slots.0`,
      `items.${clover}.requires.2.0.count.family`,
    ]));
  });

  it("refuse une aptitude sans emplacement", () => {
    const bad = clone();
    const i = itemAt(bad, "lugh:lucky-touch");
    delete bad.items[i].slot;
    expect(errorsOf(bad).map((e) => e.path)).toContain(`items.${i}.slot`);
  });

  it("refuse des fae, emplacements et enclumes en double, et une enclume sans arme", () => {
    const bad = clone();
    bad.families.push(bad.families[0]);
    bad.slots.push(bad.slots[0]);
    bad.augments[0].options.push(bad.augments[0].options[0]);
    bad.augments.push({ for: "Arme inconnue", options: [] });
    const errors = errorsOf(bad);
    const paths = errors.map((e) => e.path);
    expect(paths).toContain(`families.${bad.families.length - 1}.id`);
    expect(paths).toContain(`slots.${bad.slots.length - 1}.id`);
    expect(paths).toContain(`augments.0.options.${bad.augments[0].options.length - 1}.id`);
    expect(paths).toContain(`augments.${bad.augments.length - 1}.for`);
    expect(errors.find((e) => e.path.startsWith("families"))?.message).toMatch(/en double/);
  });
});

describe("withCustom", () => {
  const custom = { id: "custom:blood-clot-1a2b", game: "sworn", name: "Blood Clot", family: "badb", slot: "dash", effect: "" };

  it("ajoute le type « custom » une seule fois et garde l'emplacement saisi", () => {
    const p = withCustom(withCustom(pack, [custom]), [custom]);
    expect(p.kinds.filter((k) => k.id === "custom")).toHaveLength(1);
    expect(p.items.filter((i) => i.id === custom.id)).toHaveLength(1);
    expect(getItem(p, custom.id)).toMatchObject({ kind: "custom", families: ["badb"], slot: "dash", requires: [] });
  });

  it("ne modifie pas le pack d'origine", () => {
    withCustom(pack, [custom]);
    expect(pack.items).toHaveLength(256);
  });

  it("une saisie manuelle n'occupe pas d'emplacement d'aptitude", () => {
    const p = withCustom(pack, [custom]);
    const b = { abilities: { dash: null }, targets: [] } as unknown as Build;
    expect(toggleTarget(p, b, custom.id).targets).toEqual([{ id: custom.id, prio: "bonus" }]);
  });
});

describe("getItem", () => {
  it("lève une erreur pour une bénédiction inconnue", () => {
    expect(() => getItem(pack, "x:absent")).toThrow(/inconnue/);
    expect(() => applyPick(pack, { picks: [] } as never, "x:absent", "t")).toThrow();
  });
});
