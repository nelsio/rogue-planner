import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { flush, renderApp } from "./helpers";

async function openBuild(name = "Critiques et séismes", opts: { empty?: boolean } = {}) {
  const app = await renderApp(opts);
  if (opts.empty) await app.user.click(screen.getByRole("button", { name: "Nouveau build" }));
  else await app.user.click(within(screen.getByRole("article", { name })).getByRole("button", { name: "Modifier" }));
  return app;
}
const stored = async (app: Awaited<ReturnType<typeof renderApp>>, id: string) => {
  await flush();
  return (await app.storage.library.listBuilds()).find((b) => b.id === id)!;
};
const panel = (title: string) => screen.getByRole("heading", { name: title }).closest(".panel") as HTMLElement;
const dialog = () => screen.getByRole("dialog", { name: "Choisir une bénédiction" });

describe("Création : départ", () => {
  it("affiche le build ouvert et revient à la bibliothèque", async () => {
    const { user } = await openBuild();
    expect(screen.getByText("Mode Création")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Critiques et séismes" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Builds" })).toHaveAttribute("aria-current", "page");
    await user.click(screen.getByRole("button", { name: "Retour à la bibliothèque" }));
    expect(screen.getByText("Mes builds")).toBeInTheDocument();
  });

  it("renomme le build", async () => {
    const app = await openBuild();
    const input = screen.getByRole("textbox", { name: "Nom du build" });
    await app.user.clear(input);
    await app.user.type(input, "Orage");
    expect(screen.getByRole("heading", { name: "Orage" })).toBeInTheDocument();
    expect((await stored(app, "ex-1")).name).toBe("Orage");
  });

  it("changer de classe prend la première arme et le premier sort, et filtre les listes", async () => {
    const app = await openBuild();
    await app.user.selectOptions(screen.getByRole("combobox", { name: "Classe" }), "monk");
    const weapon = screen.getByRole("combobox", { name: "Arme" }) as HTMLSelectElement;
    expect([...weapon.options].map((o) => o.value).sort()).toEqual(["Chimes", "Mace", "Magic Staff", "Tome"]);
    expect(weapon.value).toBe(weapon.options[0].value);
    const b = await stored(app, "ex-1");
    expect(b).toMatchObject({ hero: "monk", weapon: weapon.options[0].value });
    expect(b.spell).toBe((within(panel("Départ")).getByRole("combobox", { name: "Sort" }) as HTMLSelectElement).value);
    await app.user.selectOptions(weapon, "Tome");
    await app.user.selectOptions(within(panel("Départ")).getByRole("combobox", { name: "Sort" }), "Crystal Turrets");
    expect(await stored(app, "ex-1")).toMatchObject({ weapon: "Tome", spell: "Crystal Turrets" });
  });

  it("Libre / Restreint : phrase d'aide, toast, enregistré", async () => {
    const app = await openBuild();
    expect(screen.getByText(/Seules les bénédictions débloquées/)).toBeInTheDocument();
    await app.user.click(screen.getByRole("button", { name: "Libre" }));
    expect(screen.getByText("Toutes les bénédictions sont proposées, sans prérequis.")).toBeInTheDocument();
    expect(screen.getByText("Mode libre")).toHaveAttribute("role", "status");
    expect((await stored(app, "ex-1")).mode).toBe("free");
    await app.user.click(screen.getByRole("button", { name: "Libre" }));
    expect(screen.getByRole("button", { name: "Libre" })).toHaveAttribute("aria-pressed", "true");
  });
});

