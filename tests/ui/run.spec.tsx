import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { flush, renderApp } from "./helpers";

type App = Awaited<ReturnType<typeof renderApp>>;

/** Lance un run depuis la carte d'un build (ou sans build). */
async function startRun(build: string | null = "Critiques et séismes", opts: { empty?: boolean } = {}) {
  const app = await renderApp(opts);
  if (build) await app.user.click(within(screen.getByRole("article", { name: build })).getByRole("button", { name: "Lancer un run" }));
  else await app.user.click(screen.getByRole("button", { name: "Run sans build" }));
  return app;
}
const panel = (title: string | RegExp) => screen.getByRole("heading", { name: title }).closest(".panel") as HTMLElement;
const dialog = () => screen.getByRole("dialog", { name: "Choisir une bénédiction" });
async function pick(app: App, name: string) {
  await app.user.click(screen.getByRole("button", { name: "+ Bénédiction" }));
  await app.user.type(within(dialog()).getByRole("searchbox"), name);
  await app.user.click(within(dialog()).getAllByRole("button", { name: new RegExp(`^${name}`) })[0]);
}
const storedRun = async (app: App) => {
  await flush();
  return (await app.storage.library.listRuns()).find((r) => r.status === "active")!;
};

describe("RUN : sans run actif", () => {
  it("propose de lancer un run depuis un build ou sans build", async () => {
    const app = await renderApp();
    await app.user.click(screen.getByRole("button", { name: "Run" }));
    expect(screen.getByRole("heading", { name: "Aucun run en cours" })).toBeInTheDocument();
    await app.user.click(screen.getByRole("button", { name: "Spirale de givre" }));
    expect(screen.getByRole("heading", { name: "Spirale de givre" })).toBeInTheDocument();
  });

  it("run sans build depuis cet écran", async () => {
    const app = await renderApp({ empty: true });
    await app.user.click(screen.getByRole("button", { name: "Run" }));
    await app.user.click(within(panel("Aucun run en cours")).getByRole("button", { name: "Run sans build" }));
    expect(screen.getByRole("heading", { name: "Run libre" })).toBeInTheDocument();
  });
});

