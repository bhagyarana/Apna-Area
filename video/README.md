# Apna Area demo video

Source for `demo_video.mp4` (1920x1080, 30 fps, H.264 + AAC). Story and script: `STORYBOARD.md`.

## Pipeline
1. `node scripts/tts.mjs [lineId]` generates narration with Kokoro `af_heart` from `scripts/vo-lines.json` into `public/vo/`.
2. `CHROME=<path to chrome.exe> OUT=public/shots2 node scripts/capture.mjs` drives the live Cloud Run app and saves 2x stills, element boxes and CDP screencast clips.
3. `py -3.12 scripts/sfx.py` synthesizes the click, chime and whoosh.
4. `node scripts/sheets.mjs '<json [[label, seconds]]>' cache/frames` renders contact-sheet frames; `scripts/sheet.py` tiles them.
5. `npm run render` renders `out/demo_video.mp4`. `npm run studio` opens Remotion Studio.

Music is the app's own Lyria 3 loops (`calm`, `evening`). The Kannada TTS clip is the app's real `/api/tts` output.
