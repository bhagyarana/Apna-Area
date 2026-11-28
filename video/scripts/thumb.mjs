import { chromium } from "playwright";
import path from "node:path";
const b = await chromium.launch({ executablePath: process.env.CHROME });
const url = (w, h) => "file:///" + path.resolve("thumb/thumb.html").split(path.sep).join("/") + `?w=${w}&h=${h}`;
for (const [w, h, dsf, out] of [[1120, 560, 1, "thumb/thumbnail-1120x560.png"], [1120, 560, 0.5, "thumb/thumbnail-560x280.png"], [1120, 560, 2, "thumb/banner-2240x1120.png"], [1280, 720, 1, "thumb/youtube-1280x720.png"]]) {
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: dsf });
  await p.goto(url(w, h)); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(400);
  await p.screenshot({ path: out }); await p.close(); console.log(out);
}
await b.close();
