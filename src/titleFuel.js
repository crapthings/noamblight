import { CanvasTexture, LinearFilter } from 'three'
import { FontLoader } from 'three/addons/loaders/FontLoader.js'
import lettering from './demonLettering.json'

export function createTitleFuel () {
  const shapes = new FontLoader().parse(lettering).generateShapes('Demon', 2.5)
  const points = shapes.flatMap(shape => shape.getPoints(24))
  const cx = (Math.min(...points.map(p => p.x)) + Math.max(...points.map(p => p.x))) / 2
  const cy = (Math.min(...points.map(p => p.y)) + Math.max(...points.map(p => p.y))) / 2
  const canvas = document.createElement('canvas')
  canvas.width = 768
  canvas.height = 384
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = '#fff'
  for (const shape of shapes) {
    ctx.beginPath()
    for (const path of [shape, ...shape.holes]) {
      path.getPoints(32).forEach((p, i) => {
        const x = ((p.x - cx) / 12.4 + 0.5) * canvas.width
        const y = (1 - (p.y - cy + 1.6) / 6.3) * canvas.height
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
      ctx.closePath()
    }
    ctx.fill('evenodd')
  }
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height)
  // Continuous fuel above the actual glyph contours, rather than a box floor.
  for (let x = 0; x < canvas.width; x++) {
    let distance = 1000
    for (let y = canvas.height - 1; y >= 0; y--) {
      const i = (y * canvas.width + x) * 4
      distance = pixels.data[i] > 127 ? 0 : distance + 1
      pixels.data[i + 1] = Math.round(255 * Math.max(0, 1 - distance / 170))
      pixels.data[i + 2] = 0
    }
  }
  ctx.putImageData(pixels, 0, 0)
  const texture = new CanvasTexture(canvas)
  texture.minFilter = LinearFilter
  texture.generateMipmaps = false
  return texture
}
