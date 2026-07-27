import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { preloadAll } from "./render/assets/spriteLoader";
import { AppFlowProvider } from "./state/appFlowContext";
import "./index.css";

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
    <AppFlowProvider>
      <App />
    </AppFlowProvider>
  </StrictMode>,
);
