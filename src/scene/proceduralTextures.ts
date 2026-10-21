import * as THREE from 'three'

function seeded(seed: number) {
  return () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296)
}

export function createBodyTexture(kind: 'earth' | 'moon', seed: number, anisotropy: number): THREE.CanvasTexture {
  const random = seeded(seed + (kind === 'moon' ? 1 : 0))
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 512
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas 2D textures are unavailable.')

  if (kind === 'earth') {
    const sea = context.createLinearGradient(0, 0, 0, 512)
    sea.addColorStop(0, '#174c80')
    sea.addColorStop(0.52, '#0b3565')
    sea.addColorStop(1, '#205787')
    context.fillStyle = sea
    context.fillRect(0, 0, 1024, 512)
    const lands: [string, number[]][] = [
      ['#668b68', [48,91,109,72,156,80,196,105,210,133,178,150,165,180,144,192,135,232,102,218,91,191,64,172,40,143]],
      ['#779465', [167,245,206,255,231,290,216,327,198,361,183,397,160,409,146,366,131,326,142,288]],
      ['#718e61', [452,102,501,84,555,96,594,117,621,105,673,126,741,120,792,153,824,173,790,202,734,199,710,233,658,219,631,185,597,178,571,200,534,169,502,163,484,140]],
      ['#9b9664', [492,180,533,161,566,177,591,209,608,256,579,306,556,350,526,340,502,301,481,260,474,211]],
      ['#62875c', [760,318,809,293,853,314,880,343,856,373,812,371,784,350]],
      ['#718c71', [309,70,342,63,356,89,345,117,318,119,300,99]],
      ['#d3dad3', [0,466,175,450,344,458,520,450,708,463,880,451,1024,466,1024,512,0,512]],
    ]
    for (const [colour, points] of lands) {
      context.fillStyle = colour
      context.beginPath()
      context.moveTo(points[0], points[1])
      for (let index = 2; index < points.length; index += 2) context.lineTo(points[index], points[index + 1])
      context.closePath()
      context.fill()
      context.strokeStyle = '#345e60'
      context.lineWidth = 2
      context.stroke()
    }
    for (let index = 0; index < 11000; index++) {
      const x = random() * 1024
      const y = random() * 512
      context.fillStyle = random() > 0.5 ? '#b1aa78' : '#365f51'
      context.globalAlpha = 0.05 + random() * 0.15
      context.fillRect(x, y, 1 + random() * 4, 1 + random() * 3)
    }
    context.globalAlpha = 1
    for (let index = 0; index < 155; index++) {
      const x = random() * 1024
      const y = random() * 490
      const width = 15 + random() * 95
      context.fillStyle = 'rgba(238,246,249,0.11)'
      context.beginPath()
      context.ellipse(x, y, width, 2 + random() * 8, random() * 0.3, 0, Math.PI * 2)
      context.fill()
    }
  } else {
    context.fillStyle = '#9b9a96'
    context.fillRect(0, 0, 1024, 512)
    for (let index = 0; index < 45000; index++) {
      const value = Math.floor(90 + random() * 120)
      context.fillStyle = `rgba(${value},${value},${value},${0.02 + random() * 0.14})`
      context.fillRect(random() * 1024, random() * 512, 1 + random() * 5, 1 + random() * 5)
    }
    // Dark lunar maria help the Moon read as a real world rather than a uniform grey ball.
    for (const [mx, my, rx, ry] of [
      [520, 222, 122, 48], [615, 286, 75, 54], [410, 260, 65, 45],
      [735, 203, 71, 32], [300, 188, 55, 45], [555, 337, 100, 38],
    ]) {
      context.fillStyle = 'rgba(51,51,53,.30)'
      context.beginPath()
      context.ellipse(mx, my, rx, ry, random() * 0.4, 0, Math.PI * 2)
      context.fill()
      for (let j=0; j<100; j++) {
        const x = mx + (random() * 2 - 1) * rx
        const y = my + (random() * 2 - 1) * ry
        context.fillStyle = 'rgba(25,26,28,.04)'
        context.fillRect(x, y, 3 + random() * 9, 2 + random() * 5)
      }
    }
    for (let index = 0; index < 1050; index++) {
      const x = random() * 1024
      const y = random() * 512
      const radius = 1 + Math.pow(random(), 3) * 23
      context.strokeStyle = 'rgba(49,48,47,.25)'
      context.lineWidth = Math.max(1, radius * 0.17)
      context.beginPath()
      context.ellipse(x, y, radius, radius * (0.5 + random() * 0.5), 0, 0, Math.PI * 2)
      context.stroke()
      context.fillStyle = 'rgba(220,218,210,.10)'
      context.beginPath()
      context.arc(x - radius * 0.2, y - radius * 0.3, radius * 0.6, 0, Math.PI * 2)
      context.fill()
    }
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = anisotropy
  return texture
}
