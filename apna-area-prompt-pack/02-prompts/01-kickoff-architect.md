# 01 · Kickoff: slow down and get to 95% clarity

**Use when:** right after setup, once per project.
**Where:** new Antigravity conversation, Planning mode.
**Model:** Gemini 4 Carbon (deepest reasoning; architecture is where mistakes are most expensive).
**Time:** 20 to 30 minutes, mostly you answering.

## Paste this

```text
Act as the strict project architect for Apna Area. Before any code or documents, get to 95% clarity.

Read: @AGENTS.md @PROJECT_BRIEF.md and every file in .agents/rules/.

Step 1. Explain back to me, in 5 bullets, what you think we are building, for whom, and the single workflow judges will see.
Step 2. List every assumption you are making. Mark each as SAFE (low cost if wrong) or RISKY (expensive if wrong).
Step 3. List what you are NOT going to build or touch.
Step 4. Ask me clarifying questions ONE AT A TIME, highest impact first, until every RISKY assumption is resolved. Offer a recommended answer with each question so I can reply "yes".
Step 5. Map dependencies and failure modes: for each phase P0 to P6 in the brief, list external dependencies (APIs, keys, quotas), the top 2 ways it can fail, and how we detect and recover.
Step 6. Reframe the brief one level more ambitious: what would make a Google judge say "this is the best thing I saw today" without adding scope we cannot finish? Give at most 3 ideas, each with its cost in hours.
Step 7. Propose the final phased plan with hour estimates and a cut line (what we drop first if time runs out). Then STOP and wait for my approval.

Rules: no code, no files yet. Short answers. No em dashes.
```

## How to answer well
- Accept recommended answers when they match the brief. Push back only on things that change the demo.
- If it suggests new scope, ask "what would we cut to fit this?"

## Done when
- You approved a phased plan with a cut line. Save the agent's final plan text, you will feed it to the next prompt.

## Next
`02-generate-docs.md`
