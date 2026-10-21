import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { CameraController } from '../src/camera/cameraController.ts'
import { defaultGameConfig } from '../src/config/gameConfig.ts'
import { applyGuidewayPreset } from '../src/simulation/constructionPlan.ts'
import { evaluateGuideway } from '../src/simulation/constructionRoute.ts'
import { TrackOrientation } from '../src/scene/trackOrientation.ts'

const nearVector = (actual, expected, tolerance = 1e-5) => {
  assert.ok(actual.distanceTo(expected) < tolerance, `${actual.toArray()} vs ${expected.toArray()}`)
}

test('first-person starts backward, presets and drag remain local to the twisting track', () => {
  const camera = new THREE.PerspectiveCamera()
  const controller = new CameraController(camera, defaultGameConfig.camera)
  const point = new THREE.Vector3(4, 5, 6)
  const moon = new THREE.Vector3(200, 0, 0)
  const up = new THREE.Vector3(0, 1, 0)
  const direction = new THREE.Vector3()

  controller.beginRide()
  assert.equal(controller.facing, 'backward')
  controller.apply(point, new THREE.Vector3(0, 0, 1), moon, 1 / 60, false, up)
  nearVector(camera.getWorldDirection(direction), new THREE.Vector3(0, 0, -1))

  controller.setFacing('right')
  controller.apply(point, new THREE.Vector3(0, 0, 1), moon, 1 / 60, false, up)
  nearVector(camera.getWorldDirection(direction), new THREE.Vector3(1, 0, 0))
  controller.setFacing('forward')
  controller.look(-Math.PI / 2 / defaultGameConfig.camera.pointerSensitivity, 0)
  controller.apply(point, new THREE.Vector3(1, 0, 0), moon, 1 / 60, false, up)
  nearVector(camera.getWorldDirection(direction), new THREE.Vector3(0, 0, -1))
})

test('both cameras allow 360 orbit and first-person horizontal drag changes heading', () => {
  const camera = new THREE.PerspectiveCamera()
  const controller = new CameraController(camera, defaultGameConfig.camera)
  const point = new THREE.Vector3(10, 4, 3)
  const tangent = new THREE.Vector3(0, 0, 1)
  const moon = new THREE.Vector3(200, 0, 0)
  controller.apply(point, tangent, moon)
  const firstDirection = camera.getWorldDirection(new THREE.Vector3())
  controller.look(800, 0)
  controller.apply(point, tangent, moon)
  assert.ok(camera.getWorldDirection(new THREE.Vector3()).distanceTo(firstDirection) > 0.1, 'first-person swipe must rotate heading')

  controller.toggleMode()
  controller.apply(point, tangent, moon, 1 / 60, true)
  const before = camera.position.clone()
  controller.turnAround()
  controller.apply(point, tangent, moon, 1 / 60, true)
  assert.ok(camera.position.distanceTo(before) > defaultGameConfig.camera.externalDistanceWorldUnits)
})

test('transported track frame follows a corkscrew smoothly without horizon resets', () => {
  const route = evaluateGuideway(4, 25, applyGuidewayPreset('corkscrew')).route
  const orientation = new TrackOrientation(route.curve, 720, route.rideProfile)
  const tangent = new THREE.Vector3(), up = new THREE.Vector3(), side = new THREE.Vector3()
  const previousUp = new THREE.Vector3()
  let maximumUpChange = 0
  for (let index = 0; index <= 720; index++) {
    const t = index / 720
    orientation.frameAt(t, tangent, up, side)
    assert.ok(Math.abs(tangent.dot(up)) < 1e-6)
    assert.ok(Math.abs(tangent.dot(side)) < 1e-6)
    assert.ok(Math.abs(side.dot(up)) < 1e-6)
    assert.ok(tangent.angleTo(route.curve.getTangent(t).normalize()) < 0.01)
    if (index) {
      const change = previousUp.angleTo(up)
      assert.ok(change < 0.35, `track frame snapped ${THREE.MathUtils.radToDeg(change)}° at ${index}`)
      maximumUpChange = Math.max(maximumUpChange, previousUp.angleTo(up))
    }
    previousUp.copy(up)
  }
  assert.ok(maximumUpChange > 0.001, 'corkscrew orientation should turn with the track')
})

test('first- and third-person camera up follows the actual banked rail frame', () => {
  const camera = new THREE.PerspectiveCamera()
  const controller = new CameraController(camera, defaultGameConfig.camera)
  const moon = new THREE.Vector3(380, 0, 0)
  const point = new THREE.Vector3(20, 0, 0)
  const tangent = new THREE.Vector3(0, 0, 1)
  const rightSideUp = new THREE.Vector3(0, -1, 0)
  controller.beginRide()
  controller.apply(point, tangent, moon, 1/60, true, rightSideUp)
  const actualFirst = camera.up.clone().normalize()
  nearVector(actualFirst, rightSideUp)
  controller.toggleMode()
  controller.apply(point, tangent, moon, 1/60, true, rightSideUp)
  nearVector(camera.up.clone().normalize(), rightSideUp)
})

test('corkscrew rail and carriage frames share identical bank around the tangent', () => {
  const route = evaluateGuideway(4, 25, applyGuidewayPreset('corkscrew')).route
  const carriage = new TrackOrientation(route.curve, defaultGameConfig.scene.rail.curveSamples, route.rideProfile)
  const railway = new TrackOrientation(route.curve, defaultGameConfig.scene.rail.curveSamples, route.rideProfile)
  const neutralRail = new TrackOrientation(route.curve, defaultGameConfig.scene.rail.curveSamples)
  const tangent = new THREE.Vector3(), up = new THREE.Vector3(), side = new THREE.Vector3()
  let hasInverted = false
  for (let i = 0; i <= 100; i++) {
    const t = i/100
    carriage.frameAt(t, tangent, up, side)
    const railUp = new THREE.Vector3(0, 1, 0).applyQuaternion(railway.quaternionAt(t, new THREE.Quaternion()))
    nearVector(railUp, up)
    const neutral = neutralRail.quaternionAt(t, new THREE.Quaternion())
    const neutralUp = new THREE.Vector3(0, 1, 0).applyQuaternion(neutral)
    if (up.dot(neutralUp) < -0.7) hasInverted = true
  }
  assert.equal(hasInverted, true, 'corkscrew should invert the carriage relative to an untwisted rail')
})

test('360° first-person swipes preserve travel frame and can look back at Earth', () => {
  const camera = new THREE.PerspectiveCamera()
  const controller = new CameraController(camera, defaultGameConfig.camera)
  const tangent = new THREE.Vector3(0, 0, 1)
  const up = new THREE.Vector3(0, 1, 0)
  const point = new THREE.Vector3(40, 0, 0)
  const moon = new THREE.Vector3(385, 0, 0)
  controller.beginRide()
  controller.apply(point, tangent, moon, 1 / 60, false, up)
  nearVector(camera.getWorldDirection(new THREE.Vector3()), new THREE.Vector3(0, 0, -1))
  const halfTurnPixels = Math.PI / defaultGameConfig.camera.pointerSensitivity
  controller.look(-halfTurnPixels, 0)
  controller.apply(point, tangent, moon, 1 / 60, false, up)
  nearVector(camera.getWorldDirection(new THREE.Vector3()), tangent)
  controller.look(-halfTurnPixels, 0)
  controller.apply(point, tangent, moon, 1 / 60, false, up)
  nearVector(camera.getWorldDirection(new THREE.Vector3()), new THREE.Vector3(0, 0, -1))
})
