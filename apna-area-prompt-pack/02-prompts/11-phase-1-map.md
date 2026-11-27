# 11 · Phase 1: the map and a verified world

**Goal:** a beautiful, deterministic ORR map built only from places verified through Google Maps Platform, plus the office picker.
**Where:** Antigravity. Lead on Neon. T1.1 (data) and T1.3 (map UI) run in parallel as Hydrogen workers; T1.4 waits for both.
**Time:** 90 minutes. **Tag:** `p1-map`.

## Paste this into the lead conversation

```text
Phase 1. One goal: a player can open the app, see the Outer Ring Road corridor on a styled map, and choose the office they are joining from verified tech parks.

Branch: create phase/p1-map from main. Parallel workers use their own worktrees (see .agents/rules/engineering.md, Git).

Read first: @PROJECT_BRIEF.md @docs/DATA.md @docs/ARCHITECTURE.md @Design.md @docs/TASKS.md @design/stitch/ (if present)
Use the Google Maps agent skills for every Maps API detail. Do not guess endpoints or field masks.

Plan first (goal, assumptions, NOT touching, tickets), then wait for "go".

T1.1 scripts/verify-places.ts (run locally with MAPS_SERVER_KEY, never in the browser):
  - Use Places API (New) Text Search with a locationRestriction rectangle equal to the ORR bounding box in shared/config.ts.
  - Query categories: tech parks, darshinis and South Indian breakfast places, PGs and co-living, auto stands, metro stations, bus stops, lakes and parks, cafes.
  - Keep id, displayName, location, types, formattedAddress, a derived category and the nearest neighbourhood label.
  - Drop anything outside the box, closed permanently, or duplicated. Never invent a place.
  - Write data/orr/places.json and a summary table (count per category, per neighbourhood).
T1.2 scripts/build-corridor.ts: use the Routes API to compute the driving route along ORR from Marathahalli to Silk Board, store the decoded line as data/orr/corridor.geojson. Commit both data files with a note of the run date.
T1.3 web/map: @vis.gl/react-google-maps, a dark custom map style matching Design.md (cloud map ID or JSON style), camera restricted to the bounding box, corridor drawn as a glowing pink line, tilt and heading for depth.  2D only for now: build something solid first. Photorealistic 3D is on the Later list.
T1.4 Office picker: one question, "Which office are you joining?", a combobox built on UI SDK behaviours (keyboard, typeahead, roving focus) listing verified tech parks, plus 6 suggestion chips. On select, the camera glides to the office (under 1.2 s, ease-out) and a yellow destination marker appears. Selection persists in localStorage.
T1.4b Tour mode (borrowed from the levels.fyi Bengaluru atlas, our reference): on first load, a skippable 8 to 10 second camera flight along the corridor from Marathahalli to Silk Board with 4 neighbourhood labels fading in, ending on the office question. Esc or any click skips it. The picker also opens with Cmd/Ctrl+K.
T1.5 Tests: unit tests for bounding-box filtering, dedupe and category mapping; a Playwright test that picks an office by keyboard only.
T1.6 Ship with the ship-phase skill.

NOT touching: Gemini calls, missions, voice, scoring.
Done when: the live URL shows the corridor, the picker works by mouse and keyboard, every marker comes from places.json, the summary table is pasted into docs/DATA.md, and the landing plus picker pass the subtraction pass and score 9/10 in the design critic loop (02-prompts/28).
```

## Watch for
- If Places returns too few darshinis or PGs near one office, widen queries, not the bounding box.
- Ask a Bengaluru local at the venue to glance at the place list for 2 minutes. Real-world sense beats any model.

## Next
`12-phase-2-director.md`
