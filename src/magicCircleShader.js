export const magicCircleLayout = {
  surfaceSize: 22.5,
  scale: 4.2,
  segments: 90,
  starRadius: 1.76,
  runeInnerRadius: 1.9,
  runeOuterRadius: 2.08,
  perimeterRadius: 2.32,
  arcRadius: 2.48,
  runeCount: 20,
  tickCount: 40
}

export const magicCircleVertex = `
  varying vec2 circleUv;
  void main() {
    circleUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const layout = magicCircleLayout

export const magicCircleFragment = `
  uniform float angle;
  varying vec2 circleUv;
  const float PI = 3.14159265359;
  const float TAU = 2.0 * PI;
  const float ORIGIN = -PI * 0.5;
  const float STAR_RADIUS = ${layout.starRadius.toFixed(2)};
  const float RUNE_INNER = ${layout.runeInnerRadius.toFixed(2)};
  const float RUNE_OUTER = ${layout.runeOuterRadius.toFixed(2)};
  const float RUNE_RADIUS = (RUNE_INNER + RUNE_OUTER) * 0.5;
  const float PERIMETER = ${layout.perimeterRadius.toFixed(2)};

  float segmentDistance(vec2 p, vec2 a, vec2 b) {
    vec2 ab = b - a;
    return length(p - a - clamp(dot(p - a, ab) / dot(ab, ab), 0.0, 1.0) * ab);
  }

  vec2 starPoint(float index) {
    float theta = ORIGIN + index * TAU / 5.0;
    return vec2(cos(theta), sin(theta)) * STAR_RADIUS;
  }

  // All marks share the pentagram's angular origin. x is tangent, y is radial.
  vec2 polarCell(float theta, float radius, float count, float offset, out float index) {
    float sector = TAU / count;
    float phase = mod(theta - ORIGIN - offset + sector * 0.5, TAU);
    index = floor(phase / sector);
    float localAngle = mod(phase, sector) - sector * 0.5;
    return vec2(sin(localAngle), cos(localAngle)) * radius;
  }

  float runeDistance(vec2 p, float kind) {
    float d;
    if (kind < 0.5) {
      // Forked staff.
      d = segmentDistance(p, vec2(0.0, -0.06), vec2(0.0, 0.06));
      d = min(d, segmentDistance(p, vec2(-0.045, 0.045), vec2(0.0, 0.0)));
      d = min(d, segmentDistance(p, vec2(0.045, 0.045), vec2(0.0, 0.0)));
    } else if (kind < 1.5) {
      // Lozenge with a lower stem.
      d = abs(abs(p.x) + abs(p.y - 0.015) - 0.045) * 0.7071;
      d = min(d, segmentDistance(p, vec2(0.0, -0.03), vec2(0.0, -0.06)));
    } else if (kind < 2.5) {
      // Two posts joined by an oblique stroke.
      d = segmentDistance(p, vec2(-0.035, -0.06), vec2(-0.035, 0.06));
      d = min(d, segmentDistance(p, vec2(0.035, -0.06), vec2(0.035, 0.06)));
      d = min(d, segmentDistance(p, vec2(-0.035, -0.025), vec2(0.035, 0.025)));
    } else if (kind < 3.5) {
      // Split crown.
      d = segmentDistance(p, vec2(0.0, -0.06), vec2(0.0, 0.06));
      d = min(d, segmentDistance(p, vec2(-0.045, -0.005), vec2(0.0, 0.045)));
      d = min(d, segmentDistance(p, vec2(0.045, -0.005), vec2(0.0, 0.045)));
    } else {
      // Angular lightning stroke.
      d = segmentDistance(p, vec2(0.035, 0.06), vec2(-0.035, 0.0));
      d = min(d, segmentDistance(p, vec2(-0.035, 0.0), vec2(0.035, 0.0)));
      d = min(d, segmentDistance(p, vec2(0.035, 0.0), vec2(-0.035, -0.06)));
    }
    return d;
  }

  float stroke(float distanceToLine, float width) {
    // Cell boundaries and deliberate gaps must not become bright seam lines.
    float aa = clamp(fwidth(distanceToLine), 0.0007, 0.008);
    return 1.0 - smoothstep(width - aa, width + aa, distanceToLine);
  }

  void main() {
    vec2 p = (circleUv - 0.5) * (${layout.surfaceSize.toFixed(1)} / ${layout.scale.toFixed(1)});
    float c = cos(angle), s = sin(angle);
    p = mat2(c, -s, s, c) * p;
    float radius = length(p);
    float theta = atan(p.y, p.x);

    float rings = min(abs(radius - RUNE_INNER), abs(radius - RUNE_OUTER));
    rings = min(rings, abs(radius - PERIMETER));

    float runeIndex;
    // Twenty slots, four per fifth; half-slot offset keeps major axes clear.
    vec2 rune = polarCell(theta, radius, ${layout.runeCount.toFixed(1)}, PI / ${layout.runeCount.toFixed(1)}, runeIndex);
    rune.y -= RUNE_RADIUS;
    float glyph = runeDistance(rune, mod(runeIndex, 5.0));
    // The alignment guide shares the glyph centre radius but stops at each glyph.
    float guide = abs(rune.x) > 0.075 ? abs(radius - RUNE_RADIUS) : 10.0;

    float tickIndex;
    vec2 tick = polarCell(theta, radius, ${layout.tickCount.toFixed(1)}, 0.0, tickIndex);
    float major = 1.0 - step(0.5, mod(tickIndex, 8.0));
    float ticks = segmentDistance(tick, vec2(0.0, mix(2.22, 2.15, major)), vec2(0.0, 2.285));

    float star = 10.0;
    for (int i = 0; i < 5; i++) {
      star = min(star, segmentDistance(p, starPoint(float(i)), starPoint(mod(float(i + 2), 5.0))));
    }
    float sealIndex;
    vec2 seal = polarCell(theta, radius, 5.0, 0.0, sealIndex);
    seal.y -= STAR_RADIUS;
    float seals = abs(abs(seal.x) + abs(seal.y) - 0.055) * 0.7071;
    // Reserve a clear centre for the five diamond seals at the star vertices.
    if (length(seal) < 0.075) star = 10.0;

    float arcIndex;
    vec2 arc = polarCell(theta + angle * 1.6, radius, 10.0, 0.0, arcIndex);
    float arcGate = abs(arc.x) < radius * sin(PI / 10.0 * 0.76) ? 1.0 : 0.0;
    float arcs = arcGate > 0.5 ? abs(radius - ${layout.arcRadius.toFixed(2)}) : 10.0;

    float primary = min(star, seals);
    float detail = min(glyph, ticks);
    float structure = min(rings, arcs);
    float distanceToLine = min(min(primary, detail), min(structure, guide));
    float ink = max(stroke(primary, 0.0065), stroke(detail, 0.0045));
    ink = max(ink, stroke(structure, 0.0035) * 0.8);
    ink = max(ink, stroke(guide, 0.002) * 0.4);
    float halo = exp(-distanceToLine * 65.0) * 0.25;
    float alpha = max(ink * 0.94, halo);
    alpha *= 1.0 - smoothstep(2.53, 2.65, radius);
    if (alpha < 0.003) discard;
    vec3 color = mix(vec3(0.95, 0.12, 0.015), vec3(2.4, 0.58, 0.08), ink);
    gl_FragColor = vec4(color, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`
