import FastNoiseLite from 'fastnoise-lite'
import { PlaneGeometry } from 'three'

const noise = new FastNoiseLite(7319)
noise.SetNoiseType(FastNoiseLite.NoiseType.OpenSimplex2)
noise.SetFractalType(FastNoiseLite.FractalType.FBm)
noise.SetFrequency(0.065)
noise.SetFractalOctaves(4)
noise.SetFractalLacunarity(2)
noise.SetFractalGain(0.45)

function smoothstep (low, high, value) {
  const t = Math.max(0, Math.min(1, (value - low) / (high - low)))
  return t * t * (3 - 2 * t)
}

export function getTerrainHeight (x, z) {
  const hills = Math.max(0.08, 0.9 + noise.GetNoise(x, z) * 1.65)
  // A small level area supports the character; slopes meet the room at y=0.
  const centerBlend = smoothstep(2.5, 6, Math.hypot(x, z))
  const edgeBlend = 1 - smoothstep(29, 32, Math.max(Math.abs(x), Math.abs(z)))
  return (0.3 + (hills - 0.3) * centerBlend) * edgeBlend
}

export function createTerrainGeometry () {
  // Static 0.5 m sampling: no per-frame displacement or normal computation.
  const geometry = new PlaneGeometry(64, 64, 128, 128)
  const positions = geometry.attributes.position
  for (let i = 0; i < positions.count; i++) {
    // Ground rotates -PI/2 around X: local Y becomes world -Z.
    positions.setZ(i, getTerrainHeight(positions.getX(i), -positions.getY(i)))
  }
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}
