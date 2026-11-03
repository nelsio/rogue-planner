import { expect, test, type Page } from "@playwright/test";
import { storedPref } from "./helpers";

const noHorizontalScroll = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

test("la bibliothèque s'ouvre avec les builds d'exemple", async ({ page }) => {
  await page.goto("");
  await expect(page.getByRole("heading", { name: "Rogue Planner" })).toBeVisible();
  await expect(page.getByRole("article", { name: "Critiques et séismes" })).toBeVisible();
  await expect(page.getByRole("article", { name: "Spirale de givre" })).toBeVisible();
  await expect(page.getByText(/refuse le stockage/)).toHaveCount(0);
});

test("aucun défilement horizontal, sur chaque écran", async ({ page }) => {
  await page.goto("");
  await expect(page.getByRole("article").first()).toBeVisible();
  expect(await noHorizontalScroll(page)).toBe(true);
  for (const tab of ["Run", "Historique", "Catalogue", "Builds"]) {
    await page.getByRole("navigation").getByRole("button", { name: tab, exact: true }).click();
    expect(await noHorizontalScroll(page), tab).toBe(true);
  }
});

test("sur mobile, la barre d'onglets est fixée en bas", async ({ page, isMobile }) => {
  test.skip(!isMobile, "mobile seulement");
  await page.goto("");
  const nav = await page.getByRole("navigation").boundingBox();
  const height = page.viewportSize()!.height;
  expect(nav).not.toBeNull();
  expect(nav!.y + nav!.height).toBeGreaterThan(height - 2);
});

test("les données survivent au rechargement", async ({ page }) => {
  await page.goto("");
  const card = page.getByRole("article", { name: "Spirale de givre" });
  await card.getByRole("button", { name: "Dupliquer" }).click();
  await expect(page.getByRole("article", { name: "Spirale de givre (copie)" })).toBeVisible();
  await page.getByRole("button", { name: "Run sans build" }).click();
  await expect(page.getByTitle("Run en cours")).toBeVisible();
  // Les écritures IndexedDB sont asynchrones : on attend qu'elles soient validées avant de recharger.
  await expect.poll(() => storedPref(page, "lastView")).toBe("run");
  await page.reload();
  await expect(page.getByRole("article", { name: "Spirale de givre (copie)" })).toHaveCount(0); // vue Run retenue
  await expect(page.getByTitle("Run en cours")).toBeVisible();
  await page.getByRole("navigation").getByRole("button", { name: "Builds" }).click();
  await expect(page.getByRole("article", { name: "Spirale de givre (copie)" })).toBeVisible();
});
