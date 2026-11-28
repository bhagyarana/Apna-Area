# 30 · Cloud Run: first deploy and fixing deploy problems

**Use when:** the first deploy in P0, or whenever `ship-phase` fails at the deploy step.
**Where:** Antigravity with terminal access, plus your own terminal for anything that asks for login.
**Model:** Gemini 4 Neon at `medium`. Use the google/skills Cloud Run and gcloud skills.

## Paste this

```text
Goal: a public, healthy Cloud Run deployment of this repo. Use the Cloud Run and gcloud skills. Show every command before running it.

1. Verify: gcloud config list (project, account), enabled services (run, cloudbuild, artifactregistry, secretmanager), secrets gemini-api-key and maps-browser-key exist.
2. Make sure the Cloud Run runtime service account can read both secrets:
   gcloud secrets add-iam-policy-binding <secret> --member="serviceAccount:<PROJECT_NUMBER>-compute@developer.gserviceaccount.com" --role="roles/secretmanager.secretAccessor"
3. Build locally with Docker and hit /api/health before deploying.
4. Deploy with the exact command in .agents/skills/ship-phase/SKILL.md.
5. If --allow-unauthenticated is blocked by an org policy, stop and tell me; do not try workarounds. I will ask the organisers.
6. Verify: curl /api/health, open the URL, check Cloud Logging for errors in the last 10 minutes.
7. Print the URL and remind me to add it to the Maps browser key referrers (https://<url>/*).

Common fixes to check first if it fails: the container must listen on $PORT (8080), the start command must use the built server, secrets must be mounted as env vars, WebSocket routes need --timeout 3600 and HTTP/1.1 upgrade support on the server.
```
