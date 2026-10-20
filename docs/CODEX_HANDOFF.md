# Codex handoff: journey-refinement change pack

## Goal

Apply and validate the enclosed **WORLDs APART Journey Refinement** change pack, **not** redesign the game or add economy features. The patch is written and scoped by ChatGPT. Codex should spend tokens only on merge review, missing-file/build issues, tests, browser validation, and any genuinely observed defects.

## Apply to the exact exported base

The attached `WORLD_APART_REFINEMENT_CHANGE.json` targets Git commit `6ed4f5e88bd8bcfd35a07843a9f93644adc653d1`, with hashes from `CHATGPT_CONTEXT.zip` dated 2026-10-20 14:25 UTC. If HEAD differs, **do not bypass the validator**: inspect changed files, rebase this patch against the new committed source, or request a fresh ChatGPT export. Do not overwrite another contributor's edits.

1. Copy the JSON to the repository root (or another local path).
2. `npm run change:check -- WORLD_APART_REFINEMENT_CHANGE.json`
3. Review file content/diff, then `npm run change:apply -- WORLD_APART_REFINEMENT_CHANGE.json --apply`
4. `npm ci` if needed, then `npm run check`.
5. In a real Chromium browser, inspect the checkpoints below and fix **only** observed issues.
6. Commit and push the validated result. Export a new `CHATGPT_CONTEXT.zip` from a clean committed tree for the next ChatGPT iteration.

The JSON is complete-file replacements; do not ask Codex to rewrite them merely for style.

## What was implemented

- Mission phases: departure → Earth ascent → open space → lunar approach → arrival, with a time-remaining indicator and deterministic seeking.
- Real-time quality presets (Auto/Battery saver/Highest detail) that change render pixel ratio and star draw range.
- Persistent preferences for reduced camera motion, enhanced HUD contrast and cinematic (hidden HUD) view; settings accessible from the top-right, H toggles cinematic view, ? opens options. Opening options pauses the ride.
- Frame-rate-independent external camera following, collision prevention *after* easing, and seek-snap behaviour.
- Arc-length distance mapping for the carriage: the 0–100% timeline now spans approximately equal route distance per tick, while the Moon's **orbital** position remains proportional to simulated time.
- Rebuilt hollow observation cabin so first-person camera isn't inside an opaque box.
- Rail gauge retuned to remain close to the carriage; 96 nearby instanced sleepers update along the route, plus two large station beacon rings. No new third-party assets or dependencies.
- Expanded browser smoke coverage for options, seek-phase, mobile overflow and cinematic mode; new pure mission-phase unit tests.

## Required browser checkpoints

Desktop 1440×900 and mobile 390×844, start, seek and inspect both camera modes at 0%, 1%, 5%, 25%, 50%, 80%, 95%, 99.5%, and 100%. Check first-person can see through the front observation window. Confirm the new continuous narrow rails remain visually attached to the guideway, nearby sleepers remain aligned around bends, beacon rings are sensible and the Moon is never visually resized. Check the Earth and Moon do not clip into the external camera. Check reduced-motion, options dialog keyboard Escape, high contrast, toggling H twice, the Performance quality control and page reload persistence. Verify no uncaught errors or horizontal overflow.

Check render-time & FPS with `?debug=1` in actual play at desktop and mobile. Compare before/after if the baseline was recorded. Avoid making numerical performance claims without measurements. The nearby sleeper dynamic buffer updates 96 instance matrices per frame; if mobile perf is harmed, shrink that instance count and remeasure.

## Known limitation in this ChatGPT session

The context export deliberately excludes the repository's `package-lock.json`, `index.html`, .github files and asset binaries. It is *not* a standalone clone; npm's registry was unreachable in the sandbox. Consequently a full production build and Chromium smoke test could not be run against the original full repository here. The new pure phase and preference tests were run with Node's explicit TypeScript-stripping flag (also wired into the package test command for Node 22); Codex must perform the full locked-dependency validation on the actual repository.

## Do not implement yet

No resource mining, money, cargo economies, accounts, multiplayer, extra planets or backend. These require their own milestones. `docs/ROUTE_CONSTRUCTION_DESIGN.md` is a design input for the next milestone, not authorisation to introduce transport economy.
