import * as Phaser from 'phaser';
import * as React from 'react';
import { autorun, reaction, toJS } from 'mobx';
import ReactOverlay from '../../plugins/ReactOverlay';
import type { FxSystem, SceneLight } from '../../fx/FxSystem';
import type { FxHandle } from '../../fx/FxHandle';
import type { LitMaterial } from '../../fx/LitMaterial';
import { DEPTH } from '../../fx/types';
import { FX } from '../../data/fx';
import { LIGHTING } from '../../data/lighting';
import { FxLabStore, settingsToMood } from './fxLabStore';
import { FxLabView } from './FxLabView';
import { fxEntrySource } from './toSource';
import { addCrt, removeCrt, type CrtFilter } from '../../fx/crt';

const SPRITE_KEY = 'characters/rena';
const FOREGROUND_KEY = 'layers/sakura';
/** The foreground is drawn this much larger than the portrait so parallax never shows its edges. */
const FOREGROUND_OVERSCAN = 1.08;

const sceneConfig: Phaser.Types.Scenes.SettingsConfig = {
  active: false,
  visible: false,
  key: 'FxLab',
};


/** Pause between replays of a one-shot FX. */
const REPLAY_GAP_MS = 700;

type FxLabData = { fx?: string; mood?: string };

/**
 * Dev tool for tuning FX and lighting on real art. Open with
 * `?scene=FxLab`, optionally `&fx=<id>&mood=<id>`.
 *
 * - fx tab: pick an FX from data/fx.ts and edit a copy of it live (it restarts
 *   on every change), see the light map and point slots, then "copy definition"
 *   to paste the result back into data/fx.ts. Lights (fires, the moon, lamps) are
 *   FX too: tune them here as light layers. FX play from the middle of the stage.
 * - lighting tab: moods (the scene's darkness) from data/lighting.ts and the
 *   materials' settings. A test light follows the pointer; turn it off to see
 *   only the FX's lights.
 *
 * L toggles the light map.
 */
export class FxLab extends Phaser.Scene {
  reactOverlay: ReactOverlay;
  fx: FxSystem;
  store: FxLabStore;
  private foreground: Phaser.GameObjects.Image;
  /** Where the foreground sits with no parallax. */
  private foregroundHome = new Phaser.Math.Vector2();
  private handle?: FxHandle;
  private replayTimer?: Phaser.Time.TimerEvent;
  private slotOverlay: Phaser.GameObjects.Graphics;
  private statsAt = 0;
  private crtFilter?: CrtFilter;

  constructor() {
    super(sceneConfig);
  }

  init(data: FxLabData): void {
    this.store = new FxLabStore();
    this.handle = undefined;
    this.crtFilter = undefined;
    if (data.fx) {
      if (data.fx in FX) this.store.selectFx(data.fx);
      else console.warn(`[FxLab] no FX "${data.fx}" in data/fx.ts`);
    }
    if (data.mood) {
      if (data.mood in LIGHTING) this.store.applyPreset(data.mood);
      else console.warn(`[FxLab] no mood "${data.mood}" in data/lighting.ts`);
    }
  }

