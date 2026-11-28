import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import fs from "node:fs";
import path from "node:path";
const times = JSON.parse(process.argv[2]); // [[label, seconds], ...]
const outDir = process.argv[3] || "cache/frames";
fs.mkdirSync(outDir, { recursive: true });
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const composition = await selectComposition({ serveUrl, id: "Demo" });
console.log("total s", composition.durationInFrames / 30);
for (const [label, s] of times) {
  const frame = Math.min(composition.durationInFrames - 1, Math.round(s * 30));
  await renderStill({ serveUrl, composition, frame, output: `${outDir}/${label}.png`, scale: 0.5 });
}
console.log("ok");
