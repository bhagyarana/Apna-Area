# 25 · Handoff: move to a fresh session with zero lost context

**Use when:** a conversation passes about 60% of its context, starts repeating itself, after every shipped phase, or before switching models.
**Where:** the old conversation, then a new one.

## Paste into the OLD conversation

```text
Use the handoff skill. Write docs/HANDOFF.md from the actual files and git log, not from memory: completed work, active decisions, open questions, known issues, exact file and module state, and the single next task with its success criteria. End with a resume checklist. Commit it as "docs: handoff".
```

## Paste into the NEW conversation

```text
Resume Apna Area. Read in this order: @AGENTS.md @docs/HANDOFF.md @docs/TASKS.md, then the files the resume checklist names.
Verify the state yourself: run git status, git log -5 and npm run check. Tell me in 5 lines where we are and what the single next task is. Wait for "go".
```
