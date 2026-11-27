/**
 * Feature: Candidate Selector & WeekPlan Verifier Unit Tests (T2.2)
 * Purpose: Proves 3 km -> 5 km candidate selection determinism and verifies rejection of hallucinated, duplicate, out-of-box, or unsafe WeekPlans.
 * Inputs: Synthetic VerifiedPlace arrays and valid/malformed WeekPlan fixtures.
 * Outputs: Vitest pass/fail assertions.
 * Deliberately excludes: Network calls or live Gemini invocations.
 */
import { describe, expect, it } from "vitest";
import type { VerifiedPlace, WeekPlan } from "@apna-area/shared";
import { selectCandidatePlaces } from "../world/candidates.js";
import { verifyWeekPlan } from "../world/verify.js";

const OFFICE: VerifiedPlace = {
  id: "ChIJ_office_ecoworld",
  name: "RMZ EcoWorld",
  category: "tech_park",
  neighbourhood: "Devarabisanahalli",
  lat: 12.9215,
  lng: 77.6845,
  shortAddress: "Devarabisanahalli, Bellandur",
  googleMapsUri: "https://maps.google.com/?cid=1",
};

const NEARBY_CANDIDATES: VerifiedPlace[] = [
  { id: "ChIJ_c1_auto", name: "Bellandur Gate Bus Stop", category: "transit_stop", neighbourhood: "Bellandur", lat: 12.9255, lng: 77.6765, shortAddress: "Bellandur", googleMapsUri: "https://maps.google.com/?cid=2" },
  { id: "ChIJ_c2_darshini", name: "Sri Udupi Park", category: "darshini", neighbourhood: "Bellandur", lat: 12.9261, lng: 77.6771, shortAddress: "Bellandur", googleMapsUri: "https://maps.google.com/?cid=3" },
  { id: "ChIJ_c3_pg", name: "Zolo Stay Bellandur", category: "pg_coliving", neighbourhood: "Bellandur", lat: 12.9242, lng: 77.6801, shortAddress: "Bellandur", googleMapsUri: "https://maps.google.com/?cid=4" },
  { id: "ChIJ_c4_cafe", name: "Third Wave Coffee", category: "cafe_daily", neighbourhood: "Devarabisanahalli", lat: 12.9288, lng: 77.6841, shortAddress: "ORR", googleMapsUri: "https://maps.google.com/?cid=5" },
  { id: "ChIJ_c5_lake", name: "Agara Lake Park", category: "lake_park", neighbourhood: "Agara & HSR Layout", lat: 12.9212, lng: 77.6455, shortAddress: "Agara", googleMapsUri: "https://maps.google.com/?cid=6" },
  { id: "ChIJ_c6_darshini2", name: "Arogya Ahaara", category: "darshini", neighbourhood: "Agara & HSR Layout", lat: 12.9188, lng: 77.6422, shortAddress: "HSR", googleMapsUri: "https://maps.google.com/?cid=7" },
  { id: "ChIJ_c7_pg2", name: "Stanza Living", category: "pg_coliving", neighbourhood: "Kadubeesanahalli", lat: 12.9381, lng: 77.6941, shortAddress: "Kadubeesanahalli", googleMapsUri: "https://maps.google.com/?cid=8" },
  { id: "ChIJ_c8_transit2", name: "Kadubeesanahalli Bus Stop", category: "transit_stop", neighbourhood: "Kadubeesanahalli", lat: 12.9391, lng: 77.6951, shortAddress: "ORR", googleMapsUri: "https://maps.google.com/?cid=9" },
];

