# Session Handoff (`docs/HANDOFF.md`)

## 1. Now
- **Current phase:** Complete (`main` shipped through Phase 8)
- **Current production tag:** `p8-3d-dusk` (`653c759`, preceded by `p7-submission` `ffe7093`)
- **Live URL & revision:** `https://apna-area-481049877093.asia-south1.run.app` (`100%` live traffic on `apna-area-00021-ret`, tag `p8-3d`; previous revision `apna-area-00019-foc` retained at `0%` for instant rollback)

## 2. Done This Session
- Implemented Phase 8 (`T8.1`..`T8.4`: `0bc07a1`, docs `9d6b103`, merge `653c759`):
  - `shared/src/config.ts`, `shared/src/types.ts`, `web/vite.config.ts`, `web/src/state/sessionStore.ts`, `web/src/hud/TopbarChrome.tsx`: added `MAP_3D_CONFIG` + `enable3dDusk: true`, isolated `three` in lazy `vendor-three` (`129.4 KB` gzip, keeping initial 2D JS at `192.6 KB` gzip `< 200 KB`), gated auto-default on hardware desktop WebGL2, and added the `40px` `3D` topbar toggle pill.
  - `web/src/map/OrrMap.tsx`, `web/src/map/CameraDirector3D.tsx`, `web/src/styles/map3d.css`, `web/src/main.tsx`: wired `RenderingType.VECTOR`, 3-stage parabolic Sky-Drop swoop (`12.6/0` -> `15.2/38` -> `17.4/65`), `1.2 deg/s` voice street orbit, `Q`/`E` camera rotation, and `22vh` twilight horizon scrim.
  - `web/src/map/OrrWebGlLayer.ts`, `web/src/map/orrTrafficGeometry.ts`, `web/src/map/__tests__/orrTrafficGeometry.test.ts`: built lazy `WebGLOverlayView` + Three.js light pillars and `545`-point bi-directional ORR traffic streaks with full disposal.
  - `web/src/map/RadarMinimap.tsx`, `e2e/map-3d.spec.ts`, `README.md`, `docs/ARCHITECTURE_OVERVIEW.md`, `docs/VIDEO_COVERAGE.md`: shipped `136x136px` heading-locked `RadarMinimap` (`bottom: 36px; left: 24px`), passed `17/17` Vitest suites (`61/61` tests), `8/8` Playwright E2E specs, `0` secret findings, `--no-ff` merged to `main`, tagged `p8-3d-dusk`, promoted `100%` Cloud Run traffic to `apna-area-00021-ret`, and passed live production smoke tests (`637ms`).

## 3. Decisions Made
- **ADR-020 (`docs/DECISIONS.md`):** Promoted Route A (`RenderingType.VECTOR` + lazy `WebGLOverlayView` Three.js + `RadarMinimap`) to `main` (`p8-3d-dusk`, `apna-area-00021-ret` serving `100%` traffic).

## 4. Open Questions
- None; submission-ready on `main`.

## 5. Known Issues
- None; every `.ts/.tsx/.css` file is `<= 250` lines with zero em dashes and `0` console errors.

## 6. File State
- Clean working tree on `main` synced with `origin/main`.

## 7. The Single Next Task
- Submit the Kaggle Writeup with the live Cloud Run URL (`https://apna-area-481049877093.asia-south1.run.app`), public GitHub repo (`https://github.com/bhagyarana/Apna-Area`), YouTube demo video, and media gallery screenshots; export all hackathon repo/video/assets before temporary account expiry.

## 8. Resume Checklist
1. `AGENTS.md`
2. `PROJECT_BRIEF.md`
3. `docs/HANDOFF.md`
4. `README.md` & `docs/ARCHITECTURE_OVERVIEW.md`
5. `docs/VIDEO_COVERAGE.md` & `docs/DEMO.md`
