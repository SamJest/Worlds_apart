# Project state — 2026-10-20, ChatGPT round 2

## Current clean export (source of truth before applying this change pack)

Commit: `165dc69387d82ce705fba12b24bbbe4d5a2de9bd`. This is the exact commit recorded in `BASE_SNAPSHOT.json` and the only safe target of this change pack. The source export includes the **previous ChatGPT refinement implementation**, even though several documentation pages still describe it as pending; code takes precedence over stale prose.

### Present in exported repository

- Browser-based Three.js / TypeScript / Vite Earth-to-Moon ride, ~3 real minutes at 1×, faster 4× and 16×.
- Two cameras: first-person observation cabin and orbiting external view; pointer/touch look, mouse-wheel zoom and keyboard controls.
- Earth and Moon at mean radii and mean separation, Moon's simplified orbital motion during the fictional rail journey, and natural geometric apparent-size growth.
- Continuous adaptive route, detailed hollow carriage, instanced moving/permanent sleepers, terminal beacons, five journey phases, time-to-arrival and telemetry.
- Pause, seek, restart, quality presets, contrast/cinematic/reduced-camera-motion preferences and local persistence.
- Modular scene, UI and simulation, core unit tests, browser smoke tests, CI and hardened ChatGPT change-pack tools.

Verified by the earlier project documentation: foundational desktop/mobile browser checks and a complete 16× ride. The integration quality of every refinement visible in this particular exported source was **not independently retested in this ChatGPT sandbox**.

### New round-2 code — proposed, not committed and not browser-verified

- **Route planner:** preflight orbit diagram, 2/4/6 simulated-day travel presets, draggable/clickable orbital aim marker, ±12° angle slider, wrapped-angle intercept error, projected miss distance, disabled launch when misaligned, snap-to-intercept. The selected duration changes the real Three.js route and updates lunar movement and telemetry. Re-plan after arrival.
- **Audio:** asset-free, synthesized space-rail drone plus phase/arrival cues; only initialises on player interaction; mute/volume are stored in settings; no autoplay; safe unavailable-audio fallback.
- **Celestial motion:** simple Earth axial rotation and synchronized lunar rotation consistent with a tidally locked Moon in the simplified orbital plane.
- **Accessibility/quality:** focus isolation while planning; Escape to exit; planner pointer and keyboard/slider controls; settings accessible before launch; auto-pause when document becomes hidden.
- Extended planner, audio, preference and browser smoke tests.

Standalone Node unit tests for planner, audio and preference logic pass. Node TypeScript syntax checks pass. Full `npm run check`, real visual walkthrough and FPS capture **remain mandatory in the complete GitHub repository**. The ChatGPT context ZIP intentionally has no node_modules, lockfile, root HTML entry point or browser binaries; dependency installation in this isolated environment timed out.

### Not implemented

There is no passenger/cargo economy, track placement in 3D, resource extraction, station network, accounts, multiplayer or journey beyond the Moon. The planner adjusts a **predefined, mathematically predicted fictional rail**, not a freely drawn network or actual orbital transfer. The audio is synthesized, not recorded ambience. The Earth and Moon maps are procedural stylisations, not satellite imagery. Render/FPS targets have not been established with measurements.

## Recommended immediate sequence

1. Codex: validate exact SHA, apply the JSON, run locked build/unit/browser checks, inspect planner and ride on 1440×900 + 390×844; repair only verified integration/visual defects, then commit and push.
2. Export fresh `CHATGPT_CONTEXT.zip` from the clean commit and return to ChatGPT for next feature-heavy patch.
3. Next design milestone: interactive 3D railway laying / construction decisions before tackling a small, bounded transport economy.
