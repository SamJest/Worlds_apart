import type { RideProfile } from './constructionPlan.ts'
/** Space coaster offsets taper smoothly to zero at Earth and Moon. */
export function scenicOffsetAt(t: number, profile: RideProfile): { lateralKm: number; verticalKm: number } {
  if (profile === 'classic') return { lateralKm: 0, verticalKm: 0 }
  const u = Math.min(1, Math.max(0, t))
  const e = Math.sin(Math.PI * u) ** 2
  const phase = 2 * Math.PI * u
  if (profile === 'corkscrew') return { lateralKm: 36000 * e * Math.sin(2.5 * phase), verticalKm: 36000 * e * Math.cos(2.5 * phase) }
  if (profile === 'wave') return { lateralKm: 10000 * e * Math.sin(phase), verticalKm: 42000 * e * Math.sin(2 * phase) }
  if (profile === 'slalom') return { lateralKm: 40000 * e * Math.sin(3 * phase), verticalKm: 12000 * e * Math.cos(3 * phase) }
  return { lateralKm: 22000 * e * Math.sin(phase), verticalKm: 53000 * e * Math.cos(1.5 * phase) }
}
