/**
 * Planet shaders.
 *
 * BAKE: one program for every body (uniform `uKind` picks the recipe). Runs once per body on the GPU
 * and writes a cube map: rgb = albedo, a = height (0..1). Layer 1 writes clouds (rgb color, a coverage).
 *
 * RUNTIME: a cheap per-frame shader that samples the bake, adds bump from height, a soft stylized
 * terminator, ocean glint, atmosphere tint, glowing parts and ring shadows.
 */

export const RING_GLSL = /* glsl */ `
// Density of a ring across its width (x: 0 inner .. 1 outer).
float ringDensity(float x, float faint, float seed) {
  if (x <= 0.0 || x >= 1.0) return 0.0;
  if (faint > 0.5) {
    // Uranus: a few thin, dark rings.
    float d = 0.0;
    d += smoothstep(0.012, 0.0, abs(x - 0.12));
    d += smoothstep(0.010, 0.0, abs(x - 0.33));
    d += smoothstep(0.010, 0.0, abs(x - 0.52));
    d += smoothstep(0.018, 0.0, abs(x - 0.93)) * 1.4;
    return clamp(d, 0.0, 1.0) * 0.85;
  }
  float n = 0.5 + 0.5 * sin(x * 160.0 + seed);
  n = mix(n, 0.5 + 0.5 * sin(x * 47.0 + seed * 2.3), 0.45);
  n = mix(n, 0.5 + 0.5 * sin(x * 13.0 + seed * 0.7), 0.3);
  float dens = 0.45 + 0.55 * n;
  // Faint inner ring, bright middle ring, the Cassini Division gap, then the outer ring.
  dens *= mix(0.28, 1.0, smoothstep(0.16, 0.3, x));
  dens *= 1.0 - 0.93 * smoothstep(0.045, 0.012, abs(x - 0.66));
  dens *= mix(1.0, 0.75, smoothstep(0.7, 0.75, x));
  dens *= 1.0 - 0.6 * smoothstep(0.008, 0.0, abs(x - 0.92));
  dens *= smoothstep(0.0, 0.04, x) * smoothstep(1.0, 0.97, x);
  return dens;
}
`;

