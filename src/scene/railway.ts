import * as THREE from 'three'
import type { GameConfig } from '../config/gameConfig.ts'
import type { EarthMoonRoute } from '../simulation/astronomy.ts'
import { TrackOrientation } from './trackOrientation.ts'
import type { RideAtmosphere } from '../simulation/rideChoreography.ts'

/** Entire route is still visualised at astronomical scale; the magnetic guideway is fictional. */
export function createRailway(route: EarthMoonRoute, config: GameConfig) {
  const group = new THREE.Group()
  const geometries: THREE.BufferGeometry[] = []
  const railMaterial = new THREE.MeshStandardMaterial({ color: 0xb4d5e5, metalness: 0.8, roughness: 0.23, emissive: 0x2f8bbc, emissiveIntensity: 0.52 })
  const spineMaterial = new THREE.MeshBasicMaterial({ color: 0x1b547b })
  const sleeperMaterial = new THREE.MeshStandardMaterial({ color: 0x517586, metalness: 0.70, roughness: 0.26, emissive: 0x113f55, emissiveIntensity: 0.18 })
  const beaconMaterials = [
    new THREE.MeshBasicMaterial({ color: 0x67d9fc, transparent: true, opacity: 0.48, depthWrite: false }),
    new THREE.MeshBasicMaterial({ color: 0xffd6a1, transparent: true, opacity: 0.48, depthWrite: false }),
  ]
  const railConfig = config.scene.rail
  const gauge = (progress: number) => railConfig.endpointVisualGaugeWorldUnits + railConfig.openSpaceGaugeWorldUnits * Math.pow(Math.sin(Math.PI * progress), 2)
  const railPoints: [THREE.Vector3[], THREE.Vector3[]] = [[], []]
  const tangent = new THREE.Vector3()
  const side = new THREE.Vector3()
  const trackUp = new THREE.Vector3()
  const point = new THREE.Vector3()
  const orientation = new TrackOrientation(route.curve, railConfig.curveSamples, route.rideProfile)
  for (let index = 0; index <= railConfig.curveSamples; index++) {
    const progress = index / railConfig.curveSamples
    route.curve.getPoint(progress, point)
    orientation.frameAt(progress, tangent, trackUp, side)
    for (let rail = 0; rail < 2; rail++) {
      railPoints[rail].push(point.clone().addScaledVector(side, (rail ? 1 : -1) * gauge(progress) * 0.5).addScaledVector(trackUp, -0.006))
    }
  }
  for (const points of railPoints) {
    const geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), railConfig.curveSamples, railConfig.railVisualRadiusWorldUnits, 5, false)
    geometries.push(geometry)
    group.add(new THREE.Mesh(geometry, railMaterial))
  }
  const spineGeometry = new THREE.TubeGeometry(route.curve, Math.round(railConfig.curveSamples * 0.8), railConfig.railVisualRadiusWorldUnits * 0.6, 4, false)
  geometries.push(spineGeometry)
  group.add(new THREE.Mesh(spineGeometry, spineMaterial))

  const sleeperGeometry = new THREE.BoxGeometry(1, 0.012, 0.014)
  geometries.push(sleeperGeometry)
  const dummy = new THREE.Object3D()
  const sleepers = new THREE.InstancedMesh(sleeperGeometry, sleeperMaterial, railConfig.sleeperCount)
  for (let index = 0; index < railConfig.sleeperCount; index++) {
    const progress = (index + 0.5) / railConfig.sleeperCount
    route.curve.getPoint(progress, point)
    orientation.frameAt(progress, tangent, trackUp, side)
    dummy.position.copy(point).addScaledVector(trackUp, -0.013)
    orientation.quaternionAt(progress, dummy.quaternion)
    dummy.scale.set(gauge(progress) + 0.03, 1, 1)
    dummy.updateMatrix()
    sleepers.setMatrixAt(index, dummy.matrix)
  }
  sleepers.instanceMatrix.needsUpdate = true
  sleepers.computeBoundingSphere()
  group.add(sleepers)

  // The 310 permanent sleepers are thousands of kilometres apart. A small camera-local
  // instanced region adds visible structural cadence without creating thousands of meshes.
  const nearCount = 96
  const nearby = new THREE.InstancedMesh(sleeperGeometry, sleeperMaterial, nearCount)
  nearby.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  nearby.frustumCulled = false // its instances move; a cached bounding sphere is not meaningful
  group.add(nearby)

  // Receding luminous hoops supply speed and depth cues at astronomical scale.
  // They are fictional adaptive-rail hardware, never a physical space bridge.
  const gateCount = 22
  const gateGeometry = new THREE.TorusGeometry(0.088, 0.0016, 5, 30)
  geometries.push(gateGeometry)
  const gateMaterial = new THREE.MeshBasicMaterial({
    color: 0xb0edff, transparent: true, opacity: 0.22,
    depthWrite: false, blending: THREE.AdditiveBlending,
  })
  const gates = new THREE.InstancedMesh(gateGeometry, gateMaterial, gateCount)
  gates.frustumCulled = false
  gates.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  for (let index = 0; index < gateCount; index++) {
    gates.setColorAt(index, new THREE.Color(index % 5 === 0 ? 0xeebdff : index % 3 === 0 ? 0x89dfff : 0x6babe1))
  }
  if (gates.instanceColor) gates.instanceColor.needsUpdate = true
  group.add(gates)
  const iceAccent = new THREE.Color(0xb0edff)
  const violetAccent = new THREE.Color(0xe4abff)
  const goldAccent = new THREE.Color(0xffdbad)
  let lowDetail = false
  const halfWindowWorldUnits = 5.4
  const routeLengthWorldUnits = route.lengthKm / 1000

  const beaconGeometry = new THREE.TorusGeometry(0.20, 0.009, 6, 48)
  geometries.push(beaconGeometry)
  const beacons: THREE.Mesh[] = []
  for (const [index, progress] of [0.014, 0.982].entries()) {
    route.curve.getPoint(progress, point)
    orientation.frameAt(progress, tangent, trackUp, side)
    const mesh = new THREE.Mesh(beaconGeometry, beaconMaterials[index])
    mesh.position.copy(point)
    orientation.quaternionAt(progress, mesh.quaternion)
    group.add(mesh)
    beacons.push(mesh)
  }

  // Physical waypoint pylons identify the positions built by the player during the ride.
  // They do not assert that a real bridge could support the space-spanning guideway.
  for (const anchor of route.constructionAnchors ?? []) {
    const marker = new THREE.Mesh(beaconGeometry, beaconMaterials[1])
    marker.position.copy(anchor)
    orientation.quaternionAt(findNearestCurveFraction(route.curve, anchor), marker.quaternion)
    marker.scale.setScalar(1.5)
    group.add(marker)
    beacons.push(marker)
  }

  return {
    group,
    update(progress: number, reducedMotion = false, atmosphere?: RideAtmosphere) {
      for (let index = 0; index < nearCount; index++) {
        const offset = ((index + 0.5) / nearCount * 2 - 1) * halfWindowWorldUnits
        const lengthFraction = progress + offset / routeLengthWorldUnits
        if (lengthFraction < 0 || lengthFraction > 1) {
          dummy.scale.setScalar(0)
        } else {
          // u is arc-length fraction: near sleepers stay evenly spaced at bends.
          const t = route.curve.getUtoTmapping(lengthFraction, lengthFraction * routeLengthWorldUnits)
          route.curve.getPoint(t, point)
          orientation.frameAt(t, tangent, trackUp, side)
          dummy.position.copy(point).addScaledVector(trackUp, -0.013)
          orientation.quaternionAt(t, dummy.quaternion)
          dummy.scale.set(gauge(t) + 0.03, 1, 1)
        }
        dummy.updateMatrix()
        nearby.setMatrixAt(index, dummy.matrix)
      }
      nearby.instanceMatrix.needsUpdate = true
      if (gates.visible) {
        for (let i = 0; i < gates.count; i++) {
          // Along the track's arc length, so portal spacing is stable through loops.
          const offset = (i - 8) * (lowDetail ? 0.85 : 0.44)
          const fraction = progress + offset / routeLengthWorldUnits
          if (fraction < 0 || fraction > 1) {
            dummy.scale.setScalar(0)
          } else {
            const t = route.curve.getUtoTmapping(fraction, fraction * routeLengthWorldUnits)
            route.curve.getPoint(t, point)
            orientation.frameAt(t, tangent, trackUp, side)
            dummy.position.copy(point)
            orientation.quaternionAt(t, dummy.quaternion)
            dummy.scale.setScalar(1)
          }
          dummy.updateMatrix()
          gates.setMatrixAt(i, dummy.matrix)
        }
        gates.instanceMatrix.needsUpdate = true
      }
      const pulse = reducedMotion ? 1 : 0.88 + 0.12 * Math.sin(progress * 210)
      const energy = reducedMotion ? 0 : atmosphere?.energy ?? 0
      railMaterial.emissiveIntensity = 0.52 + 0.70 * energy
      gateMaterial.opacity = lowDetail ? 0.10 : 0.16 + 0.24 * energy
      gateMaterial.color.copy(iceAccent).lerp(violetAccent, atmosphere?.violetMix ?? 0).lerp(goldAccent, atmosphere?.goldMix ?? 0)
      for (const material of beaconMaterials) material.opacity = (0.45 + 0.3 * energy) * pulse
    },
    setQuality(quality: 'auto' | 'performance' | 'quality') {
      lowDetail = quality === 'performance'
      gates.count = lowDetail ? 10 : gateCount
      gateMaterial.opacity = lowDetail ? 0.10 : 0.22
    },
    dispose() {
      gateMaterial.dispose()
      geometries.forEach(geometry => geometry.dispose())
      railMaterial.dispose()
      spineMaterial.dispose()
      sleeperMaterial.dispose()
      beaconMaterials.forEach(material => material.dispose())
    },
  }
}

/** An infrequent, construction-time lookup for anchoring visual pylons to a spline. */
function findNearestCurveFraction(curve: THREE.Curve<THREE.Vector3>, point: THREE.Vector3): number {
  let chosen = 0, distance = Number.POSITIVE_INFINITY
  for (let i = 0; i <= 180; i++) {
    const t = i / 180
    const d = curve.getPoint(t).distanceToSquared(point)
    if (d < distance) { distance = d; chosen = t }
  }
  return chosen
}
