import { useMemo } from 'react'
import { CatmullRomCurve3, Quaternion, Vector2, Vector3 } from 'three'

function pencilMaterial (shader) {
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\nvarying vec3 pencilPosition;')
    .replace('#include <begin_vertex>', '#include <begin_vertex>\npencilPosition = position;')
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', '#include <common>\nvarying vec3 pencilPosition;')
    .replace('#include <color_fragment>', `
      #include <color_fragment>
      float stroke = (pencilPosition.y + pencilPosition.x * 0.65) * 28.0;
      stroke += sin(pencilPosition.x * 47.0) * 0.35;
      float width = max(fwidth(stroke), 0.02);
      float hatch = 1.0 - smoothstep(0.12, 0.12 + width, abs(fract(stroke) - 0.5));
      float grain = fract(sin(dot(pencilPosition, vec3(127.1, 311.7, 74.7))) * 43758.5453);
      float crossStroke = (pencilPosition.y - pencilPosition.x * 0.85) * 23.0;
      float crossWidth = max(fwidth(crossStroke), 0.02);
      float crossHatch = 1.0 - smoothstep(0.08, 0.08 + crossWidth, abs(fract(crossStroke) - 0.5));
      diffuseColor.rgb *= (1.0 - hatch * 0.65) * (1.0 - crossHatch * 0.3) * mix(0.9, 1.0, grain);
    `)
    .replace('#include <normal_fragment_maps>', `
      #include <normal_fragment_maps>
      float pencilEdge = 1.0 - smoothstep(0.12, 0.42, abs(dot(normal, normalize(vViewPosition))));
      diffuseColor.rgb *= mix(1.0, 0.13, pencilEdge);
    `)
}

function PencilSurface () {
  return (
    <meshStandardMaterial
      color='#d2d1c9'
      roughness={0.98}
      onBeforeCompile={pencilMaterial}
      customProgramCacheKey={() => 'solid-pencil-figure-v2'}
    />
  )
}

function BodyPart ({ position, scale, rotation = [0, 0, 0] }) {
  return (
    <mesh position={position} scale={scale} rotation={rotation} castShadow receiveShadow>
      <sphereGeometry args={[1, 24, 16]} />
      <PencilSurface />
    </mesh>
  )
}

function Limb ({ start, end, radius }) {
  const { center, quaternion, length } = useMemo(() => {
    const a = new Vector3(...start)
    const b = new Vector3(...end)
    const direction = b.clone().sub(a)
    return {
      center: a.add(b).multiplyScalar(0.5),
      quaternion: new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), direction.clone().normalize()),
      length: direction.length()
    }
  }, [start, end])

  return (
    <mesh position={center} quaternion={quaternion} castShadow receiveShadow>
      <capsuleGeometry args={[radius, Math.max(0.01, length - radius * 2), 6, 12]} />
      <PencilSurface />
    </mesh>
  )
}

function PencilStroke ({ points, weight = 0.009 }) {
  const curve = useMemo(() => new CatmullRomCurve3(points.map(point => new Vector3(...point))), [points])
  return (
    <mesh>
      <tubeGeometry args={[curve, 24, weight, 4, false]} />
      <meshStandardMaterial color='#252830' roughness={1} />
    </mesh>
  )
}

const coatProfile = [
  [0.36, 1.42], [0.41, 1.46], [0.38, 1.75], [0.34, 2.06],
  [0.4, 2.38], [0.44, 2.5], [0.35, 2.6], [0.15, 2.69]
].map(([radius, height]) => new Vector2(radius, height))

