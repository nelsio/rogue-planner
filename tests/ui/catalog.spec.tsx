import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { memoryStorage } from "../../src/storage";
import { customId } from "../../src/ui/Catalog";
import { flush, renderApp } from "./helpers";

async function openCatalog(opts: Parameters<typeof renderApp>[0] = {}) {
  const app = await renderApp(opts);
  await app.user.click(screen.getByRole("button", { name: "Catalogue" }));
  return app;
}
const list = () => screen.getByRole("heading", { name: "Bénédictions" }).closest("section")!.querySelector(".blist") as HTMLElement;
const form = () => screen.getByRole("heading", { name: "Ajouter une bénédiction manquante" }).closest("form") as HTMLElement;

describe("catalogue", () => {
  it("en-tête : nombre de bénédictions et sources du pack", async () => {
    await openCatalog();
    expect(screen.getByText("Catalogue SWORN · 256 bénédictions")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "SWORN Wiki (Fandom)" })).toHaveAttribute("href", "https://sworn-game.fandom.com/");
    expect(screen.getByText(/CC BY-SA 3\.0/)).toBeInTheDocument();
  });

  it("type et prérequis en texte, sans coloration ; rien pour les aptitudes", async () => {
    await openCatalog();
    const row = within(list()).getByText("Grievous Wounds").closest(".bitem") as HTMLElement;
    expect(row).toHaveTextContent("Standard · Badb");
    expect(row).toHaveTextContent("Prérequis : un effet Saignement (hors Bloody Shadows)");
    expect(row.querySelector(".req-ok, .req-miss")).toBeNull();
    const ability = within(list()).getByText("Lucky Touch").closest(".bitem") as HTMLElement;
    expect(ability).not.toHaveTextContent("Prérequis");
  });

  it("puces de fae (retenues) et recherche par nom ou effet", async () => {
    const app = await openCatalog();
    await app.user.click(screen.getByRole("button", { name: "Oberon" }));
    expect(within(list()).queryByText("Lucky Touch")).not.toBeInTheDocument();
    expect(within(list()).getByText("Typhoon")).toBeInTheDocument();
    await flush();
    expect((await app.storage.prefs.get()).codexFamily).toBe("oberon");

    await app.user.click(screen.getByRole("button", { name: "Toutes" }));
    await app.user.type(screen.getByRole("searchbox", { name: "Chercher un nom ou un effet" }), "trèfle");
    expect(within(list()).getByText("Critical Clover")).toBeInTheDocument();
    await app.user.type(screen.getByRole("searchbox"), "zzz");
    expect(screen.getByText("Aucun résultat.")).toBeInTheDocument();
  });

  it("reprend le dernier filtre de fae", async () => {
    const storage = memoryStorage();
    await storage.prefs.set({ examplesLoaded: true, codexFamily: "lugh" });
    await openCatalog({ storage });
    expect(screen.getByRole("button", { name: "Lugh" })).toHaveAttribute("aria-pressed", "true");
  });

  it("ajoute une bénédiction manquante, utilisable partout, puis la retire", async () => {
    const app = await openCatalog();
    await app.user.click(within(form()).getByRole("button", { name: "Ajouter au catalogue" }));
    expect(screen.getByText("Donnez un nom")).toBeInTheDocument();

    await app.user.type(within(form()).getByRole("textbox", { name: "Nom" }), "Blood Clot");
    await app.user.selectOptions(within(form()).getByRole("combobox", { name: "Fae" }), "badb");
    await app.user.selectOptions(within(form()).getByRole("combobox", { name: "Emplacement" }), "dash");
    await app.user.click(within(form()).getByRole("button", { name: "Ajouter au catalogue" }));
    expect(screen.getByText("Blood Clot ajoutée")).toBeInTheDocument();
    expect(screen.getByText("Catalogue SWORN · 257 bénédictions")).toBeInTheDocument();
    const row = within(list()).getByText("Blood Clot").closest(".bitem") as HTMLElement;
    expect(row).toHaveTextContent("Effet à préciser");
    expect(row).toHaveTextContent("Ajoutée · Esquive · Badb");
    expect(row).toHaveTextContent("Aucun prérequis");
    await flush();
    const [stored] = await app.storage.library.listCustom();
    expect(stored).toMatchObject({ id: "custom:blood-clot-id1", game: "sworn", name: "Blood Clot", family: "badb", slot: "dash" });

    await app.user.click(within(row).getByRole("button", { name: "Retirer Blood Clot" }));
    expect(within(list()).queryByText("Blood Clot")).not.toBeInTheDocument();
    await flush();
    expect(await app.storage.library.listCustom()).toEqual([]);
  });

  it("une fae « Autre » et un effet saisi", async () => {
    const app = await openCatalog({ empty: true });
    await app.user.type(within(form()).getByRole("textbox", { name: "Nom" }), "Mystère");
    await app.user.selectOptions(within(form()).getByRole("combobox", { name: "Fae" }), "other");
    await app.user.type(within(form()).getByRole("textbox", { name: "Effet" }), "Inconnu{Enter}");
    const row = within(list()).getByText("Mystère").closest(".bitem") as HTMLElement;
    expect(row).toHaveTextContent("Ajoutée · Autre");
    expect(row).toHaveTextContent("Inconnu");
  });
});

describe("customId", () => {
  it("normalise le nom et garde 4 caractères aléatoires", () => {
    expect(customId("  Éclat d'Âme !", "A1-b2c3d4")).toBe("custom:eclat-d-ame-a1b2");
  });
});
