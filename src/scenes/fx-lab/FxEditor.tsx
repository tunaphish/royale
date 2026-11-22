import * as React from 'react';
import { observer } from 'mobx-react-lite';
import { FX } from '../../data/fx';
import { builtinNames } from '../../fx/textures';
import type { ColorChoice, LayerDef, ParticleLayerDef } from '../../fx/types';
import type { FxLab } from './FxLab';
import type { DraftPath } from './fxLabStore';
import { ColorRow, Slider, Small, Toggle } from './controls';
import styles from './fxlab.module.css';

/**
 * Edits the FX being tuned. Controls come from the definition's own shape:
 * numbers get sliders, `[min, max]` gets two, colors get pickers, known
 * choices get buttons, objects nest. A new field in `fx/types.ts` shows up
 * here without UI work; give it a slider range in `RANGES` if the default is off.
 */

/** Slider [min, max, step] by field name. */
const RANGES: Record<string, [number, number, number]> = {
  duration: [50, 10000, 50],
  prewarm: [0, 6000, 100],
  rate: [0, 40, 0.1],
  burst: [0, 200, 1],
  lifespan: [50, 10000, 50],
  x: [-400, 400, 1],
  y: [-400, 400, 1],
  gravity: [-600, 600, 5],
  size: [0.1, 6, 0.05],
  angle: [0, 360, 1],
  spin: [-720, 720, 5],
  glow: [0, 2, 0.05],
  maxAlive: [1, 300, 1],
  radius: [5, 600, 5],
  strength: [0, 4, 0.05],
  height: [0, 1, 0.01],
  priority: [0, 5, 0.1],
  amount: [0, 1, 0.01],
  speed: [0, 12, 0.1],
  time: [10, 2000, 10],
  intensity: [0, 0.05, 0.001],
  circle: [1, 300, 1],
  weight: [0.1, 10, 0.1],
  endSize: [0, 4, 0.05],
  wind: [-300, 300, 1],
  distance: [0, 120, 1],
};

const rangeFor = (key: string, value: number): [number, number, number] =>
  RANGES[key] ?? [Math.min(0, value * 2), Math.max(1, Math.abs(value) * 3), 0.01];

const CHOICES: Record<string, string[]> = {
  fade: ['in-out', 'in', 'out', 'none'],
  blend: ['add', 'normal'],
  depth: ['behind', 'front', 'top'],
  mode: ['map', 'point'],
};

/** Fields a particle layer can gain, with starting values. */
const PARTICLE_OPTIONAL: Partial<ParticleLayerDef> = {
  rate: 5,
  burst: 10,
  area: 'point',
  depth: 'front',
  velocity: { x: [-20, 20], y: [-40, -10] },
  gravity: 0,
  size: 1,
  endSize: 0.3,
  wind: [-10, 10],
  sway: { distance: 12, speed: 0.6 },
  angle: [0, 360],
  spin: [-90, 90],
  fade: 'in-out',
  blend: 'add',
  glow: 0.5,
  maxAlive: 100,
  light: { mode: 'map', radius: 100, strength: 0.5 },
};

const NEW_LAYERS: Record<string, LayerDef> = {
  particles: {
    kind: 'particles', sprite: 'builtin:cross', rate: 5, lifespan: [1000, 2000],
    velocity: { y: [-40, -10] }, colors: ['#ffffff'],
  },
  shake: { kind: 'shake', time: 200, intensity: 0.01 },
  flash: { kind: 'flash', time: 150, color: '#ffffff' },
  vignette: { kind: 'vignette', strength: 0.5, radius: 0.5, color: '#000000' },
};

/** Extra fields nested objects can gain. */
const NESTED_OPTIONAL: Record<string, Record<string, unknown>> = {
  light: { height: 0.15, priority: 1, flicker: { amount: 0.2, speed: 2 } },
  velocity: { x: [-20, 20], y: [-40, -10] },
};

const isColor = (value: unknown): value is string => typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value);
const isPair = (value: unknown): value is [number, number] =>
  Array.isArray(value) && value.length === 2 && value.every((v) => typeof v === 'number');

