import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { preloadAll } from "./render/assets/spriteLoader";
import { AppFlowProvider } from "./state/appFlowContext";
import { SettingsLocaleProvider, SettingsProvider } from "./settings/SettingsContext";
import "./index.css";
import "./styles/phase4b.css";
import "./styles/phase5b.css";

class RootElementMissingError extends Error {
  public constructor() {
    super("Root element #root was not found.");
    this.name = "RootElementMissingError";
  }
}

const rootElement = document.getElementById("root");

if (rootElement === null) {
  throw new RootElementMissingError();
}

void preloadAll();

createRoot(rootElement).render(
  <StrictMode>
    <SettingsProvider>
      <SettingsLocaleProvider>
        <AppFlowProvider>
          <App />
        </AppFlowProvider>
      </SettingsLocaleProvider>
    </SettingsProvider>
  </StrictMode>,
);
