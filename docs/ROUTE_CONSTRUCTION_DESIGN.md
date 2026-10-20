# Route construction: preflight rendezvous design (round-2 implementation proposed)

## Player promise

The player decides **where and how the railway meets the Moon**, rather than watching a line draw itself to its *current* location. Confirmation immediately launches the existing immersive ride. The primary objective is curiosity and the view, not optimisation of fictional revenue.

## Scientific basis

- The Moon's sidereal period is approximately 27.321661 days. In the current simplified circular plane, the Moon advances about **52.7 degrees** during four simulated days.
- A fixed straight ray aimed at the Moon *where it is at departure* misses its destination four days later. The original code instead constructs a curved line to a **future lunar position**, and arrives 25 km above the surface.
- The game should present these as separate labels: **current Moon** (present position), **future Moon** (rendezvous marker), **proposed rail path** (fictional), and **travel time** (accelerated, not orbital mechanics).
- Do not imply orbital-insertion physics or realistic speed/acceleration. The adaptive rail fictionalises the entire structural/propulsion mechanism.

## Minimal playable interaction

A route-plan screen before the journey allows the player to:

1. Drag a target indicator on the Moon's predicted orbital arc, seeing how orbital movement changes the arrival location.
2. Select a journey duration preset (2, 4, or 6 **simulated days**) and see the rendezvous marker move accordingly.
3. See a ghost rail path with a direction arrow, current Moon, future Moon, approximate track length and an explanation of why the rail cannot simply target the departure Moon.
4. Press **CONFIRM ROUTE** to lock a valid intercept and start the existing ride.

For the first version, the target indicator can remain locked to the correct predicted position, with user adjustment producing clearly labelled *invalid miss* feedback. Avoid a fake promise that arbitrary player curves have realistic flight dynamics.

## Validation model

For trial duration `d` days, use the existing `moonPosition(1,d)` for expected centre and `createEarthMoonRoute(d,25)` for the baseline valid line. For manual target angle `a`, compare against `expectedAngle = 2πd/27.321661`. Feedback bands (gameplay decisions, not hard science):

- Target within 0.5° of predicted position: **rendezvous locked**.
- Target differs by 0.5°–3°: **correction needed**.
- Target differs by more than 3°: **missed intercept**; display a projected miss distance instead of allowing launch.

Use angular wrapping on -π..π (not a naive absolute difference across 360°). Once a baseline works, a small set of handcrafted optional railway bend presets (graceful arch / outer sweep) can expand player choice while preserving start/end and obstacle constraints.

## User experience and mobile

One main visualization, at most two sliders/segmented controls and a clear launch CTA. On a phone, the preview should take the upper 60% of available height and controls the lower 40%, without requiring precision dragging on a tiny Moon. Allow snap-to-rendezvous to keep completion easy. The cinematic ride HUD should not turn into a construction management screen.

## Acceptance tests for later milestone

- Current lunar position and moving target are mathematically distinct for nonzero simulated days.
- Selection of 2, 4 and 6 days changes predicted target location and length, without distorting Earth or Moon.
- Invalid intercept clearly explains its miss, never launching accidentally.
- Valid confirmation starts the existing route; camera, seek, speed, arrival and restart still work.
- Keyboard/touch on 390px phone and ordinary desktop are both supported.
- No invented construction economy, no saved route network and no route-building code until this milestone is selected.

## 2026-10-20 implementation note

The round-2 change pack implements a compact preflight **target-selection** planner with a top-down SVG model and real route rebuild after confirmation. Orbit angle error uses a pure, wrapped-angle model and a chord-distance approximation. Both drag and slider are available; snapping is explicit. The ghost line previews the **corrected rendezvous route**, not a guaranteed successful miss-target trajectory. A successful offset within 0.5° is automatically corrected to that trajectory when launching; this should be displayed explicitly to avoid an inaccurate physics claim. Three day presets are selectable.

Freeform waypoint placement, path editing, track construction costs, on-surface infrastructure and a transport economy remain future work.
