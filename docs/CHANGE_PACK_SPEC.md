# ChatGPT change-pack format

The format is for bounded UTF-8 text changes. It cannot install dependencies, execute commands, manipulate Git, commit, push or write binary assets.

```json
{
  "schema": "worlds-apart.change-pack.v1",
  "title": "Short description",
  "baseCommit": "40-character Git commit from the export",
  "baseFiles": {
    "src/example.ts": "64-character SHA-256 from the export",
    "src/new-file.ts": null
  },
  "changes": [
    {
      "path": "src/example.ts",
      "action": "write",
      "content": "Complete replacement UTF-8 file content\n"
    },
    {
      "path": "src/new-file.ts",
      "action": "write",
      "content": "export const example = true\n"
    }
  ],
  "suggestedChecks": ["npm test", "npm run build"],
  "manualChecks": ["Begin the journey and switch both camera modes"],
  "notes": "Assumptions or limitations"
}
```

For deletion use `"action": "delete"` and omit `content`. `baseFiles` must include every changed path. Existing files use their exact exported SHA-256. New files use `null`; application fails if that path already exists.

Accepted targets are ordinary files under `src/`, `tests/`, `docs/`, `public/` or `scripts/`, plus README, AGENTS, package/TypeScript/Vite configuration and `.gitignore`. Absolute paths, traversal, empty/hidden path components, backslashes, symlinks and duplicate paths are rejected.

The tool checks the exact base commit and every target hash before any write. It validates all operations first and stores previous content in `.worlds-apart-change-backups/`. It never trusts or executes `suggestedChecks`; the user or Codex reviews the JSON/diff and runs checks separately.

Complete-file replacements are easier to validate than arbitrary patches. Limits are 100 changes, 1 MB per replacement and 3 MB for the JSON pack. A stale commit or target hash is a reason to export fresh context, never to weaken the safeguards.
