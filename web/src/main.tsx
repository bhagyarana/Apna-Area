/**
 * Feature: Browser React Entrypoint
 * Purpose: Mounts the Apna Area React tree with global ORR Neon Dusk design tokens.
 * Inputs: DOM #root container in web/index.html.
 * Outputs: Hydrated React StrictMode root.
 * Deliberately excludes: Client-side secret keys or analytics trackers.
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/tokens.css";
import "./styles/shell.css";
import "./styles/map.css";
import "./styles/map3d.css";
import "./styles/picker.css";
import "./styles/tune.css";
import "./styles/hud.css";
import "./styles/mission.css";
import "./styles/live.css";
import "./styles/mic.css";
import "./styles/phrase.css";
import "./styles/score.css";
import "./styles/rubric.css";
import "./styles/kit.css";
import "./styles/confirm.css";
import "./styles/sheet.css";
import { App } from "./App";

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error("Root element #root was not found in index.html.");
}

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
