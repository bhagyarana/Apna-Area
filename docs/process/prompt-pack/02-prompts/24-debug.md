# 24 · Debug: reproduce, isolate, fix, prove

**Use when:** something fails locally or on the deployed URL.
**Where:** a fresh Antigravity conversation (a stuck conversation keeps repeating its own mistakes).
**Model:** Gemini 4 Neon at `high`. Escalate to Carbon at `high` if two attempts fail or the bug spans server and browser.

## Paste this

```text
Bug: [what you expected] vs [what happened].
Where: [local or live URL], [browser], [steps to reproduce].
Evidence: [error text, Cloud Logging lines, screenshot, failing test].

Rules: no fix until the cause is proven.
1. Reproduce it and show me the failing output.
2. List up to 3 hypotheses, ranked, each with the cheapest test that would confirm or kill it.
3. Run those tests in order until one hypothesis is confirmed. Show evidence.
4. Propose the smallest fix that addresses the root cause, not the symptom. List files you will touch and files you will not.
5. Add a test that fails before the fix and passes after.
6. Apply, run npm run check, show results.
If this needs logs from Cloud Run: gcloud logging read 'resource.type="cloud_run_revision" AND severity>=WARNING' --limit 50 --freshness 30m

If the cause is a Gemini or Maps API behaviour, check the docs through the skills or docs MCP before changing code.
```

**Video bugs:** for a visual glitch or audio desync, record a 20-second screen capture and ask Neon to analyse it with agentic video processing ("find the exact timestamp where the layout shifts, explain the cause and write the patch").
