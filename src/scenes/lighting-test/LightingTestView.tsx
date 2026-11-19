import * as React from 'react';
import { observer } from 'mobx-react-lite';
import type { LightingTest } from './LightingTest';
import { PRESETS } from './lightingTestStore';
import styles from './lightingtest.module.css';

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}

const Slider = ({ label, value, min, max, step, onChange }: SliderProps) => (
  <label className={styles.row}>
    <span>{label}</span>
    <input type="range" min={min} max={max} step={step} value={value}
      onChange={(e) => onChange(Number(e.target.value))} />
    <span className={styles.value}>{value}</span>
  </label>
);

const ColorRow = ({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) => (
  <label className={styles.row}>
    <span>{label}</span>
    <input type="color" value={value} onChange={(e) => onChange(e.target.value)} />
    <span />
  </label>
);

/** A button that shows whether it's selected. Used for every on/off and pick-one control. Test update */
const Toggle = ({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button className={on ? styles.on : styles.off} aria-pressed={on} onClick={onClick}>
    {children}
  </button>
);

const LightControls = observer(({ scene, light, title }: { scene: LightingTest; light: 'key' | 'rim'; title: string }) => {
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

const PixelControls = observer(({ scene }: { scene: LightingTest }) => {
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

const ForegroundControls = observer(({ scene }: { scene: LightingTest }) => {
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

export const LightingTestView = observer(({ scene }: { scene: LightingTest }) => {
  const { store } = scene;
  const { settings } = store;

  if (!store.panelOpen) {
    return (
      <button className={styles.openButton} onClick={() => store.setPanelOpen(true)}>
        lights
      </button>
    );
  }

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span>lighting</span>
        <button className={styles.off} onClick={() => store.setPanelOpen(false)}>hide</button>
      </div>

      <div className={styles.label}>preset{store.activePreset ? '' : ' · custom'}</div>
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
    </div>
  );
});
