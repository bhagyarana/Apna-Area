# 21 · Worker ticket template (single goal, hard constraints)

**Use when:** the lead agent gives you a ticket, or you want to do one small thing safely.
**Where:** a fresh Antigravity conversation per ticket.
**Model:** Gemini 4 Hydrogen at `high`. Use Neon for anything touching audio, auth, money or the verifier.

## Template (the lead fills the brackets)

```text
Focus on ONE goal only: [one sentence goal].

You are working in the git worktree [path] on branch ticket/[ticket-id]. Confirm with `git branch --show-current` before you start. Never switch branches, never touch main.

Context to read (and nothing else unless needed): @AGENTS.md [@relevant docs and files]

You may create or edit ONLY these files:
- [path]
- [path]
Do not touch any other file. If you believe another file must change, stop and tell me why.

Use these interfaces exactly as written (do not change them): [types, signatures, routes].

Constraints:
- [libraries and versions allowed]
- Model IDs only from shared/config.ts. Check SDK syntax with the Gemini or Maps skills.
- Follow .agents/rules/*.md (file header comment, TSDoc, structured logs, zod at boundaries).
- No em dashes in UI copy or docs.

Before coding:
1. Explain back what you think I am asking for, in 3 lines.
2. List your assumptions and what you will NOT touch.
3. Give a step list of at most 6 steps.
Then implement step by step, running the relevant tests after each step.

Done ONLY when:
- [success criterion 1]
- [success criterion 2]
- `npm run check` passes and [named test] passes.

Final report: files changed, test output summary, anything you were unsure about, and one thing that could break this later.
Commit to your ticket branch with a conventional message and push it. Do not merge, do not deploy.
```
