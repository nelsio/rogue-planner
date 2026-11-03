import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { swornExamples, swornPack } from "../../src/games/sworn";
import { loadExamples, memoryStorage, type Storage } from "../../src/storage";
import { App } from "../../src/ui/App";
import { AppProvider } from "../../src/ui/context";
import type { Env } from "../../src/ui/factory";
import { initialState } from "../../src/ui/state";

/** Horloge et identifiants prévisibles : id-1, id-2… ; dates qui avancent d'une minute. */
export function testEnv(): Env {
  let n = 0;
  let minute = 0;
  return {
    uuid: () => `id-${++n}`,
    now: () => new Date(Date.UTC(2026, 10, 3, 12, minute++)).toISOString(),
  };
}

/** Monte l'application sur un stockage en mémoire, avec les exemples sauf si `empty`. */
export async function renderApp(opts: { storage?: Storage; empty?: boolean } = {}) {
  const storage = opts.storage ?? memoryStorage();
  if (!opts.storage && !opts.empty) await loadExamples(storage, swornExamples);
  const lib = storage.library;
  const [builds, runs, custom, prefs] = await Promise.all([lib.listBuilds(), lib.listRuns(), lib.listCustom(), storage.prefs.get()]);
  const user = userEvent.setup();
  const view = render(
    <AppProvider initial={initialState({ builds, runs, custom }, prefs)} basePack={swornPack} storage={storage} env={testEnv()}>
      <App />
    </AppProvider>,
  );
  return { ...view, user, storage };
}

/** Laisse passer les écritures asynchrones du stockage. */
export const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
