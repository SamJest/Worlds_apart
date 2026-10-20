# Codex handoff — Round 3: player-built 3D guideway

**Exact required HEAD:** `12c6b8500029a02cbd13ed2d23d0190145806062` (verified from `CHATGPT_CONTEXT (2).zip` snapshot metadata). If HEAD differs, stop and ask for a new context export / reviewed rebase; do not disable safeguards.

1. Extract `WORLDS_APART_ROUND3_CHANGE.json` from this ZIP into the existing `SamJest/Worlds_apart` GitHub repo clone.
2. Run `npm run change:check -- WORLDS_APART_ROUND3_CHANGE.json`, inspect it, then `npm run change:apply -- WORLDS_APART_ROUND3_CHANGE.json --apply`.
3. `npm ci && npm run check`. This exported snapshot lacks dependencies, index.html and other non-exported support files; **keep the existing complete repo files**.
4. Complete `docs/ROUND3_QA.md` including THREE route tests, 2/4/6-day template checks and visual desktop/mobile 3D. Repair only proven integration/visual defects, record QA evidence in `docs/ROUND3_QA.md` or an integration report.
5. Commit and push if green; do not include `node_modules`, captured binaries, build results, backup directory or the handoff ZIP in Git history.
6. On the clean commit run `npm run context:export` and return the new ZIP to ChatGPT. The next ChatGPT round can design/build the transport economy to save Codex tokens.

**Features:** real Catmull-Rom rail spline through up to three user-authored 3D anchors; interactive map drag, in-plane/out-of-plane sliders, three route templates, rotatable WebGL blueprint, material allowance/validation, visible rail pylons, save/reload, HUD/arrival built-track data and expanded tests. No new npm dependencies; Three.js already exists in package.json.

**Important limitations:** This is still a bounded editor, not freeform segment-by-segment railway networks. Materials are an allowance, not a harvested or earnable economic resource. Do not hide these limitations or claim orbital-transfer physics.
