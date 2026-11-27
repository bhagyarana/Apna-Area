/**
 * Feature: Dynamic JSON Schema Builder for Gemini 4 Neon Director (server/src/world/schema.ts)
 * Purpose: Builds a fast-compiling JSON Schema constraining mission placeIds to verified candidate IDs near the player's chosen office.
 * Inputs: Selected office place_id and verified candidate place_ids.
 * Outputs: Plain JSON Schema object passed to interactions.create response_format.schema.
 * Deliberately excludes: Unconstrained placeId strings or additionalProperties blowup.
 */
import { ORR_NEIGHBOURHOOD_ANCHORS } from "@apna-area/shared";

const NEIGHBOURHOOD_ID_ENUM = ORR_NEIGHBOURHOOD_ANCHORS.map((a) => a.id);

/**
 * Builds the dynamic JSON Schema for WeekPlan structured output with an enum of verified candidate place IDs.
 *
 * @param officePlaceId - Verified Google Maps place_id of the chosen office.
 * @param candidatePlaceIds - Non-empty array of verified nearby place_ids from data/orr/places.json.
 * @returns JSON Schema object enforcing all enum constraints without nested array FSA blowup.
 */
export function buildWeekPlanJsonSchema(
  officePlaceId: string,
  candidatePlaceIds: readonly string[],
): Record<string, unknown> {
  return {
    type: "object",
    required: ["officePlaceId", "weekTheme", "recommendedNeighbourhoods", "missions"],
    properties: {
      officePlaceId: {
        type: "string",
        enum: [officePlaceId],
      },
      weekTheme: { type: "string" },
      recommendedNeighbourhoods: {
        type: "array",
        minItems: 3,
        maxItems: 3,
        items: {
          type: "object",
          required: ["neighbourhoodId", "fitReason"],
          properties: {
            neighbourhoodId: {
              type: "string",
              enum: NEIGHBOURHOOD_ID_ENUM,
            },
            fitReason: { type: "string" },
          },
        },
      },
      missions: {
        type: "array",
        minItems: 5,
        maxItems: 5,
        items: {
          type: "object",
          required: [
            "id",
            "day",
            "title",
            "whyItMatters",
            "whyThisPlace",
            "placeId",
            "npcRole",
            "npcFirstName",
            "npcGender",
            "objective",
            "phraseSituation",
            "successCriteria",
            "hintLadder",
            "mood",
          ],
          properties: {
            id: { type: "string", enum: ["m1", "m2", "m3", "m4", "m5"] },
            day: {
              type: "string",
              enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
            },
            title: { type: "string" },
            whyItMatters: { type: "string" },
            whyThisPlace: { type: "string" },
            placeId: {
              type: "string",
              enum: [...candidatePlaceIds],
            },
            npcRole: {
              type: "string",
              enum: [
                "auto_driver",
                "darshini_owner",
                "pg_owner",
                "transit_helper",
                "office_buddy",
              ],
            },
            npcFirstName: { type: "string" },
            npcGender: { type: "string", enum: ["male", "female"] },
            objective: { type: "string" },
            phraseSituation: {
              type: "string",
              enum: [
                "greeting",
                "darshini_order",
                "auto_meter",
                "directions",
                "renting",
                "thanks",
                "polite_refusal",
              ],
            },
            successCriteria: {
              type: "array",
              minItems: 2,
              maxItems: 2,
              items: { type: "string" },
            },
            hintLadder: {
              type: "array",
              minItems: 3,
              maxItems: 3,
              items: { type: "string" },
            },
            mood: {
              type: "string",
              enum: ["calm", "morning", "rush", "evening"],
            },
          },
        },
      },
    },
  };
}
