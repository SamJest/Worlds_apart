import * as THREE from 'three'
import { rotatedSiteDirection, type RideSites } from './surfaceSites.ts'
import type { RideProfile } from './constructionPlan.ts'

import { KILOMETRES_PER_WORLD_UNIT, EARTH_RADIUS_KM, MOON_RADIUS_KM, EARTH_MOON_MEAN_DISTANCE_KM, LUNAR_ORBIT_DAYS } from './astroConstants.ts'
export { KILOMETRES_PER_WORLD_UNIT, EARTH_RADIUS_KM, MOON_RADIUS_KM, EARTH_MOON_MEAN_DISTANCE_KM, LUNAR_ORBIT_DAYS } from './astroConstants.ts'

export const EARTH_RADIUS = EARTH_RADIUS_KM / KILOMETRES_PER_WORLD_UNIT
export const MOON_RADIUS = MOON_RADIUS_KM / KILOMETRES_PER_WORLD_UNIT
export const MOON_DISTANCE = EARTH_MOON_MEAN_DISTANCE_KM / KILOMETRES_PER_WORLD_UNIT

export interface EarthMoonRoute {
  readonly simulatedDays: number
  readonly orbitSweepRadians: number
  readonly start: THREE.Vector3
  readonly arrivalMoon: THREE.Vector3
  readonly end: THREE.Vector3
  readonly curve: THREE.Curve<THREE.Vector3>
  readonly lengthKm: number
  readonly constructionAnchors?: readonly THREE.Vector3[]
  readonly sites?: RideSites
  readonly rideProfile?: RideProfile
}

export function moonPosition(progress: number, simulatedDays: number): THREE.Vector3 {
  const sweep = Math.PI * 2 * simulatedDays / LUNAR_ORBIT_DAYS
  const angle = sweep * THREE.MathUtils.clamp(progress, 0, 1)
  return new THREE.Vector3(MOON_DISTANCE * Math.cos(angle), 0, MOON_DISTANCE * Math.sin(angle))
}

export function createEarthMoonRoute(simulatedDays: number, arrivalAltitudeKm: number, sites?: RideSites): EarthMoonRoute {
  if (!Number.isFinite(simulatedDays) || simulatedDays <= 0) throw new Error('simulatedDays must be positive.')
  if (!Number.isFinite(arrivalAltitudeKm) || arrivalAltitudeKm <= 0) throw new Error('arrivalAltitudeKm must be positive.')
  const orbitSweepRadians = Math.PI * 2 * simulatedDays / LUNAR_ORBIT_DAYS
  // Existing no-sites callers retain their original geometry. New creative routes are
  // attached to body-fixed departure and destination sites at their respective times.
  const startDirection = sites ? rotatedSiteDirection(sites.start, 1.55) : undefined
  const startNormal = startDirection ? new THREE.Vector3(...startDirection).normalize() : new THREE.Vector3(1,0,0)
  const start = startNormal.clone().multiplyScalar(EARTH_RADIUS + 0.035 + (sites?.start.elevationMeters ?? 0) / (KILOMETRES_PER_WORLD_UNIT * 1000))
  const arrivalMoon = moonPosition(1, simulatedDays)
  const approach = arrivalMoon.clone().normalize()
  const lunarDirection = sites ? new THREE.Vector3(...rotatedSiteDirection(sites.arrival, Math.PI - orbitSweepRadians)) : approach.clone().negate()
  const end = arrivalMoon.clone().addScaledVector(lunarDirection, MOON_RADIUS + arrivalAltitudeKm / KILOMETRES_PER_WORLD_UNIT)
  const firstControl = start.clone().addScaledVector(startNormal, 104)
  const secondControl = end.clone().addScaledVector(lunarDirection, 104)
  const curve = new THREE.CubicBezierCurve3(start, firstControl, secondControl, end)
  return { simulatedDays, orbitSweepRadians, start, arrivalMoon, end, curve, lengthKm: curve.getLength() * KILOMETRES_PER_WORLD_UNIT, ...(sites ? { sites } : {}) }
}

export function apparentDiameterDegrees(radius: number, distance: number): number {
  if (distance <= radius) return 180
  return THREE.MathUtils.radToDeg(2 * Math.asin(radius / distance))
}
