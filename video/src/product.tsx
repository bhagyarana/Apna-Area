import React from "react";
import { C, HANKEN, easeOut, easeInOut, prog } from "./lib";
import { UIScene, ctr, B, clipLen } from "./ui";

// Scene 6: dusk tour, Live pill, Tune popover.
export const TourTune: React.FC = () => {
  const live = ctr("health-dot", -6), tune = ctr("tune-trigger"), room = ctr("tune-room"), hien = ctr("tune-hien");
  return (
    <UIScene
      frames={[
        { t: 0, clip: "tour", from: 0.8 },
        { t: 4.6, src: "01-landing" },
        { t: 5.75, src: "02-live-hover" },
        { t: 7.2, src: "03-tune-open" },
        { t: 8.05, src: "04-tune-set" },
        { t: 9.75, src: "05-tune-closed" },
      ]}
      cam={[{ t: 5.0, s: 1.55, x: 1640, y: 260, d: 1.1 }, { t: 9.7, s: 1, d: 0.9 }]}
      cur={[
        { t: 4.7, x: 1400, y: 640, d: 0.01 },
        { t: 4.8, x: live.x, y: live.y, d: 0.85 },
        { t: 6.5, x: tune.x, y: tune.y, d: 0.5, click: true },
        { t: 7.5, x: room.x, y: room.y, d: 0.45, click: true },
        { t: 8.3, x: hien.x, y: hien.y, d: 0.45, click: true },
      ]}
      keys={[{ t: 9.35, end: 10.3, keys: ["Esc"] }]}
    />
  );
};

// Scene 7: 3D toggle, Ctrl+K office picker, Sky-Drop.
export const Office: React.FC = () => {
  const t3d = ctr("map-3d-toggle"), tune = ctr("tune-trigger"), combo = ctr("office-combobox-input");
  return (
    <UIScene
      frames={[
        { t: 0, src: "05-tune-closed" },
        { t: 0.75, src: "06-3d-on" },
        { t: 1.75, src: "07-combobox" },
        { t: 2.75, clip: "skydrop", from: 0 },
        { t: 6.6, src: "08-office-picked" },
      ]}
      cam={[{ t: 1.1, s: 1.5, x: combo.x + 260, y: combo.y + 120, d: 0.8 }, { t: 2.7, s: 1, d: 0.6 }]}
      cur={[{ t: 0, x: tune.x, y: tune.y, d: 0.01 }, { t: 0.1, x: t3d.x, y: t3d.y, d: 0.5, click: true }, { t: 1.0, x: t3d.x, y: t3d.y, hide: true }]}
      keys={[{ t: 1.0, end: 2.1, keys: ["Ctrl", "K"] }, { t: 2.3, end: 3.1, keys: ["Enter"] }]}
    />
  );
};

// Scene 8: Build my first week, SSE progress, 5 stops, place_id provenance, Q/E orbit.
export const Director: React.FC = () => {
  const cta = ctr("build-week-cta"), prov = ctr("mission-provenance");
  const dirLen = clipLen("director");
  const span = 8.0;
  return (
    <UIScene
      frames={[
        { t: 0, src: "08-office-picked" },
        { t: 0.85, clip: "director", from: 0, speed: Math.max(1, dirLen / span) },
        { t: 0.85 + span, src: "10-week-hub" },
        { t: 10.75, src: "11-provenance" },
        { t: 12.9, clip: "orbit", from: 0, speed: 1.2 },
      ]}
      cam={[
        { t: 1.0, s: 1.45, x: 420, y: 330, d: 1.0 },
        { t: 6.0, s: 1.0, d: 1.2 },
        { t: 10.0, s: 1.9, x: 360, y: 300, d: 0.9 },
        { t: 12.5, s: 1.0, d: 0.6 },
      ]}
      cur={[
        { t: 0, x: 900, y: 600, d: 0.01 },
        { t: 0.05, x: cta.x, y: cta.y, d: 0.55, click: true },
        { t: 1.2, x: cta.x + 40, y: cta.y + 160, d: 0.5, hide: true },
        { t: 9.7, x: prov.x + 80, y: prov.y + 160, d: 0.01 },
        { t: 9.75, x: prov.x, y: prov.y, d: 0.7, click: true },
        { t: 12.4, x: prov.x, y: prov.y, hide: true },
      ]}
      keys={[{ t: 13.1, end: 14.6, keys: ["E"] }]}
    />
  );
};

// Scene 9: Talk with Ramesh, live Hindi reply, Kannada coaching.
export const Voice: React.FC = () => {
  const start = ctr("start-mission-cta"), card = ctr("target-phrase-card");
  return (
    <UIScene
      frames={[
        { t: 0, src: "12-orbit" },
        { t: 3.75, src: "13-voice-open" },
        { t: 7.6, src: "14-voice-hindi-reply" },
      ]}
      cam={[
        { t: 0, s: 1.4, x: 330, y: 300, d: 1.4 },
        { t: 3.7, s: 1.0, d: 0.7 },
        { t: 4.8, s: 1.5, x: card.x, y: card.y - 110, d: 1.2 },
      ]}
      cur={[
        { t: 1.3, x: 700, y: 520, d: 0.01 },
        { t: 1.35, x: start.x, y: start.y, d: 0.9, click: true },
        { t: 3.9, x: start.x, y: start.y, hide: true },
      ]}
    />
  );
};

