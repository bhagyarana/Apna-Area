# Session Handoff (`docs/HANDOFF.md`)

## 1. Now
- **Current phase:** `phase/p3a-english` (all Phase 3a code, unit/contract/E2E tests `4/4`, Code Review Gate `PASS 93/100` + all 4 minor fixes, and Round 2 Design Critic `9.4/10` overall complete)
- **Current tag:** `p2-director` on `main` (`2c43311`), with `p3a-eng` no-traffic preview deployed on Cloud Run (`asia-south1`) awaiting user `"merge"` confirmation for `p3a-english`.
- **Live URL & revision:** Production `main` at `https://apna-area-481049877093.asia-south1.run.app` (`apna-area-00003-goz`); Phase 3a preview at `https://p3a-eng---apna-area-qhtgwpzhpq-el.a.run.app`.

## 2. Done This Session
- Shipped Phase 1 (`p1-map`, `fed66a2`) and Phase 2 (`p2-director`, `2c43311`, `apna-area-00003-goz`) to `main` and Cloud Run `asia-south1`.
- Built `T3a.1`: `shared/src/live.ts`, `LIVE_VOICE_CONFIG` in `shared/src/config.ts` (`enableVoiceNpcs: true`), `server/src/live/{persona,tools,token}.ts`, `POST /api/live-token` (`30/min` per-IP, verified place guard, `v1alpha` `authTokens.create` locked to `gemini-3.8-live`), and `persona.test.ts`.
- Built `T3a.2`: `web/src/live/{resample,audioUnlock,pcmWorklet,pcmPlayer,liveTransport,liveSessionTypes,useLiveSession}.ts` + `resample.test.ts`, keeping initial landing JS at `162.7 KB` gzip via dynamic `import("@google/genai")`.
- Built `T3a.3`: Generated 10 gender-matched `256x256` WebP NPC portraits (`web/public/art/npcs/<role>_<gender>.webp`) via `gemini-nano-banana-2.1`, built `Captions.tsx`, `MissionObjectiveHeader.tsx`, `MissionDialog.tsx`, `live.css`, `mic.css`, stepped down `MissionCard` `Prev`/`Next` controls, added street-level `inVoiceMission` camera framing, and added `e2e/live.spec.ts`.
- Completed `T3a.4`: Measured `632-823 ms` first-audio latency across all 5 NPC roles on live `gemini-3.8-live` (`docs/TESTING.md`), passed Code Review Gate (`93/100` + 4 polish fixes), and reached `9.4/10` (`9.4` Desktop, `9.3` Mobile) in Design Critic Round 2.

## 3. Decisions Made
- **ADR-005 & ADR-015:** Use `v1alpha` (`uses: 3`) for `@google/genai@3.6.1` `authTokens.create` + `live.connect`, lazy-load `@google/genai` into a separate `87.6 KB` chunk, and serve gender-matched `256x256` WebP portraits (`~200 KB` total).

## 4. Open Questions
- **Phase 3a Preview Check:** Try `Talk with <NPC>` (voice or `Type instead`) on the `p3a-eng` Cloud Run preview URL and confirm `"merge"` to promote `p3a-eng` to 100% live traffic (`tag: p3a-english`) and begin **Phase 3b (`phase/p3b-hindi` · Hindi & Code-Switching)**.

## 5. Known Issues
- Keep an eye on desktop Cinema Ribbon height in `P3b`/`P3c` when multi-script captions render while the keyboard drawer is open (`~14px` gap beneath the office pin on `1440x900`).

## 6. File State
- All Phase 3a source, 15 `.webp` portraits, tests (`10/10` Vitest suites / `33/33` tests, `4/4` Playwright E2E), and living docs committed on `phase/p3a-english`.

## 7. The Single Next Task
- Upon user `"merge"` confirmation, merge `phase/p3a-english` (`--no-ff`, tag `p3a-english`), route 100% traffic to `p3a-eng`, and execute **Phase 3b (`phase/p3b-hindi`, `T3b.1`)**: enable `ENABLED_LANGUAGES = ["en", "hi"]`, load `Noto Sans Devanagari`, enable Hindi + Hinglish code-switching in `persona.ts` and `TunePopover.tsx`, verify live, and ship `p3b-hindi`.

## 8. Resume Checklist
1. `AGENTS.md`
2. `PROJECT_BRIEF.md`
3. `docs/HANDOFF.md`
4. `docs/TASKS.md`
5. `Design.md`
6. `.agents/rules/gemini-models.md`
