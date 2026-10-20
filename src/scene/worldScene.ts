import * as THREE from 'three'
import type { CameraController, CameraMode } from '../camera/cameraController.ts'
import type { GameConfig } from '../config/gameConfig.ts'
import { EARTH_RADIUS, KILOMETRES_PER_WORLD_UNIT, MOON_RADIUS, apparentDiameterDegrees, type EarthMoonRoute } from '../simulation/astronomy.ts'
import { createCelestialBodies } from './bodies.ts'
import { createCarriage } from './carriage.ts'
import { createEnvironment } from './environment.ts'
import { createRailway } from './railway.ts'

export interface Telemetry {
  progress: number
  earthDistanceKm: number
  moonDistanceKm: number
  moonAngularDiameterDegrees: number
  simulatedDays: number
  cameraMode: CameraMode
  worldPosition: THREE.Vector3
}

export class WorldScene {
  readonly renderer: THREE.WebGLRenderer
  readonly camera: THREE.PerspectiveCamera
  private readonly scene = new THREE.Scene()
  private readonly environment
  private readonly bodies
  private readonly railway
  private readonly carriage
  private readonly point = new THREE.Vector3()
  private readonly tangent = new THREE.Vector3()
  private readonly forward = new THREE.Vector3(0, 0, 1)

  constructor(viewport: HTMLElement, private readonly route: EarthMoonRoute, private readonly config: GameConfig) {
    this.renderer = new THREE.WebGLRenderer({ antialias: config.renderer.antialias, powerPreference: 'high-performance' })
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = config.renderer.toneMappingExposure
    this.camera = new THREE.PerspectiveCamera(config.camera.fieldOfViewDegrees, 1, config.camera.nearWorldUnits, config.camera.farWorldUnits)
    this.scene.background = new THREE.Color(0x020611)
    this.environment = createEnvironment(config)
    this.bodies = createCelestialBodies(this.renderer, config)
    this.railway = createRailway(route, config)
    this.carriage = createCarriage()
    this.scene.add(this.environment.group, this.bodies.group, this.railway.group, this.carriage.group)
    viewport.append(this.renderer.domElement)
    this.resize(window.innerWidth, window.innerHeight, window.devicePixelRatio)
  }

  update(progress: number, cameraController: CameraController): Telemetry {
    this.route.curve.getPoint(progress, this.point)
    this.route.curve.getTangent(progress, this.tangent).normalize()
    this.carriage.group.position.copy(this.point)
    this.carriage.group.quaternion.setFromUnitVectors(this.forward, this.tangent)
    this.bodies.update(progress)
    cameraController.apply(this.point, this.tangent, this.bodies.moon.position)
    const moonDistance = Math.max(MOON_RADIUS, this.bodies.moon.position.distanceTo(this.camera.position))
    return {
      progress,
      earthDistanceKm: Math.max(0, (this.point.length() - EARTH_RADIUS) * KILOMETRES_PER_WORLD_UNIT),
      moonDistanceKm: Math.max(0, (moonDistance - MOON_RADIUS) * KILOMETRES_PER_WORLD_UNIT),
      moonAngularDiameterDegrees: apparentDiameterDegrees(MOON_RADIUS, moonDistance),
      simulatedDays: progress * this.config.journey.simulatedDays,
      cameraMode: cameraController.mode,
      worldPosition: this.point.clone(),
    }
  }

  render() { this.renderer.render(this.scene, this.camera) }

  resize(width: number, height: number, pixelRatio: number) {
    this.camera.aspect = width / Math.max(1, height)
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height)
    this.renderer.setPixelRatio(Math.min(pixelRatio, this.config.renderer.maximumPixelRatio))
  }

  dispose() {
    this.environment.dispose()
    this.bodies.dispose()
    this.railway.dispose()
    this.carriage.dispose()
    this.renderer.dispose()
    this.renderer.domElement.remove()
  }
}
