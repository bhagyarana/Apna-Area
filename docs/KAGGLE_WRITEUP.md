# Kaggle Submission: Apna Area

Copy each block into the matching Kaggle field.

## 1. Basics

| Field | Value |
|---|---|
| Title | `Apna Area: Play Bengaluru Before You Move` |
| URL | `apna-area` |
| Subtitle | `Your first week in Bengaluru as a voice game. Real places, live Kannada practice, real Monday commutes.` |
| Card image (560x280) | [`docs/assets/thumbnail-560x280.png`](assets/thumbnail-560x280.png) |

## 2. Media gallery (in this order)

1. Demo video on YouTube, set to **Unlisted** or **Public** (`video/out/demo_video.mp4`, thumbnail [`youtube-1280x720.png`](assets/youtube-1280x720.png))
2. Architecture diagram (`shot-08-architecture-diagram.png`)
3. Feature screens `shot-01` to `shot-07`

## 3. Project description

Paste everything between the lines.

---

### What if you could play your first week in a new city, before you move?

Ananya is 24. In two weeks she joins a tech park on Bengaluru's Outer Ring Road. She speaks Hindi and English, no Kannada, and has 40 tabs open. Same office, different area: her bus ride is **21 minutes, or 45**.

**Apna Area** turns that corridor into a voice game of her first week.

1. **Pick your office.** 12 verified tech parks.
2. **Gemini plans five real stops.** Auto ride, breakfast counter, PG visit, bus stop, lakeside catch-up. Each one a verified Google Maps place.
3. **Talk your way through.** Live voice characters reply in English, Hindi or Hinglish and coach one polite Kannada line. Say it out loud and it is saved.
4. **Leave with a kit.** Monday 09:00 and 18:30 commutes from three nearby areas, phrase audio, a move-in checklist.

### Try it in 2 minutes (no login)

[apna-area-481049877093.asia-south1.run.app/?demo=1](https://apna-area-481049877093.asia-south1.run.app/?demo=1)

1. Press `Esc`, pick **RMZ Ecoworld**, click **Build my first week**. Tap **Verified** to see the real `place_id`.
2. Click **Talk with Ramesh**. Speak, or click **Type instead**. Say the Kannada line.
3. Open **Survival Kit**. Play a phrase. Click **Directions** to see the confirm sheet.

### How Gemini is used

| Job | Model | Why |
|---|---|---|
| Plan the week | `gemini-4-neon` | Picks 5 stops from a schema `enum` of verified `place_id`s, streamed live |
| Voice characters | `gemini-3.8-live` | Two-way speech in under a second, barge-in, server-locked tokens |
| Score and adapt | `gemini-decision-1` | Scores each turn in ~450 ms with calibrated confidence, tunes the next stop |
| Phrase audio | `gemini-3.8-flash-tts` | Clear Kannada replay, cached |
| Area notes | `gemini-3.5-flash-lite` | Short neighbourhood notes, no prices |
| Music, portraits | `lyria-3-clip-preview`, `gemini-nano-banana-2.1` | Generated once at build time, $0 per visitor |

Plus Google Maps Platform: Places API (New) for 121 verified places, Routes API for Monday commutes, Maps JS for the 2D and 3D Neon Dusk map.

![Architecture](shot-08-architecture-diagram.png)

### Why you can trust it

- **No invented places.** A schema `enum` limits Gemini to verified places, and a server verifier rejects anything unknown, plus any made-up rent or fare.
- **Keys stay on the server.** Voice uses short-lived tokens. No location access. Voice is never stored.
- **You decide.** The AI suggests the pace; one tap overrides it. Every link out or download asks first.

**Stack:** React 19, Fastify on Node 22, TypeScript, Cloud Run. No database.

**Code:** [github.com/bhagyarana/Apna-Area](https://github.com/bhagyarana/Apna-Area)

---

## 4. Project links

1. Live app: `https://apna-area-481049877093.asia-south1.run.app/?demo=1`
2. GitHub: `https://github.com/bhagyarana/Apna-Area`

## 5. Before you click Submit

- [ ] YouTube video plays in an incognito window
- [ ] Card image uploaded, architecture image placed in the description
- [ ] Both project links added
- [ ] DOI opt-in ticked
- [ ] Status shows **Submitted**, not Draft
