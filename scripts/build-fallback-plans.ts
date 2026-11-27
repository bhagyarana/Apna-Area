/**
 * Feature: Build-Time Real Fallback WeekPlan Generator (scripts/build-fallback-plans.ts)
 * Purpose: Calls live Gemini 4 Neon across verified ORR tech parks in data/orr/places.json to populate data/orr/fallback-plans.json for cold-503 resilience.
 * Inputs: GEMINI_API_KEY from .env.local or .env and verified data/orr/places.json.
 * Outputs: Verified data/orr/fallback-plans.json and recorded contract test fixture in server/src/__tests__/fixtures/director-neon.json.
 * Deliberately excludes: Hand-authored or mocked WeekPlan fixtures.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { logger, VerifiedPlacesDatasetSchema, type WeekPlan } from "@apna-area/shared";
import { createWorldPlanCache } from "../server/src/world/cache.js";
import { createGenAiInteractionRunner, generateWeekPlan } from "../server/src/world/director.js";

if (existsSync(".env.local")) {
  process.loadEnvFile(".env.local");
} else if (existsSync(".env")) {
  process.loadEnvFile(".env");
}

const geminiKey = process.env.GEMINI_API_KEY?.trim();
if (!geminiKey) {
  throw new Error("GEMINI_API_KEY is required in .env.local or .env to build fallback-plans.json.");
}

async function main(): Promise<void> {
  const dataset = VerifiedPlacesDatasetSchema.parse(
    JSON.parse(readFileSync(path.resolve("data/orr/places.json"), "utf-8")) as unknown,
  );
  const techParks = dataset.places.filter((p) => p.category === "tech_park");
  const runner = createGenAiInteractionRunner(geminiKey as string);
  const cache = createWorldPlanCache();
  const plansByOffice: Record<string, WeekPlan> = {};

  for (let i = 0; i < techParks.length; i += 3) {
    const chunk = techParks.slice(i, i + 3);
    await Promise.all(
      chunk.map(async (office) => {
        const t0 = performance.now();
        const res = await generateWeekPlan(
          {
            officePlaceId: office.id,
            languageComfort: "en_hi",
            budgetBand: "20_30k",
          },
          {
            places: dataset.places,
            cache,
            runner,
            log: logger,
          },
        );

        if (!res.ok) {
          throw new Error(`Failed to generate verified WeekPlan for ${office.name}: ${res.message}`);
        }
        plansByOffice[office.id] = res.data.plan;
        logger.info("fallback_plan.generated", {
          durationMs: performance.now() - t0,
          meta: {
            officeId: office.id,
            officeName: office.name,
            modelUsed: res.data.modelUsed,
          },
        });
      }),
    );
  }

  const outPath = path.resolve("data/orr/fallback-plans.json");
  writeFileSync(outPath, `${JSON.stringify(plansByOffice, null, 2)}\n`, "utf-8");

  const firstOffice = techParks[0];
  if (firstOffice && plansByOffice[firstOffice.id]) {
    const fixtureDir = path.resolve("server/src/__tests__/fixtures");
    mkdirSync(fixtureDir, { recursive: true });
    writeFileSync(
      path.join(fixtureDir, "director-neon.json"),
      `${JSON.stringify(plansByOffice[firstOffice.id], null, 2)}\n`,
      "utf-8",
    );
  }

  logger.info("fallback_plans.completed", {
    meta: { count: Object.keys(plansByOffice).length },
  });
}

main().catch((err: unknown) => {
  logger.error("fallback_plans.failed", {
    meta: { error: err instanceof Error ? err.message : String(err) },
  });
  process.exit(1);
});