function Coat () {
  return (
    <group>
      <mesh scale={[1, 1, 0.63]} castShadow receiveShadow>
        <latheGeometry args={[coatProfile, 32]} />
        <PencilSurface />
      </mesh>
      <PencilStroke points={[[-0.15, 2.68, 0.07], [-0.29, 2.47, 0.19], [-0.13, 2.35, 0.24], [0.03, 2.1, 0.23], [0.04, 1.48, 0.26]]} />
      <PencilStroke points={[[0.15, 2.68, 0.07], [0.26, 2.46, 0.2], [0.12, 2.3, 0.24], [0.03, 2.1, 0.23]]} />
      <PencilStroke points={[[-0.34, 1.84, 0.13], [-0.24, 1.79, 0.19], [-0.12, 1.81, 0.23]]} />
      <PencilStroke points={[[0.14, 1.86, 0.22], [0.27, 1.85, 0.18], [0.34, 1.9, 0.12]]} />
      <PencilStroke points={[[-0.39, 1.47, 0.08], [-0.22, 1.43, 0.22], [0, 1.45, 0.27], [0.22, 1.44, 0.22], [0.39, 1.47, 0.08]]} />
      {Array.from({ length: 9 }, (_, i) => (
        <PencilStroke key={i} weight={0.005} points={[
          [-0.31 + i * 0.024, 2.18, 0.18 + i * 0.006],
          [-0.27 + i * 0.024, 2.08, 0.2 + i * 0.005],
          [-0.24 + i * 0.024, 1.94, 0.21 + i * 0.005]
        ]} />
      ))}
    </group>
  )
}

export function SketchFigure () {
  return (
    // Stand at the warm spotlight's penumbra, ahead of the other shapes.
    <group position={[1.5, 0, 7.5]} rotation-y={-0.3}>
      <Coat />
      <BodyPart position={[0, 1.66, 0]} scale={[0.36, 0.27, 0.23]} />
      <Limb start={[0, 2.59, 0]} end={[0, 2.9, 0]} radius={0.13} />
      <group position={[0, 3.08, 0.025]} rotation={[0.1, -0.22, -0.08]}>
        <BodyPart position={[0, 0, 0]} scale={[0.25, 0.35, 0.25]} />
        <BodyPart position={[0, -0.035, 0.24]} scale={[0.045, 0.085, 0.085]} />
        <BodyPart position={[-0.24, -0.01, 0]} scale={[0.045, 0.09, 0.055]} />
        <BodyPart position={[0.24, -0.01, 0]} scale={[0.045, 0.09, 0.055]} />
        <PencilStroke points={[[-0.17, 0.065, 0.19], [-0.1, 0.08, 0.235], [-0.045, 0.06, 0.248]]} />
        <PencilStroke points={[[0.045, 0.06, 0.248], [0.1, 0.07, 0.235], [0.16, 0.055, 0.195]]} />
        <PencilStroke weight={0.006} points={[[-0.07, -0.17, 0.218], [0, -0.18, 0.222], [0.065, -0.165, 0.215]]} />
        {Array.from({ length: 7 }, (_, i) => (
          <PencilStroke key={i} weight={0.008} points={[
            [-0.22 + i * 0.05, 0.12, 0.17],
            [-0.18 + i * 0.044, 0.27, 0.14],
            [-0.09 + i * 0.029, 0.35, 0.025],
            [0.02 + i * 0.025, 0.28, -0.12]
          ]} />
        ))}
      </group>
      <Limb start={[-0.39, 2.53, 0]} end={[-0.57, 2.05, 0.03]} radius={0.13} />
      <Limb start={[-0.57, 2.05, 0.03]} end={[-0.63, 1.64, 0.12]} radius={0.095} />
      <BodyPart position={[-0.63, 1.56, 0.12]} scale={[0.085, 0.15, 0.065]} />
      <Limb start={[0.39, 2.53, 0]} end={[0.57, 2.09, 0.06]} radius={0.14} />
      <Limb start={[0.57, 2.09, 0.06]} end={[0.28, 1.86, 0.21]} radius={0.115} />
      <BodyPart position={[0.26, 1.84, 0.22]} scale={[0.095, 0.12, 0.065]} />
      <Limb start={[-0.2, 1.62, 0]} end={[-0.25, 0.92, 0.025]} radius={0.16} />
      <Limb start={[-0.25, 0.92, 0.025]} end={[-0.3, 0.19, 0.02]} radius={0.115} />
      <Limb start={[0.2, 1.62, 0]} end={[0.25, 0.91, -0.07]} radius={0.16} />
      <Limb start={[0.25, 0.91, -0.07]} end={[0.3, 0.19, -0.05]} radius={0.115} />
      <BodyPart position={[-0.3, 0.11, 0.13]} scale={[0.13, 0.11, 0.26]} />
      <BodyPart position={[0.3, 0.11, 0.06]} scale={[0.13, 0.11, 0.26]} />
    </group>
  )
}
