import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { createFreightInfrastructure } from '../src/scene/freightInfrastructure.ts'
import { dispatchFreight, newFreightState } from '../src/simulation/freightEconomy.ts'

test('freight service constructs a separate local guideway, depot stations, and updateable shuttle', () => {
  const network = createFreightInfrastructure()
  assert.ok(network.group instanceof THREE.Group)
  const objects = []
  network.group.traverse(object => objects.push(object))
  const rails = objects.filter(object => object instanceof THREE.Mesh && object.geometry instanceof THREE.TubeGeometry)
  assert.ok(rails.length >= 4)
  const base = newFreightState()
  assert.doesNotThrow(() => network.update(base))
  assert.doesNotThrow(() => network.update(dispatchFreight(base)))
  assert.doesNotThrow(() => network.update({ ...base, tier: 2 }))
  assert.doesNotThrow(() => network.dispose())
})
