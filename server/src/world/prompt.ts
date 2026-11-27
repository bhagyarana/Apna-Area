/**
 * Feature: Gemini 4 Neon Director Prompt Builder & Copy Sanitiser (server/src/world/prompt.ts)
 * Purpose: Formats deterministic system instructions and verified candidate place context for Week One generation.
 * Inputs: Selected VerifiedPlace office, sorted CandidatePlace list, WorldRequest preferences, and optional verifier errors.
 * Outputs: System instruction string, structured user prompt string, and punctuation-safe JSON normaliser.
 * Deliberately excludes: Unverified places, real employee names, or money/price instructions.
 */
import type { VerifiedPlace, WorldRequest } from "@apna-area/shared";
import type { CandidatePlace } from "./candidates.js";

export const DIRECTOR_SYSTEM_INSTRUCTION = [
  "You are the Game Director for Apna Area, designing Week One on Bengaluru's Outer Ring Road for a newcomer moving there in two weeks.",
  "Strict rules:",
  "1. Choose 5 DIFFERENT placeId values strictly from the provided verified candidate places list.",
  "2. Use each npcRole exactly once across the 5 missions (auto_driver, darshini_owner, pg_owner, transit_helper, office_buddy) from Monday to Friday.",
  "3. Order missions as a natural first week: arrival/auto commute, breakfast at a darshini, PG/co-living visit, BMTC bus/directions, and Friday evening settling in.",
  "4. npcFirstName must be a single fictional Indian given name with no spaces or surname. NPCs are fictional characters, never real employees.",
  "5. Never invent fares, rents, deposits, or rupee amounts. Never say anything negative about any real place or business.",
  "6. Keep every text field short (under 10 words, sentence case, zero em dashes).",
].join("\n");

const BUDGET_LABELS: Record<WorldRequest["budgetBand"], string> = {
  "15_20k": "shared PG or budget co-living focus",
  "20_30k": "private PG room or shared flat focus",
  "30k_plus": "1BHK or gated apartment focus",
};

const COMFORT_LABELS: Record<WorldRequest["languageComfort"], string> = {
  en: "comfortable in English, new to Kannada",
  hi: "comfortable in Hindi, new to Kannada",
  en_hi: "comfortable in English and Hindi, new to Kannada",
};

/**
 * Builds the user input prompt for Gemini 4 Neon / Hydrogen WeekPlan generation.
 *
 * @param office - Verified ORR tech park selected by the player.
 * @param candidates - Deterministic nearby verified places from data/orr/places.json.
 * @param req - Player language comfort and budget band preferences.
 * @param verifierErrors - Optional errors from a failed first verification pass.
 * @returns Prompt string ready for interactions.create input.
 */
export function buildDirectorPrompt(
  office: VerifiedPlace,
  candidates: readonly CandidatePlace[],
  req: WorldRequest,
  verifierErrors?: readonly string[],
): string {
  const compactOffice = {
    id: office.id,
    name: office.name,
    neighbourhood: office.neighbourhood,
    shortAddress: office.shortAddress,
  };

  const compactCandidates = candidates.map((c) => ({
    id: c.id,
    name: c.name,
    category: c.category,
    neighbourhood: c.neighbourhood,
    distanceKm: c.distanceKm,
  }));

  const sections = [
    `Selected office: ${JSON.stringify(compactOffice)}`,
    `Player profile: language (${COMFORT_LABELS[req.languageComfort]}), housing (${BUDGET_LABELS[req.budgetBand]})`,
    `Verified candidate places (${compactCandidates.length}): ${JSON.stringify(compactCandidates)}`,
    "Return a JSON object matching the WeekPlan schema with 3 recommendedNeighbourhoods and 5 missions (m1 Monday through m5 Friday).",
  ];

  if (verifierErrors && verifierErrors.length > 0) {
    sections.push(
      `IMPORTANT: Your previous draft failed verification with these exact errors: ${verifierErrors.join("; ")}. Fix every listed error.`,
    );
  }

  return sections.join("\n\n");
}

/**
 * Replaces forbidden em dashes recursively inside parsed JSON strings before verification.
 *
 * @param value - Parsed JSON value.
 * @returns Deep copy with em dashes replaced by commas.
 */
export function stripEmDashesDeep(value: unknown): unknown {
  if (typeof value === "string") {
    return value.replace(/\s*\u2014\s*/g, ", ");
  }
  if (Array.isArray(value)) {
    return value.map((item) => stripEmDashesDeep(item));
  }
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = stripEmDashesDeep(v);
    }
    return out;
  }
  return value;
}