describe("Création : aptitudes et bénédictions visées", () => {
  it("une liste par emplacement ; choisir et libérer une aptitude", async () => {
    const app = await openBuild("", { empty: true });
    const slots = within(panel("Aptitudes visées")).getAllByRole("combobox");
    expect(slots).toHaveLength(6);
    await app.user.selectOptions(slots[0], "lugh:lucky-touch");
    expect(slots[0].closest(".slot")).toHaveAttribute("data-fae", "lugh");
    expect(within(slots[0]).getByRole("option", { name: "Lugh · Lucky Touch" })).toBeInTheDocument();
    expect((await stored(app, "id-1")).abilities.light).toBe("lugh:lucky-touch");
    await app.user.selectOptions(slots[0], "");
    expect((await stored(app, "id-1")).abilities.light).toBeNull();
    expect(screen.getByText("Choisissez une aptitude ou une bénédiction.")).toBeInTheDocument();
  });

  it("prérequis colorés : vert avec ✓ si remplis, orange sinon", async () => {
    await openBuild();
    const targets = panel("Bénédictions visées");
    const clover = within(targets).getByText("Critical Clover").closest(".bitem") as HTMLElement;
    const ok = clover.querySelector(".req-ok");
    expect(ok).toHaveTextContent("✓ un effet Critique");
    expect(clover).not.toHaveClass("warn");
    const opportunistic = within(targets).getByText("Opportunistic").closest(".bitem") as HTMLElement;
    expect(opportunistic.querySelector(".req")).toHaveTextContent("Prérequis : ✓ Relentless ou Unmatched Power");
  });

  it("bénédiction verrouillée en restreint : ligne orange", async () => {
    const app = await openBuild();
    const slots = within(panel("Aptitudes visées")).getAllByRole("combobox");
    for (const s of slots) await app.user.selectOptions(s, "");
    const clover = within(panel("Bénédictions visées")).getByText("Critical Clover").closest(".bitem") as HTMLElement;
    expect(clover).toHaveClass("warn");
    expect(clover.querySelector(".req-miss")).toHaveTextContent("un effet Critique");
  });

  it("priorité Essentielle ↔ Bonus et retrait", async () => {
    const app = await openBuild();
    const targets = panel("Bénédictions visées");
    const row = within(targets).getByText("Collector").closest(".bitem") as HTMLElement;
    await app.user.click(within(row).getByRole("button", { name: "Bonus" }));
    expect(within(row).getByRole("button", { name: "Essentielle" })).toHaveAttribute("data-p", "core");
    expect((await stored(app, "ex-1")).targets.find((x) => x.id === "lugh:collector")?.prio).toBe("core");
    await app.user.click(within(row).getByRole("button", { name: "Essentielle" }));
    await app.user.click(within(targets).getByRole("button", { name: "Retirer Collector" }));
    expect(within(targets).queryByText("Collector")).not.toBeInTheDocument();
    expect((await stored(app, "ex-1")).targets.map((x) => x.id)).not.toContain("lugh:collector");
  });

  it("build sans cible : message", async () => {
    await openBuild("", { empty: true });
    expect(screen.getByText("Aucune bénédiction visée. Ajoutez celles qui font tourner le build.")).toBeInTheDocument();
    expect(screen.getByText("Il faut deux fae pour débloquer un duo.")).toBeInTheDocument();
  });
});

