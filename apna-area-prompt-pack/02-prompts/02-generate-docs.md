# 02 · Generate the project docs, one file at a time

**Use when:** right after the approved kickoff plan, same conversation (it holds the clarifications).
**Where:** Antigravity, Planning mode.
**Model:** Gemini 4 Neon at `high` (fast multi-file synthesis). Carbon reviews in prompt 03.
**Time:** 30 to 40 minutes.

These docs are the agents' long-term memory. Every later prompt points at them, so they must be specific, consistent and short.

## Paste this

```text
Using the approved plan and @PROJECT_BRIEF.md, generate the project docs ONE FILE AT A TIME, in this exact order. For each file:
  a) draft it,
  b) self-check it against PROJECT_BRIEF.md and the files already written (contradictions, missing pieces, vague words like "fast" or "nice"),
  c) fix what the check found,
  d) show me a 5-line summary of the file and the self-check result,
  e) WAIT for me to say "next" before writing the following file.

1. docs/PRD.md
   Problem, hero user (Ananya), jobs to be done, the core loop as numbered user steps, every screen with its single primary action, success metrics for the 3-minute demo, non-goals, open questions.

2. docs/ARCHITECTURE.md
   System diagram in Mermaid (browser, Fastify server, Gemini APIs, Maps APIs, Secret Manager, Cloud Run). Folder tree for web/, server/, shared/, data/, scripts/. Every API route with request and response types. Sequence diagrams (Mermaid) for: world generation, a voice mission, scoring and adaptation, kit export. Error and fallback paths. Caching.

3. docs/MODELS.md
   For each runtime job: model ID, thinking level, inputs, output schema, latency budget, cost estimate per demo run, fallback, and the exact prompt skeleton (system instruction plus template). Include the Decisions API questions with their types, criteria and confidence thresholds. Include the NPC persona schema for the Live API.

4. Design.md  (repo root, as Google recommends)
   Design direction from .agents/rules/design.md made concrete: tokens (colour, type scale, spacing, radius, shadows, motion curves), every screen and state (empty, loading, success, error, offline), every microinteraction with its trigger and timing, copy for every button and error, accessibility notes. This file grows with every feature.

5. docs/DATA.md
   The ORR bounding box coordinates, the seed list of tech parks and neighbourhoods to verify, the Places API (New) verification method, the places.json schema, the corridor.geojson source, and the rule: unverified items are dropped, never guessed.

6. docs/TASKS.md
   Phase board P0 to P6, with P3 split into P3a English, P3b Hindi, P3c Kannada. Each phase step names its branch (phase/<step>) and tag. Each phase: goal, tickets (each ticket = one goal, files it may touch, success criteria, test to prove it, estimate in minutes, model tier: Hydrogen worker or Neon lead). Mark which tickets can run in parallel. Add a "Later" list and the cut line.

7. docs/TESTING.md
   Unit, contract, e2e smoke, manual demo checklist, and the evidence each phase must produce.

8. docs/DEMO.md
   The 3-minute live script second by second, the judge-picks-an-office moment, what to say, fallback for every step, and the pre-demo checklist.

9. docs/RISKS.md
   Top 10 risks with likelihood, impact, early signal, mitigation, owner.

10. docs/DECISIONS.md
    ADR log. Seed it with every decision already made (stack, models, region, no database, verified-places rule) in the format: ID, date, decision, why, alternatives rejected, revisit if.

11. docs/HANDOFF.md
    Initial state using the handoff skill format.

Rules: no em dashes, no filler, concrete numbers over adjectives, every claim about an API checked with the Gemini or Maps skills. Commit after each approved file: "docs: add <file>".
```

## Done when
- All 11 files exist, each committed, and TASKS.md tickets are small enough to finish in under 45 minutes each.

## Next
`03-adversarial-review.md`
