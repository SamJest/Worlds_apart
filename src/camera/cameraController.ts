import * as THREE from 'three'
import type { GameConfig } from '../config/gameConfig.ts'
import { wrapYaw } from './viewAngles.ts'
import { EARTH_RADIUS, MOON_RADIUS } from '../simulation/astronomy.ts'

export type CameraMode = 'first-person' | 'external'
export type FacingDirection = 'forward' | 'right' | 'backward' | 'left'

const FACING_YAW: Record<FacingDirection, number> = {
  forward: 0,
  right: Math.PI / 2,
  backward: Math.PI,
  left: -Math.PI / 2,
}

export class CameraController {
  private readonly camera: THREE.PerspectiveCamera
  private readonly config: GameConfig['camera']
  private modeValue: CameraMode = 'first-person'
  private facingValue: FacingDirection = 'backward'
  private firstPersonYaw = Math.PI
  private orbitYaw = Math.PI
  private pitch = 0
  private orbitDistance: number
  private snapNextCamera = false
  private readonly desired = new THREE.Vector3()
  private readonly direction = new THREE.Vector3()
  private readonly side = new THREE.Vector3()
  private readonly viewUp = new THREE.Vector3()
  private readonly target = new THREE.Vector3()
  private readonly radial = new THREE.Vector3()
  private readonly origin = new THREE.Vector3()
  private readonly up = new THREE.Vector3(0, 1, 0)

  constructor(camera: THREE.PerspectiveCamera, config: GameConfig['camera']) {
    this.camera = camera
    this.config = config
    this.orbitDistance = config.externalDistanceWorldUnits
  }

  get mode(): CameraMode { return this.modeValue }
  get facing(): FacingDirection { return this.facingValue }

  toggleMode() {
    this.modeValue = this.modeValue === 'first-person' ? 'external' : 'first-person'
    this.snapNextCamera = true
  }

  look(deltaX: number, deltaY: number) {
    if (this.modeValue === 'external') this.orbitYaw = wrapYaw(this.orbitYaw - deltaX * this.config.pointerSensitivity)
    else {
      this.firstPersonYaw = wrapYaw(this.firstPersonYaw - deltaX * this.config.pointerSensitivity)
      this.refreshFacingLabel()
    }
    this.pitch = THREE.MathUtils.clamp(this.pitch + deltaY * this.config.pitchSensitivity, -this.config.maximumPitchRadians, this.config.maximumPitchRadians)
  }

  setFacing(direction: FacingDirection) {
    this.facingValue = direction
    this.firstPersonYaw = FACING_YAW[direction]
    this.snapNextCamera = true
  }

  turnAround() {
    if (this.modeValue === 'first-person') {
      this.firstPersonYaw = wrapYaw(this.firstPersonYaw + Math.PI)
      this.refreshFacingLabel()
      this.snapNextCamera = true
    }
    else { this.orbitYaw = wrapYaw(this.orbitYaw + Math.PI); this.snapNextCamera = true }
  }

  private refreshFacingLabel() {
    const quadrants: FacingDirection[] = ['forward', 'right', 'backward', 'left']
    const heading = (this.firstPersonYaw + 2 * Math.PI) % (2 * Math.PI)
    this.facingValue = quadrants[Math.round(heading / (Math.PI / 2)) % 4]
  }

  beginRide() {
    this.facingValue = 'backward'
    this.firstPersonYaw = Math.PI
    this.orbitYaw = Math.PI
    this.pitch = 0
    this.snapNextCamera = true
  }

  zoom(direction: number) {
    this.orbitDistance = THREE.MathUtils.clamp(this.orbitDistance * (1 + Math.sign(direction) * this.config.zoomStep), this.config.minimumExternalDistanceWorldUnits, this.config.maximumExternalDistanceWorldUnits)
  }

  apply(point: THREE.Vector3, tangent: THREE.Vector3, moonPosition: THREE.Vector3, elapsedSeconds = 1 / 60, reducedMotion = false, rideUp?: THREE.Vector3) {
    // BOTH camera modes inherit rail cant. External chase view must rotate
    // with the vehicle instead of artificially levelling to the horizon.
    const initialUp = rideUp ?? this.up
    this.viewUp.copy(initialUp).addScaledVector(tangent, -initialUp.dot(tangent))
    if (this.viewUp.lengthSq() < 0.0001) this.viewUp.set(0, 0, 1).addScaledVector(tangent, -tangent.z)
    this.viewUp.normalize()
    this.side.crossVectors(this.viewUp, tangent).normalize()
    this.camera.up.copy(this.viewUp)
    if (this.modeValue === 'external') {
      const elevation = THREE.MathUtils.clamp(0.28 + this.pitch, -1.3, 1.3)
      const horizontal = this.orbitDistance * Math.cos(elevation)
      this.desired.copy(point).addScaledVector(tangent, -horizontal * Math.cos(this.orbitYaw))
        .addScaledVector(this.side, -horizontal * Math.sin(this.orbitYaw))
        .addScaledVector(this.viewUp, this.orbitDistance * Math.sin(elevation))
      this.keepOutside(this.desired, this.origin, EARTH_RADIUS)
      this.keepOutside(this.desired, moonPosition, MOON_RADIUS)
      const alpha = this.snapNextCamera || reducedMotion || this.camera.position.distanceToSquared(this.desired) > 4
        ? 1 : 1 - Math.exp(-Math.max(0, elapsedSeconds) * 10)
      this.camera.position.lerp(this.desired, alpha)
      this.snapNextCamera = false
      this.keepOutside(this.camera.position, this.origin, EARTH_RADIUS)
      this.keepOutside(this.camera.position, moonPosition, MOON_RADIUS)
      this.camera.lookAt(this.target.copy(point).addScaledVector(tangent, 0.09))
      return
    }
    this.desired.copy(point).addScaledVector(tangent, this.config.firstPersonForwardWorldUnits)
      .addScaledVector(this.viewUp, this.config.firstPersonHeightWorldUnits)
    this.camera.position.copy(this.desired)
    const facingYaw = this.firstPersonYaw
    this.direction.copy(tangent).multiplyScalar(Math.cos(facingYaw))
      .addScaledVector(this.side, Math.sin(facingYaw))
      .multiplyScalar(Math.cos(this.pitch))
      .addScaledVector(this.viewUp, Math.sin(this.pitch)).normalize()
    this.camera.lookAt(this.target.copy(this.desired).add(this.direction))
  }

  private keepOutside(position: THREE.Vector3, centre: THREE.Vector3, radius: number) {
    this.radial.copy(position).sub(centre)
    if (this.radial.length() < radius + 0.025) position.copy(centre).addScaledVector(this.radial.normalize(), radius + 0.025)
  }
}
