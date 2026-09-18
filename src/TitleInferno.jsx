import { wrapEffect } from '@react-three/postprocessing'
import { BlendFunction, Effect, EffectAttribute } from 'postprocessing'
import { Matrix4, Uniform } from 'three'
import { fireNoise } from './titleFire'
import { createTitleFuel } from './titleFuel'
import { titleScale } from './titleSettings'

const fragmentShader = `
  uniform mat4 inverseProjection;
  uniform mat4 cameraWorld;
  uniform float elapsed;
  uniform float titleScale;
  uniform sampler2D titleFuel;
  ${fireNoise}

  void mainImage(const in vec4 inputColor, const in vec2 uv, const in float depth, out vec4 outputColor) {
    outputColor = inputColor;
    vec4 viewPoint = inverseProjection * vec4(uv * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
    viewPoint /= viewPoint.w;
    vec3 surface = (cameraWorld * viewPoint).xyz;
    vec3 origin = cameraWorld[3].xyz;
    vec3 ray = normalize(surface - origin);
    // One shared field, in metres relative to the title. Clip against opaque
    // scene depth so letters and the character correctly occlude the fire.
    vec3 localOrigin = (origin - vec3(0.0, 8.1, -2.5)) / titleScale;
    vec3 safeRay = mix(vec3(-1.0), vec3(1.0), step(vec3(0.0), ray)) * max(abs(ray), vec3(0.00001));
    vec3 a = (vec3(-7.6, -1.6, -2.6) - localOrigin) / safeRay;
    vec3 b = (vec3(7.6, 5.3, 1.0) - localOrigin) / safeRay;
    vec3 lo = min(a, b), hi = max(a, b);
    float start = max(0.0, max(max(lo.x, lo.y), lo.z));
    float end = min(length(surface - origin) / titleScale, min(min(hi.x, hi.y), hi.z));
    if (end <= start) return;
    float stepLength = (end - start) / 40.0;
    float jitter = hash3(vec3(gl_FragCoord.xy, 0.0));
    vec3 radiance = vec3(0.0);
    float transmission = 1.0;
    for (int i = 0; i < 40; i++) {
      vec3 p = localOrigin + ray * (start + (float(i) + jitter) * stepLength);
      // Large moving eddies warp a continuous bed of fuel, not separate cones.
      vec3 flow = p * vec3(0.75, 0.65, 1.1) - vec3(elapsed * 0.12, elapsed * 1.1, 0.0);
      float eddy = fbm3(flow);
      vec3 warped = flow + vec3(eddy * 1.4, -eddy * 0.6, eddy * 0.9);
      float folds = fbm3(warped * vec3(2.1, 1.5, 2.2) + vec3(4.0, -elapsed * 0.55, 9.0));
      // Keep the glyph roots fixed; lift only the plume above the strokes.
      float plumeLift = smoothstep(0.0, 2.4, p.y) * 0.28;
      float liftY = p.y - plumeLift;
      float spread = smoothstep(-0.2, 3.6, liftY);
      float width = 1.0 + spread * 0.24;
      float drift = spread * ((eddy - 0.5) * 1.1 + sin(liftY * 1.7 - elapsed * 0.8) * 0.16);
      vec2 fuelUv = vec2((p.x - drift) / (12.4 * width) + 0.5, (liftY + 1.6) / 6.3);
      vec2 baseFuel = texture2D(titleFuel, fuelUv).rg;
      // Turbulence grows away from the strokes; roots remain attached.
      float loose = 1.0 - baseFuel.r * 0.85;
      vec2 bend = vec2((eddy - 0.5) * (0.085 + spread * 0.07), (folds - 0.5) * 0.045) * loose;
      vec2 fuel = texture2D(titleFuel, fuelUv + bend).rg;
      // A short irregular skirt curls beneath the actual stroke bottoms.
      float lowerCurl = texture2D(titleFuel, fuelUv + vec2(bend.x, 0.025 + eddy * 0.035)).r;
      fuel.g = max(fuel.g, lowerCurl * (0.45 + folds * 0.25));
      float rising = 1.0 - fuel.g;
      float side = 1.0 - smoothstep(6.7, 7.5, abs(p.x));
      // Fire straddles the 0.6 m extrusion instead of sitting behind it.
      float centerZ = -0.08 + (eddy - 0.5) * 0.55;
      float thickness = mix(0.8, 0.35, rising);
      float depthEnvelope = 1.0 - smoothstep(thickness * 0.2, thickness, abs(p.z - centerZ));
      float envelope = side * depthEnvelope;
      float broken = smoothstep(0.06, 0.42, fuel.g - (1.0 - folds) * 0.78);
      float density = envelope * broken * 2.0;
      // A thin, translucent layer licks the front; the stronger fire wraps
      // through the holes and around the sides, with scene-depth occlusion.
      density *= mix(1.0, 0.17, smoothstep(0.18, 0.48, p.z));
      float heat = clamp(folds * 0.55 + broken * 0.22 + (1.0 - rising) * 0.12, 0.0, 1.0);
      vec3 color = mix(vec3(0.65, 0.008, 0.001), vec3(2.6, 0.25, 0.008), smoothstep(0.12, 0.7, heat));
      color = mix(color, vec3(3.5, 1.35, 0.12), smoothstep(0.78, 0.98, heat));
      float smoke = smoothstep(0.0, 0.15, fuel.g) * side * depthEnvelope * smoothstep(0.65, 0.95, rising);
      smoke *= (1.0 - smoothstep(1.0, 1.3, rising)) * smoothstep(0.42, 0.65, eddy) * 0.3;
      float extinction = density + smoke;
      color = (color * density + vec3(0.025, 0.008, 0.006) * smoke) / max(extinction, 0.0001);
      float alpha = 1.0 - exp(-extinction * stepLength);
      radiance += transmission * alpha * color;
      transmission *= 1.0 - alpha;
      if (transmission < 0.025) break;
    }
    outputColor = vec4(inputColor.rgb * transmission + radiance, inputColor.a);
  }
`

class TitleInfernoEffect extends Effect {
  constructor () {
    super('TitleInferno', fragmentShader, {
      attributes: EffectAttribute.DEPTH,
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map([
        ['inverseProjection', new Uniform(new Matrix4())],
        ['cameraWorld', new Uniform(new Matrix4())],
        ['elapsed', new Uniform(0)],
        ['titleScale', new Uniform(titleScale)],
        ['titleFuel', new Uniform(createTitleFuel())]
      ])
    })
  }

  dispose () {
    this.uniforms.get('titleFuel').value.dispose()
    super.dispose()
  }

  set mainCamera (camera) {
    this.camera = camera
  }

  update (renderer, inputBuffer, deltaTime) {
    if (!this.camera) return
    this.uniforms.get('inverseProjection').value.copy(this.camera.projectionMatrixInverse)
    this.uniforms.get('cameraWorld').value.copy(this.camera.matrixWorld)
    this.uniforms.get('elapsed').value += deltaTime
  }
}

export const TitleInferno = wrapEffect(TitleInfernoEffect)
