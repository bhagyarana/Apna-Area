/**
 * Feature: Build-Time Fictional NPC Portrait Generator (scripts/generate-portraits.ts)
 * Purpose: Pre-generates gender-matched stylized ORR Neon Dusk portraits via gemini-nano-banana-2.1 and encodes crisp 256x256 WebP assets in web/public/art/npcs/.
 * Inputs: GEMINI_API_KEY from .env.local or .env.
 * Outputs: Ten <role>_<gender>.webp + five default <role>.webp portraits in web/public/art/npcs/.
 * Deliberately excludes: Real-person likenesses, third-party IP, or runtime per-visitor image calls.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { GoogleGenAI } from "@google/genai";
import { chromium } from "@playwright/test";
import { logger, MODEL_IDS, type NpcGender, type NpcRole } from "@apna-area/shared";

if (existsSync(".env.local")) {
  process.loadEnvFile(".env.local");
} else if (existsSync(".env")) {
  process.loadEnvFile(".env");
}

const apiKey = process.env.GEMINI_API_KEY?.trim();
if (!apiKey) {
  throw new Error("GEMINI_API_KEY is required in .env.local or .env to generate NPC portraits.");
}

const STYLE_SUFFIX =
  "Original stylized modern indie game character bust portrait, warm painterly editorial illustration, Bengaluru tropical twilight dusk lighting with deep indigo plum shadows (#0E0A1C) and subtle magenta (#FF4FA0) and warm amber (#FFD24A) rim light, dignified friendly expression, clean uncluttered background, zero text or watermarks, 100% original art.";

interface PortraitBrief {
  role: NpcRole;
  gender: NpcGender;
  legacyDefault?: boolean;
  prompt: string;
}

const PORTRAIT_BRIEFS: readonly PortraitBrief[] = [
  {
    role: "auto_driver",
    gender: "male",
    legacyDefault: true,
    prompt: `Fictional friendly male Bengaluru auto-rickshaw driver in neat khaki shirt beside a blurred dusk road glow, warm welcoming smile. ${STYLE_SUFFIX}`,
  },
  {
    role: "auto_driver",
    gender: "female",
    prompt: `Fictional friendly female Bengaluru auto-rickshaw driver in neat khaki shirt over kurta beside a blurred dusk road glow, confident warm smile. ${STYLE_SUFFIX}`,
  },
  {
    role: "darshini_owner",
    gender: "male",
    legacyDefault: true,
    prompt: `Fictional warm male South Indian darshini breakfast host holding a brass filter coffee davara tumbler at a clean counter at dusk glow. ${STYLE_SUFFIX}`,
  },
  {
    role: "darshini_owner",
    gender: "female",
    prompt: `Fictional warm female South Indian darshini breakfast host in neat cotton saree holding a brass filter coffee davara tumbler at a clean counter. ${STYLE_SUFFIX}`,
  },
  {
    role: "pg_owner",
    gender: "female",
    legacyDefault: true,
    prompt: `Fictional approachable female Bengaluru co-living building manager holding a small keyring on a leafy twilight terrace with potted plants. ${STYLE_SUFFIX}`,
  },
  {
    role: "pg_owner",
    gender: "male",
    prompt: `Fictional approachable male Bengaluru co-living building manager with neat spectacles holding a small keyring on a leafy twilight terrace. ${STYLE_SUFFIX}`,
  },
  {
    role: "transit_helper",
    gender: "male",
    legacyDefault: true,
    prompt: `Fictional friendly male regular Bengaluru bus commuter with a messenger bag standing near a softly lit evening bus stop shelter. ${STYLE_SUFFIX}`,
  },
  {
    role: "transit_helper",
    gender: "female",
    prompt: `Fictional friendly female regular Bengaluru bus commuter with a shoulder bag standing near a softly lit evening bus stop shelter. ${STYLE_SUFFIX}`,
  },
  {
    role: "office_buddy",
    gender: "male",
    legacyDefault: true,
    prompt: `Fictional welcoming young male Bengaluru software engineer teammate in smart-casual attire near lakeside trees at dusk. ${STYLE_SUFFIX}`,
  },
  {
    role: "office_buddy",
    gender: "female",
    prompt: `Fictional welcoming young female Bengaluru software engineer teammate in smart-casual attire near lakeside trees at dusk. ${STYLE_SUFFIX}`,
  },
];

async function pngBufferToWebp256(
  page: Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>["newPage"]>>,
  pngBase64: string,
): Promise<Buffer> {
  const dataUrl = await page.evaluate(async (b64: string) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, 256, 256);
    return canvas.toDataURL("image/webp", 0.9);
  }, pngBase64);

  const commaIdx = dataUrl.indexOf(",");
  return Buffer.from(dataUrl.slice(commaIdx + 1), "base64");
}

async function main(): Promise<void> {
  const client = new GoogleGenAI({ apiKey });
  const outDir = path.resolve("web/public/art/npcs");
  mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    for (const item of PORTRAIT_BRIEFS) {
      const targetWebp = path.join(outDir, `${item.role}_${item.gender}.webp`);
      const legacyPng = path.join(outDir, `${item.role}.png`);
      let pngBase64: string;

      if (item.legacyDefault && existsSync(legacyPng)) {
        pngBase64 = readFileSync(legacyPng).toString("base64");
      } else if (existsSync(targetWebp)) {
        continue;
      } else {
        const t0 = performance.now();
        const interaction = await client.interactions.create({
          model: MODEL_IDS.imageDefault,
          input: item.prompt,
          response_format: { type: "image", aspect_ratio: "1:1", image_size: "1K" },
          store: false,
        });
        if (!interaction.output_image?.data) {
          throw new Error(`No image returned for ${item.role}_${item.gender}`);
        }
        pngBase64 = interaction.output_image.data;
        logger.info("portrait.generated", {
          durationMs: performance.now() - t0,
          meta: { key: `${item.role}_${item.gender}` },
        });
      }

      const webpBuf = await pngBufferToWebp256(page, pngBase64);
      writeFileSync(targetWebp, webpBuf);

      if (item.legacyDefault) {
        copyFileSync(targetWebp, path.join(outDir, `${item.role}.webp`));
        if (existsSync(legacyPng)) {
          rmSync(legacyPng);
        }
      }
    }
  } finally {
    await browser.close();
  }
}

main().catch((err: unknown) => {
  logger.error("portrait.failed", { meta: { error: err instanceof Error ? err.message : String(err) } });
  process.exit(1);
});
