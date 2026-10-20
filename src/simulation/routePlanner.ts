/** A small, deterministic game-rule model; this is not orbital trajectory physics. */
import { LUNAR_ORBIT_DAYS, EARTH_MOON_MEAN_DISTANCE_KM } from './astroConstants.ts'

export const LUNAR_PERIOD_DAYS = LUNAR_ORBIT_DAYS
export const MEAN_LUNAR_DISTANCE_KM = EARTH_MOON_MEAN_DISTANCE_KM
export const ROUTE_DURATION_OPTIONS = [2, 4, 6] as const
export type RouteDurationDays = typeof ROUTE_DURATION_OPTIONS[number]
export type InterceptAssessment = 'locked' | 'correction' | 'miss'

export interface RoutePlan {
  readonly days: RouteDurationDays
  /** Angular offset relative to the future lunar position, degrees. */
  readonly offsetDegrees: number
}

export const defaultRoutePlan: RoutePlan = { days: 4, offsetDegrees: 0 }

export function normalizeAngleDegrees(angle: number): number {
  if (!Number.isFinite(angle)) throw new Error('Expected a finite angle.')
  const value = ((angle + 180) % 360 + 360) % 360 - 180
  return Object.is(value, -0) ? 0 : value
}

export function predictedMoonAngleDegrees(days: number): number {
  if (!Number.isFinite(days) || days <= 0) throw new Error('Duration must be positive and finite.')
  return normalizeAngleDegrees(days / LUNAR_PERIOD_DAYS * 360)
}

export function evaluateIntercept(plan: RoutePlan) {
  if (!ROUTE_DURATION_OPTIONS.includes(plan.days) || !Number.isFinite(plan.offsetDegrees)) throw new Error('Invalid route plan.')
  const predictedDegrees = predictedMoonAngleDegrees(plan.days)
  const targetDegrees = normalizeAngleDegrees(predictedDegrees + plan.offsetDegrees)
  const differenceDegrees = Math.abs(normalizeAngleDegrees(targetDegrees - predictedDegrees))
  const missDistanceKm = 2 * MEAN_LUNAR_DISTANCE_KM * Math.sin(differenceDegrees * Math.PI / 360)
  const assessment: InterceptAssessment = differenceDegrees <= 0.5 + 1e-9 ? 'locked' : differenceDegrees <= 3 + 1e-9 ? 'correction' : 'miss'
  return { predictedDegrees, targetDegrees, differenceDegrees, missDistanceKm, assessment, canLaunch: assessment === 'locked' }
}