describe("Création : fae, potions, ordre d'acquisition", () => {
  it("totaux de bénédictions nécessaires par fae, mis à jour quand on vise", async () => {
    const app = await openBuild("Spirale de givre");
    const faes = () => panel("Fae du build · bénédictions nécessaires");
    expect(faes().querySelector(".faes")).toHaveTextContent("Beira ×4Oberon ×2Duos ×1");
    expect(within(faes()).getByText(/les duos sont comptés à part/)).toBeInTheDocument();
    const slots = within(panel("Aptitudes visées")).getAllByRole("combobox");
    await app.user.selectOptions(slots[0], "oberon:tempest-touch");
    expect(faes().querySelector(".faes")).toHaveTextContent("Beira ×4Oberon ×3Duos ×1");
  });

  it("build vide : invitation au lieu des totaux", async () => {
    await openBuild("", { empty: true });
    expect(within(panel("Fae du build · bénédictions nécessaires")).getByText("Choisissez une aptitude ou une bénédiction.")).toBeInTheDocument();
  });

  it("4 potions dans l'ordre, une fae par case", async () => {
    const app = await openBuild("Spirale de givre");
    const pots = within(panel("Potions · ordre de prise"));
    expect((pots.getByRole("combobox", { name: "Potion 1" }) as HTMLSelectElement).value).toBe("beira");
    const last = pots.getByRole("combobox", { name: "Potion 4" }) as HTMLSelectElement;
    expect(last.value).toBe("");
    expect(last.closest(".pot")).not.toHaveClass("filled");
    await app.user.selectOptions(last, "titania");
    expect(last.closest(".pot")).toHaveClass("filled");
    expect(last.closest(".pot")).toHaveAttribute("data-fae", "titania");
    expect((await stored(app, "ex-2")).potions).toEqual(["beira", "beira", "oberon", "titania"]);
    await app.user.selectOptions(pots.getByRole("combobox", { name: "Potion 1" }), "");
    expect((await stored(app, "ex-2")).potions).toEqual([null, "beira", "oberon", "titania"]);
  });

  it("ordre par défaut : aptitudes par emplacement puis visées ; ↑ / ↓ désactivés aux extrémités", async () => {
    await openBuild("Spirale de givre");
    const ord = within(panel("Ordre d'acquisition · 7"));
    const names = ord.getAllByRole("listitem").map((li) => li.querySelector(".bn")?.textContent);
    expect(names).toEqual(["Chilling Flourish", "Chilling Dash", "Storm Falcon", "Spell Caster", "Mana Well", "Nova Surge", "Onslaught"]);
    expect(ord.getByRole("button", { name: "Monter Chilling Flourish" })).toBeDisabled();
    expect(ord.getByRole("button", { name: "Descendre Onslaught" })).toBeDisabled();
    expect(ord.queryByRole("button", { name: "Ordre par défaut" })).not.toBeInTheDocument();
  });

  it("↑ / ↓ déplacent, le focus suit l'élément ; « Ordre par défaut » revient à l'ordre du plan", async () => {
    const app = await openBuild("Spirale de givre");
    const ord = () => within(panel("Ordre d'acquisition · 7"));
    await app.user.click(ord().getByRole("button", { name: "Descendre Chilling Flourish" }));
    expect(ord().getAllByRole("listitem")[1]).toHaveTextContent("Chilling Flourish");
    expect(ord().getByRole("button", { name: "Descendre Chilling Flourish" })).toHaveFocus();
    expect((await stored(app, "ex-2")).order?.slice(0, 2)).toEqual(["beira:chilling-dash", "beira:chilling-flourish"]);

    // À l'extrémité, le focus passe sur le bouton qui reste actif.
    await app.user.click(ord().getByRole("button", { name: "Monter Mana Well" }));
    await app.user.click(ord().getByRole("button", { name: "Monter Mana Well" }));
    await app.user.click(ord().getByRole("button", { name: "Monter Mana Well" }));
    await app.user.click(ord().getByRole("button", { name: "Monter Mana Well" }));
    expect(ord().getAllByRole("listitem")[0]).toHaveTextContent("Mana Well");
    expect(ord().getByRole("button", { name: "Descendre Mana Well" })).toHaveFocus();

    await app.user.click(ord().getByRole("button", { name: "Ordre par défaut" }));
    expect(ord().getAllByRole("listitem")[0]).toHaveTextContent("Chilling Flourish");
    expect(ord().queryByRole("button", { name: "Ordre par défaut" })).not.toBeInTheDocument();
    expect((await stored(app, "ex-2")).order).toEqual([]);
  });

  it("une bénédiction visée arrive en fin d'ordre ; une retirée en sort, et l'ordre enregistré est nettoyé", async () => {
    const app = await openBuild();
    expect(within(panel("Ordre d'acquisition · 11")).getAllByRole("listitem")[2]).toHaveTextContent("Critical Clover");
    await app.user.click(within(panel("Bénédictions visées")).getByRole("button", { name: "Retirer Critical Clover" }));
    expect(screen.getByRole("heading", { name: "Ordre d'acquisition · 10" })).toBeInTheDocument();
    expect((await stored(app, "ex-1")).order).not.toContain("lugh:critical-clover");

    await app.user.click(within(panel("Bénédictions visées")).getByRole("button", { name: "Ajouter" }));
    await app.user.click(within(dialog()).getByRole("button", { name: /^Critical Clover/ }));
    const items = within(panel("Ordre d'acquisition · 11")).getAllByRole("listitem");
    expect(items[items.length - 1]).toHaveTextContent("Critical Clover");
  });

  it("build vide : rien à ordonner", async () => {
    await openBuild("", { empty: true });
    expect(screen.getByText("Choisissez des aptitudes et des bénédictions pour les ordonner.")).toBeInTheDocument();
  });
});

