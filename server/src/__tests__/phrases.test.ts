/**
 * Feature: Kannada Survival Phrases Schema & Gender-Honorific Safety Tests (T3c.1)
 * Purpose: Validates all 30 entries in data/phrases.json across all 7 PhraseSituation keys, polite forms, zero em dashes, and gender matching.
 * Inputs: data/phrases.json and selectPhraseForMission.
 * Outputs: Vitest pass/fail assertions.
 * Deliberately excludes: Network requests.
 */
import { describe, expect, it } from "vitest";
import { PhraseSituationSchema } from "@apna-area/shared";
import { loadSurvivalPhrases, selectPhraseForMission } from "../live/phrases.js";

describe("data/phrases.json & server/live/phrases", () => {
  it("contains 30 valid phrases covering all 7 PhraseSituation keys with zero em dashes", () => {
    const dataset = loadSurvivalPhrases();
    expect(dataset.phrases).toHaveLength(30);

    const ids = new Set(dataset.phrases.map((p) => p.id));
    expect(ids.size).toBe(30);

    const coveredSituations = new Set(dataset.phrases.map((p) => p.situation));
    for (const sit of PhraseSituationSchema.options) {
      expect(coveredSituations.has(sit)).toBe(true);
    }

    for (const p of dataset.phrases) {
      expect(p.kannada).not.toContain("\u2014");
      expect(p.transliteration).not.toContain("\u2014");
      expect(p.english).not.toContain("\u2014");
      expect(p.hindi).not.toContain("\u2014");

      if (p.honorificGender === "male") {
        expect(p.kannada).toContain("ಅಣ್ಣ");
        expect(p.kannada).not.toContain("ಅಕ್ಕ");
      }
      if (p.honorificGender === "female") {
        expect(p.kannada).toContain("ಅಕ್ಕ");
        expect(p.kannada).not.toContain("ಅಣ್ಣ");
      }
    }
  });

  it("never mismatches anna/akka honorifics against NPC gender", () => {
    const { phrases } = loadSurvivalPhrases();
    for (const sit of PhraseSituationSchema.options) {
      const femaleMatch = selectPhraseForMission(phrases, sit, "female", "m2");
      expect(femaleMatch.honorificGender).not.toBe("male");
      expect(femaleMatch.kannada).not.toContain("ಅಣ್ಣ");

      const maleMatch = selectPhraseForMission(phrases, sit, "male", "m1");
      expect(maleMatch.honorificGender).not.toBe("female");
      expect(maleMatch.kannada).not.toContain("ಅಕ್ಕ");
    }
  });
});
