import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createEarthMoonRoute, EARTH_RADIUS, MOON_RADIUS } from '../src/simulation/astronomy.ts'
import { applyGuidewayPreset, defaultGuidewayDesign } from '../src/simulation/constructionPlan.ts'
import { evaluateGuideway } from '../src/simulation/constructionRoute.ts'

describe('3D construction route, verified with real Three.js in repository', () => {
  it('preserves exact departure and moving-Moon rendezvous for all route days', () => {
    for (const days of [2, 4, 6]) {
      const base = createEarthMoonRoute(days, 25)
      for (const kind of ['direct', 'arc', 'high']) {
        const result = evaluateGuideway(days, 25, applyGuidewayPreset(kind))
        assert.ok(result.valid, `${days}d ${kind}: ${result.warnings.join('; ')}`)
        assert.ok(result.route.curve.getPoint(0).distanceTo(base.start) < 0.00001)
        assert.ok(result.route.curve.getPoint(1).distanceTo(base.end) < 0.00001)
        assert.ok(result.route.arrivalMoon.distanceTo(base.arrivalMoon) < 0.00001)
        assert.ok(result.materialUnits > 0)
      }
    }
  })
  it('really reroutes the carriage through editable 3D construction anchors', () => {
    const base = createEarthMoonRoute(4, 25)
    const result = evaluateGuideway(4, 25, applyGuidewayPreset('high'))
    assert.equal(result.nodes.length, 2)
    assert.ok(result.nodes.every(node => node.y > 35), 'anchors must be elevated 40 world units')
    assert.ok(Math.abs(result.route.curve.getPoint(.50).y) > 20, 'actual rail must leave orbital plane')
    assert.ok(result.route.lengthKm > base.lengthKm, 'detour consumes more material')
  })
  it('avoids collision with both planetary bodies for valid templates', () => {
    for (const kind of ['direct', 'arc', 'high']) {
      const { route, valid } = evaluateGuideway(4, 25, applyGuidewayPreset(kind))
      assert.equal(valid, true)
      for (let i = 1; i < 200; i++) {
        const position = route.curve.getPoint(i / 200)
        assert.ok(position.length() > EARTH_RADIUS, 'guideway must clear Earth')
        assert.ok(position.distanceTo(route.arrivalMoon) > MOON_RADIUS, 'guideway must clear arrival Moon')
      }
    }
  })
  it('unchanged anchor positions preserve the baseline journey', () => {
    const route = evaluateGuideway(4, 25, defaultGuidewayDesign())
    const baseline = createEarthMoonRoute(4, 25)
    assert.equal(route.route.lengthKm, baseline.lengthKm)
    assert.ok(route.route.constructionAnchors?.length === 1)
  })
  it('rejects corrupt inputs without generating arbitrary geometry', () => {
    const result = evaluateGuideway(4, 25, { version: 1, nodes: [{ id: 7, fraction: 0.5, lateralKm: 1e12, verticalKm: 0 }] })
    assert.equal(result.valid, false)
    assert.match(result.warnings.join(' '), /Invalid/)
  })
})