interface FieldProps {
  scene: FxLab;
  path: DraftPath;
  name: string;
  value: unknown;
  removable?: boolean;
}

const Field = observer(({ scene, path, name, value, removable }: FieldProps): JSX.Element | null => {
  const { store } = scene;
  const set = (v: unknown) => store.setDraft(path, v);
  const remove = removable ? <Small onClick={() => store.removeDraft(path)} title="remove">x</Small> : undefined;

  if (name === 'kind') return null;
  if (name === 'area') return <AreaField scene={scene} path={path} value={value as ParticleLayerDef['area']} remove={remove} />;
  if (name === 'colors') return <ColorsField scene={scene} path={path} colors={value as ColorChoice[]} />;
  if (name === 'sprite') return <SpriteField scene={scene} path={path} value={value as string} />;
  if (name === 'emitter') return <div className={styles.hint}>emitter: raw Phaser config (edit in code) {remove}</div>;

  if (CHOICES[name] && typeof value === 'string') {
    return (
      <div className={styles.subTitle}>
        <span>{name}</span>
        <span className={styles.buttons}>
          {CHOICES[name].map((choice) => <Toggle key={choice} on={value === choice} onClick={() => set(choice)}>{choice}</Toggle>)}
          {remove}
        </span>
      </div>
    );
  }
  if (typeof value === 'boolean') {
    return <div className={styles.buttons}><Toggle on={value} onClick={() => set(!value)}>{name}</Toggle>{remove}</div>;
  }
  if (typeof value === 'number') {
    const [min, max, step] = rangeFor(name, value);
    return (
      <div>
        <Slider label={name} value={value} min={min} max={max} step={step} onChange={set} />
        <div className={styles.buttons}>
          <Small onClick={() => set([value, value])} title="make it a random range">↔ range</Small>
          {remove}
        </div>
      </div>
    );
  }
  if (isPair(value)) {
    const [min, max, step] = rangeFor(name, value[0]);
    return (
      <div>
        <Slider label={`${name} min`} value={value[0]} min={min} max={max} step={step} onChange={(v) => set([v, value[1]])} />
        <Slider label={`${name} max`} value={value[1]} min={min} max={max} step={step} onChange={(v) => set([value[0], v])} />
        <div className={styles.buttons}>
          <Small onClick={() => set(value[0])} title="make it a fixed value">• fixed</Small>
          {remove}
        </div>
      </div>
    );
  }
  if (isColor(value)) return <ColorRow label={name} value={value} onChange={set} extra={remove} />;
  if (typeof value === 'string') {
    return (
      <label className={styles.row}>
        <span>{name}</span>
        <input value={value} onChange={(e) => set(e.target.value)} />
        <span>{remove}</span>
      </label>
    );
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    const addable = Object.entries(NESTED_OPTIONAL[name] ?? {}).filter(([key]) => !(key in value));
    return (
      <div className={styles.subgroup}>
        <div className={styles.subTitle}><span>{name}</span>{remove}</div>
        {entries.map(([key, v]) => (
          <Field key={key} scene={scene} path={[...path, key]} name={key} value={v} removable />
        ))}
        {addable.length > 0 && (
          <div className={styles.buttons}>
            {addable.map(([key, v]) => (
              <Small key={key} onClick={() => store.setDraft([...path, key], JSON.parse(JSON.stringify(v)))}>+ {key}</Small>
            ))}
          </div>
        )}
      </div>
    );
  }
  return null;
});

const AREA_KINDS = ['point', 'stage', 'circle', 'rect'] as const;

