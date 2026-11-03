// Scénarios e2e 2 et 5 (HANDOFF §9.2) : run complet jusqu'à l'historique ; run actif retrouvé au rechargement.
import { expect, test, type Page } from "@playwright/test";
import type { Run } from "@rogue/core";
import { readStore } from "./helpers";

const dialog = (page: Page) => page.getByRole("dialog", { name: "Choisir une bénédiction" });

async function pick(page: Page, name: string) {
  await page.getByRole("button", { name: "+ Bénédiction" }).click();
  await dialog(page).getByRole("searchbox").fill(name);
  await dialog(page).getByRole("button", { name: new RegExp(`^${name}`) }).first().click();
  await expect(dialog(page)).toHaveCount(0);
}

test("scénario 2 : trois prises dont une hors plan, une enclume prévue, victoire, historique", async ({ page }) => {
  await page.goto("");
  const card = page.getByRole("article", { name: "Critiques et séismes" });
  await card.getByRole("button", { name: "Modifier" }).click();
  // Enclume visée dans le build : la première de l'arme.
  const planned = page.locator(".aug").first();
  const anvil = (await planned.locator(".bn").textContent())!;
  await planned.click();
  await page.getByRole("button", { name: "Lancer un run" }).click();
  await expect(page.getByText(/^Mode RUN · commencé à/)).toBeVisible();

  await pick(page, "Lucky Touch");
  await pick(page, "Critical Clover");
  await pick(page, "Nimble");
  const log = page.locator(".log .bitem");
  await expect(log).toHaveCount(3);
  await expect(log.nth(2)).toContainText("hors plan");
  await expect(page.locator(".meter")).toContainText("1/3");

  const aug = page.locator(".aug.planned", { hasText: anvil });
  await expect(aug.getByText("prévu")).toBeVisible();
  await aug.click();
  await expect(aug).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("heading", { name: "Enclumes · 1 pris" })).toBeVisible();

  await page.getByRole("button", { name: "Terminer le run" }).click();
  await page.getByRole("group", { name: "Résultat" }).getByRole("button", { name: "Victoire" }).click();
  await page.getByRole("textbox", { name: "Jusqu'où ?" }).fill("Boss final");
  await page.getByRole("button", { name: "Enregistrer dans l'historique" }).click();

  await expect(page.getByRole("heading", { name: "Runs terminés" })).toBeVisible();
  const row = page.getByRole("row").filter({ hasText: "Boss final" });
  await expect(row).toContainText("Critiques et séismes");
  await expect(row).toContainText("Victoire");
  await expect(row.locator(".mono.muted")).toHaveText("3");
  await expect(page.getByTitle("Run en cours")).toHaveCount(0);
});

test("scénario 5 : le run actif est retrouvé au rechargement", async ({ page }) => {
  await page.goto("");
  await page.getByRole("button", { name: "Run sans build" }).click();
  await pick(page, "Collector");
  await expect(page.locator(".log .bitem")).toHaveCount(1);
  // Les écritures IndexedDB sont asynchrones : on attend la prise en base avant de recharger.
  await expect
    .poll(async () => ((await readStore(page, "runs")).values as Run[]).find((r) => r.status === "active")?.picks.length)
    .toBe(1);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Run libre" })).toBeVisible();
  await expect(page.locator(".log .bitem")).toContainText("Collector");
  await expect(page.getByTitle("Run en cours")).toBeVisible();
});

test("RUN et historique sans défilement horizontal de la page", async ({ page }) => {
  await page.goto("");
  await page.getByRole("button", { name: "Run sans build" }).click();
  await pick(page, "Collector");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole("navigation").getByRole("button", { name: "Historique" }).click();
  await expect(page.getByRole("table")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
