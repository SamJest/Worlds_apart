# Testing

## Automated checks

Install locked dependencies with `npm ci`. Run everything with:

```bash
npm run check
```

That command runs, in order:

- `npm test`: astronomy/route, configuration validation and journey-state tests.
- `npm run test:tools`: context export and change-pack safety fixtures.
- `npm run build`: strict TypeScript check plus production Vite bundle.
- `npm run test:browser`: starts an isolated Vite server and uses Playwright to launch all seven free coaster templates from a zero-material save, persist a dragged blueprint, repeat a ride, and exercise desktop (1440×900, diagnostics enabled) and mobile (390×844) camera/HUD flows.

Playwright needs Chromium. Install it with `npx playwright install chromium`; CI uses `npx playwright install --with-deps chromium`. The cloud image may instead use `/usr/bin/chromium`; override with `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` when required.

## Manual journey checklist

1. Run `npm run dev`, load the printed local URL and confirm no console/page errors.
2. Inspect intro composition, confirm freight/economy controls are absent, and choose **Build a space coaster**.
3. Preview and ride affected templates; confirm their track silhouettes differ, the carriage follows smoothly, Earth departure and Moon arrival remain clear, and natural Moon growth is preserved.
4. Switch first-person/external views with the button and `C`; drag/touch-look and external-view wheel zoom.
5. Pause/resume by button and Space; cycle 1×/4×/16×; use arrows and scrubber.
6. Complete the journey, verify the arrival card, then restart.
7. Repeat affected checks near 390×844 and ensure controls/HUD are readable with no horizontal overflow.
8. For performance work, repeat with `?debug=1` and record FPS/frame time/draws/triangles plus device/browser.

Automated smoke tests prove critical DOM/state transitions, not visual quality. Visual, camera and WebGL changes still require a human or Codex browser play-through.
