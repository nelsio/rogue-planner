import { screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { swornExamples, swornPack } from "../../src/games/sworn";
import { indexedDbStorage, memoryStorage, openDatabase } from "../../src/storage";
import { boot } from "../../src/ui/boot";
import { faeCss, injectFaeColors } from "../../src/ui/theme";
import { flush, renderApp } from "./helpers";
import { IDBFactory } from "fake-indexeddb";

afterEach(() => document.documentElement.removeAttribute("data-theme"));

describe("coquille", () => {
  it("affiche le nom, le jeu SWORN et les quatre onglets", async () => {
    await renderApp();
    expect(screen.getByRole("heading", { name: "Rogue Planner" })).toBeInTheDocument();
    const game = screen.getByRole("combobox", { name: "Jeu" });
    expect(within(game).getByRole("option", { name: "SWORN" })).toBeInTheDocument();
    expect(within(game).getByRole("option", { name: "Autres jeux : bientôt" })).toBeDisabled();
    const tabs = within(screen.getByRole("navigation")).getAllByRole("button").map((b) => b.textContent);
    expect(tabs).toEqual(["Builds", "Run", "Historique", "Catalogue"]);
    expect(screen.getByRole("button", { name: "Builds" })).toHaveAttribute("aria-current", "page");
  });

  it("change d'onglet et le retient dans les préférences", async () => {
    const { user, storage } = await renderApp();
    await user.click(screen.getByRole("button", { name: "Historique" }));
    expect(screen.getByRole("button", { name: "Historique" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByText(/prochaine version/)).toBeInTheDocument();
    await flush();
    expect((await storage.prefs.get()).lastView).toBe("history");
  });

  it("thème : auto → clair → sombre → auto, appliqué et enregistré", async () => {
    const { user, storage } = await renderApp();
    const btn = screen.getByRole("button", { name: "Changer de thème" });
    expect(btn).toHaveAttribute("title", "Thème : auto");
    await user.click(btn);
    expect(document.documentElement).toHaveAttribute("data-theme", "light");
    expect(btn).toHaveAttribute("title", "Thème : clair");
    await user.click(btn);
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    await flush();
    expect((await storage.prefs.get()).theme).toBe("dark");
    await user.click(btn);
    expect(document.documentElement).not.toHaveAttribute("data-theme");
  });

  it("reprend le thème et l'onglet enregistrés", async () => {
    const storage = memoryStorage();
    await storage.prefs.set({ theme: "dark", lastView: "catalog", examplesLoaded: true });
    await renderApp({ storage });
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    expect(screen.getByRole("button", { name: "Catalogue" })).toHaveAttribute("aria-current", "page");
  });

  it("affiche le bandeau en repli mémoire, pas avec IndexedDB", async () => {
    const { unmount } = await renderApp();
    expect(screen.getByText(/refuse le stockage/)).toHaveAttribute("role", "status");
    unmount();
    await renderApp({ storage: indexedDbStorage(await openDatabase(new IDBFactory())) });
    expect(screen.queryByText(/refuse le stockage/)).not.toBeInTheDocument();
  });
});

describe("couleurs de fae", () => {
  it("génère les variables claires et sombres et les règles de chaque fae", () => {
    const css = faeCss(swornPack);
    expect(css).toContain("--f-lugh:#ecc95a;");
    expect(css).toContain(':root[data-theme="light"]{');
    expect(css).toContain("--f-lugh:#856700;");
    expect(css).toContain('.fae[data-fae="oberon"]{--c:var(--f-oberon)}');
    expect(css).toMatch(/--sigil:conic-gradient\(var\(--f-badb\),.*var\(--f-badb\)\)/);
  });

  it("injecte une seule feuille de style", () => {
    injectFaeColors(swornPack);
    injectFaeColors(swornPack);
    expect(document.querySelectorAll("style#fae-colors")).toHaveLength(1);
  });
});

describe("boot", () => {
  it("premier lancement : exemples chargés, vue Builds", async () => {
    const { storage, initial } = await boot(swornExamples, { factory: new IDBFactory() });
    expect(storage.kind).toBe("indexeddb");
    expect(initial.builds.map((b) => b.name).sort()).toEqual(["Critiques et séismes", "Spirale de givre"]);
    expect(initial.view).toBe("builds");
  });

  it("revient en Création seulement si le build existe encore", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const factory = new IDBFactory();
    const first = await boot(swornExamples, { factory });
    await first.storage.prefs.set({ lastView: "edit", lastBuildId: "ex-2" });
    expect((await boot(swornExamples, { factory })).initial).toMatchObject({ view: "edit", editingId: "ex-2" });
    await first.storage.prefs.set({ lastBuildId: "disparu" });
    expect((await boot(swornExamples, { factory })).initial).toMatchObject({ view: "builds", editingId: null });
    await first.storage.prefs.set({ lastView: "inconnue" });
    expect((await boot(swornExamples, { factory })).initial.view).toBe("builds");
    vi.restoreAllMocks();
  });
});
