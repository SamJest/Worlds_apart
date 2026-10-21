import * as THREE from 'three'

/** Intentionally artistic: an extremely subdued Galactic haze, not a mapped telescope photograph. */
export function createGalacticHaze(seed: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 512
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Sky backdrop texture could not be created')
  const image = context.createImageData(canvas.width, canvas.height)
  for (let y = 0; y < canvas.height; y++) {
    const v = y / canvas.height
    for (let x = 0; x < canvas.width; x++) {
      const u = x / canvas.width
      // Curved Milky-Way-like dust lane. Texture seam is wrapped horizontally.
      const ridge = 0.48 + 0.15 * Math.sin(u * Math.PI * 2 + 0.4) + 0.06 * Math.sin(u * Math.PI * 6 + 0.3)
      const distance = (v - ridge) / 0.16
      const band = Math.exp(-distance * distance * 0.8)
      const cloud = Math.sin(u * 39 + Math.sin(v * 24) * 2.4 + seed) * Math.cos(v * 30 + u * 17)
      const knots = Math.max(0, 0.60 + cloud * 0.40)
      const blue = band * (0.38 + knots * 0.45)
      const amber = Math.max(0, Math.sin(u * Math.PI * 4 + 0.6)) * band * 0.16
      const p = (y * canvas.width + x) * 4
      image.data[p] = Math.round(3 + blue * 18 + amber * 15)
      image.data[p + 1] = Math.round(6 + blue * 17 + amber * 7)
      image.data[p + 2] = Math.round(16 + blue * 34)
      image.data[p + 3] = 255
    }
  }
  context.putImageData(image, 0, 0)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.RepeatWrapping
  return texture
}

export function createSunGlow(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 128
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Sun halo texture could not be created')
  const glow = context.createRadialGradient(64, 64, 0, 64, 64, 64)
  glow.addColorStop(0, 'rgba(255,254,234,1)')
  glow.addColorStop(0.06, 'rgba(255,240,190,.95)')
  glow.addColorStop(0.18, 'rgba(171,195,255,.27)')
  glow.addColorStop(0.52, 'rgba(85,118,247,.052)')
  glow.addColorStop(1, 'rgba(85,118,247,0)')
  context.fillStyle = glow
  context.fillRect(0, 0, 128, 128)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}
