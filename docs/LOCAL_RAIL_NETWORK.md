# Local orbital rail network — Round 5

## Player flow

From the introduction or Moon-route planner, open **Freight**. The original Earth Depot → Orbital Yard rail is prebuilt, and existing freight/yards/lunar ownership remain valid. The player can:

1. Place a station by tapping an empty location on the construction map, or entering X/Y coordinates for keyboard access. Each costs **65 alloy**. Positions are bounded to the local orbital *schematic*, not Earth/Moon positions.
2. Press **Connect track**, choose two existing stations and pay `max(12, ceil(2D map separation / 9))` alloy. A double connection, self-connection or unknown station is refused. Crossings do not automatically create junctions: the stations are the network graph's nodes.
3. Choose a delivery destination. Freight departs Earth Depot, and Dijkstra finds the shortest connected rail path. An unconnected destination disables dispatch. One shipment may be in transit at a time.
4. Freight loads up to its unlocked tier capacity, available **ore**, and remaining alloy storage space. The Earth refinery holds 250 ore and produces 4 ore per active second. Ore is subtracted when a shipment launches; an arrival grants that exact amount of rail alloy once.
5. Multi-link journeys are distance-weighted; each route takes approximately `tier seconds × route distance / 328` clamped to 6–60 actual seconds. The map and near-Earth 3D freight car show the chosen route in progress.

Limits: 6 stations total (2 predefined, 4 new), 12 connections, 1 train, no demolition/moving stations, no complex junction switching, no separate goods/demand, no timetable, no background crediting. This is a bounded *local* economy beside the core visual Earth-to-Moon route, not a physically accurate orbital railway.

## Data and compatibility

- `worlds-apart.freight.v1` remains unchanged and authoritative for bank balance, delivery count, upgrades and purchased Moon-guideway blueprints. Existing user saves are preserved.
- `worlds-apart.local-network.v1` is new and stores bounded stations, links, selected destination, ore balance and in-progress route (including length and stops). Corrupt saves fall back to the prebuilt two-station line.
- A legacy in-flight shipment has no saved active local graph and therefore displays the original Earth Depot–Orbital Yard line. Completed/stale network paths are cleared on startup; in-flight multi-hop paths persist on reload.
- Network and alloy records are stored separately, so an abrupt termination between the two save calls is not guaranteed to be atomic. A future unified transaction/save schema should address this for any serious economy, especially cloud saves.
- The UI never credits material on its own; `advanceFreight` is the single award function. `beginNetworkShipment` validates the shortest graph path and consumes ore. All graph editing is bounded and save data is validated before loading.

## 3D / graphics

`src/scene/freightInfrastructure.ts` renders a small near-Earth station/depot diagram in 3D. Rails are rebuilt only when stations/links change, not every frame. Existing track and station geometry is disposed. Four rail tubes and instanced ties per segment; running train position follows the same Dijkstra route and progress. This miniature network deliberately exaggerates orbital position for readability and is not the actual interplanetary guideway.

## Verification

Independent tests: `tests/local-rail-network.test.mjs`, extended `tests/freight-infrastructure.test.mjs`; Playwright acceptance addition in `tests/browser-smoke.mjs` exercises keyboard placement, multi-hop connection, dispatch and state restoration at 390px. Run `npm run check` in a full checkout with dependencies installed and do manual mobile and desktop visual verification before merging. The isolated exported snapshot does not contain node_modules or browsers.
