// Libellés de prérequis (HANDOFF §6.3, §9.2 « core.labels »). Ils vivent dans src/ui/labels.ts : ce sont des
// textes affichés, qui passent par strings.ts.
import { describe, expect, it } from "vitest";
import { getItem, withCustom } from "@rogue/core";
import { swornPack as pack } from "../../src/games/sworn";
import { requirementsLabel, typeLine } from "../../src/ui/labels";
import { strings } from "../../src/ui/strings";

const label = (id: string) => requirementsLabel(pack, getItem(pack, id));

describe("libellés de prérequis", () => {
  it("aucun prérequis", () => {
    expect(label("badb:fleetfooted")).toBe("Aucun prérequis");
  });

  it("déclencheur : « un effet Critique »", () => {
    expect(label("lugh:critical-clover")).toBe("Prérequis : un effet Critique");
  });

  it("forme « hors X » avec le nom de la bénédiction exclue", () => {
    expect(label("badb:grievous-wounds")).toBe("Prérequis : un effet Saignement (hors Bloody Shadows)");
  });

  it("emplacements en libellés courts", () => {
    expect(label("duo:critical-opening")).toBe("Prérequis : un effet Choc et une aptitude de Lugh (légère, lourde, sort, esquive)");
  });

  it("élision devant une voyelle : « d'Oberon »", () => {
    expect(label("oberon:typhoon")).toBe("Prérequis : une aptitude d'Oberon (esquive, compagnon)");
    expect(label("oberon:go-with-the-flow")).toBe("Prérequis : 5 bénédictions d'Oberon (solo)");
  });

  it("Table ronde : « 5 bénédictions de Lugh (solo) »", () => {
    expect(label("lugh:treasure-trove")).toBe("Prérequis : 5 bénédictions de Lugh (solo)");
  });

  it("alternatives jointes par « ou », groupes par « et »", () => {
    expect(label("gogmagog:opportunistic")).toBe("Prérequis : Relentless ou Unmatched Power");
    expect(label("duo:nova-surge")).toMatch(/^Prérequis : un effet .+ et une aptitude d'Oberon \(/);
  });

  it("élision : voyelles accentuées et h muet, pas les consonnes", () => {
    expect(strings.req.of("Écho")).toBe("d'Écho");
    expect(strings.req.of("Hécate")).toBe("d'Hécate");
    expect(strings.req.of("Badb")).toBe("de Badb");
  });

  it("emplacement sans libellé court : le libellé en minuscules", () => {
    const p = { ...pack, slots: pack.slots.map((s) => ({ id: s.id, label: s.label })) };
    expect(requirementsLabel(p, getItem(p, "oberon:typhoon"))).toBe("Prérequis : une aptitude d'Oberon (esquive, compagnon)");
  });
});

describe("ligne de type", () => {
  it("aptitude : type, emplacement, fae", () => {
    expect(typeLine(pack, getItem(pack, "lugh:lucky-touch"))).toBe("Aptitude · Attaque légère · Lugh");
  });

  it("duo : fae jointes par « + »", () => {
    expect(typeLine(pack, getItem(pack, "duo:critical-opening"))).toBe("Duo · Gogmagog + Lugh");
  });

  it("ajout manuel : « Ajoutée »", () => {
    const p = withCustom(pack, [{ id: "custom:x", game: "sworn", name: "X", family: "badb", effect: "" }]);
    expect(typeLine(p, getItem(p, "custom:x"))).toBe("Ajoutée · Badb");
  });
});
