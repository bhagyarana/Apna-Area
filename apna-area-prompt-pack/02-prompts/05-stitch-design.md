# 05 · Stitch: first screens

**Use when:** after `04-design-discover.md`, in parallel with P0 (it does not block the build). Add the chosen "Game layer direction" from Design.md to the end of each prompt below so Stitch builds your direction, not its default.
**Where:** stitch.withgoogle.com, then export to code or screenshots into `design/stitch/`.
**Time:** 20 minutes. Generate, pick, move on. Stitch is for direction, not final code.

## Prompt 1: the landing and office picker

```text
Design a dark, cinematic web app screen for "Apna Area", a game that turns Bengaluru's Outer Ring Road into a playable city for people about to move there.

Mood: Vice City dusk over Bengaluru. Night background #0E0A1C, surfaces #19132E, text #F7F1FF, primary pink #FF4FA0, highlight yellow #FFD24A, success teal #3DE6D0. Display font Anton (uppercase, used once), body Hanken Grotesk. Layered soft shadows, no borders, generous spacing. Original art only, no game logos.

Layout, desktop 1440 wide: a full-bleed dark map of the Outer Ring Road corridor (Marathahalli to Silk Board) with the road glowing pink. Top-left: small wordmark "Apna Area". Centre-left: one big question in Anton, "WHICH OFFICE ARE YOU JOINING?", under it one search field with 6 suggested tech parks as chips. Bottom: a single line, "Play your first week before it happens." No other buttons.
```

## Prompt 2: in-mission HUD with voice

```text
Same style as before. Screen: in a voice mission. The map is tilted and zoomed to one street with a yellow destination marker and a dotted pink route from a white player arrow. Top-left: mission card "Mission 2 of 5 · Breakfast like a local" with objective "Order idli vada and a filter coffee in Kannada". Top-right: XP "1,240" in tabular numbers and three stars, two filled. Bottom centre: a large circular mic button with a soft live waveform, and above it two caption lines, the NPC line in Kannada script with transliteration and English meaning underneath. Right edge: a small "Phrase card" that just flew in: "ಒಂದು ಕಾಫಿ ಕೊಡಿ · ondu kāfi koḍi · one coffee, please".
```

## Prompt 3: the Survival Kit

```text
Same style. Screen: the end-of-week Survival Kit, the emotional peak. Headline in Anton "YOU'RE READY FOR MONDAY." Three cards in a row: "Where to live" (3 neighbourhoods with commute minutes to the chosen office, morning and evening, with a small bar each), "Phrases you spoke" (5 Kannada phrases with play buttons), "Your first-week checklist" (6 ticked items). Bottom: two buttons, primary "Save my kit", secondary "Open route in Google Maps". Calm, confident, celebratory without confetti.
```

## Hand it to the build
Save the chosen screens as PNGs in `design/stitch/` and reference them in `Design.md`. In build prompts, say "match @design/stitch/<file>.png for layout, follow Design.md for tokens".