// Scene 10: the aha. Ananya says the Kannada line, it lands, it flies into her phrasebook.
export const Aha: React.FC = () => {
  const card = B("target-phrase-card"), pill = ctr("phrasebook-pill");
  const cc = ctr("target-phrase-card");
  return (
    <UIScene
      frames={[{ t: 0, src: "14-voice-hindi-reply" }, { t: 2.3, src: "15-voice-mastered" }]}
      cam={[{ t: 0, s: 2.05, x: cc.x, y: cc.y - 60, d: 0.01 }, { t: 0.05, s: 2.2, x: cc.x, y: cc.y - 50, d: 2.2 }, { t: 3.3, s: 1.0, d: 1.0 }]}
      world={(t) => {
        const ring = prog(t, 2.3, 0.8, easeOut);
        const fly = prog(t, 4.0, 0.85, easeInOut);
        const land = prog(t, 4.85, 0.5, easeOut);
        const x = cc.x + (pill.x - cc.x) * fly, y = cc.y + (pill.y - cc.y) * fly - Math.sin(fly * Math.PI) * 140;
        return (
          <>
            {t > 2.3 && ring < 1 && (
              <div style={{ position: "absolute", left: card.x - 4, top: card.y - 4, width: card.width + 8, height: card.height + 8, borderRadius: 14, border: `3px solid ${C.teal}`, opacity: 1 - ring, transform: `scale(${1 + ring * 0.05})`, boxShadow: `0 0 24px ${C.teal}` }} />
            )}
            {t > 4.0 && fly < 1 && (
              <div style={{ position: "absolute", left: x - 90, top: y - 20, width: 180, height: 40, borderRadius: 10, background: "#173B3D", border: `1.5px solid ${C.teal}`, color: C.teal, fontFamily: HANKEN, fontWeight: 700, fontSize: 15, display: "grid", placeItems: "center", transform: `scale(${1 - fly * 0.55})`, opacity: 1 - prog(t, 4.65, 0.2) }}>
                ಮೀಟರ್ ಹಾಕಿ ಬನ್ನಿ
              </div>
            )}
            {t > 4.85 && land < 1 && (
              <div style={{ position: "absolute", left: pill.x - 52, top: pill.y - 24, width: 104, height: 48, borderRadius: 99, border: `2px solid ${C.teal}`, opacity: 1 - land, transform: `scale(${1 + land * 0.35})` }} />
            )}
          </>
        );
      }}
    />
  );
};

// Scene 11: Decision 1 score, calibrated rubric, one-tap pace override.
export const Score: React.FC = () => {
  const why = ctr("why-changed-toggle"), gentle = ctr("override-gentle-btn");
  const rl = clipLen("result");
  return (
    <UIScene
      frames={[{ t: 0, clip: "result", from: Math.max(0, rl - 2.3) }, { t: 2.3, src: "16-result" }, { t: 4.35, src: "17-why" }, { t: 9.15, src: "18-gentle" }]}
      cam={[{ t: 0, s: 1.35, x: 330, y: 380, d: 1.4 }, { t: 4.3, s: 1.55, x: 300, y: 470, d: 0.9 }]}
      cur={[
        { t: 3.2, x: 640, y: 620, d: 0.01 },
        { t: 3.25, x: why.x, y: why.y, d: 0.8, click: true },
        { t: 8.3, x: gentle.x, y: gentle.y, d: 0.8, click: true },
      ]}
    />
  );
};

// Scene 12: Survival Kit. Commutes, checklist, then the real Sulafat TTS replay.
export const Kit: React.FC = () => {
  const open = ctr("result-open-kit-btn"), commute = ctr("kit-commute-card"), check = ctr("kit-check", -150, -12), play = ctr("play-phrase");
  return (
    <UIScene
      frames={[
        { t: 0, src: "18-gentle" },
        { t: 0.75, src: "19-kit" },
        { t: 7.7, src: "19-kit", patch: { src: "21-kit-checked", rect: [1165, 160, 420, 900] } },
        { t: 11.75, src: "21-kit-checked" },
      ]}
      cam={[
        { t: 2.0, s: 1.55, x: commute.x, y: 400, d: 1.1 },
        { t: 4.2, s: 1.55, x: commute.x, y: 760, d: 2.2 },
        { t: 6.3, s: 1.5, x: 1360, y: 420, d: 1.0 },
        { t: 8.8, s: 1.5, x: 980, y: 400, d: 1.0 },
        { t: 13.6, s: 1.0, d: 1.2 },
      ]}
      cur={[
        { t: 0, x: 600, y: 700, d: 0.01 },
        { t: 0.05, x: open.x, y: open.y, d: 0.55, click: true },
        { t: 0.9, x: open.x, y: open.y, hide: true },
        { t: 6.8, x: 1450, y: 560, d: 0.01 },
        { t: 6.9, x: check.x, y: check.y, d: 0.75, click: true },
        { t: 10.6, x: play.x, y: play.y, d: 1.0, click: true },
      ]}
    />
  );
};

// Scene 13: Directions opens a focus-trapped confirm sheet, Esc closes it.
export const Confirm: React.FC = () => {
  const maps = ctr("open-maps");
  return (
    <UIScene
      frames={[{ t: 0, src: "21-kit-checked" }, { t: 0.75, src: "22-confirm" }, { t: 3.05, src: "23-confirm-closed" }]}
      cam={[{ t: 0, s: 1.3, x: maps.x + 200, y: 420, d: 0.7 }, { t: 0.8, s: 1.45, x: 960, y: 540, d: 0.8 }, { t: 3.2, s: 1.0, d: 0.9 }]}
      cur={[{ t: 0, x: 1120, y: 320, d: 0.01 }, { t: 0.05, x: maps.x, y: maps.y, d: 0.6, click: true }, { t: 1.0, x: maps.x, y: maps.y, hide: true }]}
      keys={[{ t: 2.4, end: 3.5, keys: ["Esc"] }]}
    />
  );
};
