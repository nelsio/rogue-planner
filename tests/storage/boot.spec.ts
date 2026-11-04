import { IDBFactory } from "fake-indexeddb";
import { afterEach, describe, expect, it, vi } from "vitest";
import exportPrototype from "../fixtures/export-prototype-v2.json";
import { swornExamples } from "../../src/games/sworn";
import { loadExamples, memoryStorage, openStorage, requestPersistence, type Storage } from "../../src/storage";

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});
const quiet = () => vi.spyOn(console, "warn").mockImplementation(() => undefined);

describe("openStorage", () => {
  it("ouvre IndexedDB quand il est disponible", async () => {
    expect((await openStorage({ factory: new IDBFactory() })).kind).toBe("indexeddb");
  });

  it("utilise l'IndexedDB du navigateur par défaut", async () => {
    vi.stubGlobal("indexedDB", new IDBFactory());
    expect((await openStorage()).kind).toBe("indexeddb");
    vi.unstubAllGlobals();
  });

  it("se replie en mémoire sans IndexedDB", async () => {
    expect((await openStorage({ factory: null })).kind).toBe("memory");
  });

  it("se replie en mémoire si l'ouverture échoue", async () => {
    const warn = quiet();
    const factory = { open: () => { throw new DOMException("refusé", "SecurityError"); } } as unknown as IDBFactory;
    expect((await openStorage({ factory })).kind).toBe("memory");
    expect(warn).toHaveBeenCalled();
  });

  it("se replie en mémoire après 3 s sans réponse, et referme la base ouverte trop tard", async () => {
    vi.useFakeTimers();
    const warn = quiet();
    const request = {} as { result?: unknown; onsuccess?: () => void };
    const factory = { open: () => request } as unknown as IDBFactory;
    const pending = openStorage({ factory });
    await vi.advanceTimersByTimeAsync(2999);
    let settled = false;
    void pending.then(() => (settled = true));
    await vi.advanceTimersByTimeAsync(0);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect((await pending).kind).toBe("memory");
    expect(warn).toHaveBeenCalledWith(expect.stringMatching(/ne répond pas/));

    // La base finit par répondre : elle est refermée.
    const close = vi.fn();
    request.result = { close };
    request.onsuccess!();
    await vi.runAllTimersAsync();
    expect(close).toHaveBeenCalledOnce();
  });

  it("se replie en mémoire si la base renvoie une erreur", async () => {
    const warn = quiet();
    const request = { error: new DOMException("quota", "QuotaExceededError") } as { error: DOMException; onerror?: () => void };
    const factory = { open: () => (queueMicrotask(() => request.onerror!()), request) } as unknown as IDBFactory;
    expect((await openStorage({ factory })).kind).toBe("memory");
    expect(warn).toHaveBeenCalledWith(expect.stringMatching(/indisponible/), request.error);
  });
});

describe("requestPersistence", () => {
  const indexed = async () => openStorage({ factory: new IDBFactory() });

  it("demande la persistance une seule fois", async () => {
    const storage = await indexed();
    const persist = vi.fn().mockResolvedValue(true);
    const manager = { persist } as unknown as StorageManager;
    await requestPersistence(storage, manager);
    await requestPersistence(storage, manager);
    expect(persist).toHaveBeenCalledOnce();
    expect((await storage.prefs.get()).persistRequested).toBe(true);
  });

  it("un refus est silencieux et n'est pas redemandé", async () => {
    const storage = await indexed();
    const persist = vi.fn().mockRejectedValue(new Error("non"));
    await requestPersistence(storage, { persist } as unknown as StorageManager);
    await requestPersistence(storage, { persist } as unknown as StorageManager);
    expect(persist).toHaveBeenCalledOnce();
  });

  it("sans API de persistance, la demande est notée comme faite", async () => {
    const storage = await indexed();
    await requestPersistence(storage, undefined);
    expect((await storage.prefs.get()).persistRequested).toBe(true);
  });

  it("ne demande rien en repli mémoire", async () => {
    const persist = vi.fn();
    await requestPersistence(memoryStorage(), { persist } as unknown as StorageManager);
    expect(persist).not.toHaveBeenCalled();
  });
});

describe("loadExamples", () => {
  it("les exemples SWORN sont ceux du prototype (révision 2, sans le run actif)", () => {
    expect(swornExamples).toEqual({ ...exportPrototype, runs: exportPrototype.runs.filter((r) => r.id !== "ex-r2") });
  });

  it("charge deux builds et un run d'exemple au premier lancement", async () => {
    const storage = memoryStorage();
    expect(await loadExamples(storage, swornExamples)).toBe(true);
    const builds = await storage.library.listBuilds();
    expect(builds.map((b) => b.name)).toEqual(["Critiques et séismes", "Spirale de givre"]);
    expect(builds.every((b) => b.example)).toBe(true);
    const runs = await storage.library.listRuns();
    expect(runs).toHaveLength(1);
    expect(runs[0]).toMatchObject({ example: true, game: "sworn", anvils: [] });
  });

  it("ne recharge pas les exemples une fois la bibliothèque vidée", async () => {
    const storage = memoryStorage();
    await loadExamples(storage, swornExamples);
    for (const b of await storage.library.listBuilds()) await storage.library.removeBuild(b.id);
    for (const r of await storage.library.listRuns()) await storage.library.removeRun(r.id);
    expect(await loadExamples(storage, swornExamples)).toBe(false);
    expect(await storage.library.listBuilds()).toEqual([]);
  });

  it("ne touche pas une bibliothèque déjà remplie (données d'avant les exemples)", async () => {
    const storage: Storage = memoryStorage();
    await storage.library.putBuild({
      id: "mien", game: "sworn", name: "Mien", mode: "free", hero: "vigilante", weapon: "Sword", spell: "Shadow Strike",
      abilities: {}, targets: [], anvils: [], notes: "", updatedAt: "t",
    });
    expect(await loadExamples(storage, swornExamples)).toBe(false);
    expect((await storage.library.listBuilds()).map((b) => b.id)).toEqual(["mien"]);
    expect((await storage.prefs.get()).examplesLoaded).toBe(true);
  });

  it("refuse des exemples invalides", async () => {
    await expect(loadExamples(memoryStorage(), { format: "autre" })).rejects.toThrow(/Exemples invalides/);
  });
});
