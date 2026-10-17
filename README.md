# WORLDS APART — milestone 1

A playable Earth-to-Moon railway ride built with Three.js, TypeScript and Vite. No account, data service, or transport economy is required.

## Launch

Install [Node.js 20.19+ or 22.12+](https://nodejs.org/), then in this repository run:

```bash
npm install
npm run dev
```

Open the local address printed by Vite (usually `http://localhost:5173`). Choose **Begin journey**. The full ride takes three minutes at 1×; use 4× or 16× to see it sooner. `npm run build` creates a production bundle in `dist`; `npm run preview` serves that bundle. `npm test` runs the model checks.

## Controls and testing

- Drag on the scene to look around (touch drag works); switch between first-person and external cameras with the button or `C`.
- Click **Pause/Resume** or press Space. Use **Speed** to cycle 1×, 4×, 16×. The timeline can be dragged to inspect any point. Left/right arrow keys step by 1%.
- In external view, scroll to change follow distance. At 100%, the arrival card appears; **Ride again** restarts.
- For an end-to-end check, begin the ride, switch cameras, scrub to about 50%, then run at 16× to arrival. At departure the Moon is about 0.52° wide, and it grows continuously on approach. Earth recedes behind the carriage.

## Model and creative premise

One Three.js unit represents 1,000 km. Earth and Moon mean radii are 6,371 km and 1,737.4 km; mean centre-to-centre separation is 384,400 km. The Moon follows a simplified circular orbit with a 27.321661-day sidereal period. Four simulated days elapse during the three-minute ride. The fixed cubic rail is aimed at the Moon's position at the end of those four days, with radial departure and near-side arrival. Actual angular diameter follows `2 asin(radius / observer distance)`; neither body is enlarged to help visibility. Procedural surface maps are artistic approximations, while the globe dimensions and orbital separation use those stated values.

The adaptive rail's variable gauge, continuous unsupported structure, carriage propulsion and accelerated travel are **fictional technology**. The real Earth-Moon system has orbital inclination, eccentricity, libration, solar illumination changes and rotating reference frames omitted here. The track is a cinematic route rather than a physically viable orbital transfer. The arrival is at a near-side altitude of 25 km in this prototype, not a surface landing. The distance telemetry uses instantaneous geometric distance; the route length can differ from the straight-line separation.

Rendering uses capped pixel ratio, instanced sleepers, shared globe geometry, procedural textures generated once, and a single animation loop. The app makes no runtime asset requests except the optional Google Fonts stylesheet; system fonts are the fallback.
