// Drives the live Apna Area app and captures 2x stills, element boxes and CDP screencast clips.
import { chromium } from "playwright";
import fs from "node:fs";

const URL = "https://apna-area-481049877093.asia-south1.run.app/?demo=1";
const OUT = process.env.OUT || "public/shots";
fs.mkdirSync(OUT, { recursive: true });
const manifest = { shots: {}, boxes: {}, clips: {} };
const save = () => fs.writeFileSync(`${OUT}/manifest.json`, JSON.stringify(manifest, null, 1));

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME,
  args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist", "--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream", "--autoplay-policy=no-user-gesture-required"],
});
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2, permissions: ["microphone", "clipboard-read", "clipboard-write"] });
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);

async function shot(name) {
  await page.screenshot({ path: `${OUT}/${name}.png` });
  manifest.shots[name] = Date.now();
  save();
  console.log("shot", name);
}
async function box(name, locator) {
  try {
    const b = await locator.boundingBox({ timeout: 3000 });
    if (b) manifest.boxes[name] = b;
    save();
  } catch { console.log("nobox", name); }
}

let rec = null;
async function startClip(name) {
  const dir = `${OUT}/clip-${name}`;
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const frames = [];
  const handler = async (e) => {
    const i = frames.length;
    frames.push(e.metadata.timestamp);
    fs.writeFileSync(`${dir}/${String(i).padStart(4, "0")}.jpg`, Buffer.from(e.data, "base64"));
    cdp.send("Page.screencastFrameAck", { sessionId: e.sessionId }).catch(() => {});
  };
  cdp.on("Page.screencastFrame", handler);
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: 1920, maxHeight: 1080, everyNthFrame: 1 });
  rec = { name, frames, handler };
}
async function stopClip() {
  await cdp.send("Page.stopScreencast");
  cdp.off("Page.screencastFrame", rec.handler);
  const t0 = rec.frames[0];
  manifest.clips[rec.name] = rec.frames.map((t) => +(t - t0).toFixed(3));
  save();
  console.log("clip", rec.name, rec.frames.length, "frames");
  rec = null;
}
const step = async (label, fn) => { try { await fn(); } catch (e) { console.log("FAIL", label, e.message.split("\n")[0]); if (rec) await stopClip(); } };
const tid = (id) => page.getByTestId(id);

await step("tour", async () => {
  await page.goto(URL);
  await startClip("tour");
  await page.waitForTimeout(9500);
  await stopClip();
  await page.keyboard.press("Escape");
  await tid("office-combobox-input").waitFor();
  await page.waitForTimeout(1500);
  await shot("01-landing");
  for (const id of ["health-dot", "tune-trigger", "map-3d-toggle", "office-combobox-input", "demo-timer-pill"]) await box(id, tid(id));
});

await step("live pill", async () => {
  await tid("health-dot").hover();
  await page.waitForTimeout(700);
  await shot("02-live-hover");
  await page.mouse.move(960, 900);
});

await step("tune", async () => {
  await tid("tune-trigger").click();
  await page.waitForTimeout(600);
  await shot("03-tune-open");
  const hien = page.getByRole("radio", { name: /Hindi \+ English/ }).or(page.getByText("Hindi + English", { exact: true })).first();
  const room = page.getByRole("radio", { name: /Private room in 2-3 BHK/ }).or(page.getByText("Private room in 2-3 BHK", { exact: true })).first();
  await box("tune-hien", hien);
  await box("tune-room", room);
  await room.click();
  await hien.click();
  await page.waitForTimeout(500);
  await shot("04-tune-set");
  const done = page.getByRole("button", { name: /^Done$/ });
  await box("tune-done", done);
  if (await done.count()) await done.click(); else await page.keyboard.press("Escape");
  await page.waitForTimeout(600);
  await shot("05-tune-closed");
});

await step("3d", async () => {
  const pressed = await tid("map-3d-toggle").getAttribute("aria-pressed");
  if (pressed !== "true") await tid("map-3d-toggle").click();
  await page.waitForTimeout(2500);
  await shot("06-3d-on");
});

await step("pick", async () => {
  await page.keyboard.press("Control+k");
  await page.keyboard.type("RMZ Ecow", { delay: 90 });
  await page.waitForTimeout(700);
  await shot("07-combobox");
  await startClip("skydrop");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(4000);
  await stopClip();
  await shot("08-office-picked");
  await box("build-week-cta", tid("build-week-cta"));
});

await step("build", async () => {
  await startClip("director");
  await tid("build-week-cta").click();
  for (let i = 0; i < 12; i++) {
    await page.waitForTimeout(1200);
    if (await tid("progress-chip-list").isVisible().catch(() => false)) await shot(`09-director-${String(i).padStart(2, "0")}`);
    if (await tid("mission-card").isVisible().catch(() => false)) break;
  }
  await tid("mission-card").waitFor({ timeout: 60000 });
  await page.waitForTimeout(3500);
  await stopClip();
  await shot("10-week-hub");
  for (const id of ["mission-provenance", "start-mission-cta", "week-progress-bar", "phrasebook-pill", "mission-card"]) await box(id, tid(id));
});

