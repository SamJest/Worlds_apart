# Freight economy prototype (Round 4)

## Gameplay loop

1. Begin with **500 alloy units** at Earth Depot. Build one valid Earth-to-Moon guideway; price equals `ceil(actual 3D route length in km / 1,000)`, not the simple lunar mean distance. The geometric 120% detour guard from Round 3 remains an independent engineering constraint.
2. The **Earth Depot → Orbital Yard** fixed freight service can send **one** shipment at a time. Shipment arrival earns alloy material. A dispatched train travels in *real game seconds* while the app is open, even if the user is looking at the Moon ride. The cargo is not a separate currency: it's the same construction resource.
3. After enough deliveries, spend alloy to improve freight capacity. Upgrade 1 adds a siding; upgrade 2 adds the expanded sorting platform. The 2D operations map and the near-Earth 3D models show the upgrades.
4. Use earned alloy to build a *different* Earth–Moon route. Previously constructed identical designs are permanently recorded as owned, so replaying them does not spend alloy. The original restart action remains free.

| Freight service | Payload (alloy) | One-way seconds | Upgrade cost | Required completed deliveries |
| --- | ---: | ---: | ---: | ---: |
| Starter shuttle | 45 | 18 | Included | 0 |
| Orbital siding | 75 | 14 | 110 | 2 |
| Expanded sorting yard | 110 | 11 | 230 | 6 |

## Deliberate limits

- The Earth Depot's alloy supply is abstract/unlimited. There is no simulated ore mining, running cost, consumer demand, budget, ticket sales or real economic modelling yet.
- The two local stations and their rail are fixed. **This is not free-form station placement, a switchable rail graph, train timetables or a complete transport tycoon.** Side tracks in the upgrade geometry are currently decorative and cannot be routed independently.
- The near-Earth model uses exaggerated service lengths for visibility; astronomical Earth/Moon body sizing and the original interplanetary track remain unchanged.
- Freight trips are dispatched manually, progress only in active browser time, and cannot accelerate using the Moon journey's 4×/16× speed controls. Background-tab pauses and refreshes preserve remaining time but do not credit unseen/offline deliveries.
- Progress persists under `worlds-apart.freight.v1` localStorage. No accounts/cloud sync. Bad/unavailable storage gracefully starts a local in-memory campaign; there is no migration from unrelated prior versions.
- One in-flight shipment, storage maximum 20,000 material units, 500 owned blueprints at most. Changing even one control anchor creates a new, payable design.

## Technical invariants

- Reducers in `src/simulation/freightEconomy.ts` are deterministic and do not mutate inputs. Changes to money, shipments or upgrades go through these reducers. Invalid or forged-state writes are not a server security concern in this offline-only prototype, but malformed saves must be rejected.
- Build costs are charged **only after** both lunar intercept and guideway validation succeed. Not enough alloy disables the launch button. The 3D journey cannot be paid twice for an identical blueprint.
- Materials should never go negative or exceed the storage cap; cargo is credited exactly once at delivery. Passing a negative/NaN frame duration does nothing.
- HUD, planner, and depot UI read the same economy state. The 3D train visual reads, but never writes, the simulation state.
- New 3D geometries/materials must be disposed with the scene. The depot and sorting-yard model deliberately adds no extra render loop.

## Future scope

M5b: free-placement local station segments, junctions and route switches, constrained editable network, construction preview. M6b: finite local goods sources and destination demand, freight receipts, genuinely independent trains and production chains. M7: expand travel to Mars only after the station/freight loop is enjoyable and visual journey quality has passed browser QA.
