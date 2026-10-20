# Audio design — Round 2 (proposed)

`src/audio/audioEngine.ts` uses Web Audio with two continuous low-level oscillators (62 Hz sine and 124.5 Hz triangle), plus short one-shot sweeps during launch, phase changes and arrival. No recorded samples, music loops, third-party assets or licence attribution are required. These tones are original code-generated sound, not packaged source audio. This is an ambience **placeholder**, not final sound design.

The AudioContext is instantiated only from the user's Confirm Route gesture or an explicit enable-sound setting gesture. The silent initial page cannot play audio. Sound starts enabled at 55% within preferences, but remains physically silent until the player clicks. It fades to zero when paused, hidden or finished. The volume and mute state are stored alongside other view settings, with robust fallback for private browsing and no-audio browsers. Reduced-motion preference removes subtle frequency movement (audio motion) as a comfort concession.

When replacing placeholder tones, keep explicit audio opt-out, honour gesture restrictions, avoid sudden loud cues, document source licences and test on mobile where AudioContext activation differs. Do not add large audio libraries without measurement.

## QA

- Fresh session produces no sound before clicking Confirm Route.
- Start muted and enabled; toggle after starting; drag volume to minimum and maximum, check audible smoothness.
- Pause, switch tabs, resume, finish, replay and replan without multiple overlapping drones.
- If Web Audio is unavailable or suspended, journey and settings must remain usable.