await step("provenance", async () => {
  await tid("mission-provenance").click();
  await page.waitForTimeout(700);
  await shot("11-provenance");
  await page.keyboard.press("Escape");
});

await step("orbit", async () => {
  await page.mouse.move(1300, 600);
  await startClip("orbit");
  for (let i = 0; i < 14; i++) { await page.keyboard.press("e"); await page.waitForTimeout(220); }
  await page.waitForTimeout(800);
  await stopClip();
  await shot("12-orbit");
});

await step("voice", async () => {
  await tid("start-mission-cta").click();
  await tid("live-mission-dialog").waitFor({ timeout: 20000 });
  await page.waitForTimeout(4000);
  await shot("13-voice-open");
  for (const id of ["live-mic-orb", "toggle-text-fallback-btn", "request-hint-btn", "target-phrase-card", "live-countdown"]) await box(id, tid(id));
  if (!(await tid("live-text-form").isVisible().catch(() => false))) await tid("toggle-text-fallback-btn").click();
  await page.waitForTimeout(500);
  await box("live-text-input", tid("live-text-input"));
  await tid("live-text-input").fill("Bhaiya, meter se chalenge na? Bagmane tech park jaana hai.");
  await tid("live-text-send").click();
  await page.waitForTimeout(9000);
  await shot("14-voice-hindi-reply");
  await box("target-phrase-card", tid("target-phrase-card"));
  await tid("live-text-input").fill("Aṇṇa, dayaviṭṭu mīṭar hāki banni.");
  await startClip("mastery");
  await tid("live-text-send").click();
  for (let i = 0; i < 14; i++) {
    await page.waitForTimeout(1000);
    const st = await tid("target-phrase-status").textContent().catch(() => "");
    if (/Saved/i.test(st || "")) { await page.waitForTimeout(2500); break; }
  }
  await stopClip();
  await shot("15-voice-mastered");
  await box("phrasebook-pill", tid("phrasebook-pill"));
  await startClip("result");
  const closers = ["Theek hai bhaiya, meter on hai toh chaliye Ecoworld. Dhanyavaad!", "Haan, chaliye, main ready hoon. Thank you!", "Okay, let's go. Thank you, anna."];
  for (const c of closers) {
    if (await tid("mission-result-card").isVisible().catch(() => false)) break;
    if (await tid("live-text-input").isVisible().catch(() => false)) { await tid("live-text-input").fill(c); await tid("live-text-send").click(); }
    for (let i = 0; i < 25; i++) { await page.waitForTimeout(1000); if (await tid("mission-result-card").isVisible().catch(() => false) || await tid("complete-continue-btn").isVisible().catch(() => false)) break; }
  }
});

await step("result", async () => {
  await tid("mission-result-card").waitFor({ timeout: 30000 });
  await page.waitForTimeout(2500);
  await stopClip();
  await shot("16-result");
  await box("why-changed-toggle", tid("why-changed-toggle"));
  await tid("why-changed-toggle").click();
  await page.waitForTimeout(900);
  await shot("17-why");
  await box("override-gentle-btn", tid("override-gentle-btn"));
  await box("mission-result-card", tid("mission-result-card"));
  await tid("override-gentle-btn").click();
  await page.waitForTimeout(900);
  await shot("18-gentle");
  await box("result-open-kit-btn", tid("result-open-kit-btn"));
});

await step("kit", async () => {
  if (await tid("result-open-kit-btn").isVisible().catch(() => false)) await tid("result-open-kit-btn").click();
  else await tid("phrasebook-pill").click();
  await tid("survival-kit").waitFor({ timeout: 30000 });
  await page.waitForTimeout(2500);
  await shot("19-kit");
  const play = page.locator('[data-testid^="play-phrase-btn-"]').first();
  await box("play-phrase", play);
  await box("kit-commute-card", tid("kit-commute-card"));
  await play.click();
  await page.waitForTimeout(1200);
  await shot("20-kit-playing");
  const check = page.locator('[data-testid^="kit-check-"]').first();
  await box("kit-check", check);
  await check.click();
  await page.waitForTimeout(600);
  await shot("21-kit-checked");
  const maps = page.locator('[data-testid^="open-maps-btn-"]').first();
  await box("open-maps", maps);
  await maps.click();
  await tid("confirm-sheet").waitFor();
  await page.waitForTimeout(700);
  await shot("22-confirm");
  await box("confirm-sheet", tid("confirm-sheet"));
  await page.keyboard.press("Escape");
  await page.waitForTimeout(600);
  await shot("23-confirm-closed");
});

await browser.close();
console.log("done");
