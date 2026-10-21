import type { RideProfile } from './constructionPlan.ts'

/** All effects taper to zero at both planets; these are fantastical ride shapes. */
export function scenicOffsetAt(t: number, profile: RideProfile): { lateralKm: number; verticalKm: number } {
  if (profile === 'classic') return { lateralKm: 0, verticalKm: 0 }
  const u = Math.min(1, Math.max(0, t))
  const envelope = Math.sin(Math.PI * u) ** 2
  const phase = Math.PI * 2 * u
  if (profile === 'corkscrew') return {
    lateralKm: 36000 * envelope * Math.sin(phase * 2.5),
    verticalKm: 36000 * envelope * Math.cos(phase * 2.5),
  }
  if (profile === 'wave') return { lateralKm: 10000 * envelope * Math.sin(phase), verticalKm: 42000 * envelope * Math.sin(phase * 2) }
  if (profile === 'slalom') return { lateralKm: 40000 * envelope * Math.sin(phase * 3), verticalKm: 12000 * envelope * Math.cos(phase * 3) }
  return { lateralKm: 22000 * envelope * Math.sin(phase), verticalKm: 53000 * envelope * Math.cos(phase * 1.5) }
}
