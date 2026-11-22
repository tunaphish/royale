import * as Phaser from 'phaser';
import { BACKLIT_FRAG } from './shaders/backlit';
import { FRONT_FRAG } from './shaders/front';
import type { FxSystem } from './FxSystem';
import { DEPTH } from './types';

export interface BacklitSettings {
  /** Direct light on the side we see, on top of ambient. */
  fill: number;
  /** How much light shows through, tinted by the layer's color. */
  translucency: number;
  /** Bright outline on edges facing a light. */
  rim: number;
  /** Rim thickness, in art pixels. */
  rimWidth: number;
  /** How far behind the layer the lights are, in screen pixels. Further is softer. */
  depth: number;
}

export const DEFAULT_BACKLIT: BacklitSettings = { fill: 0.12, translucency: 0.9, rim: 1.5, rimWidth: 1, depth: 120 };

/** Front material: the rim that lights behind the characters (`MoodLight.behind`) put on its edges. */
export interface RimSettings {
  /** Brightness. */
  rim: number;
  /** Thickness, in art pixels. */
  rimWidth: number;
}

export const DEFAULT_RIM: RimSettings = { rim: 1, rimWidth: 1 };

export interface LitOptions {
  /** `'front'` (default) or `'backlit'`. */
  material?: 'front' | 'backlit';
  /** Texture key of the normal map. Front only. Default: `<texture>_n` if it exists. */
  normalMap?: string | null;
  /** Size of one art pixel in texture pixels. Default: the system's art pixel size ÷ the image's scale. */
  pixelSize?: number;
  gridOffset?: [number, number];
  backlit?: Partial<BacklitSettings>;
  /** Front only. */
  rim?: Partial<RimSettings>;
}

/**
 * Draws an image through a lit shader. The image stays in the scene as the
 * source of position, size and alpha (move it, tween it, parallax it), but is
 * hidden: the material draws in its place at the same depth.
 */
export class LitMaterial {
  readonly shader: Phaser.GameObjects.Shader;
  readonly kind: 'front' | 'backlit';
  normalMap: string | null;
  pixelSize: number | undefined;
  gridOffset: [number, number];
  backlit: BacklitSettings;
  rim: RimSettings;
  /** Draw with the normal map. Off lights the art as if flat, to compare. */
  useNormalMap = true;
  visible = true;

  private readonly rect = [0, 0, 1, 1];
  private readonly texSize: [number, number];

  constructor(private fx: FxSystem, readonly source: Phaser.GameObjects.Image, options: LitOptions = {}) {
    const scene = source.scene;
    this.kind = options.material ?? 'front';
    const textureKey = source.texture.key;
    const defaultNormal = `${textureKey}_n`;
    this.normalMap = options.normalMap !== undefined
      ? options.normalMap
      : scene.textures.exists(defaultNormal) ? defaultNormal : null;
    this.pixelSize = options.pixelSize;
    this.gridOffset = options.gridOffset ?? [0, 0];
    this.backlit = { ...DEFAULT_BACKLIT, ...options.backlit };
    this.rim = { ...DEFAULT_RIM, ...options.rim };
    this.texSize = [source.frame.width, source.frame.height];

    const textures = this.kind === 'front'
      ? [textureKey, this.normalMap ?? '__DEFAULT', fx.lightMapKey]
      : [textureKey, fx.lightMapKey];
    const samplers = this.kind === 'front'
      ? { uTexture: 0, uNormal: 1, uLightMap: 2 }
      : { uTexture: 0, uLightMap: 1 };

    this.shader = scene.add.shader(
      {
        name: this.kind === 'front' ? 'FxFront' : 'FxBacklit',
        fragmentSource: this.kind === 'front' ? FRONT_FRAG : BACKLIT_FRAG,
        initialUniforms: { ...samplers, uTexSize: this.texSize },
        setupUniforms: (setUniform: (name: string, value: unknown) => void) => this.setupUniforms(setUniform),
      },
      source.x,
      source.y,
      source.displayWidth,
      source.displayHeight,
      textures,
    );
    source.setVisible(false);
    this.sync();
  }

  /** Copies the source image's place on screen. `FxSystem` calls this every frame. */
  sync(): void {
    const { source, shader } = this;
    const width = source.displayWidth;
    const height = source.displayHeight;
    const left = source.x - source.originX * width;
    const top = source.y - source.originY * height;
    // Scale the quad rather than resizing it: Shader.setSize doesn't change what's drawn.
    if (shader.displayWidth !== width || shader.displayHeight !== height) shader.setDisplaySize(width, height);
    shader.setPosition(left + width / 2, top + height / 2);
    shader.setDepth(source.depth);
    shader.setVisible(this.visible && source.alpha > 0);
    this.rect[0] = left;
    this.rect[1] = top;
    this.rect[2] = width;
    this.rect[3] = height;
  }

  private setupUniforms(setUniform: (name: string, value: unknown) => void): void {
    const { fx } = this;
    fx.setSharedUniforms(setUniform);
    setUniform('uRect', this.rect);
    setUniform('uTexSize', this.texSize);
    const scale = this.rect[2] / this.texSize[0];
    setUniform('uPixelSize', Math.max(this.pixelSize ?? fx.artPixel / scale, 1));
    setUniform('uGridOffset', this.gridOffset);
    setUniform('uAlpha', this.source.alpha);
    if (this.kind === 'front') {
      setUniform('uUseNormalMap', this.normalMap && this.useNormalMap ? 1 : 0);
      // Lights behind the characters only rim layers at their depth or in front.
      setUniform('uInFront', this.source.depth >= DEPTH.characters ? 1 : 0);
      setUniform('uRim', this.rim.rim);
      setUniform('uRimWidth', this.rim.rimWidth);
    } else {
      const b = this.backlit;
      setUniform('uFill', b.fill);
      setUniform('uTranslucency', b.translucency);
      setUniform('uRim', b.rim);
      setUniform('uRimWidth', b.rimWidth);
      setUniform('uDepth', b.depth);
    }
  }

  destroy(): void {
    this.shader.destroy();
  }
}
