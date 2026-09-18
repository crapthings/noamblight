const noiseShader = /* glsl */ `
uniform vec2 groundLoop;
uniform float groundTime;
varying vec2 groundMeters;

vec4 groundGradient(vec4 cell) {
  vec4 h = fract(cell * vec4(0.1031, 0.1030, 0.0973, 0.1099));
  h += dot(h, h.wzxy + 33.33);
  vec4 gradient = fract((h.xxyz + h.yzzw) * h.zywx) * 2.0 - 1.0;
  return gradient * inversesqrt(max(dot(gradient, gradient), 0.0001));
}

float groundCorner(vec4 cell, vec4 offset) {
  float weight = max(0.6 - dot(offset, offset), 0.0);
  weight *= weight;
  return weight * weight * dot(groundGradient(cell), offset);
}

// 4D simplex lattice: five gradient contributions per sample.
float groundSimplex(vec4 p) {
  const float F4 = 0.30901699437494745;
  const float G4 = 0.1381966011250105;
  vec4 cell = floor(p + dot(p, vec4(F4)));
  vec4 x = p - cell + dot(cell, vec4(G4));
  vec4 rank = vec4(0.0);
  if (x.x > x.y) rank.x += 1.0; else rank.y += 1.0;
  if (x.x > x.z) rank.x += 1.0; else rank.z += 1.0;
  if (x.x > x.w) rank.x += 1.0; else rank.w += 1.0;
  if (x.y > x.z) rank.y += 1.0; else rank.z += 1.0;
  if (x.y > x.w) rank.y += 1.0; else rank.w += 1.0;
  if (x.z > x.w) rank.z += 1.0; else rank.w += 1.0;
  vec4 i1 = step(vec4(2.5), rank);
  vec4 i2 = step(vec4(1.5), rank);
  vec4 i3 = step(vec4(0.5), rank);
  return 49.0 * (
    groundCorner(cell, x) +
    groundCorner(cell + i1, x - i1 + G4) +
    groundCorner(cell + i2, x - i2 + 2.0 * G4) +
    groundCorner(cell + i3, x - i3 + 3.0 * G4) +
    groundCorner(cell + 1.0, x - 1.0 + 4.0 * G4)
  );
}

float groundFbm(vec4 p) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int octave = 0; octave < 4; octave++) {
    value += amplitude * groundSimplex(p);
    p = p * 2.0 + vec4(17.0, 31.0, 11.0, 7.0);
    amplitude *= 0.5;
  }
  return value / 0.9375;
}

vec2 lavaCellHash(vec2 p) {
  vec3 h = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  h += dot(h, h.yzx + 33.33);
  return fract((h.xx + h.yz) * h.zy);
}

// Uneven rock plates meet in branching cracks, without repeated stripes.
vec3 lavaCracks(vec2 p) {
  vec2 cell = floor(p);
  vec2 local = fract(p);
  float nearest = 100.0;
  float second = 100.0;
  vec2 firstOffset = vec2(0.0);
  vec2 secondOffset = vec2(1.0);
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 neighbor = vec2(float(x), float(y));
      vec2 offset = neighbor + 0.1 + lavaCellHash(cell + neighbor) * 0.8 - local;
      float distanceSquared = dot(offset, offset);
      if (distanceSquared < nearest) {
        second = nearest;
        secondOffset = firstOffset;
        nearest = distanceSquared;
        firstOffset = offset;
      } else if (distanceSquared < second) {
        second = distanceSquared;
        secondOffset = offset;
      }
    }
  }
  vec2 across = normalize(secondOffset - firstOffset);
  vec2 tangent = vec2(-across.y, across.x);
  tangent *= dot(tangent, vec2(0.8, 0.6)) < 0.0 ? -1.0 : 1.0;
  return vec3(sqrt(second) - sqrt(nearest), tangent);
}
`

