import React, { useMemo } from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, interpolate } from "remotion";
import durations from "../public/vo/durations.json";
import lines from "../scripts/vo-lines.json";
import { C, HANKEN, prog, useT } from "./lib";
import { Hook, Frustration, BlindSpot, WhatIf, Reveal, HowItWorks, Recap, Final } from "./story";
import { TourTune, Office, Director, Voice, Aha, Score, Kit, Confirm } from "./product";

export const FPS = 30;
const XF = 0.5; // crossfade overlap between scenes, seconds
const D = durations as Record<string, number>;
const TEXT = Object.fromEntries(lines as [string, string][]);

type Extra = { id: string; at: number; dur: number; vol: number; duck: boolean };
type SceneDef = { id: string; dur: number; C: React.FC; vo: [string, number][]; sfx?: Extra[]; caps?: [number, number, string][] };

const SCENES: SceneDef[] = [
  { id: "hook", dur: 6.0, C: Hook, vo: [["hook", 0.8]] },
  { id: "frus", dur: 17.2, C: Frustration, vo: [["frus1", 0.3], ["frus2", 5.8]] },
  { id: "blind", dur: 18.5, C: BlindSpot, vo: [["blind1", 0.3], ["blind2", 9.0]] },
  { id: "whatif", dur: 5.0, C: WhatIf, vo: [["whatif", 0.4]] },
  { id: "reveal", dur: 4.6, C: Reveal, vo: [["reveal", 1.9]], sfx: [{ id: "whoosh.wav", at: 0, dur: 1.8, vol: 0.35, duck: false }] },
  { id: "how", dur: 20.6, C: HowItWorks, vo: [["how1", 0.3], ["how2", 3.5], ["how3", 10.7], ["how4", 16.1]] },
  { id: "tour", dur: 10.8, C: TourTune, vo: [["tour", 0.5]] },
  { id: "office", dur: 7.6, C: Office, vo: [["office", 0.3]] },
  { id: "director", dur: 15.2, C: Director, vo: [["dir1", 0.3], ["dir2", 10.0]] },
  { id: "voice", dur: 14.0, C: Voice, vo: [["voice", 0.3]] },
  {
    id: "aha", dur: 8.0, C: Aha, vo: [["aha", 5.1]],
    sfx: [{ id: "chime.wav", at: 2.3, dur: 1.6, vol: 0.5, duck: false }],
    caps: [[0.5, 2.6, "Ananya: “Aṇṇa, dayaviṭṭu mīṭar hāki banni.”"]],
  },
  { id: "score", dur: 14.8, C: Score, vo: [["score1", 0.3], ["score2", 7.7]] },
  {
    id: "kit", dur: 15.6, C: Kit, vo: [["kit", 0.3]],
    sfx: [{ id: "tts-meter.wav", at: 11.9, dur: 3.37, vol: 0.62, duck: true }],
    caps: [[11.9, 15.3, "Gemini 3.8 Flash TTS: ಅಣ್ಣ, ದಯವಿಟ್ಟು ಮೀಟರ್ ಹಾಕಿ ಬನ್ನಿ."]],
  },
  { id: "confirm", dur: 5.0, C: Confirm, vo: [["confirm", 0.3]] },
  { id: "recap", dur: 6.8, C: Recap, vo: [["recap", 0.4]] },
  { id: "final", dur: 10.6, C: Final, vo: [["final", 0.5]] },
];

const starts: number[] = [];
SCENES.forEach((s, i) => starts.push(i === 0 ? 0 : starts[i - 1] + SCENES[i - 1].dur - XF));
export const TOTAL = starts[starts.length - 1] + SCENES[SCENES.length - 1].dur;
const S = (id: string) => starts[SCENES.findIndex((s) => s.id === id)];

const CAP_FIX: [RegExp, string][] = [
  [/R M Z/g, "RMZ"], [/place I D/g, "place ID"], [/Decision One/g, "Decision 1"], [/twenty four/g, "24"],
  [/twenty one minutes\. Or forty five\./g, "21 minutes. Or 45."], [/at nine, and six thirty/g, "at 9:00 and 18:30"], [/forty open tabs/g, "40 open tabs"],
];

type Cap = { a: number; b: number; text: string };
const buildCaptions = (): Cap[] => {
  const caps: Cap[] = [];
  SCENES.forEach((s, i) => {
    for (const [id, at] of s.vo) {
      let text = TEXT[id];
      for (const [re, rep] of CAP_FIX) text = text.replace(re, rep);
      const chunks = text.split(/(?<=[.?!])\s+/).flatMap((c) => (c.length > 72 ? c.split(/(?<=,)\s+/) : [c]));
      const merged: string[] = [];
      for (const c of chunks) {
        if (merged.length && (merged[merged.length - 1] + " " + c).length <= 60) merged[merged.length - 1] += " " + c;
        else merged.push(c);
      }
      const weights = merged.map((c) => c.length + 8);
      const total = weights.reduce((a, b) => a + b, 0);
      let t = starts[i] + at;
      merged.forEach((c, k) => {
        const len = (D[id] * weights[k]) / total;
        caps.push({ a: t, b: t + len, text: c });
        t += len;
      });
    }
    for (const [a, b, text] of s.caps ?? []) caps.push({ a: starts[i] + a, b: starts[i] + b, text });
  });
  return caps;
};

