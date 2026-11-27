/**
 * Feature: Server-Side WeekPlan Truth & Safety Verifier (server/src/world/verify.ts)
 * Purpose: Rejects any generated WeekPlan that references unknown/out-of-box/duplicate placeIds, duplicate NPC roles, invented money figures, or em dashes.
 * Inputs: Untrusted model JSON object, target office VerifiedPlace, candidate VerifiedPlace list, and ORR_BBOX.
 * Outputs: Typed { ok: true, data: WeekPlan } or { ok: false, errors: string[] } for retry feedback.
 * Deliberately excludes: Network calls or silent mutation of hallucinated place IDs.
 */
import {
  ORR_BBOX,
  WeekPlanSchema,
  type BoundingBox,
  type MissionDay,
  type MissionId,
  type VerifiedPlace,
  type WeekPlan,
} from "@apna-area/shared";
import { isWithinBoundingBox } from "../places/filter.js";

export type VerifyWeekPlanResult =
  | { ok: true; data: WeekPlan }
  | { ok: false; errors: string[] };

const EXPECTED_IDS: readonly MissionId[] = ["m1", "m2", "m3", "m4", "m5"];
const EXPECTED_DAYS: readonly MissionDay[] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
];

const INVENTED_MONEY_PATTERN =
  /(?:₹|\brs\.?\s*\d|\binr\s*\d|\b\d[\d,]*\s*(?:rupees|lakh|lakhs)\b|\b\d+\s*k\s*(?:rent|deposit|fare)\b)/i;

const EM_DASH_PATTERN = /\u2014/;

function collectCopyFields(plan: WeekPlan): Array<{ label: string; text: string }> {
  const fields: Array<{ label: string; text: string }> = [
    { label: "weekTheme", text: plan.weekTheme },
  ];
  for (const area of plan.recommendedNeighbourhoods) {
    fields.push({ label: `area:${area.neighbourhoodId}`, text: area.fitReason });
  }
  for (const m of plan.missions) {
    fields.push(
      { label: `${m.id}.title`, text: m.title },
      { label: `${m.id}.whyItMatters`, text: m.whyItMatters },
      { label: `${m.id}.whyThisPlace`, text: m.whyThisPlace },
      { label: `${m.id}.objective`, text: m.objective },
      ...m.successCriteria.map((c, idx) => ({ label: `${m.id}.criteria[${idx}]`, text: c })),
      ...m.hintLadder.map((h, idx) => ({ label: `${m.id}.hint[${idx}]`, text: h })),
    );
  }
  return fields;
}

/**
 * Validates a parsed or raw WeekPlan against schema, geography, uniqueness, and safety invariants.
 *
 * @param rawPlan - Candidate WeekPlan parsed from Gemini JSON output.
 * @param office - Verified office place chosen by the player.
 * @param candidates - Allowed verified candidate places for this office.
 * @param bbox - Eastern ORR bounding rectangle (defaults to ORR_BBOX).
 * @returns VerifyWeekPlanResult with clean WeekPlan or actionable error messages for retry.
 */
export function verifyWeekPlan(
  rawPlan: unknown,
  office: VerifiedPlace,
  candidates: readonly VerifiedPlace[],
  bbox: BoundingBox = ORR_BBOX,
): VerifyWeekPlanResult {
  const parsed = WeekPlanSchema.safeParse(rawPlan);
  if (!parsed.success) {
    const schemaErrors = parsed.error.issues.map(
      (issue) => `${issue.path.join(".") || "root"}: ${issue.message}`,
    );
    return { ok: false, errors: schemaErrors };
  }

  const plan = parsed.data;
  const errors: string[] = [];

  if (plan.officePlaceId !== office.id) {
    errors.push(`officePlaceId "${plan.officePlaceId}" does not match selected office "${office.id}".`);
  }

  const candidateById = new Map(candidates.map((c) => [c.id, c]));
  const seenPlaceIds = new Set<string>();
  const seenRoles = new Set<string>();

  plan.missions.forEach((mission, idx) => {
    if (mission.id !== EXPECTED_IDS[idx]) {
      errors.push(`missions[${idx}].id must be "${EXPECTED_IDS[idx]}", got "${mission.id}".`);
    }
    if (mission.day !== EXPECTED_DAYS[idx]) {
      errors.push(`missions[${idx}].day must be "${EXPECTED_DAYS[idx]}", got "${mission.day}".`);
    }
    if (mission.placeId === office.id) {
      errors.push(`${mission.id}.placeId cannot be the office itself ("${office.id}").`);
    }
    const verified = candidateById.get(mission.placeId);
    if (!verified) {
      errors.push(`${mission.id}.placeId "${mission.placeId}" is not in the verified candidate list.`);
    } else if (!isWithinBoundingBox(verified.lat, verified.lng, bbox)) {
      errors.push(`${mission.id}.placeId "${mission.placeId}" lies outside ORR_BBOX.`);
    }

    if (seenPlaceIds.has(mission.placeId)) {
      errors.push(`Duplicate mission placeId "${mission.placeId}" in ${mission.id}.`);
    }
    seenPlaceIds.add(mission.placeId);

    if (seenRoles.has(mission.npcRole)) {
      errors.push(`Duplicate npcRole "${mission.npcRole}" in ${mission.id}; use each role once.`);
    }
    seenRoles.add(mission.npcRole);

    if (/\s/.test(mission.npcFirstName.trim())) {
      errors.push(`${mission.id}.npcFirstName "${mission.npcFirstName}" must be a single given name only.`);
    }
  });

  const seenHoods = new Set<string>();
  for (const rec of plan.recommendedNeighbourhoods) {
    if (seenHoods.has(rec.neighbourhoodId)) {
      errors.push(`Duplicate recommended neighbourhoodId "${rec.neighbourhoodId}".`);
    }
    seenHoods.add(rec.neighbourhoodId);
  }

  for (const field of collectCopyFields(plan)) {
    if (EM_DASH_PATTERN.test(field.text)) {
      errors.push(`${field.label} contains a forbidden em dash.`);
    }
    if (INVENTED_MONEY_PATTERN.test(field.text)) {
      errors.push(`${field.label} contains an unverified money or price claim.`);
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, data: plan };
}
