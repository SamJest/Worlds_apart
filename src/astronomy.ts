import * as THREE from 'three'

// One world unit is 1,000 km. These are mean values, not visual exaggerations.
export const EARTH_RADIUS = 6.371
export const MOON_RADIUS = 1.7374
export const MOON_DISTANCE = 384.4
export const LUNAR_ORBIT_DAYS = 27.321661
export const JOURNEY_DAYS = 4
export const JOURNEY_SECONDS = 180
export const ORBIT_SWEEP = Math.PI * 2 * JOURNEY_DAYS / LUNAR_ORBIT_DAYS
export const START = new THREE.Vector3(EARTH_RADIUS + 0.035, 0, 0)

export function moonPosition(progress: number): THREE.Vector3 {
  const a = ORBIT_SWEEP * THREE.MathUtils.clamp(progress, 0, 1)
  return new THREE.Vector3(MOON_DISTANCE * Math.cos(a), 0, MOON_DISTANCE * Math.sin(a))
}

export const ARRIVAL_MOON = moonPosition(1)
const approach = ARRIVAL_MOON.clone().normalize()
export const END = ARRIVAL_MOON.clone().addScaledVector(approach, -(MOON_RADIUS + 0.025))

// The pre-built adaptive rail aims at the Moon's future position, not its initial one.
// Endpoint tangents leave Earth radially and reach the Moon from its near side.
const c1 = START.clone().add(new THREE.Vector3(104, 0, 0))
const c2 = END.clone().addScaledVector(approach, -104)
export const route = new THREE.CubicBezierCurve3(START, c1, c2, END)
export const routeLength = route.getLength() * 1000

export function apparentDiameterDegrees(radius: number, distance: number): number {
  if (distance <= radius) return 180
  return THREE.MathUtils.radToDeg(2 * Math.asin(radius / distance))
}
