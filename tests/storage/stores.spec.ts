import { IDBFactory } from "fake-indexeddb";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Build, CustomItem, Run } from "@rogue/core";
import { indexedDbStorage, memoryStorage, openDatabase, type Storage } from "../../src/storage";

const build = (id: string, over: Partial<Build> = {}): Build => ({
  id, game: "sworn", name: id, mode: "restricted", hero: "vigilante", weapon: "Chakrams", spell: "Shadow Strike",
  abilities: { light: "lugh:lucky-touch", heavy: null }, targets: [{ id: "lugh:collector", prio: "core" }],
  anvils: [], notes: "", updatedAt: "2026-11-03T10:00:00.000Z", ...over,
});
const run = (id: string): Run => ({
  id, game: "sworn", buildId: null, status: "active", startedAt: "t", hero: "vigilante", weapon: "Chakrams",
  spell: "Shadow Strike", picks: [{ id: "lugh:collector", at: "t" }], anvils: [], others: [], result: null,
});
const custom = (id: string): CustomItem => ({ id, game: "sworn", name: "Blood Clot", family: "badb", effect: "" });
const sortById = <T extends { id: string }>(l: T[]) => [...l].sort((a, b) => a.id.localeCompare(b.id));

const implementations: [string, () => Promise<Storage>][] = [
  ["mémoire", async () => memoryStorage()],
  ["IndexedDB", async () => indexedDbStorage(await openDatabase(new IDBFactory()))],
];

afterEach(() => vi.restoreAllMocks());

describe.each(implementations)("stockage %s", (_name, open) => {
  it("enregistre, remplace et supprime builds, runs et bénédictions ajoutées", async () => {
    const { library } = await open();
    await library.putBuild(build("b1"));
    await library.putBuild(build("b2"));
    await library.putBuild(build("b1", { name: "renommé" }));
    await library.putRun(run("r1"));
    await library.putCustom(custom("custom:x"));
    expect(sortById(await library.listBuilds()).map((b) => b.name)).toEqual(["renommé", "b2"]);
    expect(await library.listRuns()).toEqual([run("r1")]);
    expect(await library.listCustom()).toEqual([custom("custom:x")]);

    await library.removeBuild("b1");
    await library.removeRun("r1");
    await library.removeCustom("custom:x");
    expect((await library.listBuilds()).map((b) => b.id)).toEqual(["b2"]);
    expect(await library.listRuns()).toEqual([]);
    expect(await library.listCustom()).toEqual([]);
  });

  it("ne partage pas les objets avec l'appelant", async () => {
    const { library } = await open();
    const b = build("b1");
    await library.putBuild(b);
    b.name = "modifié après coup";
    const [read] = await library.listBuilds();
    read.targets.push({ id: "x", prio: "bonus" });
    expect((await library.listBuilds())[0]).toEqual(build("b1"));
  });

  it("ignore et signale un objet invalide à la lecture", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { library } = await open();
    await library.putBuild(build("ok"));
    await library.putBuild({ id: "cassé" } as Build);
    await library.putRun({ id: "cassé" } as Run);
    await library.putCustom({ id: "cassé" } as CustomItem);
    expect((await library.listBuilds()).map((b) => b.id)).toEqual(["ok"]);
    expect(await library.listRuns()).toEqual([]);
    expect(await library.listCustom()).toEqual([]);
    expect(warn).toHaveBeenCalledTimes(3);
  });

  it("préférences : fusion, suppression d'une clé à undefined", async () => {
    const { prefs } = await open();
    expect(await prefs.get()).toEqual({});
    await prefs.set({ theme: "dark", lastView: "run" });
    await prefs.set({ codexFamily: "lugh", lastView: undefined });
    expect(await prefs.get()).toEqual({ theme: "dark", codexFamily: "lugh" });
  });

  it("préférences : une valeur invalide ou inconnue est ignorée", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { prefs } = await open();
    await prefs.set({ theme: "violet", inconnue: 1, lastBuildId: "b1" } as never);
    expect(await prefs.get()).toEqual({ lastBuildId: "b1" });
    expect(warn).toHaveBeenCalledOnce();
  });
});

describe("IndexedDB", () => {
  it("les données survivent à la réouverture de la base", async () => {
    const factory = new IDBFactory();
    const first = indexedDbStorage(await openDatabase(factory));
    await first.library.putBuild(build("b1"));
    await first.prefs.set({ theme: "light" });
    const again = indexedDbStorage(await openDatabase(factory));
    expect((await again.library.listBuilds()).map((b) => b.id)).toEqual(["b1"]);
    expect(await again.prefs.get()).toEqual({ theme: "light" });
  });
});
