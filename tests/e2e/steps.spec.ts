// Scénario e2e 6 (HANDOFF §9.2) : ordre choisi en Création, suivi pas à pas en RUN, totaux et potions.
import { expect, test } from "@playwright/test";

test("scénario 6 : bénédiction remontée en tête, Prise, Passer, potion prévue", async ({ page }) => {
  await page.goto("");
  await page.getByRole("article", { name: "Critiques et séismes" }).getByRole("button", { name: "Modifier" }).click();
  const order = page.locator(".ord li");
  await expect(order.nth(9)).toContainText("Collector");
  // Le focus suit l'élément : Entrée le remonte d'un cran à chaque fois.
  await page.getByRole("button", { name: "Monter Collector" }).click();
  for (let i = 0; i < 8; i++) await page.keyboard.press("Enter");
  await expect(order.first()).toContainText("Collector");

  await page.getByRole("button", { name: "Lancer un run" }).click();
  const card = page.locator(".step");
  await expect(card).toContainText("Étape 1 · bonus");
  await expect(card).toContainText("Collector");

  const lugh = page.getByTitle(/^Lugh : \d+ prise/);
  await expect(lugh).toContainText("0/5");
  await card.getByRole("button", { name: "Prise" }).click();
  await expect(card).toContainText("Étape 2 · aptitude");
  await expect(card).toContainText("Lucky Touch");
  await expect(lugh).toContainText("1/5");

  await card.getByRole("button", { name: "Passer pour l'instant" }).click();
  await expect(card).toContainText("Étape 3 · aptitude");
  await expect(card).toContainText("Mighty Dash");

  await page.getByRole("button", { name: "Prendre la prévue : Lugh" }).click();
  const pots = page.locator(".pots .pot");
  await expect(pots.nth(0)).toHaveClass(/filled/);
  await expect(pots.nth(0)).toContainText("Lugh");
  await expect(pots.nth(1)).toHaveClass(/next/);
});
