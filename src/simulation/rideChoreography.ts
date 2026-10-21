import type { RideProfile } from './constructionPlan.ts'

/** Artistic spectacle, not a claim about physical acceleration in a vacuum. */
export interface RideAtmosphere {
  readonly energy: number
  readonly fieldOpacity: number
  readonly fovBoostDegrees: number
  readonly violetMix: number
  readonly goldMix: number
  readonly beat: 'launch' | 'climb' | 'weightless' | 'corkscrew' | 'moonfall' | 'cruise'
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))
const smoothstep = (value: number) => { const t = clamp01(value); return t * t * (3 - 2 * t) }
const pulse = (position: number, centre: number, width: number) => {
  const scaled = Math.abs(position - centre) / width
  if (scaled >= 1) return 0
  const s = 1 - scaled * scaled
  return s * s
}

/** Deterministic, seek-safe ride direction. No speed or fuel economy. */
export function rideAtmosphereAt(progress: number, profile: RideProfile = 'classic'): RideAtmosphere {
  const p = Number.isFinite(progress) ? clamp01(progress) : 0
  const launch = pulse(p, 0.075, 0.095)
  const climb = pulse(p, 0.255, 0.125)
  const weightless = pulse(p, 0.475, 0.135)
  const corkscrew = pulse(p, 0.685, 0.14)
  const moonfall = pulse(p, 0.925, 0.08)
  const stunt = profile === 'classic' ? 0.4 : profile === 'corkscrew' ? 1.0 : 0.78
  const energy = clamp01(0.16 + 0.47 * launch + 0.42 * climb + 0.44 * weightless + 0.55 * stunt * corkscrew + 0.58 * moonfall)
  let beat: RideAtmosphere['beat'] = 'cruise'
  let prominence = 0.2
  for (const [name, strength] of [
    ['launch', launch], ['climb', climb], ['weightless', weightless], ['corkscrew', stunt * corkscrew], ['moonfall', moonfall],
  ] as const) {
    if (strength > prominence) { beat = name; prominence = strength }
  }
  return {
    energy,
    // The wake is faint between moments and strongest during authored sequences.
    fieldOpacity: 0.12 + 0.48 * energy,
    fovBoostDegrees: 5.0 * energy,
    violetMix: smoothstep((p - 0.31) / 0.13) * (1 - smoothstep((p - 0.72) / 0.14)),
    goldMix: smoothstep((p - 0.76) / 0.14),
    beat,
  }
}
