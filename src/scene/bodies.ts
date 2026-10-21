import * as THREE from 'three'
import type { GameConfig } from '../config/gameConfig.ts'
import { EARTH_RADIUS, MOON_RADIUS, moonPosition, LUNAR_ORBIT_DAYS } from '../simulation/astronomy.ts'
import { createBodyTexture } from './proceduralTextures.ts'
import { createCloudTexture } from './cloudTexture.ts'

export interface CelestialBodies {
  readonly group: THREE.Group
  readonly earth: THREE.Mesh
  readonly moon: THREE.Mesh
  update(progress: number, simulatedDays: number): void
  dispose(): void
}

export function createCelestialBodies(renderer: THREE.WebGLRenderer, config: GameConfig): CelestialBodies {
  const group = new THREE.Group()
  const sphere = new THREE.SphereGeometry(1, 64, 40)
  const anisotropy = Math.min(config.scene.maximumTextureAnisotropy, renderer.capabilities.getMaxAnisotropy())
  const earthTexture = createBodyTexture('earth', config.scene.proceduralSeed, anisotropy)
  const moonTexture = createBodyTexture('moon', config.scene.proceduralSeed, anisotropy)
  const cloudTexture = createCloudTexture(config.scene.proceduralSeed)
  const earthMaterial = new THREE.MeshStandardMaterial({ map: earthTexture, roughness: 1, metalness: 0 })
  const moonMaterial = new THREE.MeshStandardMaterial({ map: moonTexture, bumpMap: moonTexture, bumpScale: 0.018, roughness: 1 })
  const earth = new THREE.Mesh(sphere, earthMaterial)
  earth.scale.setScalar(EARTH_RADIUS)
  earth.rotation.y = 1.55
  group.add(earth)
  const cloudMaterial = new THREE.MeshStandardMaterial({
    map: cloudTexture, transparent: true, opacity: 0.82, roughness: 1,
    metalness: 0, depthWrite: false, side: THREE.FrontSide,
  })
  const clouds = new THREE.Mesh(sphere, cloudMaterial)
  clouds.scale.setScalar(EARTH_RADIUS * 1.008)
  group.add(clouds)
  const atmosphereGeometry = new THREE.SphereGeometry(1, 48, 32)
  const atmosphereMaterial = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    uniforms: { glowColor: { value: new THREE.Color(0x3e8fff) }, daylightColor: { value: new THREE.Color(0x8feaff) }, sunDirection: { value: new THREE.Vector3(150,120,190).normalize() } },
    vertexShader: `varying vec3 vNormal;
varying vec3 vEye;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vNormal = normalize(mat3(modelMatrix) * normal);
  vEye = normalize(cameraPosition - world.xyz);
  gl_Position = projectionMatrix * viewMatrix * world;
}`,
    fragmentShader: `varying vec3 vNormal;
varying vec3 vEye;
uniform vec3 glowColor;
uniform vec3 daylightColor;
uniform vec3 sunDirection;
void main() {
  float rim = pow(1.0 - abs(dot(normalize(vNormal), normalize(vEye))), 2.75);
  float lit = smoothstep(-0.3, 0.7, dot(normalize(vNormal), normalize(sunDirection)));
  vec3 colour = mix(glowColor, daylightColor, lit);
  gl_FragColor = vec4(colour, rim * mix(0.16, 0.52, lit));
}`,
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
    update(progress, simulatedDays) {
      moon.position.copy(moonPosition(progress, simulatedDays))
      // Simplified axial spin: Earth rotates every simulated day; the Moon stays tidally locked.
      earth.rotation.y = 1.55 + progress * simulatedDays * Math.PI * 2
      clouds.rotation.y = earth.rotation.y + progress * simulatedDays * 0.12
      moon.rotation.y = -(progress * simulatedDays / LUNAR_ORBIT_DAYS) * Math.PI * 2
    },
    dispose() {
      sphere.dispose()
      atmosphereGeometry.dispose()
      atmosphereMaterial.dispose()
      earthMaterial.dispose()
      moonMaterial.dispose()
      earthTexture.dispose()
      moonTexture.dispose()
      cloudTexture.dispose()
      cloudMaterial.dispose()
    },
  }
}
