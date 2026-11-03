// Scénario e2e 4 (HANDOFF §9.2, §6.7) : sur mobile, barre d'onglets en bas, aucun défilement horizontal sur chaque
// écran, cibles tactiles d'au moins 40 px.
import { expect, test, type Page } from "@playwright/test";

test.skip(({ isMobile }) => !isMobile, "mobile seulement");

const noHorizontalScroll = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

/**
 * Cibles visibles de moins de 40 px de haut (ou de large), décrites par leur texte. Un select dans la pastille de jeu
 * est mesuré par la pastille, qui est sa cible tactile (WebKit fige la hauteur d'un select natif).
 */
const smallTargets = (page: Page, scope = "body") =>
  page.evaluate((sel) => {
    const root = document.querySelector(sel)!;
    return [...root.querySelectorAll<HTMLElement>("button, select, summary")]
      .map((el) => ({ el, r: (el.closest("label.game") ?? el).getBoundingClientRect() }))
      .filter(({ r }) => r.width > 0 && r.height > 0 && (r.height < 39.5 || r.width < 39.5))
      .map(({ el, r }) => `${el.tagName.toLowerCase()} « ${(el.textContent ?? "").trim().slice(0, 30)} » ${Math.round(r.width)}×${Math.round(r.height)}`);
  }, scope);

async function check(page: Page, name: string, scope?: string) {
  expect(await noHorizontalScroll(page), `${name} : défilement horizontal`).toBe(true);
  expect(await smallTargets(page, scope), `${name} : cibles de moins de 40 px`).toEqual([]);
}

test("chaque écran : onglets en bas, pas de défilement horizontal, cibles de 40 px", async ({ page }) => {
  await page.goto("");
  const nav = page.getByRole("navigation");
  const box = (await nav.boundingBox())!;
  expect(box.y + box.height).toBeGreaterThan(page.viewportSize()!.height - 2);

  await check(page, "Builds");
  await page.getByRole("button", { name: "Importer / exporter" }).click();
  await check(page, "Importer / exporter", "[role=dialog]");
  await page.getByRole("button", { name: "Fermer" }).click();

  await page.getByRole("article", { name: "Critiques et séismes" }).getByRole("button", { name: "Modifier" }).click();
  await check(page, "Création");
  await page.getByRole("button", { name: "Ajouter", exact: true }).click();
  await check(page, "Sélecteur (Création)", "[role=dialog]");
  await page.getByRole("button", { name: "Fermer" }).click();

  await page.getByRole("button", { name: "Lancer un run" }).click();
  await page.getByRole("button", { name: "+ Bénédiction" }).click();
  await check(page, "Sélecteur (RUN)", "[role=dialog]");
  await page.getByRole("dialog").locator("button.bitem").first().click();
  await page.getByRole("button", { name: "Terminer le run" }).click();
  await check(page, "RUN");
  await page.getByRole("button", { name: "Enregistrer dans l'historique" }).click();

  await expect(page.getByRole("table")).toBeVisible();
  await check(page, "Historique");
  await nav.getByRole("button", { name: "Catalogue" }).click();
  await check(page, "Catalogue");
});
