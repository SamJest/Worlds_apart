import * as THREE from 'three'
import type { QualityPreset } from '../ui/viewPreferences.ts'
import type { RideAtmosphere } from '../simulation/rideChoreography.ts'

/** Fictional magnetic-field particles follow the *vehicle*, not distant stars. */
export function createRideWake() {
  const group = new THREE.Group()
  const maxCount = 72
  const shard = new THREE.BoxGeometry(0.002, 0.0018, 0.045)
  const material = new THREE.MeshBasicMaterial({
    color: 0x9cecff, transparent: true, opacity: 0.25, depthWrite: false,
    blending: THREE.AdditiveBlending, toneMapped: false,
  })
  const instanced = new THREE.InstancedMesh(shard, material, maxCount)
  instanced.frustumCulled = false
  instanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  const helper = new THREE.Object3D()
  const tint = new THREE.Color()
  for (let i = 0; i < maxCount; i++) {
    const v = i / maxCount
    tint.setHSL(0.52 + (i % 5) * 0.033, 0.82, 0.65 + (i % 3) * 0.05)
    instanced.setColorAt(i, tint)
    // Provide a deterministic, nonzero initial matrix for the first WebGL frame.
    helper.position.set(0.2 * Math.cos(i * 2.4), 0.025 + 0.2 * Math.sin(i * 2.4), -v)
    helper.scale.setScalar(0.01)
    helper.updateMatrix()
    instanced.setMatrixAt(i, helper.matrix)
  }
  instanced.instanceMatrix.needsUpdate = true
  if (instanced.instanceColor) instanced.instanceColor.needsUpdate = true
  group.add(instanced)
  let clock = 0
  let quality: QualityPreset = 'auto'

  return {
    group,
    update(atmosphere: RideAtmosphere, elapsedSeconds: number, playing: boolean, reducedMotion: boolean) {
      const enabled = !reducedMotion && playing
      instanced.visible = enabled
      if (!enabled) return
      clock += Math.min(0.07, Math.max(0, elapsedSeconds)) * (0.7 + 2.0 * atmosphere.energy)
      material.opacity = (quality === 'performance' ? 0.10 : 0.21) * atmosphere.fieldOpacity
      const activeCount = quality === 'performance' ? 24 : quality === 'quality' ? maxCount : 48
      instanced.count = activeCount
      for (let i = 0; i < activeCount; i++) {
        const seed = i * 0.61803398875
        const travel = (seed + clock * (0.29 + (i % 7) * 0.013)) % 1
        const spiral = i * 2.399963 + travel * 1.9
        const radius = 0.11 + 0.09 * (i % 4) / 3
        // Starts ahead of the rider and passes behind, visible in both camera modes.
        helper.position.set(Math.cos(spiral) * radius, 0.025 + Math.sin(spiral) * radius, 0.65 - travel * 2.4)
        helper.scale.set(0.8 + (i % 5) * 0.22, 0.7, 0.7 + atmosphere.energy * 2.5)
        helper.updateMatrix()
        instanced.setMatrixAt(i, helper.matrix)
      }
      instanced.instanceMatrix.needsUpdate = true
    },
    setQuality(value: QualityPreset) { quality = value },
    dispose() { shard.dispose(); material.dispose() },
  }
}
