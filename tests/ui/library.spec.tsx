import { screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { flush, renderApp } from "./helpers";

const card = (name: string) => screen.getByRole("article", { name });

describe("bibliothèque", () => {
  it("affiche les builds d'exemple avec leur kit, leurs fae et leurs compteurs", async () => {
    await renderApp();
    expect(screen.getByText("SWORN · bibliothèque")).toBeInTheDocument();
    const c = card("Critiques et séismes");
    expect(within(c).getByText("Exemple")).toBeInTheDocument();
    expect(within(c).getByText("Vigilante · Chakrams · Shadow Strike · mode restreint")).toBeInTheDocument();
    // Totaux par fae : nombre prévu décroissant, puis ordre du pack ; les duos à part.
    expect(c.querySelector(".faes")).toHaveTextContent("Gogmagog ×5Lugh ×5Duos ×1");
    expect(within(c).getByText("Lugh")).toHaveAttribute("title", "Lugh : 5 prévue(s)");
    expect(c.querySelector(".stats")).toHaveTextContent("3 essentielles6 visées1 run · 0 victoire");
    expect(within(card("Spirale de givre")).getByText(/mode restreint/)).toBeInTheDocument();
  });

  it("bibliothèque vide : message d'invitation", async () => {
    await renderApp({ empty: true });
    expect(screen.getByText("Aucun build. Créez-en un ou lancez un run sans build.")).toBeInTheDocument();
  });

  it("nouveau build : enregistré, ouvert en Création", async () => {
    const { user, storage } = await renderApp({ empty: true });
    await user.click(screen.getByRole("button", { name: "Nouveau build" }));
    expect(screen.getByRole("button", { name: "Builds" })).toHaveAttribute("aria-current", "page");
    await flush();
    const [b] = await storage.library.listBuilds();
    expect(b).toMatchObject({ id: "id-1", name: "Nouveau build", mode: "restricted", hero: "vigilante", weapon: "Sword", spell: "Shadow Strike" });
    expect(Object.values(b.abilities)).toEqual([null, null, null, null, null, null]);
    expect(await storage.prefs.get()).toMatchObject({ lastView: "edit", lastBuildId: "id-1" });
  });

  it("modifier ouvre la Création du build", async () => {
    const { user, storage } = await renderApp();
    await user.click(within(card("Spirale de givre")).getByRole("button", { name: "Modifier" }));
    await flush();
    expect(await storage.prefs.get()).toMatchObject({ lastView: "edit", lastBuildId: "ex-2" });
  });

  it("dupliquer : copie en tête, sans badge Exemple, toast", async () => {
    const { user, storage } = await renderApp();
    await user.click(within(card("Spirale de givre")).getByRole("button", { name: "Dupliquer" }));
    expect(screen.getByText("Build dupliqué")).toHaveAttribute("role", "status");
    const names = screen.getAllByRole("article").map((a) => a.getAttribute("aria-label"));
    expect(names[0]).toBe("Spirale de givre (copie)");
    expect(within(card("Spirale de givre (copie)")).queryByText("Exemple")).not.toBeInTheDocument();
    await flush();
    const copy = (await storage.library.listBuilds()).find((b) => b.id === "id-1");
    expect(copy).toMatchObject({ name: "Spirale de givre (copie)", targets: expect.any(Array) });
    expect(copy?.example).toBeUndefined();
    await waitFor(() => expect(screen.queryByText("Build dupliqué")).not.toBeInTheDocument(), { timeout: 2500 });
  });

  it("supprimer demande confirmation dans la page, garde l'historique", async () => {
    const { user, storage } = await renderApp();
    const c = card("Critiques et séismes");
    await user.click(within(c).getByRole("button", { name: "Supprimer" }));
    const confirm = within(c).getByRole("alert");
    expect(confirm).toHaveTextContent("Supprimer ce build et garder son historique ?");
    await user.click(within(confirm).getByRole("button", { name: "Annuler" }));
    expect(within(c).queryByRole("alert")).not.toBeInTheDocument();

    await user.click(within(c).getByRole("button", { name: "Supprimer" }));
    await user.click(within(within(c).getByRole("alert")).getByRole("button", { name: "Supprimer" }));
    expect(screen.queryByRole("article", { name: "Critiques et séismes" })).not.toBeInTheDocument();
    expect(screen.getByText("Build supprimé")).toBeInTheDocument();
    await flush();
    expect((await storage.library.listBuilds()).map((b) => b.id)).toEqual(["ex-2"]);
    expect((await storage.library.listRuns()).map((r) => r.id)).toEqual(["ex-r1"]);
  });

  it("lancer un run copie le kit du build et allume l'onglet Run", async () => {
    const { user, storage } = await renderApp();
    expect(screen.queryByTitle("Run en cours")).not.toBeInTheDocument();
    await user.click(within(card("Spirale de givre")).getByRole("button", { name: "Lancer un run" }));
    expect(screen.getByRole("button", { name: /Run/ })).toHaveAttribute("aria-current", "page");
    expect(screen.getByTitle("Run en cours")).toBeInTheDocument();
    await flush();
    const run = (await storage.library.listRuns()).find((r) => r.id === "id-1");
    expect(run).toMatchObject({ buildId: "ex-2", status: "active", hero: "monk", weapon: "Tome", spell: "Crystal Turrets", picks: [] });
  });

  it("run sans build : kit par défaut", async () => {
    const { user, storage } = await renderApp({ empty: true });
    await user.click(screen.getByRole("button", { name: "Run sans build" }));
    await flush();
    expect((await storage.library.listRuns())[0]).toMatchObject({ buildId: null, hero: "vigilante", weapon: "Sword" });
  });

  it("un run actif : confirmation, puis l'ancien passe en abandonné", async () => {
    const { user, storage } = await renderApp();
    await user.click(screen.getByRole("button", { name: "Run sans build" }));
    await user.click(screen.getByRole("button", { name: "Builds" }));

    const c = card("Spirale de givre");
    await user.click(within(c).getByRole("button", { name: "Lancer un run" }));
    const confirm = within(c).getByRole("alert");
    expect(confirm).toHaveTextContent("Un run est en cours. L'abandonner et en lancer un nouveau ?");
    await user.click(within(confirm).getByRole("button", { name: "Annuler" }));
    expect(within(c).queryByRole("alert")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Run sans build" }));
    const top = screen.getByRole("alert");
    await user.click(within(top).getByRole("button", { name: "Abandonner et lancer" }));
    await flush();
    const runs = await storage.library.listRuns();
    expect(runs.find((r) => r.id === "id-1")).toMatchObject({ status: "abandoned", endedAt: expect.any(String) });
    expect(runs.find((r) => r.id === "id-2")).toMatchObject({ status: "active" });
    expect(runs.filter((r) => r.status === "active")).toHaveLength(1);
  });
});
