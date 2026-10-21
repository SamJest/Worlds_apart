# Worlds Apart — creative space-coaster baseline (2026-10-21)

- **Current player experience:** a free-build Earth-to-Moon space coaster. Direct, Wide Arc, High Scenic, Corkscrew, Zero-G Waves, Cosmic Slalom and Deep-Space Dive are immediately rideable with no material, freight or alignment gate. Players can still fine-tune up to three anchors and save a local blueprint.
- **Mobile camera controls:** each ride starts looking back at the departure planet. First person follows track pitch/turn/roll, offers explicit Front/Left/Back/Right directions and limits drag to vertical look. Clearly labelled Third Person provides full 360° orbit, 180° rotation and zoom. Seek/speed/pause controls and a collapsible, draggable telemetry panel remain available at narrow viewports.
- **Dormant systems:** the completed freight economy, parallel trains, local network editor and demolition logic remain in source and their unit tests remain green, but their UI, scene and ticking are disabled for the creative-mode pivot. Existing saves are not deleted.
- **Verification:** route endpoints, planet clearance and sampled carriage-orientation continuity cover all seven templates. The full build, tool checks and Playwright creative flows cover desktop and mobile. Visual browser inspection remains required for future geometry or camera changes.
- **Next product work:** richer creative pieces and scenery, shareable blueprints, more destinations, ride polish and measured mobile performance. Do not reintroduce economy grind without a new explicit product decision.


## Visual immersion / camera upgrade (integrated and browser-verified)

- Pointer movement uses per-event deltas. Third-person touch yaw is viewport-scaled for full orbit; first-person horizontal movement is intentionally locked in favour of four reliable facing selections and vertical look.
- Starfield is camera-relative and uses GPU soft-point stars and a faint procedural Galactic dust lane. This backdrop is stylised rather than a star catalogue. A small sun sprite indicates the directional illumination source.
- Earth gets a separate translucent cloud sphere and fresnel day/night atmospheric rim, with added lunar maria and simple bump relief. Planet radii and apparent-size mathematics remain unchanged.
- Nearby instanced luminous rail hoops create motion and spatial cadence. Battery saver draws fewer hoops and disables the richer sky; reduced-motion freezes sky twinkle. The glass-roof observatory preserves the view behind and above.
- Desktop Chromium and a 390×844 touch-emulated Chromium viewport are verified with real WebGL, shader-console monitoring and screenshots. A physical midrange Android performance pass remains a device QA task.

## Round 09 geographic location selector

See `docs/GEO_SITE_PASS_QA.md` and `docs/PRODUCT_SCOPE_GEO_ADDON.md`. The game now has separately saved geographic Earth launch and Moon arrival selectors, a touch-friendly 3D pickable mini-globe, and a selected-site-based Earth–Moon guideway. Codex verified the full build and browser suite at desktop, portrait-mobile and landscape-mobile sizes. Round 08 visuals and creative construction remain intact; its camera controls were refined by later player feedback as described above. Freight/material management remains dormant. Geographic artwork is still stylised, and dynamically reattaching terminal rail to a spinning body remains future work.
