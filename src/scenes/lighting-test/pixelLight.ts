/**
 * Fragment shader for pixel-art lighting: like Light2D, but the light is
 * worked out once per art pixel (not per screen pixel) and split into hard
 * bands, so light and shadow edges follow the art's pixel grid.
 *
 * Everything is in texture pixels with y pointing up, matching Phaser's own
 * lighting, so normal maps that look right with Light2D look right here.
 */
export const LIGHT_COUNT = 2;

export const PIXEL_LIGHT_FRAG = `
#pragma phaserTemplate(shaderName)
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

const int LIGHT_COUNT = ${LIGHT_COUNT};

varying vec2 outTexCoord;

uniform sampler2D uDiffuse;
uniform sampler2D uNormal;
// 0 lights the art as if it were flat.
uniform float uUseNormalMap;
uniform vec2 uTexSize;

// Size of one art pixel, in texture pixels. Light is snapped to this grid.
uniform float uPixelSize;
// Shifts the grid so it lines up with the art's own pixels.
uniform vec2 uGridOffset;
// Number of light steps. 0 turns banding off.
uniform float uBands;
// 0 is a hard step between bands, 1 is a smooth ramp.
uniform float uBandSoftness;

uniform vec3 uAmbient;
// x, y (texture pixels, y up), z (height above the art, texture pixels).
uniform vec3 uLightPos[LIGHT_COUNT];
uniform vec3 uLightColor[LIGHT_COUNT];
uniform float uLightRadius[LIGHT_COUNT];
uniform float uLightIntensity[LIGHT_COUNT];

float band (float value) {
  if (uBands < 0.5) return value;
  float scaled = value * uBands;
  float step = floor(scaled);
  float soft = max(uBandSoftness, 0.001);
  return (step + smoothstep(1.0 - soft, 1.0, scaled - step)) / uBands;
}

void main () {
  // Phaser stores textures with y up, matching outTexCoord.
  vec2 uv = outTexCoord;
  vec4 albedo = texture2D(uDiffuse, uv);
  if (albedo.a <= 0.0) {
    gl_FragColor = vec4(0.0);
    return;
  }

  // Centre of the art pixel this fragment belongs to (texture pixels, y up).
  vec2 texel = uv * uTexSize - uGridOffset;
  vec2 cell = (floor(texel / uPixelSize) + 0.5) * uPixelSize + uGridOffset;
  // Average the normal over the cell (3x3 samples) so one noisy texel
  // doesn't decide the whole cell.
  vec3 normalSum = vec3(0.0);
  for (int sx = -1; sx <= 1; sx++) {
    for (int sy = -1; sy <= 1; sy++) {
      vec2 offset = vec2(float(sx), float(sy)) * uPixelSize / 3.0;
      vec2 sampleUv = clamp((cell + offset) / uTexSize, 0.0, 1.0);
      normalSum += texture2D(uNormal, sampleUv).rgb * 2.0 - 1.0;
    }
  }
  vec3 normal = uUseNormalMap > 0.5 ? normalize(normalSum) : vec3(0.0, 0.0, 1.0);
  vec3 surface = vec3(cell, 0.0);

  vec3 light = uAmbient;
  for (int i = 0; i < LIGHT_COUNT; i++) {
    vec3 toLight = uLightPos[i] - surface;
    float dist = length(toLight);
    float radius = max(uLightRadius[i], 1.0);
    float attenuation = clamp(1.0 - (dist * dist) / (radius * radius), 0.0, 1.0);
    float diffuse = max(dot(normal, toLight / max(dist, 0.0001)), 0.0);
    light += uLightColor[i] * band(diffuse * attenuation * uLightIntensity[i]);
  }

  // albedo is premultiplied, so this keeps transparency intact.
  gl_FragColor = vec4(albedo.rgb * light, albedo.a);
}
`;
