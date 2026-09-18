import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { AdditiveBlending } from 'three'
import { getTerrainHeight } from './terrain'

const count = 1400

export function Sparks () {
  const gl = useThree(state => state.gl)
  const material = useRef()
  const uniforms = useMemo(() => ({ time: { value: 0 }, pixelRatio: { value: 1 } }), [])
  const { positions, seeds } = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const seeds = new Float32Array(count * 4)
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 60
      positions[i * 3 + 2] = (Math.random() - 0.5) * 60
      positions[i * 3 + 1] = getTerrainHeight(positions[i * 3], positions[i * 3 + 2]) + 0.08
      for (let j = 0; j < 4; j++) seeds[i * 4 + j] = Math.random()
    }
    return { positions, seeds }
  }, [])

  useFrame((state, delta) => {
    if (!material.current) return
    material.current.uniforms.time.value += delta
    material.current.uniforms.pixelRatio.value = gl.getPixelRatio()
  })

  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach='attributes-position' args={[positions, 3]} />
        <bufferAttribute attach='attributes-seed' args={[seeds, 4]} />
      </bufferGeometry>
      <shaderMaterial
        ref={material}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
        vertexShader={`
          uniform float time;
          uniform float pixelRatio;
          attribute vec4 seed;
          varying float sparkOpacity;
          varying float sparkHeat;
          float random(float n) { return fract(sin(n * 127.1) * 43758.5453); }
          void main() {
            float duration = mix(5.0, 11.0, seed.x);
            float clock = time / duration + seed.y;
            float cycle = floor(clock);
            float age = fract(clock);
            float id = seed.z * 731.0 + cycle * 17.0;
            // Pause between emissions; anchors follow the terrain surface.
            float life = clamp(age / 0.78, 0.0, 1.0);
            vec3 p = position;
            p.y += life * mix(1.5, 6.0, random(id + 3.0));
            p.x += life * (sin(time * 0.7 + seed.z * 30.0) * 0.65 + life * 0.7);
            p.z += life * cos(time * 0.55 + seed.w * 30.0) * 0.55;
            sparkOpacity = smoothstep(0.0, 0.08, life) * (1.0 - smoothstep(0.45, 1.0, life));
            sparkOpacity *= 0.65 + 0.35 * sin(time * 4.0 + seed.z * 50.0);
            sparkHeat = (1.0 - life) * 0.7 + seed.w * 0.3;
            vec4 viewPosition = modelViewMatrix * vec4(p, 1.0);
            gl_Position = projectionMatrix * viewPosition;
            gl_PointSize = clamp(mix(35.0, 75.0, seed.w) * pixelRatio / max(-viewPosition.z, 1.0), 1.0, 9.0);
          }
        `}
        fragmentShader={`
          varying float sparkOpacity;
          varying float sparkHeat;
          void main() {
            vec2 p = (gl_PointCoord - 0.5) * 2.0;
            float r = length(p * vec2(1.0, 0.8));
            float glow = exp(-r * r * 5.0) * (1.0 - smoothstep(0.7, 1.0, r));
            vec3 color = mix(vec3(1.0, 0.055, 0.004), vec3(1.0, 0.6, 0.12), sparkHeat);
            gl_FragColor = vec4(color * 1.8, glow * sparkOpacity);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }
        `}
      />
    </points>
  )
}
