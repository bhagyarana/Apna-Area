# Apna Area: Demo Video Storyboard (v1, for approval)

Output: `demo_video.mp4`, 1920x1080, 30 fps, H.264 + AAC, target under 60 MB.
Target length: **2:30** (full brief arc). A 95 second cut is possible, see "Open questions".

---

## 1. What I took from the references

| Reference | What makes it work | How it shows up here |
|---|---|---|
| YC launch videos | Problem before product. One named person, one concrete pain, then the reveal. | Ananya carries the whole film. The product appears only after we feel her Monday. |
| Linear / Vercel launches | One idea per frame, huge type, dark stage, motion that explains rather than decorates. | Story scenes are a single line of type or a single shape on near black. |
| Raycast / Stripe product films | Real UI, tight camera, the cursor is a character. Zoom to the exact control, click, hold on the result. | Every product shot has one focal zoom (1.00 to 1.06) and one cursor action. |
| Apple product films | The hero moment gets silence and time. Music lifts, VO stops. | The Kannada phrase moment gets 4 seconds with no narration, just the chime. |
| Emil Kowalski / Rauno | Ease-out on enter, never animate layout, short durations, no jitter. Subtraction pass at the end. | `cubic-bezier(0.23, 1, 0.32, 1)`, transform and opacity only, 200 to 600 ms moves. |

**Distinctive vision: "The pink line."** The Outer Ring Road is a glowing `#FF4FA0` line in the app. In the film it is the single recurring motif: it starts as a thin stroke in the black hook, becomes the commute timeline in the blind spot, draws the ORR map at the reveal, resolves into the logo underline, and is the progress line through Mon to Fri. One idea, carried the whole way.

---

## 2. Feature coverage checklist (all 14 shipped features)

| # | Feature | Scene |
|---|---|---|
| 1 | ORR Dusk Camera Tour | 6 |
| 2 | Presenter timer + Live health pill | 6 (cursor hovers Live pill) |
| 3 | Tune popover (budget + Hindi + English) | 6 |
| 4 | Ctrl+K office picker + camera glide | 7 |
| 5 | Gemini 4 Neon SSE director, 5 staggered stops | 8 |
| 6 | Google Maps place_id provenance | 8 |
| 7 | Lyria 3 soundtrack + voice ducking | 9 (audible: our bed ducks when the scene opens) |
| 8 | Gemini 3.8 Live voice NPC, Hindi/English, hint, type instead | 9 |
| 9 | Kannada phrase mastery, chime, card flight | 10 (hero) |
| 10 | Gemini Decision 1 calibrated rubric | 11 |
| 11 | One-click pace override | 11 |
| 12 | Survival Kit: Routes API commutes, TTS replay, copy, checklist | 12 |
| 13 | Focus-trapped confirm sheets (Directions, Save my kit) | 13 |
| 14 | 3D Neon Dusk layer, Sky-Drop, light pillars, Q/E orbit, radar | 7 and 8 |

Architecture (model routing) is folded into the how-it-works diagram in scene 5, so there is no separate slide.

---

## 3. Story arc

1. **Hook:** two weeks to a new city.
2. **Frustration:** Ananya, 40 tabs, zero Kannada.
3. **Blind spot:** same office, the wrong area costs an hour a day; nobody rehearses the first week.
4. **What if:** play the first week before you live it.
5. **Reveal + how it works.**
6. **Walkthrough** as Ananya's week: pick office, Monday plan, Monday auto ride, score, Friday kit.
7. **Aha:** she speaks Kannada for the first time and it lands.
8. **Recap:** three points.
9. **Final line.**

---

## 4. Full voiceover script (Kokoro `af_heart`, about 330 words)

> **[Hook]** In two weeks, Ananya starts her first job in Bengaluru.
>
> **[Frustration]** She's twenty four, from Lucknow. She speaks Hindi and English. No Kannada. Her research so far is forty open tabs: rent listings, traffic horror stories, and maps that can't tell her what Monday morning will actually feel like.
>
> **[Blind spot]** Here's what nobody tells you. Same office, different area, and your commute is sixteen minutes, or forty. And the first week is where the city decides how you feel about it. One awkward auto ride, and you already feel like an outsider.
>
> **[What if]** What if she could play her first week, before she lives it?
>
> **[Reveal]** This is Apna Area.
>
> **[How it works]** Pick your office on the Outer Ring Road. Gemini plans five real stops for your first week, using only verified Google Maps places. You talk your way through each one, out loud, with live voice characters. And you leave with a survival kit for Monday.
>
> **[Tour + Tune]** It opens with a dusk flight down the corridor. Ananya sets her budget, and her comfort language: Hindi plus English.
>
> **[Office]** She picks her office. RMZ Ecoworld. The city drops straight onto her gate.
>
> **[Director]** Gemini builds her week. Monday to Friday. Five stops, each one a real place, checked on the server before it ever reaches the screen. Tap Verified, and there's the Google Maps place ID.
>
> **[Voice]** Monday. An auto ride to the tech park. She taps Talk with Ramesh, and the music steps aside. She speaks Hindi. Ramesh answers, live, warmly, and offers her one polite Kannada line.
>
> **[Aha, 4 s of no VO, then]** She said it. And it's hers now.
>
> **[Score]** Gemini Decision 1 scores the turn in under half a second, and nudges Tuesday's Kannada a little higher. Not ready? One tap, and the pace gets gentler. The AI advises. She decides.
>
> **[Kit]** By Friday, she has her kit. Real Monday commutes at nine and six thirty, from three nearby areas. Every phrase she spoke, ready to replay. A move-in checklist.
>
> **[Confirm]** And nothing leaves the app without asking her first.
>
> **[Recap]** Real places. Real conversations. A real plan for Monday.
>
> **[Final]** Ananya hasn't moved yet. But she's already lived her first week.

