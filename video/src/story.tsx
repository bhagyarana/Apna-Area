import React from "react";
import { interpolate, random } from "remotion";
import { ANTON, C, Fill, HANKEN, Stage, easeInOut, easeOut, enter, prog, useT } from "./lib";

const Big: React.FC<{ children: React.ReactNode; size?: number; style?: React.CSSProperties }> = ({ children, size = 120, style }) => (
  <div style={{ fontFamily: ANTON, fontSize: size, lineHeight: 1.02, letterSpacing: "0.01em", textTransform: "uppercase", ...style }}>{children}</div>
);

/** The film's one motif: a thin pink stroke that draws itself. */
const PinkLine: React.FC<{ p: number; width: number; style?: React.CSSProperties }> = ({ p, width, style }) => (
  <div style={{ height: 4, width: width * p, background: C.pink, borderRadius: 4, boxShadow: `0 0 18px ${C.pink}66`, ...style }} />
);

// 1. Hook
export const Hook: React.FC = () => {
  const t = useT();
  const n = Math.round(interpolate(t, [0.3, 2.0], [30, 14], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeOut }));
  const notif = prog(t, 2.6, 0.7);
  return (
    <Stage>
      <Fill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ ...enter(t, 0.2, 0.8), display: "flex", alignItems: "baseline", gap: 28 }}>
          <Big size={240} style={{ fontVariantNumeric: "tabular-nums" }}>{n}</Big>
          <Big size={120} style={{ color: C.muted }}>days</Big>
        </div>
        <PinkLine p={prog(t, 0.9, 1.0)} width={520} style={{ marginTop: 18 }} />
      </Fill>
      <div style={{ position: "absolute", top: 70, left: "50%", width: 600, marginLeft: -300, opacity: notif, transform: `translateY(${(1 - notif) * -30}px)`, background: "rgba(25,19,46,0.92)", border: `1px solid ${C.faint}`, borderRadius: 22, padding: "20px 24px", display: "flex", gap: 18, boxShadow: "0 24px 60px rgba(0,0,0,0.5)" }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: C.surface, border: `1px solid ${C.faint}`, display: "grid", placeItems: "center" }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={C.text} strokeWidth="1.8"><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="M3.5 6.5 12 13l8.5-6.5" /></svg>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 19, color: C.muted }}><span>Offer letter</span><span>now</span></div>
          <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>Welcome aboard, Ananya</div>
          <div style={{ fontSize: 20, color: C.muted, marginTop: 2 }}>Your first day is a Monday, at our Bellandur office.</div>
        </div>
      </div>
    </Stage>
  );
};

// 2. Frustration
const TABS = [
  "PG near Bellandur under 15k", "Is Silk Board really that bad?", "1 BHK rent Kadubeesanahalli", "Bengaluru traffic at 9 am",
  "How to talk to auto drivers", "Marathahalli vs HSR for freshers", "Learn Kannada in 7 days", "BMTC bus routes on ORR",
  "Brokerage free flats Bellandur", "Is Bengaluru safe for women alone", "Best area near ORR tech parks", "Monsoon flooding Bellandur",
  "Kannada phrases for beginners", "Average rent Marathahalli 2026", "Do auto drivers use the meter?", "Coliving vs PG pros and cons",
  "How long Bellandur to Sarjapur", "Darshini breakfast near me", "Namma Metro purple line ORR", "Bengaluru first week checklist",
];

