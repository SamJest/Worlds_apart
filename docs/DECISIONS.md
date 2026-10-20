# Architectural decisions

## 2026-10-20 — explicit astronomical units

One world unit equals 1,000 km. Mean Earth/Moon dimensions and separation remain authoritative and unscaled. Presentation-only carriage and rail dimensions are named as visual tuning because realistic millimetre/metre infrastructure would disappear at this scale.

## 2026-10-20 — cinematic moving-Moon route

The Moon uses a simplified circular sidereal orbit and the ride spans four simulated days. A fixed cubic curve aims at the predicted arrival position, with radial departure and near-side arrival at 25 km altitude. This preserves readable motion and rendezvous while explicitly rejecting claims of orbital-transfer realism.

## 2026-10-20 — typed configuration boundary

Journey duration/speeds, camera sensitivity/distances, renderer cap, star count, rail visibility and core UI copy live in one validated `GameConfig`. This makes common bounded changes suitable for ChatGPT packs without putting arbitrary runtime internals into configuration.

## 2026-10-20 — small modules, one application owner

Simulation, scene factories, camera, input, UI and diagnostics have narrow ownership; `WorldsApartApp` coordinates them. A framework or general-purpose engine was rejected because this prototype benefits more from direct readable TypeScript.

## 2026-10-20 — deterministic performance baseline

Procedural visuals remain seeded, sleepers remain instanced, pixel ratio stays capped and large resources are created once and disposed explicitly. Optimisation beyond the current bundle advisory waits for measurement and player-facing need.

## 2026-10-20 — diagnostics are opt-in

FPS/frame time, camera, route position and renderer counts appear only with `?debug=1`. Normal play remains free of implementation detail.

## 2026-10-20 — behavioural checks and CI

Pure tests cover astronomy, configuration and journey transitions. Tool tests cover the collaboration safety contract. Playwright covers browser startup and critical interactions at desktop/mobile sizes. GitHub Actions installs the locked dependencies and Chromium, then runs the same `npm run check` command.

## 2026-10-20 — ChatGPT proposes; local tools and Codex verify

Normal ChatGPT receives an explicit text snapshot and can return bounded complete-file replacements. The local tool verifies commit and file hashes, paths and symlinks before writing, creates backups, and never executes supplied commands. Codex/humans remain responsible for review, browser integration, tests, commits and pushes.