  create(): void {
    const { width, height } = this.scale;

    if (!this.textures.exists(SPRITE_KEY)) console.warn(`[FxLab] no image "${SPRITE_KEY}" in src/assets/images; update SPRITE_KEY`);
    const sprite = this.add.image(width / 2, height / 2, SPRITE_KEY).setDepth(DEPTH.characters);
    const scale = Math.min(width / sprite.width, height / sprite.height);
    sprite.setScale(scale);
    const portrait = this.fx.lit(sprite);

    this.foreground = this.add.image(width / 2, height / 2, FOREGROUND_KEY).setDepth(DEPTH.foreground);
    this.foreground.setDisplaySize(sprite.displayWidth * FOREGROUND_OVERSCAN, sprite.displayHeight * FOREGROUND_OVERSCAN);
    this.foregroundHome.set(this.foreground.x, this.foreground.y);
    const petals = this.fx.lit(this.foreground, { material: 'backlit' });
    petals.shader.enableFilters();
    const blur = petals.shader.filters!.internal.addBlur(1, 2, 2, 0);

    // The lab's own light, a scene light so it can follow the pointer. Other lights come from FX.
    const key = this.fx.addLight({ x: width / 2, y: height / 3, color: '#ffffff', intensity: 1, radius: 400, height: 0.2 });
    const moveKey = (pointer: Phaser.Input.Pointer) => {
      if (this.store.settings.followPointer) {
        key.x = pointer.x;
        key.y = pointer.y;
      }
    };
    this.input.on('pointermove', moveKey);
    this.input.on('pointerdown', moveKey);

    const stopSync = autorun(() => {
      const s = this.store.settings;
      this.syncMaterial(portrait, sprite, s.lit);
      this.syncMaterial(petals, this.foreground, this.store.foreground.on && s.lit);
      portrait.useNormalMap = this.store.normalMap;
      portrait.pixelSize = this.store.grid.size;
      portrait.gridOffset = [this.store.grid.offsetX, this.store.grid.offsetY];
      // The petals share the portrait's art-pixel size on screen.
      petals.pixelSize = (this.store.grid.size * scale) / (this.foreground.displayWidth / this.foreground.width);

      this.fx.setMood(settingsToMood(s));
      this.syncKey(key, s.key);
    });
    const stopForegroundSync = autorun(() => {
      const fg = this.store.foreground;
      petals.backlit = { fill: fg.fill, translucency: fg.translucency, rim: fg.rim, rimWidth: fg.rimWidth, depth: fg.depth };
      this.foreground.setAlpha(fg.on ? fg.opacity : 0);
      blur.strength = fg.blur;
      blur.active = fg.blur > 0;
    });
    this.events.once('shutdown', () => {
      stopSync();
      stopForegroundSync();
    });

    this.slotOverlay = this.add.graphics().setDepth(DEPTH.top + 2);
    this.input.keyboard?.on('keydown-L', () => this.store.setShowLightMap(!this.store.showLightMap));
    const stopLabSync = [
      autorun(() => this.fx.showLightMap(this.store.showLightMap)),
      autorun(() => {
        if (this.store.crtOn && !this.crtFilter) this.crtFilter = addCrt(this, this.store.crt);
        if (!this.store.crtOn && this.crtFilter) {
          removeCrt(this.crtFilter);
          this.crtFilter = undefined;
        }
        // the filter reads its settings every frame, so copying them is enough
        if (this.crtFilter) this.crtFilter.settings = { ...this.store.crt };
      }),
      autorun(() => {
        this.fx.reducedMotion = this.store.reducedMotion;
        this.fx.quality = this.store.quality;
      }),
      // Any edit (or quality change) restarts the FX, so what you see is always the draft.
      reaction(
        () => [JSON.stringify(toJS(this.store.draft)), this.store.quality, this.store.reducedMotion],
        () => this.restartFx(),
        { delay: 150 },
      ),
    ];
    this.events.once('shutdown', () => stopLabSync.forEach((stop) => stop()));
    this.restartFx();

    this.reactOverlay.create(<FxLabView scene={this} />, this);
  }

  /** Shows an image through its lit material, or plain (unlit). */
  private syncMaterial(material: LitMaterial, image: Phaser.GameObjects.Image, lit: boolean) {
    material.visible = lit;
    image.setVisible(!lit);
  }

  private syncKey(key: SceneLight, settings: FxLab['store']['settings']['key']) {
    key.on = settings.on;
    key.color = settings.color;
    key.intensity = settings.intensity;
    key.radius = settings.radius;
    key.height = settings.height;
    key.flicker = settings.flicker;
  }

  selectFx(id: string): void {
    this.store.selectFx(id);
    this.restartFx();
  }

  /** Plays the draft from the start. One-shots replay on their own while `repeat` is on. */
  restartFx(): void {
    this.stopFx(true);
    const draft = toJS(this.store.draft);
    if (draft.layers.length === 0) return;
    // the middle of the stage, like `#fx <id>` without `at`, so light layers' offsets land as in a story
    this.handle = this.fx.playDef(draft, { at: { stage: [0.5, 0.5] } }, this.store.fxId);
    const handle = this.handle;
    if (draft.duration !== 'infinite') {
      handle.done.then(() => {
        if (this.handle !== handle || !this.store.repeat || !this.scene.isActive()) return;
        this.replayTimer = this.time.delayedCall(REPLAY_GAP_MS, () => this.restartFx());
      });
    }
  }

  stopFx(immediate = false): void {
    this.replayTimer?.remove();
    this.replayTimer = undefined;
    const handle = this.handle;
    this.handle = undefined;
    handle?.stop({ immediate });
  }

  /** Copies the draft as code, ready for data/fx.ts, and shows it in the panel. */
  copyDraft(): void {
    const source = fxEntrySource(this.store.fxId, toJS(this.store.draft));
    this.store.setSource(source);
    navigator.clipboard?.writeText(source).catch(() => {
      // the panel shows the code too, for browsers that refuse the clipboard
    });
  }

  update(time: number): void {
    if (time - this.statsAt > 250) {
      this.statsAt = time;
      this.store.setStats({ ...this.fx.stats });
    }
    this.slotOverlay.clear();
    if (this.store.showSlots) {
      for (const slot of this.fx.debugSlots()) {
        this.slotOverlay.lineStyle(1, 0xffffff, 0.8).strokeCircle(slot.x, slot.y, slot.radius);
        this.slotOverlay.fillStyle(0xffffff, 1).fillCircle(slot.x, slot.y, 3);
      }
    }

    // Parallax: the foreground drifts against the pointer, easing toward its target.
    const { parallax } = this.store.foreground;
    const pointer = this.input.activePointer;
    const { width, height } = this.scale;
    const targetX = this.foregroundHome.x - ((pointer.x - width / 2) / (width / 2)) * parallax;
    const targetY = this.foregroundHome.y - ((pointer.y - height / 2) / (height / 2)) * parallax;
    this.foreground.x += (targetX - this.foreground.x) * 0.1;
    this.foreground.y += (targetY - this.foreground.y) * 0.1;
  }
}
