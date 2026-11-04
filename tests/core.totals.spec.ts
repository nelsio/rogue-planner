// Totaux par fae d'un plan (HANDOFF §4.7), partagés par la bibliothèque, la Création et le RUN.
import { describe, expect, it } from "vitest";
import { familyProgress, loadPack, withCustom } from "@rogue/core";
import packJson from "../src/games/sworn/pack.json";

const pack = loadPack(packJson);

describe("familyProgress", () => {
  it("trie par nombre prévu décroissant, puis dans l'ordre des fae du pack", () => {
    const plan = ["lugh:lucky-touch", "beira:chilling-dash", "beira:mana-well", "gogmagog:mighty-dash", "duo:critical-opening"];
    expect(familyProgress(pack, plan)).toEqual({
      families: [
        { family: "beira", planned: 2, taken: 0 },
        { family: "gogmagog", planned: 1, taken: 0 },
        { family: "lugh", planned: 1, taken: 0 },
      ],
      duos: { planned: 1, taken: 0 },
    });
  });

  it("une fae hors pack (ajout manuel « Autre ») vient en dernier", () => {
    const p = withCustom(pack, [{ id: "custom:x-1a2b", game: "sworn", name: "X", family: "other", effect: "" }]);
    const families = familyProgress(p, ["custom:x-1a2b", "titania:burning-touch"]).families.map((f) => f.family);
    expect(families).toEqual(["titania", "other"]);
  });

  it("compte les prises, hors plan comprises ; les duos pris seulement s'ils sont prévus", () => {
    const res = familyProgress(pack, ["lugh:lucky-touch", "duo:critical-opening"], ["lugh:greed", "duo:flash-freeze"]);
    expect(res).toEqual({ families: [{ family: "lugh", planned: 1, taken: 1 }], duos: { planned: 1, taken: 0 } });
  });
});
