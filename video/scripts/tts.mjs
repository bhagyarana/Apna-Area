import { KokoroTTS } from "kokoro-js";
import fs from "node:fs";
const lines = JSON.parse(fs.readFileSync("scripts/vo-lines.json", "utf8"));
const only = process.argv[2];
const tts = await KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX", { dtype: "fp32", device: "cpu" });
const durations = fs.existsSync("public/vo/durations.json") ? JSON.parse(fs.readFileSync("public/vo/durations.json","utf8")) : {};
for (const [id, text] of lines) {
  if (only && id !== only) continue;
  const audio = await tts.generate(text, { voice: "af_heart", speed: 0.95 });
  audio.save(`public/vo/${id}.wav`);
  durations[id] = audio.audio.length / audio.sampling_rate;
  console.log(id, durations[id].toFixed(2));
}
fs.writeFileSync("public/vo/durations.json", JSON.stringify(durations, null, 1));
