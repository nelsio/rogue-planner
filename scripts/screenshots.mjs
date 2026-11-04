// Captures du README (hors CI) : `npm run build && node scripts/screenshots.mjs [dossier]`.
// Ouvre le livrable en file:// avec les données d'exemple ; écrit dans docs/img par défaut.
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium, devices } from "@playwright/test";

const outDir = resolve(process.argv[2] ?? "docs/img");
const url = pathToFileURL(resolve("dist/rogue-planner.html")).href;
await mkdir(outDir, { recursive: true });

const desktop = { viewport: { width: 1200, height: 900 }, colorScheme: "light" };
const phone = { ...devices["iPhone 13"], colorScheme: "dark" };

async function pick(page, name) {
  await page.getByRole("button", { name: "+ Bénédiction" }).click();
  await page.getByRole("searchbox").fill(name);
  await page.locator("[role=dialog] button.bitem", { hasText: name }).first().click();
}

const shots = [
  ["bibliotheque", desktop, async () => {}],
  ["creation", desktop, async (page) => {
    await page.getByRole("button", { name: "Modifier" }).first().click();
  }],
  ["run", desktop, async (page) => {
    await page.getByRole("button", { name: "Lancer un run" }).first().click();
    // Pas à pas : une étape prise, une passée ; la potion prévue ; une prise hors plan.
    await page.locator(".step").getByRole("button", { name: "Prise" }).click();
    await page.locator(".step").getByRole("button", { name: "Passer pour l'instant" }).click();
    await page.getByRole("button", { name: /^Prendre la prévue/ }).click();
    await pick(page, "Nimble");
  }],
  ["run-mobile", phone, async (page) => {
    await page.getByRole("button", { name: "Lancer un run" }).first().click();
    for (let i = 0; i < 2; i++) await page.locator(".step").getByRole("button", { name: "Prise" }).click();
  }],
  ["selecteur-mobile", phone, async (page) => {
    await page.getByRole("button", { name: "Modifier" }).first().click();
    await page.getByRole("button", { name: "Ajouter", exact: true }).click();
    await page.getByRole("searchbox").fill("crit");
    await page.getByRole("searchbox").blur();
  }],
];

const browser = await chromium.launch();
for (const [name, ctxOpts, act] of shots) {
  const ctx = await browser.newContext(ctxOpts);
  const page = await ctx.newPage();
  await page.goto(url);
  await act(page);
  // Haut de page, et laisse passer les toasts.
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(1800);
  await page.screenshot({ path: `${outDir}/${name}.png` });
  console.log(`${outDir}/${name}.png`);
  await ctx.close();
}
await browser.close();
