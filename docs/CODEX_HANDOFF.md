# Codex handoff — Round 2 preflight planner + audio

**Exact base SHA:** `165dc69387d82ce705fba12b24bbbe4d5a2de9bd` (from the newly received `CHATGPT_CONTEXT (1).zip`). Do not apply this pack on a different HEAD without a new export/rebase. The old earlier handoff in the snapshot named an obsolete SHA and should not be reused.

## Your job is primarily integration verification, not feature design

1. Unzip this handoff. Copy `WORLDS_APART_ROUND2_CHANGE.json` into the repository root (or provide its path).
2. Run `npm run change:check -- WORLDS_APART_ROUND2_CHANGE.json`. Review each file; only if safe, `npm run change:apply -- WORLDS_APART_ROUND2_CHANGE.json --apply`.
3. `npm ci`, then `npm run check` (unit/tool/build/browser). Fix observed failures only; do not reconstruct completed features.
4. Run the route/audio acceptance checklist in `docs/ROUND2_QA.md` and visually check performance, focus, sound, 2/4/6-day journeys, all ride controls, arrival and restart on desktop and mobile. Capture FPS/draw statistics with `?debug=1` rather than claiming performance improvements without measurement.
5. If green, commit and push; export new clean `CHATGPT_CONTEXT.zip` using `npm run context:export` for the next ChatGPT round. Keep the full source, build artifacts and build dependencies in GitHub, not inside the context ZIP.

### Files implemented for you

- Simulation: new `src/simulation/routePlanner.ts` and tests; 2/4/6-day pure intercept logic.
- UI: new `src/ui/routePlannerUi.ts`, large scoped planner CSS, HUD bridge and updates.
- App and scene: dynamic route rebuilding, telemetry adjustment, simplified axial/tidal rotation, pause on tab hide, planner focus isolation and input guards.
- Audio: new `src/audio/audioEngine.ts`, with persisted sound preferences and tests.
- Tests: new planner/audio cases, updated preference and end-to-end browser smoke tests.
- Docs: state, roadmap, route-planner implementation notes and audio manual QA.

### Scientific/gameplay integrity

The route is a fictional fixed cubic Bézier rail with a future-Moon rendezvous. Duration presets change Moon orbit angle and endpoint, *not* physical transfer velocities. ±0.5° success band and the larger warning bands are arbitrary gameplay tuning; the planner clearly calls them schematic. No resources or economy and no additional planet.

### Known verification limitation

The context archive is a bounded export, not a self-contained application: missing `package-lock.json`, `index.html`, dependencies and `.github` CI files are intentionally not replaced by this pack. Node pure tests and TS syntax checks passed in this sandbox, but `npm install` timed out so the full production build and Playwright are still outstanding. Do not mislabel proposed changes as already playable until verified in the repository.
