---
trigger: glob
globs: web/**/*.tsx, web/**/*.ts, web/**/*.css
description: Design, motion, copy and psychology rules for all UI work
---

# Design rules

Gold standard: Craft by Gustavo Fior (craft.gustavofior.com). Supporting skills: kshv-taste, Emil Kowalski's skills (motion and polish), Jakub Krehel's skills (`better-interface` for audits), UI SDK for behaviours. When unsure, open those references before inventing.

## Visual direction: Vice City dusk over Bengaluru
Continues the pitch deck. Original art only: no GTA logos, key art or Pricedown typeface.
- **Colours:** night `#0E0A1C`, surface `#19132E`, text `#F7F1FF`, secondary text `#CFC4E8`, muted `#A397C2`, pink `#FF4FA0` (primary action, routes), yellow `#FFD24A` (destinations, highlights, game instructions), teal `#3DE6D0` (success, progress). Sunset gradient only in hero moments.
- **Type:** Anton for display (uppercase, used sparingly), Hanken Grotesk for everything else. Tabular numbers for XP, money and times. One type scale, five sizes max.
- **Surfaces:** layered shadows instead of borders, concentric radii (inner = outer minus padding), hairline rings at 9% white.
- **Game layer:** HUD in fixed corners (objective top-left, XP and stars top-right, minimap bottom-left on mobile). Destinations highlighted in yellow inside instruction text.

## Motion (Emil's rules)
- UI motion under 300 ms; sheets and modals up to 500 ms. Animate only `transform` and `opacity`.
- `cubic-bezier(0.23, 1, 0.32, 1)` for entering and exiting. Never `ease-in` for UI. No animation on keyboard-triggered actions.
- Scale entrances from the trigger (0.95 to 1 with opacity), never from 0. Buttons squish to 0.97 on press.
- Respect `prefers-reduced-motion`: fall back to opacity only.

## Microinteractions that create the "aha"
- The map camera glides to the chosen office, then mission pins drop in one by one (stagger 60 ms).
- While the Director works, show real progress chips ("Found 9 places", "Verified 7 of 7", "Writing your week") so waiting feels like watching work happen.
- The first Kannada phrase Ananya speaks correctly gets a short teal pulse, a soft chime and the phrase lands in her phrasebook with a flying-card animation.
- XP numbers roll instead of jumping. Stars fill with a 200 ms spring.
- Copy buttons confirm with "Copied" and a check, then quietly reset.

## Psychology (growth.design cheatsheet, applied)
- **Hick's law:** one primary action per screen. The landing screen asks one question: "Which office are you joining?"
- **Goal gradient and Zeigarnik:** a visible 5-step week progress bar; unfinished missions stay visible.
- **Labor illusion:** show the Director's real steps while it works.
- **Peak-end rule:** the Survival Kit reveal is the designed peak; end on "You're ready for Monday."
- **Endowment effect:** the phrasebook and kit are "yours" from the first phrase.
- **Doherty threshold:** acknowledge every input in under 400 ms, even if the result streams later.
- **Progressive disclosure:** settings (language mix, budget) hide behind one "Tune" control.

## Copy
- Sentence case, specific, warm, short. No hype words ("revolutionary", "seamless", "unlock"). No em dashes. No exclamation marks except inside NPC dialogue.
- Kannada always shown with transliteration and meaning: `ನಮಸ್ಕಾರ` · namaskāra · hello.
- Errors say what happened and what to do next, in one sentence.

## Accessibility
- Every interactive element reachable by keyboard with a visible focus ring (UI SDK behaviours).
- Captions for every voice line. Colour never carries meaning alone. Hit areas at least 40 px.

## Imagery: use generation, not decoration
- Coding agents fall back to gradients and basic shapes, which read as AI-made. Use real imagery where it carries meaning: NPC portraits, neighbourhood art, mission cutscenes, the Survival Kit poster.
- Generate at build time with Nano Banana (`MODEL_IDS.imageDefault`) through a script or Antigravity's built-in image generation, save to `web/public/art/`, and commit. Never generate per visitor.
- Original characters and places only. No real people, no game logos or key art.
- Optional, P6 only and cost-gated: a short looping clip (Gemini Omni 1.2 Flash) on a solid background, keyed out and layered into the landing hero. Verify it frame by frame in the browser.

## Subtraction pass
AI adds and rarely removes. Before any UI task is done, list every element on the screen and ask "what breaks if this goes?". Remove glows and gradients without purpose, random highlight colours, labels the image or icon already explains, decorative containers, and custom controls that are worse than native ones. Less on screen holds more attention.

## Review
Before calling any UI task done:
1. Subtraction pass (above).
2. Jakub's `better-interface` audit and Emil's `review-animations` on the changed screens, findings fixed.
3. The design critic loop (`02-prompts/28-design-critic-loop.md`): a fresh Carbon critic, screenshots only, until it independently scores 9/10 (max 3 rounds).
