---
name: ship-phase
description: Run at the end of every phase step or whenever asked to deploy. Verifies the phase branch, deploys a no-traffic preview on Cloud Run, smoke tests it, merges to main, tags, sends traffic to the new revision and writes the handoff.
---

# Ship a phase step

Run these steps in order on the phase branch (for example `phase/p3b-hindi`). Stop at the first failure, report it, and do not continue.

1. **Check:** `npm run check` (typecheck, lint, unit tests). Paste the summary line.
2. **Secret scan:** `npx gitleaks detect --no-banner`. Must be clean.
3. **Container sanity, once per phase:** `docker build -t apna-area .`, run it with `docker run -p 8080:8080 --env-file .env.local apna-area`, hit `/api/health`.
4. **Push the branch:** `git push -u origin <phase-branch>`.
5. **Preview deploy, no live traffic:**
   ```bash
   gcloud run deploy apna-area \
     --source . \
     --region asia-south1 \
     --no-traffic --tag <short-tag> \
     --set-secrets GEMINI_API_KEY=gemini-api-key:latest,MAPS_BROWSER_KEY=maps-browser-key:latest \
     --memory 1Gi --cpu 1 --min-instances 1 --max-instances 3 \
     --timeout 3600
   ```
   `<short-tag>` is lowercase letters, digits and hyphens, for example `p3b`. The command prints a preview URL like `https://p3b---apna-area-<hash>.a.run.app`. Add `--allow-unauthenticated` on the very first deploy only. The very first deploy (P0) creates the service, so run it without `--no-traffic --tag`.
6. **Smoke test the preview URL:** `curl -s <preview-url>/api/health`, then `BASE_URL=<preview-url> npx playwright test smoke --config playwright.live.config.ts`. Ask the human to try the step's feature on the preview URL. Wait for "merge".
7. **Merge to main:**
   ```bash
   git checkout main && git pull
   git merge --no-ff <phase-branch> -m "merge: <phase-branch>"
   git tag <phase-tag> && git push origin main --tags
   ```
8. **Go live:** if `git diff --quiet <phase-branch> main` (main is exactly the previewed code), promote the preview revision:
   `gcloud run services update-traffic apna-area --region asia-south1 --to-tags <short-tag>=100`.
   Otherwise deploy from main with step 5's command without `--no-traffic --tag`.
9. **Record:** revision name, tag, live URL and what changed in `docs/HANDOFF.md`. Delete the merged branch locally and on GitHub. Remove worker worktrees (`git worktree remove <path>`).
10. **Report** to the user: tag, live URL, revision, test summary, anything flaky.

## Rollback
- **Live site:** `gcloud run services update-traffic apna-area --region asia-south1 --to-revisions <previous-revision>=100` (seconds, no rebuild).
- **Code:** `git revert -m 1 <merge-commit>` on main, push, then ship as usual. Never force-push main.
- **Feature flag:** for language steps, set `ENABLED_LANGUAGES` back to the previous list and ship.