export const Frustration: React.FC = () => {
  const t = useT();
  const tabsStart = 5.9;
  const count = Math.floor(interpolate(t, [tabsStart, 14.6], [1, 40], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: (x) => x * x * 0.6 + x * 0.4 }));
  const partA = 1 - prog(t, 5.6, 0.5);
  const freeze = prog(t, 15.6, 0.8);
  const chips: [string, boolean, number][] = [["Hindi", true, 2.6], ["English", true, 3.2], ["Kannada", false, 4.1]];
  return (
    <Stage>
      {partA > 0 && (
        <Fill style={{ opacity: partA, display: "flex", flexDirection: "column", justifyContent: "center", paddingLeft: 220 }}>
          <div style={enter(t, 0.2, 0.7)}><Big size={150}>Ananya, 24</Big></div>
          <div style={{ display: "flex", alignItems: "center", gap: 22, marginTop: 18, fontSize: 40, ...enter(t, 0.9, 0.6) }}>
            <span>Lucknow</span>
            <PinkLine p={prog(t, 1.3, 0.9)} width={140} />
            <span style={{ opacity: prog(t, 2.0, 0.4) }}>Bengaluru</span>
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 44 }}>
            {chips.map(([label, ok, at]) => (
              <div key={label} style={{ ...enter(t, at, 0.45, 10), padding: "14px 26px", borderRadius: 999, fontSize: 30, fontWeight: 600, border: `1.5px solid ${ok ? C.faint : C.pink}`, color: ok ? C.text : C.pink, background: ok ? C.surface : "transparent" }}>
                {label} {ok ? "✓" : "✕"}
              </div>
            ))}
          </div>
        </Fill>
      )}
      {t > tabsStart && (
        <Fill style={{ filter: `blur(${freeze * 3}px)`, opacity: 1 - freeze * 0.55 }}>
          {Array.from({ length: count }).map((_, i) => {
            const at = tabsStart + (i / 40) * 9.6;
            const p = prog(t, at, 0.35);
            const col = i % 5, row = Math.floor(i / 5);
            const x = 110 + col * 345 + (random(`x${i}`) - 0.5) * 120;
            const y = 120 + row * 108 + (random(`y${i}`) - 0.5) * 60;
            const r = (random(`r${i}`) - 0.5) * 6;
            return (
              <div key={i} style={{ position: "absolute", left: x, top: y, opacity: p, transform: `translateY(${(1 - p) * 16}px) rotate(${r}deg)`, display: "flex", alignItems: "center", gap: 12, width: 360, padding: "16px 20px", borderRadius: "14px 14px 6px 6px", background: C.surface, border: `1px solid ${C.faint}`, fontSize: 21, boxShadow: "0 14px 36px rgba(0,0,0,0.45)" }}>
                <div style={{ width: 14, height: 14, borderRadius: 4, background: i % 3 === 0 ? C.yellow : C.faint, flexShrink: 0 }} />
                <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{TABS[i % TABS.length]}</span>
              </div>
            );
          })}
        </Fill>
      )}
      {t > tabsStart && (
        <div style={{ position: "absolute", right: 90, bottom: 150, fontFamily: ANTON, fontSize: 64, opacity: prog(t, tabsStart + 0.5, 0.5), fontVariantNumeric: "tabular-nums" }}>
          {count} <span style={{ color: C.muted, fontSize: 40 }}>{count === 1 ? "TAB OPEN" : "TABS OPEN"}</span>
        </div>
      )}
    </Stage>
  );
};

// 3. Blind spot. Real Routes API numbers from the Survival Kit for RMZ Ecoworld (BMTC, Monday 09:00 IST).
export const BlindSpot: React.FC = () => {
  const t = useT();
  const diag = 1 - prog(t, 9.0, 0.6);
  const office = { x: 1150, y: 560 };
  const areas = [
    { name: "Devarabisanahalli", mins: "21", x: 820, y: 360, at: 4.9, color: C.teal, path: "M820 360 C 930 380, 1040 470, 1150 560" },
    { name: "Bellandur", mins: "45", x: 560, y: 760, at: 7.0, color: C.pink, path: "M560 760 C 700 840, 820 700, 900 690 S 1080 640, 1150 560" },
  ];
  return (
    <Stage>
      {diag > 0 && (
        <Fill style={{ opacity: diag }}>
          <svg width="1920" height="1080" style={{ position: "absolute" }}>
            {areas.map((a) => {
              const p = prog(t, a.at - 0.4, 1.2, easeInOut);
              return <path key={a.name} d={a.path} fill="none" stroke={a.color} strokeWidth={5} strokeLinecap="round" pathLength={1} strokeDasharray="1" strokeDashoffset={1 - p} style={{ filter: `drop-shadow(0 0 8px ${a.color}88)` }} />;
            })}
          </svg>
          <div style={{ position: "absolute", left: office.x - 14, top: office.y - 14, width: 28, height: 28, borderRadius: 99, background: C.yellow, boxShadow: `0 0 0 8px ${C.yellow}33`, ...enter(t, 0.4, 0.6, 0) }} />
          <div style={{ position: "absolute", left: office.x + 30, top: office.y - 22, fontSize: 30, fontWeight: 700, ...enter(t, 0.6, 0.6, 8) }}>Her office</div>
          <div style={{ position: "absolute", left: office.x + 30, top: office.y + 16, fontSize: 22, color: C.muted, ...enter(t, 0.8, 0.6, 8) }}>Same office, every day</div>
          {areas.map((a) => (
            <React.Fragment key={a.name}>
              <div style={{ position: "absolute", left: a.x - 10, top: a.y - 10, width: 20, height: 20, borderRadius: 99, background: a.color, ...enter(t, a.at - 1.2, 0.5, 0) }} />
              <div style={{ position: "absolute", left: a.x - 360, top: a.y - 62, width: 330, textAlign: "right", ...enter(t, a.at, 0.6, 12) }}>
                <div style={{ fontFamily: ANTON, fontSize: 92, color: a.color, lineHeight: 1 }}>{a.mins} MIN</div>
                <div style={{ fontSize: 24, color: C.muted, marginTop: 6 }}>{a.name}</div>
              </div>
            </React.Fragment>
          ))}
          <div style={{ position: "absolute", left: 0, right: 0, top: 940, textAlign: "center", fontSize: 21, color: C.muted, ...enter(t, 5.5, 0.6, 6) }}>
            BMTC bus · Monday 09:00 IST · Google Routes API
          </div>
        </Fill>
      )}
      {t > 9.2 && (
        <Fill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
          <div style={enter(t, 9.4, 0.8)}><Big size={104}>The first week decides</Big></div>
          <div style={enter(t, 10.2, 0.8)}><Big size={104}>how a city <span style={{ color: C.pink }}>feels.</span></Big></div>
          <div style={{ fontSize: 34, color: C.muted, marginTop: 36, ...enter(t, 13.6, 0.7) }}>One awkward auto ride is enough.</div>
        </Fill>
      )}
    </Stage>
  );
};