describe("RUN : en-tête et compteurs", () => {
  it("heure de début, build, kit, compteurs et barre", async () => {
    await startRun();
    expect(screen.getByText(/^Mode RUN · commencé à \d\d:\d\d$/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Critiques et séismes" })).toBeInTheDocument();
    expect(screen.getByText("Vigilante · Chakrams · Shadow Strike")).toBeInTheDocument();
    const meter = document.querySelector(".meter")!;
    expect(meter).toHaveTextContent("0/3Essentielles0Prises0Hors plan");
  });

  it("run libre : ni compteurs ni « Encore à trouver »", async () => {
    await startRun(null, { empty: true });
    expect(screen.getByRole("heading", { name: "Run libre" })).toBeInTheDocument();
    expect(document.querySelector(".meter")).toBeNull();
    expect(screen.queryByRole("heading", { name: "Encore à trouver" })).not.toBeInTheDocument();
  });

  it("changer la classe du run prend la première arme et le premier sort", async () => {
    const app = await startRun();
    await app.user.click(screen.getByText("Changer la classe, l'arme ou le sort de ce run"));
    await app.user.selectOptions(screen.getByRole("combobox", { name: "Classe" }), "monk");
    const r = await storedRun(app);
    expect(r.hero).toBe("monk");
    expect(screen.getByText(`Monk · ${r.weapon} · ${r.spell}`)).toBeInTheDocument();
  });
});

describe("RUN : prises", () => {
  it("prise prévue, prise hors plan, compteurs, retrait", async () => {
    const app = await startRun();
    await pick(app, "Critical Clover");
    expect(screen.getByText("Critical Clover ajoutée")).toBeInTheDocument();
    await pick(app, "Nimble");
    const log = panel("Prises, dans l'ordre");
    const rows = within(log).getAllByText(/^(Critical Clover|Nimble)$/).map((n) => n.closest(".bitem") as HTMLElement);
    expect(rows[0]).toHaveTextContent("1Critical Clover");
    expect(within(rows[0]).getByText("prévue")).toBeInTheDocument();
    expect(within(rows[1]).getByText("hors plan")).toBeInTheDocument();
    expect(document.querySelector(".meter")).toHaveTextContent("1/3Essentielles2Prises1Hors plan");
    expect(document.querySelector<HTMLElement>(".bar i")!.style.width).toBe("33%");
    expect((await storedRun(app)).picks.map((p) => p.id)).toEqual(["lugh:critical-clover", "badb:nimble"]);

    await app.user.click(within(log).getByRole("button", { name: "Retirer Nimble" }));
    expect((await storedRun(app)).picks.map((p) => p.id)).toEqual(["lugh:critical-clover"]);
  });

  it("une aptitude remplace celle du même emplacement ; « Prévu » et contour si différente", async () => {
    const app = await startRun();
    const light = () => screen.getByLabelText("Attaque légère");
    expect(light()).toHaveTextContent("—Prévu : Lucky Touch");
    await pick(app, "Lucky Touch");
    expect(light()).toHaveTextContent("Lucky Touch");
    expect(light()).not.toHaveTextContent("Prévu");
    await pick(app, "Shadow Touch");
    expect(light()).toHaveTextContent("Shadow TouchPrévu : Lucky Touch");
    expect(light()).toHaveClass("off");
    expect((await storedRun(app)).picks.map((p) => p.id)).toEqual(["badb:shadow-touch"]);
  });

  it("encore à trouver : essentielles d'abord, puis bonus ; vide quand tout est pris", async () => {
    const app = await startRun("Spirale de givre");
    const remaining = () => panel("Encore à trouver");
    const tags = within(remaining()).getAllByText(/^(essentielle|bonus)$/).map((n) => n.textContent);
    expect(tags).toEqual(["essentielle", "essentielle", "essentielle", "bonus"]);
    for (const name of ["Spell Caster", "Mana Well", "Nova Surge", "Onslaught"]) await pick(app, name);
    expect(within(remaining()).getByText("Tout le plan est pris.")).toBeInTheDocument();
  });

  it("duos atteignables maintenant : « prévu » ou « ouvert »", async () => {
    const app = await startRun();
    expect(within(panel("Duos atteignables maintenant")).getByText(/Prenez une bénédiction de deux fae/)).toBeInTheDocument();
    await pick(app, "Lucky Touch");
    await pick(app, "Mighty Strike");
    await pick(app, "Chilling Flourish");
    const duos = panel("Duos atteignables maintenant");
    const opening = within(duos).getByText("Critical Opening").closest(".bitem") as HTMLElement;
    expect(within(opening).getByText("prévu")).toBeInTheDocument();
    expect(within(duos).getAllByText("ouvert").length).toBeGreaterThan(0);
  });

  it("notes du build affichées", async () => {
    await startRun();
    expect(within(panel("Notes du build")).getByText(/Étourdir puis critiquer/)).toBeInTheDocument();
  });
});

describe("RUN : sélecteur", () => {
  it("prévues dans le build d'abord, verrouillées choisissables", async () => {
    const app = await startRun();
    await app.user.click(screen.getByRole("button", { name: "+ Bénédiction" }));
    expect(within(dialog()).getByRole("heading", { name: "Bénédiction prise" })).toBeInTheDocument();
    const headings = within(dialog()).getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(headings).toEqual(["Prévues dans le build", "Toutes"]);
    expect(within(dialog()).queryByRole("group", { name: "Mode du build" })).not.toBeInTheDocument();

    const clover = within(dialog()).getAllByRole("button", { name: /^Critical Clover/ })[0];
    expect(clover).toHaveClass("dim");
    expect(within(clover).getByText("prévue")).toBeInTheDocument();
    expect(clover.querySelector(".req-miss")).toHaveTextContent("un effet Critique");
    await app.user.click(clover);
    expect((await storedRun(app)).picks.map((p) => p.id)).toEqual(["lugh:critical-clover"]);
  });

  it("run libre : pas de section « Prévues »", async () => {
    const app = await startRun(null, { empty: true });
    await app.user.click(screen.getByRole("button", { name: "+ Bénédiction" }));
    expect(within(dialog()).queryByText("Prévues dans le build")).not.toBeInTheDocument();
    await app.user.type(within(dialog()).getByRole("searchbox"), "zzz");
    expect(within(dialog()).getByText(/Aucun résultat/)).toBeInTheDocument();
  });
});

describe("RUN : enclumes et autres choix", () => {
  it("enclumes : prévues en pointillé ; un toucher prend ou retire", async () => {
    const app = await renderApp();
    await app.user.click(within(screen.getByRole("article", { name: "Critiques et séismes" })).getByRole("button", { name: "Modifier" }));
    const planned = within(panel(/^Enclumes/)).getAllByRole("button")[0];
    const name = planned.querySelector(".bn")!.textContent!;
    await app.user.click(planned);
    await app.user.click(screen.getByRole("button", { name: "Lancer un run" }));

    const anvils = panel("Enclumes · 0 pris");
    const aug = within(anvils).getByRole("button", { name: new RegExp(`^${name}`) });
    expect(aug).toHaveClass("planned");
    expect(within(aug).getByText("prévu")).toBeInTheDocument();
    await app.user.click(aug);
    expect(aug).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Augment pris")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Enclumes · 1 pris" })).toBeInTheDocument();
    await app.user.click(aug);
    expect(screen.getByText("Augment retiré")).toBeInTheDocument();
    expect((await storedRun(app)).anvils).toEqual([]);
  });

  it("autres choix : Merlin, saisie, ajout, retrait", async () => {
    const app = await startRun();
    const others = panel("Autres choix du run");
    expect(within(others).getAllByRole("button").map((b) => b.textContent)).toEqual(["+ Merlin", "+ Morgane", "+ Sanctuaire", "+ Autre"]);
    await app.user.click(within(others).getByRole("button", { name: "+ Merlin" }));
    await app.user.click(within(others).getByRole("button", { name: "Ajouter" }));
    expect((await storedRun(app)).others).toEqual([]);
    await app.user.type(within(others).getByRole("textbox", { name: "Merlin" }), "Excalibur{Enter}");
    expect(within(others).getByText("Excalibur")).toBeInTheDocument();
    expect((await storedRun(app)).others).toEqual([{ kind: "merlin", text: "Excalibur" }]);
    await app.user.click(within(others).getByRole("button", { name: "+ Sanctuaire" }));
    await app.user.click(within(others).getByRole("button", { name: "Annuler" }));
    expect(within(others).queryByRole("textbox")).not.toBeInTheDocument();
    await app.user.click(within(others).getByRole("button", { name: "Retirer" }));
    expect((await storedRun(app)).others).toEqual([]);
  });
});

