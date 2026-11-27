/**
 * Feature: Gemini Decision 1 Question Rubrics & Heuristic Fallback (server/src/score/questions.ts)
 * Purpose: Defines calibrated noul, score, and sorted choice questions for gemini-decision-1 plus input formatting and deterministic fallback.
 * Inputs: Validated ScoreRequest from a completed Live NPC mission.
 * Outputs: MISSION_DECISION_QUESTIONS map, formatted decision input text, and computeHeuristicRubric fallback.
 * Deliberately excludes: Network calls, SDK client state, or raw transcript logging.
 */
import type { RouteChoice, RubricScores, ScoreRequest } from "@apna-area/shared";

/** Shared Gemini Decision 1 question map: noul, 3 ordered 0..3 score rubrics, and sorted choice + other. */
export const MISSION_DECISION_QUESTIONS = {
  objective_met: {
    type: "noul" as const,
    instructions:
      "Did the player satisfy the scene objective in the conversation or via objectiveCompleted?",
    criteria: {
      true_description:
        "The player communicated the core request or question needed for the mission objective.",
      false_description:
        "The player ended the scene early, stayed off-topic, or never addressed the objective.",
    },
  },
  objective_score: {
    type: "score" as const,
    instructions: "Rate how clearly and practically the player handled the Bengaluru mission objective.",
    criteria: [
      "Did not address the mission objective",
      "Partially addressed the objective only after heavy prompting",
      "Clearly satisfied the mission objective",
      "Satisfied the mission objective smoothly, specifically, and concisely",
    ],
  },
  phrase_score: {
    type: "score" as const,
    instructions:
      "Rate the player's engagement with the local Kannada survival phrase or local greeting cues.",
    criteria: [
      "No local greeting or target phrase attempted",
      "Brief local nod or incomplete phrase attempt",
      "Clear attempt at the target phrase or polite local expressions",
      "Natural, accurate use of the target local phrase in context",
    ],
  },
  tone_score: {
    type: "score" as const,
    instructions: "Rate the politeness, warmth, and practical street rapport of the player's replies.",
    criteria: [
      "Abrupt, dismissive, or uncooperative",
      "Brief or hesitant but civil",
      "Polite, respectful everyday Bengaluru conversational tone",
      "Warm, respectful, culturally fluent rapport using polite honorifics",
    ],
  },
  next_route: {
    type: "choice" as const,
    instructions:
      "Choose how the next mission should adapt difficulty based on objective completion, hints needed, and local phrase comfort.",
    criteria: {
      ease_level:
        "Player struggled, missed the objective, or needed multiple hints; ease pace and increase English support.",
      keep_level:
        "Balanced turn with moderate support; keep current language share and hint pace steady.",
      other:
        "Transcript is empty, ambiguous, or insufficient to judge adaptation.",
      step_up:
        "Player met the objective cleanly with polite tone and few or zero hints; step up local Kannada share.",
    },
  },
};

/**
 * Formats the shared text input sent to gemini-decision-1 (never written to server logs).
 *
 * @param req - Validated ScoreRequest.
 * @returns Structured evaluation context string.
 */
export function buildDecisionInputText(req: ScoreRequest): string {
  const turns = req.transcript.map((t) => `${t.speaker.toUpperCase()}: ${t.text}`).join("\n");
  const phraseSpec = req.targetPhrase
    ? `${req.targetPhrase.transliteration} (${req.targetPhrase.english})`
    : "None";
  return [
    `Mission: ${req.mission.title}`,
    `Objective: ${req.mission.objective}`,
    `Success criteria: ${req.mission.successCriteria.join("; ")}`,
    `Target local phrase: ${phraseSpec}`,
    `Signals: objectiveCompleted=${req.toolSignals.objectiveCompleted}, hintsGiven=${req.toolSignals.hintsGiven}, phraseQuality=${req.toolSignals.phraseQuality ?? "none"}`,
    `Conversation (${req.transcript.length} turns):`,
    turns || "(no spoken or typed turns captured)",
  ].join("\n");
}

/**
 * Computes a deterministic rubric fallback when gemini-decision-1 is unreachable or unconfigured.
 *
 * @param req - Validated ScoreRequest.
 * @returns Validated RubricScores.
 */
export function computeHeuristicRubric(req: ScoreRequest): RubricScores {
  const playerTurns = req.transcript.filter((t) => t.speaker === "player").length;
  const completed = req.toolSignals.objectiveCompleted;
  const hints = req.toolSignals.hintsGiven;
  const phraseClear = req.toolSignals.phraseQuality === "clear";
  const phrasePartial = req.toolSignals.phraseQuality === "partial";

  const objectiveProb = completed ? (hints === 0 ? 0.92 : 0.78) : playerTurns >= 2 ? 0.52 : 0.25;
  const objectiveScore = completed ? (hints === 0 ? 2.7 : 2.1) : playerTurns >= 1 ? 1.1 : 0.4;
  const phraseScore = phraseClear ? 2.8 : phrasePartial ? 1.8 : playerTurns >= 1 ? 0.8 : 0.2;
  const toneScore = playerTurns >= 1 ? (completed ? 2.5 : 1.8) : 1.0;

  let routeChoice: RouteChoice = "keep_level";
  if (completed && hints <= 1 && (phraseClear || playerTurns >= 1)) {
    routeChoice = "step_up";
  } else if (!completed && (hints >= 2 || playerTurns === 0)) {
    routeChoice = "ease_level";
  }

  return {
    objectiveProb,
    objectiveScore,
    phraseScore,
    toneScore,
    routeChoice,
    confidence: playerTurns === 0 && !completed ? 0.65 : 0.84,
  };
}
