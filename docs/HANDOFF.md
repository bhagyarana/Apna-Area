# Session Handoff (`docs/HANDOFF.md`)

## 1. Now
- **Current phase:** Foundation (`phase/foundation-docs`, pre-`P0`)
- **Current tag:** none yet (`p0-skeleton` ships next in Block 2)
- **Live URL & revision:** not deployed yet (`gcloud` setup verified before `T0.6`)

## 2. Done This Session
- Verified Windows PowerShell (`5.1`), Node (`v26.12.1`), npm (`12.2.3`), and Git (`2.56.0`).
- Committed `.gitignore` first (`5b8b64f`), unpacked `01-copy-into-repo/` rules and skills to root, added `.env.example` and `docs/.gitkeep` (`e693716`).
- Installed and verified official `gemini-api` and `google-maps-platform` plugins; verified `@google/genai` (`3.6.1`), `@vis.gl/react-google-maps` (`1.10.2`), and `@ui-sdk/react` (`0.1.0-beta.17`).
- Drafted, self-checked, and committed all 11 core docs one by one on `phase/foundation-docs`.
- Ran independent Carbon adversarial review (`03-adversarial-review.md`) in a fresh subagent context and applied all 6 accepted fixes (`trustProxy: true`, `computeRouteMatrix` background pre-warming, `toolSignals` split-brain scoring guard, committed `fallback-plans.json` snapshot, exclusion of under-construction ORR Blue Line metro stations, polite gender-matched Kannada honorifics, and player difficulty override).

## 3. Decisions Made
- Recorded `ADR-001` through `ADR-010` in `docs/DECISIONS.md` (SAFE-only hackathon execution, single Cloud Run container in `asia-south1`, schema-enum + verifier place lock, `v1beta` ephemeral Live tokens omitting `thinkingConfig`, Pro-SKU Places masks, sequential `en` -> `hi` -> `kn` rollout).

## 4. Open Questions
- **Taste check-in (`04-design-discover.md`):** Waiting on user selection of 2 to 3 favourite game-layer directions so we can generate 3 seeded HTML mockups in `design/discover/` and lock Section 3 of `Design.md`.
- **Before `T0.6` Cloud Run deploy:** Install/add `gcloud` CLI to Windows `PATH` and authenticate to the hackathon GCP project with `gemini-api-key` and `maps-browser-key` secrets.

## 5. Known Issues
- `gcloud` and `docker` are not currently on Windows `PATH` (`gcloud --version` returned `CommandNotFoundException`). Does not block local `P0` build/tests (`T0.1` to `T0.5`), only `T0.6` Cloud Run deploy.

## 6. File State
- All foundation docs are committed one by one on `phase/foundation-docs` and ready for `--no-ff` merge to `main` after adversarial review.

## 7. The Single Next Task
- Generate 3 seeded static HTML game-layer variations in `design/discover/` from the user's chosen `04-design-discover` taste reactions, lock Section 3 of `Design.md`, merge `phase/foundation-docs` to `main`, and start `phase/p0-skeleton`.

## 8. Resume Checklist
1. `AGENTS.md`
2. `PROJECT_BRIEF.md`
3. `docs/HANDOFF.md`
4. `docs/TASKS.md`
5. `Design.md`
