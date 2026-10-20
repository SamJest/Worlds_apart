# WORLDS APART

A playable Earth-to-Moon railway ride built with Three.js, TypeScript and Vite. No account, data service, or transport economy is required.

## Launch

Install [Node.js 22.12+ for the full test suite (or Node.js 20.19+ for local gameplay only)](https://nodejs.org/), then run:

```bash
npm ci
npm run dev
```

Open the local address printed by Vite (usually `http://localhost:5173`). Choose **Begin journey**. The full ride takes three minutes at 1×; use 4× or 16× to see it sooner.

## Controls and testing

- Drag on the scene to look around (touch drag works); switch between first-person and external cameras with the button or `C`.
- Click **Pause/Resume** or press Space. Use **Speed** to cycle 1×, 4×, 16×. The timeline can be dragged to inspect any point. Left/right arrow keys step by 1%.
- In external view, scroll to change follow distance. Press `H` for a cinematic view without the HUD; press `H` again to restore it. Press `?` or use the top-right Options button for reduced motion, higher contrast, and Auto/Battery saver/Highest detail rendering. Options pause the ride, and preferences are saved on the current device. At 100%, the arrival card appears; **Ride again** restarts.
- For an end-to-end check, begin the ride, switch cameras, scrub to about 50%, then run at 16× to arrival. At departure the Moon is about 0.52° wide, and it grows continuously on approach. Earth recedes behind the carriage.

## Model and creative premise

One Three.js unit represents 1,000 km. Earth and Moon mean radii are 6,371 km and 1,737.4 km; mean centre-to-centre separation is 384,400 km. The Moon follows a simplified circular orbit with a 27.321661-day sidereal period. Four simulated days elapse during the three-minute ride. The fixed cubic rail is aimed at the Moon's position at the end of those four days, with radial departure and near-side arrival. Actual angular diameter follows `2 asin(radius / observer distance)`; neither body is enlarged to help visibility. Procedural surface maps are artistic approximations, while the globe dimensions and orbital separation use those stated values.

The journey timeline now follows approximate arc length along the curved route, rather than the Bézier parameter. Mission phases and remaining ride time are indicated in the HUD. A camera-local instanced sleeper section and station beacons make the fictional guideway easier to read without adding thousands of individual draw calls. The adaptive rail's variable gauge, continuous unsupported structure, carriage propulsion and accelerated travel are **fictional technology**. The real Earth-Moon system has orbital inclination, eccentricity, libration, solar illumination changes and rotating reference frames omitted here. The track is a cinematic route rather than a physically viable orbital transfer. The arrival is at a near-side altitude of 25 km in this prototype, not a surface landing. The distance telemetry uses instantaneous geometric distance; the route length can differ from the straight-line separation.

Rendering uses capped pixel ratio, instanced sleepers, shared globe geometry, procedural textures generated once, and a single animation loop. The app makes no runtime asset requests except the optional Google Fonts stylesheet; system fonts are the fallback.

## Checks and diagnostics

`npm run check` runs unit tests, collaboration-tool safety tests, the TypeScript production build and Playwright browser smoke tests at desktop and mobile sizes. Individual commands are `npm test`, `npm run test:tools`, `npm run build` and `npm run test:browser`. Append `?debug=1` to the local URL for an unobtrusive FPS, frame-time, camera, position and renderer overlay.

## ChatGPT collaboration

From a clean committed tree, run `npm run context:export`. Attach `exports/CHATGPT_CONTEXT.zip` to a normal ChatGPT chat and use [the reusable prompt](docs/CHATGPT_MASTER_PROMPT.md). ChatGPT can return a bounded change-pack JSON; check it with `npm run change:check -- path/to/change.json`, then apply it explicitly with `npm run change:apply -- path/to/change.json --apply`.

Read [the simple workflow](docs/CHATGPT_WORKFLOW.md) before first use. Project details live in [project state](docs/PROJECT_STATE.md), [architecture](docs/ARCHITECTURE.md), [game vision](docs/GAME_VISION.md), [roadmap](docs/ROADMAP.md), [testing](docs/TESTING.md) and [decisions](docs/DECISIONS.md).

For the next development handoff, see [Codex instructions](docs/CODEX_HANDOFF.md) and the [route construction design](docs/ROUTE_CONSTRUCTION_DESIGN.md).

## Round 4 freight prototype (once integrated)

A compact orbital freight service lets you ship rail alloy from an Earth Depot to an Orbital Yard. Open **Freight** from the introduction, HUD or route planner. Dispatch one shuttle at a time, expand your yard as deliveries accumulate, and use the earned alloy to pay for new Earth–Moon guideway layouts. Existing identical layouts remain free to replay. Inventory, station upgrades, cargo-in-transit and owned layouts persist locally in your browser. The freight stations also have a small 3D representation near Earth during the ride.

See `docs/FREIGHT_ECONOMY.md` for rules, costs and limits and `docs/ROUND4_QA.md` for tests. This is a bounded two-station demonstration, not yet a complete freeform transport network or a real economic model.
