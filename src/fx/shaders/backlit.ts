import { LIGHTING_HEADER } from './lighting';

/**
 * A layer between the viewer and the lights (foreground leaves, curtains), lit from behind:
 * - Front: the side we see gets little direct light (ambient + a small fill).
 * - Translucency: light shows through, tinted by the layer's own color.
 * - Rim: edges facing a light catch a bright outline. Edges come from alpha, so no normal map.
 */
export const BACKLIT_FRAG = `${LIGHTING_HEADER}
uniform float uFill;
uniform float uTranslucency;
uniform float uRim;
// Rim thickness, in art pixels.
uniform float uRimWidth;
// How far behind the layer the lights are, in screen pixels.
uniform float uDepth;

float alphaAt (vec2 texel) {
  vec2 uv = texel / uTexSize;
  if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) return 0.0;
  return texture2D(uTexture, uv).a;
}

void main () {
  vec4 albedo = texture2D(uTexture, outTexCoord);
  if (albedo.a <= 0.0) {
    gl_FragColor = vec4(0.0);
    return;
  }

  vec2 cell = cellOf(outTexCoord);
  vec2 screen = toScreen(cell);
  float alphaHere = alphaAt(cell);

  vec3 front = uAmbient + vec3(uFill);
  vec3 glow = band3(mapLight(screen) * uTranslucency);
  vec3 rim = vec3(0.0);

  for (int i = 0; i < POINT_SLOTS; i++) {
    if (uLightIntensity[i] <= 0.0) continue;
    vec3 toLight = vec3(uLightPos[i].xy - screen, uDepth);
    toLight.y = -toLight.y;
    float strength = attenuation(length(toLight), uLightRadius[i]) * uLightIntensity[i];
    glow += uLightColor[i] * band(strength * uTranslucency);

    // An edge faces the light when the art runs out in the light's direction.
    vec2 toward = toLight.xy / max(length(toLight.xy), 0.0001);
    float edge = clamp(alphaHere - alphaAt(cell + toward * uRimWidth * uPixelSize), 0.0, 1.0);
    rim += uLightColor[i] * band(edge * strength * uRim);
  }

  // albedo is premultiplied: tint light by it, keep its alpha.
  vec3 color = albedo.rgb * (front + glow) + rim * albedo.a;
  gl_FragColor = vec4(color, albedo.a) * uAlpha;
}
`;
