import * as THREE from 'three'

function seeded(initialSeed: number) {
  let seed = initialSeed >>> 0
  return () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296)
}

/** Semi-transparent, latitude-weighted cloud fields. No external imagery or runtime downloads. */
export function createCloudTexture(seed: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 512
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Cloud canvas could not be created')
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  const random = seeded(seed ^ 0x6c0d)
  const latitudeBands = [0.15, 0.28, 0.48, 0.66, 0.82]
  for (let i = 0; i < 1700; i++) {
    const centre = latitudeBands[i % latitudeBands.length] * canvas.height
    const y = centre + (random() - 0.5) * 105
    const x = random() * canvas.width
    const wide = 5 + random() * 55
    const high = 1 + random() * 11
    const alpha = 0.025 + random() * 0.09
    ctx.fillStyle = `rgba(236,247,255,${alpha.toFixed(3)})`
    ctx.beginPath()
    ctx.ellipse(x, y, wide, high, (random() - 0.5) * 0.6, 0, Math.PI * 2)
    ctx.fill()
    // Draw around the equirectangular seam too.
    if (x < wide || x > canvas.width - wide) {
      ctx.beginPath()
      ctx.ellipse(x + (x < wide ? canvas.width : -canvas.width), y, wide, high, 0, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  // Greater but not fully opaque cloud cover over the high latitudes.
  for (const y of [48, 465]) {
    const gradient = ctx.createLinearGradient(0, y - 25, 0, y + 25)
    gradient.addColorStop(0, 'rgba(255,255,255,0)')
    gradient.addColorStop(0.5, 'rgba(240,248,255,0.30)')
    gradient.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, y - 25, canvas.width, 50)
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.RepeatWrapping
  return texture
}
