/**
 * Feature: Fictional ORR NPC Persona & Safety Instruction Builder (server/src/live/persona.ts)
 * Purpose: Builds server-locked system instructions and gender-matched voice selections for Gemini 3.8 Live NPC conversations.
 * Inputs: LiveTokenRequest (mission, place category, difficulty, active language, optional phrase) and ENABLED_LANGUAGES.
 * Outputs: Safe systemInstruction text and prebuilt voice identifier.
 * Deliberately excludes: Real employee names, exact price/rent claims, or unenabled languages.
 */
import {
  ENABLED_LANGUAGES,
  LIVE_VOICE_CONFIG,
  type LanguageCode,
  type LiveTokenRequest,
  type NpcGender,
  type NpcRole,
  type PlaceCategory,
} from "@apna-area/shared";

const ROLE_DESCRIPTIONS: Record<NpcRole, string> = {
  auto_driver: "street-smart Bengaluru auto-rickshaw driver",
  darshini_owner: "warm, brisk South Indian darshini counter host",
  pg_owner: "practical, welcoming PG and co-living manager",
  transit_helper: "helpful regular BMTC Outer Ring Road commuter",
  office_buddy: "friendly future teammate working on the Outer Ring Road",
};

const CATEGORY_CONTEXT: Record<PlaceCategory, string> = {
  tech_park: "an Outer Ring Road tech campus gate",
  darshini: "a neighbourhood South Indian darshini tiffin spot",
  pg_coliving: "a neighbourhood PG and co-living building",
  transit_stop: "an operational BMTC bus stop and auto stand",
  lake_park: "a calm neighbourhood lake walkway",
  cafe_daily: "a daily coffee and essentials stop",
};

const LANGUAGE_NAMES: Record<LanguageCode, string> = {
  en: "Indian English",
  hi: "Hindi",
  kn: "Kannada",
};

/**
 * Resolves the effective primary language clamped strictly to ENABLED_LANGUAGES.
 *
 * @param requested - Requested language code from client.
 * @param enabled - Allowed language list from shared/config.ts.
 * @returns Safe enabled LanguageCode (falls back to "en").
 */
export function resolveEnabledLanguage(
  requested: LanguageCode,
  enabled: readonly LanguageCode[] = ENABLED_LANGUAGES,
): LanguageCode {
  if (enabled.includes(requested)) {
    return requested;
  }
  return enabled[0] ?? "en";
}

/**
 * Selects a natural Gemini Live prebuilt voice matching the NPC's gender and role.
 *
 * @param role - NPC role enum.
 * @param gender - NPC gender ("male" | "female").
 * @returns Prebuilt voice name string.
 */
export function selectVoiceForNpc(role: NpcRole, gender: NpcGender): string {
  const roleIdx =
    role === "auto_driver" || role === "darshini_owner"
      ? 0
      : 1;
  if (gender === "female") {
    return LIVE_VOICE_CONFIG.femaleVoices[roleIdx % LIVE_VOICE_CONFIG.femaleVoices.length] ?? "Aoede";
  }
  return LIVE_VOICE_CONFIG.maleVoices[roleIdx % LIVE_VOICE_CONFIG.maleVoices.length] ?? "Puck";
}

/**
 * Builds the server-locked systemInstruction for a fictional ORR character in Gemini 3.8 Live.
 *
 * @param req - Validated LiveTokenRequest.
 * @param enabledLanguages - Enabled language codes (defaults to ENABLED_LANGUAGES).
 * @returns Complete system instruction string enforcing persona, brevity, tools, and safety rules.
 */
