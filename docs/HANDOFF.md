# Session Handoff (`docs/HANDOFF.md`)

## 1. Now
- **Current phase:** `phase/p5-kit` (checked out cleanly from `main` at tag `p4-adaptive`)
- **Current tag:** `p4-adaptive` on `main` (`bf52cb0`, preceded by `v0.1-docs`, `p0-skeleton`, `p1-map`, `p2-director`, `p3a-english`, `p3b-hindi`, `p3c-kannada`)
- **Live URL & revision:** `https://apna-area-481049877093.asia-south1.run.app` (`100%` live traffic on `apna-area-00012-saf`, tag `p4-adap`)

## 2. Done This Session
- Shipped `p1-map` (`fed66a2`) and `p2-director` (`2c43311`): `data/orr/places.json` (`121` verified places), `data/orr/corridor.geojson`, `POST /api/world` SSE (`gemini-4-neon`), and `MissionCard.tsx`.
- Shipped `p3a-english` (`5be2482`), `p3b-hindi` (`9557085`), and `p3c-kannada` (`e061d47`): `POST /api/live-token` (`gemini-3.8-live`), 30 audited polite Kannada survival phrases (`data/phrases.json`), `mark_phrase_attempt` chime + `PhraseFlyCard.tsx`, and `MissionDialog.tsx`.
- Shipped `p4-adaptive` (`bf52cb0`, `apna-area-00012-saf`):
  - `T4.1`: `enableAdaptiveScoring = true`, pure `xpFor`, `starsFor`, `resolveEffectiveRoute`, `nextDifficulty`, `applyDifficultyOverride`, and `buildAdaptationSummary` (`shared/src/game/scoring.ts` + 100% branch tests).
  - `T4.2`: `POST /api/score` (`gemini-decision-1` `v1beta` `decisions.create`, `347 ms` live on Cloud Run, `0` output tokens, `< 0.75` / `"other"` steady-pace guard, transcript-redacted logging, `30/min` IP rate limit, recorded fixture `decision-1-score.json`).
  - `T4.3`: `XpCounter.tsx`, `MissionResultCard.tsx`, `WhyChangedDisclosure.tsx` (2x2 calibrated rubric bars + 1-click player overrides), `appendDraftTurns` voice flush, `e2e/score.spec.ts` (`5/5` E2E green), Code Review Gate `PASS` (`97/100`), and Design Critic `PASS` (`9.2/10`).

## 3. Decisions Made
- **ADR-014:** Director `< 10 words` field budget, `32s` upstream timeout, and shared `FallbackPlansMapSchema`.
- **ADR-015:** `v1alpha` (`uses: 3`) ephemeral tokens for `@google/genai@3.6.1`, lazy `@google/genai` chunk, and `256x256` WebP portraits.
- **ADR-016:** 30 speaker-gender-neutral, polite-plural Kannada phrases matched by `PhraseSituation` and `honorificGender`.
- **ADR-017:** 5-question `gemini-decision-1` (`v1beta`) scoring pass (`347-519 ms`, `0` output tokens), 3-decimal floor truncation before `< 0.75` steady-pace guard, transcript-redacted logging, and 1-click player pace override.

## 4. Open Questions
- Awaiting user approval on the Phase 5 (`phase/p5-kit`, `T5.1`..`T5.3`) build plan.

## 5. Known Issues
- None; `13/13` Vitest suites (`45/45` tests) and `5/5` Playwright E2E specs pass with zero warnings and all `94/94` `.ts/.tsx/.css` files `<= 250` lines.

## 6. File State
- Clean working tree on branch `phase/p5-kit` off `main` (`bf52cb0`, `tag: p4-adaptive`).

## 7. The Single Next Task
- Build and ship **Phase 5 (`phase/p5-kit`, `T5.1`..`T5.3`)**: Survival Kit (`"YOU'RE READY FOR MONDAY."`), Google Routes API Monday `09:00` & `18:30` IST commute matrix (`DRIVE`, `TWO_WHEELER`, `TRANSIT`) + `gemini-3.5-flash-lite` area one-liners, `gemini-3.8-flash-tts` cached WAV phrase replay, pre-generated `lyria-3-clip-preview` ambient loops, and mandatory `@ui-sdk/react` focus-trapped Confirm Sheets on every external/export action.

## 8. Resume Checklist
1. `AGENTS.md`
2. `PROJECT_BRIEF.md`
3. `docs/HANDOFF.md`
4. `docs/TASKS.md`
5. `Design.md`
6. `.agents/rules/gemini-models.md`
