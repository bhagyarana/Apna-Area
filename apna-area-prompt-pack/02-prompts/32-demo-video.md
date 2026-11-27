# 32 · Demo video

**Use when:** after P6, once three rehearsals pass.
**Requirement:** no length limit. The video must cover **every feature and its functionality** with a **compelling story** and an **intuitive flow**. Let coverage set the length and cut every second of dead air. It will likely land around 3 to 4 minutes.

**Style (your launch-video format):** dark cinematic story first (hook, frustration, blind spot, "what if"), then the logo reveal, then the product in the order a real user meets it. Female narration with great storytelling, small legible captions, a soft music bed ducked under the voice (use one of your Lyria loops), no team mention, a memorable final line. Output `demo_video.mp4`, 1080p30.

**One rule for this event:** judges score live working software, so every product scene is a real screen capture of the deployed URL, not recreated UI. Motion graphics are for the story opening, the architecture scene and captions.

## Step 1: build the feature checklist first (paste into Antigravity)

```text
Read @PROJECT_BRIEF.md @docs/PRD.md @Design.md @docs/TASKS.md and the git tags. List every user-visible feature and behaviour that is live on main, in the order a first-time user meets them. For each: one line on what it does, the exact click path to show it, and the moment that makes it feel good. Save as docs/VIDEO_COVERAGE.md. Mark anything behind a disabled flag as "not in video".
```

Every line in that checklist must appear in the video. Tick them off in the edit.

## Step 2: script (the spine; adjust to the checklist)

| Chapter | Scene | Narration (draft) |
|---|---|---|
| **1. Hook** | Dark. A phone lights up: "Offer letter. Location: Bellandur, Bengaluru." | "Two weeks. That's how long Ananya has before she moves to a city she has never seen." |
| **2. Frustration** | Fast cuts: unfamiliar map names, a commute app showing red, a menu she can't read | "Where should she live? How bad is the commute? How does she even order breakfast?" |
| **3. Blind spot** | Black frame, one line | "Every guide tells her about the city. Nothing lets her practise living in it." |
| **4. What if** | Logo reveal on the dusk skyline | "What if she could play her first week before it happens?" |
| **5. The tour** | Real capture: the camera flight along the Outer Ring Road | "This is the Outer Ring Road. Every place you will see is real, verified through Google Maps." |
| **6. Choose** | Office picker, keyboard search, camera glide | "She picks the office she's joining." |
| **7. The Director** | Progress chips, verified count, mission pins drop, week bar | "Gemini 4 Neon builds her week live. Anything it can't verify never reaches the screen." |
| **8. Talk** | Voice mission in English, portrait, captions, a hint | "Then she talks. Out loud. Each character has a job, a mood and a little patience." |
| **9. Her language** | Same NPC switching to Hindi when she does | "When she switches to Hindi, so do they." |
| **10. The local twist** | Auto driver leads in Kannada, teaches a phrase, she says it, phrase card flies into the phrasebook | "And then the auto driver teaches her one phrase in Kannada. When she gets it right, it's hers." |
| **11. Adapts** | Score card, XP rolls, "Why did this change?", next mission is different | "Every conversation is scored in under a second, and the next one adapts to how she did." |
| **12. The week** | Quick montage of the remaining missions, music changing with the mood | "Breakfast, a room to rent, the ride home. A whole first week." |
| **13. Survival Kit** | Real commute times, phrases with replay, checklist | "She leaves with real commute times, the phrases she actually spoke, and a plan." |
| **14. In control** | Confirm sheet before opening Google Maps | "Nothing leaves the app without her say." |
| **15. Under the hood** | Animated architecture: Neon plans, Decision 1 routes, Live talks, Maps verifies, Lyria scores, Cloud Run serves | One sentence per box. |
| **16. Recap** | Three lines on screen | "Real places. Real voices. Ready for Monday." |
| **17. Close** | Logo and live URL | "Apna Area. Play your first week before it happens." |

If a language step was switched off, drop its chapter and keep the flow; never show a disabled feature.

## Recording tips
- Record at 1920x1080, browser zoom 110%, hide bookmarks and extensions.
- Use headphones for voice missions so the NPC audio is clean, then capture system audio.
- Record each voice mission twice and keep the better take. Never fake or edit model output.
- Keep each chapter under 20 seconds unless the feature genuinely needs more. Pacing is the story.
