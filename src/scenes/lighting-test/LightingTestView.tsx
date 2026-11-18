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

const LightControls = observer(({ scene, light, title }: { scene: LightingTest; light: 'key' | 'rim'; title: string }) => {
  const { store } = scene;
  const settings = store.settings[light];
  return (
    <fieldset className={styles.group}>
      <legend>
        <label>
          <input type="checkbox" checked={settings.on}
            onChange={(e) => store.setLight(light, 'on', e.target.checked)} />
          {title}
        </label>
      </legend>
      <label className={styles.row}>
        <span>color</span>
        <input type="color" value={settings.color}
          onChange={(e) => store.setLight(light, 'color', e.target.value)} />
      </label>
      <Slider label="brightness" value={settings.intensity} min={0} max={3} step={0.05}
        onChange={(v) => store.setLight(light, 'intensity', v)} />
      <Slider label="reach" value={settings.radius} min={50} max={900} step={10}
        onChange={(v) => store.setLight(light, 'radius', v)} />
      <Slider label="height" value={settings.height} min={0} max={1} step={0.01}
        onChange={(v) => store.setLight(light, 'height', v)} />
    </fieldset>
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
        <button onClick={() => store.setPanelOpen(false)}>hide</button>
      </div>

      <div className={styles.presets}>
        {Object.keys(PRESETS).map((name) => (
          <button key={name} onClick={() => store.applyPreset(name)}>{name}</button>
        ))}
      </div>

      <div className={styles.toggles}>
        <label>
          <input type="checkbox" checked={settings.lit}
            onChange={(e) => store.set('lit', e.target.checked)} />
          lighting
        </label>
        <label>
          <input type="checkbox" checked={settings.followPointer}
            onChange={(e) => store.set('followPointer', e.target.checked)} />
          follow pointer
        </label>
        <label>
          <input type="checkbox" checked={settings.selfShadow}
            onChange={(e) => store.set('selfShadow', e.target.checked)} />
          self-shadow
        </label>
      </div>

      {settings.selfShadow && (
        <Slider label="softness" value={settings.penumbra} min={0} max={1} step={0.05}
          onChange={(v) => store.set('penumbra', v)} />
      )}

      <label className={styles.row}>
        <span>ambient</span>
        <input type="color" value={settings.ambient}
          onChange={(e) => store.set('ambient', e.target.value)} />
      </label>

      <LightControls scene={scene} light="key" title="main light" />
      <LightControls scene={scene} light="rim" title="rim light" />
    </div>
  );
});
