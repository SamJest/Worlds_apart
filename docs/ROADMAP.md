# Worlds Apart — roadmap after Round 4 preparation

### Included in the exported clean baseline (`83f6f4b`)

- M1–M2: scientifically scaled Earth/Moon appearance, real angular changes, journey controls, train/railway, first-person and external cameras, cabin comfort and diagnostics.
- M3–M4: generated audio with user-gesture requirements; predicted moving-Moon intercept with 2/4/6-day journey selection.
- M5a: bounded 3D railway designer, anchor editing on 2D map/sliders, rotatable miniature blueprint, construction constraints and persistent blueprint.

### Implemented in Round 4 change pack; integration and visual QA outstanding

- M6a: **small transport economy and local service rail**: Earth Depot and Orbital Yard, moving cargo train, alloy material inventory and delivery rewards, two yard upgrades, construction costs and saved purchased route catalogue. Both local schematic and near-Earth 3D scene representation.
- This is *not* a freely routable tycoon network. The two stops, track and freight path remain fixed and station sidings are visual only.

### Next (not yet implemented)

- M5b: free placement of local track segments and stations, line switches, route pathfinding and switch controls, limited construction budget, undo/redo and persistent network layout.
- M6b: local goods extraction/finite sources, demand at stations, different freight types, train schedules and fully independent cargo locomotives. Balance materials to avoid a tedious click-grind.
- M7: one additional destination after polishing M6b, with orbital model and true apparent-size checks; possible Mars leg. Extend arrival/refuelling/freight mechanics.
- M8: expanded interplanetary economy, exploration, map/route discovery, visual polish, accessibility and mobile optimisation. Cloud sync and multiplayer remain deferred.

Quality gate each round: correct source snapshots, safe hash-checked change packs, deterministic reducer tests, full repo compile, browser + touch QA, no console errors, stable apparent sizes and measured rendering performance.
