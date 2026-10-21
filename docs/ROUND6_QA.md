# Round 6 — parallel freight and safe railway redesign

**Source context:** clean `CHATGPT_CONTEXT (5).zip` (commit `1b65d565eb613e158626c183bdc4667f93dbbaa3`), incorporating Round 5. Proposed Round 6 is authored outside GitHub and must not be represented as deployed until Codex applies, builds and browser-tests it.

## What this round adds

- Purchasable trains B/C (140 and 260 alloy) alongside legacy Train A. They dispatch independently, store individual cargo manifests, destination, path snapshot and elapsed travel time, and credit on arrival once.
- Generalised deterministic Dijkstra rail routing for any origin/destination, including junction stops; legacy Earth-origin freight routing remains unchanged.
- Two commodities: raw ore dispatched from Earth Depot; components manufactured at Orbital Yard from 24 alloy into 16 units and delivered at 2 alloy per unit. Component warehouse capacity is 128.
- No passive accumulation when hidden. All job timers advance only in active frames; progress and rewards are bounded by material storage.
- Canonical v2 operations snapshot in `localStorage` at `worlds-apart.operations.v2`: one atomic key stores existing freight state, network and new fleet. Initial read migrates from unchanged legacy v1 keys; these v1 keys are not rewritten after v2 creation. The new key is authoritative. Corrupt/forged saves revert to safe legacy values. Saving can fail when storage is disabled, but gameplay continues in memory.
- Scene representation and UI map support three moving freight carriages, independent train/commodity selectors and a production workshop.
- Safe removal of any *unused* track (half of link construction cost salvaged) and of disconnected outpost stations (half of station cost); two founding stations cannot be removed. No used edge can be removed while it appears in an active Train A/B/C manifest.

## Scope boundaries

- These are separate freight services sharing the existing track graph. They do not enforce block-signalling, reversing loops, collisions, timetables or station platform capacity. Visual tracks are fictional adaptive dual-purpose rails; transport times are game abstractions.
- Cargo is transported automatically once dispatched. Components are manufactured by button; there is no labour/power supply chain, passengers, fare pricing or station-level demand yet.
- No changes to lunar ride, orbital solution, astronomical scale, camera, core rail construction or route economy pricing.
- No backend, paid services, multiplayer or tracking.

## Dependency-free checks (run in the supplied development snapshot)

`node --experimental-strip-types --test tests/audio-engine.test.mjs tests/config.test.mjs tests/construction-plan.test.mjs tests/freight-economy.test.mjs tests/fleet-operations.test.mjs tests/journey-state.test.mjs tests/local-rail-network.test.mjs tests/mission-phases.test.mjs tests/route-planner.test.mjs tests/view-preferences.test.mjs`

`npm run test:tools`

The pure tests cover wallet debits, resource inventory, station-to-station routes, simultaneous trains, one-off payout, settings and save migration. Older Three.js-dependent tests and complete compilation cannot run here because exported files exclude installed packages. Attempting to install dependencies failed due `EAI_AGAIN` when resolving registry.npmjs.org. `tsc -p tsconfig.json --noEmit` reported only missing `three` module declarations after fixing all other compiler errors; this is not an actual full compile pass.

## Codex mandatory acceptance

1. Apply the JSON change pack only when HEAD matches exact base SHA; review git diff; run `npm ci` or `npm install` in the complete repository and `npm run check`.
2. New browser tests: purchase two trains; manufacture components; dispatch Train A ore, B components and C ore concurrently; check separate path/ETA panels; reload with three shipments moving; confirm jobs continue without double credit. Console must fit at 390px and 1440px.
3. Build two extra outposts and a multi-link route. Test train destinations on reachable and unreachable paths; disconnected route must be blocked.
4. Demolition: existing connected station cannot be removed; remove free link for salvage; remove disconnected outpost. In-flight path must block removing any of its links.
5. Play full Moon ride, save/reload, replay purchased layout for free, use first-person/external cameras and check background WebGL train meshes.
6. Inspect console warnings/errors, test keyboard and touch targets, measure FPS and verify disposable 3D resources do not leak during repeated network edits.
7. After verification, commit/push and export a fresh context ZIP. Do not skip QA or claim unrun checks passed.

## Recommended next stage

Proper transport contracts, outpost-specific goods demands, scheduled recurring train services, safer junction signalling and station production chains; then a polished Moon destination surface and eventual Mars level. Railway ride and immersion remain the heart of Worlds Apart.