// 4. What if
export const WhatIf: React.FC = () => {
  const t = useT();
  const words = "What if she could play her first week,".split(" ");
  const words2 = "before she lives it?".split(" ");
  return (
    <Stage>
      <Fill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
        <Big size={96}>{words.map((w, i) => <span key={i} style={{ display: "inline-block", marginRight: 26, ...enter(t, 0.4 + i * 0.2, 0.5, 14) }}>{w}</span>)}</Big>
        <Big size={96} style={{ color: C.pink, marginTop: 8 }}>{words2.map((w, i) => <span key={i} style={{ display: "inline-block", marginRight: 26, ...enter(t, 2.2 + i * 0.2, 0.5, 14) }}>{w}</span>)}</Big>
      </Fill>
    </Stage>
  );
};

// 5a. Reveal: the pink line draws the corridor, then becomes the wordmark underline.
const ORR = "M1340 150 C 1330 260, 1300 360, 1250 450 C 1200 540, 1130 600, 1040 640 C 940 690, 860 700, 780 690 C 700 680, 650 700, 600 740";
export const Reveal: React.FC = () => {
  const t = useT();
  const draw = prog(t, 0.1, 1.3, easeInOut);
  const fadeLine = prog(t, 1.4, 0.5);
  const word = prog(t, 1.35, 0.9);
  return (
    <Stage>
      <svg width="1920" height="1080" style={{ position: "absolute", opacity: 1 - fadeLine }}>
        <path d={ORR} fill="none" stroke={C.pink} strokeWidth={6} strokeLinecap="round" pathLength={1} strokeDasharray="1" strokeDashoffset={1 - draw} style={{ filter: `drop-shadow(0 0 14px ${C.pink})` }} />
      </svg>
      <Fill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <Big size={190} style={{ opacity: word, letterSpacing: `${0.08 - word * 0.06}em`, transform: `scale(${0.96 + word * 0.04})` }}>Apna Area</Big>
        <PinkLine p={prog(t, 1.7, 0.9)} width={640} style={{ marginTop: 10 }} />
        <div style={{ fontSize: 36, color: C.muted, marginTop: 30, ...enter(t, 2.4, 0.7) }}>Play your first week before it happens.</div>
      </Fill>
    </Stage>
  );
};

