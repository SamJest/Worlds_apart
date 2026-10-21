import test from 'node:test'
import assert from 'node:assert/strict'
import { InputController, touchLookMultiplier } from '../src/input/inputController.ts'
import { wrapYaw } from '../src/camera/viewAngles.ts'

test('360-degree third-person orbit yaw is mathematically unbounded', () => {
  let yaw = 0
  for (let i = 0; i < 48; i++) yaw = wrapYaw(yaw + Math.PI / 12)
  assert.ok(Math.abs(yaw) < 1e-10)
  assert.ok(Math.abs(wrapYaw(Math.PI + Math.PI / 2) + Math.PI / 2) < 1e-10)
})

test('mobile gestures are more sensitive than desktop but bounded on small screens', () => {
  assert.ok(touchLookMultiplier(390) > 2)
  assert.equal(touchLookMultiplier(200), 3.75)
  assert.ok(touchLookMultiplier(1280) >= 1.1)
})

test('pointer movement is incremental and another finger does not rotate the view', () => {
  const oldWindow = globalThis.window
  const win = new EventTarget()
  globalThis.window = win
  class FakeCanvas extends EventTarget {
    clientWidth = 390
    setPointerCapture() {}
  }
  const canvas = new FakeCanvas()
  const received = []
  const controls = new InputController(canvas, {
    canInteract: () => true, togglePlay(){}, toggleCamera(){}, turnAround(){}, seekBy(){},
    look: (x, y) => received.push([x, y]), zoom(){}, showOptions(){}, toggleMinimalHud(){},
  })
  const dispatch = (type, pointerId, clientX, clientY, pointerType='touch') => {
    const event = new Event(type)
    Object.assign(event, { pointerId, clientX, clientY, pointerType })
    canvas.dispatchEvent(event)
  }
  try {
    dispatch('pointerdown', 10, 100, 220)
    dispatch('pointermove', 11, 300, 220) // wrong finger; must be ignored
    dispatch('pointermove', 10, 110, 230)
    dispatch('pointermove', 10, 130, 210)
    assert.equal(received.length, 2)
    assert.ok(Math.abs(received[0][0] - 10 * touchLookMultiplier(390)) < 1e-10)
    assert.ok(Math.abs(received[1][0] - 20 * touchLookMultiplier(390)) < 1e-10)
    assert.deepEqual(received.map(row=>row[1]),[10,-20])
    dispatch('pointerup', 10, 130, 210)
    dispatch('pointermove', 10, 300, 300)
    assert.equal(received.length, 2)
  } finally { controls.dispose(); globalThis.window = oldWindow }
})
