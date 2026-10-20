import test from 'node:test'
import assert from 'node:assert/strict'
import { defaultRoutePlan, evaluateIntercept, normalizeAngleDegrees, predictedMoonAngleDegrees, ROUTE_DURATION_OPTIONS } from '../src/simulation/routePlanner.ts'

test('all three durations predict progressively more lunar sweep', () => {
  const positions = ROUTE_DURATION_OPTIONS.map(predictedMoonAngleDegrees)
  assert.ok(positions[0] > 20 && positions[0] < 30)
  assert.ok(positions[0] < positions[1] && positions[1] < positions[2])
  assert.equal(evaluateIntercept(defaultRoutePlan).assessment, 'locked')
})

test('route launch requires interception within half a degree', () => {
  const assess = offsetDegrees => evaluateIntercept({ days: 4, offsetDegrees })
  assert.equal(assess(0.5).canLaunch, true)
  assert.equal(assess(-0.5).canLaunch, true)
  assert.equal(assess(0.6).assessment, 'correction')
  assert.equal(assess(3).assessment, 'correction')
  assert.equal(assess(-3.1).assessment, 'miss')
  assert.ok(assess(8).missDistanceKm > assess(2).missDistanceKm)
})

test('angular wrap correctly handles the -180/180 crossing', () => {
  assert.equal(normalizeAngleDegrees(181), -179)
  assert.equal(normalizeAngleDegrees(-181), 179)
  assert.equal(normalizeAngleDegrees(360), 0)
  assert.throws(() => normalizeAngleDegrees(Infinity), /finite/)
  assert.throws(() => predictedMoonAngleDegrees(-1), /positive/)
  assert.throws(() => evaluateIntercept({ days: 5, offsetDegrees: 0 }), /Invalid/)
})
