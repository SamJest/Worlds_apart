# Prioritised backlog

## P1 — journey staging and camera comfort

- Player value: departure, cruise and arrival feel intentional rather than like one continuous camera move.
- Scope: camera easing, safe look limits, clearer Earth departure and Moon approach, reduced-motion consideration.
- Dependencies: current diagnostics and browser smoke fixtures.
- Acceptance: no body clipping; both camera modes remain usable at desktop/mobile; pause, seek and restart remain deterministic; before/after browser evidence and `npm run check` pass.
- Suggested owner: Codex (visual/browser integration).

## P1 — carriage and rail credibility

- Player value: structure communicates speed, direction and an inhabitable ride.
- Scope: coherent carriage exterior/interior cues, rail joins and visibility transitions; document remaining scale fiction.
- Dependencies: agreed visual brief; no economy systems.
- Acceptance: track remains continuous at sampled progress points, carriage orientation is stable, draw/triangle counts remain within an agreed budget, full journey has no obvious visual breaks.
- Suggested owner: normal ChatGPT for brief/content; Codex for Three.js implementation.

## P1 — accessibility and quality settings

- Player value: readable, comfortable play across more devices.
- Scope: reduced motion, contrast/focus review, keyboard help, automatic/low/high quality settings backed by meaningful renderer/star/geometry differences.
- Dependencies: performance measurements.
- Acceptance: settings validate, persist for the session, are keyboard operable, and browser/manual checks cover narrow mobile and reduced motion.
- Suggested owner: ChatGPT change pack for pure config/UI state; Codex for visual validation.

## P2 — lighting, bodies and starfield depth

- Player value: stronger wonder and spatial comprehension.
- Scope: improve procedural materials, terminators, atmosphere and star depth without enlarging bodies.
- Dependencies: performance budget and art direction.
- Acceptance: correct apparent-size telemetry remains; deterministic rendering and acceptable frame time at reference viewports; no unlicensed assets.
- Suggested owner: Codex.

## P2 — audio architecture

- Player value: motion and arrival gain weight.
- Scope: audio manager, mute/volume, ambience and cues; no autoplay before interaction.
- Dependencies: licensed or original assets and accessibility policy.
- Acceptance: graceful no-audio fallback, controls work, asset licences recorded, browser journey verified.
- Suggested owner: ChatGPT for design/acceptance; Codex for integration.

## P3 — route construction design prototype

- Player value: adds agency before the ride.
- Scope: written rules, trajectory guidance and a small route-confirmation interaction, explicitly without prices/resources.
- Dependencies: journey polish milestone complete.
- Acceptance: invalid choices explain why and a confirmed route starts the existing ride.
- Suggested owner: normal ChatGPT for design and copy, then Codex.

## Deferred

Transport economy, accounts/backend, save/load and additional destinations require separate milestone briefs. They are not incidental backlog tasks.
