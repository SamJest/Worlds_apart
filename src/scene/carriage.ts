import * as THREE from 'three'

export function createCarriage() {
  const group = new THREE.Group()
  const geometries: THREE.BufferGeometry[] = []
  const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x9bb6c0, metalness: 0.7, roughness: 0.24 })
  const darkMaterial = new THREE.MeshStandardMaterial({ color: 0x101b2a, metalness: 0.5, roughness: 0.27 })
  const glassMaterial = new THREE.MeshPhysicalMaterial({ color: 0x204865, metalness: 0.12, roughness: 0.12, transparent: true, opacity: 0.48, side: THREE.DoubleSide })
  const lightMaterial = new THREE.MeshBasicMaterial({ color: 0x8fe8ff })
  const materials = [bodyMaterial, darkMaterial, glassMaterial, lightMaterial]
  const box = (width: number, height: number, depth: number, x: number, y: number, z: number, material: THREE.Material) => {
    const geometry = new THREE.BoxGeometry(width, height, depth)
    geometries.push(geometry)
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.set(x, y, z)
    group.add(mesh)
  }
  box(0.055, 0.019, 0.14, 0, 0.019, 0, bodyMaterial)
  box(0.054, 0.022, 0.087, 0, 0.039, -0.013, darkMaterial)
  box(0.051, 0.003, 0.09, 0, 0.052, -0.013, bodyMaterial)
  box(0.002, 0.023, 0.08, -0.026, 0.041, -0.014, glassMaterial)
  box(0.002, 0.023, 0.08, 0.026, 0.041, -0.014, glassMaterial)
  box(0.048, 0.022, 0.003, 0, 0.041, -0.055, glassMaterial)
  box(0.04, 0.012, 0.004, 0, 0.027, 0.067, lightMaterial)
  for (const x of [-0.018, 0.018]) {
    box(0.009, 0.007, 0.015, x, 0.007, -0.044, darkMaterial)
    box(0.009, 0.007, 0.015, x, 0.007, 0.046, darkMaterial)
  }
  const podLight = new THREE.PointLight(0x85dfff, 1.8, 0.32)
  podLight.position.set(0, 0.032, 0.06)
  group.add(podLight)
  return { group, dispose: () => { geometries.forEach(geometry => geometry.dispose()); materials.forEach(material => material.dispose()) } }
}