describe("Création : duos, enclumes, notes", () => {
  it("duos atteignables : en restreint seulement les débloqués ; Viser ajoute en bonus", async () => {
    const app = await openBuild("", { empty: true });
    const slots = within(panel("Aptitudes visées")).getAllByRole("combobox");
    await app.user.selectOptions(slots[0], "lugh:lucky-touch");
    await app.user.selectOptions(slots[2], "beira:chilling-flourish");
    const duos = () => panel("Duos atteignables");
    expect(within(duos()).queryByText("Flash Freeze")).not.toBeInTheDocument();

    await app.user.click(screen.getByRole("button", { name: "Libre" }));
    const row = within(duos()).getByText("Flash Freeze").closest(".bitem") as HTMLElement;
    await app.user.click(within(row).getByRole("button", { name: "Viser" }));
    expect(within(duos()).queryByText("Flash Freeze")).not.toBeInTheDocument();
    expect(within(panel("Bénédictions visées")).getByText("Flash Freeze")).toBeInTheDocument();
    expect((await stored(app, "id-1")).targets).toEqual([{ id: "duo:flash-freeze", prio: "bonus" }]);
  });

  it("enclumes de l'arme puis du sort ; un toucher vise ou retire", async () => {
    const app = await openBuild();
    const anvils = panel("Enclumes · augments de l'arme et du sort");
    expect(within(anvils).getByText("Arme · Chakrams")).toBeInTheDocument();
    expect(within(anvils).getByText("Sort · Shadow Strike")).toBeInTheDocument();
    const aug = within(anvils).getAllByRole("button")[0];
    expect(aug).toHaveAttribute("aria-pressed", "false");
    await app.user.click(aug);
    expect(aug).toHaveAttribute("aria-pressed", "true");
    expect((await stored(app, "ex-1")).anvils).toHaveLength(1);
    await app.user.click(aug);
    expect((await stored(app, "ex-1")).anvils).toEqual([]);
  });

  it("notes enregistrées", async () => {
    const app = await openBuild("Spirale de givre");
    await app.user.type(screen.getByRole("textbox", { name: /Ordre de prise/ }), "Givre d'abord");
    expect((await stored(app, "ex-2")).notes).toBe("Givre d'abord");
  });

  it("lancer un run depuis la Création", async () => {
    const app = await openBuild();
    await app.user.click(screen.getByRole("button", { name: "Lancer un run" }));
    expect(screen.getByTitle("Run en cours")).toBeInTheDocument();
  });
});

