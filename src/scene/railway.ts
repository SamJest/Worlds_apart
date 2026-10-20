import * as THREE from 'three'
import type { GameConfig } from '../config/gameConfig.ts'
import type { EarthMoonRoute } from '../simulation/astronomy.ts'

const UP = new THREE.Vector3(0, 1, 0)

export function createRailway(route: EarthMoonRoute, config: GameConfig) {
  const group = new THREE.Group()
  const geometries: THREE.BufferGeometry[] = []
  const railMaterial = new THREE.MeshStandardMaterial({ color: 0x9ab7ca, metalness: 0.75, roughness: 0.3, emissive: 0x1a4b6b, emissiveIntensity: 0.35 })
  const spineMaterial = new THREE.MeshBasicMaterial({ color: 0x123d61 })
  const sleeperMaterial = new THREE.MeshStandardMaterial({ color: 0x416575, metalness: 0.65, roughness: 0.38 })
  const railConfig = config.scene.rail
  const gauge = (progress: number) => railConfig.endpointVisualGaugeWorldUnits + railConfig.openSpaceGaugeWorldUnits * Math.pow(Math.sin(Math.PI * progress), 2)
  const railPoints: [THREE.Vector3[], THREE.Vector3[]] = [[], []]
  for (let index = 0; index <= railConfig.curveSamples; index++) {
    const progress = index / railConfig.curveSamples
    const point = route.curve.getPoint(progress)
    const tangent = route.curve.getTangent(progress).normalize()
    const side = new THREE.Vector3().crossVectors(tangent, UP).normalize()
    for (let rail = 0; rail < 2; rail++) railPoints[rail].push(point.clone().addScaledVector(side, (rail ? 1 : -1) * gauge(progress) * 0.5).addScaledVector(UP, -0.006))
  }
  for (const points of railPoints) {
    const geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), railConfig.curveSamples, railConfig.railVisualRadiusWorldUnits, 5, false)
    geometries.push(geometry)
    group.add(new THREE.Mesh(geometry, railMaterial))
  }
  const spineGeometry = new THREE.TubeGeometry(route.curve, Math.round(railConfig.curveSamples * 0.8), railConfig.railVisualRadiusWorldUnits, 4, false)
  geometries.push(spineGeometry)
  group.add(new THREE.Mesh(spineGeometry, spineMaterial))
  const sleeperGeometry = new THREE.BoxGeometry(1, 0.012, 0.014)
  geometries.push(sleeperGeometry)
  const sleepers = new THREE.InstancedMesh(sleeperGeometry, sleeperMaterial, railConfig.sleeperCount)
  const dummy = new THREE.Object3D()
  const forward = new THREE.Vector3(0, 0, 1)
  for (let index = 0; index < railConfig.sleeperCount; index++) {
    const progress = (index + 0.5) / railConfig.sleeperCount
    const point = route.curve.getPoint(progress)
    const tangent = route.curve.getTangent(progress).normalize()
    dummy.position.copy(point).addScaledVector(UP, -0.013)
    dummy.quaternion.setFromUnitVectors(forward, tangent)
    dummy.scale.set(gauge(progress) + 0.03, 1, 1)
    dummy.updateMatrix()
    sleepers.setMatrixAt(index, dummy.matrix)
  }
  sleepers.instanceMatrix.needsUpdate = true
  group.add(sleepers)
  return {
    group,
    dispose() {
      geometries.forEach(geometry => geometry.dispose())
      railMaterial.dispose()
      spineMaterial.dispose()
      sleeperMaterial.dispose()
    },
  }
}