export const BAKE_GLSL = /* glsl */ `
uniform int uKind;
uniform int uLayer;
uniform vec3 uC0, uC1, uC2, uC3, uC4, uC5;
uniform vec4 uP;
uniform float uSeed;
uniform float uCloudCover;
uniform float uBakeClouds;
uniform vec3 uCloudColor;

const float PI = 3.14159265;

vec3 seedOff() { return vec3(uSeed * 1.37, uSeed * -2.11, uSeed * 0.73); }

float lonOf(vec3 d) { return atan(d.z, d.x); }
float latOf(vec3 d) { return asin(clamp(d.y, -1.0, 1.0)); }

// Craters at one scale: returns height change; adds to bright for fresh crater floors and rims.
float craterLayer(vec3 p, float scale, float fill, inout float bright, inout float dark) {
  vec2 c = cells(p * scale);
  float id = c.y;
  float exists = step(1.0 - fill, fract(id * 7.31 + 0.13));
  float r = 0.2 + 0.24 * fract(id * 3.17);
  float d = c.x / r;
  float bowl = 1.0 - smoothstep(0.0, 1.0, d);
  float rim = smoothstep(1.4, 1.0, d) * smoothstep(0.55, 1.0, d);
  bright += exists * rim * 0.22;
  dark += exists * bowl * 0.25;
  return exists * (rim * 0.5 - bowl * bowl * 0.85);
}

float craterField(vec3 p, float density, inout float bright, inout float dark) {
  float h = 0.0;
  h += craterLayer(p + 3.1, 2.2, 0.35 * density, bright, dark) * 1.0;
  h += craterLayer(p + 7.7, 5.0, 0.5 * density, bright, dark) * 0.55;
  h += craterLayer(p - 4.3, 11.0, 0.6 * density, bright, dark) * 0.3;
  return h;
}

// Bright rays splashed out from a few big young craters (the Moon's Tycho, Mercury's rays).
float rays(vec3 d, vec3 center, float amount) {
  float a = acos(clamp(dot(d, center), -1.0, 1.0));
  vec3 t = normalize(cross(center, vec3(0.0, 1.0, 0.0) + 0.001));
  vec3 b = cross(center, t);
  float ang = atan(dot(d, b), dot(d, t));
  float streak = pow(max(0.0, snoise(vec3(ang * 4.0, 0.0, 1.7))), 2.0);
  return amount * streak * smoothstep(0.9, 0.05, a) * smoothstep(0.0, 0.05, a);
}

vec4 surface(vec3 d) {
  vec3 p = d + seedOff();
  float lat = latOf(d);
  float alat = abs(d.y);
  vec3 col = uC0;
  float h = 0.5;

  if (uKind == 0) { // rocky
    float n = fbm(p * 2.2) * 0.5 + 0.5;
    float br = 0.0, dk = 0.0;
    float cr = craterField(p, 0.6, br, dk);
    h = clamp(n * 0.6 + cr * 0.35 + 0.2, 0.0, 1.0);
    col = mix(uC1, uC0, smoothstep(0.3, 0.7, n));
    col = mix(col, uC2, br);
    col = mix(col, uC3, dk);
  } else if (uKind == 1) { // cratered: Moon, Mercury, Ceres, Callisto...
    float density = uP.x;
    float variant = uP.w;
    float br = 0.0, dk = 0.0;
    float cr = craterField(p, density, br, dk);
    float hills = fbm(p * 1.6) * 0.5 + 0.5;
    // Maria: big smooth dark plains (mostly on one side for the Moon).
    float mare = smoothstep(0.0, 0.22, fbm(p * 1.1 + 2.0)) * uP.y;
    if (variant > 0.5 && variant < 1.5) mare *= smoothstep(-0.4, 0.4, d.z);
    col = mix(uC0, uC2, smoothstep(0.55, 0.85, hills) * 0.5);
    col = mix(col, uC1, mare * 0.85);
    col = mix(col, uC2, br * (1.0 - mare * 0.6));
    col = mix(col, uC3, dk * 0.6);
    col = mix(col, uC2, rays(d, normalize(vec3(0.2, -0.55, 0.8)), uP.z) * 0.6);
    col = mix(col, uC2, rays(d, normalize(vec3(-0.7, 0.4, 0.55)), uP.z) * 0.4);
    h = clamp(0.55 + cr * 0.32 + (hills - 0.5) * 0.25 - mare * 0.12, 0.0, 1.0);
    if (variant > 1.5 && variant < 2.5) { // Ceres: bright salt spots in Occator crater
      float s = smoothstep(0.06, 0.02, distance(d, normalize(vec3(0.62, 0.32, 0.72))));
      s += smoothstep(0.035, 0.01, distance(d, normalize(vec3(0.58, 0.36, 0.73))));
      col = mix(col, uC3, clamp(s, 0.0, 1.0));
    } else if (variant > 2.5 && variant < 3.5) { // Ganymede: light grooved terrain, darker old regions, frosty poles
      float region = smoothstep(-0.1, 0.25, fbm(p * 1.3 - 5.0));
      float grooves = 0.5 + 0.5 * sin((d.x * 3.0 + fbm(p * 2.0) * 2.5) * 22.0);
      col = mix(uC1, uC2, region);
      col = mix(col, uC2 * 1.1, region * grooves * 0.35);
      col = mix(col, uC2, br * 0.5);
      col = mix(col, uC3, smoothstep(0.62, 0.85, alat));
    } else if (variant > 3.5 && variant < 4.5) { // Callisto: dark crust with many bright craters
      col = mix(uC0, uC1, smoothstep(0.3, 0.7, hills));
      col = mix(col, uC3, br * 0.55);
    } else if (variant > 4.5) { // Charon: reddish-brown north pole
      col = mix(col, uC3, smoothstep(0.62, 0.85, d.y + fbm(p * 3.0) * 0.08));
    }
  } else if (uKind == 2) { // Earth
    vec3 q = vec3(fbm(p * 0.9), fbm(p * 0.9 + 4.1), fbm(p * 0.9 - 2.7));
    float cont = fbm(p * 0.95 + q * 0.75) * 0.5 + 0.5;
    float detail = fbm(p * 6.0) * 0.5 + 0.5;
    float hgt = cont + (detail - 0.5) * 0.1;
    float sea = uP.x;
    if (hgt < sea) {
      float depth = smoothstep(sea - 0.16, sea, hgt);
      col = mix(uC0, uC1, depth * depth);
      h = hgt * 0.5;
    } else {
      float t = smoothstep(sea, sea + 0.25, hgt);
      // Deserts around 15-35 degrees latitude, forests elsewhere.
      float dry = smoothstep(0.5, 0.75, fbm(p * 2.4 + 9.0) * 0.5 + 0.5 + 0.3 * (1.0 - abs(alat - 0.38) * 3.5));
      col = mix(uC2, uC3, dry);
      col = mix(col, uC4, smoothstep(0.55, 0.95, t));
      col = mix(col, uC5, smoothstep(0.82, 1.0, t) * 0.7);
      h = 0.55 + t * 0.45;
    }
    // Ice caps (Antarctica is land, the Arctic is sea ice; both look white from space).
    float ice = smoothstep(0.78, 0.86, alat + (detail - 0.5) * 0.12);
    col = mix(col, uC5, ice);
    if (ice > 0.5) h = max(h, 0.6);
    if (uBakeClouds > 0.5) {
      float cl = smoothstep(0.55 - uCloudCover * 0.35, 0.9, fbm(p * 2.0 + vec3(fbm(p * 1.3) * 1.2)) * 0.5 + 0.5);
      col = mix(col, vec3(1.0), cl * 0.85);
    }
  } else if (uKind == 3) { // Venus: thick yellowish cloud tops in soft bands and a sideways Y shape
    float swirl = fbm(vec3(p.x * 1.2, p.y * 4.0, p.z * 1.2) + fbm(p * 1.5) * 1.2);
    float chevron = sin(lat * 6.0 + abs(lonOf(d)) * 0.6 + swirl * 2.5);
    float v = clamp(0.5 + swirl * 0.45 + chevron * 0.18, 0.0, 1.0);
    col = mix(uC1, uC0, smoothstep(0.2, 0.6, v));
    col = mix(col, uC2, smoothstep(0.62, 0.95, v));
    col = mix(col, uC3, smoothstep(0.35, 0.0, v) * 0.6);
    h = 0.5;
  } else if (uKind == 4) { // Mars
    float n = fbm(p * 1.4) * 0.5 + 0.5;
    float dark = smoothstep(0.52, 0.66, fbm(p * 1.0 + 3.3) * 0.5 + 0.5 + (0.12 - abs(d.y + 0.1)) * 0.8);
    float br = 0.0, dk = 0.0;
    float cr = craterField(p, 0.35, br, dk);
    col = mix(uC0, uC2, smoothstep(0.55, 0.8, n));
    col = mix(col, uC1, dark * 0.75);
    col = mix(col, uC4, dk * 0.4);
    h = clamp(0.5 + (n - 0.5) * 0.5 + cr * 0.25 - dark * 0.08, 0.0, 1.0);
    // Valles Marineris: a long canyon just south of the equator.
    float lon = lonOf(d);
    float canyon = smoothstep(0.035, 0.0, abs(d.y + 0.08 + 0.03 * sin(lon * 5.0))) * smoothstep(1.4, 0.4, abs(lon - 0.4));
    col = mix(col, uC1 * 0.75, canyon * 0.8);
    h -= canyon * 0.35;
    // Olympus Mons: a giant gentle volcano.
    float om = smoothstep(0.24, 0.0, distance(d, normalize(vec3(-0.75, 0.32, 0.55))));
    h += om * 0.45;
    col = mix(col, uC2, om * 0.35);
    // Polar ice caps (the north one is bigger).
    float capN = smoothstep(0.86, 0.9, d.y + (fbm(p * 4.0)) * 0.05);
    float capS = smoothstep(0.9, 0.94, -d.y + (fbm(p * 4.0 + 2.0)) * 0.05);
    col = mix(col, uC3, max(capN, capS));
  } else if (uKind == 5) { // Banded giants: Jupiter, Saturn, Uranus, Neptune
    float bands = uP.x;
    float turb = uP.y;
    float variant = uP.z;
    float w1 = fbm(vec3(d.x * 2.5, d.y * 9.0, d.z * 2.5) + seedOff());
    float w2 = fbm(vec3(d.x * 6.0, d.y * 20.0, d.z * 6.0) - seedOff());
    float y = d.y + turb * (w1 * 0.05 + w2 * 0.018);
    float b = sin(y * bands * PI * 0.5);
    float b2 = sin(y * bands * 2.3 * PI * 0.5 + 1.3);
    col = mix(uC1, uC0, smoothstep(-0.35, 0.35, b));
    col = mix(col, uC3, smoothstep(0.6, 0.95, b) * 0.6);
    col = mix(col, uC2, smoothstep(0.5, 0.9, -b2) * 0.45 * (1.0 - smoothstep(0.7, 0.9, alat)));
    col = mix(col, uC5, smoothstep(0.65, 0.95, alat) * 0.7);
    // Eddies and little white storms along the belt edges.
    float edge = 1.0 - abs(b);
    float eddy = smoothstep(0.55, 0.85, fbm(p * 9.0) * 0.5 + 0.5) * edge * turb;
    col = mix(col, uC3, eddy * 0.5);
    col = mix(uC0, col, uP.w);
    h = 0.5;
    float lon = lonOf(d);
    if (variant > 0.5 && variant < 1.5) {
      // Jupiter's Great Red Spot: a giant oval storm south of the equator.
      float dl = atan(sin(lon - 0.9), cos(lon - 0.9));
      float e = pow(dl / 0.26, 2.0) + pow((lat + 0.39) / 0.1, 2.0);
      float swirl = sin(e * 6.0 - atan(lat + 0.39, dl) * 2.0) * 0.5 + 0.5;
      col = mix(col, uC3, smoothstep(1.6, 1.1, e) * 0.7);
      col = mix(col, mix(uC4, uC4 * 0.75, swirl * 0.5), smoothstep(1.05, 0.7, e));
    } else if (variant > 1.5) {
      // Neptune: a dark spot with bright white clouds beside it.
      float dl = atan(sin(lon + 1.2), cos(lon + 1.2));
      float e = pow(dl / 0.22, 2.0) + pow((lat + 0.35) / 0.11, 2.0);
      col = mix(col, uC4, smoothstep(1.0, 0.6, e));
      float wc = smoothstep(0.7, 0.86, fbm(vec3(p.x * 2.5, p.y * 14.0, p.z * 2.5)) * 0.5 + 0.5);
      wc *= smoothstep(0.15, 0.35, alat) * smoothstep(0.7, 0.5, alat);
      col = mix(col, uC5, wc * 0.6);
      float comp = smoothstep(1.5, 0.9, pow(dl / 0.28, 2.0) + pow((lat + 0.22) / 0.04, 2.0));
      col = mix(col, uC5, comp * 0.8);
    }
  } else if (uKind == 6) { // Io: sulfur yellow, orange and red patches, dark volcanoes, white frost
    float n = fbm(p * 2.0) * 0.5 + 0.5;
    col = mix(uC0, uC1, smoothstep(0.55, 0.75, n) * 0.7);
    col = mix(col, uC3, smoothstep(0.3, 0.15, n) * 0.6);
    vec2 v = cells(p * 4.0);
    float vent = smoothstep(0.16, 0.05, v.x) * step(0.45, fract(v.y * 5.3));
    float halo = smoothstep(0.32, 0.12, v.x) * step(0.45, fract(v.y * 5.3));
    col = mix(col, uC4, halo * 0.7);
    col = mix(col, uC2, vent);
    h = 0.55 + (n - 0.5) * 0.2 - vent * 0.5;
  } else if (uKind == 7) { // Europa: white ice with long reddish-brown cracks
    float m = fbm(p * 1.8) * 0.5 + 0.5;
    col = mix(uC0, uC1, smoothstep(0.45, 0.8, m));
    float lines = 0.0;
    for (int i = 0; i < 3; i++) {
      vec3 o = vec3(float(i) * 3.7, float(i) * -1.9, float(i) * 2.3);
      float r = 1.0 - abs(snoise(p * (2.5 + float(i) * 1.7) + o + fbm(p * 2.0 + o) * 0.6));
      lines = max(lines, smoothstep(0.93, 0.985, r) * (0.7 + 0.3 * float(i == 0)));
    }
    float chaos = smoothstep(0.62, 0.75, fbm(p * 3.0 + 6.0) * 0.5 + 0.5);
    col = mix(col, uC3, chaos * 0.55);
    col = mix(col, uC2, lines * 0.85);
    h = 0.5 + lines * 0.1 - chaos * 0.05;
  } else if (uKind == 8) { // Titan: thick orange haze with soft bands
    float s = fbm(vec3(p.x * 1.5, p.y * 3.0, p.z * 1.5)) * 0.5 + 0.5;
    col = mix(uC1, uC0, smoothstep(0.3, 0.7, s));
    col = mix(col, uC2, smoothstep(0.65, 0.95, d.y * 0.5 + 0.5) * 0.4);
    col = mix(col, uC3, smoothstep(0.75, 0.95, -d.y) * 0.3);
    h = 0.5;
  } else if (uKind == 9) { // Pluto: tan with the bright heart (Tombaugh Regio) and a dark red band
    float lon = lonOf(d);
    float n = fbm(p * 2.0) * 0.5 + 0.5;
    col = mix(uC0, uC3, smoothstep(0.55, 0.8, n) * 0.6);
    col = mix(col, uC4, smoothstep(0.6, 0.9, d.y) * 0.6);
    // The heart: two lobes and a point, centered at lon 0, lat ~15 degrees.
    vec2 q = vec2(atan(sin(lon), cos(lon)), lat - 0.22) * vec2(1.0, 1.2);
    float lobe1 = length(q - vec2(-0.2, 0.08)) - 0.3;
    float lobe2 = length(q - vec2(0.22, 0.06)) - 0.26;
    float point = dot(abs(q - vec2(0.0, -0.18)), vec2(0.7, 0.7)) - 0.28;
    float heart = min(min(lobe1, lobe2), point + 0.05);
    float inHeart = smoothstep(0.03, -0.03, heart + (n - 0.5) * 0.06);
    col = mix(col, uC2, inHeart);
    // Dark reddish region along the equator, west of the heart.
    float band = smoothstep(0.28, 0.08, abs(d.y + 0.05)) * smoothstep(-0.2, -0.9, atan(sin(lon), cos(lon))) * smoothstep(-3.1, -2.2, atan(sin(lon), cos(lon)));
    col = mix(col, uC1, band * 0.85);
    float br = 0.0, dk = 0.0;
    float cr = craterField(p, 0.25, br, dk);
    h = 0.5 + (n - 0.5) * 0.3 + cr * 0.2 * (1.0 - inHeart);
  } else if (uKind == 10) { // Zephyra: glowing violet seas, big teal lands with pink shores, crystal fields, magic veins
    vec3 q = vec3(fbm(p * 0.7), fbm(p * 0.7 + 3.3), fbm(p * 0.7 - 1.7));
    float land = fbm(p * 0.75 + q * 0.7) * 0.5 + 0.5;
    float r = ridged(p * 1.3 + q * 0.5);
    float onLand = smoothstep(0.5, 0.56, land);
    col = mix(uC4, uC0, smoothstep(0.25, 0.5, land));
    col = mix(col, uC2, smoothstep(0.44, 0.5, land) * (1.0 - onLand) * 0.8);
    col = mix(col, uC1, onLand);
    col = mix(col, uC1 * 1.25, smoothstep(0.6, 0.75, land) * 0.4);
    float crystal = smoothstep(0.74, 0.8, fbm(p * 3.0 + 4.0) * 0.5 + 0.5) * onLand;
    col = mix(col, uC3, crystal * 0.8);
    float vein = smoothstep(0.86, 0.96, r) * onLand;
    h = clamp(0.3 + onLand * 0.35 + vein * 0.35, 0.0, 1.0);
  } else if (uKind == 11) { // icy moons: Enceladus, Miranda, Triton
    float variant = uP.z;
    float n = fbm(p * 2.2) * 0.5 + 0.5;
    float br = 0.0, dk = 0.0;
    float cr = craterField(p, 0.4, br, dk);
    col = mix(uC0, uC1, smoothstep(0.5, 0.8, n) * 0.5);
    h = 0.5 + cr * 0.2 + (n - 0.5) * 0.2;
    if (variant < 0.5) {
      // Enceladus: blue "tiger stripes" near the south pole.
      float lon = lonOf(d);
      float stripes = 0.0;
      for (int i = 0; i < 4; i++) {
        float fi = float(i);
        stripes += smoothstep(0.018, 0.0, abs(d.y + 0.78 + fi * 0.045 + 0.03 * sin(lon * 2.0 + fi)));
      }
      col = mix(col, uC2, clamp(stripes, 0.0, 1.0) * smoothstep(-0.55, -0.7, d.y));
      col = mix(col, uC3, br * 0.3);
    } else if (variant < 1.5) {
      // Miranda: patchwork terrain with huge grooved ovals ("coronae").
      float best = 9.0;
      vec3 cs[3];
      cs[0] = normalize(vec3(0.8, -0.3, 0.5));
      cs[1] = normalize(vec3(-0.6, -0.2, 0.75));
      cs[2] = normalize(vec3(0.1, -0.85, -0.5));
      float grooves = 0.0;
      for (int i = 0; i < 3; i++) {
        float a = acos(clamp(dot(d, cs[i]), -1.0, 1.0));
        float inside = smoothstep(0.62, 0.5, a);
        grooves = max(grooves, inside * (0.5 + 0.5 * sin(a * 40.0 + fbm(p * 3.0) * 4.0)));
        best = min(best, a);
      }
      col = mix(col, uC2, grooves * 0.15);
      col = mix(col, uC3, smoothstep(0.66, 0.6, best) * smoothstep(0.5, 0.58, best) * 0.8);
      h += grooves * 0.15;
    } else {
      // Triton: bumpy "cantaloupe" terrain and a pinkish south polar cap with dark streaks.
      vec2 c = cells(p * 7.0);
      float dimple = smoothstep(0.1, 0.45, c.x);
      col = mix(col, uC1, (1.0 - dimple) * 0.4 * smoothstep(-0.1, 0.4, d.y));
      float cap = smoothstep(-0.2, -0.4, d.y);
      col = mix(col, uC3, cap * 0.7);
      float streak = smoothstep(0.7, 0.9, fbm(vec3(p.x * 14.0, p.y * 2.0, p.z * 14.0)) * 0.5 + 0.5) * cap;
      col = mix(col, uC2, streak * 0.8);
      h += (1.0 - dimple) * 0.1;
    }
  } else if (uKind == 12) { // The Sun: granulation and a few sunspots
    vec2 g = cells(p * 26.0);
    float gran = smoothstep(0.65, 0.1, g.x);
    float big = fbm(p * 3.0) * 0.5 + 0.5;
    col = mix(uC2, uC0, gran * 0.6 + big * 0.4);
    vec2 sp = cells(p * 3.0);
    float spot = smoothstep(0.1, 0.03, sp.x) * step(0.8, fract(sp.y * 9.1)) * smoothstep(0.6, 0.2, alat);
    col = mix(col, uC3 * 0.4, spot);
    h = gran;
  } else if (uKind == 13) { // candy moons (made up): swirly stripes and dots
    float lon = lonOf(d);
    float s = sin((d.y + 0.25 * sin(lon * 2.0 + d.y * 3.0)) * uP.x * PI);
    col = mix(uC0, uC1, smoothstep(-0.2, 0.2, s));
    vec2 c = cells(p * 5.0);
    float spot = smoothstep(0.2, 0.14, c.x) * step(0.5, fract(c.y * 3.3));
    col = mix(col, uC2, spot * 0.85);
    h = 0.5 + spot * 0.15;
  }
  return vec4(col, clamp(h, 0.0, 1.0));
}

vec4 clouds(vec3 d) {
  vec3 p = d * 1.0 + seedOff() + 11.0;
  float lat = latOf(d);
  float cover = uCloudCover;
  float v;
  if (uKind == 3) {
    // Venus: long streaks.
    v = fbm(vec3(p.x * 1.0, p.y * 6.0, p.z * 1.0) + fbm(p * 2.0)) * 0.5 + 0.5;
  } else {
    // Swirly weather: warp toward little cyclones.
    vec3 q = vec3(fbm(p * 1.4), fbm(p * 1.4 + 2.7), fbm(p * 1.4 - 3.9));
    v = fbm(p * 1.6 + q * 1.4 + vec3(0.0, lat * 2.0, 0.0)) * 0.5 + 0.5;
    v += 0.08 * (fbm(p * 5.0) * 0.5 + 0.5);
  }
  float a = smoothstep(0.62 - cover * 0.35, 0.9 - cover * 0.2, v);
  return vec4(uCloudColor, a);
}

vec4 bake(vec3 d) {
  return uLayer == 1 ? clouds(d) : surface(d);
}
`;

