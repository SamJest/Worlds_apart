import * as THREE from 'three'
import type { CameraController, CameraMode, FacingDirection } from '../camera/cameraController.ts'
import type { GameConfig } from '../config/gameConfig.ts'
import type { QualityPreset } from '../ui/viewPreferences.ts'
import { EARTH_RADIUS, KILOMETRES_PER_WORLD_UNIT, MOON_RADIUS, apparentDiameterDegrees, type EarthMoonRoute } from '../simulation/astronomy.ts'
import { createCelestialBodies } from './bodies.ts'
import { createCarriage } from './carriage.ts'
import { createEnvironment } from './environment.ts'
import { createRailway } from './railway.ts'
import { createFreightInfrastructure } from './freightInfrastructure.ts'
import type { FreightState } from '../simulation/freightEconomy.ts'
import type { FleetState } from '../simulation/fleetOperations.ts'
import type { LocalRailNetwork } from '../simulation/localRailNetwork.ts'
import { TrackOrientation } from './trackOrientation.ts'

export interface Telemetry {
  progress: number
  earthDistanceKm: number
  moonDistanceKm: number
  moonAngularDiameterDegrees: number
  simulatedDays: number
  cameraMode: CameraMode
  cameraFacing: FacingDirection
  worldPosition: THREE.Vector3
}

export class WorldScene {
  readonly renderer: THREE.WebGLRenderer
  readonly camera: THREE.PerspectiveCamera
  private readonly scene = new THREE.Scene()
  private readonly environment
  private readonly bodies
  private railway
  private readonly carriage
  private readonly freightInfrastructure
  private readonly point = new THREE.Vector3()
  private readonly tangent = new THREE.Vector3()
  private readonly frameUp = new THREE.Vector3()
  private readonly frameSide = new THREE.Vector3()
  private trackOrientation: TrackOrientation
  private quality: QualityPreset = 'auto'

  constructor(viewport: HTMLElement, private route: EarthMoonRoute, private readonly config: GameConfig) {
    this.renderer = new THREE.WebGLRenderer({ antialias: config.renderer.antialias, powerPreference: 'high-performance' })
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = config.renderer.toneMappingExposure
    this.camera = new THREE.PerspectiveCamera(config.camera.fieldOfViewDegrees, 1, config.camera.nearWorldUnits, config.camera.farWorldUnits)
    this.trackOrientation = new TrackOrientation(route.curve, config.scene.rail.curveSamples, route.rideProfile)
    this.scene.background = new THREE.Color(0x020611)
    this.environment = createEnvironment(config)
    this.bodies = createCelestialBodies(this.renderer, config)
    this.bodies.setSites(route.sites)
    this.railway = createRailway(route, config)
    this.carriage = createCarriage()
    this.freightInfrastructure = createFreightInfrastructure()
    this.freightInfrastructure.group.visible = false
    this.scene.add(this.environment.group, this.bodies.group, this.railway.group, this.carriage.group, this.freightInfrastructure.group)
    viewport.append(this.renderer.domElement)
    this.resize(window.innerWidth, window.innerHeight, window.devicePixelRatio)
  }

  update(progress: number, cameraController: CameraController, elapsedSeconds = 1 / 60, reducedMotion = false, freight?: FreightState, network?: LocalRailNetwork, fleet?: FleetState): Telemetry {
    // Timeline is distance-based rather than Bézier parameter-based.
    const routeT = this.route.curve.getUtoTmapping(progress, progress * this.route.lengthKm / KILOMETRES_PER_WORLD_UNIT)
    this.route.curve.getPoint(routeT, this.point)
    this.trackOrientation.frameAt(routeT, this.tangent, this.frameUp, this.frameSide)
    this.carriage.group.position.copy(this.point)
    // This is precisely the same frame used to construct the physical rail
    // cross-section and sleepers, including barrel rolls. No extra world-up
    // correction or unrelated carriage-only banking is permitted here.
    this.trackOrientation.quaternionAt(routeT, this.carriage.group.quaternion)
    this.bodies.update(progress, this.route.simulatedDays)
    this.railway.update(progress, reducedMotion)
    if (freight && network) this.freightInfrastructure.update(freight, network, fleet)
    cameraController.apply(this.point, this.tangent, this.bodies.moon.position, elapsedSeconds, reducedMotion, this.frameUp)
    this.environment.update(this.camera.position, elapsedSeconds, reducedMotion)
    const moonDistance = Math.max(MOON_RADIUS, this.bodies.moon.position.distanceTo(this.camera.position))
    return {
      progress,
      earthDistanceKm: Math.max(0, (this.point.length() - EARTH_RADIUS) * KILOMETRES_PER_WORLD_UNIT),
      moonDistanceKm: Math.max(0, (moonDistance - MOON_RADIUS) * KILOMETRES_PER_WORLD_UNIT),
      moonAngularDiameterDegrees: apparentDiameterDegrees(MOON_RADIUS, moonDistance),
      simulatedDays: progress * this.route.simulatedDays,
      cameraMode: cameraController.mode,
      cameraFacing: cameraController.facing,
      worldPosition: this.point.clone(),
    }
  }

  setRoute(route: EarthMoonRoute) {
    this.scene.remove(this.railway.group)
    this.railway.dispose()
    this.route = route
    this.trackOrientation = new TrackOrientation(route.curve, this.config.scene.rail.curveSamples, route.rideProfile)
    this.bodies.setSites(route.sites)
    this.railway = createRailway(route, this.config)
    this.scene.add(this.railway.group)
    this.railway.setQuality(this.quality)
  }

  render() { this.renderer.render(this.scene, this.camera) }

  setQuality(quality: QualityPreset) {
    this.quality = quality
    this.environment.setQuality(quality)
    this.railway.setQuality(quality)
    this.resize(window.innerWidth, window.innerHeight, window.devicePixelRatio)
  }

  resize(width: number, height: number, pixelRatio: number) {
    this.camera.aspect = width / Math.max(1, height)
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height)
    const cap = this.quality === 'performance' ? 1 : this.quality === 'quality'
      ? this.config.renderer.maximumPixelRatio : Math.min(this.config.renderer.maximumPixelRatio, width < 780 ? 1.35 : 1.65)
    this.renderer.setPixelRatio(Math.min(pixelRatio, cap))
  }

  dispose() {
    this.environment.dispose()
    this.bodies.dispose()
    this.railway.dispose()
    this.freightInfrastructure.dispose()
    this.carriage.dispose()
    this.renderer.dispose()
    this.renderer.domElement.remove()
  }
}
