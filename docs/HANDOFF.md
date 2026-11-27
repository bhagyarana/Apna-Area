# Session Handoff (`docs/HANDOFF.md`)

## 1. Now
- **Current phase:** `phase/p3c-kannada` (**Check-in #4**: all 3 Voice NPC language steps `P3a` English, `P3b` Hindi/Hinglish, and `P3c` Kannada + 30 Survival Phrases complete!)
- **Current tag:** `p3b-hindi` on `main` (`9557085`, serving 100% live traffic on `apna-area-00007-dit`), with `p3c-kan` no-traffic preview deployed on Cloud Run (`asia-south1`) awaiting user `"merge"` confirmation for `p3c-kannada`.
- **Live URL & revision:** Production `main` at `https://apna-area-481049877093.asia-south1.run.app` (`apna-area-00007-dit`); Phase 3c preview at `https://p3c-kan---apna-area-qhtgwpzhpq-el.a.run.app`.

## 2. Done This Session
- Shipped Phase 1 (`p1-map`), Phase 2 (`p2-director`), Phase 3a (`p3a-english`), and Phase 3b (`p3b-hindi`, `9557085`) to `main` and 100% Cloud Run traffic.
- Built `T3c.1` + `T3c.2` (`phase/p3c-kannada`):
  - Authored and linguistically audited 30 speaker-gender-neutral, polite-plural Bengaluru Kannada survival phrases in `data/phrases.json` across all 7 `PhraseSituation` keys (`server/src/live/phrases.ts` + `server/src/__tests__/phrases.test.ts`).
  - Enabled `ENABLED_LANGUAGES = ["en", "hi", "kn"]` in `shared/src/config.ts`, attached matched `targetPhrase` on `POST /api/live-token`, and activated `mark_phrase_attempt` (`NON_BLOCKING`) in `server/src/live/persona.ts`.
  - Built 2-line Kannada/transliteration/meaning phrase coaching strip in `Captions.tsx`, two-note WebAudio ascending fifth chime (`chime.ts`), `260ms` `--accent-teal` mastery ring, `PhraseFlyCard.tsx` flight animation into the persisted `Phrases · N` topbar badge (`sessionStore.ts`), and extracted `MicOrbControl.tsx` + `vendor-ui` Rollup chunk so zero files exceed 250 lines and zero Vite build warnings occur.
  - Verified live `gemini-3.8-live` Kannada phrase mastery (`630 ms`) and Hindi-to-Kannada coaching bridge (`717 ms`, firing `give_hint` -> `mark_phrase_attempt("clear")` -> `complete_objective`) in `docs/TESTING.md`.

## 3. Decisions Made
- **ADR-016:** Curate 30 speaker-gender-neutral, polite-plural spoken Bengaluru Kannada phrases in `data/phrases.json` matched by `PhraseSituation` and `honorificGender` (`aṇṇa` / `akka` / `neutral`).

## 4. Open Questions
- **Check-in #4:** Try speaking or typing the mission's Kannada survival phrase on the `p3c-kan` Cloud Run preview URL to watch the teal mastery ring, chime, and flying card land in `Phrases · 1`, then confirm `"merge"` to promote `p3c-kan` to 100% live traffic (`tag: p3c-kannada`) and begin **Phase 4 (`phase/p4-adaptive` · Gemini Decision 1 Adaptive Scoring & XP HUD)**.

## 5. Known Issues
- None; all 9 rows of the Phase 3 Manual Voice Test Matrix in `docs/TESTING.md` are green (`529-823 ms` first-audio latency).

## 6. File State
- All Phase 3c code, `data/phrases.json`, tests (`11/11` Vitest suites / `35/35` tests, `4/4` Playwright E2E), and living docs committed on `phase/p3c-kannada`.

## 7. The Single Next Task
- Upon user `"merge"` confirmation, merge `phase/p3c-kannada` (`--no-ff`, tag `p3c-kannada`), route 100% traffic to `p3c-kan`, and start **Phase 4 (`phase/p4-adaptive`, `T4.1`..`T4.3`)**: pure `xpFor` / `starsFor` / `nextDifficulty`, `POST /api/score` calling `gemini-decision-1` (`v1beta` `decisions.create` with `noul`, `score`, `choice`, `< 0.75` confidence guard, sorted choice keys + `other`), `MissionResultCard.tsx`, `WhyChangedDisclosure.tsx`, and `XpCounter.tsx`.

## 8. Resume Checklist
1. `AGENTS.md`
2. `PROJECT_BRIEF.md`
3. `docs/HANDOFF.md`
4. `docs/TASKS.md`
5. `Design.md`
6. `.agents/rules/gemini-models.md`
