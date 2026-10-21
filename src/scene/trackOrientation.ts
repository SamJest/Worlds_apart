import * as THREE from 'three'
import type { RideProfile } from '../simulation/constructionPlan.ts'
import { designedTrackRoll, turnBankRadians } from '../simulation/trackRoll.ts'

const WORLD_UP = new THREE.Vector3(0, 1, 0)
const LOCAL_SIDE = new THREE.Vector3(1, 0, 0)
const LOCAL_UP = new THREE.Vector3(0, 1, 0)
const LOCAL_FORWARD = new THREE.Vector3(0, 0, 1)

/**
 * A parallel-transport frame that follows the track without rebuilding its up
 * direction from the world horizon every frame. This keeps rails, carriage and
 * camera together through steep bends and corkscrews while avoiding Frenet flips.
 */
export class TrackOrientation {
  private readonly frames: THREE.Quaternion[]
  private readonly segments: number
  private readonly sample = new THREE.Quaternion()

  constructor(curve: THREE.Curve<THREE.Vector3>, segments = 720, profile: RideProfile = 'classic') {
    this.segments = Math.max(16, Math.round(segments))
    this.frames = []
    const previousTangent = curve.getTangent(0).normalize()
    const tangent = new THREE.Vector3().copy(previousTangent)
    const up = WORLD_UP.clone().addScaledVector(tangent, -WORLD_UP.dot(tangent))
    if (up.lengthSq() < 1e-8) up.set(0, 0, 1).addScaledVector(tangent, -tangent.z)
    up.normalize()
    const side = new THREE.Vector3().crossVectors(up, tangent).normalize()
    up.crossVectors(tangent, side).normalize()
    this.frames.push(frameQuaternion(side, up, tangent))

    const bankedUp = new THREE.Vector3()
    const bankedSide = new THREE.Vector3()
    const bankQuaternion = new THREE.Quaternion()
    const nextTangent = new THREE.Vector3()
    const axis = new THREE.Vector3()
    for (let index = 1; index <= this.segments; index++) {
      curve.getTangent(index / this.segments, tangent).normalize()
      axis.crossVectors(previousTangent, tangent)
      if (axis.lengthSq() > 1e-12) {
        axis.normalize()
        up.applyAxisAngle(axis, Math.acos(THREE.MathUtils.clamp(previousTangent.dot(tangent), -1, 1)))
      }
      up.addScaledVector(tangent, -up.dot(tangent))
      if (up.lengthSq() < 1e-8) up.crossVectors(tangent, side)
      up.normalize()
      side.crossVectors(up, tangent).normalize()
      up.crossVectors(tangent, side).normalize()
      // First compute the minimally-rotating frame. Then roll the entire rail
      // cross-section about the actual track tangent; do NOT feed rolled axes
      // back into the parallel-transport integrator on the next sample.
      const u = index / this.segments
      curve.getTangent(Math.min(1, u + 0.012), nextTangent).normalize()
      const turnRoll = turnBankRadians(nextTangent.dot(side), u)
      bankQuaternion.setFromAxisAngle(tangent, designedTrackRoll(u, profile) + turnRoll)
      bankedUp.copy(up).applyQuaternion(bankQuaternion)
      bankedSide.copy(side).applyQuaternion(bankQuaternion)
      this.frames.push(frameQuaternion(bankedSide, bankedUp, tangent))
      previousTangent.copy(tangent)
    }
  }

  quaternionAt(t: number, target: THREE.Quaternion): THREE.Quaternion {
    const scaled = THREE.MathUtils.clamp(t, 0, 1) * this.segments
    const lower = Math.floor(scaled)
    const upper = Math.min(this.segments, lower + 1)
    return target.slerpQuaternions(this.frames[lower], this.frames[upper], scaled - lower)
  }

  frameAt(t: number, tangent: THREE.Vector3, up: THREE.Vector3, side: THREE.Vector3): void {
    this.quaternionAt(t, this.sample)
    tangent.copy(LOCAL_FORWARD).applyQuaternion(this.sample).normalize()
    up.copy(LOCAL_UP).applyQuaternion(this.sample).normalize()
    side.copy(LOCAL_SIDE).applyQuaternion(this.sample).normalize()
  }
}

function frameQuaternion(side: THREE.Vector3, up: THREE.Vector3, tangent: THREE.Vector3): THREE.Quaternion {
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(side, up, tangent))
}
