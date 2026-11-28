import React from "react";
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont as loadAnton } from "@remotion/google-fonts/Anton";
import { loadFont as loadHanken } from "@remotion/google-fonts/HankenGrotesk";

export const ANTON = loadAnton().fontFamily;
export const HANKEN = loadHanken("normal", { weights: ["400", "500", "600", "700"] }).fontFamily;

export const C = {
  deep: "#07050F",
  bg: "#0E0A1C",
  surface: "#19132E",
  text: "#F7F1FF",
  muted: "rgba(247,241,255,0.56)",
  faint: "rgba(247,241,255,0.14)",
  pink: "#FF4FA0",
  yellow: "#FFD24A",
  teal: "#3DE6D0",
};

export const easeOut = Easing.bezier(0.23, 1, 0.32, 1);
export const easeInOut = Easing.bezier(0.65, 0, 0.35, 1);

/** Seconds elapsed in the current sequence. */
export const useT = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return f / fps;
};

/** 0..1 eased progress of a move that starts at `start` and lasts `d` seconds. */
export const prog = (t: number, start: number, d: number, ease = easeOut) =>
  interpolate(t, [start, start + d], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });

/** Enter animation: opacity + translateY, ease-out. */
export const enter = (t: number, start: number, d = 0.6, dy = 18): React.CSSProperties => {
  const p = prog(t, start, d);
  return { opacity: p, transform: `translateY(${(1 - p) * dy}px)` };
};

export const Fill: React.FC<{ children?: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div style={{ position: "absolute", inset: 0, ...style }}>{children}</div>
);

/** Shared dark cinematic stage for story scenes. */
export const Stage: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <Fill style={{ background: `radial-gradient(120% 90% at 50% 45%, ${C.bg} 0%, ${C.deep} 70%)`, fontFamily: HANKEN, color: C.text }}>
    {children}
  </Fill>
);

export const Keycap: React.FC<{ keys: string[]; t: number; start: number; end: number }> = ({ keys, t, start, end }) => {
  const a = prog(t, start, 0.25) * (1 - prog(t, end - 0.25, 0.25));
  if (a <= 0) return null;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 150, display: "flex", justifyContent: "center", gap: 10, opacity: a, transform: `translateY(${(1 - a) * 10}px)` }}>
      {keys.map((k) => (
        <div key={k} style={{ minWidth: 64, padding: "12px 18px", borderRadius: 12, background: "rgba(247,241,255,0.94)", color: C.bg, fontFamily: HANKEN, fontWeight: 700, fontSize: 26, textAlign: "center", boxShadow: "0 3px 0 rgba(14,10,28,0.5), 0 12px 32px rgba(0,0,0,0.35)" }}>
          {k}
        </div>
      ))}
    </div>
  );
};
