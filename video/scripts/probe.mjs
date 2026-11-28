import { chromium } from "playwright";
const headless = process.argv[2] !== "headed";
const browser = await chromium.launch({ headless, executablePath: process.env.CHROME, args: ["--use-angle=d3d11","--enable-gpu","--ignore-gpu-blocklist","--enable-unsafe-swiftshader"] });
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
await page.goto("https://apna-area-481049877093.asia-south1.run.app/?demo=1");
for (const t of [1500, 3500, 6000]) { await page.waitForTimeout(t === 1500 ? 1500 : 2000); await page.screenshot({ path: `cache/probe-${headless?'hl':'hd'}-${t}.png` }); }
const gl = await page.evaluate(() => { const c=document.createElement('canvas').getContext('webgl2'); const d=c&&c.getExtension('WEBGL_debug_renderer_info'); return d? c.getParameter(d.UNMASKED_RENDERER_WEBGL):'none'; });
await page.keyboard.press("Escape"); await page.waitForTimeout(1500);
console.log("renderer", gl, "3d", await page.getByTestId("map-3d-toggle").getAttribute("aria-pressed").catch(e=>"n/a"));
await page.screenshot({ path: `cache/probe-${headless?'hl':'hd'}-landing.png` });
await browser.close();
