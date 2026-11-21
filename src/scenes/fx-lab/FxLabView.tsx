import * as React from 'react';
import { observer } from 'mobx-react-lite';
import type { FxLab } from './FxLab';
import { PRESETS } from './fxLabStore';
import { ColorRow, Slider, Toggle } from './controls';
import { FxEditor } from './FxEditor';
import type { CrtSettings } from '../../fx/crt';
import styles from './fxlab.module.css';

const LightControls = observer(({ scene, light, title }: { scene: FxLab; light: 'key' | 'rim'; title: string }) => {
  const { store } = scene;
  const settings = store.settings[light];
  return (
    <section className={styles.group}>
      <div className={styles.groupHeader}>
        <span className={styles.groupTitle}>{title}</span>
        <Toggle on={settings.on} onClick={() => store.setLight(light, 'on', !settings.on)}>
          {settings.on ? 'on' : 'off'}
        </Toggle>
      </div>
      {settings.on && (
        <>
          <ColorRow label="color" value={settings.color}
            onChange={(v) => store.setLight(light, 'color', v)} />
          <Slider label="brightness" value={settings.intensity} min={0} max={3} step={0.05}
            onChange={(v) => store.setLight(light, 'intensity', v)} />
          <Slider label="reach" value={settings.radius} min={50} max={900} step={10}
            onChange={(v) => store.setLight(light, 'radius', v)} />
          <Slider label="height" value={settings.height} min={0} max={1} step={0.01}
            onChange={(v) => store.setLight(light, 'height', v)} />
        </>
      )}
    </section>
  );
});

const PixelControls = observer(({ scene }: { scene: FxLab }) => {
  const { store } = scene;
  const { settings, grid } = store;
  return (
    <section className={styles.group}>
      <div className={styles.groupHeader}>
        <span className={styles.groupTitle}>pixels</span>
      </div>
      <Slider label="pixel size" value={grid.size} min={1} max={16} step={0.5}
        onChange={(v) => store.setGrid('size', v)} />
      <Slider label="offset x" value={grid.offsetX} min={0} max={grid.size} step={0.5}
        onChange={(v) => store.setGrid('offsetX', v)} />
      <Slider label="offset y" value={grid.offsetY} min={0} max={grid.size} step={0.5}
        onChange={(v) => store.setGrid('offsetY', v)} />
      <Slider label="steps" value={settings.bands} min={0} max={6} step={1}
        onChange={(v) => store.set('bands', v)} />
      <Slider label="step edge" value={settings.bandSoftness} min={0} max={1} step={0.05}
        onChange={(v) => store.set('bandSoftness', v)} />
    </section>
  );
});

const ForegroundControls = observer(({ scene }: { scene: FxLab }) => {
  const { store } = scene;
  const fg = store.foreground;
  return (
    <section className={styles.group}>
      <div className={styles.groupHeader}>
        <span className={styles.groupTitle}>foreground</span>
        <Toggle on={fg.on} onClick={() => store.setForeground('on', !fg.on)}>{fg.on ? 'on' : 'off'}</Toggle>
      </div>
      {fg.on && (
        <>
          <Slider label="blur" value={fg.blur} min={0} max={4} step={0.1}
            onChange={(v) => store.setForeground('blur', v)} />
          <Slider label="opacity" value={fg.opacity} min={0} max={1} step={0.05}
            onChange={(v) => store.setForeground('opacity', v)} />
          <Slider label="front fill" value={fg.fill} min={0} max={1} step={0.01}
            onChange={(v) => store.setForeground('fill', v)} />
          <Slider label="glow thru" value={fg.translucency} min={0} max={3} step={0.05}
            onChange={(v) => store.setForeground('translucency', v)} />
          <Slider label="rim" value={fg.rim} min={0} max={4} step={0.05}
            onChange={(v) => store.setForeground('rim', v)} />
          <Slider label="rim width" value={fg.rimWidth} min={0.5} max={4} step={0.5}
            onChange={(v) => store.setForeground('rimWidth', v)} />
          <Slider label="light depth" value={fg.depth} min={0} max={400} step={10}
            onChange={(v) => store.setForeground('depth', v)} />
          <Slider label="parallax" value={fg.parallax} min={0} max={30} step={1}
            onChange={(v) => store.setForeground('parallax', v)} />
        </>
      )}
    </section>
  );
});