export const PLANET_VERT = /* glsl */ `
varying vec3 vObj;
varying vec3 vWorldPos;
varying vec3 vWorldN;
void main() {
  vObj = normalize(position);
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  vWorldN = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

export const PLANET_FRAG = /* glsl */ `
uniform samplerCube uSurface;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform vec3 uAmbient;
uniform vec3 uAtmo;
uniform float uAtmoStrength;
uniform float uBump;
uniform float uTexel;
uniform float uSpec;
uniform float uSea;
uniform vec3 uEmissive;
uniform float uEmissiveMode;
uniform float uDim;
uniform float uTime;
uniform vec3 uCenter;
uniform float uRadius;
uniform vec3 uRingN;
uniform vec4 uRing; // inner, outer (planet radii), opacity, faint
uniform float uRingOn;
uniform float uSeedR;
uniform mat3 uRot;
varying vec3 vObj;
varying vec3 vWorldPos;
varying vec3 vWorldN;
${RING_GLSL}
void main() {
  vec3 o = normalize(vObj);
  vec4 s = textureCube(uSurface, o);
  vec3 albedo = s.rgb;
  float h = s.a;
  vec3 Ng = normalize(vWorldN);
  vec3 N = Ng;
  #ifdef BUMP
  if (uBump > 0.0) {
    vec3 t = normalize(cross(o, abs(o.y) < 0.95 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0)));
    vec3 b = cross(o, t);
    float hx = textureCube(uSurface, normalize(o + t * uTexel)).a;
    float hy = textureCube(uSurface, normalize(o + b * uTexel)).a;
    vec3 nObj = normalize(o - (t * (hx - h) + b * (hy - h)) * uBump * 8.0);
    // Object -> world with the planet's rotation.
    N = normalize(uRot * nObj);
  }
  #endif
  vec3 L = normalize(uSunDir);
  vec3 V = normalize(cameraPosition - vWorldPos);
  float ndl = dot(N, L);
  float ndlG = dot(Ng, L);
  // A soft, slightly wrapped terminator reads well for kids and looks "animated film".
  float diff = smoothstep(-0.08, 0.55, ndl) * (0.25 + 0.75 * smoothstep(-0.25, 0.2, ndlG));
  vec3 col = albedo * (uSunColor * diff + uAmbient);
  // Warm glow along the day/night line on worlds with air.
  col += albedo * uAtmo * uAtmoStrength * 0.25 * smoothstep(0.25, 0.0, abs(ndlG - 0.05));
  if (uSpec > 0.0) {
    float ocean = 1.0 - smoothstep(uSea * 0.5 - 0.01, uSea * 0.5 + 0.005, h);
    vec3 H = normalize(L + V);
    float glint = pow(max(dot(Ng, H), 0.0), 70.0) * 2.2 + pow(max(dot(Ng, H), 0.0), 8.0) * 0.12;
    col += uSunColor * glint * uSpec * ocean * smoothstep(0.0, 0.2, ndlG);
  }
  // Ring shadow across the planet.
  if (uRingOn > 0.5) {
    float denom = dot(L, uRingN);
    if (abs(denom) > 0.001) {
      float t = dot(uCenter - vWorldPos, uRingN) / denom;
      if (t > 0.0) {
        vec3 hit = vWorldPos + L * t;
        float r = length(hit - uCenter) / uRadius;
        float x = (r - uRing.x) / (uRing.y - uRing.x);
        col *= 1.0 - ringDensity(x, uRing.w, uSeedR) * uRing.z * 0.8;
      }
    }
  }
  // Atmosphere: thicker toward the edge of the disc, only on the lit side.
  float fres = pow(1.0 - max(dot(Ng, V), 0.0), 2.2);
  col = mix(col, uAtmo * (uSunColor * 0.9) * smoothstep(-0.2, 0.5, ndlG), clamp(fres * uAtmoStrength * 0.85, 0.0, 1.0));
  if (uEmissiveMode > 0.5) {
    float g = uEmissiveMode < 1.5 ? smoothstep(0.2, 0.05, h) : smoothstep(0.72, 0.9, h);
    float pulse = 0.85 + 0.15 * sin(uTime * 2.0 + h * 30.0);
    col += uEmissive * g * pulse * (0.35 + 0.65 * smoothstep(0.3, -0.2, ndlG));
  }
  col *= uDim;
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export const CLOUD_FRAG = /* glsl */ `
uniform samplerCube uClouds;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform vec3 uAmbient;
uniform float uDim;
varying vec3 vObj;
varying vec3 vWorldPos;
varying vec3 vWorldN;
void main() {
  vec4 c = textureCube(uClouds, normalize(vObj));
  vec3 N = normalize(vWorldN);
  float ndl = dot(N, normalize(uSunDir));
  float lit = smoothstep(-0.1, 0.5, ndl);
  vec3 col = c.rgb * (uSunColor * lit + uAmbient) * uDim;
  float a = c.a * (0.25 + 0.75 * smoothstep(-0.3, 0.1, ndl));
  gl_FragColor = vec4(col * a, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export const HALO_VERT = /* glsl */ `
