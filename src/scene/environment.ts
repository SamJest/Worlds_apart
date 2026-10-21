import * as THREE from 'three'
import type { GameConfig } from '../config/gameConfig.ts'
import { createGalacticHaze, createSunGlow } from './skyTextures.ts'

const seeded = (initialSeed: number) => {
  let seed = initialSeed
  return () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296)
}

/** Distant panorama stays centred on the camera: stars must not fly past as if they were local objects. */
export function createEnvironment(config: GameConfig) {
  const group = new THREE.Group()
  const sky = new THREE.Group()
  group.add(sky)
  const ambient = new THREE.AmbientLight(0x546984, 1.32)
  group.add(ambient)
  const sun = new THREE.DirectionalLight(0xfff2d7, 3.5)
  sun.position.set(150, 120, 190)
  group.add(sun)

  const backdropTexture = createGalacticHaze(config.scene.proceduralSeed)
  const backdropGeometry = new THREE.SphereGeometry(config.scene.starRadiusWorldUnits * 1.17, 32, 20)
  const backdropMaterial = new THREE.MeshBasicMaterial({ map: backdropTexture, side: THREE.BackSide, depthWrite: false, fog: false, toneMapped: false })
  const backdrop = new THREE.Mesh(backdropGeometry, backdropMaterial)
  backdrop.renderOrder = -100
  sky.add(backdrop)

  const random = seeded(config.scene.proceduralSeed)
  const count = config.scene.starCount
  const positions = new Float32Array(count * 3)
  const colours = new Float32Array(count * 3)
  const sizes = new Float32Array(count)
  const phases = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    const z = random() * 2 - 1
    const angle = random() * Math.PI * 2
    const radius = config.scene.starRadiusWorldUnits
    positions.set([radius * Math.sqrt(1 - z * z) * Math.cos(angle), radius * z, radius * Math.sqrt(1 - z * z) * Math.sin(angle)], i * 3)
    const bright = 0.50 + Math.pow(random(), 2) * 0.5
    const temperature = random()
    colours.set(temperature < 0.22 ? [bright, bright * 0.8, bright * 0.66]
      : temperature > 0.76 ? [bright * 0.74, bright * 0.86, bright]
      : [bright * 0.89, bright * 0.94, bright], i * 3)
    sizes[i] = 1.3 + Math.pow(random(), 6) * 4.0
    phases[i] = random() * Math.PI * 2
  }
  const starGeometry = new THREE.BufferGeometry()
  starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  starGeometry.setAttribute('aColor', new THREE.BufferAttribute(colours, 3))
  starGeometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
  starGeometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1))
  const starMaterial = new THREE.ShaderMaterial({
    transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uScale: { value: 1 }, uMotion: { value: 1 } },
    vertexShader: `attribute vec3 aColor;
attribute float aSize;
attribute float aPhase;
varying vec3 vColor;
varying float vPhase;
uniform float uScale;
void main() {
  vColor = aColor;
  vPhase = aPhase;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = min(7.0, aSize * uScale);
}`,
    fragmentShader: `varying vec3 vColor;
varying float vPhase;
uniform float uTime;
uniform float uMotion;
void main() {
  float r = length(gl_PointCoord - vec2(0.5));
  float fade = 1.0 - smoothstep(0.05, 0.5, r);
  float spark = 0.88 + 0.12 * uMotion * sin(uTime * 0.38 + vPhase);
  gl_FragColor = vec4(vColor * (1.1 + 0.35 * fade), fade * spark);
}`,
  })
  const stars = new THREE.Points(starGeometry, starMaterial)
  stars.frustumCulled = false
  stars.renderOrder = -90
  sky.add(stars)

  const sunTexture = createSunGlow()
  const sunMaterial = new THREE.SpriteMaterial({ map: sunTexture, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, depthTest: false, opacity: 0.8 })
  const sunDisc = new THREE.Sprite(sunMaterial)
  sunDisc.position.copy(sun.position).normalize().multiplyScalar(config.scene.starRadiusWorldUnits * 0.92)
  sunDisc.scale.set(24, 24, 1)
  sunDisc.renderOrder = -80
  sky.add(sunDisc)
  let tick = 0
  return {
    group,
    update(cameraPosition: THREE.Vector3, elapsedSeconds: number, reducedMotion: boolean) {
      sky.position.copy(cameraPosition)
      if (!reducedMotion) tick += Math.min(Math.max(elapsedSeconds, 0), 0.1)
      starMaterial.uniforms.uTime.value = tick
      starMaterial.uniforms.uMotion.value = reducedMotion ? 0 : 1
    },
    setQuality(quality: 'auto' | 'performance' | 'quality') {
      starGeometry.setDrawRange(0, quality === 'performance' ? Math.min(count, 1000) : count)
      starMaterial.uniforms.uScale.value = quality === 'performance' ? 0.8 : 1
      backdrop.visible = quality !== 'performance'
      sunDisc.visible = quality !== 'performance'
    },
    dispose() {
      backdropGeometry.dispose()
      backdropMaterial.dispose()
      backdropTexture.dispose()
      starGeometry.dispose()
      starMaterial.dispose()
      sunMaterial.dispose()
      sunTexture.dispose()
    },
  }
}
