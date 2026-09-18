import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, RGBADepthPacking, SRGBColorSpace } from 'three'
import { FontLoader } from 'three/addons/loaders/FontLoader.js'
import lettering from './demonLettering.json'
import { titleDeformation } from './titleFire'
import { titleScale } from './titleSettings'

const font = new FontLoader().parse(lettering)
const shapes = font.generateShapes('Demon', 2.5)
const outlinePoints = shapes.flatMap(shape => shape.getPoints(24))
const centerX = (Math.min(...outlinePoints.map(p => p.x)) + Math.max(...outlinePoints.map(p => p.x))) / 2
const centerY = (Math.min(...outlinePoints.map(p => p.y)) + Math.max(...outlinePoints.map(p => p.y))) / 2

// Shift the fire's orange hue toward gold; keep saturation below pure yellow.
const rimGold = new Color().setHSL(0.125, 0.9, 0.64, SRGBColorSpace)

export function DemonTitle () {
  const time = useMemo(() => ({ value: 0 }), [])
  const deform = useMemo(() => shader => {
    shader.uniforms.titleTime = time
    shader.vertexShader = titleDeformation + shader.vertexShader
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', 'vec3 transformed = deformTitle(position);')
  }, [time])
  const gild = useMemo(() => shader => {
    deform(shader)
    shader.uniforms.rimGold = { value: rimGold }
    shader.vertexShader = 'varying float goldBevel;\n' + shader.vertexShader
    shader.vertexShader = shader.vertexShader.replace('vec3 transformed = deformTitle(position);', `
      vec3 transformed = deformTitle(position);
      float faceNormal = abs(normal.z);
      goldBevel = smoothstep(0.08, 0.4, faceNormal)
        * (1.0 - smoothstep(0.94, 0.999, faceNormal));
    `)
    shader.fragmentShader = 'uniform vec3 rimGold; varying float goldBevel;\n' + shader.fragmentShader
    shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>', `
      #include <emissivemap_fragment>
      totalEmissiveRadiance += rimGold * goldBevel * 1.65;
    `)
  }, [deform])
  useFrame((state, delta) => { time.value += delta })

  return (
    <group position={[0, 8.1, -2.5]} scale={titleScale}>
      <mesh position={[-centerX, -centerY, -0.3]} castShadow receiveShadow>
        <extrudeGeometry args={[shapes, { depth: 0.6, bevelEnabled: true, bevelThickness: 0.055, bevelSize: 0.035, bevelSegments: 3, curveSegments: 24, steps: 5 }]} />
        <meshStandardMaterial
          color='#853016'
          metalness={0.5}
          roughness={0.42}
          emissive='#ff4808'
          emissiveIntensity={0.32}
          onBeforeCompile={gild}
          customProgramCacheKey={() => 'demon-gold-bevel-v2'}
        />
        <meshDepthMaterial
          attach='customDepthMaterial'
          depthPacking={RGBADepthPacking}
          onBeforeCompile={deform}
          customProgramCacheKey={() => 'demon-subtle-depth-v1'}
        />
      </mesh>
    </group>
  )
}
