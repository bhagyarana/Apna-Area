# Design.md

Living design specification for **Apna Area**. Every UI ticket reads this file before building and updates it in the same commit when states or components evolve.

## 1. Aesthetic Direction: ORR Neon Dusk
Cinematic Bengaluru dusk atmosphere inspired by tropical twilight and Outer Ring Road neon signage, paired with studio-grade interface discipline (Craft by Gustavo Fior, Emil Kowalski's motion rules, UI SDK keyboard primitives).
- **Originality rule:** 100% original artwork, naming, and UI geometry. Never use third-party game logos, key art, or display typefaces.
- **Copy tone:** Sentence case, warm, concrete, concise. Zero hype words. Zero em dashes anywhere in UI copy. Exclamation marks allowed only inside spoken NPC captions.

## 2. Design Tokens (`web/src/styles/tokens.css`)

### 2.1 Colour System
| Token | Hex / Value | Role & Contrast |
|---|---|---|
| `--bg-night` | `#0E0A1C` | Full-bleed canvas and base map backdrop |
| `--bg-surface` | `#19132E` | Primary HUD cards, combobox, and sheets (`>= 12:1` with `--text-primary`) |
| `--bg-surface-elevated` | `#231B3F` | Hover states, active chips, nested inner containers |
| `--ring-hairline` | `rgba(255, 255, 255, 0.09)` | 1 px inner hairline ring (`inset 0 0 0 1px`) instead of heavy borders |
| `--text-primary` | `#F7F1FF` | Headlines, body copy, active inputs (`15.8:1` on `--bg-night`) |
| `--text-secondary` | `#CFC4E8` | Supporting descriptions, transliterations (`9.6:1` on `--bg-surface`) |
| `--text-muted` | `#A397C2` | Metadata, shortcuts, timestamps (`5.4:1` on `--bg-surface`, WCAG AA pass) |
| `--accent-pink` | `#FF4FA0` | Primary CTA buttons, ORR corridor glow, active mic ring |
| `--accent-yellow` | `#FFD24A` | Destination pins, place highlights inside objective text, stars |
| `--accent-teal` | `#3DE6D0` | Verified badges, Kannada phrase mastery pulse, health indicator |
| `--semantic-danger` | `#FF6B7A` | Error banners, mic permission warning, end-call hover |
| `--gradient-dusk` | `linear-gradient(135deg, #FF4FA0 0%, #FF8A5B 52%, #FFD24A 100%)` | Reserved strictly for landing wordmark accent and Survival Kit hero peak |

### 2.2 Typography Scale (Two Families, Five Sizes Max)
- **Display (`--font-display`):** `"Anton", sans-serif` (uppercase, letter-spacing `0.02em`, line-height `1.05`). Used at most once per screen for the hero question or peak headline.
- **UI & Body (`--font-sans`):** `"Hanken Grotesk", system-ui, sans-serif` with `"Noto Sans Kannada"` and `"Noto Sans Devanagari"` fallbacks loaded for script legibility.
- **Numeric rule:** `font-variant-numeric: tabular-nums` mandatory on XP counters, star counts, countdown timers, and commute minutes.
- **Five-step type scale:**
  1. `--text-display`: `clamp(2rem, 3.6vw, 3.25rem)` (`52px` max) · Hero headline
  2. `--text-title`: `1.375rem` (`22px`, weight `600`) · Sheet and mission titles
  3. `--text-body`: `1rem` (`16px`, weight `400/500`, line-height `1.5`) · Primary UI, captions, inputs
  4. `--text-sm`: `0.875rem` (`14px`, weight `500`, line-height `1.4`) · Chips, hints, secondary rows
  5. `--text-xs`: `0.75rem` (`12px`, weight `600`, letter-spacing `0.04em`) · Provenance badges, kbd hints

### 2.3 Spacing, Concentric Radii, and Layered Shadows
- **Spacing scale:** `4, 8, 12, 16, 24, 32, 48 px`.
- **Concentric radii (`inner = outer - padding`):**
  - Outer sheet / card: `--radius-lg: 20px` with `12px` padding -> inner row/button `--radius-md: 8px` (or `16px` outer with `8px` padding -> `8px` inner).
  - Pill controls and progress chips: `--radius-pill: 9999px`.
- **Elevation (shadows, never opaque borders):**
  - `--shadow-card`: `0 12px 32px rgba(5, 3, 12, 0.55), 0 2px 8px rgba(5, 3, 12, 0.35), inset 0 0 0 1px rgba(255, 255, 255, 0.09)`
  - `--shadow-modal`: `0 24px 64px rgba(4, 2, 10, 0.78), inset 0 0 0 1px rgba(255, 255, 255, 0.12)`

### 2.4 Motion Tokens
- **Curve:** `--ease-out-quint: cubic-bezier(0.23, 1, 0.32, 1)` for all entrances and exits. Never use `ease-in`.
- **Durations:** `--dur-fast: 160ms` (press squish, hover), `--dur-ui: 240ms` (cards, chips, popovers), `--dur-sheet: 420ms` (Confirm Sheet, Survival Kit reveal).
- **Properties:** Animate only `transform` and `opacity`.
- **Press feedback:** Interactive buttons scale to `0.97` on pointer active; keyboard activation fires instantaneously without entry lag.
- **Reduced motion:** `@media (prefers-reduced-motion: reduce)` disables camera flights, pin drops, and flying cards, replacing them with `160ms` opacity crossfades.

---

## 3. Game Layer Direction
*(Placeholder for `04-design-discover.md` winner. Once you react to the 24 directions at Check-in #1 and choose from the 3 seeded HTML mockups in `design/discover/`, the exact HUD metaphor, surface treatment, and signature detail will be locked here before `P0` / `P1` UI work.)*

---

## 4. Screen States & Microinteractions

### 4.1 Landing, Camera Tour & Office Picker
- **States:**
  - `touring`: 8.5-second camera glide from Marathahalli (`12.9569, 77.7011`) down ORR to Silk Board (`12.9177, 77.6238`) at zoom `14.2`, tilt `45deg`. Four subtle pill labels fade in and out. Bottom hint: `Press Esc or click anywhere to skip`.
  - `idle` (Picker): Wordmark `Apna Area` top-left with live health dot. Left-aligned card asks `WHICH OFFICE ARE YOU JOINING?` with `@ui-sdk/react` combobox (`Cmd/Ctrl+K` shortcut), 6 verified tech park chips, and one `Tune` button for language comfort + budget band. Tagline at bottom: `Play your first week before it happens.`
  - `loading` / `error` / `offline`: Skeleton shimmer matching exact combobox height (`52px`); offline banner: `You appear to be offline. Reconnect to load the Outer Ring Road map.` with `Retry`.
- **Microinteraction:** Selecting an office glides the camera in `950ms` to the office coordinate and drops a yellow destination pin (`#FFD24A`) with a subtle `240ms` scale-in (`0.95 -> 1`).

### 4.2 Week Generation (`generating` -> `week_ready`)
- **Labor illusion chips:** Real SSE steps appear in a vertical stack (`Found 15 verified places near Embassy TechVillage` -> `Verified 5 of 5 mission stops` -> `Writing your week`), each ticking teal (`#3DE6D0`) as completed.
- **Staggered world drop:** Five numbered pins (`1` to `5`) drop onto the map at `60ms` stagger. Top-centre 5-step week progress bar illuminates Mission 1 as ready.
- **Provenance badge:** Hovering or focusing a mission card reveals `Verified Google Maps place · 1.4 km from office`.

### 4.3 Live Voice Mission (`in_mission`)
- **Layout:** Map zooms to street level around the mission place. Top-left: objective card with destination highlighted in `--accent-yellow` and `whyItMatters` subtitle. Top-right: tabular XP counter + 3-star slot + `90s` radial/tabular countdown. Centre-bottom: NPC portrait (`web/public/art/npcs/<role>.webp`), 2-line live caption panel, and `72px` circular mic button with real-time WebAudio amplitude ring.
- **Multilingual caption format:**
  - Line 1 (when Kannada active): `ಒಂದು ಇಡ್ಲಿ ವಡೆ ಕೊಡಿ`
  - Line 2: `ondu idli vade koḍi · One idli vada, please`
- **Phrase mastery aha:** When `mark_phrase_attempt` reports `quality: "clear"`, the caption flashes a `260ms` `--accent-teal` ring, plays a soft two-note chime, and animates a phrase card (`transform: translate3d(...) scale(...)`, `420ms`) into the Phrasebook icon.
- **States:** `connecting` (spinner ring inside mic button), `listening` (pink waveform), `npc_speaking` (yellow waveform, barge-in ready), `permission_denied` (`Microphone access is blocked. Allow mic access in your browser bar or type your reply below.` + text input fallback credited equally in scoring), `error` (`Voice connection dropped. Tap Retry to reconnect to this mission.`).
- **Audio gesture & privacy rule:** Clicking or pressing the mic button calls `audioContext.resume()` synchronously inside the user-gesture handler before awaiting `POST /api/live-token`. Below the mic on first open, a quiet 1-line note states: `Live voice streams to Gemini for this scene and is never stored by Apna Area.`

### 4.4 Mission Result & Adaptive Routing (`mission_scored`)
- **Choreography:** XP rolls up over `280ms`; earned stars spring-fill (`200ms` each). One clear feedback sentence states how Mission `N+1` changed:
  - Example (high score, Kannada active): `You nailed the greeting. Your next stop will lead with more Kannada and fewer hints.`
  - Example (needed support): `Good effort. Your next stop will use more English and offer an earlier hint.`
- **Transparency & human override controls:** `Why did this change?` disclosure expands in `200ms` to display the 4 calibrated `gemini-decision-1` rubric bars (`Objective`, `Phrase`, `Tone`, `Confidence`), paired with a 1-click player override (`Keep gentler pace` / `Step up Kannada anyway`) so the player always has final say over AI routing.

### 4.5 Survival Kit & Confirm Sheets (`kit_open`)
- **Peak headline:** `YOU'RE READY FOR MONDAY.`
- **Three-column card grid (stacks cleanly at `390x844` mobile):**
  1. `Where to live`: 3 verified residential pockets selected for the chosen office and budget band, with Monday `09:00` and `18:30` IST horizontal duration bars (`Drive`, `Two-wheeler`, `Transit`) pre-warmed via `computeRouteMatrix` and one factual Flash-Lite sentence.
  2. `Phrases you spoke`: Learned Kannada phrases (`script · transliteration · meaning`) with `40x40px` play buttons (`gemini-3.8-flash-tts` cached WAV) and a `Copy phrases` button that confirms inline with `Copied` + check icon (`2s` reset, no blocking modal).
  3. `Your first-week checklist`: 6 interactive items tailored to `budgetBand` and persisted in `localStorage`.
- **Confirm Sheet (mandatory gate for external navigation and file downloads):**
  - Built on `@ui-sdk/react` dialog/focus-trap primitives (`Esc` closes, focus returns to trigger).
  - Exact copy per exit:
    - Maps route: Title `Open this route in Google Maps?` · Body `Opens google.com/maps in a new tab with directions from {{areaName}} to {{officeName}}. Nothing else is shared.` · Actions: `Open Google Maps` / `Cancel`.
    - Save kit: Title `Download your Survival Kit?` · Body `Saves a PNG summary card to your device. No account or upload is used.` · Actions: `Download PNG` / `Cancel`.

## 5. Accessibility Checklist
- Minimum `40x40px` hit target on every button, chip, pin, and audio control.
- Keyboard-only operable across the entire loop (`Tab`, `Arrow` keys inside combobox and chips, `Cmd/Ctrl+K` for office picker, `Space` for push-to-talk strictly when the mic button holds focus, `Esc` to dismiss tour/sheets).
- Visible `2px` `--accent-teal` focus-visible ring (`offset: 2px`) on every interactive element.
- Colour never carries state alone: stars pair fill with count (`2 of 3 stars`), health dot pairs teal/red with text tooltip, commute bars pair width with exact tabular minutes (`28 min`).