describe("RUN : fin du run", () => {
  it("victoire enregistrée dans l'historique", async () => {
    const app = await startRun();
    await pick(app, "Collector");
    await app.user.click(screen.getByRole("button", { name: "Terminer le run" }));
    const end = panel("Fin du run");
    expect(within(end).getByRole("button", { name: "Défaite" })).toHaveAttribute("aria-pressed", "true");
    await app.user.click(within(end).getByRole("button", { name: "Victoire" }));
    await app.user.type(within(end).getByRole("textbox", { name: "Jusqu'où ?" }), " Boss final ");
    await app.user.type(within(end).getByRole("textbox", { name: "Notes" }), "Facile");
    await app.user.click(within(end).getByRole("button", { name: "Enregistrer dans l'historique" }));

    expect(screen.getByText("Run enregistré")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Runs terminés" })).toBeInTheDocument();
    expect(screen.queryByTitle("Run en cours")).not.toBeInTheDocument();
    await flush();
    const done = (await app.storage.library.listRuns()).find((r) => r.id === "id-1")!;
    expect(done).toMatchObject({ status: "done", endedAt: expect.any(String), result: { outcome: "win", reached: "Boss final", notes: "Facile" } });
  });

  it("continuer le run referme le formulaire", async () => {
    const app = await startRun();
    await app.user.click(screen.getByRole("button", { name: "Terminer le run" }));
    await app.user.click(screen.getByRole("button", { name: "Continuer le run" }));
    expect(screen.queryByRole("heading", { name: "Fin du run" })).not.toBeInTheDocument();
  });

  it("abandonner sans enregistrer supprime le run", async () => {
    const app = await startRun();
    await app.user.click(screen.getByRole("button", { name: "Terminer le run" }));
    await app.user.click(screen.getByRole("button", { name: "Abandonner sans enregistrer" }));
    expect(screen.getByText("Mes builds")).toBeInTheDocument();
    await flush();
    expect((await app.storage.library.listRuns()).map((r) => r.id)).toEqual(["ex-r1"]);
  });
});
