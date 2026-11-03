// Scénario e2e 1 (HANDOFF §9.2) : build en restreint, aptitude de Lugh, Critical Clover déverrouillée.
import { expect, test } from "@playwright/test";

test("Critical Clover passe de verrouillée à disponible avec une aptitude de Lugh", async ({ page }) => {
  await page.goto("");
  await page.getByRole("button", { name: "Nouveau build" }).click();
  await expect(page.getByText("Mode Création")).toBeVisible();
  await expect(page.getByRole("button", { name: "Restreint" })).toHaveAttribute("aria-pressed", "true");

  const dialog = page.getByRole("dialog", { name: "Choisir une bénédiction" });
  const openPicker = async () => {
    await page.getByRole("button", { name: "Ajouter", exact: true }).click();
    await dialog.getByRole("searchbox").fill("critical clover");
  };

  await openPicker();
  await expect(dialog.getByText("Verrouillées · 1 (il manque une aptitude)")).toBeVisible();
  await expect(dialog.locator(".bitem.locked", { hasText: "Critical Clover" })).toBeVisible();
  await expect(dialog.getByRole("button", { name: /Critical Clover/ })).toHaveCount(0);
  await dialog.getByRole("button", { name: "Fermer" }).click();

  const light = page.locator(".slot", { hasText: "Attaque légère" }).getByRole("combobox");
  await light.selectOption("lugh:lucky-touch");

  await openPicker();
  await expect(dialog.getByText("Disponibles · 1")).toBeVisible();
  await expect(dialog.getByText(/Verrouillées/)).toHaveCount(0);
  await dialog.getByRole("button", { name: /Critical Clover/ }).click();
  await expect(dialog).toHaveCount(0);

  const row = page.locator(".bitem", { hasText: "Critical Clover" });
  await expect(row.locator(".req-ok")).toHaveText("✓ un effet Critique");
});

test("le sélecteur tient dans l'écran, sans défilement horizontal", async ({ page }) => {
  await page.goto("");
  await page.getByRole("button", { name: "Nouveau build" }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Ajouter", exact: true }).click();
  const box = await page.getByRole("dialog").boundingBox();
  const vp = page.viewportSize()!;
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(vp.width + 1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
