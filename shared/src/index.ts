/**
 * Feature: Shared Package Barrel Export
 * Purpose: Exposes centralised config, Zod schemas/types, and structured logger from @apna-area/shared.
 * Inputs: Internal shared modules.
 * Outputs: Named exports consumed by server and web workspaces.
 * Deliberately excludes: Side-effectful initialisation at import time.
 */
export * from "./config.js";
export * from "./types.js";
export * from "./logger.js";