export const FxLabView = observer(({ scene }: { scene: FxLab }) => {
  const { store } = scene;

  if (!store.panelOpen) {
    return (
      <button className={styles.openButton} onClick={() => store.setPanelOpen(true)}>
        lab
      </button>
    );
  }

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.tabs}>
          <Toggle on={store.tab === 'fx'} onClick={() => store.setTab('fx')}>fx</Toggle>
          <Toggle on={store.tab === 'lighting'} onClick={() => store.setTab('lighting')}>lighting</Toggle>
        </span>
        <button className={styles.off} onClick={() => store.setPanelOpen(false)}>hide</button>
      </div>
      {store.tab === 'fx' ? <FxEditor scene={scene} /> : <LightingPanel scene={scene} />}
    </div>
  );
});

const CRT_SLIDERS: [keyof CrtSettings, number, number, number][] = [
  ['curvature', 0, 0.5, 0.01],
  ['scanlines', 0, 1, 0.01],
  ['lineSize', 1, 8, 0.5],
  ['mask', 0, 1, 0.01],
  ['aberration', 0, 6, 0.1],
  ['vignette', 0, 1, 0.01],
  ['noise', 0, 0.3, 0.01],
  ['flicker', 0, 1, 0.05],
  ['brightness', 0.5, 2, 0.05],
];

const CrtControls = observer(({ scene }: { scene: FxLab }) => {
  const { store } = scene;
  return (
    <section className={styles.group}>
      <div className={styles.groupHeader}>
        <span className={styles.groupTitle}>crt tv (fx/crt.ts)</span>
        <Toggle on={store.crtOn} onClick={() => store.setCrtOn(!store.crtOn)}>{store.crtOn ? 'on' : 'off'}</Toggle>
      </div>
      {store.crtOn && CRT_SLIDERS.map(([field, min, max, step]) => (
        <Slider key={field} label={field} value={store.crt[field]} min={min} max={max} step={step}
          onChange={(v) => store.setCrt(field, v)} />
      ))}
    </section>
  );
});

/** Mood and material settings. Presets are the moods in data/lighting.ts. */
const LightingPanel = observer(({ scene }: { scene: FxLab }) => {
  const { store } = scene;
  const { settings } = store;
  return (
    <>
      <div className={styles.label}>mood{store.activePreset ? '' : ' | custom'}</div>
      <div className={styles.buttons}>
        {Object.keys(PRESETS).map((name) => (
          <Toggle key={name} on={store.activePreset === name} onClick={() => store.applyPreset(name)}>
            {name}
          </Toggle>
        ))}
      </div>

      <div className={styles.label}>mode</div>
      <div className={styles.buttons}>
        <Toggle on={store.mode === 'pixel'} onClick={() => store.setMode('pixel')}>pixel</Toggle>
        <Toggle on={store.mode === 'phaser'} onClick={() => store.setMode('phaser')}>smooth (phaser)</Toggle>
      </div>

      <div className={styles.label}>show</div>
      <div className={styles.buttons}>
        <Toggle on={settings.lit} onClick={() => store.set('lit', !settings.lit)}>lighting</Toggle>
        <Toggle on={store.normalMap} onClick={() => store.setNormalMap(!store.normalMap)}>normal map</Toggle>
        <Toggle on={settings.followPointer} onClick={() => store.set('followPointer', !settings.followPointer)}>
          follow pointer
        </Toggle>
        {store.mode === 'phaser' && (
          <Toggle on={settings.selfShadow} onClick={() => store.set('selfShadow', !settings.selfShadow)}>
            self-shadow
          </Toggle>
        )}
      </div>

      {store.mode === 'phaser' && settings.selfShadow && (
        <Slider label="softness" value={settings.penumbra} min={0} max={1} step={0.05}
          onChange={(v) => store.set('penumbra', v)} />
      )}

      <ColorRow label="ambient" value={settings.ambient} onChange={(v) => store.set('ambient', v)} />

      {store.mode === 'pixel' && <PixelControls scene={scene} />}

      <LightControls scene={scene} light="key" title="main light" />
      <LightControls scene={scene} light="rim" title="rim light" />
      <ForegroundControls scene={scene} />
      <CrtControls scene={scene} />
    </>
  );
});