const AreaField = observer(({ scene, path, value, remove }: {
  scene: FxLab;
  path: DraftPath;
  value: ParticleLayerDef['area'];
  remove?: React.ReactNode;
}) => {
  const set = (v: unknown) => scene.store.setDraft(path, v);
  const kind = typeof value === 'string' ? value : value && 'circle' in value ? 'circle' : 'rect';
  const pick = (k: typeof AREA_KINDS[number]) => {
    if (k === 'circle') set({ circle: 40 });
    else if (k === 'rect') set({ rect: [120, 60] });
    else set(k);
  };
  return (
    <div>
      <div className={styles.subTitle}>
        <span>area</span>
        <span className={styles.buttons}>
          {AREA_KINDS.map((k) => <Toggle key={k} on={kind === k} onClick={() => pick(k)}>{k}</Toggle>)}
          {remove}
        </span>
      </div>
      {value && typeof value === 'object' && 'circle' in value && (
        <Slider label="radius" value={value.circle} min={1} max={300} step={1} onChange={(v) => set({ circle: v })} />
      )}
      {value && typeof value === 'object' && 'rect' in value && (
        <>
          <Slider label="width" value={value.rect[0]} min={1} max={600} step={1} onChange={(v) => set({ rect: [v, value.rect[1]] })} />
          <Slider label="height" value={value.rect[1]} min={1} max={600} step={1} onChange={(v) => set({ rect: [value.rect[0], v] })} />
        </>
      )}
    </div>
  );
});

const ColorsField = observer(({ scene, path, colors }: { scene: FxLab; path: DraftPath; colors: ColorChoice[] }) => {
  const { store } = scene;
  return (
    <div className={styles.subgroup}>
      <div className={styles.subTitle}>
        <span>colors</span>
        <Small onClick={() => store.setDraft([...path, colors.length], '#ffffff')}>+ color</Small>
      </div>
      {colors.map((choice, i) => {
        const color = typeof choice === 'string' ? choice : choice.color;
        const weight = typeof choice === 'string' ? 1 : choice.weight;
        const setChoice = (c: string, w: number) => store.setDraft([...path, i], w === 1 ? c : { color: c, weight: w });
        return (
          <div key={i}>
            <ColorRow label={`color ${i + 1}`} value={color} onChange={(c) => setChoice(c, weight)}
              extra={colors.length > 1 ? <Small onClick={() => store.removeDraft([...path, i])}>x</Small> : undefined} />
            {colors.length > 1 && (
              <Slider label="weight" value={weight} min={0.1} max={10} step={0.1} onChange={(w) => setChoice(color, w)} />
            )}
          </div>
        );
      })}
    </div>
  );
});

const SpriteField = observer(({ scene, path, value }: { scene: FxLab; path: DraftPath; value: string }) => {
  const set = (v: string) => scene.store.setDraft(path, v);
  return (
    <div>
      <div className={styles.subTitle}>
        <span>sprite</span>
        <span className={styles.buttons}>
          {builtinNames.filter((n) => n !== 'blob').map((n) => (
            <Toggle key={n} on={value === `builtin:${n}`} onClick={() => set(`builtin:${n}`)}>{n}</Toggle>
          ))}
        </span>
      </div>
      <label className={styles.row}>
        <span>image key</span>
        <input value={value} onChange={(e) => set(e.target.value)} />
        <span />
      </label>
    </div>
  );
});

const LayerEditor = observer(({ scene, index, layer }: { scene: FxLab; index: number; layer: LayerDef }) => {
  const { store } = scene;
  const path: DraftPath = ['layers', index];
  const addable = layer.kind === 'particles'
    ? Object.entries(PARTICLE_OPTIONAL).filter(([key]) => !(key in layer))
    : [];
  // fields every layer of its kind must have can't be removed
  const required = new Set(['kind', 'sprite', 'lifespan', 'colors', 'time', 'intensity', 'color', 'strength', 'radius']);
  return (
    <section className={styles.group}>
      <div className={styles.groupHeader}>
        <span className={styles.groupTitle}>layer {index + 1}: {layer.kind}</span>
        <Small onClick={() => store.removeDraft(path)} title="remove layer">remove</Small>
      </div>
      {Object.entries(layer).map(([key, value]) => (
        <Field key={key} scene={scene} path={[...path, key]} name={key} value={value}
          removable={!required.has(key) || (layer.kind === 'vignette' && key === 'color')} />
      ))}
      {addable.length > 0 && (
        <div className={styles.buttons}>
          {addable.map(([key, value]) => (
            <Small key={key} onClick={() => store.setDraft([...path, key], JSON.parse(JSON.stringify(value)))}>+ {key}</Small>
          ))}
        </div>
      )}
    </section>
  );
});

