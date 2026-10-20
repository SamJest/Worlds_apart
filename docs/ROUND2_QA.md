# Round 2 acceptance checklist — run in real Chromium + physical audio device

## Desktop (1440×900), phone (390×844) and narrow landscape

1. Fresh reload shows existing Intro. Verify initial page is silent. Intro Settings opens; sound/motion choices survive reload.
2. Click PLOT YOUR ROUTE. No keyboard focus escapes the route dialog. Escape returns to Intro. Back and reopen work.
3. On orbit diagram: current and future Moon are separate, all three day presets change lunar sweep and approximate rail length. Drag the orange marker and use the angle slider; statuses change cleanly. Offset = 0° and ±0.5° allow launch, 0.6–3° warn and block, >3° show miss and block; SNAP returns to zero.
4. At each day preset (2, 4, 6): launch, inspect no stale old rail, moon moves according to new duration, HUD shows correct 2/4/6-day total, remains 3 real minutes at 1×. Check 0, 1, 5, 25, 50, 80, 95, 99.5 and 100% in first-person and external view; no Moon/Earth clipping or track discontinuities.
5. Controls: drag/swipe looking, external scroll zoom, Space pause, C camera, H cinematic, ← → seek, speed 1×/4×/16×, restart, and PLOT NEW ROUTE at arrival. Page hidden should pause; return should not silently resume.
6. Sound: silence before interaction; quiet drone and short launch/phase/arrival cues after launch. Settings mute stops output, slider adjusts without clicks, pausing and tab switch silence audio, restart/replan never cause stacked audio. Unavailable Web Audio must not break the scene.
7. Page in both normal/high-contrast/reduced-motion/low-quality modes; no horizontal document overflow; planner remains vertically scrollable and the buttons are reachable on narrow phones. Keyboard focus states readable.
8. Run `npm run check`, inspect console and browser page errors, capture screenshot and `?debug=1` FPS/frame-time/draw-call information at departure, cruise and approach in both sizes. Report **observed** numbers only.

## Explicit non-acceptance / deferred work

Moon/Earth landings or surface navigation, freeform 3D rail laying, actual orbital mechanics, economic gameplay, accounts, save files and additional planets. None are secretly finished by this patch.
