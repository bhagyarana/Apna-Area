# Product Requirements Document (PRD)

## 1. Problem Statement
Moving to Bengaluru for a tech park job along the Outer Ring Road (ORR) forces newcomers to make expensive housing and commute choices blind. Static blogs list area names, transit apps show raw traffic lines, and phrasebooks list tourist sentences, yet nothing lets a newcomer rehearse real first-week conversations, hear local accents, or compare realistic weekday commutes from verified places near their specific office.

## 2. Hero User
**Ananya, 24, software engineer from Lucknow.**
- Starts at a company in a Bellandur tech park in 14 days.
- Speaks fluent Hindi and English; knows zero Kannada.
- Budget band: `15_20k`, `20_30k`, or `30k_plus` (`"15_20k" | "20_30k" | "30k_plus"` preference filter; shapes PG/co-living vs gated-flat mission framing and checklist items without ever stating unverified rupee prices as facts).
- Top anxieties: getting stuck at Silk Board for 90 minutes each way, freezing up at a fast-moving darshini counter, arguing over an auto meter in rain, and picking the wrong neighbourhood before signing a deposit.

## 3. Jobs To Be Done
1. **Orient:** Understand how the eastern ORR stretch (Marathahalli to Silk Board) connects offices, residential pockets, lakes, transit stops, and breakfast spots in under 30 seconds.
2. **Practise:** Speak out loud to five realistic local characters in English, Hindi, or Kannada without embarrassment, learning one practical Kannada phrase per mission once Kannada is active.
3. **Calibrate:** Get difficulty that adjusts automatically to how each conversation went, adding support when stuck or increasing local language immersion when confident.
4. **Decide safely:** Leave with a concrete Survival Kit containing traffic-aware commute durations from the Routes API, replayable spoken phrases, and a checklist, while keeping full control over anything that leaves the browser.

## 4. Core Loop (Numbered User Steps)
1. **Tour or Skip:** Watch an 8-second skippable camera flight down ORR from Marathahalli to Silk Board with 4 neighbourhood labels (`Marathahalli`, `Kadubeesanahalli`, `Bellandur`, `HSR / Silk Board`), ending on the office picker.
2. **Choose Office & Tune:** Select a verified ORR tech park via keyboard-accessible combobox or 6 quick-pick chips. Optional "Tune" popover sets language comfort (`en`, `hi`, or `en+hi`) and commute priority.
3. **Watch the Director Build Week One:** Server streams real SSE progress chips (`Found N places within 3 km`, `Verified 5 of 5 place IDs`, `Writing your week`) while `gemini-4-neon` generates 5 linked missions across 5 distinct verified places. Pins drop onto the map at 60 ms stagger.
4. **Play a Voice Mission (<= 90 s):** Tap a mission pin or card, connect to `gemini-3.8-live` via an ephemeral token, and speak with a fictional local NPC (`auto_driver`, `darshini_owner`, `pg_owner`, `transit_helper`, `office_buddy`). Live captions show script, transliteration, and English meaning.
5. **Score & Adapt (< 1 s):** When the mission ends, `gemini-decision-1` evaluates objective completion, phrase attempt quality, tone, and next-step routing. A result card rolls XP and stars, explains why the next mission adapted, and updates the next NPC's language share, hint ladder, and pace.
6. **Unlock & Export Survival Kit:** Review 3 candidate residential areas with Monday 09:00 and 18:30 IST commute bars (drive, two-wheeler, transit), replay learned Kannada phrases (`gemini-3.8-flash-tts`), check off first-week tasks, and confirm any external action via a modal Confirm Sheet.

## 5. Screens and Single Primary Action (Hick's Law)

| Screen | Route / State | Single Primary Action | Secondary / Escape Actions |
|---|---|---|---|
| **1. Corridor Tour & Landing** | `/` (`idle`, `touring`) | Pick the office you are joining (combobox + 6 chips) | `Skip tour` (`Esc` or click), `Tune` preferences popover (`languageComfort`: `en` / `hi` / `en_hi`, `budgetBand`: `15_20k` / `20_30k` / `30k_plus`) |
| **2. Week Builder (Generating)** | `/` (`generating`) | Watch verified week assemble (automatic transition on completion) | `Cancel` back to office picker |
| **3. Corridor Hub (Week Map)** | `/` (`week_ready`) | `Start Mission N` on the active mission card | Select another unlocked pin, `Open Survival Kit` (available anytime after Mission 1), mute toggle |
| **4. Live Voice Mission** | `/` (`in_mission`) | Hold or tap large circular `Mic` control to speak | `Need a hint`, `Push-to-talk` toggle, `End mission` |
| **5. Mission Result & Adaptation** | `/` (`mission_scored`) | `Continue to Mission N+1` (or `Open Survival Kit` after Mission 5) | `Why did this change?` rubric disclosure, manual pace override (`Keep gentler pace` / `Step up Kannada`), `Replay phrase` |
| **6. Survival Kit** | `/` (`kit_open`) | `Save my kit` (triggers Confirm Sheet before PNG download) | `Open route in Google Maps` (Confirm Sheet), `Copy phrasebook` (`Copied` check toast), `Back to map` |

## 6. Success Metrics for the 3-Minute Judge Demo
- **First interaction latency:** Input acknowledgement under 400 ms on every tap or keystroke.
- **World generation:** Verified 5-mission plan streamed and rendered in under 12 seconds (`p50 < 8 s`), with 100% of mission `placeId` values matching `data/orr/places.json`.
- **Voice turn latency:** First NPC audio chunk plays within 1.2 seconds of turn end in a normal room on laptop mic + headphones.
- **Adaptation speed:** `POST /api/score` returns calibrated `gemini-decision-1` rubric scores in under 1,000 ms (`p50 < 350 ms`).
- **End-to-end demo clock:** Judge picks any office, completes 1 full voice mission, observes Mission 2 adaptation, and inspects the Survival Kit + Confirm Sheet in under 180 seconds.

## 7. Non-Goals
- No user accounts, login, cloud user profiles, or server database.
- No real bookings, payments, phone calls, or messages sent to real businesses.
- No unverified financial claims: rents and auto fares never appear as factual numbers.
- No browser geolocation (`navigator.geolocation` is never called).
- No server-side audio recording or transcript persistence.
- No places outside the eastern ORR bounding box (`12.905..12.975 N`, `77.610..77.715 E`).
- No photorealistic 3D map tiles (`Map3DElement`) before Phase 6 is green and shipped.

## 8. Resolved Product Decisions & Open Venue Checks
- **Language rollout:** Shipped sequentially behind `ENABLED_LANGUAGES` in `shared/config.ts`: `["en"]` (`p3a-english`), `["en", "hi"]` (`p3b-hindi`), `["en", "hi", "kn"]` (`p3c-kannada`).
- **Fallback transparency:** If live Director generation fails after retry and `gemini-4-hydrogen` fallback, a cached real generation for that office may load only with a visible banner: `Replayed from an earlier run`.
- **Venue spot-check (open human check during P3c):** Have a Kannada-speaking mentor spot-check 10 lines of `data/phrases.json` for natural Bengaluru colloquial phrasing.
