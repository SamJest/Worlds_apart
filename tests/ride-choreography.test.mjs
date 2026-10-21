import test from 'node:test'
import assert from 'node:assert/strict'
import { rideAtmosphereAt } from '../src/simulation/rideChoreography.ts'

const profiles = ['classic', 'corkscrew', 'wave', 'slalom', 'dive']
test('all stunt profiles have finite, bounded scenery controls throughout the ride', () => {
  for (const profile of profiles) for (let i = 0; i <= 200; i++) {
    const a = rideAtmosphereAt(i / 200, profile)
    assert.ok(a.energy >= 0 && a.energy <= 1)
    assert.ok(a.fieldOpacity >= 0 && a.fieldOpacity <= 1)
    assert.ok(a.fovBoostDegrees >= 0 && a.fovBoostDegrees <= 5)
    assert.ok(a.violetMix >= 0 && a.violetMix <= 1)
    assert.ok(a.goldMix >= 0 && a.goldMix <= 1)
  }
})
test('ride moments are visible, smoothly seekable and stages have different colour', () => {
  assert.equal(rideAtmosphereAt(0.1).violetMix, 0)
  assert.ok(rideAtmosphereAt(0.55).violetMix > 0.95)
  assert.ok(rideAtmosphereAt(0.95).goldMix > 0.95)
  assert.ok(rideAtmosphereAt(.925).energy > rideAtmosphereAt(.82).energy)
  assert.ok(rideAtmosphereAt(.685, 'corkscrew').energy > rideAtmosphereAt(.685, 'classic').energy)
  for (let i = 1; i <= 2000; i++) {
    const after = rideAtmosphereAt(i / 2000)
    const before = rideAtmosphereAt((i - 1) / 2000)
    assert.ok(Math.abs(after.energy - before.energy) < .025)
    assert.ok(Math.abs(after.violetMix - before.violetMix) < .025)
    assert.ok(Math.abs(after.goldMix - before.goldMix) < .025)
  }
})
test('progress is clamped and invalid telemetry falls back safely', () => {
  assert.deepEqual(rideAtmosphereAt(-1), rideAtmosphereAt(0))
  assert.deepEqual(rideAtmosphereAt(5), rideAtmosphereAt(1))
  assert.deepEqual(rideAtmosphereAt(NaN), rideAtmosphereAt(0))
})
