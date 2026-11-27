# 22 · Review gate: a stronger model checks the worker

**Use when:** every time a worker ticket reports done, before the lead integrates it.
**Where:** a fresh Antigravity conversation (the reviewer must not have written the code).
**Model:** Gemini 4 Neon at `high` for normal tickets; Gemini 4 Carbon for audio, secrets, verifier, scoring or deploy changes.

## Paste this

```text
You are the review gate. You did not write this code. Your job is to stop bad changes, not to be nice.

Ticket: [paste the filled ticket]
Diff: run `git diff [phase-branch]...ticket/[ticket-id]` and read it fully.
Rules: @.agents/rules/engineering.md @.agents/rules/gemini-models.md @.agents/rules/security-and-control.md @.agents/rules/design.md (UI only)

Check, in this order:
1. Scope: did it touch only the allowed files? Anything extra is an automatic FIX.
2. Correctness: does it meet every success criterion? Run the named tests yourself.
3. Truth rules: any place not from places.json, any invented price, any hardcoded model ID, any key in client code, any mocked default path?
4. Failure handling: timeouts, retries, user-facing errors, logs.
5. Readability: header comment, TSDoc, names, file size, dead code.
6. UI only: tokens from Design.md, motion rules, keyboard access, copy rules (no em dashes).

Verdict format:
- PASS, or
- FIX: a numbered list, each with file, line, problem, exact change.
Then state your confidence (0 to 100) and the one thing you could not verify.
```

If the verdict is FIX, paste the list back into the worker conversation: "Apply exactly these fixes, nothing else, then re-run the tests." Then gate again. On PASS, the lead merges the ticket branch into the phase branch with `--no-ff`.
