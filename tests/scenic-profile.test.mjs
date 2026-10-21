import test from 'node:test'
import assert from 'node:assert/strict'
import { scenicOffsetAt } from '../src/simulation/scenicProfile.ts'
import { applyGuidewayPreset, validateGuidewayDesign, addGuidewayNode } from '../src/simulation/constructionPlan.ts'
test('all four wild profiles meet planet endpoints and save correctly', () => {
  for (const profile of ['corkscrew','wave','slalom','dive']) {
    assert.deepEqual(scenicOffsetAt(0,profile),{lateralKm:0,verticalKm:0})
    assert.ok(Math.hypot(...Object.values(scenicOffsetAt(1,profile)))<1e-8)
    assert.equal(validateGuidewayDesign(applyGuidewayPreset(profile))?.profile,profile)
    assert.equal(addGuidewayNode(applyGuidewayPreset(profile)).profile,profile)
  }
})
test('legacy designs still load and unknown profiles are rejected',()=>{
 const original={version:1,nodes:[{id:1,fraction:0.5,lateralKm:0,verticalKm:0}]}
 assert.deepEqual(validateGuidewayDesign(original),original)
 assert.equal(validateGuidewayDesign({...original,profile:'invalid'}),null)
})
