# Round 9: selectable launch and arrival sites — verified implementation/QA

## Scope integrated and verified by Codex on 21 October 2026

- Player can open **Earth Launch** and **Moon Arrival** selectors from the creative coaster planner.
- A lightweight on-demand Three.js globe supports drag to orbit, tap/click to select a site and coordinate entry (latitude, east-positive longitude and heading). Presets include Colchester and the Moon's near/far side.
- Selected sites are validated, persisted separately in `worlds-apart.ride-sites.v1`, and may be cleared by removing that localStorage key. Older guideway saves remain valid.
- Mathematical surface coordinates use WGS84 Earth ECEF and Moon spherical mean radius. Game world uses normalized spherical display approximations. Three.js scene axes are **X=longitude 0°, Y=north, −Z=east 90°**.
- A newly launched custom guideway's start and end are changed to these sites, with launch tangent outward and approach tangent outward from the Moon surface. The existing three-control-point cubic follows them and the safety evaluator samples collisions and curve bends. Block construction if invalid; do not force a broken ride.
- Site marker meshes are children of the rotating Earth and Moon globe meshes, and their coordinates are correctly body-fixed. This is not a real inertial orbital attachment solver.
- Existing first-person free-look, panel mobility, creative coaster templates, clouds, sky, guideway lighting and banking come from baseline `3f555dc` and must not be overwritten by a stale older pack.

## Honest limitations — do not claim these are solved

1. Earth's current globe texture is stylised/generated. Coordinates are mathematically defined, but it **cannot** show Colchester's actual streets or precisely aligned geography. We did **not** add NASA imagery, live satellite tiles, terrain/DEM or geocoding.
2. The underlying long-span adaptive track curve is still built against the departure frame at progress=0 and Moon arrival frame at progress=1. Markers stay attached to spinning globes, but the endpoint of the *inertial* track is not dynamically recalculated as Earth rotates in the middle of the trip. A truly dynamic junction/terminal rail remains future work. Test near-departure camera and initial attachment carefully.
3. Current destinations are Earth departure -> Moon arrival only; no Earth return, Mars, Saturn or gas-giant landings.
4. A real planetary landing is not yet simulated: existing arrival altitude is 25km above the spherical mean Moon, not ground level.
5. Heading is selected and persisted, but the present straight-up launch tangent does not yet physically steer by that heading. Future terrain/terminal camera work needs it.

## Codex verification results

| Acceptance area | Result | Evidence / limitation |
|---|---|---|
| Clean dependency install | PASS | `npm ci` completed from the lockfile using a writable temporary npm cache. |
| Unit and integration tests | PASS | 82/82 product checks, including WGS84 round trips and selected-site route clearance. |
| Change tooling | PASS | 5/5 checks. |
| TypeScript and production bundle | PASS | `tsc -b && vite build`; Vite built 43 modules. The existing bundle-size warning remains non-blocking. |
| Desktop WebGL game and seven creative templates | PASS | Chromium smoke test launched and completed all seven styles; no page, WebGL or shader errors. |
| 2/4/6-day geographic route safety | PASS | All seven styles were evaluated at all three durations from Colchester to the lunar near side; sampled rails cleared both bodies. |
| Mobile geographic launch and arrival | PASS | 390×844 touch emulation tapped the Earth globe, entered Colchester, selected both lunar presets, rode a direct route to the far side, reached arrival and restored the saved sites after reload. |
| South hemisphere, poles and dateline mathematics | PASS | Pure round-trip tests cover ±90°, −35° latitude and both ±179.99° longitude; an extra mobile check accepted 35°S, 179.99°E with zero horizontal overflow. |
| Portrait and landscape picker layout | PASS | Chromium at 390×844 and 844×390; controls remained scrollable/reachable and no horizontal overflow was present. |
| Camera, HUD and mobile gestures | PASS | Current regression smoke covers four first-person facing choices, free first-person look, 360° third-person orbit, camera switching, cinematic exit and draggable/persistent telemetry. |
| Economy absent from the playable flow | PASS | Browser run began with zero materials, built every style for free and confirmed the freight entry point stayed hidden. Dormant legacy modules/tests remain in the repository but are not re-enabled. |
| Physical mobile device and long thermal/performance soak | NOT TESTED | Touch/mobile browser emulation was used; a physical midrange-device pass remains useful. |
| Dynamic rotating terminal rail | PARTIAL / KNOWN | Body-local markers rotate correctly, but the inertial track endpoint is not rebuilt continuously after departure. |
| Satellite imagery, terrain and local houses | NOT IMPLEMENTED | The globe remains intentionally stylised and is labelled as such. |
| Gas-giant orbital alternatives, Earth return and route sharing | NOT IMPLEMENTED | These are deferred roadmap features, not Round 09 claims. |

The first full browser run exposed one genuine integration bug: the global full-screen `canvas` rule made the location-picker globe overlap its buttons on mobile. The picker canvas is now explicitly kept in normal layout flow, and the complete browser suite passes after the fix. Extreme far-side Moon combinations with aggressive stunt templates can exceed the bend limit; the planner shows the safety warning and disables launch, as required, while the direct far-side mobile journey passes through arrival.

## Map imagery next

Replace the procedural base map with an accurately oriented, licensed equirectangular NASA Blue Marble texture, calibrated against UK, Africa, Australia and dateline before representing selected places visually. NASA Earth Observatory Blue Marble Next Generation base map: https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-map/ . Do not hotlink huge external tiles at runtime or claim building-level imaging. Add a tested low-res offline fallback.
