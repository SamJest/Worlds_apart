import test from 'node:test'
import assert from 'node:assert/strict'
import { scenicOffsetAt } from '../src/simulation/scenicProfile.ts'
import { applyGuidewayPreset, validateGuidewayDesign, addGuidewayNode } from '../src/simulation/constructionPlan.ts'

test('all creative templates join planets seamlessly', () => {
  for (const profile of ['corkscrew', 'wave', 'slalom', 'dive']) {
    const design = applyGuidewayPreset(profile)
    assert.deepEqual(scenicOffsetAt(0, profile), { lateralKm: 0, verticalKm: 0 })
    const nearEnd = scenicOffsetAt(1, profile)
    assert.ok(Math.abs(nearEnd.lateralKm) < 1e-7 && Math.abs(nearEnd.verticalKm) < 1e-7)
    assert.equal(validateGuidewayDesign(design)?.profile, profile)
    assert.equal(addGuidewayNode(design).profile, profile)
    assert.ok([0.2, 0.3, 0.5, 0.63, 0.8].some(t => {
      const value = scenicOffsetAt(t, profile)
      return Math.hypot(value.lateralKm, value.verticalKm) > 5000
    }), profile)
  }
})
test('old saved guideway remains compatible and malformed presets fail closed', () => {
  const old = { version: 1, nodes: [{ id: 1, fraction: 0.5, lateralKm: 0, verticalKm: 0 }] }
  assert.deepEqual(validateGuidewayDesign(old), old)
  assert.equal(validateGuidewayDesign({ ...old, profile: 'broken' }), null)
})
