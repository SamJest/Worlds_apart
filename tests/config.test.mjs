import test from 'node:test'
import assert from 'node:assert/strict'
import { defaultGameConfig, validateGameConfig } from '../src/config/gameConfig.ts'

const copy = () => structuredClone(defaultGameConfig)

test('the shipped game configuration is valid', () => {
  assert.equal(validateGameConfig(copy()).journey.durationSeconds, 180)
})

test('configuration rejects impossible journey, camera, and scene tuning', () => {
  const duration = copy()
  duration.journey.durationSeconds = 0
  assert.throws(() => validateGameConfig(duration), /durationSeconds/)
  const speed = copy()
  speed.journey.initialSpeed = 3
  assert.throws(() => validateGameConfig(speed), /initialSpeed/)
  const camera = copy()
  camera.camera.nearWorldUnits = camera.camera.farWorldUnits
  assert.throws(() => validateGameConfig(camera), /far plane/)
  const rail = copy()
  rail.scene.rail.sleeperCount = 0
  assert.throws(() => validateGameConfig(rail), /sleeperCount/)
})
