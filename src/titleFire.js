export const fireNoise = `
  float hash3(vec3 p) {
    p = fract(p * 0.1031);
    p += dot(p, p.yzx + 33.33);
    return fract((p.x + p.y) * p.z);
  }
  float noise3(vec3 p) {
    vec3 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash3(i), hash3(i + vec3(1,0,0)), f.x),
      mix(hash3(i + vec3(0,1,0)), hash3(i + vec3(1,1,0)), f.x), f.y),
      mix(mix(hash3(i + vec3(0,0,1)), hash3(i + vec3(1,0,1)), f.x),
      mix(hash3(i + vec3(0,1,1)), hash3(i + vec3(1,1,1)), f.x), f.y), f.z);
  }
  float fbm3(vec3 p) {
    return noise3(p) * 0.65 + noise3(p * 2.03 + 7.1) * 0.35;
  }
`

export const titleDeformation = `
  uniform float titleTime;
  ${fireNoise}
  vec3 deformTitle(vec3 p) {
    vec3 flow = p * 2.5 - vec3(0.0, titleTime * 1.5, 0.0);
    vec3 wobble = vec3(fbm3(flow), fbm3(flow + 17.2), fbm3(flow + 31.7)) - 0.5;
    return p + wobble * vec3(0.075, 0.06, 0.085);
  }
`
