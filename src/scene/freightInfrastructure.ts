import * as THREE from 'three'
import { EARTH_RADIUS } from '../simulation/astronomy.ts'
import type { FreightState } from '../simulation/freightEconomy.ts'

/**
 * Local Earth-orbit service. Distances, station dimensions and cargo technology are
 * fictional/visually exaggerated. It is separate from the astronomical Earth–Moon rail.
 */
export function createFreightInfrastructure() {
  const group = new THREE.Group()
  const geometries: THREE.BufferGeometry[] = []
  const materials: THREE.Material[] = []
  const metal = new THREE.MeshStandardMaterial({ color: 0x688da3, metalness: .7, roughness: .3 })
  const dark = new THREE.MeshStandardMaterial({ color: 0x213b50, metalness: .5, roughness: .48 })
  const luminous = new THREE.MeshBasicMaterial({ color: 0x85e3ee })
  const cargo = new THREE.MeshStandardMaterial({ color: 0xe2b76d, metalness: .35, roughness: .45 })
  const sidingMaterial = new THREE.MeshStandardMaterial({ color: 0xb0dccb, metalness: .7, roughness: .35 })
  materials.push(metal, dark, luminous, cargo, sidingMaterial)

  const path = new THREE.CatmullRomCurve3([
    new THREE.Vector3(EARTH_RADIUS + .08, .03, -.11),
    new THREE.Vector3(EARTH_RADIUS + .14, .06, -.16),
    new THREE.Vector3(EARTH_RADIUS + .27, .055, -.21),
    new THREE.Vector3(EARTH_RADIUS + .40, .035, -.23),
  ])
  const start = path.getPoint(0)
  const end = path.getPoint(1)
  const drawTube = (curve: THREE.Curve<THREE.Vector3>, radius: number, material: THREE.Material) => {
    const geometry = new THREE.TubeGeometry(curve, 72, radius, 6, false)
    geometries.push(geometry)
    const mesh = new THREE.Mesh(geometry, material)
    group.add(mesh)
    return mesh
  }
  const offset = new THREE.Vector3(0, .004, 0)
  const side = new THREE.Vector3(0, 0, .013)
  for (const sign of [-1, 1]) {
    const points = path.getPoints(48).map((point: THREE.Vector3) => point.clone().addScaledVector(side, sign).add(offset))
    drawTube(new THREE.CatmullRomCurve3(points), .0026, metal)
  }
  drawTube(path, .0018, dark)
  const sleeperGeometry = new THREE.BoxGeometry(.028, .004, .04)
  geometries.push(sleeperGeometry)
  const sleepers = new THREE.InstancedMesh(sleeperGeometry, dark, 29)
  const dummy = new THREE.Object3D()
  const along = new THREE.Vector3(1, 0, 0)
  for (let i = 0; i < 29; i++) {
    const t = (i + .5) / 29
    dummy.position.copy(path.getPoint(t))
    dummy.quaternion.setFromUnitVectors(along, path.getTangent(t))
    dummy.updateMatrix()
    sleepers.setMatrixAt(i, dummy.matrix)
  }
  sleepers.instanceMatrix.needsUpdate = true
  group.add(sleepers)

  const torusGeometry = new THREE.TorusGeometry(.036, .006, 7, 25)
  const pierGeometry = new THREE.CylinderGeometry(.018, .025, .027, 10)
  const globeGeometry = new THREE.SphereGeometry(.009, 12, 8)
  geometries.push(torusGeometry, pierGeometry, globeGeometry)
  for (const [index, position] of [start, end].entries()) {
    const platform = new THREE.Mesh(torusGeometry, index === 0 ? luminous : sidingMaterial)
    platform.position.copy(position)
    platform.rotation.x = Math.PI / 2
    group.add(platform)
    const base = new THREE.Mesh(pierGeometry, dark)
    base.position.copy(position).add(new THREE.Vector3(0, -.025, 0))
    group.add(base)
    const beacon = new THREE.Mesh(globeGeometry, luminous)
    beacon.position.copy(position).add(new THREE.Vector3(0, .044, 0))
    group.add(beacon)
  }

  const siding = drawTube(new THREE.CatmullRomCurve3([
    path.getPoint(.35).clone().add(new THREE.Vector3(0, 0, .005)),
    path.getPoint(.54).clone().add(new THREE.Vector3(0, 0, -.055)),
    end.clone().add(new THREE.Vector3(0, 0, -.055)),
  ]), .003, sidingMaterial)
  siding.visible = false
  const cargoGeometry = new THREE.BoxGeometry(.042, .025, .033)
  const windowGeometry = new THREE.BoxGeometry(.015, .010, .035)
  geometries.push(cargoGeometry, windowGeometry)
  const shuttle = new THREE.Group()
  const chassis = new THREE.Mesh(cargoGeometry, cargo)
  const window = new THREE.Mesh(windowGeometry, dark)
  window.position.set(.008, .006, 0)
  shuttle.add(chassis, window)
  group.add(shuttle)
  const stationExtensionGeometry = new THREE.BoxGeometry(.078, .014, .071)
  geometries.push(stationExtensionGeometry)
  const extension = new THREE.Mesh(stationExtensionGeometry, metal)
  extension.position.copy(end).add(new THREE.Vector3(.028, -.015, -.028))
  extension.visible = false
  group.add(extension)

  const forward = new THREE.Vector3(1, 0, 0)
  const update = (state: FreightState) => {
    const fraction = state.shipment ? 1 - state.shipment.secondsRemaining / state.shipment.totalSeconds : 0
    const t = THREE.MathUtils.clamp(fraction, 0, 1)
    shuttle.position.copy(path.getPoint(t)).add(offset)
    shuttle.quaternion.setFromUnitVectors(forward, path.getTangent(t))
    siding.visible = state.tier >= 1
    extension.visible = state.tier >= 2
  }
  const dispose = () => {
    for (const geometry of geometries) geometry.dispose()
    for (const material of materials) material.dispose()
  }
  return { group, update, dispose }
}
