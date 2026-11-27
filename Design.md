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

## 3. Game Layer Direction: Smoked-Acrylic Fare-Meter & Cinema Ribbon
Selected from `design/discover/variation-1.html` (with two alternatives preserved in `design/discover/variation-2.html` and `variation-3.html`).

- **Core metaphor:** Bengaluru street precision meets cinema-subtitle clarity. Surfaces read like smoked-acrylic instrument clusters (`rgba(25, 19, 46, 0.88)` with `backdrop-filter: blur(18px)` and `1px` `9%` white inner hairline ring) floating cleanly over the open ORR dusk map so the geography remains the hero.
- **Signature Bengaluru touch (Fare-Meter Flag & Odometer):**
  - When a mission starts, a subtle `--accent-yellow` pill (`METER ON · 01:30`) tilts its micro-flag indicator from upright to `-18deg` in `220ms` (`--ease-out-quint`).
  - Top-right score cluster pairs the 5-pill week progress track (`--accent-teal` completed, `--accent-pink` active elongated pill) with 3 crisp star slots and a zero-padded tabular `Anton` XP odometer (`01,240`).
- **Cinema Voice Ribbon:**
  - Centered at bottom above a `72px` circular `--accent-pink` mic orb (`box-shadow` amplitude ring driven by WebAudio RMS, squish `0.97` on press).
  - Three-tier caption hierarchy inside one `18px`-radius card: `12px` muted speaker/role label, `20px` high-contrast native script (`Noto Sans Kannada` / `Noto Sans Devanagari`), and `14px` Roman transliteration + English translation underneath.
- **What to strictly avoid:** No cartoon auto-rickshaw illustrations, no heavy skeuomorphic bezels or rivets, no full-height sidebars covering more than 25% of map width, and no decorative neon outer glows on cards.

---

## 4. Screen States & Microinteractions

### 4.1 Landing, Camera Tour & Office Picker
- **States:**
  - `touring`: 8.8-second 4-stop camera glide from Marathahalli (`12.9569, 77.7011`) down ORR to Silk Board (`12.9177, 77.6238`). Top-centre smoked-acrylic card shows a 4-segment progress track, `STOP X OF 4 · OUTER RING ROAD`, `Anton` (`font-weight: 400`) neighbourhood title, and concrete subtitle while spotlighting matching neighbourhood pins in `--accent-yellow`. Bottom pill: `Skip tour · Esc`. `Tune` is hidden during the tour.
  - `idle` (Picker): Wordmark `APNA AREA` top-left; optional subtle `00:00 / 03:00` presenter timer (`DemoTimerPill`, click to reset) when `?demo=1` is present without preselecting any office; `Tune` button (`Tune · EN`, `Tune · HI`, or `Tune · HI+EN` once Hindi unlocks in `P3b`) + `Live` health indicator top-right. Top-left smoked-acrylic card asks `WHICH OFFICE ARE YOU JOINING?` with tagline `Play your first week before it happens.`, `@ui-sdk/react` combobox (`Cmd/Ctrl+K` shortcut), and 6 curated verified tech park quick-pick tiles (`RMZ Ecoworld`, `RMZ Ecospace`, `Embassy TechVillage`, `Prestige Tech Park`, `Cessna Business Park`, `Vaishnavi Tech Park`) in a 2x3 grid.
  - `office_selected` (Destination Card): Picker collapses into a compact Selected Destination Card (`YOUR OFFICE · <AREA>`, `Switch` button, `Anton` office headline, Plus-code-cleaned locality subtitle, and `--accent-pink` primary CTA `Build my first week` receiving immediate keyboard focus). On `390x844` mobile, unselected corridor labels collapse to quiet magenta ground dots so the selected pin owns the upper viewport above the bottom sheet.
  - `loading` / `error` / `offline`: Skeleton shimmer matching exact combobox height (`48px`) plus 6 `44px` `.office-chip-skeleton` placeholders (or compact saved-office skeleton) so card height never jumps; offline/error banner: `You appear to be offline. Reconnect to load the Outer Ring Road map.` paired with an interactive `Retry` button and automatic `online` recovery; lazy-loaded stages (`MissionDialog`, `SurvivalKit`) render inside `StageSuspenseBoundary` (`ErrorBoundary` + smoked-acrylic loading card with `Back to map`).
- **Map & Pin Craft:** `CorridorLayer` renders via `google.maps.OverlayView` SVG `<path>` in `overlayLayer` above the desaturated dark `<canvas>` (`clickableIcons={false}`) so the `#FF4FA0` corridor spline and ground-anchored `<AdvancedMarker>` capsules remain 100% vivid. Selecting an office glides the camera asymmetrically (`< 950ms`) to frame the pin in the open viewport.

