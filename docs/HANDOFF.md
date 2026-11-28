# Session Handoff (`docs/HANDOFF.md`)

## 1. Now
- **Current phase:** `phase/p8-3d-dusk` (isolated stretch branch off `main` `913b066`)
- **Current production tag:** `p7-submission` (`ffe7093`, preceded by `p6-demo-ready` `3b50e21`)
- **Live URL & revision (`main`, DO NOT TOUCH traffic):** `https://apna-area-481049877093.asia-south1.run.app` (`100%` live traffic locked on `apna-area-00019-foc`)

## 2. Done This Session
- Shipped `p6-demo-ready` (`3b50e21`) and `p7-submission` (`ffe7093`, `apna-area-00019-foc`) with `16/16` Vitest suites (`57/57` tests), `7/7` Playwright E2E specs, `188.1 KB` gzipped initial JS, `9.4/10` Design Critic score, 3 live rehearsals (`0:41`, `0:40`, `0:48`), and `0` `gitleaks` findings.
- Probed live Bengaluru 3D capabilities on `geminisprints26blr-3880` (`12.9315, 77.6848`): verified `RenderingType.VECTOR` (`tilt: 62`, `heading: 35`) and `isWebGLOverlayViewAvailable: true` work natively on `DEMO_MAP_ID` + `mapsBrowserKey`, whereas `Map3DElement` lacks Bengaluru 3D photogrammetry meshes and stalls SwiftShader (`> 30s`).
- Recorded architecture, risks, UI spec, and 4-ticket plan in `docs/DECISIONS.md` (`ADR-020`), `docs/RISKS.md` (`R11`..`R12`), `Design.md` (`Section 4.6`), and `docs/TASKS.md` (`Phase 8`: `T8.1`..`T8.4`).

## 3. Decisions Made
- **ADR-020 (`docs/DECISIONS.md`):** Build **Route A** (`RenderingType.VECTOR` at `65deg` tilt/heading + lazy-loaded Three.js `WebGLOverlayView` beacons & `545`-point ORR traffic streams + 3-stage Sky-Drop camera + `136x136px` heading-locked `RadarMinimap`) on `phase/p8-3d-dusk`, deployed strictly to a `--no-traffic --tag p8-3d` Cloud Run preview URL.

## 4. Open Questions
- None for `T8.1`..`T8.4` preview build: hardware-accelerated desktop WebGL2 defaults `3D` ON (with a `3D / 2D` topbar pill), while mobile, headless/SwiftShader, and `prefers-reduced-motion` default cleanly to `2D`. Human decides after reviewing the `p8-3d` preview URL whether to merge to `main`.

## 5. Known Issues
- None; keep every `.ts/.tsx/.css` file `<= 250` lines, zero em dashes, Google attribution unobstructed, and `internalUsageAttributionIds={["gmp_git_agentskills_v1"]}` intact.

## 6. File State
- Clean working tree on branch `phase/p8-3d-dusk` pushed to `origin/phase/p8-3d-dusk`.

## 7. The Single Next Task
- Execute **Phase 8 (`T8.1` -> `T8.4` in `docs/TASKS.md`)** on `phase/p8-3d-dusk`: ship Route A (`RenderingType.VECTOR` + lazy Three.js `OrrWebGlLayer` + `CameraDirector3D` Sky-Drop/orbit + `RadarMinimap` + `e2e/map-3d.spec.ts`), pass `npm run check` & `8/8` Playwright E2E tests with initial JS `< 200 KB` gzipped, and deploy a `--no-traffic --tag p8-3d` Cloud Run preview URL without changing `main` traffic.

## 8. Resume Checklist
1. `AGENTS.md`
2. `PROJECT_BRIEF.md`
3. `docs/HANDOFF.md`
4. `docs/TASKS.md` (`Phase 8`, lines 118-127)
5. `Design.md` (`Section 4.6`, lines 113-125)
6. `docs/DECISIONS.md` (`ADR-020`) & `docs/RISKS.md` (`R11`..`R12`)
7. `web/src/map/OrrMap.tsx` & `web/src/hud/TopbarChrome.tsx`
