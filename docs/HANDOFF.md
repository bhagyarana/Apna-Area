# Session Handoff (`docs/HANDOFF.md`)

## 1. Now
- **Current phase:** `phase/p3b-hindi` (all Phase 3b Hindi & Hinglish code-switching changes, unit/contract/E2E tests `4/4`, live `gemini-3.8-live` Hindi/Hinglish voice probes, and Devanagari caption check complete)
- **Current tag:** `p3a-english` on `main` (`5be2482`, serving 100% live traffic on `apna-area-00005-cux`), with `p3b-hin` no-traffic preview deployed on Cloud Run (`asia-south1`) awaiting user `"merge"` confirmation for `p3b-hindi`.
- **Live URL & revision:** Production `main` at `https://apna-area-481049877093.asia-south1.run.app` (`apna-area-00005-cux`); Phase 3b preview at `https://p3b-hin---apna-area-qhtgwpzhpq-el.a.run.app`.

## 2. Done This Session
- Shipped Phase 1 (`p1-map`), Phase 2 (`p2-director`), and Phase 3a (`p3a-english`, `5be2482`, `apna-area-00005-cux`) to `main` and 100% Cloud Run traffic.
- Built `T3b.1` (`phase/p3b-hindi`):
  - Enabled `ENABLED_LANGUAGES = ["en", "hi"]` in `shared/src/config.ts` and added `resolveComfortLanguage` + `languageComfort` on `LiveTokenRequestSchema` in `shared/src/live.ts`.
  - Added distinct conversational Hindi (`"hi"`, respectful `aap`/`ji`, `"नमस्ते!"` greeting cue) and Hinglish code-switching (`"en_hi"`, `"Namaste! Hello!"` greeting cue) rules in `server/src/live/persona.ts` and `web/src/live/liveSessionTypes.ts`.
  - Connected `TunePopover.tsx` (`Tune · EN` / `Tune · HI` / `Tune · HI+EN`) and `App.tsx` directly to `MissionDialog.tsx`, expanded `Noto Sans Devanagari` (`400..700`) in `web/index.html`, and increased caption line-height (`1.46`) in `web/src/styles/live.css` for Devanagari matras.
  - Verified live `gemini-3.8-live` Hindi (`765 ms` first-audio latency, Devanagari transcript) and Hinglish (`529 ms` first-audio latency, `complete_objective` tool fired) in `docs/TESTING.md`.

## 3. Decisions Made
- **ADR-006 & ADR-015:** Sequential language rollout continues cleanly (`["en"]` -> `["en", "hi"]`) with `Tune · EN/HI/HI+EN` surfacing the active mode directly in the top utility bar.

## 4. Open Questions
- **Phase 3b Preview Check:** Try switching `Tune` to `Hindi` or `Hindi + English` and talking with an NPC on the `p3b-hin` Cloud Run preview URL, then confirm `"merge"` to promote `p3b-hin` to 100% live traffic (`tag: p3b-hindi`) and begin **Phase 3c (`phase/p3c-kannada` · Kannada & 30 Survival Phrases)**.

## 5. Known Issues
- None blocking; in `P3c` (`Kannada & Survival Phrases`), keep the 3-tier Kannada + transliteration + meaning caption compact so desktop `1440x900` preserves clearance below the office pin when the keyboard drawer is open.

## 6. File State
- All Phase 3b code, tests (`10/10` Vitest suites / `33/33` tests, `4/4` Playwright E2E), and living docs committed on `phase/p3b-hindi`.

## 7. The Single Next Task
- Upon user `"merge"` confirmation, merge `phase/p3b-hindi` (`--no-ff`, tag `p3b-hindi`), route 100% traffic to `p3b-hin`, and start **Phase 3c (`phase/p3c-kannada`, `T3c.1` + `T3c.2`)**: curate and review 30 polite plural Kannada ORR survival phrases (`data/phrases.json`), set `ENABLED_LANGUAGES = ["en", "hi", "kn"]`, activate `mark_phrase_attempt`, and build 3-line Kannada captions + teal pulse + chime + `PhraseFlyCard`.

## 8. Resume Checklist
1. `AGENTS.md`
2. `PROJECT_BRIEF.md`
3. `docs/HANDOFF.md`
4. `docs/TASKS.md`
5. `Design.md`
6. `.agents/rules/gemini-models.md`
