# 00 · Setup the workspace

**Use when:** first thing, before any product code.
**Where:** your terminal, then one new Antigravity conversation.
**Model:** Gemini 4 Hydrogen (fast, routine).
**Time:** 20 minutes.

## Human steps first (only you can do these)

1. **Accounts.** In a separate Chrome profile, sign in to AI Studio with the temporary account. Open aistudio.google.com/api-keys and confirm the imported project has a Tier 3 key. Set a sensible cap at aistudio.google.com/spend.
2. **Antigravity login.** Do not use the blue sign-in button (that gives free-tier quota). Use the small grey link under it, choose the temporary account, paste the project ID from aistudio.google.com/projects, pick region `global`, keep "Use agent platform" selected.
3. **gcloud.**
   ```bash
   gcloud auth login            # temporary account
   gcloud config set project <PROJECT_ID>
   gcloud services enable run.googleapis.com cloudbuild.googleapis.com \
     artifactregistry.googleapis.com secretmanager.googleapis.com \
     maps-backend.googleapis.com places.googleapis.com routes.googleapis.com
   printf "%s" "<GEMINI_KEY>" | gcloud secrets create gemini-api-key --data-file=-
   ```
   Create a Maps browser key in Cloud Console (Credentials), restrict it to Maps JavaScript API, Places API (New) and Routes API, referrers `http://localhost:*` for now. Store it the same way as `maps-browser-key`. Add the Cloud Run URL to its referrers after P0 ships.
4. **Repo.** Open your `Apna-Area` folder in Antigravity. Copy everything inside `01-copy-into-repo/` to the repo root (including the hidden `.agents` folder).

## Paste this into Antigravity

```text
Goal: prepare this workspace so every later agent has the right tools and context. Do not write product code.

1. Read AGENTS.md and PROJECT_BRIEF.md. Summarise the product in 3 sentences so I can confirm you understood.
2. Install agent tooling. Run each command, show the last lines of output, and stop if one fails:
   - npx add-mcp "https://gemini-api-docs-mcp.dev"
   - npx skills add google-gemini/gemini-skills --skill gemini-api-dev
   - npx skills add google-gemini/gemini-skills --skill gemini-live-api-dev
   - npx skills add google/skills            (pick: Cloud Run basics, Gemini Interactions API, LiveAPI service, gcloud CLI, Cloud Build)
   - npx skills add googlemaps/agent-skills
   - npx skills add gustavo-fior/craft
   - npx skills add emilkowalski/skills
   - npx skills add jakubkrehel/skills
   - npx skills add keshav-exe/taste-skill --skill kshv-taste
   Target Antigravity, project scope. For UI SDK (github.com/vercel-labs/ui), add its agent skill as ui-sdk.dev describes.
3. Create .gitignore covering node_modules, dist, .env*, *.log, coverage, playwright-report, .DS_Store. Commit it before anything else.
4. Create .env.example with GEMINI_API_KEY=, MAPS_BROWSER_KEY=, MAPS_SERVER_KEY=, PORT=8080 and no values.
5. Create an empty docs/ folder with a .gitkeep.
6. Commit to main: "chore: workspace setup, agent rules and skills". This and the .gitignore commit are the only direct commits to main; everything after goes through phase branches.

Report: installed skills list, anything that failed, and the commit hash.
```

## Done when
- Skills and docs MCP installed, `.gitignore` committed first, `.env.example` present, no secrets anywhere in git.

## Next
`01-kickoff-architect.md`
