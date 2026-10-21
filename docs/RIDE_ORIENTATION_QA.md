# Ride orientation upgrade — QA and acceptance

Base commit: `070080361f588ad41e5e60f565bdbfcbb01c01c4` (clean snapshot)

## Root causes confirmed

1. First-person yaw was ignored by `CameraController.look()`. The HUD exposed only four fixed facings; the requested backward-facing departure remains the initial view.
2. Rails/sleepers were oriented with a parallel-transport frame, while the carriage independently applied an almost-imperceptible bank. The rails, carriage, first-person and external camera were not all driven by exactly the same axial roll.
3. A spatially helical path does **not** necessarily rotate the train around its own forward axis: explicit rail cant/roll is required.

## Implemented

- Free 360° first-person yaw relative to the track heading, with vertical look preserved; facing shortcut buttons and tap-to-turn still work.
- Ride begins facing back toward the departure planet; the direction shortcuts and 180° control remain available in **both** views.
- Continuous axial roll built into `TrackOrientation` (the single frame source for physical twin rails, sleepers, luminous hoops, carriage and camera).
- Corkscrew: two axial barrel rolls with eased entry/exit. Other patterns: visibly stronger slalom, wave and dive banks. Corner-induced bank included even for custom classic turns.
- External follow camera uses track-frame up, not world-up. First-person yaw works while the whole local frame pitches and rolls.
- No change to economy, route save format, material rules or planet coordinate system.

## Integration results — 2026-10-21

- Supplied base commit and every source hash: PASS.
- Product tests, including exact two-turn axial roll, shared rail/carriage frame, camera-up inheritance and 360° first-person yaw: PASS (91/91).
- Change-tool safety tests: PASS (5/5).
- TypeScript and Vite production build: PASS.
- Playwright WebGL smoke at desktop and touch-enabled 390×844 mobile viewports: PASS, with no runtime or graphics-console errors.
- Visual touch-emulation inspection at 15%, 30%, 45%, 60%, 75% and 90%: PASS. The corkscrew remains continuous, sleepers and carriage stay aligned, and first- and third-person views inherit the roll without horizon resets.
- Portrait 390×844 and landscape 844×390: PASS. Camera/facing controls remain accessible without horizontal overflow.
- Physical Android hardware: NOT AVAILABLE in this environment. Touch-enabled mobile Chromium is verified; a final physical-device comfort/performance check remains recommended.

## Mandatory manual tests

1. On mobile choose **Corkscrew**, launch first person and scrub through 15%, 30%, 45%, 60%, 75%, 90% at slow speed. The rail crossbar, carriage canopy and sky should roll in unison, and orientation should change continuously with no abrupt inversion.
2. Swipe horizontally 360° in first person while the ride is moving. Earth must be visible looking back when it is in viewing range, and the camera must keep following the track when the player returns to front view.
3. Switch third person halfway through a barrel roll. The carriage must be rolled relative to its own rail sleepers. Follow camera should visibly roll with it without snapping.
4. Try Wave, Slalom, Dive and a custom arc. They must bank visibly. Classic should still ride, and both endpoints should be upright.
5. Test the same route on Android Chrome in portrait and landscape, normal/reduced-motion, 1x/4x/16x, jump with scrub, pause/resume, changing presets/replanning.
6. Check no geometry intersects the Moon or Earth during ride and that HUD touch targets remain accessible; ensure the FPS remains comfortable in battery-saving mode.

## Scope note

The axial corkscrew roll is intentionally fictional, not a physically safe passenger acceleration simulation. If the view feels too fast or motion-sickness-inducing, tune roll placement and duration or add a separate optional horizon-stabilisation accessibility mode — but **do not** silently level the carriage independently from its track or remove 360° free-look.
