# Use ChatGPT for more work and Codex for fewer, higher-value jobs

This workflow lets an ordinary ChatGPT chat see the current text source and return changes that can be checked and applied together. ChatGPT still cannot run the local game, inspect live WebGL through this file exchange, commit or push. Codex remains the final engineer for visual verification, difficult integration and GitHub operations.

## First time on your computer

Clone or open the repository and run:

```powershell
npm ci
npx playwright install chromium
npm run check
```

Keep the repository on a normal Windows drive if using the Windows-native Codex app.

## For a new piece of work

1. Make sure current work is committed and `git status` is clean.
2. Run `npm run context:export`.
3. Open a normal ChatGPT chat, attach `exports/CHATGPT_CONTEXT.zip`, and paste the prompt from `docs/CHATGPT_MASTER_PROMPT.md`.
4. Describe what you want. For design/planning, ask for a normal answer. For a suitable code/documentation edit, ask for a `worlds-apart.change-pack.v1` JSON file.
5. Download the returned JSON.
6. Check it without writing:

   ```powershell
   npm run change:check -- "C:\path\to\change.json"
   ```

7. Read the proposed JSON. If it matches the request, apply it explicitly:

   ```powershell
   npm run change:apply -- "C:\path\to\change.json" --apply
   ```

8. Review and test:

   ```powershell
   git diff
   npm run check
   npm run dev
   ```

9. Play the affected flow. Then ask Codex to inspect the diff, fix visual/integration issues, test, commit and push.

The apply tool creates a local backup before writing. It refuses packs when the repository moved to another commit, a target changed, or a path is unsafe. Export fresh context and ask ChatGPT to regenerate the pack; do not bypass the check.

## Good work for normal ChatGPT

- Game design, progression, interface copy and acceptance criteria.
- Research summaries and documented scientific assumptions.
- Roadmap, backlog, feedback and decision updates.
- Pure functions, configuration, state reducers and unit tests when every dependency is exported.
- Focused TypeScript/CSS/HTML refactors whose behaviour can be specified precisely.

## Use Codex directly for

- Live browser/WebGL inspection, screenshots and performance diagnosis.
- Three.js camera, lighting, material, geometry or animation-loop integration.
- Dependency installation, build failures and major cross-file changes.
- Audio/3D/binary assets, Git conflict resolution, security review, commits, pushes, CI and deployment.

## Token-saving habits

- Ask ChatGPT for a feature brief and acceptance checks before a large visual task.
- Bundle related edits but keep unrelated features separate.
- Keep `docs/PROJECT_STATE.md` current so each chat starts with reliable evidence.
- Finish and commit one stable change before exporting context for the next.
