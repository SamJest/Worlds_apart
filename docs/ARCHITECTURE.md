# Architecture

## Module ownership

- `src/main.ts` creates one `WorldsApartApp` and disposes it on page exit.
- `src/app/WorldsApartApp.ts` owns bootstrap, animation timing, command dispatch, resize and teardown.
- `src/config/gameConfig.ts` defines and validates player-facing journey, renderer, camera, scene/rail and copy tuning.
- `src/simulation/astronomy.ts` owns units, physical constants, lunar position and the baseline Earth-to-Moon curve. `constructionPlan.ts`, `constructionRoute.ts` and `scenicProfile.ts` turn portable blueprints into classic or procedural coaster curves. `journeyState.ts` is the pure state transition boundary.
- `src/scene/worldScene.ts` owns Three.js renderer, scene, camera and component lifecycle. Factories under `scene/` own bodies/textures, environment, railway and carriage GPU resources.
- `src/camera/cameraController.ts` owns camera mode, look angles and external distance. `src/input/inputController.ts` translates pointer, wheel and keyboard events into intents.
- `src/ui/hud.ts` creates and renders DOM UI from journey state and telemetry. It emits callbacks rather than mutating the scene.
- `src/diagnostics/diagnosticsOverlay.ts` renders developer data only when `?debug=1` is present.

## Data flow and lifecycle

Input/HUD intent → pure `updateJourney` command → route position and scene update → camera update → telemetry → HUD/diagnostics → render. The app caps frame deltas before advancing state. Scene setup allocates deterministic textures and geometry once. `dispose()` removes input listeners and releases renderer, geometry, material and texture resources.

Creative mode leaves freight modules and compatible saves intact but does not expose their UI, render their infrastructure or advance their simulation. This is a deliberate dormant boundary for rollback, not a deletion or save migration.

## Units and scale

One world unit is exactly 1,000 km. `KILOMETRES_PER_WORLD_UNIT` is the sole conversion authority. Mean Earth/Moon radii and separation are not enlarged, and telemetry derives from model/camera positions. The carriage, rail radii, sleeper dimensions and `endpointVisualGaugeWorldUnits`/`openSpaceGaugeWorldUnits` are deliberately visibility-scaled presentation fiction; their names avoid presenting them as physical gauge.

The Moon follows a circular four-day sweep. A cubic Bézier curve leaves Earth radially and approaches the Moon's predicted near side at 25 km altitude. This cinematic curve is not orbital mechanics.

## Extension points

Ordinary tuning and copy changes belong in `gameConfig.ts`; pure progress rules belong in `journeyState.ts`; astronomical changes belong in the route model. New scene objects should return owned groups plus `dispose()`. Do not generalise for other planets until a second route exposes shared requirements. Future economy/save state must remain game-domain data and must not serialize Three.js objects.