export const FxEditor = observer(({ scene }: { scene: FxLab }) => {
  const { store } = scene;
  const { draft, stats } = store;
  const prewarm = draft.prewarm === true ? 3000 : typeof draft.prewarm === 'number' ? draft.prewarm : 0;

  return (
    <>
      <div className={styles.label}>fx (src/data/fx.ts)</div>
      <div className={styles.buttons}>
        {Object.keys(FX).map((id) => (
          <Toggle key={id} on={store.fxId === id} onClick={() => scene.selectFx(id)}>{id}</Toggle>
        ))}
      </div>

      <div className={styles.label}>play</div>
      <div className={styles.buttons}>
        <button className={styles.off} onClick={() => scene.restartFx()}>restart</button>
        <button className={styles.off} onClick={() => scene.stopFx()}>stop</button>
        <Toggle on={store.repeat} onClick={() => store.setRepeat(!store.repeat)}>repeat one-shots</Toggle>
        <button className={styles.off} onClick={() => store.resetDraft()}>reset edits</button>
        <button className={styles.off} onClick={() => scene.copyDraft()}>copy definition</button>
      </div>
      {store.source !== null && (
        <>
          <div className={styles.hint}>Copied. Paste over "{store.fxId}" in src/data/fx.ts (or select it here):</div>
          <textarea className={styles.source} readOnly value={store.source} onFocus={(e) => e.target.select()} />
        </>
      )}

      <div className={styles.label}>show</div>
      <div className={styles.buttons}>
        <Toggle on={store.showLightMap} onClick={() => store.setShowLightMap(!store.showLightMap)}>light map</Toggle>
        <Toggle on={store.showSlots} onClick={() => store.setShowSlots(!store.showSlots)}>point slots</Toggle>
        <Toggle on={store.quality === 'low'} onClick={() => store.setQuality(store.quality === 'low' ? 'high' : 'low')}>low quality</Toggle>
        <Toggle on={store.reducedMotion} onClick={() => store.setReducedMotion(!store.reducedMotion)}>reduced motion</Toggle>
      </div>
      <div className={styles.stats}>
        {stats.fx} fx | {stats.particles} particles | {stats.pointLights} point lights | {stats.mapLights} map lights
      </div>

      <section className={styles.group}>
        <div className={styles.groupHeader}><span className={styles.groupTitle}>timing</span></div>
        <div className={styles.buttons}>
          <Toggle on={draft.duration === 'infinite'} onClick={() => store.setDraft(['duration'], draft.duration === 'infinite' ? 1000 : 'infinite')}>
            infinite
          </Toggle>
        </div>
        {draft.duration !== 'infinite' && (
          <Slider label="duration" value={draft.duration} min={50} max={10000} step={50} onChange={(v) => store.setDraft(['duration'], v)} />
        )}
        <Slider label="prewarm" value={prewarm} min={0} max={6000} step={100}
          onChange={(v) => (v > 0 ? store.setDraft(['prewarm'], v) : store.removeDraft(['prewarm']))} />
        <label className={styles.row}>
          <span>sfx</span>
          <input value={draft.sfx ?? ''} placeholder="audio key"
            onChange={(e) => (e.target.value ? store.setDraft(['sfx'], e.target.value) : store.removeDraft(['sfx']))} />
          <span />
        </label>
      </section>

      {draft.layers.map((layer, i) => <LayerEditor key={i} scene={scene} index={i} layer={layer} />)}

      <div className={styles.buttons} style={{ marginTop: 8 }}>
        {Object.entries(NEW_LAYERS).map(([kind, layer]) => (
          <Small key={kind} onClick={() => store.setDraft(['layers', draft.layers.length], JSON.parse(JSON.stringify(layer)))}>
            + {kind} layer
          </Small>
        ))}
      </div>
    </>
  );
});