describe("sélecteur « Ajouter »", () => {
  it("restreint : Critical Clover passe de verrouillée à disponible avec une aptitude de Lugh", async () => {
    const app = await openBuild("", { empty: true });
    await app.user.click(screen.getByRole("button", { name: "Ajouter" }));
    await app.user.type(within(dialog()).getByRole("searchbox"), "critical clover");
    expect(within(dialog()).getByText("Disponibles · 0")).toBeInTheDocument();
    expect(within(dialog()).getByText(/Rien de débloqué ici/)).toBeInTheDocument();
    const locked = within(dialog()).getByText("Verrouillées · 1 (il manque une aptitude)");
    expect(locked.closest("details")).toHaveAttribute("open");
    const row = within(dialog()).getByText("Critical Clover").closest(".bitem")!;
    expect(row).toHaveClass("locked");
    expect(row.tagName).toBe("DIV");
    await app.user.click(within(dialog()).getByRole("button", { name: "Fermer" }));

    const slots = within(panel("Aptitudes visées")).getAllByRole("combobox");
    await app.user.selectOptions(slots[0], "lugh:lucky-touch");
    await app.user.click(screen.getByRole("button", { name: "Ajouter" }));
    await app.user.type(within(dialog()).getByRole("searchbox"), "critical clover");
    expect(within(dialog()).getByText("Disponibles · 1")).toBeInTheDocument();
    await app.user.click(within(dialog()).getByRole("button", { name: /Critical Clover/ }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText("Critical Clover visée")).toBeInTheDocument();
    expect((await stored(app, "id-1")).targets).toEqual([{ id: "lugh:critical-clover", prio: "bonus" }]);
  });

  it("libre : tout est cliquable, sans sections", async () => {
    const app = await openBuild("", { empty: true });
    await app.user.click(screen.getByRole("button", { name: "Libre" }));
    await app.user.click(screen.getByRole("button", { name: "Ajouter" }));
    expect(within(dialog()).queryByText(/Disponibles/)).not.toBeInTheDocument();
    expect(within(dialog()).queryByText(/Verrouillées/)).not.toBeInTheDocument();
    await app.user.type(within(dialog()).getByRole("searchbox"), "zzz");
    expect(within(dialog()).getByText("Aucun résultat. Ajoutez-la depuis le Catalogue.")).toBeInTheDocument();
  });

  it("choisir une aptitude la place dans son emplacement ; pas de ligne de prérequis pour une aptitude", async () => {
    const app = await openBuild("", { empty: true });
    await app.user.click(screen.getByRole("button", { name: "Ajouter" }));
    await app.user.type(within(dialog()).getByRole("searchbox"), "lucky touch");
    expect(within(dialog()).getByRole("button", { name: /Lucky Touch/ }).querySelector(".req")).toBeNull();
    await app.user.click(within(dialog()).getByRole("button", { name: /Lucky Touch/ }));
    expect((await stored(app, "id-1")).abilities.light).toBe("lugh:lucky-touch");
  });

  it("une bénédiction déjà visée reste telle quelle", async () => {
    const app = await openBuild();
    await app.user.click(screen.getByRole("button", { name: "Ajouter" }));
    await app.user.type(within(dialog()).getByRole("searchbox"), "collector");
    const row = within(dialog()).getByRole("button", { name: /^Collector/ });
    expect(row).toHaveClass("got");
    await app.user.click(row);
    expect((await stored(app, "ex-1")).targets.filter((x) => x.id === "lugh:collector")).toEqual([{ id: "lugh:collector", prio: "bonus" }]);
  });

  it("filtre par fae, change de mode dans l'en-tête, se ferme par Échap et par le fond", async () => {
    const app = await openBuild("", { empty: true });
    await app.user.click(screen.getByRole("button", { name: "Ajouter" }));
    await app.user.click(within(dialog()).getByRole("button", { name: "Oberon" }));
    expect(within(dialog()).getByRole("button", { name: "Oberon" })).toHaveAttribute("aria-pressed", "true");
    expect(within(dialog()).queryByText("Lucky Touch")).not.toBeInTheDocument();
    await app.user.click(within(dialog()).getByRole("button", { name: "Toutes" }));
    expect(within(dialog()).getByText("Lucky Touch")).toBeInTheDocument();

    const types = within(within(dialog()).getByRole("group", { name: "Type" }));
    await app.user.click(types.getByRole("button", { name: "Duos" }));
    expect(types.getByRole("button", { name: "Duos" })).toHaveAttribute("aria-pressed", "true");
    expect(within(dialog()).queryByText("Lucky Touch")).not.toBeInTheDocument();
    expect(within(dialog()).queryByText("Critical Clover")).not.toBeInTheDocument();
    await app.user.click(types.getByRole("button", { name: "Aptitudes" }));
    expect(within(dialog()).getByText("Lucky Touch")).toBeInTheDocument();
    await app.user.click(types.getByRole("button", { name: "Tous types" }));

    await app.user.click(within(dialog()).getByRole("button", { name: "Libre" }));
    expect((await stored(app, "id-1")).mode).toBe("free");
    expect(within(dialog()).queryByText(/Verrouillées/)).not.toBeInTheDocument();

    await app.user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await app.user.click(screen.getByRole("button", { name: "Ajouter" }));
    await app.user.click(dialog().parentElement!);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
