# Apna Area · build guide and prompt pack

Everything you need to build Apna Area end to end in Google Antigravity with a swarm of Gemini 4 agents, ship every phase to Cloud Run, and submit. Start here, then follow the run order.

## The product in one breath

Apna Area turns Bengaluru's Outer Ring Road into a playable city for someone about to move there. Pick the office you are joining, and Gemini builds your first week as a game: missions at real, verified places, characters you talk to out loud in Kannada, Hindi or English, difficulty that adapts to you, and a Survival Kit you keep.

**Hero user:** Ananya, 24, joining a Bellandur tech park in two weeks, no Kannada, no idea where to live. Full brief in `01-copy-into-repo/PROJECT_BRIEF.md`.

| Judge test | How we prove it live |
|---|---|
| Concrete person | Ananya's first week on ORR |
| Needs Gemini 4 reasoning, routing, verification | Neon plans missions from verified place IDs only, Decision 1 scores and routes difficulty, Live runs multilingual NPCs |
| People in control | Confirm sheet before anything leaves the app; no bookings, payments or stored audio |
| Live, real input, under 3 minutes | A judge picks any office and plays one mission |

---

## What is in this folder

```
apna-area-prompt-pack/
├── README.md                         you are here: the guide
├── 01-copy-into-repo/                copy into the repo root, as is
│   ├── AGENTS.md                     always-on project identity for Antigravity
│   ├── PROJECT_BRIEF.md              single source of truth
│   ├── AI_STUDIO_SYSTEM_INSTRUCTIONS.md   only if you prototype in AI Studio
│   └── .agents/
│       ├── rules/                    engineering, design, gemini-models, security-and-control, context-hygiene
│       └── skills/                   ship-phase, handoff
└── 02-prompts/                       paste these, in order
    ├── 00-setup.md                   tools, skills, secrets, repo
    ├── 01-kickoff-architect.md       slow down, 95% clarity, phased plan
    ├── 02-generate-docs.md           the prompt that writes all project docs, one by one
    ├── 03-adversarial-review.md      stress-test the plan (and later the product)
    ├── 04-design-discover.md         go broad, react with your taste, seeded variations
    ├── 05-stitch-design.md           first screens in Stitch, fed with that direction
    ├── 10 to 16 phase prompts        P0 skeleton to P6 harden and demo
    ├── 20-orchestrator.md            lead agent splits a phase into parallel tickets
    ├── 21-worker-ticket.md           single-goal ticket template for workers
    ├── 22-review-gate.md             stronger model checks every worker diff
    ├── 23-self-check.md              "assume you are wrong" check
    ├── 24-debug.md                   reproduce, isolate, fix, prove
    ├── 25-handoff.md                 fresh session, zero lost context
    ├── 26-vibe-check-raise-the-bar.md   score out of 100, cheapest wins
    ├── 27-recover-rollback.md        when the agent goes off the rails
    ├── 28-design-critic-loop.md      screenshot-only critic until 9/10
    ├── 30-ship-cloud-run.md          first deploy and deploy fixes
    ├── 31-submission-pack.md         README, architecture overview, final checks
    └── 32-demo-video.md              feature-complete launch-style demo video
```

---

## How the AI agents build it

```
                 YOU  (approve plans, answer questions, final say on merges)
                  │
   ┌──────────────┴──────────────┐
   │  Lead agent · Gemini 4 Neon  │  plans the phase, writes interfaces and tickets,
   │  (Carbon for P3 and kickoff) │  integrates results, never skips verification
   └──────────────┬──────────────┘
        ┌─────────┼─────────┐
        ▼         ▼         ▼
    Worker A   Worker B   Worker C      Gemini 4 Hydrogen, one ticket each,
    (own chat) (own chat) (own chat)    only their own files, tests before "done"
        └─────────┼─────────┘
                  ▼
   ┌─────────────────────────────┐
   │ Review gate · Neon / Carbon │  fresh conversation, PASS or a FIX list
   └──────────────┬──────────────┘
                  ▼
   ship-phase skill: check → preview on Cloud Run (no traffic) → merge to main → tag → go live → handoff
                  ▼
             next phase
```

**Why this shape:** the guide recommends combining models in one loop, with Neon or Carbon for complex reasoning and Hydrogen for parallel subagent work. Workers never share files and interfaces are written first, so parallel work stays deterministic. Every step lives on its own branch, lands on main as one merge commit and ships to Cloud Run, so a broken change is always one `git revert` or one traffic switch away from undone.

**Memory between sessions** lives in files, not chats: `PROJECT_BRIEF.md` (what), `docs/TASKS.md` (board), `docs/DECISIONS.md` (why), `docs/HANDOFF.md` (where we stopped). Antigravity loads `AGENTS.md` and `.agents/rules/*.md` automatically.

---

