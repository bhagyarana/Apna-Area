/**
 * Feature: Phase 3 Live Voice NPC Contracts & Non-Blocking Tool Schemas (shared/src/live.ts)
 * Purpose: Defines Zod schemas and shared NON_BLOCKING tool declarations for POST /api/live-token and browser Gemini 3.8 Live sessions.
 * Inputs: Untrusted JSON from token requests, tool calls, or session state.
 * Outputs: Validated types and shared FunctionDeclaration payloads used identically on server and client.
 * Deliberately excludes: API keys, WebAudio DOM globals, or server SDK clients.
 */
import { z } from "zod";
import {
  DifficultyStateSchema,
  LanguageCodeSchema,
  LanguageComfortSchema,
  PhraseSituationSchema,
  PlaceCategorySchema,
  type LanguageCode,
  type LanguageComfort,
} from "./types.js";
import { MissionSchema } from "./world.js";

export const SurvivalPhraseSchema = z.object({
  id: z.string().min(1),
  situation: PhraseSituationSchema,
  kannada: z.string().min(1),
  transliteration: z.string().min(1),
  english: z.string().min(1),
  hindi: z.string().min(1),
});
export type SurvivalPhrase = z.infer<typeof SurvivalPhraseSchema>;

export const TranscriptTurnSchema = z.object({
  speaker: z.enum(["player", "npc"]),
  text: z.string().min(1),
  timestampMs: z.number().nonnegative(),
});
export type TranscriptTurn = z.infer<typeof TranscriptTurnSchema>;

export const LiveToolSignalsSchema = z.object({
  hintsGiven: z.number().int().nonnegative(),
  phraseQuality: z.enum(["partial", "clear"]).optional(),
  objectiveCompleted: z.boolean(),
  completionSummary: z.string().optional(),
});
export type LiveToolSignals = z.infer<typeof LiveToolSignalsSchema>;

export const LiveTokenRequestSchema = z.object({
  mission: MissionSchema,
  officeName: z.string().min(1).max(120),
  placeName: z.string().min(1).max(120),
  placeCategory: PlaceCategorySchema,
  difficulty: DifficultyStateSchema,
  activeLanguage: LanguageCodeSchema,
  languageComfort: LanguageComfortSchema.optional(),
  targetPhrase: SurvivalPhraseSchema.optional(),
});
export type LiveTokenRequest = z.infer<typeof LiveTokenRequestSchema>;

/**
 * Maps a player's languageComfort preference to the primary active LanguageCode within enabledLanguages.
 *
 * @param comfort - Player comfort setting ("en" | "hi" | "en_hi").
 * @param enabled - Enabled languages from shared/config.ts or /api/config.
 * @returns Effective primary LanguageCode ("hi" when Hindi/Hinglish is chosen and enabled, else "en").
 */
export function resolveComfortLanguage(
  comfort: LanguageComfort,
  enabled: readonly LanguageCode[],
): LanguageCode {
  if ((comfort === "hi" || comfort === "en_hi") && enabled.includes("hi")) {
    return "hi";
  }
  return enabled[0] ?? "en";
}

export const LiveTokenDataSchema = z.object({
  token: z.string().min(1),
  expireTime: z.string().min(1),
  model: z.string().min(1),
  apiVersion: z.string().min(1),
  maxDurationSeconds: z.number().int().positive(),
  voiceName: z.string().min(1),
  includePhraseTool: z.boolean(),
  phrase: SurvivalPhraseSchema.optional(),
});
export type LiveTokenData = z.infer<typeof LiveTokenDataSchema>;

export interface SharedLiveToolDeclaration {
  name: string;
  description: string;
  behavior: "NON_BLOCKING";
  parameters: Record<string, unknown>;
}

/**
 * Builds the exact NON_BLOCKING function declarations shared between server liveConnectConstraints and browser live.connect.
 *
 * @param includePhraseTool - True in Phase 3c when a target Kannada phrase is active for the mission.
 * @returns Array of NON_BLOCKING function declarations.
 */
export function buildSharedLiveTools(
  includePhraseTool: boolean,
): SharedLiveToolDeclaration[] {
  const declarations: SharedLiveToolDeclaration[] = [
    {
      name: "give_hint",
      description:
        "Surface a helpful visual hint card on screen when the player pauses, struggles, or asks what to say next.",
      behavior: "NON_BLOCKING",
      parameters: {
        type: "OBJECT",
        required: ["level", "hintText"],
        properties: {
          level: {
            type: "INTEGER",
            description: "Escalation level from 1 (subtle) to 3 (exact words).",
          },
          hintText: {
            type: "STRING",
            description: "Short, friendly hint shown on the player's HUD (no em dashes).",
          },
        },
      },
    },
    {
      name: "complete_objective",
      description:
        "Call as soon as the player achieves the mission objective, right alongside a warm 1-sentence spoken sign-off.",
      behavior: "NON_BLOCKING",
      parameters: {
        type: "OBJECT",
        required: ["summary"],
        properties: {
          summary: {
            type: "STRING",
            description: "One-sentence summary of what the player accomplished.",
          },
        },
      },
    },
  ];

  if (includePhraseTool) {
    declarations.push({
      name: "mark_phrase_attempt",
      description:
        "Call immediately when the player tries speaking or typing the taught local survival phrase.",
      behavior: "NON_BLOCKING",
      parameters: {
        type: "OBJECT",
        required: ["phraseId", "attempted", "quality"],
        properties: {
          phraseId: { type: "STRING" },
          attempted: { type: "BOOLEAN" },
          quality: {
            type: "STRING",
            enum: ["partial", "clear"],
          },
        },
      },
    });
  }

  return declarations;
}
