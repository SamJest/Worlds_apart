import * as THREE from 'three'
import { createEarthMoonRoute, EARTH_RADIUS, KILOMETRES_PER_WORLD_UNIT, MOON_RADIUS, type EarthMoonRoute } from './astronomy.ts'
import { validateGuidewayDesign, type GuidewayDesign } from './constructionPlan.ts'

export interface GuidewayAssessment {
  readonly route: EarthMoonRoute
  readonly nodes: readonly THREE.Vector3[]
  readonly valid: boolean
  readonly warnings: readonly string[]
  readonly extraLengthKm: number
  readonly materialUnits: number
  readonly baselineMaterialUnits: number
}

/** Orient each lateral offset perpendicular to the local default journey tangent. */
export function guidewayAnchor(reference: EarthMoonRoute, fraction: number, lateralKm: number, verticalKm: number): THREE.Vector3 {
  const position = reference.curve.getPoint(fraction)
  const tangent = reference.curve.getTangent(fraction).normalize()
  const sideways = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize()
  return position.addScaledVector(sideways, lateralKm / KILOMETRES_PER_WORLD_UNIT)
    .add(new THREE.Vector3(0, verticalKm / KILOMETRES_PER_WORLD_UNIT, 0))
}

/**
 * Adaptive fictional rail routed through every player's real 3D construction anchor.
 * Ends are constrained to preserve the rendezvous, departure orientation and lunar approach.
 * An unobstructed route is required; this is not a gravitational trajectory solver.
 */
export function evaluateGuideway(simulatedDays: number, arrivalAltitudeKm: number, draft: GuidewayDesign): GuidewayAssessment {
  const baseline = createEarthMoonRoute(simulatedDays, arrivalAltitudeKm)
  const validated = validateGuidewayDesign(draft)
  if (!validated) return {
    route: baseline, nodes: [], valid: false, warnings: ['Invalid guideway layout. Reset the construction plan.'],
    extraLengthKm: 0, materialUnits: Math.ceil(baseline.lengthKm / 1000), baselineMaterialUnits: Math.ceil(baseline.lengthKm / 1000),
  }
  const nodes = validated.nodes.map(node => guidewayAnchor(baseline, node.fraction, node.lateralKm, node.verticalKm))
  if (!nodes.length || nodes.every((point, i) => point.distanceTo(baseline.curve.getPoint(validated.nodes[i].fraction)) < 0.00001)) return {
    route: { ...baseline, constructionAnchors: nodes }, nodes, valid: true, warnings: [], extraLengthKm: 0,
    materialUnits: Math.ceil(baseline.lengthKm / 1000), baselineMaterialUnits: Math.ceil(baseline.lengthKm / 1000),
  }

  // Endpoint control points keep the departure and arrival locally aligned with the original route.
  const firstControl = baseline.start.clone().addScaledVector(baseline.curve.getTangent(0).normalize(), 55)
  const lastControl = baseline.end.clone().addScaledVector(baseline.curve.getTangent(1).normalize(), -55)
  const points = [baseline.start.clone(), firstControl, ...nodes, lastControl, baseline.end.clone()]
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal', 0.5)
  curve.arcLengthDivisions = 512
  const lengthKm = curve.getLength() * KILOMETRES_PER_WORLD_UNIT
  const route: EarthMoonRoute = { ...baseline, curve, lengthKm, constructionAnchors: nodes }
  const warnings: string[] = []
  // Constraint is a game-design construction allowance, not a monetary/material economy.
  if (lengthKm > baseline.lengthKm * 1.20) warnings.push('Material allowance exceeded: shorten the planned detour.')
  // Protect the Earth and the future arrival Moon, not merely their current markers.
  for (let i = 1; i < 250; i++) {
    const fraction = i / 250
    const position = curve.getPoint(fraction)
    if (position.length() < EARTH_RADIUS + 0.025) {
      warnings.push('Guideway intersects Earth. Move or remove an anchor.')
      break
    }
    if (position.distanceTo(baseline.arrivalMoon) < MOON_RADIUS + arrivalAltitudeKm / KILOMETRES_PER_WORLD_UNIT - 0.001) {
      warnings.push('Guideway intersects the Moon before its terminal approach.')
      break
    }
  }
  // Disallow excessively abrupt curvature where a carriage would snap its direction.
  let maximumStepAngle = 0
  for (let i = 1; i < 120; i++) {
    const before = curve.getTangent((i - 1) / 120).normalize()
    const after = curve.getTangent(i / 120).normalize()
    maximumStepAngle = Math.max(maximumStepAngle, before.angleTo(after))
  }
  if (maximumStepAngle > THREE.MathUtils.degToRad(20)) warnings.push('Guideway bend is too sharp. Soften the anchor offsets.')
  return {
    route, nodes, valid: warnings.length === 0, warnings,
    extraLengthKm: Math.round(lengthKm - baseline.lengthKm),
    materialUnits: Math.ceil(lengthKm / 1000), baselineMaterialUnits: Math.ceil(baseline.lengthKm / 1000),
  }
}