const Captions: React.FC<{ caps: Cap[] }> = ({ caps }) => {
  const t = useT();
  const cur = caps.find((c) => t >= c.a && t < c.b + 0.15);
  if (!cur) return null;
  const a = prog(t, cur.a, 0.15) * (1 - prog(t, cur.b, 0.15));
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 52, display: "flex", justifyContent: "center", opacity: a }}>
      <div style={{ maxWidth: 1240, padding: "10px 22px", borderRadius: 12, background: "rgba(7,5,15,0.62)", color: C.text, fontFamily: `${HANKEN}, "Nirmala UI", sans-serif`, fontSize: 30, fontWeight: 500, lineHeight: 1.3, textAlign: "center" }}>
        {cur.text}
      </div>
    </div>
  );
};

// Music bed: Apna Area's own Lyria 3 loops, ducked under narration with gentle swells.
const useMusicGain = () =>
  useMemo(() => {
    const n = Math.ceil(TOTAL * FPS);
    const voice: [number, number][] = [];
    SCENES.forEach((s, i) => {
      s.vo.forEach(([id, at]) => voice.push([starts[i] + at, starts[i] + at + D[id]]));
      s.sfx?.filter((x) => x.duck).forEach((x) => voice.push([starts[i] + x.at, starts[i] + x.at + x.dur]));
    });
    const target = new Array<number>(n);
    for (let f = 0; f < n; f++) {
      const t = f / FPS;
      const speaking = voice.some(([a, b]) => t >= a - 0.15 && t <= b + 0.1);
      let g = speaking ? 0.12 : 0.33;
      if (t >= S("voice") + 4.5 && t < S("aha") + 2.2) g = 0.04; // the app ducks its own music for the voice scene
      if (t >= S("aha") + 2.2 && t < S("aha") + 5.0) g = 0.38; // swell on the aha
      if (t >= S("reveal") && t < S("reveal") + 1.8) g = 0.45; // swell on the logo
      if (t >= S("final") + 5.4) g = 0.38;
      target[f] = g;
    }
    const out = new Array<number>(n);
    const W = 12;
    for (let f = 0; f < n; f++) {
      let s = 0, c = 0;
      for (let k = Math.max(0, f - W); k <= Math.min(n - 1, f + W); k++) { s += target[k]; c++; }
      out[f] = s / c;
    }
    return out;
  }, []);

const MusicBed: React.FC = () => {
  const gain = useMusicGain();
  const revealF = Math.round(S("reveal") * FPS);
  const total = Math.round(TOTAL * FPS);
  const fadeIn = (f: number) => interpolate(f, [0, 45], [0, 1], { extrapolateRight: "clamp" });
  const fadeOut = (f: number) => interpolate(f, [total - 75, total - 5], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <>
      <Sequence durationInFrames={revealF + 20}>
        <Audio loop src={staticFile("audio/calm.mp3")} volume={(f) => gain[Math.min(gain.length - 1, Math.max(0, Math.round(f)))] * fadeIn(f) * interpolate(f, [revealF - 15, revealF + 20], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} />
      </Sequence>
      <Sequence from={revealF - 15}>
        <Audio loop src={staticFile("audio/evening.mp3")} volume={(f) => gain[Math.min(gain.length - 1, Math.max(0, Math.round(f + revealF - 15)))] * interpolate(f, [0, 35], [0, 1], { extrapolateRight: "clamp" }) * fadeOut(f + revealF - 15)} />
      </Sequence>
    </>
  );
};

const SceneWrap: React.FC<{ children: React.ReactNode; first: boolean }> = ({ children, first }) => {
  const t = useT();
  return <AbsoluteFill style={{ opacity: first ? prog(t, 0, 0.6) : prog(t, 0, XF) }}>{children}</AbsoluteFill>;
};

export const Demo: React.FC = () => {
  const caps = useMemo(buildCaptions, []);
  useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {SCENES.map((s, i) => (
        <Sequence key={s.id} from={Math.round(starts[i] * FPS)} durationInFrames={Math.round(s.dur * FPS)} name={s.id}>
          <SceneWrap first={i === 0}>
            <s.C />
          </SceneWrap>
        </Sequence>
      ))}
      <Captions caps={caps} />
      {SCENES.flatMap((s, i) =>
        s.vo.map(([id, at]) => (
          <Sequence key={id} from={Math.round((starts[i] + at) * FPS)} durationInFrames={Math.ceil((D[id] + 0.3) * FPS)} name={`vo:${id}`}>
            <Audio src={staticFile(`vo/${id}.wav`)} volume={1.4} />
          </Sequence>
        )),
      )}
      {SCENES.flatMap((s, i) =>
        (s.sfx ?? []).map((x) => (
          <Sequence key={s.id + x.id} from={Math.round((starts[i] + x.at) * FPS)} durationInFrames={Math.ceil((x.dur + 0.2) * FPS)} name={`sfx:${x.id}`}>
            <Audio src={staticFile(`audio/${x.id}`)} volume={x.vol} />
          </Sequence>
        )),
      )}
      <MusicBed />
    </AbsoluteFill>
  );
};