export function buildNpcSystemInstruction(
  req: LiveTokenRequest,
  enabledLanguages: readonly LanguageCode[] = ENABLED_LANGUAGES,
): string {
  const { mission, officeName, placeCategory, difficulty, targetPhrase } = req;
  const leadLang = resolveEnabledLanguage(req.activeLanguage, enabledLanguages);
  const enabledLabels = enabledLanguages.map((code) => LANGUAGE_NAMES[code]).join(", ");
  const honorific = mission.npcGender === "female" ? "akka" : "anna";
  const isHinglish =
    leadLang === "hi" && req.languageComfort === "en_hi" && enabledLanguages.includes("hi");
  const languageGuidance = isHinglish
    ? "Lead in natural conversational Hinglish (everyday Hindi mixed smoothly with Indian English, using respectful 'aap' and 'ji'), and mirror whichever enabled language (Hindi or Indian English) the player speaks."
    : enabledLanguages.includes("hi")
      ? `Lead in ${LANGUAGE_NAMES[leadLang]} (use respectful 'aap' and 'ji' whenever speaking Hindi). Understand both Hindi and Indian English effortlessly, and code-switch naturally between Hindi and English whenever the player switches or mixes them.`
      : `Lead in ${LANGUAGE_NAMES[leadLang]}. Follow the player immediately if they switch among enabled languages.`;

  const lines: string[] = [
    `You are ${mission.npcFirstName}, a fictional, warm, dignified ${ROLE_DESCRIPTIONS[mission.npcRole]} near ${CATEGORY_CONTEXT[placeCategory]} on Bengaluru's Outer Ring Road (near ${officeName}).`,
    "You are speaking with a newcomer who moves to Bengaluru in two weeks. Use their name only if they introduce themselves; never assume a name.",
    "Pacing and turn rules:",
    "- Start the scene immediately when greeted or prompted, staying in character.",
    "- Keep EVERY spoken turn concise: 1 to 2 short sentences (under 10 seconds of audio) so the conversation feels brisk and natural inside a 90-second scene.",
    "- Always speak an audible reply out loud even when calling a tool.",
    `Language rules: Enabled languages for this session are [${enabledLabels}]. ${languageGuidance}`,
    `Politeness: Use respectful forms and match any Kannada kinship honorific to your gender (${honorific}).`,
    `Scene objective for the player: "${mission.objective}"`,
    `Success checks: ${mission.successCriteria.join("; ")}`,
    `Escalating hints available if the player pauses, struggles, or asks for help (call give_hint at hint level <= ${difficulty.hintLevel}): 1) ${mission.hintLadder[0]} | 2) ${mission.hintLadder[1]} | 3) ${mission.hintLadder[2]}`,
  ];

  if (targetPhrase && enabledLanguages.includes("kn")) {
    lines.push(
      `Kannada welcome & phrase coaching: Open with a short, warm Bengaluru Kannada greeting followed right away by a friendly bridge in ${LANGUAGE_NAMES[leadLang]} so a beginner feels completely welcome.`,
      `Target Kannada survival phrase to teach naturally once in this scene (phraseId "${targetPhrase.id}"): "${targetPhrase.kannada}" (pronounced "${targetPhrase.transliteration}", meaning "${targetPhrase.english}"). Invite the player to try saying "${targetPhrase.transliteration}" out loud, and call mark_phrase_attempt with phraseId "${targetPhrase.id}" (quality "clear" when spoken or typed recognizably, or "partial" if incomplete) as soon as they attempt it. If they ask for help in Hindi or English, answer warmly in that language and gently coach the phrase.`,
    );
  }

  lines.push(
    "Non-negotiable truth and safety rules:",
    "- You are a 100% fictional character tied to a general place category, never a real employee or representative of any named business or company.",
    "- Never invent or state exact rupees, rents, deposits, or fares as facts; discuss practical local habits instead (such as asking for the meter, checking morning bus bays, or asking about power backup and water).",
    "- Never say anything negative or disparaging about any real place, shop, or company.",
    "- Never use em dashes in text.",
    `- As soon as the player satisfies "${mission.objective}", give a warm 1-sentence spoken sign-off and call complete_objective.`,
  );

  return lines.join("\n");
}
