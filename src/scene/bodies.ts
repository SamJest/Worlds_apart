import * as THREE from 'three'
import type { GameConfig } from '../config/gameConfig.ts'
import { EARTH_RADIUS, MOON_RADIUS, moonPosition } from '../simulation/astronomy.ts'
import { createBodyTexture } from './proceduralTextures.ts'

export interface CelestialBodies {
  readonly group: THREE.Group
  readonly earth: THREE.Mesh
  readonly moon: THREE.Mesh
  update(progress: number): void
  dispose(): void
}

export function createCelestialBodies(renderer: THREE.WebGLRenderer, config: GameConfig): CelestialBodies {
  const group = new THREE.Group()
  const sphere = new THREE.SphereGeometry(1, 64, 40)
  const anisotropy = Math.min(config.scene.maximumTextureAnisotropy, renderer.capabilities.getMaxAnisotropy())
  const earthTexture = createBodyTexture('earth', config.scene.proceduralSeed, anisotropy)
  const moonTexture = createBodyTexture('moon', config.scene.proceduralSeed, anisotropy)
  const earthMaterial = new THREE.MeshStandardMaterial({ map: earthTexture, roughness: 1, metalness: 0 })
  const moonMaterial = new THREE.MeshStandardMaterial({ map: moonTexture, roughness: 1 })
  const earth = new THREE.Mesh(sphere, earthMaterial)
  earth.scale.setScalar(EARTH_RADIUS)
  earth.rotation.y = 1.55
  group.add(earth)
  const atmosphereGeometry = new THREE.SphereGeometry(1, 48, 32)
  const atmosphereMaterial = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.BackSide,
    uniforms: { glowColor: { value: new THREE.Color(0x448fff) } },
    vertexShader: 'varying vec3 vNormal;varying vec3 vEye;void main(){vec4 world=modelMatrix*vec4(position,1.);vNormal=normalize(mat3(modelMatrix)*normal);vEye=normalize(cameraPosition-world.xyz);gl_Position=projectionMatrix*viewMatrix*world;}',
    fragmentShader: 'varying vec3 vNormal;varying vec3 vEye;uniform vec3 glowColor;void main(){float a=pow(1.-abs(dot(vNormal,vEye)),3.);gl_FragColor=vec4(glowColor,a*.48);}',
  })
  const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial)
  atmosphere.scale.setScalar(EARTH_RADIUS * 1.045)
  group.add(atmosphere)
  const moon = new THREE.Mesh(sphere, moonMaterial)
  moon.scale.setScalar(MOON_RADIUS)
  group.add(moon)

  return {
    group,
    earth,
    moon,
    update(progress) {
      moon.position.copy(moonPosition(progress, config.journey.simulatedDays))
      moon.rotation.y = progress * 0.22
    },
    dispose() {
      sphere.dispose()
      atmosphereGeometry.dispose()
      atmosphereMaterial.dispose()
      earthMaterial.dispose()
      moonMaterial.dispose()
      earthTexture.dispose()
      moonTexture.dispose()
    },
  }
}
