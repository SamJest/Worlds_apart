import * as THREE from 'three'
import type { GameConfig } from '../config/gameConfig.ts'
import { EARTH_RADIUS, MOON_RADIUS } from '../simulation/astronomy.ts'

export type CameraMode = 'first-person' | 'external'

export class CameraController {
  private modeValue: CameraMode = 'first-person'
  private yaw = 0
  private pitch = 0
  private orbitDistance: number
  private readonly desired = new THREE.Vector3()
  private readonly direction = new THREE.Vector3()
  private readonly side = new THREE.Vector3()
  private readonly target = new THREE.Vector3()
  private readonly radial = new THREE.Vector3()
  private readonly origin = new THREE.Vector3()
  private readonly up = new THREE.Vector3(0, 1, 0)

  constructor(private readonly camera: THREE.PerspectiveCamera, private readonly config: GameConfig['camera']) {
    this.orbitDistance = config.externalDistanceWorldUnits
  }

  get mode(): CameraMode { return this.modeValue }

  toggleMode() {
    this.modeValue = this.modeValue === 'first-person' ? 'external' : 'first-person'
    this.yaw = 0
    this.pitch = 0
  }

  look(deltaX: number, deltaY: number) {
    this.yaw = THREE.MathUtils.clamp(this.yaw - deltaX * this.config.pointerSensitivity, -this.config.maximumYawRadians, this.config.maximumYawRadians)
    this.pitch = THREE.MathUtils.clamp(this.pitch + deltaY * this.config.pitchSensitivity, -this.config.maximumPitchRadians, this.config.maximumPitchRadians)
  }

  zoom(direction: number) {
    this.orbitDistance = THREE.MathUtils.clamp(this.orbitDistance * (1 + Math.sign(direction) * this.config.zoomStep), this.config.minimumExternalDistanceWorldUnits, this.config.maximumExternalDistanceWorldUnits)
  }

  apply(point: THREE.Vector3, tangent: THREE.Vector3, moonPosition: THREE.Vector3, elapsedSeconds = 1 / 60, reducedMotion = false) {
    if (this.modeValue === 'external') {
      this.desired.copy(point)
        .addScaledVector(tangent, -this.orbitDistance * Math.cos(this.yaw))
        .add(this.direction.set(Math.sin(this.yaw) * this.orbitDistance, 0.055 + this.orbitDistance * 0.37 + this.pitch * this.orbitDistance, Math.cos(this.yaw) * this.orbitDistance * 0.2))
      this.keepOutside(this.desired, this.origin, EARTH_RADIUS)
      this.keepOutside(this.desired, moonPosition, MOON_RADIUS)
      // Frame-rate-independent easing, with immediate repositioning after a seek.
      const alpha = reducedMotion || this.camera.position.distanceToSquared(this.desired) > 4
        ? 1 : 1 - Math.exp(-Math.max(0, elapsedSeconds) * 10)
      this.camera.position.lerp(this.desired, alpha)
      this.keepOutside(this.camera.position, this.origin, EARTH_RADIUS)
      this.keepOutside(this.camera.position, moonPosition, MOON_RADIUS)
      this.camera.lookAt(this.target.copy(point).addScaledVector(tangent, 0.09))
      return
    }
    this.desired.copy(point).addScaledVector(tangent, this.config.firstPersonForwardWorldUnits).addScaledVector(this.up, this.config.firstPersonHeightWorldUnits)
    this.camera.position.copy(this.desired)
    this.side.crossVectors(this.up, tangent).normalize()
    this.direction.copy(tangent).applyAxisAngle(this.up, this.yaw).applyAxisAngle(this.side, this.pitch)
    this.camera.lookAt(this.target.copy(this.desired).add(this.direction))
  }

  private keepOutside(position: THREE.Vector3, centre: THREE.Vector3, radius: number) {
    this.radial.copy(position).sub(centre)
    if (this.radial.length() < radius + 0.025) position.copy(centre).addScaledVector(this.radial.normalize(), radius + 0.025)
  }
}
