import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Run } from "@rogue/core";
import { memoryStorage } from "../../src/storage";
import { renderApp } from "./helpers";

const run = (id: string, over: Partial<Run>): Run => ({
  id, game: "sworn", buildId: null, status: "done", startedAt: "2026-11-01T10:00:00.000Z", endedAt: "2026-11-01T11:00:00.000Z",
  hero: "vigilante", weapon: "Sword", spell: "Shadow Strike", picks: [], anvils: [], others: [],
  result: { outcome: "loss", reached: "", notes: "" }, ...over,
});

describe("historique", () => {
  it("run d'exemple : date, build, départ, résultat, prises, notes", async () => {
    const app = await renderApp();
    await app.user.click(screen.getByRole("button", { name: "Historique" }));
    expect(screen.getByText("Runs terminés")).toBeInTheDocument();
    expect(document.querySelector(".meter")).toHaveTextContent("1Runs0Victoires0%Réussite");
    const rows = screen.getAllByRole("row");
    expect(within(rows[0]).getAllByRole("columnheader").map((c) => c.textContent)).toEqual(["Date", "Build", "Départ", "Résultat", "Prises", "Notes"]);
    const cells = within(rows[1]).getAllByRole("cell");
    expect(cells[0]).toHaveTextContent("03/11/2026");
    expect(cells[1]).toHaveTextContent("Critiques et séismes Exemple");
    expect(cells[2]).toHaveTextContent("Vigilante · Chakrams · Shadow Strike");
    expect(cells[3]).toHaveTextContent("DéfaiteBoss de la 2e zone");
    expect(cells[3].querySelector(".outcome")).toHaveClass("loss");
    expect(cells[4].querySelectorAll(".dot, .duo-dot")).toHaveLength(6);
    expect(cells[4]).toHaveTextContent("6");
    expect(cells[5]).toHaveTextContent("Trop peu de PV");
    expect(screen.getByTitle("Critical Clover")).toBeInTheDocument();
  });

  it("filtre par build, totaux, tri du plus récent, run libre et build supprimé", async () => {
    const storage = memoryStorage();
    await storage.prefs.set({ examplesLoaded: true });
    await storage.library.putBuild({
      id: "b1", game: "sworn", name: "Givre", mode: "free", hero: "monk", weapon: "Tome", spell: "Crystal Turrets",
      abilities: {}, targets: [], anvils: [], notes: "", updatedAt: "t",
    });
    await storage.library.putRun(run("r1", { buildId: "b1", endedAt: "2026-11-01T11:00:00.000Z", result: { outcome: "win", reached: "", notes: "" } }));
    await storage.library.putRun(run("r2", { buildId: null, endedAt: "2026-11-02T11:00:00.000Z" }));
    await storage.library.putRun(run("r3", { buildId: "b1", endedAt: "2026-11-03T11:00:00.000Z", result: { outcome: "win", reached: "", notes: "" } }));
    await storage.library.putRun(run("r4", { buildId: "disparu", endedAt: "2026-10-30T11:00:00.000Z" }));
    await storage.library.putRun(run("r5", { status: "abandoned" }));
    const app = await renderApp({ storage });
    await app.user.click(screen.getByRole("button", { name: "Historique" }));

    expect(document.querySelector(".meter")).toHaveTextContent("4Runs2Victoires50%Réussite");
    const dates = screen.getAllByRole("row").slice(1).map((r) => within(r).getAllByRole("cell")[0].textContent);
    expect(dates).toEqual(["03/11/2026", "02/11/2026", "01/11/2026", "30/10/2026"]);
    expect(screen.getAllByText("Run libre")).toHaveLength(2);

    await app.user.selectOptions(screen.getByRole("combobox", { name: "Build" }), "b1");
    expect(document.querySelector(".meter")).toHaveTextContent("2Runs2Victoires100%Réussite");
    expect(screen.getAllByRole("row")).toHaveLength(3);
  });

  it("aucun run terminé", async () => {
    const app = await renderApp({ empty: true });
    await app.user.click(screen.getByRole("button", { name: "Historique" }));
    expect(screen.getByText("Aucun run terminé pour ce filtre.")).toBeInTheDocument();
    expect(document.querySelector(".meter")).toHaveTextContent("0Runs0Victoires0%Réussite");
  });
});