### 4.2 Week Generation (`generating` -> `week_ready`)
- **Labor illusion chips (`ProgressChips.tsx`):** Real SSE steps appear in a smoked-acrylic vertical stack (`Scanning verified Outer Ring Road places near your office` -> `Found 15 verified places near Embassy TechVillage` -> `Writing your week on the Outer Ring Road` -> `Verified 5 of 5 mission stops`), each ticking `--accent-teal` (`#3DE6D0`) as completed, with an explicit `Cancel` action.
- **Staggered world drop (`MissionMarkers.tsx`, `WeekProgressBar.tsx`):** Five numbered pins (`1` to `5`) drop onto the map at `60ms` stagger while unselected tech park labels step back so the player's office and 5 mission stops own the corridor. Top-centre 5-step week bar (`@ui-sdk/react` roving Toolbar) illuminates the active day (`1 · Mon` through `5 · Fri`).
- **Mission Card & Provenance (`MissionCard.tsx`):** Displays the tilted `--accent-yellow` Fare-Meter stop pill (`STOP X OF 5 · <DAY>`), `weekTheme`, `title`, `whyItMatters`, fictional NPC brief (`<npcFirstName> · <role>`), and an interactive `--accent-teal` provenance pill (`Verified Google Maps place · 1.4 km from office`) that reveals the exact `place_id` and `shortAddress` on hover, focus, or tap (`Esc` dismisses). Cold-503 fallback plans show a clear `Replayed from an earlier run` banner.

### 4.3 Live Voice Mission (`in_mission`)
- **Layout:** Map zooms to street level (`16.5` desktop, `16.0` mobile) around the active mission stop while unselected week stops step back so the active stop and office own the corridor. Top-left: objective card with tilted `-18deg` Fare-Meter countdown (`METER ON · 01:30`, paced dynamically at `60s`, `75s`, or `90s`), destination highlighted in `--accent-yellow`, and active-styled utility pills (`Need a hint` / `Next hint`, `Type instead` / `Keyboard reply active`). Top-right pairs the cumulative `XpCounter` odometer (`★ N · 00,300 XP` with muted leading zeros and `font-synthesis: none`), `Phrases · N`, `Tune`, and `Live`. Centre-bottom: gender-matched NPC portrait (`web/public/art/npcs/<role>_<gender>.webp`), 3-tier live Cinema Voice Ribbon (with keyboard fallback docked concentrically inside the panel when open), and `72px` circular mic orb (`60px` on mobile) with real-time WebAudio amplitude ring.
- **Multilingual caption format:**
  - Line 1 (when Kannada active): `ಅಣ್ಣ, ದಯವಿಟ್ಟು ಮೀಟರ್ ಹಾಕಿ ಬನ್ನಿ.`
  - Line 2: `Aṇṇa, dayaviṭṭu mīṭar hāki banni. · Brother, please put the meter on and come.` (switches meaning to Devanagari Hindi when `languageComfort === "hi"`)
- **Phrase mastery aha:** When `mark_phrase_attempt` reports `quality: "clear"`, the Cinema Ribbon flashes a `260ms` `--accent-teal` ring (`cinema-ribbon-mastered`), plays a soft two-note WebAudio ascending fifth chime (`E5` -> `B5`), flips the badge from `Try in Kannada` to `Saved to kit`, and animates `PhraseFlyCard` (`transform: translate3d(...) scale(0.28)`, `420ms`) into the topbar `Phrases · N` badge (`PhrasebookPill`).
- **States:** `connecting` (disabled mic button while token/socket initializes), `listening` (pink orb + RMS halo), `npc_speaking` (yellow orb + RMS halo, barge-in ready), `permission_denied` (retires the mic orb cleanly, activates the docked text input with `Mic off in browser · Type your reply to <NPC>...`, and credits typed replies equally in scoring), `completed` (top-left pill settles to teal `SCENE COMPLETE`, dead mic orb retires, and a teal-framed `OBJECTIVE COMPLETE` card offers `Next stop`), `error` (`Voice connection dropped, so tap Retry to reconnect to this mission.`).
- **Audio gesture & privacy rule:** Clicking or pressing `Talk with <NPC>` or `Retry` calls `primeUserGestureAudioContext()` synchronously inside the user-gesture handler before awaiting `POST /api/live-token`. Below the mic orb, a smoked-acrylic pill states: `Voice streams live to Gemini and is never stored.`

