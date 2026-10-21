import * as THREE from 'three'

/** A roofed observation carriage with a genuinely hollow cabin for first-person view. */
export function createCarriage() {
  const group = new THREE.Group()
  const geometries: THREE.BufferGeometry[] = []
  const shell = new THREE.MeshStandardMaterial({ color: 0xaac1c7, metalness: 0.66, roughness: 0.28 })
  const frame = new THREE.MeshStandardMaterial({ color: 0x162e43, metalness: 0.62, roughness: 0.35 })
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x65b9d1, metalness: 0.02, roughness: 0.08, transparent: true, opacity: 0.10, depthWrite: false, side: THREE.DoubleSide })
  const lights = new THREE.MeshBasicMaterial({ color: 0x9defff })
  const seat = new THREE.MeshStandardMaterial({ color: 0x2e556b, metalness: 0.05, roughness: 0.8 })
  const materials = [shell, frame, glass, lights, seat]
  const box = (width: number, height: number, depth: number, x: number, y: number, z: number, material: THREE.Material) => {
    const geometry = new THREE.BoxGeometry(width, height, depth)
    geometries.push(geometry)
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.set(x, y, z)
    group.add(mesh)
  }

  // Observation deck, structure and overhead canopy. Never fill the cabin with an opaque box:
  // the first-person camera sits at y=.043, z=.017 and must look through the front window.
  box(0.066, 0.008, 0.150, 0, 0.018, 0, shell)
  // Panoramic glazed canopy allows a full first-person sky view.
  box(0.057, 0.002, 0.105, 0, 0.054, -0.005, glass)
  box(0.058, 0.004, 0.003, 0, 0.054, -0.057, shell)
  box(0.058, 0.004, 0.003, 0, 0.054, 0.045, shell)
  box(0.051, 0.003, 0.105, 0, 0.025, -0.005, frame)
  for (const x of [-0.029, 0.029]) {
    for (const z of [-0.055, -0.002, 0.045]) box(0.003, 0.027, 0.003, x, 0.040, z, frame)
    box(0.003, 0.003, 0.104, x, 0.051, -0.005, shell)
    box(0.002, 0.020, 0.045, x, 0.040, -0.028, glass)
    box(0.002, 0.020, 0.044, x, 0.040, 0.020, glass)
  }
  box(0.053, 0.023, 0.002, 0, 0.040, 0.046, glass)
  box(0.052, 0.020, 0.002, 0, 0.040, -0.057, glass)
  box(0.055, 0.004, 0.005, 0, 0.029, 0.044, frame) // dashboard below eye line

  // Pairs of low passenger benches behind the observation position.
  for (const z of [-0.041, -0.012]) {
    for (const x of [-0.014, 0.014]) {
      box(0.018, 0.004, 0.013, x, 0.030, z, seat)
      box(0.018, 0.013, 0.004, x, 0.036, z - 0.007, seat)
    }
  }
  for (const x of [-0.021, 0.021]) {
    for (const z of [-0.048, 0.048]) {
      box(0.012, 0.006, 0.016, x, 0.007, z, frame)
      box(0.009, 0.003, 0.019, x, 0.003, z, lights)
    }
  }
  // Illuminated leading edge makes orientation legible from the external camera.
  box(0.048, 0.006, 0.008, 0, 0.023, 0.075, lights)
  box(0.022, 0.006, 0.020, 0, 0.014, 0.087, frame)
  for (const x of [-0.025, 0.025]) {
    box(0.002, 0.002, 0.118, x, 0.055, -0.005, lights)
    box(0.004, 0.003, 0.12, x, 0.021, 0, lights)
  }
  // Rear glass is kept clear: looking back at Earth is a primary player action.
  box(0.028, 0.004, 0.004, 0, 0.026, -0.059, lights)
  const podLight = new THREE.PointLight(0x85dfff, 1.25, 0.34)
  podLight.position.set(0, 0.032, 0.062)
  group.add(podLight)

  return {
    group,
    dispose() {
      geometries.forEach(geometry => geometry.dispose())
      materials.forEach(material => material.dispose())
    },
  }
}
