# Worlds Apart — current state following proposed Round 5 change pack (2026-10-20)

## Confirmed baseline

`CHATGPT_CONTEXT (4).zip` exported a clean source snapshot at exact commit `867a42d592eb009d78c59f7182ff2c71a4f7f9df` which **includes Round 4** (fixed freight and alloy economy) and previous scenic railway milestones. Round 5 has been authored and tested outside GitHub but has NOT been applied, built or browser-tested in the actual checkout yet.

Implemented in the baseline: Earth-to-Moon 3D railway ride; recognisable celestial bodies, track and carriage; first-person/external cameras, progress and journey telemetry; orbital-intercept planning for 2/4/6-day routes; editable guideway anchors and 3D preview; settings and synthesised audio; construction prices/purchased blueprints; two fixed local freight stations, deliveries and upgrades.

## Proposed Round 5 (pending Codex integration)

- Editable bounded **local freight network**: tap the map or enter coordinate values to place up to 4 extra stations (6 total), select pairs to lay track (12-link cap), graph connectivity and Dijkstra shortest-path routing.
- Player selects a connected station destination; dispatch uses that exact route, its length and finite source ore. Longer routes take longer; one shipment per service. The existing freight economics and upgrades continue to work.
- 250-unit finite ore refinery that replenishes 4 units/active second, creating limited goods supply without locking the player out forever.
- Persistent `worlds-apart.local-network.v1` network save alongside unchanged `worlds-apart.freight.v1` inventory save; strict save validation and stale shipment reconciliation.
- 3D near-Earth freight stations and rails generated from the actual player graph; moving shuttle follows the selected path, with no new render loop.
- Touch/keyboard controls, dynamic network map, tests and QA/handoff instructions.

## Verification status

New network pure tests and existing dependency-free tests pass; no complete Vite build/Three.js/Playwright/WebGL visual QA here because packages are missing. Codex must apply the change pack at the exact base commit, run all checks, inspect and fix browser regressions, and export a fresh clean context.

## Next priorities after Round 5

1. Junction semantics and editable stations/track deletion/refunds, with terrain/collision constraints; then multiple independent trains and lines, load/unload planning and finite destination demand.
2. Route and economic balancing; clear ways to fund scenic lunar construction without repetitive micro-dispatching.
3. Enhance visual immersion on the Moon ride, rendering/performance budgets and mobile comfort; keep this as the primary player experience.
4. Once the local game loop is engaging and fully verified, investigate another destination (e.g., Mars) without overstating astronomical accuracy.
