import * as THREE from 'three'
import type { GameConfig } from '../config/gameConfig.ts'
import type { EarthMoonRoute } from '../simulation/astronomy.ts'

const UP = new THREE.Vector3(0, 1, 0)
const FORWARD = new THREE.Vector3(0, 0, 1)

/** Entire route is still visualised at astronomical scale; the magnetic guideway is fictional. */
export function createRailway(route: EarthMoonRoute, config: GameConfig) {
  const group = new THREE.Group()
  const geometries: THREE.BufferGeometry[] = []
  const railMaterial = new THREE.MeshStandardMaterial({ color: 0x9ab7ca, metalness: 0.75, roughness: 0.3, emissive: 0x1a4b6b, emissiveIntensity: 0.35 })
  const spineMaterial = new THREE.MeshBasicMaterial({ color: 0x123d61 })
  const sleeperMaterial = new THREE.MeshStandardMaterial({ color: 0x416575, metalness: 0.65, roughness: 0.38 })
  const beaconMaterials = [
    new THREE.MeshBasicMaterial({ color: 0x67d9fc, transparent: true, opacity: 0.48, depthWrite: false }),
    new THREE.MeshBasicMaterial({ color: 0xffd6a1, transparent: true, opacity: 0.48, depthWrite: false }),
  ]
  const railConfig = config.scene.rail
  const gauge = (progress: number) => railConfig.endpointVisualGaugeWorldUnits + railConfig.openSpaceGaugeWorldUnits * Math.pow(Math.sin(Math.PI * progress), 2)
  const railPoints: [THREE.Vector3[], THREE.Vector3[]] = [[], []]
  const tangent = new THREE.Vector3()
  const side = new THREE.Vector3()
  const point = new THREE.Vector3()
  for (let index = 0; index <= railConfig.curveSamples; index++) {
    const progress = index / railConfig.curveSamples
    route.curve.getPoint(progress, point)
    route.curve.getTangent(progress, tangent).normalize()
    side.crossVectors(tangent, UP).normalize()
    for (let rail = 0; rail < 2; rail++) {
      railPoints[rail].push(point.clone().addScaledVector(side, (rail ? 1 : -1) * gauge(progress) * 0.5).addScaledVector(UP, -0.006))
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
    route.curve.getTangent(progress, tangent).normalize()
    dummy.position.copy(point).addScaledVector(UP, -0.013)
    dummy.quaternion.setFromUnitVectors(FORWARD, tangent)
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
  const halfWindowWorldUnits = 5.4
  const routeLengthWorldUnits = route.lengthKm / 1000

  const beaconGeometry = new THREE.TorusGeometry(0.20, 0.009, 6, 48)
  geometries.push(beaconGeometry)
  const beacons: THREE.Mesh[] = []
  for (const [index, progress] of [0.014, 0.982].entries()) {
    route.curve.getPoint(progress, point)
    route.curve.getTangent(progress, tangent).normalize()
    const mesh = new THREE.Mesh(beaconGeometry, beaconMaterials[index])
    mesh.position.copy(point)
    mesh.quaternion.setFromUnitVectors(FORWARD, tangent)
    group.add(mesh)
    beacons.push(mesh)
  }

  return {
    group,
    update(progress: number, reducedMotion = false) {
      for (let index = 0; index < nearCount; index++) {
        const offset = ((index + 0.5) / nearCount * 2 - 1) * halfWindowWorldUnits
        const lengthFraction = progress + offset / routeLengthWorldUnits
        if (lengthFraction < 0 || lengthFraction > 1) {
          dummy.scale.setScalar(0)
        } else {
          // u is arc-length fraction: near sleepers stay evenly spaced at bends.
          const t = route.curve.getUtoTmapping(lengthFraction, lengthFraction * routeLengthWorldUnits)
          route.curve.getPoint(t, point)
          route.curve.getTangent(t, tangent).normalize()
          dummy.position.copy(point).addScaledVector(UP, -0.013)
          dummy.quaternion.setFromUnitVectors(FORWARD, tangent)
          dummy.scale.set(gauge(t) + 0.03, 1, 1)
        }
        dummy.updateMatrix()
        nearby.setMatrixAt(index, dummy.matrix)
      }
      nearby.instanceMatrix.needsUpdate = true
      const pulse = reducedMotion ? 1 : 0.88 + 0.12 * Math.sin(progress * 210)
      for (const material of beaconMaterials) material.opacity = 0.48 * pulse
    },
    dispose() {
      geometries.forEach(geometry => geometry.dispose())
      railMaterial.dispose()
      spineMaterial.dispose()
      sleeperMaterial.dispose()
      beaconMaterials.forEach(material => material.dispose())
    },
  }
}
