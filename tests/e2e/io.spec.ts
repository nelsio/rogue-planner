// Scénario e2e 3 (HANDOFF §9.2) : exporter, vider le stockage, importer : tout est revenu.
import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { readStore } from "./helpers";

test("export, stockage vidé, import : tout est revenu", async ({ page }) => {
  await page.goto("");
  // Des données à soi : un build renommé, une bénédiction ajoutée, un run terminé.
  await page.getByRole("button", { name: "Nouveau build" }).click();
  await page.getByRole("textbox", { name: "Nom du build" }).fill("Mon build");
  await page.getByRole("navigation").getByRole("button", { name: "Catalogue" }).click();
  await page.getByRole("textbox", { name: "Nom", exact: true }).fill("Blood Clot");
  await page.getByRole("button", { name: "Ajouter au catalogue" }).click();
  await page.getByRole("navigation").getByRole("button", { name: "Builds" }).click();
  await page.getByRole("article", { name: "Mon build" }).getByRole("button", { name: "Lancer un run" }).click();
  await page.getByRole("button", { name: "Terminer le run" }).click();
  await page.getByRole("button", { name: "Enregistrer dans l'historique" }).click();
  await expect(page.getByRole("heading", { name: "Runs terminés" })).toBeVisible();

  await page.getByRole("navigation").getByRole("button", { name: "Builds" }).click();
  await page.getByRole("button", { name: "Importer / exporter" }).click();
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "Télécharger" }).click();
  const download = await downloading;
  expect(download.suggestedFilename()).toMatch(/^rogue-planner-\d{4}-\d{2}-\d{2}\.json$/);
  const exported = JSON.parse(await readFile((await download.path())!, "utf8"));
  expect(exported.builds).toHaveLength(3);
  expect(exported.custom).toHaveLength(1);

  // Vider le stockage : la base est supprimée, puis la page rechargée (les exemples reviennent).
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const del = indexedDB.deleteDatabase("rogue-planner");
        del.onsuccess = () => resolve();
        del.onerror = () => reject(del.error);
      }),
  );
  await page.reload();
  await expect(page.getByRole("article", { name: "Critiques et séismes" })).toBeVisible();
  await expect(page.getByRole("article", { name: "Mon build" })).toHaveCount(0);

  await page.getByRole("button", { name: "Importer / exporter" }).click();
  await page.getByLabel("Fichier JSON").setInputFiles((await download.path())!);
  await page.getByRole("button", { name: "Importer par fusion" }).click();
  // Les exemples rechargés sont remplacés ; le build, le run et la bénédiction ajoutée reviennent.
  await expect(page.getByRole("status").filter({ hasText: "importés" })).toHaveText("6 éléments importés (3 ajoutés, 3 remplacés)");
  await page.getByRole("button", { name: "Fermer" }).click();

  await expect(page.getByRole("article", { name: "Mon build" })).toBeVisible();
  await page.getByRole("navigation").getByRole("button", { name: "Historique" }).click();
  await expect(page.getByRole("row").filter({ hasText: "Mon build" })).toBeVisible();
  await page.getByRole("navigation").getByRole("button", { name: "Catalogue" }).click();
  await expect(page.locator(".bitem", { hasText: "Blood Clot" })).toBeVisible();

  await expect.poll(async () => (await readStore(page, "custom")).values.length).toBe(1);
  await page.reload();
  await expect(page.locator(".bitem", { hasText: "Blood Clot" })).toBeVisible();
});
