import * as THREE from 'three'
import { EARTH_RADIUS } from '../simulation/astronomy.ts'
import { initialLocalNetwork, shortestRailPath, stationById, type LocalRailNetwork, type LocalStation } from '../simulation/localRailNetwork.ts'
import type { FreightState } from '../simulation/freightEconomy.ts'
import { EXTRA_TRAIN_IDS, type FleetState, type FleetShipment } from '../simulation/fleetOperations.ts'

/** Visual mapping of the user-built local schematic. This is deliberately an exaggerated
 * Earth-orbit construction zone, not a claim of geostationary orbital dynamics. */
export function localStationWorldPosition(station: LocalStation): THREE.Vector3 {
  const x = (station.x - 93) / 328
  return new THREE.Vector3(EARTH_RADIUS + .08 + x * .32, .03 + (145 - station.y) * .00065,
    -.11 - x * .12 + (station.y - 145) * .0009)
}

export function createFreightInfrastructure() {
  const group = new THREE.Group()
  const networkGroup = new THREE.Group()
  group.add(networkGroup)
  const metal = new THREE.MeshStandardMaterial({ color: 0x83b4c6, metalness: .72, roughness: .33 })
  const base = new THREE.MeshStandardMaterial({ color: 0x24465e, metalness: .52, roughness: .45 })
  const platform = new THREE.MeshStandardMaterial({ color: 0x77d4c2, metalness: .55, roughness: .4 })
  const cargo = new THREE.MeshStandardMaterial({ color: 0xe9c27d, metalness: .25, roughness: .35 })
  const light = new THREE.MeshBasicMaterial({ color: 0xaaf3e7 })
  const trainBMaterial = new THREE.MeshStandardMaterial({ color: 0x9e91e6, metalness: .5, roughness: .35 })
  const trainCMaterial = new THREE.MeshStandardMaterial({ color: 0xe89c7b, metalness: .5, roughness: .35 })
  const materials = [metal, base, platform, cargo, light, trainBMaterial, trainCMaterial]
  const stationRingGeometry = new THREE.TorusGeometry(.019, .0038, 7, 18)
  const stationBaseGeometry = new THREE.CylinderGeometry(.014, .019, .013, 10)
  const beaconGeometry = new THREE.SphereGeometry(.006, 10, 8)
  const sleeperGeometry = new THREE.BoxGeometry(.009, .003, .026)
  const carriageGeometry = new THREE.BoxGeometry(.027, .017, .021)
  const cargoGeometry = new THREE.BoxGeometry(.018, .008, .017)
  const sharedGeometries = [stationRingGeometry, stationBaseGeometry, beaconGeometry, sleeperGeometry, carriageGeometry, cargoGeometry]
  const dynamicGeometries: THREE.BufferGeometry[] = []
  const carriage = new THREE.Group()
  carriage.add(new THREE.Mesh(carriageGeometry, metal))
  const crate = new THREE.Mesh(cargoGeometry, cargo)
  crate.position.y = .011
  carriage.add(crate)
  group.add(carriage)
  const extraCarriages = EXTRA_TRAIN_IDS.map((id, i) => {
    const train = new THREE.Group()
    train.add(new THREE.Mesh(carriageGeometry, i === 0 ? trainBMaterial : trainCMaterial))
    const crate = new THREE.Mesh(cargoGeometry, cargo)
    crate.position.y = .011
    train.add(crate)
    train.visible = false
    group.add(train)
    return { id, train }
  })
  const vectorX = new THREE.Vector3(1, 0, 0)
  const pointA = new THREE.Vector3(), pointB = new THREE.Vector3()
  let signature = ''
  const rebuild = (network: LocalRailNetwork) => {
    while (networkGroup.children.length) {
      const child = networkGroup.children[0]
      if (child instanceof THREE.InstancedMesh) child.dispose()
      networkGroup.remove(child)
    }
    for (const geo of dynamicGeometries.splice(0)) geo.dispose()
    for (const edge of network.links) {
      const a = stationById(network, edge.a)!, b = stationById(network, edge.b)!
      const start = localStationWorldPosition(a), end = localStationWorldPosition(b)
      const line = new THREE.LineCurve3(start, end)
      const tangent = end.clone().sub(start).normalize()
      const lateral = new THREE.Vector3(0, 1, 0).cross(tangent).normalize().multiplyScalar(.008)
      for (const sign of [-1, -.4, .4, 1]) {
        const offset = lateral.clone().multiplyScalar(sign)
        const tube = new THREE.TubeGeometry(new THREE.LineCurve3(start.clone().add(offset), end.clone().add(offset)), 12, Math.abs(sign) < .5 ? .0009 : .0017, 5, false)
        dynamicGeometries.push(tube)
        networkGroup.add(new THREE.Mesh(tube, metal))
      }
      const count = Math.max(2, Math.min(50, Math.round(start.distanceTo(end) / .012)))
      const sleepers = new THREE.InstancedMesh(sleeperGeometry, base, count)
      const tmp = new THREE.Object3D()
      for (let i = 0; i < count; i++) {
        tmp.position.copy(line.getPoint((i + .5) / count))
        tmp.quaternion.setFromUnitVectors(vectorX, tangent)
        tmp.updateMatrix()
        sleepers.setMatrixAt(i, tmp.matrix)
      }
      sleepers.instanceMatrix.needsUpdate = true
      networkGroup.add(sleepers)
    }
    for (const station of network.stations) {
      const origin = localStationWorldPosition(station)
      const torus = new THREE.Mesh(stationRingGeometry, station.id === 's0' ? light : platform)
      torus.rotation.x = Math.PI / 2
      torus.position.copy(origin)
      const pier = new THREE.Mesh(stationBaseGeometry, base)
      pier.position.copy(origin).add(new THREE.Vector3(0, -.014, 0))
      const beacon = new THREE.Mesh(beaconGeometry, light)
      beacon.position.copy(origin).add(new THREE.Vector3(0, .021, 0))
      networkGroup.add(torus, pier, beacon)
    }
  }

  /** Calculates a vehicle position on its purchased rail sequence without extrapolating.
   * This also handles paths with two or more intermediate junctions. */
  const positionOnPath = (stops: readonly string[], length: number, fraction: number, target: THREE.Group) => {
    let remaining = length * THREE.MathUtils.clamp(fraction, 0, 1)
    for (let i = 1; i < stops.length; i++) {
      const a = stationById(activeNetwork, stops[i - 1])!, b = stationById(activeNetwork, stops[i])!
      const segment = Math.hypot(b.x - a.x, b.y - a.y)
      const alpha = Math.min(1, remaining / segment)
      pointA.copy(localStationWorldPosition(a))
      pointB.copy(localStationWorldPosition(b))
      target.position.copy(pointA).lerp(pointB, alpha)
      target.quaternion.setFromUnitVectors(vectorX, pointB.sub(pointA).normalize())
      remaining = Math.max(0, remaining - segment)
      if (remaining < 1e-5) break
    }
  }
  let activeNetwork = initialLocalNetwork()
  const update = (freight: FreightState, network: LocalRailNetwork = initialLocalNetwork(), fleet?: FleetState) => {
    activeNetwork = network
    const currentSignature = network.stations.map(s => `${s.id},${s.x},${s.y}`).join('|')
      + '/' + network.links.map(l => `${l.a}:${l.b}`).join('|')
    if (currentSignature !== signature) { signature = currentSignature; rebuild(network) }
    const path = network.activePath ?? (freight.shipment ? shortestRailPath(network, 's1') : null)
    const fraction = freight.shipment ? THREE.MathUtils.clamp(1 - freight.shipment.secondsRemaining / freight.shipment.totalSeconds, 0, 1) : 0
    if (!path) {
      carriage.position.copy(localStationWorldPosition(network.stations[0]))
      carriage.quaternion.identity()
    } else positionOnPath(path.stops, path.length, fraction, carriage)
    for (const { id, train } of extraCarriages) {
      const job: FleetShipment | null = fleet?.jobs[id] ?? null
      train.visible = job !== null
      if (job) positionOnPath(job.path, job.length, 1 - job.secondsRemaining / job.totalSeconds, train)
    }
  }
  const dispose = () => {
    networkGroup.traverse((object: THREE.Object3D) => { if (object instanceof THREE.InstancedMesh) object.dispose() })
    for (const geometry of dynamicGeometries) geometry.dispose()
    for (const geometry of sharedGeometries) geometry.dispose()
    for (const material of materials) material.dispose()
  }
  update({ shipment: null } as FreightState, initialLocalNetwork())
  return { group, update, dispose }
}
