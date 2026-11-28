import React from "react";
import { Img, staticFile, interpolate, Sequence, Audio } from "remotion";
import { C, Fill, HANKEN, easeInOut, easeOut, prog, useT, Keycap } from "./lib";
import m1 from "../public/shots/manifest.json";
import m2 from "../public/shots2/manifest.json";

export type Box = { x: number; y: number; width: number; height: number };
export const B = (name: string): Box => (m2.boxes as Record<string, Box>)[name];
export const ctr = (name: string, dx = 0, dy = 0) => {
  const b = B(name);
  return { x: b.x + b.width / 2 + dx, y: b.y + b.height / 2 + dy };
};

const clips: Record<string, number[]> = { ...(m1.clips as Record<string, number[]>) };
// Clip source: run 1 has the denser screencasts for tour, skydrop, director, orbit, mastery.
// The result clip comes from run 2, which matches the run 2 stills.
const clipDir: Record<string, string> = { tour: "shots", skydrop: "shots", director: "shots", orbit: "shots2", mastery: "shots2", result: "shots2" };
clips.orbit = (m2.clips as Record<string, number[]>).orbit;
clips.mastery = (m2.clips as Record<string, number[]>).mastery;
clips.result = (m2.clips as Record<string, number[]>).result;
export const clipLen = (name: string) => clips[name][clips[name].length - 1];

export type Patch = { src: string; rect: [number, number, number, number] };
export type Frame =
  | { t: number; src: string; patch?: Patch }
  | { t: number; clip: string; from?: number; speed?: number };
export type Cam = { t: number; s: number; x?: number; y?: number; d?: number };
export type Cur = { t: number; x: number; y: number; d?: number; click?: boolean; hide?: boolean };
export type Key = { t: number; end: number; keys: string[] };
export type Ov = (t: number) => React.ReactNode;

const still = (src: string) => staticFile(`shots2/${src}.png`);

const FrameView: React.FC<{ f: Frame; t: number }> = ({ f, t }) => {
  if ("clip" in f) {
    const ts = clips[f.clip];
    const local = (f.from ?? 0) + Math.max(0, t - f.t) * (f.speed ?? 1);
    let i = 0;
    while (i + 1 < ts.length && ts[i + 1] <= local) i++;
    return <Img src={staticFile(`${clipDir[f.clip]}/clip-${f.clip}/${String(i).padStart(4, "0")}.jpg`)} style={{ position: "absolute", width: 1920, height: 1080 }} />;
  }
  return (
    <>
      <Img src={still(f.src)} style={{ position: "absolute", width: 1920, height: 1080 }} />
      {f.patch && (
        <Img
          src={still(f.patch.src)}
          style={{ position: "absolute", width: 1920, height: 1080, clipPath: `inset(${f.patch.rect[1]}px ${1920 - f.patch.rect[0] - f.patch.rect[2]}px ${1080 - f.patch.rect[1] - f.patch.rect[3]}px ${f.patch.rect[0]}px)` }}
        />
      )}
    </>
  );
};

/** Camera state at time t: each key starts a move of duration d toward its target. */
const camAt = (keys: Cam[], t: number) => {
  let s = 1, x = 960, y = 540;
  for (const k of keys) {
    if (t < k.t) break;
    const p = prog(t, k.t, k.d ?? 1.0, easeInOut);
    const tx = k.x ?? 960, ty = k.y ?? 540;
    s = s + (k.s - s) * p;
    x = x + (tx - x) * p;
    y = y + (ty - y) * p;
  }
  // Clamp focal point so the frame never shows past the screenshot edges.
  const hx = 960 / s, hy = 540 / s;
  x = Math.min(Math.max(x, hx), 1920 - hx);
  y = Math.min(Math.max(y, hy), 1080 - hy);
  return { s, x, y };
};

const curAt = (keys: Cur[], t: number) => {
  if (!keys.length || t < keys[0].t) return null;
  let x = keys[0].x, y = keys[0].y, visible = 0;
  for (const k of keys) {
    if (t < k.t) break;
    const p = prog(t, k.t, k.d ?? 0.55, easeInOut);
    x = x + (k.x - x) * p;
    y = y + (k.y - y) * p;
    visible = k.hide ? 1 - prog(t, k.t, 0.25) : Math.max(visible, prog(t, k.t, 0.25));
  }
  return { x, y, visible };
};

export const clickTimes = (cur: Cur[]) => cur.filter((c) => c.click).map((c) => c.t + (c.d ?? 0.55));

const Cursor: React.FC<{ x: number; y: number; a: number; press: number }> = ({ x, y, a, press }) => (
  <div style={{ position: "absolute", left: x - 4, top: y - 3, opacity: a, transform: `scale(${1 - press * 0.14})`, transformOrigin: "4px 3px", filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.45))" }}>
    <svg width="34" height="40" viewBox="0 0 34 40">
      <path d="M4 3 L4 31 L11.5 24.5 L16.5 36 L21.5 33.8 L16.6 22.6 L26.5 22.6 Z" fill="#fff" stroke="#0E0A1C" strokeWidth="2.2" strokeLinejoin="round" />
    </svg>
  </div>
);

export const UIScene: React.FC<{ frames: Frame[]; cam?: Cam[]; cur?: Cur[]; keys?: Key[]; world?: Ov; screen?: Ov }> = ({ frames, cam = [], cur = [], keys = [], world, screen }) => {
  const t = useT();
  let idx = 0;
  while (idx + 1 < frames.length && frames[idx + 1].t <= t) idx++;
  const fadeIn = idx > 0 ? prog(t, frames[idx].t, 0.22, easeOut) : 1;
  const { s, x, y } = camAt(cam, t);
  const tx = 960 - x * s, ty = 540 - y * s;
  const c = curAt(cur, t);
  const clicks = clickTimes(cur);
  const press = clicks.reduce((acc, ct) => Math.max(acc, interpolate(t, [ct - 0.06, ct, ct + 0.16], [0, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })), 0);
  return (
    <Fill style={{ background: C.bg, overflow: "hidden", fontFamily: HANKEN }}>
      <div style={{ position: "absolute", width: 1920, height: 1080, transformOrigin: "0 0", transform: `translate(${tx}px, ${ty}px) scale(${s})` }}>
        {idx > 0 && fadeIn < 1 && <FrameView f={frames[idx - 1]} t={t} />}
        <div style={{ position: "absolute", inset: 0, opacity: fadeIn }}>
          <FrameView f={frames[idx]} t={t} />
        </div>
        {world?.(t)}
      </div>
      {c &&
        clicks.map((ct) => {
          const p = prog(t, ct, 0.45, easeOut);
          if (t < ct || p >= 1) return null;
          const sx = (c.x - x) * s + 960, sy = (c.y - y) * s + 540;
          return <div key={ct} style={{ position: "absolute", left: sx - 26, top: sy - 26, width: 52, height: 52, borderRadius: 99, border: `2px solid ${C.text}`, opacity: 0.7 * (1 - p), transform: `scale(${0.4 + p * 0.9})` }} />;
        })}
      {c && <Cursor x={(c.x - x) * s + 960} y={(c.y - y) * s + 540} a={c.visible} press={press} />}
      {keys.map((k) => <Keycap key={k.t} keys={k.keys} t={t} start={k.t} end={k.end} />)}
      {screen?.(t)}
      {clicks.map((ct) => (
        <Sequence key={"snd" + ct} from={Math.round(ct * 30) - 1} durationInFrames={8}>
          <Audio src={staticFile("audio/click.wav")} volume={0.32} />
        </Sequence>
      ))}
    </Fill>
  );
};