export function configureGroundShader (shader, loopUniform, timeUniform) {
  shader.uniforms.groundLoop = loopUniform
  shader.uniforms.groundTime = timeUniform
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\nvarying vec2 groundMeters;')
    .replace('#include <begin_vertex>', '#include <begin_vertex>\ngroundMeters = position.xy;')
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', `#include <common>\n${noiseShader}`)
    .replace('#include <map_fragment>', /* glsl */ `
      vec2 lavaP = groundMeters;
      float rockNoise = groundFbm(vec4(lavaP * 0.32, 3.7, 9.1));
      vec2 warp = vec2(
        groundSimplex(vec4(lavaP * 0.13, 7.1, 2.3)),
        groundSimplex(vec4(lavaP * 0.13, 19.4, 8.6))
      );
      vec3 cracks = lavaCracks(lavaP * 0.23 + warp * 0.85);
      float channelDistance = cracks.x;
      float widthVariation = smoothstep(-0.4, 0.4, rockNoise);
      float crackWidth = mix(0.025, 0.16, widthVariation * widthVariation);
      float channelWidth = max(fwidth(channelDistance), 0.006);
      float molten = 1.0 - smoothstep(crackWidth - channelWidth, crackWidth + channelWidth + 0.035, channelDistance);

      // Crossfade two advected samples; each resets only while invisible.
      // The 8 s flow cycle divides the existing 40 s seamless noise loop.
      float phaseA = fract(groundTime / 8.0);
      float phaseB = fract(groundTime / 8.0 + 0.5);
      float blendFlow = abs(phaseA * 2.0 - 1.0);
      vec2 flowDirection = normalize(cracks.yz + warp * 0.25);
      float flowSpeed = mix(0.2, 0.55, widthVariation);
      float flowA = groundFbm(vec4((lavaP - flowDirection * phaseA * 8.0 * flowSpeed) * vec2(0.8, 1.7), groundLoop));
      float flowB = groundFbm(vec4((lavaP - flowDirection * phaseB * 8.0 * flowSpeed) * vec2(0.8, 1.7), groundLoop));
      float flowNoise = mix(flowA, flowB, blendFlow);
      float heat = smoothstep(-0.35, 0.5, flowNoise);
      float core = (1.0 - smoothstep(0.0, crackWidth, channelDistance)) * smoothstep(0.55, 0.9, heat);
      vec3 lavaColor = mix(vec3(0.55, 0.012, 0.001), vec3(1.0, 0.19, 0.008), heat);
      lavaColor = mix(lavaColor, vec3(1.0, 0.68, 0.12), core);
      vec3 crustColor = mix(vec3(0.018, 0.012, 0.014), vec3(0.075, 0.048, 0.035), clamp(rockNoise + 0.5, 0.0, 1.0));
      diffuseColor.rgb = mix(crustColor, lavaColor * 0.3, molten);
      float groundHeight = rockNoise * (1.0 - molten) - molten * 0.3 + flowNoise * molten * 0.12;
    `)
    .replace('#include <roughnessmap_fragment>', `
      #include <roughnessmap_fragment>
      roughnessFactor = mix(0.95, 0.48, molten);
    `)
    .replace('#include <emissivemap_fragment>', `
      #include <emissivemap_fragment>
      totalEmissiveRadiance += lavaColor * molten * mix(0.8, 2.2, heat);
    `)
    .replace('#include <normal_fragment_maps>', /* glsl */ `
      #include <normal_fragment_maps>
      // Reuse the color noise for bump mapping, without extra FBM samples.
      vec3 groundDx = dFdx(-vViewPosition);
      vec3 groundDy = dFdy(-vViewPosition);
      vec3 groundRx = cross(groundDy, normal);
      vec3 groundRy = cross(normal, groundDx);
      float groundDet = dot(groundDx, groundRx) * faceDirection;
      vec3 groundGrad = sign(groundDet) * 0.12 *
        (dFdx(groundHeight) * groundRx + dFdy(groundHeight) * groundRy);
      normal = normalize(max(abs(groundDet), 0.000001) * normal - groundGrad);
    `)
}
