import * as THREE from 'three'
import type { GameConfig } from '../config/gameConfig.ts'

const seeded = (initialSeed: number) => {
  let seed = initialSeed
  return () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296)
}

export function createEnvironment(config: GameConfig) {
  const group = new THREE.Group()
  group.add(new THREE.AmbientLight(0x42577b, 1.15))
  const sun = new THREE.DirectionalLight(0xfff0da, 3.3)
  sun.position.set(150, 120, 190)
  group.add(sun)
  const random = seeded(config.scene.proceduralSeed)
  const positions = new Float32Array(config.scene.starCount * 3)
  const colours = new Float32Array(config.scene.starCount * 3)
  for (let index = 0; index < config.scene.starCount; index++) {
    const z = random() * 2 - 1
    const angle = random() * Math.PI * 2
    const radius = config.scene.starRadiusWorldUnits
    positions.set([radius * Math.sqrt(1 - z * z) * Math.cos(angle), radius * z, radius * Math.sqrt(1 - z * z) * Math.sin(angle)], index * 3)
    const brightness = 0.4 + random() * 0.6
    colours.set([brightness * 0.82, brightness * 0.9, brightness], index * 3)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colours, 3))
  const material = new THREE.PointsMaterial({ size: 1.1, sizeAttenuation: false, vertexColors: true, depthWrite: false })
  group.add(new THREE.Points(geometry, material))
  return { group, dispose: () => { geometry.dispose(); material.dispose() } }
}
