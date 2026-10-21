# Round 11 — Cinematic ride director

Creative scope: **space rollercoaster spectacle only**. No freight, trading, material requirements, new menus or paywalls.

## Added

- Five deterministic, seek-safe energy peaks: launch, climb, weightlessness, stunt, and lunar approach. The timings and tint are soft curves rather than fixed scene changes.
- Glow colour/intensity of nearby rail hoops, beacons and rail emissive now responds to those moments.
- 72 instanced, additive fictional field fragments orbit/past the **carriage**, not distant astronomical stars. Count automatically limits to 48 on Auto or 24 on Battery Saver. No shader assets/downloads; all generated locally.
- A small (at most 5-degree) eased dynamic camera field-of-view to suggest acceleration, without camera shake. Disabled with Reduced Motion and when paused.
- Audio-engine hum and shimmer follow the same energy signal, with reduced-motion/sensory intensity fallback. No audio playback without a user gesture.

## Codex verification — 2026-10-21

- Full dependency install, product/tool tests, TypeScript build, Vite bundle and Playwright browser smoke: PASS.
- Touch-enabled Chromium at 390×844 and 844×390, Corkscrew at 20%, 45%, 65% and 90%: PASS. No clipping, flashing, horizon reset, horizontal overflow or WebGL/runtime errors appeared.
- First person, settled external view, 180° turn and backward Earth view: PASS. The established shared track/carriage/camera roll remains intact.
- Active/paused/reduced-motion comparison: PASS. Pause and Reduced Motion hide the field; Reduced Motion removes FOV expansion without levelling the physical track frame.
- Auto, Battery Saver and Highest Detail particle-count limits are regression tested at 48/24/72. Battery Saver remained clear and reduced the rendered particle geometry.
- The field fragments remain faint and local to the carriage. Earth, track, Moon sightline and mobile controls stayed legible; no fake translation of the distant starfield was observed.
- Existing browser coverage still launches all seven free presets and geographic site selection while freight entry points remain hidden.

## Limitations

Physical Android hardware and device temperature measurement are unavailable in this environment. Touch-enabled mobile Chromium and WebGL were verified in portrait and landscape; a physical-device comfort/thermal check remains recommended.
