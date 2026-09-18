import { useCallback } from 'react'
import { useTexture } from '@react-three/drei'
import { SRGBColorSpace } from 'three'

export function WallMuralMaterial () {
  const texture = useTexture(`${import.meta.env.BASE_URL}textures/angel-demon-mural.jpeg`, loaded => {
    loaded.colorSpace = SRGBColorSpace
  })
  const blendMural = useCallback(shader => {
    // Blend pigment into the existing wall albedo, before lighting/shadows.
    // No emissive overlay: the original silhouette stays fully shadowed.
    shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
      vec2 muralUv = (vMapUv - 0.5) * vec2(65.0 / 55.0, 32.0 / 30.696) + 0.5;
      vec2 edge = smoothstep(vec2(0.0), vec2(0.055), muralUv)
        * (1.0 - smoothstep(vec2(0.945), vec2(1.0), muralUv));
      vec3 pigment = texture2D(map, clamp(muralUv, 0.0, 1.0)).rgb;
      float luminance = dot(pigment, vec3(0.2126, 0.7152, 0.0722));
      pigment = mix(vec3(luminance), pigment, 0.65);
      diffuseColor.rgb = mix(diffuseColor.rgb, pigment * 0.38,
        0.52 * edge.x * edge.y);
    `)
  }, [])

  return (
    <meshStandardMaterial
      map={texture}
      color='#211b1d'
      roughness={0.88}
      metalness={0.08}
      onBeforeCompile={blendMural}
      customProgramCacheKey={() => 'faded-wall-mural-v1'}
    />
  )
}
