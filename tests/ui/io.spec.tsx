import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Run } from "@rogue/core";
import { singleActiveRun } from "../../src/ui/state";
import { flush, renderApp } from "./helpers";

afterEach(() => vi.restoreAllMocks());

async function openIo(opts: Parameters<typeof renderApp>[0] = {}) {
  const app = await renderApp(opts);
  await app.user.click(screen.getByRole("button", { name: "Importer / exporter" }));
  return app;
}
const dialog = () => screen.getByRole("dialog", { name: "Importer / exporter" });
const exported = () => JSON.parse(within(dialog()).getByLabelText("Export").textContent!);

describe("export", () => {
  it("contient builds, runs et bénédictions ajoutées au format Rogue Planner", async () => {
    await openIo();
    const json = exported();
    expect(json).toMatchObject({ format: "rogue-planner", version: 1, game: "sworn", custom: [] });
    expect(json.builds.map((b: { id: string }) => b.id).sort()).toEqual(["ex-1", "ex-2"]);
    expect(json.runs).toHaveLength(1);
  });

  it("télécharge rogue-planner-AAAA-MM-JJ.json", async () => {
    const create = vi.fn(() => "blob:x");
    const revoke = vi.fn();
    Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke });
    let name = "";
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      name = this.download;
    });
    const app = await openIo();
    await app.user.click(within(dialog()).getByRole("button", { name: "Télécharger" }));
    expect(name).toBe("rogue-planner-2026-11-03.json");
    expect(create).toHaveBeenCalledOnce();
    expect(revoke).toHaveBeenCalledWith("blob:x");
  });

  it("copier : presse-papiers, sinon sélection du texte", async () => {
    const app = await openIo();
    await app.user.click(within(dialog()).getByRole("button", { name: "Copier" }));
    expect(screen.getByText("JSON copié")).toBeInTheDocument();
    expect(JSON.parse(await navigator.clipboard.readText()).format).toBe("rogue-planner");

    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(new Error("refusé"));
    await app.user.click(within(dialog()).getByRole("button", { name: "Copier" }));
    expect(screen.getByText("Texte sélectionné : copiez-le")).toBeInTheDocument();
    expect(getSelection()!.toString()).toContain('"format": "rogue-planner"');
  });

  it("se ferme par le bouton, Échap ou le fond", async () => {
    const app = await openIo();
    await app.user.click(within(dialog()).getByRole("button", { name: "Fermer" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await app.user.click(screen.getByRole("button", { name: "Importer / exporter" }));
    await app.user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await app.user.click(screen.getByRole("button", { name: "Importer / exporter" }));
    await app.user.click(dialog().parentElement!);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("import", () => {
  const paste = async (app: Awaited<ReturnType<typeof openIo>>, text: string) => {
    fireEvent.change(within(dialog()).getByRole("textbox", { name: "Ou coller le JSON" }), { target: { value: text } });
    await app.user.click(within(dialog()).getByRole("button", { name: "Importer par fusion" }));
  };

  it("un export réimporté dans une bibliothèque vide ramène tout", async () => {
    const source = await openIo();
    const json = within(dialog()).getByLabelText("Export").textContent!;
    source.unmount();

    const app = await openIo({ empty: true });
    await paste(app, json);
    expect(within(dialog()).getByRole("status")).toHaveTextContent("3 éléments importés (3 ajoutés, 0 remplacé)");
    await app.user.click(within(dialog()).getByRole("button", { name: "Fermer" }));
    expect(screen.getAllByRole("article")).toHaveLength(2);
    await flush();
    expect(await app.storage.library.listRuns()).toHaveLength(1);
  });

  it("réimporter remplace ; message au singulier", async () => {
    const app = await openIo();
    const build = exported().builds[0];
    await paste(app, JSON.stringify({ format: "rogue-planner", builds: [{ ...build, name: "Renommé" }] }));
    expect(within(dialog()).getByRole("status")).toHaveTextContent("1 élément importé (0 ajouté, 1 remplacé)");
    await app.user.click(within(dialog()).getByRole("button", { name: "Fermer" }));
    expect(screen.getByRole("article", { name: "Renommé" })).toBeInTheDocument();
  });

  it("depuis un fichier", async () => {
    const app = await openIo({ empty: true });
    const file = new File([JSON.stringify({ format: "carnet-runs", game: "sworn", custom: [{ id: "custom:x-1a2b", name: "X", family: "badb" }] })], "x.json", { type: "application/json" });
    await app.user.upload(within(dialog()).getByLabelText("Fichier JSON"), file);
    await app.user.click(within(dialog()).getByRole("button", { name: "Importer par fusion" }));
    await waitFor(() => expect(within(dialog()).getByRole("status")).toHaveTextContent("1 élément importé"));
    await flush();
    expect((await app.storage.library.listCustom()).map((c) => c.id)).toEqual(["custom:x-1a2b"]);
  });

  it("erreurs : vide, JSON invalide, autre outil, champs fautifs", async () => {
    const app = await openIo();
    await paste(app, "  ");
    expect(within(dialog()).getByRole("status")).toHaveTextContent("Choisissez un fichier ou collez un JSON.");
    await paste(app, "{pas du json");
    expect(within(dialog()).getByRole("status")).toHaveTextContent("Ce texte n'est pas un JSON valide.");
    await paste(app, JSON.stringify({ format: "autre" }));
    expect(within(dialog()).getByRole("status")).toHaveTextContent(/ne vient pas de Rogue Planner/);
    await paste(app, JSON.stringify({ format: "rogue-planner", builds: [{ id: "b" }] }));
    const status = within(dialog()).getByRole("status");
    expect(status).toHaveTextContent("Import refusé :");
    expect(within(status).getAllByRole("listitem").map((li) => li.textContent)).toEqual(expect.arrayContaining([expect.stringMatching(/^builds\.0\.game : /)]));
  });

  it("un seul run reste actif après import : le plus récent", async () => {
    const app = await openIo();
    await app.user.click(within(dialog()).getByRole("button", { name: "Fermer" }));
    await app.user.click(screen.getByRole("button", { name: "Run sans build" }));
    await app.user.click(screen.getByRole("button", { name: "Builds" }));
    await app.user.click(screen.getByRole("button", { name: "Importer / exporter" }));
    const imported = {
      id: "imp", game: "sworn", buildId: null, status: "active", startedAt: "2099-01-01T00:00:00.000Z",
      hero: "vigilante", weapon: "Sword", spell: "Shadow Strike",
    };
    await paste(app, JSON.stringify({ format: "rogue-planner", runs: [imported] }));
    await flush();
    const runs = await app.storage.library.listRuns();
    expect(runs.filter((r) => r.status === "active").map((r) => r.id)).toEqual(["imp"]);
    expect(runs.find((r) => r.id === "id-1")?.status).toBe("abandoned");
  });
});

describe("singleActiveRun", () => {
  const r = (id: string, status: Run["status"], startedAt: string) => ({ id, status, startedAt }) as Run;
  it("ne touche à rien s'il y a au plus un run actif", () => {
    const runs = [r("a", "active", "1"), r("b", "done", "2")];
    expect(singleActiveRun(runs, "t")).toBe(runs);
  });
});
