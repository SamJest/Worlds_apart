import test from 'node:test'
import assert from 'node:assert/strict'
import { EARTH_RADIUS, MOON_DISTANCE, MOON_RADIUS, apparentDiameterDegrees, createEarthMoonRoute, moonPosition } from '../src/simulation/astronomy.ts'

const route = createEarthMoonRoute(4, 25)

test('the Moon starts at its familiar angular size and orbits during travel', () => {
  const startingAngle = apparentDiameterDegrees(MOON_RADIUS, moonPosition(0, 4).distanceTo(route.start))
  assert.ok(startingAngle > 0.51 && startingAngle < 0.53, `angular diameter ${startingAngle}`)
  assert.ok(route.orbitSweepRadians > 0.9 && route.orbitSweepRadians < 1)
  assert.ok(Math.abs(moonPosition(0.5, 4).length() - MOON_DISTANCE) < 1e-9)
})
test('continuous rail meets departure and lunar near-side approach', () => {
  assert.ok(route.curve.getPoint(0).distanceTo(route.start) < 1e-9)
  assert.ok(route.curve.getPoint(1).distanceTo(route.end) < 1e-9)
  assert.ok(Math.abs(route.end.distanceTo(route.arrivalMoon) - MOON_RADIUS - 0.025) < 1e-9)
  assert.ok(route.start.length() > EARTH_RADIUS)
  for (let index = 0; index <= 100; index++) assert.ok(Number.isFinite(route.curve.getPoint(index / 100).length()))
})

test('route inputs reject impossible values', () => {
  assert.throws(() => createEarthMoonRoute(0, 25), /simulatedDays/)
  assert.throws(() => createEarthMoonRoute(4, -1), /arrivalAltitudeKm/)
})
