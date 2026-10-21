# Visual Immersion Pass — Round 08 (2026-10-21)

## Player intent

Worlds Apart is an **immediate creative space rollercoaster**. The thrill of building impossible shapes and riding them through spectacular, scientifically scaled celestial scenery is the core. There must be no material, contract, freight, or currency requirement to enjoy the ride. The old freight code remains dormant for rollback and is not touched here.

## Specific camera correction

> Current control note: later player feedback moved unrestricted horizontal orbit to Third Person. First Person now follows the track with Front/Left/Back/Right selections and vertical look only; every ride starts facing the departure planet.

The original `InputController.pointerMove` applied `event.clientX - lastX` but never updated `lastX` or `lastY`. Because the camera already accumulated these large deltas frame after frame, touch yaw became unpredictable and a swipe could appear not to turn the view properly. The fix updates both coordinates **on every pointer move**, processes only the active pointer and multiplies touch input by a screen-width-aware factor. Keyboard `B` and the on-screen Look Back control remain intact, and camera mode switching now keeps the head's direction. No yaw clamp is reintroduced. Glass replaces the old opaque overhead canopy.

## Visual upgrades included

- Camera-centred, GPU-drawn, soft, coloured stars with subtle twinkle. No incorrect nearby-star parallax during planetary travel.
- Faint procedurally painted galactic dust lane as a **stylised sky**: not a scientific sky survey or a literal galaxy-map claim.
- Camera-relative sun halo aligned with the sun-lit side of Earth.
- Earth cloud sphere and brighter sunward atmosphere limb. The surface and orbit radii are **unchanged**.
- Dark lunar maria and subtle height shading using the existing Moon texture.
- Near-track instanced luminous guideway hoops with distant perspective and visual cadence. Fictional materials, not physically real construction.
- Richer rail surface lighting and a transparent carriage canopy, leaving the rear view clear.
- Explicit template roll plus mild banking into turns, with rails, carriage and both cameras sharing one orientation frame. Reduced-motion affects camera easing and decorative animation, not physical track geometry.
- One-tap cinematic mode on mobile with a persistent **Show Controls** exit button.
- Battery saver reduces visible stars, disables the rich sky and sun halo, and reduces illuminated guideway hoops.

## Browser acceptance (Codex must execute before merge/deployment)

1. `npm ci && npm run check` using the full GitHub repository with package-lock and installed dependencies. The ChatGPT context export intentionally omits package-lock and node_modules.
2. Test a narrow mobile viewport (390×844) and actual Android Chrome with touch: select all four first-person facings, swipe freely through 360°, then switch to Third Person and orbit through 360° using repeated one-finger swipes. A new ride should initially face the departing Earth, and both views should roll with the track.
3. Confirm pointer gestures move incrementally and do not jump back, drift after release or react to second-finger movement.
4. Test Direct, Corkscrew, Zero-G Waves and Deep-Space Dive. Check roll, motion comfort and planet clearance. Verify 1×, 4×, 16×, seek and restart. Moon remains visible naturally at physically scaled angular size.
5. Check Earth cloud transparency and atmosphere rim from a distance, Moon surface from 80–100%, and sun halo. Inspect the GLSL shader console for compilation/linking errors on WebGL.
6. Inspect side, front, back and overhead views: the glass roof, cockpit and coloured guideway rings must not block essential views. Dim or remove any geometry that obstructs the planet.
7. Verify battery saver and reduced motion are visibly less demanding; test GPU performance on a midrange Android device. Measure FPS with `?debug=1`; avoid large sustained frame drops or crashes.
8. On mobile, tap `✦ CINEMATIC`, confirm controls hide, and tap `☰ SHOW CONTROLS` to recover them. Existing collapsible telemetry and settings must continue working.
9. Inspect all new star/sky shaders with real screenshots on desktop and mobile. Rebalance bright bloom/noise if visually distracting; don't declare success from unit tests alone.

## Validation in ChatGPT workspace

- 4/4 new dependency-free focused tests passed.
- 5/5 existing change-tool safety checks passed.
- TypeScript syntax/transpile parsing passed for 13 touched `.ts` files.
- CSS parsing: 276 stylesheet rules and no syntax errors.
- `npm test`: 66 passed, 3 suites failed to load because `three` is missing, not from a reported assertion failure. This does **not** establish full compatibility.
- `npm ci` cannot run on the export because package-lock is excluded; an npm dependency attempt was not able to finish. Full build and real rendering are unverified.

## Codex integration verification

- `npm ci` and the complete repository gate passed: 77 product tests, 5 collaboration-tool tests, strict TypeScript, production Vite build, and desktop/mobile Playwright flows.
- Real WebGL screenshots covered Direct, Corkscrew, Zero-G Waves and Deep-Space Dive; departure Earth/clouds, Moon approach, external banking, first-person forward/rear views, cinematic recovery, battery saver and reduced motion were inspected.
- Two full-width synthetic touch swipes traversed the rear view and returned toward the forward route at 390×844. Look Back, camera switching and zero horizontal overflow also passed. Runtime monitoring found no page, shader, program-link or WebGL context errors.
- In this software-rendered cloud Chromium run, battery saver reduced the debug geometry count and improved the observed diagnostic sample. Those numbers are not a claim about phone hardware. A physical midrange Android Chrome performance/comfort pass remains outstanding.
- Integration tuning reduced canopy tint and made the guideway hoops smaller, dimmer and less numerous so they retain depth cues without dominating the planetary view.

## Safety and rollback

The change pack's base commit and original SHA-256 hashes must be checked before writing. Integrate into a feature branch, run all checks, commit only when verified. If a newer commit is now on `main`, **do not** bypass hash checks; regenerate the pack from the new clean export or have Codex review and manually rebase the bounded diff.
