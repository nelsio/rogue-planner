import type { Page } from "@playwright/test";

/** Lit tout un magasin de la base IndexedDB de la page (clés et valeurs). */
export function readStore(page: Page, store: "builds" | "runs" | "custom" | "prefs") {
  return page.evaluate(
    (name) =>
      new Promise<{ keys: IDBValidKey[]; values: unknown[] }>((resolve, reject) => {
        const open = indexedDB.open("rogue-planner");
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const s = open.result.transaction(name).objectStore(name);
          const keys = s.getAllKeys();
          const values = s.getAll();
          values.onsuccess = () => {
            resolve({ keys: keys.result, values: values.result });
            open.result.close();
          };
        };
      }),
    store,
  );
}

export async function storedPref(page: Page, key: string): Promise<unknown> {
  const { keys, values } = await readStore(page, "prefs");
  return values[keys.indexOf(key)];
}
