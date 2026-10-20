# Worlds Apart project state — ChatGPT Round 3 (2026-10-20)

## Exported baseline (already in GitHub before this patch)

Exact clean HEAD `12c6b8500029a02cbd13ed2d23d0190145806062` from `BASE_SNAPSHOT.json` in `CHATGPT_CONTEXT (2).zip`.

The code in that export contains milestones 1 and 2 and the Round 2 planner/audio work; any earlier documentation describing them as *proposed* is stale. Its complete browser/desktop/mobile verification status is only as far as stated in the previous round's integration report, not independently rechecked here.

- Browser 3D Earth-to-Moon ride (180 seconds at 1×, with seek, restart, 4× and 16×) using Earth/Moon mean scale and moving simplified Moon.
- External orbit camera / first-person cabin camera; fictional magnetic guideway and hollow carriage.
- Astronomical route selection with 2/4/6 simulated-day future lunar intercept, invalid offset warnings.
- Audio-engine placeholder, preferences, telemetry/mission phases, accessibility and graphics presets.
- CI/test infrastructure and hardened file-hash + base-commit change pack mechanism.

## Round 3 — included in change pack; NOT YET merged or visually verified

- Bounded *player-authored 3D guideway* that bends through up to **three control anchors**, including lateral displacement in the orbital plane and out-of-plane height. This is real editable Three.js route geometry, not just a UI illustration.
- 3 construction templates (Direct, Wide Arc, High Scenic), adding/removing/selecting anchors, mouse/touch marker dragging on the orbital map, sliders for height and lateral position; construction geometry, player route and route preview share the same evaluated model.
- Independent rotatable/zoomable Three.js miniature for viewing the route in 3D. Planet marker radii in this miniature are enlarged and labelled schematic; actual ride keeps its astronomical radii.
- Constraint checks: invalid/corrupt blueprints, guideway length allowance (120% of baseline), collision with departure Earth/arrival Moon and sharp curvature. Invalid design or orbital aim prevents launch with actionable messages.
- Simple *fictional material unit* display (one unit per 1,000 km of rail); this is an allowance, **not a transport economy or physical construction simulation**.
- Construction pylons at anchor locations visible during the actual ride, a built-track distance display, and a journey-complete construction summary.
- Local persistence of validated design on successful departure, tolerant of storage unavailable/corrupt data.
- Six pure blueprint state unit tests run and passed in isolation. Five collaboration-tool safety tests run and passed. New geometry integration and browser tests are written for Codex to run in the complete repository.

**Limits:** node fractions along baseline are pre-selected and cannot yet be freely changed. Rail is placed between Earth and the moving Moon in a single bounded level; no rail networks, station placement, route branching, real physics, resource harvesting, deliveries, currency, Mars or persistent travel between worlds.

## Integration requirement

The context export omits `index.html`, `package-lock.json`, `node_modules`, Playwright binaries and GitHub CI workflows. The isolated sandbox cannot fetch npm dependencies (DNS failure), so **TypeScript compilation, Three.js route runtime tests and browser/WebGL/mobile rendering were NOT performed here**. Codex must apply only at the exact SHA, `npm ci && npm run check`, test all three construction presets for all days, inspect both cameras along full routes and repair any observed defects before pushing.

## Next feature milestone

A minimal *local* construction/transport loop: connect an orbital depot and one supply stop, ship materials on a second short rail line, and spend the proceeds on the next leg. Keep railway riding the main attraction and do not add sprawling production chains yet.
