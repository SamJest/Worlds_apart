import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { createRideWake } from '../src/scene/rideWake.ts'
import { rideAtmosphereAt } from '../src/simulation/rideChoreography.ts'

test('carriage wake respects motion preferences, pause state and quality limits', () => {
  const wake = createRideWake()
  const particles = wake.group.children[0]
  assert.ok(particles instanceof THREE.InstancedMesh)

  wake.update(rideAtmosphereAt(.685, 'corkscrew'), 1 / 60, true, false)
  assert.equal(particles.visible, true)
  assert.equal(particles.count, 48)

  wake.setQuality('performance')
  wake.update(rideAtmosphereAt(.685, 'corkscrew'), 1 / 60, true, false)
  assert.equal(particles.count, 24)

  wake.setQuality('quality')
  wake.update(rideAtmosphereAt(.685, 'corkscrew'), 1 / 60, true, false)
  assert.equal(particles.count, 72)

  wake.update(rideAtmosphereAt(.685, 'corkscrew'), 1 / 60, false, false)
  assert.equal(particles.visible, false)
  wake.update(rideAtmosphereAt(.685, 'corkscrew'), 1 / 60, true, true)
  assert.equal(particles.visible, false)
  wake.dispose()
})

test('wake animation remains local and cannot alter carriage orientation', () => {
  const wake = createRideWake()
  const initialPosition = wake.group.position.clone()
  const initialQuaternion = wake.group.quaternion.clone()
  wake.update(rideAtmosphereAt(.925, 'corkscrew'), 0.08, true, false)
  assert.deepEqual(wake.group.position.toArray(), initialPosition.toArray())
  assert.deepEqual(wake.group.quaternion.toArray(), initialQuaternion.toArray())
  wake.dispose()
})
