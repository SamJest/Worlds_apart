import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import * as THREE from 'three'
import { createEarthMoonRoute, EARTH_RADIUS, MOON_RADIUS } from '../src/simulation/astronomy.ts'
import { applyGuidewayPreset, defaultGuidewayDesign } from '../src/simulation/constructionPlan.ts'
import { evaluateGuideway } from '../src/simulation/constructionRoute.ts'

describe('3D construction route, verified with real Three.js in repository', () => {
  const templates = ['direct', 'arc', 'high', 'corkscrew', 'wave', 'slalom', 'dive']

  it('preserves exact departure and moving-Moon rendezvous for all route days', () => {
    for (const days of [2, 4, 6]) {
      const base = createEarthMoonRoute(days, 25)
      for (const kind of templates) {
        const result = evaluateGuideway(days, 25, applyGuidewayPreset(kind))
        assert.ok(result.valid, `${days}d ${kind}: ${result.warnings.join('; ')}`)
        assert.ok(result.route.curve.getPoint(0).distanceTo(base.start) < 0.00001)
        assert.ok(result.route.curve.getPoint(1).distanceTo(base.end) < 0.00001)
        assert.ok(result.route.arrivalMoon.distanceTo(base.arrivalMoon) < 0.00001)
        assert.ok(result.materialUnits > 0)
      }
    }
  })
  it('keeps selected geographic endpoints safe across every template and duration', () => {
    const sites = {
      start: { body: 'earth', latDeg: 51.8892, lonDeg: 0.9042, elevationMeters: 0, headingDeg: 90 },
      arrival: { body: 'moon', latDeg: 0, lonDeg: 0, elevationMeters: 0, headingDeg: 0 },
    }
    for (const days of [2, 4, 6]) for (const kind of templates) {
      const { route, valid, warnings } = evaluateGuideway(days, 25, applyGuidewayPreset(kind), sites)
      assert.equal(valid, true, `${days}d ${kind}: ${warnings.join('; ')}`)
      assert.deepEqual(route.sites, sites)
      for (let i = 1; i < 200; i++) {
        const position = route.curve.getPoint(route.curve.getUtoTmapping(i / 200))
        assert.ok(position.length() > EARTH_RADIUS, `${days}d ${kind} must clear Earth`)
        assert.ok(position.distanceTo(route.arrivalMoon) > MOON_RADIUS, `${days}d ${kind} must clear the Moon`)
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
    for (const kind of templates) {
      const { route, valid } = evaluateGuideway(4, 25, applyGuidewayPreset(kind))
      assert.equal(valid, true)
      for (let i = 1; i < 200; i++) {
        const position = route.curve.getPoint(i / 200)
        assert.ok(position.length() > EARTH_RADIUS, 'guideway must clear Earth')
        assert.ok(position.distanceTo(route.arrivalMoon) > MOON_RADIUS, 'guideway must clear arrival Moon')
      }
    }
  })
  it('keeps scenic tangents and carriage orientation smooth at ride sampling density', () => {
    const forward = new THREE.Vector3(0, 0, 1)
    for (const kind of ['corkscrew', 'wave', 'slalom', 'dive']) {
      const { route } = evaluateGuideway(4, 25, applyGuidewayPreset(kind))
      let previousTangent = route.curve.getTangent(0).normalize()
      let previousOrientation = new THREE.Quaternion().setFromUnitVectors(forward, previousTangent)
      for (let i = 1; i <= 1000; i++) {
        const routeT = route.curve.getUtoTmapping(i / 1000)
        const tangent = route.curve.getTangent(routeT).normalize()
        const orientation = new THREE.Quaternion().setFromUnitVectors(forward, tangent)
        assert.ok(previousTangent.angleTo(tangent) < THREE.MathUtils.degToRad(2.1), `${kind} tangent snapped at sample ${i}`)
        assert.ok(previousOrientation.angleTo(orientation) < THREE.MathUtils.degToRad(2.2), `${kind} carriage snapped at sample ${i}`)
        previousTangent = tangent
        previousOrientation = orientation
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
