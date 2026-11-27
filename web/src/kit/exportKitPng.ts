/**
 * Feature: Client-Side ORR Neon Dusk Survival Kit PNG Exporter (web/src/kit/exportKitPng.ts)
 * Purpose: Renders a clean 1200x675 summary card on an offscreen HTML5 Canvas and downloads it locally after ConfirmSheet approval.
 * Inputs: KitPayload, checked checklist IDs, and cumulative XP/stars.
 * Outputs: Local apna-area-survival-kit.png download with zero network upload.
 * Deliberately excludes: Cloud uploads, third-party fonts/logos, or unverified rupee figures.
 */
import type { KitPayload } from "@apna-area/shared";

export interface ExportKitPngInput {
  kit: KitPayload;
  checkedIds: readonly string[];
  totalXp: number;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function truncateClean(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const sliced = text.slice(0, maxChars - 3);
  const lastSpace = sliced.lastIndexOf(" ");
  return `${(lastSpace > 16 ? sliced.slice(0, lastSpace) : sliced).trimEnd()}...`;
}

/** Generates and downloads a 1200x675 PNG summary card of the player's Outer Ring Road Survival Kit. */
export function downloadSurvivalKitPng(input: ExportKitPngInput): void {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 675;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Base ORR Neon Dusk backdrop
  ctx.fillStyle = "#0E0A1C";
  ctx.fillRect(0, 0, 1200, 675);

  // Top dusk gradient accent bar
  const grad = ctx.createLinearGradient(0, 0, 1200, 0);
  grad.addColorStop(0, "#FF4FA0");
  grad.addColorStop(0.52, "#FF8A5B");
  grad.addColorStop(1, "#FFD24A");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1200, 8);

  // Header block
  ctx.fillStyle = "#3DE6D0";
  ctx.font = "600 15px 'Hanken Grotesk', system-ui, sans-serif";
  ctx.fillText(
    `APNA AREA · FIRST-WEEK SURVIVAL KIT · ${input.kit.office.name.toUpperCase()}`,
    48,
    54,
  );

  ctx.fillStyle = "#F7F1FF";
  ctx.font = "400 46px 'Anton', Impact, sans-serif";
  ctx.fillText("YOU'RE READY FOR MONDAY.", 48, 108);

  ctx.fillStyle = "#CFC4E8";
  ctx.font = "500 17px 'Hanken Grotesk', system-ui, sans-serif";
  ctx.fillText(
    `${input.kit.office.neighbourhood} · ${input.checkedIds.length} of ${input.kit.checklist.length} checklist items ready · ${input.totalXp} XP`,
    48,
    138,
  );

  // Column 1: Where to live
  drawRoundedRect(ctx, 48, 166, 356, 460, 18);
  ctx.fillStyle = "#19132E";
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = "#FFD24A";
  ctx.font = "700 16px 'Hanken Grotesk', system-ui, sans-serif";
  ctx.fillText("WHERE TO LIVE (MONDAY IST)", 70, 202);

  input.kit.neighbourhoods.slice(0, 3).forEach((area, idx) => {
    const y = 242 + idx * 124;
    ctx.fillStyle = "#F7F1FF";
    ctx.font = "700 18px 'Hanken Grotesk', system-ui, sans-serif";
    ctx.fillText(`${area.areaName} (${area.distanceKm} km)`, 70, y);

    ctx.fillStyle = "#3DE6D0";
    ctx.font = "600 14px 'Hanken Grotesk', system-ui, sans-serif";
    const am = area.morningDriveMin !== null ? `${area.morningDriveMin}m` : "--";
    const pm = area.eveningDriveMin !== null ? `${area.eveningDriveMin}m` : "--";
    const tw = area.twoWheelerMin !== null ? `${area.twoWheelerMin}m` : "--";
    ctx.fillText(`09:00 Car ${am} · 18:30 Car ${pm} · 2W ${tw}`, 70, y + 26);

    ctx.fillStyle = "#A397C2";
    ctx.font = "400 13px 'Hanken Grotesk', system-ui, sans-serif";
    ctx.fillText(truncateClean(area.oneLine || area.fitReason, 46), 70, y + 50);
  });

  // Column 2: Phrases you spoke
  drawRoundedRect(ctx, 422, 166, 356, 460, 18);
  ctx.fillStyle = "#19132E";
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#3DE6D0";
  ctx.font = "700 16px 'Hanken Grotesk', system-ui, sans-serif";
  ctx.fillText("KANNADA SURVIVAL PHRASES", 444, 202);

  input.kit.phrases.slice(0, 4).forEach((phr, idx) => {
    const y = 242 + idx * 96;
    ctx.fillStyle = "#F7F1FF";
    ctx.font = "600 17px 'Noto Sans Kannada', 'Hanken Grotesk', sans-serif";
    ctx.fillText(truncateClean(phr.kannada, 34), 444, y);
    ctx.fillStyle = "#CFC4E8";
    ctx.font = "500 13px 'Hanken Grotesk', system-ui, sans-serif";
    ctx.fillText(truncateClean(phr.transliteration, 44), 444, y + 23);
    ctx.fillStyle = "#A397C2";
    ctx.fillText(truncateClean(phr.english, 46), 444, y + 43);
  });

  // Column 3: Checklist
  drawRoundedRect(ctx, 796, 166, 356, 460, 18);
  ctx.fillStyle = "#19132E";
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#FF4FA0";
  ctx.font = "700 16px 'Hanken Grotesk', system-ui, sans-serif";
  ctx.fillText("FIRST-WEEK CHECKLIST", 818, 202);

  input.kit.checklist.slice(0, 6).forEach((item, idx) => {
    const y = 240 + idx * 62;
    const done = input.checkedIds.includes(item.id);
    ctx.fillStyle = done ? "#3DE6D0" : "#A397C2";
    ctx.font = "700 14px 'Hanken Grotesk', system-ui, sans-serif";
    ctx.fillText(done ? "[x]" : "[ ]", 818, y);
    ctx.fillStyle = "#F7F1FF";
    ctx.font = "500 13.5px 'Hanken Grotesk', system-ui, sans-serif";
    ctx.fillText(truncateClean(item.label, 42), 848, y);
  });

  const dataUrl = canvas.toDataURL("image/png");
  const anchor = document.createElement("a");
  anchor.href = dataUrl;
  anchor.download = "apna-area-survival-kit.png";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}