## Run order

| # | Prompt | Where | Model | You are done when |
|---|---|---|---|---|
| 1 | `00-setup` | Terminal + Antigravity | Hydrogen | Skills installed, secrets stored, `.gitignore` committed first |
| 2 | `01-kickoff-architect` | New chat, Planning mode | Carbon | You approved a phased plan with a cut line |
| 3 | `02-generate-docs` | Same chat | Neon high | 11 docs written and committed one by one |
| 4 | `03-adversarial-review` | New chat | Carbon | Accepted fixes applied to docs |
| 5 | `04-design-discover` | New chat + your taste | Carbon, then Neon | A game-layer direction only you would pick, saved in Design.md |
| 6 | `05-stitch-design` | Stitch (parallel with P0) | n/a | 3 screens saved in `design/stitch/` |
| 7 | `10` P0 skeleton | Lead chat + workers | Neon + Hydrogen | Themed shell live on Cloud Run, tag `p0-skeleton` |
| 8 | `11` P1 map | Lead + workers | Neon + Hydrogen | Verified ORR map and office picker live |
| 9 | `12` P2 director | Lead + workers | Neon + Hydrogen | Verified 5-mission week in under 12 s |
| 10 | `13` P3a English | Lead + workers | Carbon plans, Neon leads | Five NPCs talk in English with captions |
| 11 | `13` P3b Hindi | Fresh lead chat | Neon | NPCs understand Hindi and code-switch |
| 12 | `13` P3c Kannada | Fresh lead chat | Neon, Carbon reviews phrases | Kannada-first NPCs teach a phrase per mission |
| 13 | `14` P4 adaptive | Lead + workers | Neon + Hydrogen | Mission 2 visibly adapts to mission 1 |
| 14 | `15` P5 kit | Lead + workers | Neon + Hydrogen | Real commute times, confirm sheets, music |
| 15 | `03` again, then `16` P6 | New chat, then lead | Carbon, then Neon | Three clean rehearsals under 3 minutes |
| 16 | `31-submission-pack` | Antigravity | Neon, Carbon review | README, overview, write-up, checks all pass |
| 17 | `32-demo-video` | Your recorder | n/a | Video exported and uploaded |

**Inside every phase:** branch from main → phase prompt → `20-orchestrator` → `21-worker-ticket` per worker → `22-review-gate` per result → integrate → subtraction pass + `28-design-critic-loop` (UI phases) → `ship-phase` skill → `26-vibe-check` (5 minutes) → `25-handoff`.

---

## Design process: Discover, Define, Deliver

