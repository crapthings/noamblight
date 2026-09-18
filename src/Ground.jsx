import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Uniform, Vector2 } from 'three'
import { configureGroundShader } from './groundShader'
import { createTerrainGeometry } from './terrain'

const loopDuration = 40

export function Ground () {
  const [geometry, setGeometry] = useState(null)
  const phaseTime = useRef(0)
  const loop = useMemo(() => new Uniform(new Vector2(1.5, 0)), [])
  const time = useMemo(() => new Uniform(0), [])
  const compile = useCallback(shader => configureGroundShader(shader, loop, time), [loop, time])

  useEffect(() => {
    const terrain = createTerrainGeometry()
    setGeometry(terrain)
    return () => terrain.dispose()
  }, [])

  useFrame((state, delta) => {
    phaseTime.current = (phaseTime.current + delta) % loopDuration
    time.value = phaseTime.current
    const phase = phaseTime.current / loopDuration * Math.PI * 2
    loop.value.set(Math.cos(phase) * 1.5, Math.sin(phase) * 1.5)
  })

  if (!geometry) return null

  return (
    <mesh castShadow receiveShadow rotation-x={-Math.PI / 2}>
      <primitive object={geometry} attach='geometry' />
      <meshStandardMaterial
        color='#55504d'
        roughness={0.95}
        onBeforeCompile={compile}
        customProgramCacheKey={() => 'ground-flowing-lava-v3'}
      />
    </mesh>
  )
}
