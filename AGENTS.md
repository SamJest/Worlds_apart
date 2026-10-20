# WORLDS APART repository guidance

## Product

Preserve the core experience: an immersive railway journey between recognisable astronomical worlds, with grounded scale and clearly fictional adaptive railway technology. The ride is the primary experience. Do not implement the transport economy without an explicit task that defines it.

Read `docs/PROJECT_STATE.md`, `docs/GAME_VISION.md`, `docs/ARCHITECTURE.md` and `docs/DECISIONS.md` before broad work. Update relevant documents when behaviour, architecture, scientific assumptions or roadmap status changes.

## Engineering rules

- Keep kilometres/world-unit conversion explicit. Do not silently enlarge astronomical bodies for visibility.
- Keep simulation and configuration independent from DOM and rendering where practical.
- Maintain first-person and external cameras, keyboard/pointer/touch controls, seek, speed, pause, restart and complete Earth-to-Moon arrival.
- Preserve smooth browser performance. Avoid unbounded pixel ratio, repeated large allocations in the animation loop and separate meshes where instancing fits.
- Dispose of owned Three.js GPU resources when a lifecycle introduces teardown or recreation.
- Keep normal UI free of implementation detail; put diagnostics behind `?debug=1`.
- Prefer small, comprehensible modules and data-driven tuning. Do not build a generalised space engine before a second route proves the need.
- Keep dependencies few and justified. Never commit secrets, generated builds, context exports or local backups.

## Required checks

Before committing, run `npm run check`. For changes affecting visuals, input, cameras, journey progression or rendering, also play the relevant flow in a real browser at desktop and a narrow mobile viewport.

For every player-visible change, verify page load has no console errors, Begin works, camera switching works, progress can advance and seek, the HUD remains readable, and arrival/restart still work unless the task intentionally changes them.

## ChatGPT change packs

Treat external change packs as proposed code. Run `npm run change:check -- <file>` first, review the JSON and resulting diff, then apply with `npm run change:apply -- <file> --apply`. Run checks and browser testing before committing. Never weaken base-commit, file-hash, path, size, symlink, backup or all-validation-before-write safeguards merely to make a stale pack apply. Export fresh context and regenerate it instead.
