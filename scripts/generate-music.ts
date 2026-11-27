/**
 * Feature: Build-Time Lyria Ambient Loop Generator (scripts/generate-music.ts)
 * Purpose: Pre-generates 4 x 30s instrumental mood loops via lyria-3-clip-preview into web/public/audio/ along with credits.json.
 * Inputs: GEMINI_API_KEY from .env.local or .env.
 * Outputs: calm.mp3, morning.mp3, rush.mp3, evening.mp3, and credits.json in web/public/audio/.
 * Deliberately excludes: Vocals, copyrighted melodies, or runtime per-visitor music generation calls.
 */
import { existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { GoogleGenAI } from "@google/genai";
import { logger, MODEL_IDS, type MissionMood } from "@apna-area/shared";

if (existsSync(".env.local")) {
  process.loadEnvFile(".env.local");
} else if (existsSync(".env")) {
  process.loadEnvFile(".env");
}

const apiKey = process.env.GEMINI_API_KEY?.trim();
if (!apiKey) {
  throw new Error("GEMINI_API_KEY is required in .env.local or .env to generate Lyria loops.");
}

interface MoodLoopBrief {
  mood: MissionMood;
  title: string;
  fileName: string;
  prompt: string;
}

const LOOP_BRIEFS: readonly MoodLoopBrief[] = [
  {
    mood: "calm",
    title: "Outer Ring Road Neon Dusk",
    fileName: "calm.mp3",
    prompt:
      "Warm nocturnal ambient synthwave and mellow Rhodes electric piano loop in F major, 84 BPM, soft sub-bass pulse, gentle fingerpicked acoustic guitar harmonics, peaceful late-evening Bengaluru terrace atmosphere. Strictly instrumental only, zero vocals, seamless loop feel.",
  },
  {
    mood: "morning",
    title: "Morning Filter Coffee & Darshini",
    fileName: "morning.mp3",
    prompt:
      "Light uplifting acoustic indie game loop in D major, 98 BPM, warm nylon guitar, subtle wooden marimba, gentle shaker groove, soft Rhodes chords, optimistic sunny Bengaluru morning chai vibe. Strictly instrumental only, zero vocals, seamless loop feel.",
  },
  {
    mood: "rush",
    title: "Silk Board & Bellandur Commute Pulse",
    fileName: "rush.mp3",
    prompt:
      "Focused modern electronic lo-fi beat in A minor, 112 BPM, crisp muted rimshot groove, warm analog synth arpeggio, nimble bassline, energetic yet unobtrusive city commute momentum. Strictly instrumental only, zero vocals, seamless loop feel.",
  },
  {
    mood: "evening",
    title: "Agara Lake Twilight Breeze",
    fileName: "evening.mp3",
    prompt:
      "Dreamy chillhop dusk instrumental in C major, 88 BPM, warm electric guitar chords, airy synth pad, gentle brushed drums, relaxed golden-hour lakeside walk after work. Strictly instrumental only, zero vocals, seamless loop feel.",
  },
];

async function generateTrackWithRetry(
  client: GoogleGenAI,
  brief: MoodLoopBrief,
): Promise<{ buffer: Buffer; mimeType: string }> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const interaction = await client.interactions.create({
        model: MODEL_IDS.musicLoop,
        input: brief.prompt,
        store: false,
      });
      const data = interaction.output_audio?.data;
      if (!data) {
        throw new Error(`No output_audio returned for mood=${brief.mood}`);
      }
      return {
        buffer: Buffer.from(data, "base64"),
        mimeType: interaction.output_audio?.mime_type ?? "audio/mpeg",
      };
    } catch (err: unknown) {
      if (attempt === 0) {
        await new Promise((r) => setTimeout(r, 600));
        continue;
      }
      throw err;
    }
  }
  throw new Error(`Exhausted retries for mood=${brief.mood}`);
}

async function main(): Promise<void> {
  const force = process.argv.includes("--force");
  const client = new GoogleGenAI({ apiKey, httpOptions: { apiVersion: "v1beta" } });
  const outDir = path.resolve("web/public/audio");
  mkdirSync(outDir, { recursive: true });

  const creditsTracks: Array<{
    mood: MissionMood;
    title: string;
    file: string;
    mimeType: string;
    bytes: number;
    durationSeconds: number;
    prompt: string;
  }> = [];

  for (const brief of LOOP_BRIEFS) {
    const filePath = path.join(outDir, brief.fileName);
    let mimeType = "audio/mpeg";

    if (!force && existsSync(filePath) && statSync(filePath).size > 4096) {
      logger.info("music.cached", { meta: { mood: brief.mood, file: brief.fileName } });
    } else {
      const t0 = performance.now();
      const generated = await generateTrackWithRetry(client, brief);
      mimeType = generated.mimeType;
      writeFileSync(filePath, generated.buffer);
      logger.info("music.generated", {
        durationMs: performance.now() - t0,
        meta: { mood: brief.mood, bytes: generated.buffer.byteLength, mimeType },
      });
    }

    const bytes = statSync(filePath).size;
    creditsTracks.push({
      mood: brief.mood,
      title: brief.title,
      file: `/audio/${brief.fileName}`,
      mimeType,
      bytes,
      durationSeconds: 30,
      prompt: brief.prompt,
    });
  }

  const credits = {
    generatedAt: new Date().toISOString(),
    model: MODEL_IDS.musicLoop,
    note: `Pre-generated once at build time via Google Lyria 3 Clip Preview (${MODEL_IDS.musicLoop}). Zero per-visitor music generation calls.`,
    tracks: creditsTracks,
  };

  writeFileSync(path.join(outDir, "credits.json"), `${JSON.stringify(credits, null, 2)}\n`, "utf-8");
  logger.info("music.credits_written", { meta: { trackCount: creditsTracks.length } });
}

main().catch((err: unknown) => {
  logger.error("music.failed", { meta: { error: err instanceof Error ? err.message : String(err) } });
  process.exit(1);
});
