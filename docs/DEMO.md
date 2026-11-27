# 3-Minute Live Judge Demo Script (`docs/DEMO.md`)

**Target runtime:** `2 minutes 35 seconds` (`25 seconds` buffer under the `3:00` hard cap).
**Golden rule:** Every step runs live on the public Cloud Run URL with real judge input. Zero pre-recorded video or mocked API responses.

## 1. Second-by-Second Live Run

| Timestamp | Screen Action | What You Say | Live Fallback if Upstream Stumbles |
|---|---|---|---|
| **0:00 - 0:18** | App opens at `https://<cloud-run-url>?demo=1`. Dusk camera glides down glowing pink ORR from Marathahalli toward Bellandur. Press `Esc` at `0:12` to land on `"WHICH OFFICE ARE YOU JOINING?"`. | "Ananya is 24, moving from Lucknow to join a Bellandur tech park in two weeks. She speaks Hindi and English, zero Kannada, and has no idea where to live. Pick any tech park on the Outer Ring Road for her." | If Maps tiles lag on venue Wi-Fi, vector base falls back cleanly while verified tech park chips remain instant. |
| **0:18 - 0:28** | **Judge picks any office** (clicks a chip or types in combobox). Camera glides in `0.9s` to that exact tech park; yellow pin drops. | "Every place in Apna Area is verified through Google Maps Places API. Nothing outside this corridor can be hallucinated." | Keyboard `Cmd/Ctrl+K` works if trackpad is awkward. |
| **0:28 - 0:42** | SSE progress chips tick live: `Found 16 verified places within 3 km` -> `Verified 5 of 5 mission stops` -> `Writing your week`. Five numbered mission pins drop at `60ms` stagger. Hover Pin 1 briefly to flash the Google Maps `place_id` badge. | "Gemini 4 Neon plans her first week constrained by a schema enum of verified place IDs, backed by a server verifier." | If Neon hits a 503, server auto-retries on Hydrogen; if Wi-Fi drops mid-stream, labelled real cache loads with `Replayed from an earlier run`. |
| **0:42 - 1:35** | Click **Mission 1 (Auto stand outside office)**. Portrait appears; tap mic. Auto driver greets in Kannada, then helps in Hindi/English and teaches one survival phrase (`ಮೀಟರ್ ಹಾಕಿ ಅಣ್ಣ · mīṭar hāki aṇṇa · Please put on the meter, brother`). Speak one sentence in Hindi/English, then say the Kannada phrase out loud. Teal pulse + chime + phrase card flies into Phrasebook; NPC wraps up and triggers `complete_objective`. | "This is Gemini 3.8 Live over an ephemeral token. Notice he switches to Hindi when I hesitate, teaches one real Kannada phrase, and unlocks the phrase card the moment I say it." | Noisy hall: toggle **Push-to-talk** (`Space` bar). Mic blocked: type into the instant text input bar via `sendRealtimeInput`. |
| **1:35 - 1:58** | **Mission Result Card** appears in `< 400ms`: XP rolls up, stars fill, banner reads `"You nailed the phrase. Mission 2 will lead with more Kannada and fewer hints."` Click `Why did this change?` to reveal `gemini-decision-1` calibrated probabilities (`0` output tokens). Start Mission 2 for 8 seconds just to show the darshini owner opening in brisker Kannada, then click `Open Survival Kit`. | "Gemini Decision 1 scored our transcript in 200 milliseconds with calibrated probabilities and routed Mission 2 to higher Kannada immersion." | If confidence `< 0.75`, badge transparently shows `Safe default applied: kept steady difficulty`. |
| **1:58 - 2:35** | **Survival Kit** opens (`"YOU'RE READY FOR MONDAY."`): 3 nearby areas with real Monday `09:00` and `18:30` Routes API commute bars, spoken phrase replay (`gemini-3.8-flash-tts`), and her checklist. Click `Open route in Google Maps` -> **Confirm Sheet** traps focus (`"Open Google Maps in a new tab?"` + `Cancel`). Click `Cancel` (or `Open`) to prove human control. | "She leaves with real Monday peak-hour commute times from the Routes API, the phrases she spoke, and strict confirm sheets before anything ever leaves the app." | Commutes are cached per office after first call (`0 ms` on repeat). |

---

## 2. Pre-Demo Checklist (Run 15 Minutes Before Judging)
- [ ] Open `https://<cloud-run-url>/api/health` and confirm `status: "ok"`, `placesLoaded > 40`, and `min-instances: 1` warm container.
- [ ] Check AI Studio spend cap at `aistudio.google.com/spend` has at least `$10` headroom.
- [ ] Plug in wired or low-latency headphones (or verify laptop speaker + mic echo cancellation in room noise) and pre-grant browser microphone permission on the Cloud Run origin.
- [ ] Set browser zoom to `110%`, hide bookmarks bar, enable Do Not Disturb, and clear `localStorage` so the 8-second ORR camera tour starts fresh.
- [ ] Keep one backup tab open at `https://<cloud-run-url>` with DevTools closed.

## 3. Rehearsal Log (Populated in Phase 6 `T6.2`)
- **Rehearsal 1:** pending (`target < 3:00`)
- **Rehearsal 2:** pending (`target < 3:00`)
- **Rehearsal 3:** pending (`target < 3:00`)
