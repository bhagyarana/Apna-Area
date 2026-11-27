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
