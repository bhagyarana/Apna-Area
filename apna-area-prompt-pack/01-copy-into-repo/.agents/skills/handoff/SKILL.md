---
name: handoff
description: Use when a conversation is getting long, before switching agents or models, or when asked to save progress. Writes docs/HANDOFF.md so a fresh session can continue with zero lost context.
---

# Write a handoff

Overwrite `docs/HANDOFF.md` with exactly these sections, verified against the actual files (open them, do not rely on memory):

1. **Now:** current phase, current tag, live URL and revision.
2. **Done this session:** bullet list with file paths and commit hashes.
3. **Decisions made:** one line each, also appended to `docs/DECISIONS.md`.
4. **Open questions:** anything waiting on the human.
5. **Known issues:** with reproduction steps.
6. **File state:** files created or changed but not yet committed.
7. **The single next task:** one sentence, with its success criteria.
8. **Resume checklist:** the exact files a new session must read, in order.

Then update the phase board in `docs/TASKS.md`. Keep the handoff under 400 words.
