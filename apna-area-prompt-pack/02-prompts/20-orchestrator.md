# 20 · Orchestrator: lead agent runs a swarm

**Use when:** at the start of every phase, to turn the phase prompt into parallel worker tickets and keep control of the merge.
**Where:** the phase's lead conversation in Antigravity.
**Model:** Gemini 4 Neon at `high`. Escalate to Carbon at `high` for P3 (voice) planning and any root-cause hunt.

## How the swarm works

```
You (human, final say)
   │ approve plan, answer questions, merge
   ▼
Lead agent ─ Neon ─ plans the phase, writes tickets, defines interfaces, reviews every result
   │
   ├── Worker A ─ Hydrogen ─ one ticket, own conversation, only its files
   ├── Worker B ─ Hydrogen ─ one ticket, own conversation, only its files
   └── Worker C ─ Hydrogen ─ one ticket, own conversation, only its files
   │
   ▼
Review gate ─ Carbon or Neon, fresh conversation ─ PASS or FIX list per ticket
   │
   ▼
ship-phase skill ─ test, tag, deploy, smoke test, handoff
```

Rules that keep it deterministic: workers never share files, interfaces are written by the lead before workers start, each worker has its own git worktree and branch, and only the lead integrates into the phase branch.

## Paste this into the lead conversation (after the phase prompt's plan is approved)

```text
You are the lead engineer for this phase. Split the approved plan into worker tickets I can run in parallel Antigravity conversations.

1. First write the shared interfaces the tickets depend on (types in shared/types.ts, function signatures, route contracts) and commit them to the phase branch. Workers code against these, never change them.
2. Then output one ticket per worker using EXACTLY the template in 02-prompts/21-worker-ticket.md, filled in. Each ticket:
   - one goal,
   - the only files it may create or edit,
   - the interfaces it must use,
   - success criteria and the test that proves them,
   - estimated minutes,
   - recommended model (Hydrogen unless it is risky).
3. Mark which tickets can run in parallel and which must wait.
4. For each parallel ticket, print the exact worktree command: git worktree add ../apna-area-<ticket> -b ticket/<ticket> <phase-branch>
5. List the integration steps you will do after workers finish, and the order.
Keep tickets under 45 minutes each. If a ticket is bigger, split it.
```

## Then
1. Run the worktree commands. Open each worktree folder in its own Antigravity window (or conversation scoped to that folder), select Hydrogen, paste the filled ticket.
2. When a worker reports done, run `22-review-gate.md` on its diff.
3. Back in the lead conversation: "Merge ticket branches A, B, C into the phase branch with --no-ff in the planned order. Run npm run check after each merge. Report."
4. Finish with the `ship-phase` skill.