Adapted from "How to turn your AI into a world-class designer" (Anshu Chimala, Lenny's Newsletter). Models pick the most predictable option at every step, so the variety and the taste have to come from outside the model.

| Stage | What we do | Where |
|---|---|---|
| **Discover** | Go broad with 20+ directions, react with your own taste, sharpen, then make seeded variations (a random string drives the layout choices) | `04-design-discover` |
| **Define** | A fresh Carbon critic sees only screenshots next to 4 pro references, ranks them, scores out of 10; the builder fixes; stop at 9/10, max 3 rounds | `28-design-critic-loop` |
| **Define** | Real imagery instead of gradients: Nano Banana NPC portraits and art generated at build time; optional looping hero clip in P6 | `13` (T3.5b), `16` |
| **Deliver** | Subtraction pass: list every element, remove what adds nothing | `.agents/rules/design.md`, `16` (T6.5) |

Prompts that work or fail go in `docs/PROMPT_LOG.md`; critic scores per round go in `docs/DESIGN_SCORES.md`.

---

## Time plan

| Block | 12-hour plan | 8-hour plan (cut line applied) |
|---|---|---|
| Setup, kickoff, docs, review | 1 h 40 | 1 h |
| Design discover (parallel with P0) | 30 min | skip, use the deck direction |
| Critic loops (inside UI phases) | about 20 min per phase | one round on landing and kit only |
| P0 skeleton + first deploy | 1 h 15 | 45 min |
| P1 map + verified data | 1 h 30 | 1 h |
| P2 director | 1 h 30 | 1 h |
| P3a English / P3b Hindi / P3c Kannada | 1 h 30 / 30 min / 45 min | 1 h 15 / 20 min / 30 min (3 NPCs, not 5) |
| P4 adaptive | 1 h 15 | 45 min (no HUD polish) |
| P5 survival kit | 1 h 30 | 45 min (commute + confirm sheets, no music) |
| P6 harden + rehearse | 1 h 30 | 45 min |
| Submission + video | 1 h 30 | 45 min |

**Only one afternoon left?** Do P0, P1, P2, P3a with one NPC (the auto driver), the scoring call from P4 without HUD polish, then submit. Add P3b and P3c only if time remains. That still passes all four tests.

---

## Model routing

**While building (Antigravity):**

| Job | Model | Thinking |
|---|---|---|
| Kickoff, architecture, adversarial review, P3 planning, hard root causes | Gemini 4 Carbon | high |
| Design ideas and the screenshot-only design critic | Gemini 4 Carbon | high |
| Lead agent per phase, docs, review gate, debugging | Gemini 4 Neon | high |
| Worker tickets, routine edits, tests | Gemini 4 Hydrogen | high, medium for trivial edits |

**Inside the app (runtime):** Director on `gemini-4-neon`, voice on `gemini-3.8-live`, scoring and routing on `gemini-decision-1`, summaries on `gemini-3.5-flash-lite`, music on `lyria-3-clip-preview`, fallback on `gemini-4-hydrogen`. All IDs live in `shared/config.ts`.

---

## When something goes wrong

| Symptom | Use |
|---|---|
| A test or the live site fails | `24-debug` |
| The agent repeats itself or the chat is long | `25-handoff`, then continue fresh |
| The agent touched files it should not, or two fixes failed | `27-recover-rollback` |
| An answer feels too confident | `23-self-check` |
| The product feels "fine" | `26-vibe-check-raise-the-bar` |
| Deploy fails | `30-ship-cloud-run` |
| 429 errors | Raise the cap at aistudio.google.com/spend (not too high) |
| 503 "model overwhelmed" | Retry once, then the fallback model from config |

---

## Hard rules (also enforced by the rules files)

1. Never commit or expose `GEMINI_API_KEY`. If it leaks, delete it in AI Studio and create a new one; a new commit does not clean history.
2. Never show a place that is not in the verified dataset, and never state prices or fares as facts.
3. Nothing leaves the app without a confirm sheet.
4. No mocked responses in the shipped flow; a labelled replay of a real earlier run is the only allowed fallback.
5. Gemini 4 calls never send temperature, top-p, top-k, legacy thinking budgets or `minimal` thinking, and never call manual caching.
6. Every step ends merged to main, tagged and deployed. Never start the next step on a red build, and never commit to main directly.
7. The temporary account is deleted the day after the event. Push the repo, download assets and save the video before you leave.

---

## Decisions confirmed

| Topic | Decision |
|---|---|
| Submission | Live Cloud Run URL, public GitHub repo, architecture overview, demo video. |
| Video | No length limit. It must cover every feature with a compelling story and an intuitive flow (`32`). |
| Languages | English first, then Hindi, then Kannada, each its own branch, tag and flag value. Any one can be switched off or reverted on its own. |
| Map | 2D vector map first. Photorealistic 3D is a Later item once the core loop ships. |
| UI SDK | github.com/vercel-labs/ui (ui-sdk.dev), confirmed. Install it and its agent skill as the repo README says. |
| Git | Phase branches, worktrees for parallel workers, `--no-ff` merges, Cloud Run previews before merge, revert instead of rewrite. |

---

## Git workflow (why branches, and the two refinements)

Working on branches and merging to main only when a step is good is the right call: main stays deployable, every step is reviewable, and every step is revertable as one unit. Two refinements make it work with an agent swarm:

1. **Worktrees for parallel agents.** Branches alone are not enough when two agents work at once: one folder has one checkout, so agents switching branches overwrite each other. `git worktree add` gives each worker its own folder on its own branch, sharing one repository.
2. **Preview before merge.** Cloud Run can deploy a branch with `--no-traffic --tag` and give it its own preview URL. You test the real deployment, then merge, and promote that exact revision to live with no rebuild.

```
main ──●──────────────●──────────────●──────▶   always equals the live site
        \            / p1-map         \
         phase/p1-map ●──●──●──●           phase/p2-director ...
              \        /  \    /
               ticket/t1    ticket/t3       each ticket in its own worktree
```

**Undo options, fastest first:** switch Cloud Run traffic to the previous revision (seconds) · turn a feature flag off (one small ship) · `git revert -m 1 <merge>` on main (clean history) · abandon a phase branch and restart it from main.

## Sources

- Build with Gemini 4: hackathon builder guide (November 2026 PDF): model IDs, roles, thinking levels, Decisions API, boundaries, setup commands.
- How to use a temporary account for a hackathon (goo.gle/hackathon-account): Antigravity login, spend cap, key safety, coding guidelines.
- Antigravity rules docs (antigravity.google/docs/rules): rule locations, frontmatter triggers, size limits.
- Firebase AI Logic Live API specs: Kannada support and audio formats.
- google/skills, googlemaps/agent-skills, ui-sdk.dev, levels.fyi/atlas/bengaluru (reference idea).
- "How to turn your AI into a world-class designer", Anshu Chimala, Lenny's Newsletter (Sep 2026): design process techniques 1 to 6 (technique 7 was paywalled in the copy provided).
