import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./ui/fonts";
import "./ui/theme.css";
import { swornExamples, swornPack } from "./games/sworn";
import { App } from "./ui/App";
import { boot } from "./ui/boot";
import { AppProvider } from "./ui/context";
import { browserEnv } from "./ui/factory";
import { injectFaeColors } from "./ui/theme";

injectFaeColors(swornPack);
const { storage, initial } = await boot(swornExamples);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppProvider initial={initial} basePack={swornPack} storage={storage} env={browserEnv}>
      <App />
    </AppProvider>
  </StrictMode>,
);
