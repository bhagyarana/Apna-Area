# 27 · Recover: when the agent goes off the rails

**Use when:** the agent duplicates components, rewrites files it should not touch, loops on the same failing fix, or the live deploy breaks.

## 1. Stop the bleeding (you, 2 minutes)
```bash
# Live site broken: send traffic back to the last good revision
gcloud run revisions list --service apna-area --region asia-south1 --limit 5
gcloud run services update-traffic apna-area --region asia-south1 --to-revisions <last-good-revision>=100

# A bad step already merged to main: undo the whole step in one commit
git checkout main && git pull
git log --merges --oneline -5            # find the merge commit of the bad step
git revert -m 1 <merge-commit> && git push

# A phase branch went wrong: keep main untouched, start the step again
git status && git diff --stat
git branch recover/<topic>-attempt-1      # keep the work, just in case
git checkout <phase-branch> && git reset --hard <last-good-commit-on-branch>
# or abandon it: git checkout main && git checkout -b <phase-branch>-v2

# Language step misbehaving: switch it off without touching git history
# shared/config.ts -> ENABLED_LANGUAGES = previous list, then ship
```

## 2. Paste into a NEW conversation

```text
The previous session drifted. Do not continue its approach.
Read @AGENTS.md @docs/HANDOFF.md @docs/TASKS.md. Compare branch recover/[topic]-attempt-1 with main using git diff main...recover/[topic]-attempt-1.
1. Tell me which changes are good and worth keeping, which are duplicates or scope creep, and which caused the break.
2. Propose the smallest plan to reach the ticket's success criteria from the last good tag, reusing only the good changes.
3. List files you will not touch. Wait for "go".
```

## Signs to roll back instead of fixing forward
- Two fix attempts failed on the same error.
- The diff touches more than twice the files the ticket allowed.
- Tests were edited to pass instead of code being fixed.
