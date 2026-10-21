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

test('first-person starts backward and discrete facings inherit track direction', () => {
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
  controller.look(500, 0)
  controller.apply(point, new THREE.Vector3(1, 0, 0), moon, 1 / 60, false, up)
  nearVector(camera.getWorldDirection(direction), new THREE.Vector3(0, 0, -1))
})

test('third-person retains 360 orbit while first-person horizontal drag is locked', () => {
  const camera = new THREE.PerspectiveCamera()
  const controller = new CameraController(camera, defaultGameConfig.camera)
  const point = new THREE.Vector3(10, 4, 3)
  const tangent = new THREE.Vector3(0, 0, 1)
  const moon = new THREE.Vector3(200, 0, 0)
  controller.apply(point, tangent, moon)
  const firstDirection = camera.getWorldDirection(new THREE.Vector3())
  controller.look(800, 0)
  controller.apply(point, tangent, moon)
  nearVector(camera.getWorldDirection(new THREE.Vector3()), firstDirection)

  controller.toggleMode()
  controller.apply(point, tangent, moon, 1 / 60, true)
  const before = camera.position.clone()
  controller.turnAround()
  controller.apply(point, tangent, moon, 1 / 60, true)
  assert.ok(camera.position.distanceTo(before) > defaultGameConfig.camera.externalDistanceWorldUnits)
})

test('transported track frame follows a corkscrew smoothly without horizon resets', () => {
  const route = evaluateGuideway(4, 25, applyGuidewayPreset('corkscrew')).route
  const orientation = new TrackOrientation(route.curve, 720)
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
