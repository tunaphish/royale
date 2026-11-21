import { POINT_SLOTS } from '../lights';

/**
 * GLSL shared by every lit material: uniforms, pixel snapping, banding,
 * and the light map. Everything about lights is in screen pixels.
 *
 * A material's `main` does the per-light loop itself, because GLSL ES 1.0
 * only lets loops (not functions) index uniform arrays.
 */
export const LIGHTING_HEADER = `
#pragma phaserTemplate(shaderName)
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

const int POINT_SLOTS = ${POINT_SLOTS};

varying vec2 outTexCoord;

uniform sampler2D uTexture;
uniform sampler2D uLightMap;

// The layer on screen: left, top, width, height (screen pixels).
uniform vec4 uRect;
uniform vec2 uTexSize;
// Size of one art pixel, in texture pixels, and the grid's offset.
uniform float uPixelSize;
uniform vec2 uGridOffset;
uniform float uAlpha;

uniform vec3 uAmbient;
uniform float uBands;
uniform float uBandSoftness;

// Screen x, y and height above the art.
uniform vec3 uLightPos[POINT_SLOTS];
uniform vec3 uLightColor[POINT_SLOTS];
uniform float uLightRadius[POINT_SLOTS];
uniform float uLightIntensity[POINT_SLOTS];

uniform vec2 uStageSize;
// The light map stores light / uMapGain, so it can hold more than 1.
uniform float uMapGain;

float band (float value) {
  if (uBands < 0.5) return value;
  float scaled = value * uBands;
  float step = floor(scaled);
  float soft = max(uBandSoftness, 0.001);
  return (step + smoothstep(1.0 - soft, 1.0, scaled - step)) / uBands;
}

vec3 band3 (vec3 value) {
  return vec3(band(value.r), band(value.g), band(value.b));
}

// Centre of the art pixel a texture coordinate belongs to, in texture pixels (y up).
vec2 cellOf (vec2 uv) {
  vec2 texel = uv * uTexSize - uGridOffset;
  return (floor(texel / uPixelSize) + 0.5) * uPixelSize + uGridOffset;
}

// Texture pixels (y up) to screen pixels (y down).
vec2 toScreen (vec2 texel) {
  return vec2(
    uRect.x + texel.x / uTexSize.x * uRect.z,
    uRect.y + (1.0 - texel.y / uTexSize.y) * uRect.w
  );
}

vec3 mapLight (vec2 screen) {
  vec2 uv = screen / uStageSize;
  // Render textures are stored bottom-up.
  uv.y = 1.0 - uv.y;
  return texture2D(uLightMap, uv).rgb * uMapGain;
}

float attenuation (float dist, float radius) {
  return clamp(1.0 - (dist * dist) / (radius * radius), 0.0, 1.0);
}
`;
