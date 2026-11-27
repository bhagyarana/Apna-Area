/**
 * Feature: Server Process Entrypoint
 * Purpose: Reads Cloud Run PORT and secret env vars, boots the Fastify server on 0.0.0.0, and handles graceful shutdown.
 * Inputs: Process environment variables (PORT, GEMINI_API_KEY, MAPS_BROWSER_KEY, MAPS_SERVER_KEY, GIT_COMMIT, BUILD_TIME).
 * Outputs: Active HTTP listener on 0.0.0.0:$PORT and structured startup/shutdown logs.
 * Deliberately excludes: Route logic (delegated to server/src/app.ts).
 */
import { logger } from "@apna-area/shared";
import { buildServer } from "./app.js";

/**
 * Starts the HTTP server and attaches SIGINT/SIGTERM handlers.
 */
async function start(): Promise<void> {
  const port = Number(process.env.PORT ?? "8080");
  const host = "0.0.0.0";

  const app = await buildServer({
    version: process.env.npm_package_version ?? "0.1.0",
    commit: process.env.GIT_COMMIT ?? "local",
    builtAt: process.env.BUILD_TIME ?? new Date().toISOString(),
    geminiApiKey: process.env.GEMINI_API_KEY,
    mapsBrowserKey: process.env.MAPS_BROWSER_KEY,
    mapsServerKey: process.env.MAPS_SERVER_KEY,
    mapId: process.env.MAPS_MAP_ID,
  });

  const shutdown = async (signal: string) => {
    logger.info("server.shutdown", { meta: { signal } });
    await app.close();
    process.exit(0);
  };

  process.once("SIGINT", () => void shutdown("SIGINT"));
  process.once("SIGTERM", () => void shutdown("SIGTERM"));

  await app.listen({ port, host });
  logger.info("server.listening", {
    meta: { host, port, commit: process.env.GIT_COMMIT ?? "local" },
  });
}

start().catch((err: unknown) => {
  logger.error("server.boot_failed", {
    meta: { error: err instanceof Error ? err.message : String(err) },
  });
  process.exit(1);
});
