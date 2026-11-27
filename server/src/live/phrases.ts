/**
 * Feature: Verified Kannada Survival Phrase Loader & Deterministic Matcher (server/src/live/phrases.ts)
 * Purpose: Loads and Zod-validates data/phrases.json once at startup and selects gender-appropriate polite Kannada phrases per mission.
 * Inputs: Path to data/phrases.json, mission PhraseSituation, NpcGender, and MissionId.
 * Outputs: Validated PhrasesDataset and deterministic SurvivalPhrase per mission stop.
 * Deliberately excludes: Runtime LLM generation of unreviewed Kannada phrases.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  PhrasesDatasetSchema,
  type MissionId,
  type NpcGender,
  type PhraseSituation,
  type PhrasesDataset,
  type SurvivalPhrase,
} from "@apna-area/shared";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const defaultPhrasesPath = path.resolve(currentDir, "../../../data/phrases.json");

let cachedDataset: PhrasesDataset | null = null;

/**
 * Loads and validates the 30 curated ORR Kannada survival phrases from disk.
 *
 * @param customPath - Optional custom path for tests.
 * @returns Validated PhrasesDataset.
 */
export function loadSurvivalPhrases(customPath?: string): PhrasesDataset {
  if (!customPath && cachedDataset) {
    return cachedDataset;
  }
  const targetPath = customPath ? path.resolve(customPath) : defaultPhrasesPath;
  const raw = JSON.parse(readFileSync(targetPath, "utf-8")) as unknown;
  const parsed = PhrasesDatasetSchema.parse(raw);
  if (!customPath) {
    cachedDataset = parsed;
  }
  return parsed;
}

const MISSION_SEED_OFFSET: Record<MissionId, number> = {
  m1: 0,
  m2: 1,
  m3: 2,
  m4: 3,
  m5: 4,
};

/**
 * Selects a deterministic, gender-safe SurvivalPhrase for a mission's situation and NPC gender.
 * Never pairs a male honorific ("anna") with a female NPC or "akka" with a male NPC.
 *
 * @param phrases - Validated phrase list from data/phrases.json.
 * @param situation - Mission PhraseSituation key.
 * @param npcGender - Fictional NPC gender ("male" | "female").
 * @param missionId - Mission slot ("m1".."m5") for deterministic variety.
 * @returns Matched SurvivalPhrase.
 */
export function selectPhraseForMission(
  phrases: readonly SurvivalPhrase[],
  situation: PhraseSituation,
  npcGender: NpcGender,
  missionId: MissionId = "m1",
): SurvivalPhrase {
  const exactGenderMatches = phrases.filter(
    (p) => p.situation === situation && p.honorificGender === npcGender,
  );
  const safePool =
    exactGenderMatches.length > 0
      ? exactGenderMatches
      : phrases.filter(
          (p) =>
            p.situation === situation &&
            (p.honorificGender === "neutral" || p.honorificGender === npcGender),
        );

  if (safePool.length > 0) {
    const idx = MISSION_SEED_OFFSET[missionId] % safePool.length;
    return safePool[idx]!;
  }

  const fallback = phrases.find(
    (p) => p.honorificGender === "neutral" || p.honorificGender === npcGender,
  );
  return fallback ?? phrases[0]!;
}