function makeValidPlan(): WeekPlan {
  return {
    officePlaceId: OFFICE.id,
    weekTheme: "Finding your footing around Devarabisanahalli and Bellandur before Monday.",
    recommendedNeighbourhoods: [
      { neighbourhoodId: "bellandur", fitReason: "Closest walk and short feeder bus hop to RMZ EcoWorld." },
      { neighbourhoodId: "devarabisanahalli", fitReason: "Right next to campus gates with plenty of PGs and tiffin spots." },
      { neighbourhoodId: "agara_hsr", fitReason: "Tree-lined residential lanes near Agara Lake with direct ORR buses." },
    ],
    missions: [
      {
        id: "m1",
        day: "Monday",
        title: "First morning auto from Bellandur Gate",
        whyItMatters: "Gets you through the morning ORR gate rush without overpaying.",
        whyThisPlace: "Main drop point right before the EcoWorld flyover.",
        placeId: "ChIJ_c1_auto",
        npcRole: "auto_driver",
        npcFirstName: "Raghavendra",
        npcGender: "male",
        objective: "Ask to go toward RMZ EcoWorld gate and agree on meter or app pickup politely.",
        phraseSituation: "auto_meter",
        successCriteria: ["State destination clearly", "Keep the exchange polite and firm"],
        hintLadder: ["Mention EcoWorld main gate.", "Ask politely if meter works.", "Say you will check the bus bay if busy."],
        mood: "rush",
      },
      {
        id: "m2",
        day: "Tuesday",
        title: "Quick filter coffee and idli order",
        whyItMatters: "Darshini counters move fast before 9 am.",
        whyThisPlace: "Popular standing tiffin spot near Bellandur.",
        placeId: "ChIJ_c2_darshini",
        npcRole: "darshini_owner",
        npcFirstName: "Lakshmi",
        npcGender: "female",
        objective: "Order breakfast and filter coffee at the token counter.",
        phraseSituation: "darshini_order",
        successCriteria: ["Ask for your breakfast item", "Confirm token pickup"],
        hintLadder: ["Order idli vada first.", "Ask for filter coffee.", "Thank them at the counter."],
        mood: "morning",
      },
      {
        id: "m3",
        day: "Wednesday",
        title: "Checking water and power backup at a PG",
        whyItMatters: "Knowing backup and notice rules saves week-two headaches.",
        whyThisPlace: "Walkable co-living pocket off Bellandur main road.",
        placeId: "ChIJ_c3_pg",
        npcRole: "pg_owner",
        npcFirstName: "Suresh",
        npcGender: "male",
        objective: "Ask about power backup, drinking water, and notice period before deciding.",
        phraseSituation: "renting",
        successCriteria: ["Ask about power and Wi-Fi backup", "Ask about notice rules"],
        hintLadder: ["Ask about power backup.", "Check meal timings.", "Say you will confirm by evening."],
        mood: "calm",
      },
      {
        id: "m4",
        day: "Thursday",
        title: "Catching the 500D ORR bus home",
        whyItMatters: "Knowing which side of the service road to stand on saves 20 minutes.",
        whyThisPlace: "Key ORR bus stop serving Silk Board and Marathahalli routes.",
        placeId: "ChIJ_c8_transit2",
        npcRole: "transit_helper",
        npcFirstName: "Kavitha",
        npcGender: "female",
        objective: "Confirm which platform goes toward Agara and HSR Layout.",
        phraseSituation: "directions",
        successCriteria: ["Confirm service road direction", "Check landmark stop"],
        hintLadder: ["Ask which side goes to Agara.", "Confirm 500D bus stop.", "Thank the commuter."],
        mood: "evening",
      },
      {
        id: "m5",
        day: "Friday",
        title: "Friday evening breather by Agara Lake",
        whyItMatters: "Meeting a teammate outside work makes Bengaluru feel like home.",
        whyThisPlace: "Calm lake walkway at the southwest edge of the corridor.",
        placeId: "ChIJ_c5_lake",
        npcRole: "office_buddy",
        npcFirstName: "karthik",
        npcGender: "male",
        objective: "Trade first-week ORR commute tips and weekend plans with a colleague.",
        phraseSituation: "thanks",
        successCriteria: ["Share how week one went", "Ask for a local weekend tip"],
        hintLadder: ["Mention your favourite breakfast stop.", "Ask about lake walk hours.", "Wrap up warmly."],
        mood: "calm",
      },
    ],
  };
}

describe("server/world/candidates & verify", () => {
  it("expands deterministically from 3 km to 5 km when a category lies beyond 3 km", () => {
    const res = selectCandidatePlaces(OFFICE.id, [OFFICE, ...NEARBY_CANDIDATES]);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    // Agara Lake is ~4.2 km west of EcoWorld, so fallback 5 km radius is used to include lake_park
    expect(res.data.radiusUsedKm).toBe(5);
    expect(res.data.candidates.some((c) => c.id === "ChIJ_c5_lake")).toBe(true);

    // Deterministic across repeated runs
    const res2 = selectCandidatePlaces(OFFICE.id, [OFFICE, ...NEARBY_CANDIDATES]);
    expect(res2).toEqual(res);
  });

  it("accepts a valid 5-mission WeekPlan", () => {
    const result = verifyWeekPlan(makeValidPlan(), OFFICE, NEARBY_CANDIDATES);
    expect(result.ok).toBe(true);
  });

  it("rejects hallucinated placeId, duplicate placeId, duplicate npcRole, em dashes, and money claims", () => {
    const bad = makeValidPlan();
    bad.missions[0]!.placeId = "ChIJ_hallucinated_not_in_dataset";
    bad.missions[2]!.placeId = bad.missions[1]!.placeId; // duplicate
    bad.missions[3]!.npcRole = "auto_driver"; // duplicate role
    bad.missions[4]!.objective = "Pay Rs 250 fare \u2014 cash only.";

    const result = verifyWeekPlan(bad, OFFICE, NEARBY_CANDIDATES);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((e) => e.includes("not in the verified candidate list"))).toBe(true);
    expect(result.errors.some((e) => e.includes("Duplicate mission placeId"))).toBe(true);
    expect(result.errors.some((e) => e.includes("Duplicate npcRole"))).toBe(true);
    expect(result.errors.some((e) => e.includes("forbidden em dash"))).toBe(true);
    expect(result.errors.some((e) => e.includes("unverified money"))).toBe(true);
  });
});
