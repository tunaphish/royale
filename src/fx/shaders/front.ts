import { LIGHTING_HEADER } from './lighting';

/**
 * Art lit from the front, the default: characters, backgrounds. Point lights
 * use the normal map; the light map adds flat colored light on top.
 * Light is worked out once per art pixel and split into steps.
 */
export const FRONT_FRAG = `${LIGHTING_HEADER}
uniform sampler2D uNormal;
// 0 lights the art as if it were flat.
uniform float uUseNormalMap;

void main () {
  vec4 albedo = texture2D(uTexture, outTexCoord);
  if (albedo.a <= 0.0) {
    gl_FragColor = vec4(0.0);
    return;
  }

  vec2 cell = cellOf(outTexCoord);
  vec3 normal = vec3(0.0, 0.0, 1.0);
  if (uUseNormalMap > 0.5) {
    // Average the normal over the cell (3x3 samples) so one noisy texel doesn't decide it.
    vec3 sum = vec3(0.0);
    for (int sx = -1; sx <= 1; sx++) {
      for (int sy = -1; sy <= 1; sy++) {
        vec2 offset = vec2(float(sx), float(sy)) * uPixelSize / 3.0;
        sum += texture2D(uNormal, clamp((cell + offset) / uTexSize, 0.0, 1.0)).rgb * 2.0 - 1.0;
      }
    }
    normal = normalize(sum);
  }

  vec2 screen = toScreen(cell);
  vec3 light = uAmbient + band3(mapLight(screen));
  for (int i = 0; i < POINT_SLOTS; i++) {
    if (uLightIntensity[i] <= 0.0) continue;
    vec3 toLight = uLightPos[i] - vec3(screen, 0.0);
    // Screen y points down; normal maps point up.
    toLight.y = -toLight.y;
    float dist = length(toLight);
    float diffuse = max(dot(normal, toLight / max(dist, 0.0001)), 0.0);
    light += uLightColor[i] * band(diffuse * attenuation(dist, uLightRadius[i]) * uLightIntensity[i]);
  }

  // albedo is premultiplied, so this keeps transparency intact.
  gl_FragColor = vec4(albedo.rgb * light, albedo.a) * uAlpha;
}
`;