### 4.4 Mission Result & Adaptive Routing (`mission_scored`)
- **Choreography:** Completed voice missions flush buffered speech turns and transition into `MissionResultCard` (`max-height: min(64dvh, calc(100dvh - 204px))` on mobile so the open ORR dusk map stays visible above the sheet). XP rolls up over `280ms` in both `MissionResultCard` and the topbar `XpCounter` (`00,300 XP` with dimmed leading zeros); earned stars spring-fill (`200ms` each, outline vs solid fill paired with `X of 3 stars` text), and completed days show `✓` in `WeekProgressBar`. One clear feedback sentence states how Mission `N+1` changed:
  - Example (high score, Kannada active): `You nailed the greeting. Your next stop will lead with more Kannada and fewer hints.`
  - Example (needed support): `Good effort. Your next stop will use more English and offer an earlier hint.`
- **Transparency & human override controls:** `Why did this change?` disclosure expands in `200ms` to display a 2x2 calibrated `gemini-decision-1` rubric grid (`Objective`, `Phrase`, `Tone` in `--accent-teal`, `Confidence` in `--accent-yellow`), paired with checkmark-indicated 1-click player overrides (`Keep gentler pace` / `Keep higher Kannada` or `Step up Kannada`) so the player always has final say over AI routing.

### 4.5 Survival Kit & Confirm Sheets (`kit_open`)
- **Peak headline:** `YOU'RE READY FOR MONDAY.` inside a bounded `1160px` stage aligned with `.shell-topbar` rails on desktop (`Sound` toggle right, atmospheric radial map scrim hiding mid-game pins) and a compact 3-pill segmented tab switcher (`Commutes` | `Phrases` | `Checklist`) on `<= 768px` mobile so all three pillars stay one tap away without vertical scroll walls.
- **Three-column hairline-divided bento (bounded above `y=876px` on `1440x900` desktop; tabbed single-column on `390x844` mobile):**
  1. `Where to live`: 3 hairline-divided verified residential pockets selected for the chosen office and budget band, with Monday `09:00` and `18:30` IST horizontal duration bars (`Drive · 09:00`, `Drive · 18:30`, `Two-wheeler`, `BMTC / Transit`) pre-warmed via `computeRouteMatrix` (`--accent-teal` on fastest mode, neutral slate baseline), compact `Directions` trigger, and one spatial Flash-Lite corridor note (zero repeated bar numbers).
  2. `Phrases you spoke`: 4 Kannada survival phrases grouped under `Practised out loud` and `Starter phrases` (`script · transliteration · meaning`) with `40x40px` play buttons (`gemini-3.8-flash-tts` cached WAV) and a `Copy phrases` button that confirms inline with `Copied` + check icon (`2s` reset, no blocking modal).
  3. `Your first-week checklist`: 6 hairline-divided items tailored to `budgetBand` and persisted in `localStorage`, grouping active `To do` items at the top in bright `--text-primary` and stepping `Completed` items down quietly with a `16%` teal-tinted check badge.
- **Confirm Sheet (mandatory gate for external navigation and file downloads):**
  - Built on `@ui-sdk/react/alert-dialog` focus-trap primitives (`Esc` closes, focus returns to trigger via `lastExitRef`; centered modal with `Esc` hint on desktop, flush docked bottom sheet with top grabber and full-width stacked buttons on `<= 768px` mobile, paired with a recessed neutral target preview chip).
  - Exact copy per exit:
    - Maps route: Title `Open this route in Google Maps?` · Target chip `google.com/maps · {{areaName}} to {{officeName}}` · Body `Opens google.com/maps in a new tab with directions from {{areaName}} to {{officeName}}. Nothing else is shared.` · Actions: `Open Google Maps` / `Cancel`.
    - Save kit: Title `Download your Survival Kit?` · Target chip `apna-area-survival-kit.png · 1200 x 675 summary card` · Body `Saves a PNG summary card to your device. No account or upload is used.` · Actions: `Download PNG` / `Cancel`.

## 5. Accessibility Checklist
- Minimum `40x40px` hit target on every button, chip, pin, and audio control.
- Keyboard-only operable across the entire loop (`Tab`, `Arrow` keys inside combobox and chips, `Cmd/Ctrl+K` for office picker, `Space` for push-to-talk strictly when the mic button holds focus, `Esc` to dismiss tour/sheets).
- Visible `2px` `--accent-teal` focus-visible ring (`offset: 2px`) on every interactive element.
- Colour never carries state alone: stars pair fill with count (`2 of 3 stars`), health dot pairs teal/red with text tooltip, commute bars pair width with exact tabular minutes (`28 min`).
