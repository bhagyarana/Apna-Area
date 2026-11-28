# 31 · Submission pack: README, architecture overview, final checks

**Use when:** after P6 ships, at least 60 minutes before the deadline.
**Where:** Antigravity, on branch `phase/p7-submission`, shipped with the `ship-phase` skill like any other step.
**Model:** Gemini 4 Neon at `high` to write, Carbon to review.

The submission needs three things: the live Cloud Run URL, the public GitHub repo, and the demo video, plus an architecture overview.

## Paste this

```text
Goal: everything a judge needs to understand, run and score Apna Area in 5 minutes.

Branch: phase/p7-submission from main.
Read: @PROJECT_BRIEF.md @docs/PRD.md @docs/ARCHITECTURE.md @docs/MODELS.md @docs/DEMO.md @Design.md and the git log.

1. README.md (repo root):
   - One-line pitch and a 2-sentence story about Ananya.
   - Live URL, a GIF or screenshot of the core loop, the 3-step "try it" guide.
   - How it passes the four judge tests (one table).
   - Architecture diagram (Mermaid) and the model routing table, with why each model was chosen.
   - Languages: English, Hindi and Kannada, shipped one at a time behind ENABLED_LANGUAGES.
   - Truth and safety: verified places only, no invented prices, confirm sheets, no stored audio.
   - Run locally: prerequisites, .env.example, npm commands. Deploy: the gcloud command.
   - How it was built: phase branches and tags (link the tag list), the agent swarm (Neon lead, Hydrogen workers, Carbon review gate and design critic).
   - Credits: Google Maps Platform data, Lyria-generated music, Nano Banana art, fonts and their licences.
2. docs/ARCHITECTURE_OVERVIEW.md: a one-page version for judges, one diagram, under 400 words.
3. Final checks, report each as pass or fail:
   - Live URL loads in an incognito window and the core loop works end to end.
   - Repo is public and `npx gitleaks detect` over the full history is clean.
   - No API key, no .env, no personal data in the repo.
   - Every claim in the README is true of the deployed version.
   - No em dashes anywhere in README or UI copy (grep for them).
Then switch to Carbon and run 23-self-check.md on the README. Ship with the ship-phase skill, tag p7-submission.
```

## Human checklist before you hit submit
- [ ] Cloud Run URL works from your phone on mobile data.
- [ ] GitHub repo public, main has the final tag.
- [ ] Video uploaded with the right visibility.
- [ ] Everything exported off the temporary account (it is deleted tomorrow): repo pushed, assets downloaded, video saved locally.