---

## 5. Scene-by-scene storyboard

Story scenes (1 to 5): dark cinematic, `#0E0A1C` stage, Anton display type, the pink line.
Product scenes (6 to 13): real 1920x1080 captures of the live app, camera zoom, animated cursor with click ripple, small captions bottom center.

| # | Time | Scene | Visuals | Duration |
|---|---|---|---|---|
| 1 | 0:00 | Hook | Black. A calendar strip counts down `14 days` with one thin pink stroke under it. A phone notification slides in: "Offer accepted · Bellandur, Bengaluru". | 5 s |
| 2 | 0:05 | Frustration | Name card "Ananya, 24 · Lucknow". Three language chips: Hindi ✓, English ✓, Kannada ✕. Then browser tabs stack fast and overlap into a wall (generic titles: "PG near Bellandur", "Silk Board traffic", "1 BHK rent ORR"...), slight shake, then everything freezes. | 15 s |
| 3 | 0:20 | Blind spot | The tabs fall away. One office pin. Two pink commute lines draw from two areas: `16 min` and `39 min` (real Routes API numbers from the kit). Then a single line of type: "Nobody rehearses the first week." | 13 s |
| 4 | 0:33 | What if | Black. Type writes on: "What if she could play her first week, before she lives it?" Music starts to lift. | 5 s |
| 5a | 0:38 | Logo reveal | The pink line sweeps across and draws the ORR curve, then contracts into the APNA AREA wordmark underline. Music swell. | 4 s |
| 5b | 0:42 | How it works | Four nodes connected by the pink line, each lighting as VO names it: **Pick office** (Maps + Places) → **Plan 5 real stops** (Gemini 4 Neon + verifier) → **Talk it out** (Gemini 3.8 Live + Decision 1) → **Survival kit** (Routes API + 3.8 Flash TTS). Small Lyria 3 tag under the line. | 14 s |
| 6 | 0:56 | Tour + Tune | Cross-dissolve into live app: dusk tour flies past Marathahalli. Esc. Cursor hovers `Live` pill (tooltip), clicks `Tune`, picks Hindi + English, Done. Zoom 1.06 on the popover. | 11 s |
| 7 | 1:07 | Office + 3D | Cursor toggles `3D`. Ctrl+K keycap overlay, types "RMZ Ecoworld", Enter. Sky-Drop swoop onto the yellow light pillar, radar minimap visible. | 8 s |
| 8 | 1:15 | Director + provenance | Click `Build my first week`. SSE chips tick teal one by one. Five numbered pillars drop at stagger, Mon..Fri bar mounts. Zoom into Stop 1 card, click `Verified · 0.8 km`, the Place ID reveals. Q/E orbit while VO finishes. | 13 s |
| 9 | 1:28 | Voice | Click `Talk with Ramesh`. Meter flag drops `METER ON · 01:30`, mic orb pulses. Captions stream: her Hindi line, Ramesh's warm reply, then the Kannada phrase card appears. Our music ducks hard here (mirrors the app's own ducking). | 12 s |
| 10 | 1:40 | **Aha** | Tight zoom on the phrase card. Her caption: "Aṇṇa, dayaviṭṭu mīṭar hāki banni." Teal mastery ring, E5 to B5 chime, `Saved to kit`, card flies up into `Phrases · 1`. No VO for 4 s, music swells, then "She said it. And it's hers now." | 7 s |
| 11 | 1:47 | Score + override | Result card: XP odometer rolls to 300, stars fill. Click `Why did this change?`, 2x2 rubric bars grow. Click `Switch to gentler pace`, pill flips to `Gentler pace locked`. | 13 s |
| 12 | 2:00 | Survival Kit | "YOU'RE READY FOR MONDAY." Pan down the commute bars (two-wheeler 16 min teal). Click play on a Kannada phrase (real Sulafat TTS audio plays). Check off one task. | 12 s |
| 13 | 2:12 | Confirm sheet | Click `Directions`. Confirm sheet with destination. Esc keycap, sheet closes, focus returns. | 4 s |
| 14 | 2:16 | Recap | Back to dark. Three lines stack, each with a small icon in the pink line style: Real places. Real conversations. A real plan for Monday. | 7 s |
| 15 | 2:23 | Final line | "Ananya hasn't moved yet. But she's already lived her first week." Fade to logo + URL `apna-area-481049877093.asia-south1.run.app`. Music resolves. | 7 s |

**Total: about 2:30.**

---

## 6. Audio plan

- Narration: Kokoro `af_heart`, generated per line so timing is exact; J and L cuts across scene boundaries.
- Music: the app's own Lyria 3 loops. `calm.mp3` under story scenes, `evening.mp3` from the reveal on. Bed at about -22 LUFS under voice, ducked further in the voice scene, small swells at reveal, aha and final line. Crossfades, no hard cuts.
- SFX: soft click under each cursor click, the real E5 to B5 chime at the aha, real Sulafat TTS clip in the kit scene.

## 7. Build plan (after approval)

1. Capture fresh 1920x1080 at 2x DPR from the live URL with Playwright (crisper than the 1440x900 shots). The voice scene cannot run headless with a mic, so it is rebuilt as motion graphics from real UI layers (`shot-04` + live DOM captures), not a fake new UI.
2. Compose in Remotion (React video), one component per scene, shared easing and type tokens.
3. Kokoro TTS per line, then exact frame timing from the audio lengths.
4. Contact sheet per scene (frame grabs) for review, fix, subtraction pass, final render.
