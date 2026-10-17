import test from 'node:test'
import assert from 'node:assert/strict'
import { ARRIVAL_MOON, EARTH_RADIUS, END, MOON_DISTANCE, MOON_RADIUS, ORBIT_SWEEP, START, apparentDiameterDegrees, moonPosition, route } from '../src/astronomy.ts'

test('the Moon starts at its familiar angular size and orbits during travel', () => {
  const startingAngle = apparentDiameterDegrees(MOON_RADIUS, moonPosition(0).distanceTo(START))
  assert.ok(startingAngle > .51 && startingAngle < .53, `angular diameter ${startingAngle}`)
  assert.ok(ORBIT_SWEEP > .9 && ORBIT_SWEEP < 1)
  assert.ok(Math.abs(moonPosition(.5).length() - MOON_DISTANCE) < 1e-9)
})
test('continuous rail meets departure and lunar near-side approach', () => {
  assert.ok(route.getPoint(0).distanceTo(START) < 1e-9)
  assert.ok(route.getPoint(1).distanceTo(END) < 1e-9)
  assert.ok(Math.abs(END.distanceTo(ARRIVAL_MOON) - MOON_RADIUS - .025) < 1e-9)
  assert.ok(START.length() > EARTH_RADIUS)
  for(let i=0;i<=100;i++) assert.ok(Number.isFinite(route.getPoint(i/100).length()))
})