// 5b. How it works
const Icon: React.FC<{ kind: string; color: string }> = ({ kind, color }) => {
  const p = { fill: "none", stroke: color, strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg width="44" height="44" viewBox="0 0 24 24">
      {kind === "pin" && <><path {...p} d="M12 21s-6.5-6.1-6.5-11a6.5 6.5 0 0 1 13 0c0 4.9-6.5 11-6.5 11z" /><circle {...p} cx="12" cy="10" r="2.3" /></>}
      {kind === "plan" && <><circle {...p} cx="5" cy="6" r="1.6" /><circle {...p} cx="5" cy="12" r="1.6" /><circle {...p} cx="5" cy="18" r="1.6" /><path {...p} d="M10 6h10M10 12h10M10 18h7" /></>}
      {kind === "mic" && <><rect {...p} x="9" y="3" width="6" height="11" rx="3" /><path {...p} d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" /></>}
      {kind === "kit" && <><rect {...p} x="4" y="4" width="16" height="16" rx="3" /><path {...p} d="M8 12l3 3 5-6" /></>}
    </svg>
  );
};
const NODES = [
  { icon: "pin", title: "Pick your office", sub: ["Maps JS · Places API (New)", "121 verified places"], at: 0.3 },
  { icon: "plan", title: "Plan 5 real stops", sub: ["Gemini 4 Neon", "place_id verifier on the server"], at: 3.5 },
  { icon: "mic", title: "Talk it out loud", sub: ["Gemini 3.8 Live voice", "Gemini Decision 1 scoring"], at: 10.7 },
  { icon: "kit", title: "Survival kit", sub: ["Routes API commutes", "Gemini 3.8 Flash TTS"], at: 16.1 },
];
export const HowItWorks: React.FC = () => {
  const t = useT();
  const xs = [300, 740, 1180, 1620];
  const lineP = (i: number) => prog(t, NODES[i].at - 0.2, 0.8, easeInOut);
  return (
    <Stage>
      <div style={{ position: "absolute", top: 150, width: "100%", textAlign: "center", fontSize: 24, letterSpacing: "0.22em", color: C.muted, ...enter(t, 0, 0.6) }}>HOW IT WORKS</div>
      <svg width="1920" height="1080" style={{ position: "absolute" }}>
        <line x1={xs[0]} y1={470} x2={xs[3]} y2={470} stroke={C.faint} strokeWidth={2} />
        {[1, 2, 3].map((i) => (
          <line key={i} x1={xs[i - 1]} y1={470} x2={xs[i - 1] + (xs[i] - xs[i - 1]) * lineP(i)} y2={470} stroke={C.pink} strokeWidth={4} strokeLinecap="round" style={{ filter: `drop-shadow(0 0 8px ${C.pink}88)` }} />
        ))}
      </svg>
      {NODES.map((n, i) => {
        const on = prog(t, n.at, 0.5);
        const color = on > 0.5 ? C.text : C.muted;
        return (
          <div key={n.title} style={{ position: "absolute", left: xs[i] - 190, width: 380, top: 420, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", opacity: 0.28 + on * 0.72 }}>
            <div style={{ width: 100, height: 100, borderRadius: 99, background: C.surface, border: `2px solid ${on > 0.5 ? C.pink : C.faint}`, display: "grid", placeItems: "center", transform: `scale(${1 + on * 0.06 - prog(t, n.at + 0.5, 0.4) * 0.06})` }}>
              <Icon kind={n.icon} color={color} />
            </div>
            <div style={{ fontFamily: ANTON, fontSize: 46, marginTop: 30, textTransform: "uppercase" }}>{n.title}</div>
            {n.sub.map((s, j) => (
              <div key={s} style={{ fontSize: 23, color: C.muted, marginTop: j ? 4 : 12, ...enter(t, n.at + 0.3 + j * 0.15, 0.5, 6) }}>{s}</div>
            ))}
          </div>
        );
      })}
      <div style={{ position: "absolute", bottom: 160, width: "100%", textAlign: "center", fontSize: 21, color: C.muted, ...enter(t, 17.5, 0.8, 6) }}>
        Soundtrack by Lyria 3 · Character portraits by Nano Banana · Runs on Cloud Run
      </div>
    </Stage>
  );
};

// 8. Recap
export const Recap: React.FC = () => {
  const t = useT();
  const lines: [string, number][] = [["Real places.", 0.5], ["Real conversations.", 1.7], ["A real plan for Monday.", 3.3]];
  return (
    <Stage>
      <Fill style={{ display: "flex", flexDirection: "column", justifyContent: "center", paddingLeft: 360, gap: 26 }}>
        {lines.map(([l, at]) => (
          <div key={l} style={{ display: "flex", alignItems: "center", gap: 34, ...enter(t, at, 0.6, 16) }}>
            <PinkLine p={prog(t, at, 0.6)} width={70} />
            <Big size={110}>{l}</Big>
          </div>
        ))}
      </Fill>
    </Stage>
  );
};

// 9. Final line + logo
export const Final: React.FC = () => {
  const t = useT();
  const lineOut = prog(t, 5.6, 0.6);
  const logo = prog(t, 6.1, 0.9);
  const out = prog(t, 9.6, 0.9);
  return (
    <Stage>
      <Fill style={{ opacity: 1 - lineOut, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
        <div style={{ fontSize: 58, fontWeight: 500, color: C.muted, ...enter(t, 0.5, 0.8) }}>Ananya hasn't moved yet.</div>
        <div style={{ fontSize: 72, fontWeight: 700, marginTop: 18, ...enter(t, 2.3, 0.9) }}>But she's already lived her <span style={{ color: C.pink }}>first week.</span></div>
      </Fill>
      <Fill style={{ opacity: logo * (1 - out), display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <Big size={150}>Apna Area</Big>
        <PinkLine p={prog(t, 6.4, 0.9)} width={500} style={{ marginTop: 8 }} />
        <div style={{ fontSize: 30, color: C.muted, marginTop: 34 }}>Play your first week before it happens.</div>
        <div style={{ fontSize: 24, color: C.text, marginTop: 40, padding: "12px 26px", borderRadius: 999, border: `1px solid ${C.faint}`, opacity: prog(t, 7.0, 0.6) }}>
          apna-area-481049877093.asia-south1.run.app
        </div>
      </Fill>
    </Stage>
  );
};

export { HANKEN };
