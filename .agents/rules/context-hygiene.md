---
trigger: always_on
description: How to keep context small, deterministic and honest across long sessions
---

# Context hygiene

- **State lives in files, not in chat.** `docs/TASKS.md` is the board, `docs/HANDOFF.md` is the latest state, `docs/DECISIONS.md` records every choice with its reason.
- **Verify against the files.** Before claiming something exists, open it. Before claiming something works, run it.
- **Load only what the task needs.** Reference files with `@path` instead of pasting them. Do not read lockfiles, build output or the full dataset.
- **One goal per conversation.** When a conversation drifts or passes about 60% of its context, write a handoff and start fresh.
- **Say what you will not touch.** Every plan lists out-of-scope files and folders.
- **Separate facts from guesses.** Mark assumptions as `ASSUMPTION:` in plans and resolve them before coding.
- **Keep a prompt log.** Prompts that worked well or failed go in `docs/PROMPT_LOG.md` with the model used. Failed ones get retried when a newer model ships.
- **Quiet tools.** Prefer `--silent`, `--reporter=dot` and `| tail -50` on noisy commands. If RTK or Caveman are installed, use them to trim command output and chatter.
