import type { RideProfile } from './constructionPlan.ts'

const clamp01 = (value: number) => Math.max(0, Math.min(1, value))
const smoothstep = (value: number) => { const t = clamp01(value); return t * t * (3 - 2 * t) }

/**
 * Intentional rail cant measured in radians. Unlike ordinary changes in track
 * direction, axial rotations must be designed into the guideway and shared by
 * BOTH the rail cross-section and the carriage/cameras.
 *
 * A corkscrew completes exactly two full, smoothly introduced barrel rolls;
 * all profiles return to their initial upright orientation at the endpoints.
 */
export function designedTrackRoll(t: number, profile: RideProfile = 'classic'): number {
  const u = clamp01(t)
  const envelope = Math.sin(Math.PI * u) ** 2
  switch (profile) {
    case 'corkscrew': return 4 * Math.PI * smoothstep((u - 0.12) / 0.76)
    case 'wave': return 0.48 * envelope * Math.sin(u * 4 * Math.PI)
    case 'slalom': return 0.95 * envelope * Math.sin(u * 6 * Math.PI)
    case 'dive': return -0.72 * envelope * Math.sin(u * 3 * Math.PI)
    default: return 0
  }
}

/** Additional automatic cant based on local horizontal turning, bounded to 28°. */
export function turnBankRadians(sidewaysChange: number, t: number): number {
  if (!Number.isFinite(sidewaysChange) || !Number.isFinite(t)) return 0
  const envelope = Math.sin(Math.PI * clamp01(t)) ** 2
  return Math.max(-0.49, Math.min(0.49, -sidewaysChange * 4.2)) * envelope
}