varying vec3 vWorldPos;
varying vec3 vWorldN;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  vWorldN = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

/** Atmosphere halo drawn on the back faces of a slightly bigger sphere: glows just outside the planet's edge. */
export const HALO_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform vec3 uSunDir;
uniform float uStrength;
uniform float uLimb;
uniform float uDim;
varying vec3 vWorldPos;
varying vec3 vWorldN;
void main() {
  vec3 N = normalize(vWorldN);
  vec3 V = normalize(cameraPosition - vWorldPos);
  float k = -dot(N, V);
  float g = pow(clamp(k / uLimb, 0.0, 1.0), uLimb > 0.6 ? 1.4 : 2.2) * (1.0 - smoothstep(uLimb, uLimb * 1.6, k) * 0.6);
  float lit = smoothstep(-0.35, 0.45, dot(N, normalize(uSunDir)));
  vec3 col = uColor * g * lit * uStrength * uDim;
  gl_FragColor = vec4(col, clamp(max(col.r, max(col.g, col.b)), 0.0, 1.0));
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export const RING_VERT = /* glsl */ `
varying vec3 vLocal;
varying vec3 vWorldPos;
void main() {
  vLocal = position;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

export const RING_FRAG = /* glsl */ `
uniform vec3 uC0, uC1;
uniform vec4 uRing; // inner, outer, opacity, faint
uniform float uRadius;
uniform vec3 uCenter;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform vec3 uRingN;
uniform float uShadow;
uniform float uDim;
uniform float uSeedR;
varying vec3 vLocal;
varying vec3 vWorldPos;
${RING_GLSL}
float hash1(float x) { return fract(sin(x * 91.3) * 47453.5); }
void main() {
  float r = length(vLocal.xy);
  float x = (r - uRing.x) / (uRing.y - uRing.x);
  float dens = ringDensity(x, uRing.w, uSeedR);
  if (dens < 0.01) discard;
  vec3 L = normalize(uSunDir);
  float grain = 0.85 + 0.15 * hash1(floor(x * 400.0));
  vec3 col = mix(uC1, uC0, clamp(dens * grain, 0.0, 1.0));
  float lit = 0.45 + 0.55 * abs(dot(L, uRingN));
  // The planet's shadow falls across the rings.
  float shadow = 0.0;
  if (uShadow > 0.5) {
    vec3 toC = uCenter - vWorldPos;
    float t = dot(toC, L);
    if (t > 0.0) {
      float d = length(toC - L * t);
      shadow = smoothstep(uRadius * 1.02, uRadius * 0.96, d);
    }
  }
  col *= uSunColor * lit * (1.0 - shadow * 0.85) * uDim;
  float a = clamp(dens * uRing.z, 0.0, 1.0);
  gl_FragColor = vec4(col * a, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export const SUN_SURF_FRAG = /* glsl */ `
uniform samplerCube uSurface;
uniform float uTime;
uniform float uIntensity;
uniform vec3 uC0, uC1, uC2;
varying vec3 vObj;
varying vec3 vWorldPos;
varying vec3 vWorldN;
mat3 rotY(float a) { float c = cos(a), s = sin(a); return mat3(c, 0.0, -s, 0.0, 1.0, 0.0, s, 0.0, c); }
void main() {
  vec3 o = normalize(vObj);
  float a = textureCube(uSurface, rotY(uTime * 0.03) * o).a;
  float b = textureCube(uSurface, rotY(-uTime * 0.02 + 1.3) * o.zyx).a;
  float g = mix(a, b, 0.5 + 0.5 * sin(uTime * 0.4));
  vec3 base = textureCube(uSurface, o).rgb;
  vec3 V = normalize(cameraPosition - vWorldPos);
  float mu = max(dot(normalize(vWorldN), V), 0.0);
  // Limb darkening: the edge of the Sun looks a bit darker and redder.
  vec3 limb = mix(uC2, uC0, pow(mu, 0.45));
  vec3 col = mix(base, limb, 0.55) * (0.75 + g * 0.5) * uIntensity * (0.55 + 0.45 * pow(mu, 0.3));
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

