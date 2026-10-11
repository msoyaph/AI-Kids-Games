import { AdditiveBlending, Color, DoubleSide, FrontSide, ShaderMaterial, type Side } from 'three';

/** End every custom fragment shader with this so Low (direct render) gets tone mapping + sRGB too. */
export const OUTPUT_GLSL = '#include <tonemapping_fragment>\n#include <colorspace_fragment>';

/**
 * Atmosphere rim glow: a slightly larger shell around a planet that brightens toward the edge
 * (fresnel) on the lit side. HDR color so it softly blooms on Medium/High.
 */
export function atmosphereMaterial(color: string, opts: { intensity?: number; power?: number; side?: Side; sunDir?: [number, number, number] } = {}): ShaderMaterial {
  const sun = opts.sunDir ?? [1, 0.3, 0.2];
  return new ShaderMaterial({
    uniforms: {
      uColor: { value: new Color(color) },
      uIntensity: { value: opts.intensity ?? 1.4 },
      uPower: { value: opts.power ?? 3.0 },
      uSunDir: { value: new Color(sun[0], sun[1], sun[2]) },
    },
    vertexShader: /* glsl */ `
      varying vec3 vN;
      varying vec3 vV;
      varying vec3 vWN;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal);
        vWN = normalize(mat3(modelMatrix) * normal);
        vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uIntensity;
      uniform float uPower;
      uniform vec3 uSunDir;
      varying vec3 vN;
      varying vec3 vV;
      varying vec3 vWN;
      void main() {
        float rim = 1.0 - abs(dot(normalize(vN), normalize(vV)));
        float f = pow(rim, uPower);
        float lit = smoothstep(-0.35, 0.6, dot(normalize(vWN), normalize(uSunDir)));
        float a = f * (0.25 + 0.75 * lit) * uIntensity;
        gl_FragColor = vec4(uColor * a, 1.0);
        ${OUTPUT_GLSL}
      }`,
    side: opts.side ?? FrontSide,
    blending: AdditiveBlending,
    transparent: true,
    depthWrite: false,
  });
}

/** Simple engine flame: additive cone with flowing noise-ish bands. `uLen` scales with thrust. */
export function flameMaterial(outer: string, inner: string): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: { uOuter: { value: new Color(outer) }, uInner: { value: new Color(inner) }, uTime: { value: 0 }, uPower: { value: 1 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uOuter, uInner;
      uniform float uTime, uPower;
      varying vec2 vUv;
      void main() {
        float along = vUv.y;
        float across = abs(vUv.x - 0.5) * 2.0;
        float flick = 0.85 + 0.15 * sin(uTime * 38.0 + along * 20.0);
        float body = smoothstep(1.0, 0.15, along) * (1.0 - across * across) * flick;
        float core = smoothstep(0.75, 0.0, along) * (1.0 - across) ;
        vec3 c = mix(uOuter, uInner, core) * (body * 2.4 + core * 3.0) * uPower;
        gl_FragColor = vec4(c, 1.0);
        ${OUTPUT_GLSL}
      }`,
    blending: AdditiveBlending,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
  });
}
