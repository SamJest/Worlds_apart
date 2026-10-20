import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  addGuidewayNode, applyGuidewayPreset, defaultGuidewayDesign,
  readGuidewayDesign, removeGuidewayNode, saveGuidewayDesign,
  updateGuidewayNode, validateGuidewayDesign, GUIDEWAY_STORAGE_KEY,
} from '../src/simulation/constructionPlan.ts'

describe('player guideway construction design', () => {
  it('starts with one editable anchor', () => {
    const design = defaultGuidewayDesign()
    assert.equal(design.nodes.length, 1)
    assert.deepEqual(validateGuidewayDesign(design), design)
  })
  it('adds no more than three distinctly spaced anchors', () => {
    let design = defaultGuidewayDesign()
    for (let i = 0; i < 10; i++) design = addGuidewayNode(design)
    assert.equal(design.nodes.length, 3)
    assert.ok(design.nodes.every((node, i) => !i || node.fraction - design.nodes[i - 1].fraction >= 0.12))
    assert.deepEqual(validateGuidewayDesign(design), design)
  })
  it('modifies only selected anchor, clamps displacement, supports deletion', () => {
    const design = addGuidewayNode(defaultGuidewayDesign())
    const selected = design.nodes[0].id
    const changed = updateGuidewayNode(design, selected, { lateralKm: 9999999, verticalKm: -9999999 })
    assert.equal(changed.nodes[0].lateralKm, 85000)
    assert.equal(changed.nodes[0].verticalKm, -60000)
    assert.equal(changed.nodes[1].lateralKm, 0)
    assert.equal(removeGuidewayNode(changed, selected).nodes.length, 1)
  })
  it('preset routes remain valid and simple direct preset uses no anchors', () => {
    for (const name of ['direct', 'arc', 'high']) {
      const design = applyGuidewayPreset(name)
      assert.deepEqual(validateGuidewayDesign(design), design)
    }
    assert.equal(applyGuidewayPreset('direct').nodes.length, 0)
  })
  it('refuses invalid and malicious persistent state', () => {
    for (const value of [null, {}, { version: 2, nodes: [] },
      { version: 1, nodes: [{ id: 1, fraction: NaN, lateralKm: 0, verticalKm: 0 }] },
      { version: 1, nodes: [{ id: 1, fraction: .2, lateralKm: 0, verticalKm: 0 }, { id: 1, fraction: .4, lateralKm: 0, verticalKm: 0 }] },
      { version: 1, nodes: [{ id: 1, fraction: .3, lateralKm: 0, verticalKm: 0 }, { id: 2, fraction: .32, lateralKm: 0, verticalKm: 0 }] },
      { version: 1, nodes: [{ id: 1, fraction: .3, lateralKm: 85001, verticalKm: 0 }] },
    ]) assert.equal(validateGuidewayDesign(value), null)
  })
  it('persists safely, tolerates corruption and storage unavailability', () => {
    const memory = new Map()
    const store = { setItem: (key, value) => memory.set(key, value), getItem: key => memory.get(key) ?? null }
    assert.equal(saveGuidewayDesign(applyGuidewayPreset('arc'), store), true)
    assert.deepEqual(readGuidewayDesign(store), applyGuidewayPreset('arc'))
    memory.set(GUIDEWAY_STORAGE_KEY, '{broken')
    assert.deepEqual(readGuidewayDesign(store), defaultGuidewayDesign())
    assert.equal(saveGuidewayDesign(applyGuidewayPreset('direct'), { setItem() { throw Error('blocked') } }), false)
    assert.deepEqual(readGuidewayDesign({ getItem() { throw Error('blocked') } }), defaultGuidewayDesign())
  })
})
