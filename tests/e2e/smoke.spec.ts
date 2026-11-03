import { expect, test } from "@playwright/test";

test("la page Rogue Planner s'affiche sans défilement horizontal", async ({ page }) => {
  await page.goto("");
  await expect(page.getByRole("heading", { name: "Rogue Planner" })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
});
