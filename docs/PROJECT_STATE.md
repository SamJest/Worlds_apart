# Worlds Apart — project state after preparing Round 4 (2026-10-20)

## Verified repository snapshot (before Round 4)

Exact clean HEAD `83f6f4b4d4b755a09f1d403a29d46a911baac63e` in `CHATGPT_CONTEXT (3).zip`. It contains the earlier Earth-to-Moon journey, carriage/cameras/audio/preferences, 2/4/6-day orbital planning and Round 3 bounded 3D waypoint construction; those modules are in the actual exported source. Browser visual quality is not independently verified in this session.

## Round 4 change pack — NOT YET APPLIED IN GITHUB

- Deterministic, persistent *freight-alloy economy*: 500 initial materials; construction cost per actual kilometre; individually owned guideway blueprints, free replay on the same design and duration; not-enough-material launch lockout.
- Two fixed freight stops (Earth Depot / Orbital Yard) with manually dispatched cargo shuttle. Freight counts down while the page is active; arrivals credit cargo once. Separate from the 2/4/6-day simulated lunar time, 4×/16× playback speed and seek controls.
- Three service tiers: base 45 alloy per 18 sec; orbital siding 75 per 14 sec for 110 alloy after 2 deliveries; expanded sorting yard 110 per 11 sec for 230 alloy after 6 deliveries.
- Keyboard/touch-operable freight console (in-game schematic map with moving train, cargo status, materials, deliveries, upgrades, route building and planner return). Intro, header, planner and Moon arrival provide access.
- On-camera miniature 3D local freight route, two simplified depot platforms, cargo shuttle following the same shipment progress, extra siding/yard geometry shown as upgrades. This is deliberately not an independently switchable network or full transport-tycoon economy.
- HUD rail-alloy balance, freight countdown, planner quote/shortfall, persistent validated localStorage state, safe corruption/blocked-storage fallback, unit/browser/geometry smoke tests and QA docs.

## Verification status (local sandbox)

31/31 independent local tests pass and 5/5 change-tool tests pass. Full suite has two modules requiring `three` absent from the snapshot. Global `tsc --noEmit` only complains about missing `three` dependencies. `npm install` failed DNS; full project build, Playwright, 3D runtime tests and browser/WebGL/mobile visual inspection are outstanding for Codex. No claims of production quality yet.

## Next development

Interactive freely placed **local station/network segments**, junction/switch path routing, selectable cargo lines and genuinely finite goods supply. Then expansion to another planetary destination without sacrificing accurate visual scale. Keep the scenic rail journey the central attraction.
