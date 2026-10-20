# Current project state

Last verified foundation commit: `183b73c` on 2026-10-20. Documentation and workflow proof follow that implementation commit.

## Implemented

- Playable three-minute Earth-to-Moon journey with 1×, 4× and 16× speeds, pause/resume, seeking and restart.
- First-person and external cameras with pointer/touch look, external zoom and keyboard controls.
- Mean astronomical dimensions, simplified four-day lunar motion, future-position rendezvous, telemetry and natural apparent Moon growth.
- Deterministic procedural Earth, Moon and starfield; visible adaptive rail, instanced sleepers and carriage.
- Typed, startup-validated tuning in `src/config/gameConfig.ts` for journey, cameras, rendering, rail visibility, star count and interface copy.
- Modular app, simulation, scene, camera, input, UI and opt-in `?debug=1` diagnostics.
- Pure model/state/config tests, collaboration-tool safety tests, production build and desktop/mobile Playwright smoke tests under `npm run check`.
- GitHub Actions CI and a bounded context-export/change-pack workflow for ordinary ChatGPT.

## Verified behaviour

The journey loads without page errors, begins, changes camera, pauses/resumes, changes speed, seeks, reaches arrival and restarts at 1440×900 and 390×844. The full 16× journey was played end-to-end during the foundation task. The HUD has no horizontal mobile overflow.

## Honest limitations

- Earth/Moon textures, illumination, carriage and rail are stylised; there is no sound, loading state or accessibility settings panel.
- Rail gauge/radius and carriage dimensions are visibility aids at astronomical scale, not physical measurements.
- The production bundle is about 523 kB before gzip and triggers Vite's 500 kB advisory.
- Circular lunar motion and the cubic rail omit real orbital-transfer physics.
- Google Fonts are optional; system fonts provide the offline fallback.

Current priority is journey polish: stronger departure/arrival staging, camera comfort, carriage credibility, rail coherence and explicit performance budgets. Route construction comes later. Transport economy, accounts, backend services, save/load and additional destinations are not implemented.
