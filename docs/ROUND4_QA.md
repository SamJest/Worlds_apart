# Round 4 QA and integration checklist — must verify before GitHub merge

Base: `83f6f4b4d4b755a09f1d403a29d46a911baac63e` exported with a clean work tree. Round 3's geometry and UI are included in this baseline.

## Local checks performed on prepared change files

- **31/31** independent tests passed (8 existing pure-logic test files + 12 new freight tests) using Node 22 TypeScript strip mode. This does *not* include tests needing Three.js.
- **5/5** repository collaboration/change-tool tests passed.
- Global TypeScript `tsc --noEmit` reports only unresolved `three` imports because `node_modules` was omitted from the exported context. It reports **no other new TypeScript diagnostics** after the freight source type fix; this is not a full build pass.
- `npm install --offline` lacked cached `@types/three`, and regular `npm install` failed with EAI_AGAIN. Full `npm test`, Vite build, Playwright, 3D tests, WebGL image checks and mobile/manual audio still require Codex with repository dependencies available.

## Acceptance cases in the complete repository

1. Apply the change pack on the **exact clean base SHA** via `npm run change:check -- WORLDS_APART_ROUND4_CHANGE.json` then `npm run change:apply -- WORLDS_APART_ROUND4_CHANGE.json --apply`; never bypass the SHA/hash gate. Inspect diff first.
2. Run `npm ci`, `npm test`, `npm run test:tools`, `npm run build`, `npm run test:browser`. Investigate *real* failures and repair only needed source; do not fake/skip tests or loosen validation to get green.
3. At desktop **1440×900**, phone portrait **390×844**, and narrow landscape **844×390**: open Freight Yard from intro; see initial **500 alloy**, fixed two-stop line and idle shuttle. Dispatch 45, button disables; wait 18 seconds of active page time, arrive exactly once and add 45 alloy. Pause page by hiding tab: no offline auto-profit. Confirm no horizontal scroll and button touch heights ≥40 px.
4. Dispatch second shipment; first upgrade unlocked after 2 arrivals, costs 110, increases capacity to 75 and reduces time to 14 seconds. Deliver 4 further loads, buy second upgrade for 230: capacity 110 and duration 11 seconds. After final upgrade button disabled. Check 2D switch and 3D service models visibly change.
5. Open planner with some funds. Confirm correct cost according to **actual constructed 3D length**, and that affordability requires both guideway and intercept validity. Build a 2-day direct line. See alloy decrease by exactly priced rail units. Ride; seek, camera switch, pause, restart, arrival and replan work as before.
6. Re-open the **identical** layout and duration: `ALREADY BUILT` and **0 additional alloy**; a different duration or anchor geometry charges anew. Force low inventory with several new layouts or a controlled test fixture; cannot depart without funds, but Freight Yard button opens and returns to original blueprint without losing changes.
7. During a Moon ride open Freight Yard from header, dispatch a train, close; verify the orbital service train can be seen near Earth if looking towards the two nearby depots; Moon distance/scale and orbital intercepts remain unchanged. Check there's no graphical clipping at departure, no obvious station collision with Earth, no major frame-rate regression. Report debug FPS/triangles/draw calls.
8. Reload mid-shipment; remaining time preserved, no free reward. Reload after a completed purchase/upgrade; owned routes and inventory retained. Corrupt/missing localStorage values, blocked storage, NaN/out of-range payloads must not crash app.
9. Keyboard-only: Tab around freight modal, Shift+Tab wraps, Escape closes, focus returns to opener or planner duration controls as appropriate. Screen-reader names and status messages meaningful; contrast/reduced-motion settings still work.
10. Test all guideway templates for 2/4/6 days; run full browser journey and WebGL disposal/memory checks after multiple returns to route planner. Check mobile viewport and low quality preset.
11. Commit, push and export the new exact GitHub context ZIP for the next ChatGPT round. Provide measured failures/repairs; do not claim true free-placement station networks or mining production chains yet.

## Known design constraints

Freight station locations and tracks are currently fixed. A siding exists visually but not as a selectable railway branch. Shipment travel time is a gameplay abstraction. The 3D freight train is located near Earth; it will be very small from far down the interplanetary route.
