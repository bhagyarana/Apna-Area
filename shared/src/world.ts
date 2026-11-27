/**
 * Feature: Phase 2 Week One Director Contracts & SSE Schemas
 * Purpose: Defines Zod validators and TypeScript types for Mission, WeekPlan, WorldRequest, and SSE WorldProgressEvent payloads.
 * Inputs: Untrusted JSON from POST /api/world requests, Gemini 4 structured outputs, or SSE streams.
 * Outputs: Validated domain types shared between Fastify Director routes and React HUD components.
 * Deliberately excludes: Server-side candidate selection or model SDK calls.
 */
import { z } from "zod";
import {
  BudgetBandSchema,
  LanguageComfortSchema,
  MissionMoodSchema,
  NpcRoleSchema,
  PhraseSituationSchema,
} from "./types.js";

export const NeighbourhoodIdSchema = z.enum([
  "marathahalli",
  "kadubeesanahalli",
  "devarabisanahalli",
  "bellandur",
  "sarjapur_junction",
  "agara_hsr",
  "silk_board",
]);
export type NeighbourhoodId = z.infer<typeof NeighbourhoodIdSchema>;

export const MissionIdSchema = z.enum(["m1", "m2", "m3", "m4", "m5"]);
export type MissionId = z.infer<typeof MissionIdSchema>;

export const MissionDaySchema = z.enum([
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
]);
export type MissionDay = z.infer<typeof MissionDaySchema>;

export const NpcGenderSchema = z.enum(["male", "female"]);
export type NpcGender = z.infer<typeof NpcGenderSchema>;

export const RecommendedNeighbourhoodSchema = z.object({
  neighbourhoodId: NeighbourhoodIdSchema,
  fitReason: z.string().min(1).max(160),
});
export type RecommendedNeighbourhood = z.infer<typeof RecommendedNeighbourhoodSchema>;

export const MissionSchema = z.object({
  id: MissionIdSchema,
  day: MissionDaySchema,
  title: z.string().min(1).max(64),
  whyItMatters: z.string().min(1).max(160),
  whyThisPlace: z.string().min(1).max(120),
  placeId: z.string().min(1),
  npcRole: NpcRoleSchema,
  npcFirstName: z.string().min(1).max(32),
  npcGender: NpcGenderSchema,
  objective: z.string().min(1).max(180),
  phraseSituation: PhraseSituationSchema,
  successCriteria: z.array(z.string().min(1).max(140)).min(2).max(3),
  hintLadder: z.array(z.string().min(1).max(160)).length(3),
  mood: MissionMoodSchema,
});
export type Mission = z.infer<typeof MissionSchema>;

export const WeekPlanSchema = z.object({
  officePlaceId: z.string().min(1),
  weekTheme: z.string().min(1).max(120),
  recommendedNeighbourhoods: z.array(RecommendedNeighbourhoodSchema).length(3),
  missions: z.array(MissionSchema).length(5),
});
export type WeekPlan = z.infer<typeof WeekPlanSchema>;

export const WorldRequestSchema = z.object({
  officePlaceId: z.string().min(1),
  languageComfort: LanguageComfortSchema,
  budgetBand: BudgetBandSchema,
});
export type WorldRequest = z.infer<typeof WorldRequestSchema>;

export const WorldProgressStepSchema = z.enum([
  "scanning",
  "candidates_found",
  "planning",
  "verified",
]);
export type WorldProgressStep = z.infer<typeof WorldProgressStepSchema>;

export const WorldPlanPayloadSchema = z.object({
  plan: WeekPlanSchema,
  replayed: z.boolean(),
  modelUsed: z.string().min(1),
  durationMs: z.number().nonnegative(),
});
export type WorldPlanPayload = z.infer<typeof WorldPlanPayloadSchema>;

export const FallbackPlansMapSchema = z.record(z.string(), WeekPlanSchema);
export type FallbackPlansMap = z.infer<typeof FallbackPlansMapSchema>;

export const WorldProgressEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("progress"),
    step: WorldProgressStepSchema,
    detail: z.string().min(1),
    count: z.number().int().nonnegative().optional(),
  }),
  z.object({
    type: z.literal("complete"),
    plan: WeekPlanSchema,
    replayed: z.boolean(),
    modelUsed: z.string().min(1),
    durationMs: z.number().nonnegative(),
  }),
  z.object({
    type: z.literal("error"),
    code: z.string().min(1),
    message: z.string().min(1),
    retryable: z.boolean(),
  }),
]);
export type WorldProgressEvent = z.infer<typeof WorldProgressEventSchema>;
