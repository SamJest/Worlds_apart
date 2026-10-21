import test from 'node:test'
import assert from 'node:assert/strict'
import { wrapYaw } from '../src/camera/viewAngles.ts'
import { clampPanelPosition } from '../src/ui/telemetryPanel.ts'

test('third-person horizontal orbit wraps without a forward-only clamp', () => {
  const epsilon = 1e-9
  assert.ok(Math.abs(wrapYaw(2 * Math.PI)) < epsilon)
  assert.ok(Math.abs(wrapYaw(-2 * Math.PI)) < epsilon)
  assert.ok(Math.abs(wrapYaw(1.5 * Math.PI) + Math.PI / 2) < epsilon)
  assert.ok(Math.abs(wrapYaw(-1.5 * Math.PI) - Math.PI / 2) < epsilon)
  assert.ok(Math.abs(Math.cos(wrapYaw(Math.PI + 0.01)) - Math.cos(Math.PI + 0.01)) < epsilon)
})

test('dragged telemetry remains on-screen after resize or rotation', () => {
  assert.deepEqual(clampPanelPosition(-120, -20, 167, 46, 390, 844), { x: 0, y: 0 })
  assert.deepEqual(clampPanelPosition(999, 999, 167, 46, 390, 844), { x: 223, y: 798 })
  assert.deepEqual(clampPanelPosition(200, 300, 280, 400, 390, 300), { x: 110, y: 0 })
})
