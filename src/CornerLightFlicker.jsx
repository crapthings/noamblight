import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color } from 'three'
import { createLightFlicker } from './lightFlicker'

export function CornerLightFlicker ({ light, face, fog, color }) {
  const sample = useMemo(() => createLightFlicker(), [])
  const baseColor = useMemo(() => new Color(color), [color])

  useFrame((state, delta) => {
    const power = sample(delta)
    if (light.current) light.current.intensity = 1.8 * power
    if (face.current) face.current.color.copy(baseColor).multiplyScalar(power)
    const intensity = fog.current?.uniforms.get('cornerIntensity')
    if (intensity) intensity.value = 1.8 * power
  })

  return null
}
