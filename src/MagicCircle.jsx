import { useEffect, useMemo, useRef, useState } from 'react'
import { PlaneGeometry } from 'three'
import { useFrame } from '@react-three/fiber'
import { getTerrainHeight } from './terrain'
import { magicCircleFragment, magicCircleLayout, magicCircleVertex } from './magicCircleShader'

const { surfaceSize, segments } = magicCircleLayout

export function MagicCircle () {
  const material = useRef()
  const [geometry, setGeometry] = useState(null)
  useEffect(() => {
    const surface = new PlaneGeometry(surfaceSize, surfaceSize, segments, segments)
    const vertices = surface.attributes.position
    for (let i = 0; i < vertices.count; i++) {
      vertices.setZ(i, getTerrainHeight(vertices.getX(i), -vertices.getY(i)) + 0.035)
    }
    surface.computeBoundingSphere()
    setGeometry(surface)
    return () => surface.dispose()
  }, [])
  const uniforms = useMemo(() => ({ angle: { value: 0 } }), [])
  useFrame((state, delta) => {
    if (material.current) {
      // One revolution every three minutes; update the rendered uniforms.
      material.current.uniforms.angle.value = (material.current.uniforms.angle.value + delta * Math.PI / 90) % (Math.PI * 2)
    }
  })

  if (!geometry) return null

  return (
    <mesh rotation-x={-Math.PI / 2}>
      <primitive object={geometry} attach='geometry' />
      <shaderMaterial
        ref={material}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        polygonOffset
        polygonOffsetFactor={-1}
        polygonOffsetUnits={-1}
        vertexShader={magicCircleVertex}
        fragmentShader={magicCircleFragment}
      />
    </mesh>
  )
}
