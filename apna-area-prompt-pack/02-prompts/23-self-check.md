# 23 · Self-check: assume you are wrong

**Use when:** before accepting any important answer: an architecture choice, a prompt for the Director or NPCs, a tricky bug fix, a model routing decision.
**Where:** the same conversation, right after the answer.
**Model:** whatever produced the answer.

## Paste this

```text
Before I accept that, do this:
1. Assume your answer is wrong in at least one important way. Find the most likely error.
2. Check it against the actual files, tests or docs (open them, run them). Do not rely on memory.
3. Give the corrected final answer.
4. Rate your confidence from 0 to 100.
5. Name the single assumption that, if false, would break this answer, and how I can check it in under 2 minutes.
```
