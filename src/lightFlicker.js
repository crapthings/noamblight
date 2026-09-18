import FastNoiseLite from 'fastnoise-lite'

export function createLightFlicker (random = Math.random) {
  const noise = new FastNoiseLite(Math.floor(random() * 2147483647))
  noise.SetNoiseType(FastNoiseLite.NoiseType.OpenSimplex2)
  noise.SetFractalType(FastNoiseLite.FractalType.FBm)
  noise.SetFrequency(1)
  noise.SetFractalOctaves(4)
  noise.SetFractalLacunarity(2)
  noise.SetFractalGain(0.5)

  let time = 0
  let phase = 'on'
  let deadline = 4 + random() * 7
  let pulses = 0

  return delta => {
    time += delta
    while (time >= deadline) {
      if (phase === 'on') {
        phase = 'off'
        deadline += 0.5 + random() * 2.3
        pulses = 1 + Math.floor(random() * 3)
      } else if (phase === 'off') {
        phase = 'restart'
        deadline += 0.08 + random() * 0.16
      } else if (--pulses > 0) {
        phase = 'off'
        deadline += 0.12 + random() * 0.35
      } else {
        phase = 'on'
        deadline += 5 + random() * 10
      }
    }

    if (phase === 'off') return 0
    const slow = noise.GetNoise(time * 0.45, 11.7)
    const flutter = noise.GetNoise(time * 7.5, 83.2)
    const power = Math.max(0.18, Math.min(1, 0.72 + slow * 0.18 + flutter * 0.06))
    return phase === 'restart' ? Math.min(1, power + 0.08) : power
  }
}
