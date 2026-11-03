/// <reference types="vitest/config" />
import { fileURLToPath } from "node:url";
import { rename } from "node:fs/promises";
import { join } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

// Livrable unique : dist/index.html est renommé en dist/rogue-planner.html.
function renameOutput(): Plugin {
  let outDir = "dist";
  return {
    name: "rogue-planner:rename-output",
    apply: "build",
    configResolved(config) {
      outDir = config.build.outDir;
    },
    async closeBundle() {
      await rename(join(outDir, "index.html"), join(outDir, "rogue-planner.html"));
    },
  };
}

export default defineConfig({
  base: "./",
  plugins: [react(), viteSingleFile(), renameOutput()],
  resolve: {
    alias: {
      "@rogue/core": fileURLToPath(new URL("./src/core/index.ts", import.meta.url)),
    },
  },
  build: {
    // Polices et icônes embarquées en data URI : le fichier marche aussi en file://.
    assetsInlineLimit: Number.MAX_SAFE_INTEGER,
  },
  test: {
    environment: "jsdom",
    include: ["tests/**/*.spec.{ts,tsx}"],
    exclude: ["tests/e2e/**"],
    setupFiles: ["tests/setup.ts"],
    coverage: {
      provider: "v8",
      include: ["src/core/**"],
      thresholds: { lines: 100 },
    },
  },
});
