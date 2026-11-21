import * as Phaser from 'phaser';

/** How the CRT looks. All 0-1 unless noted; 0 turns that part off. */
export interface CrtSettings {
  /** Bulge of the glass. */
  curvature: number;
  /** How dark the gaps between scanlines are. */
  scanlines: number;
  /** Screen pixels per scanline. */
  lineSize: number;
  /** Strength of the red/green/blue phosphor stripes. */
  mask: number;
  /** Color fringing toward the edges, in screen pixels. */
  aberration: number;
  /** Darkening toward the corners. */
  vignette: number;
  /** Static. */
  noise: number;
  /** Brightness flicker. */
  flicker: number;
  /** Makes up for the light scanlines and the mask take away. 1 is none. */
  brightness: number;
}

export const DEFAULT_CRT: CrtSettings = {
  curvature: 0.12,
  scanlines: 0.45,
  lineSize: 3,
  mask: 0.25,
  aberration: 1.5,
  vignette: 0.5,
  noise: 0.06,
  flicker: 0.3,
  brightness: 1.25,
};

const CRT_FRAG = `
#pragma phaserTemplate(shaderName)
precision mediump float;
uniform sampler2D uMainSampler;
varying vec2 outTexCoord;
#pragma phaserTemplate(fragmentHeader)

uniform vec2 resolution;
uniform float uTime;
uniform float uCurvature;
uniform float uScanlines;
uniform float uLineSize;
uniform float uMask;
uniform float uAberration;
uniform float uVignette;
uniform float uNoise;
uniform float uFlicker;
uniform float uBrightness;

float hash (vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

// Bends the picture as if it were on curved glass.
vec2 curve (vec2 uv) {
  vec2 centered = uv * 2.0 - 1.0;
  centered *= 1.0 + (centered.yx * centered.yx) * uCurvature;
  return centered * 0.5 + 0.5;
}

void main () {
  vec2 uv = curve(outTexCoord);
  if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }

  // Red and blue split apart more toward the edges.
  vec2 fromCenter = uv - 0.5;
  vec2 shift = fromCenter * (uAberration / resolution) * 2.0;
  vec4 base = boundedSampler(uMainSampler, uv);
  vec3 color = vec3(
    boundedSampler(uMainSampler, uv + shift).r,
    base.g,
    boundedSampler(uMainSampler, uv - shift).b
  );

  // Scanlines: dark gaps between rows, one row per uLineSize screen pixels.
  float row = uv.y * resolution.y / max(uLineSize, 1.0);
  float line = 0.5 + 0.5 * cos(row * 6.2831853);
  color *= mix(1.0, line, uScanlines);

  // Aperture mask: each screen pixel column favors red, green or blue.
  float column = mod(floor(gl_FragCoord.x), 3.0);
  vec3 stripe = vec3(column == 0.0 ? 1.0 : 0.6, column == 1.0 ? 1.0 : 0.6, column == 2.0 ? 1.0 : 0.6);
  color *= mix(vec3(1.0), stripe, uMask);

  // Corners fall off.
  float edge = uv.x * uv.y * (1.0 - uv.x) * (1.0 - uv.y) * 16.0;
  color *= mix(1.0, clamp(pow(edge, 0.3), 0.0, 1.0), uVignette);

  color += (hash(uv * resolution + fract(uTime) * 100.0) - 0.5) * uNoise;
  color *= 1.0 + sin(uTime * 110.0) * 0.02 * uFlicker;
  color *= uBrightness;

  gl_FragColor = vec4(color, 1.0);
}
`;

/** The render node that runs the CRT shader. Registered once per game by `addCrt`. */
class CrtNode extends Phaser.Renderer.WebGL.RenderNodes.BaseFilterShader {
  constructor(manager: Phaser.Renderer.WebGL.RenderNodes.RenderNodeManager) {
    super('FilterCrt', manager, undefined, CRT_FRAG);
  }

  setupUniforms(controller: CrtFilter, drawingContext: Phaser.Renderer.WebGL.DrawingContext): void {
    const pm = this.programManager;
    const s = controller.settings;
    pm.setUniform('resolution', [drawingContext.width, drawingContext.height]);
    pm.setUniform('uTime', controller.scene.time.now / 1000);
    pm.setUniform('uCurvature', s.curvature);
    pm.setUniform('uScanlines', s.scanlines);
    pm.setUniform('uLineSize', s.lineSize);
    pm.setUniform('uMask', s.mask);
    pm.setUniform('uAberration', s.aberration);
    pm.setUniform('uVignette', s.vignette);
    pm.setUniform('uNoise', s.noise);
    pm.setUniform('uFlicker', s.flicker);
    pm.setUniform('uBrightness', s.brightness);
  }
}

/** A CRT TV look over everything a camera draws. Change `settings` at any time. */
export class CrtFilter extends Phaser.Filters.Controller {
  settings: CrtSettings;

  constructor(camera: Phaser.Cameras.Scene2D.Camera, readonly scene: Phaser.Scene, settings: Partial<CrtSettings> = {}) {
    super(camera, 'FilterCrt');
    this.settings = { ...DEFAULT_CRT, ...settings };
  }
}

/** Puts a CRT filter on a camera (default: the main one). Remove it with `removeCrt`. */
export function addCrt(scene: Phaser.Scene, settings?: Partial<CrtSettings>, camera = scene.cameras.main): CrtFilter {
  const renderer = scene.renderer;
  if (!(renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer)) {
    throw new Error('The CRT filter needs WebGL');
  }
  if (!renderer.renderNodes.hasNode('FilterCrt')) {
    renderer.renderNodes.addNodeConstructor('FilterCrt', CrtNode);
  }
  const filter = new CrtFilter(camera, scene, settings);
  camera.filters!.internal.add(filter);
  return filter;
}

export function removeCrt(filter: CrtFilter, camera = filter.camera): void {
  camera.filters!.internal.remove(filter);
}
