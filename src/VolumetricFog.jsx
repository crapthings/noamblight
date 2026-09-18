import { wrapEffect } from '@react-three/postprocessing'
import { BlendFunction, Effect, EffectAttribute } from 'postprocessing'
import { Matrix4, Uniform, Vector3 } from 'three'

const fragmentShader = /* glsl */ `
uniform mat4 inverseProjection;
uniform mat4 cameraWorld;
uniform vec3 keyPosition;
uniform vec3 fillPosition;
uniform vec3 keyDirection;
uniform vec3 fillDirection;
uniform vec3 cornerPosition;
uniform vec3 cornerDirection;
uniform float cornerIntensity;
uniform float elapsed;

float hash(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.yzx + 33.33);
  return fract((p.x + p.y) * p.z);
}

float noise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x),
        mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
    mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x),
        mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}

float beam(vec3 p, vec3 lightPosition, vec3 lightDirection, float angle, float penumbra) {
  vec3 offset = p - lightPosition;
  float alignment = dot(offset, lightDirection) * inversesqrt(max(dot(offset, offset), 0.0001));
  return smoothstep(cos(angle), cos(angle * (1.0 - penumbra)), alignment);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, const in float depth, out vec4 outputColor) {
  vec4 viewPoint = inverseProjection * vec4(uv * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
  viewPoint /= viewPoint.w;
  vec3 surface = (cameraWorld * viewPoint).xyz;
  vec3 origin = cameraWorld[3].xyz;
  vec3 ray = normalize(surface - origin);

  // Concentrate samples in the drifting layer above the entire floor.
  vec3 safeRay = mix(vec3(0.00001), ray, step(vec3(0.00001), abs(ray)));
  vec3 t0 = (vec3(-32.0, 0.0, -32.0) - origin) / safeRay;
  vec3 t1 = (vec3(32.0, 8.0, 32.0) - origin) / safeRay;
  vec3 nearBounds = min(t0, t1);
  vec3 farBounds = max(t0, t1);
  float start = max(max(max(nearBounds.x, nearBounds.y), nearBounds.z), 0.0);
  float end = min(min(min(farBounds.x, farBounds.y), farBounds.z), length(surface - origin));
  if (end <= start) {
    outputColor = inputColor;
    return;
  }

  // Short rays need fewer samples; cap the longest rays at 24 steps.
  float sampleCount = clamp(ceil((end - start) / 1.5), 8.0, 24.0);
  float stepLength = (end - start) / sampleCount;
  float jitter = hash(vec3(gl_FragCoord.xy, 0.0));
  float transmittance = 1.0;
  vec3 scattering = vec3(0.0);
  vec3 drift = vec3(-elapsed * 0.065, -elapsed * 0.045, elapsed * 0.035);
  vec3 stepOffset = ray * stepLength;
  vec3 p = origin + ray * (start + jitter * stepLength);
  for (int i = 0; i < 24; i++) {
    if (float(i) >= sampleCount || transmittance < 0.01) break;
    // Stretch the noise horizontally to form wisps instead of round clouds.
    float broad = noise(p * vec3(0.16, 0.42, 0.16) + drift);
    float detail = noise(p * vec3(0.43, 0.85, 0.43) + drift * 1.7 + broad * 0.65);
    float variation = smoothstep(0.25, 0.78, broad * 0.7 + detail * 0.3);
    float edge = 1.0 - smoothstep(31.0, 32.0, max(abs(p.x), abs(p.z)));
    float height = max(p.y, 0.0);
    float layerTop = 1.0 - smoothstep(4.0, 8.0, height);
    float floorLayer = exp(-height * 0.65);
    float wisps = exp(-height * 0.32) * variation * variation;
    float density = (0.014 * floorLayer + 0.042 * wisps) * edge * layerTop;
    float opacity = 1.0 - exp(-density * stepLength);
    // Approximate warm scattering from the emissive lava beneath the fog.
    vec3 illumination = vec3(0.22, 0.065, 0.022) * exp(-height * 0.45);
    illumination += vec3(1.0, 0.127, 0.012) * beam(p, keyPosition, keyDirection, 0.65, 0.65) * 0.8;
    illumination += vec3(1.0, 0.745, 0.216) * beam(p, fillPosition, fillDirection, 0.75, 0.65) * 0.65;
    illumination += vec3(1.0, 0.533, 0.266) * beam(p, cornerPosition, cornerDirection, 0.65, 0.8) * cornerIntensity;
    scattering += transmittance * opacity * illumination;
    transmittance *= 1.0 - opacity;
    p += stepOffset;
  }
  outputColor = vec4(inputColor.rgb * transmittance + scattering, inputColor.a);
}
`

class VolumetricFogEffect extends Effect {
  constructor ({ keyPosition, fillPosition, cornerPosition }) {
    super('VolumetricFog', fragmentShader, {
      attributes: EffectAttribute.DEPTH,
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map([
        ['inverseProjection', new Uniform(new Matrix4())],
        ['cameraWorld', new Uniform(new Matrix4())],
        ['keyPosition', new Uniform(new Vector3(...keyPosition))],
        ['fillPosition', new Uniform(new Vector3(...fillPosition))],
        ['keyDirection', new Uniform(new Vector3(0, 3, 0).sub(new Vector3(...keyPosition)).normalize())],
        ['fillDirection', new Uniform(new Vector3(0, 3, 0).sub(new Vector3(...fillPosition)).normalize())],
        ['cornerPosition', new Uniform(new Vector3(...cornerPosition))],
        ['cornerDirection', new Uniform(new Vector3(0, 3, 0).sub(new Vector3(...cornerPosition)).normalize())],
        ['cornerIntensity', new Uniform(0.036)],
        ['elapsed', new Uniform(0)]
      ])
    })
  }

  set mainCamera (camera) {
    this.camera = camera
  }

  update (renderer, inputBuffer, deltaTime) {
    const camera = this.camera
    if (!camera) return
    this.uniforms.get('inverseProjection').value.copy(camera.projectionMatrixInverse)
    this.uniforms.get('cameraWorld').value.copy(camera.matrixWorld)
    this.uniforms.get('elapsed').value += deltaTime
  }
}

export const VolumetricFog = wrapEffect(VolumetricFogEffect)
