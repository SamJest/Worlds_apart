# Round 5 QA and Codex acceptance

## Source provenance

Export base commit: `867a42d592eb009d78c59f7182ff2c71a4f7f9df` from `CHATGPT_CONTEXT (4).zip` (clean source, Round 4 integrated). Round 5 files were authored outside GitHub in the ChatGPT environment and are **not committed**. Change pack must be applied only to this exact Git commit and matching file contents.

## Tests carried out here

- 11 new standalone network tests pass: geometry constraints, station cap, undirected edge uniqueness, no-path handling, Dijkstra routing, load/ore limits, storage persistence, corrupt-save rejection, route-dependent dispatch and one-time material credit.
- Existing standalone tests can run with Node's TypeScript strip-types loader, without npm-installed packages. The full test set depends on Three.js and cannot all execute in the source-only export.
- `tsc --noEmit` produces only unresolved `three` module errors in this sandbox (missing installed dependency), not attributable errors in other modules. This is **not** proof the full build succeeds.
- Full `npm run check`, Three.js scene tests, Playwright, audio and manual WebGL/mobile views remain required.

## Integration checklist for Codex

1. Compare `BASE_SNAPSHOT.json` and supplied source files; run the repo's `npm run change:check -- WORLDS_APART_ROUND5_CHANGE.json` (adapt path) against clean HEAD. Never bypass the hash/commit protections.
2. Apply `--apply`, inspect diff, run `npm ci` or `npm install` as appropriate then `npm run check`. Fix TypeScript/compiler, runtime and layout regressions. `tests/browser-smoke.mjs` now includes a separate small-screen local-network end-to-end path.
3. Open the Freight console immediately from Intro: exactly 2 initial stations / 1 connected track, 500 rail alloy, 250 ore and dispatch available. Original 18s 45-unit shuttle still works.
4. Build Outpost 1 at (260,80). Wallet drops by 65. Choose it as destination; dispatch must be disabled until a paid connection from Earth Depot is built. Verify clicking the schematic as well as keyboard numeric inputs.
5. Build Outpost 2 at (365,66), connect from Outpost 1, choose it as destination, inspect the highlighted 2-hop route. Dispatch should subtract ore and show a moving train along **both links** (schematic and 3D). Arrival credits alloy exactly once.
6. Reload while travelling and reopen Freight: stations, connections, route, ore, in-flight cargo, ETA and selected destination remain. Switch to Moon construction, start one 2-day route, move the cameras/seek/restart/replan; confirm the existing core journey and blueprint costs still work.
7. Test the viewport at 390×844 and at desktop 1440×900. Check modal focus trap, Escape, tap targets, no horizontal scrolling, contrast, page errors, GPU leaks when repeatedly editing, and mobile performance.
8. Record browser evidence and summary of any fixes. Commit and push only after checks pass, then export a clean `CHATGPT_CONTEXT.zip` and include the new commit SHA for the next iteration.

## Known limits

- Station positions cannot be moved or removed after purchase; no refunds.
- Only **one** freight service (Earth source to player-selected destination) runs at a time; graph routing and changing destinations work but there is no timetable or independent trains.
- Single finite ore supply regenerates while the page is visible; no destination demand, processing industry or pricing.
- Existing freight economy and the new network live in separate localStorage records; saved writes are not fully atomic.
- Railway segment crossings are not automatic switch nodes; connect station endpoints explicitly.
- This snapshot lacked `node_modules`, so actual 3D appearance and performance remain **unverified** locally.
