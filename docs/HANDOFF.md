# Session Handoff (`docs/HANDOFF.md`)

## 1. Now
- **Current phase:** `phase/p8-3d-dusk` (preview shipped, awaiting human sign-off)
- **Current production tag (`main`, untouched):** `p7-submission` (`ffe7093`)
- **Live URL & revision (`100%` traffic locked):** `https://apna-area-481049877093.asia-south1.run.app` (`apna-area-00019-foc`)
- **Phase 8 preview URL & revision (`0%` live traffic, tag `p8-3d`):** `https://p8-3d---apna-area-qhtgwpzhpq-el.a.run.app` (`apna-area-00021-ret`, built from `0bc07a1`)

## 2. Done This Session
- Implemented `T8.1`..`T8.4` on `phase/p8-3d-dusk` (`0bc07a1`):
  - `shared/src/config.ts`, `shared/src/types.ts`, `web/vite.config.ts`, `web/src/state/sessionStore.ts`, `web/src/hud/TopbarChrome.tsx`: added `MAP_3D_CONFIG` + `enable3dDusk: true`, isolated `three` into lazy `vendor-three` (`129.4 KB` gzip, keeping initial 2D JS at `192.6 KB` gzip `< 200 KB`), gated auto-default on hardware desktop WebGL2, and added the `40px` `3D` topbar toggle pill.
  - `web/src/map/OrrMap.tsx`, `web/src/map/CameraDirector3D.tsx`, `web/src/styles/map3d.css`, `web/src/main.tsx`: wired `RenderingType.VECTOR`, 3-stage parabolic Sky-Drop swoop (`12.6/0` -> `15.2/38` -> `17.4/65`), `1.2 deg/s` voice street orbit, `Q`/`E` camera rotation, and `22vh` twilight horizon scrim.
  - `web/src/map/OrrWebGlLayer.ts`, `web/src/map/orrTrafficGeometry.ts`, `web/src/map/__tests__/orrTrafficGeometry.test.ts`: built lazy `WebGLOverlayView` + Three.js cylindrical light pillars and `545`-point bi-directional ORR traffic streaks with full disposal.
  - `web/src/map/RadarMinimap.tsx`, `e2e/map-3d.spec.ts`: shipped `136x136px` heading-locked corner radar (`bottom: 36px; left: 24px` above Google attribution), passed `17/17` Vitest suites (`61/61` tests), `8/8` Playwright E2E specs, Code Review (`95/100` + all 5 polish items fixed), Screenshot Critic (`9.2/10`), and live hardware-GPU smoke test on `apna-area-00021-ret`.

## 3. Decisions Made
- **ADR-020 (`docs/DECISIONS.md`):** Shipped Route A (`RenderingType.VECTOR` + lazy `WebGLOverlayView` Three.js + `RadarMinimap`) strictly to `--no-traffic --tag p8-3d` preview revision `apna-area-00021-ret`.

## 4. Open Questions
- Waiting on human review of `https://p8-3d---apna-area-qhtgwpzhpq-el.a.run.app` before deciding whether to `--no-ff` merge `phase/p8-3d-dusk` to `main` and shift traffic.

## 5. Known Issues
- None; all `.ts/.tsx/.css` files are `<= 250` lines with zero em dashes and `0` console errors.

## 6. File State
- Clean working tree on `phase/p8-3d-dusk` synced with `origin/phase/p8-3d-dusk`.

## 7. The Single Next Task
- Human tries `https://p8-3d---apna-area-qhtgwpzhpq-el.a.run.app` on desktop and either approves `--no-ff` merge + traffic promotion to `p8-3d` or keeps `main` locked at `p7-submission` (`apna-area-00019-foc`).

## 8. Resume Checklist
1. `AGENTS.md`
2. `PROJECT_BRIEF.md`
3. `docs/HANDOFF.md`
4. `docs/TASKS.md` (`Phase 8`)
5. `Design.md` (`Section 4.6`)
6. `web/src/map/OrrMap.tsx`, `web/src/map/CameraDirector3D.tsx`, `web/src/map/OrrWebGlLayer.ts`, `web/src/map/RadarMinimap.tsx`
