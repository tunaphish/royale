import { LIGHT_COUNT } from './pixelLight';

/**
 * Fragment shader for a foreground layer that sits between the viewer and the
 * lights, so it's lit from behind:
 * - Front: the side we see gets little direct light (ambient + a small fill).
 * - Translucency: light shows through the layer, tinted by its own color.
 * - Rim: edges that face a light catch a bright outline. Edges come from
 *   the layer's alpha, so no normal map is needed.
 * Light is snapped to the pixel grid and split into steps, like the portrait.
 */
export const BACKLIGHT_FRAG = `
#pragma phaserTemplate(shaderName)
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

const int LIGHT_COUNT = ${LIGHT_COUNT};

varying vec2 outTexCoord;

uniform sampler2D uTexture;
uniform vec2 uTexSize;

uniform float uPixelSize;
uniform float uBands;
uniform float uBandSoftness;

uniform vec3 uAmbient;
uniform float uFill;
uniform float uTranslucency;
uniform float uRim;
// Rim thickness, in art pixels.
uniform float uRimWidth;
uniform float uOpacity;

// x, y (texture pixels, y up), z (distance behind the layer, texture pixels).
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

float alphaAt (vec2 texel) {
  vec2 uv = texel / uTexSize;
  if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) return 0.0;
  return texture2D(uTexture, uv).a;
}

void main () {
  vec2 texel = outTexCoord * uTexSize;
  vec4 albedo = texture2D(uTexture, outTexCoord);
  if (albedo.a <= 0.0) {
    gl_FragColor = vec4(0.0);
    return;
  }

  vec2 cell = (floor(texel / uPixelSize) + 0.5) * uPixelSize;
  float alphaHere = alphaAt(cell);

  vec3 front = uAmbient + vec3(uFill);
  vec3 glow = vec3(0.0);
  vec3 rim = vec3(0.0);

  for (int i = 0; i < LIGHT_COUNT; i++) {
    vec3 toLight = uLightPos[i] - vec3(cell, 0.0);
    float dist = length(toLight);
    float radius = max(uLightRadius[i], 1.0);
    float attenuation = clamp(1.0 - (dist * dist) / (radius * radius), 0.0, 1.0);
    float strength = attenuation * uLightIntensity[i];

    glow += uLightColor[i] * band(strength * uTranslucency);

    // An edge faces the light when the art runs out in the light's direction.
    vec2 toward = toLight.xy / max(length(toLight.xy), 0.0001);
    float alphaToward = alphaAt(cell + toward * uRimWidth * uPixelSize);
    float edge = clamp(alphaHere - alphaToward, 0.0, 1.0);
    rim += uLightColor[i] * band(edge * strength * uRim);
  }

  // albedo is premultiplied: tint light by it, keep its alpha.
  vec3 color = albedo.rgb * (front + glow) + rim * albedo.a;
  gl_FragColor = vec4(color, albedo.a) * uOpacity;
}
`;
