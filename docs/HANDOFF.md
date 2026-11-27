# Session Handoff (`docs/HANDOFF.md`)

## 1. Now
- **Current phase:** `phase/p4-adaptive` (checked out cleanly from `main` at tag `p3c-kannada`)
- **Current tag:** `p3c-kannada` on `main` (preceded by `v0.1-docs`, `p0-skeleton`, `p1-map`, `p2-director`, `p3a-english`, `p3b-hindi`)
- **Live URL & revision:** `https://apna-area-481049877093.asia-south1.run.app` (`100%` live traffic on `apna-area-00010-puy`, tag `p3c-kan`)

## 2. Done This Session
- Shipped `p1-map` (`fed66a2`) and `p2-director` (`2c43311`): `data/orr/places.json` (`121` verified places), `data/orr/corridor.geojson`, `POST /api/world` SSE (`gemini-4-neon`), and `MissionCard.tsx`.
- Shipped `p3a-english` (`5be2482`, `apna-area-00005-cux`): `POST /api/live-token` (`server/src/live/token.ts`), 16 kHz / 24 kHz WebAudio pipeline (`web/src/live/useLiveSession.ts`), 10 gender-matched `256x256` WebP Nano Banana 2.1 portraits, `MissionDialog.tsx`, Code Review Gate `PASS` (`93/100`), and Design Critic `9.4/10`.
- Shipped `p3b-hindi` (`9557085`, `apna-area-00007-dit`): `ENABLED_LANGUAGES = ["en", "hi"]`, Hindi (`765 ms`) and Hinglish (`529 ms`) code-switching in `server/src/live/persona.ts`, and `Tune · EN/HI/HI+EN` in `web/src/picker/TunePopover.tsx`.
- Shipped `p3c-kannada` (`a6a2599`, `apna-area-00010-puy`): 30 audited polite-plural Kannada survival phrases (`data/phrases.json`, `server/src/live/phrases.ts`), `ENABLED_LANGUAGES = ["en", "hi", "kn"]`, `mark_phrase_attempt` (`630-717 ms` live), WebAudio chime (`web/src/live/chime.ts`), `PhraseFlyCard.tsx`, and `React.lazy` `MissionDialog` split (`156.9 KB` gzip initial JS, `0` build warnings).

## 3. Decisions Made
- **ADR-014:** Director `< 10 words` field budget, `32s` upstream timeout, and shared `FallbackPlansMapSchema`.
- **ADR-015:** `v1alpha` (`uses: 3`) ephemeral tokens for `@google/genai@3.6.1`, lazy `@google/genai` chunk, and `256x256` WebP portraits.
- **ADR-016:** 30 speaker-gender-neutral, polite-plural Kannada phrases matched by `PhraseSituation` and `honorificGender`.

## 4. Open Questions
- None; Phase 4 plan (`T4.1`..`T4.3`) is approved by the user and ready to build.

## 5. Known Issues
- None; `11/11` Vitest suites (`35/35` tests) and `4/4` Playwright E2E specs pass with zero warnings.

## 6. File State
- Clean working tree on branch `phase/p4-adaptive`, identical to `main` (`tag: p3c-kannada`).

## 7. The Single Next Task
- Build and ship **Phase 4 (`phase/p4-adaptive`, `T4.1`..`T4.3`)**: score completed missions in under 1 second via `POST /api/score` (`gemini-decision-1` `v1beta` `decisions.create` with `noul`, `score`, `choice`, sorted option keys + `other`, and `< 0.75` confidence fallback) and render `MissionResultCard.tsx`, `WhyChangedDisclosure.tsx`, and `XpCounter.tsx` with 1-click player pace override.

## 8. Resume Checklist
1. `AGENTS.md`
2. `PROJECT_BRIEF.md`
3. `docs/HANDOFF.md`
4. `docs/TASKS.md`
5. `Design.md`
6. `.agents/rules/gemini-models.md`
