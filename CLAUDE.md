# royale

A narrative card game, played mostly on phones. Phaser 4 runs scenes, loading,
audio, the story stage and FX; React draws the UI through a global plugin; MobX holds state.
Dialogue is written in ink. Built with Vite and TypeScript.

## Commands

- `npm run dev` — dev server at `http://localhost:5173/royale/` (Vite `base` is `/royale`)
- `npm run typecheck` — `tsc --noEmit`
- `npm run build` — typecheck, then `vite build`. GitLab Pages runs this, so a type error blocks deploys.
- `npm run lint`

Dev-only URL params (ignored in production builds):

- `?scene=Battle` — jump straight to a scene after loading. Other params become
  the scene's data: `?scene=Dialogue&storyKey=final-battle`.
- `?newgame` — start a fresh game instead of loading the save. Works in any build.
- `?scene=` runs load and save the `dev-test` slot (`DEV_TEST_SLOT` in `GameSession`), never the real save. `?scene=…&newgame` resets that slot.
- `?scene=FxLab` — the FX lab, for tuning FX and lighting: `?scene=FxLab&fx=campfire&mood=night`.

## Layout

- `src/scenes/<name>/` — one folder per scene: the scene class, its MobX store, its views, a CSS module
- `src/plugins/` — global Phaser plugins: `ReactOverlay` (`this.reactOverlay`), `GameSession` (`this.session`)
- `src/fx/` — the FX and lighting package, types and pure helpers included: the `FxSystem` scene plugin (`this.fx`), lit materials and their shaders, the light map
- `src/stage/` — `Stage`: the background, character and foreground of story scenes, drawn in Phaser so they can be lit
- `src/state/` — `GameState` (the live game) and `saves.ts` (save files, slots, settings)
- `src/data/` — content definitions (cards, enemies, techniques, new-game state, FX, lighting moods), keyed by ID
- `src/model/` — cross cutting concerns, core business
- `src/assets/` — every asset, found by `src/assets/manifest.ts` with `import.meta.glob`: `audio/sfx`, `audio/music`, `images/<category>`, `fonts`, `scripts/stories/*.ink` (one per story) and `scripts/game.ink` (shared includes)
- `public/` — only files that need a fixed URL (`favicon.ico`)

## Conventions

### Scenes

- Each scene follows scene + store + view:
  - **Scene:** owns the logic and the methods the view calls (`battle.endTurn()`, `dialogue.advance()`).
  - **Store:** a `makeAutoObservable` MobX store with small setters.
  - **View:** `observer` components that take the scene as a prop.
- Put logic that doesn't need Phaser in plain modules under `src/model/` so it can be tested on its own. FX is the exception: its pure modules stay in `src/fx/` with the rest of the package.
- To use a plugin in a scene, declare the field (`session: GameSession;`). Phaser fills it in before `init`.
- One-off sounds use `this.sound.play(key)`. Only music uses `this.sound.add`, and it must be destroyed on the scene's `shutdown` event, because Phaser's sound manager is global.
- **Assets are found automatically:** drop a file in the right `src/assets/` folder; there's no list to update. Boot loads everything up front.
  - Audio keys are the file name (`attack`, `knight`). Image keys are the path under `images/` without extension (`backgrounds/supermarket`, `characters/eji-angry`).
  - In React, get image URLs with `imageUrl(key)` or import the file directly. Never hard-code `/royale/...` paths: built files have hashed names.
  - Two files with the same key (e.g. `heal.mp3` and `heal.wav`) throw when the game starts.

### Game state and saves

- **Definitions are never changed at runtime.** Look them up by ID (`CARDS`, `ENEMIES`, `TECHNIQUES`).
  - Decks hold `CardInstance`s (`{ uid, cardId }`); use `cardDef(card)` for name, cost and effects.
  - Every battle gets fresh enemies from `createEnemyCombatant(id)`.
- **Battles work on a copy** of the player and write results back at the end. For now only a win writes back; what losing does is still undecided.
- **`GameStateData` is plain data only** (IDs, numbers, strings), because functions don't survive JSON.
  - When it changes shape, bump `SAVE_VERSION` in `state/saves.ts` and add a migration.
- **Saves are keyed by slot** (`royale:save:<slotId>`). Settings are stored separately (`royale:settings`). Unreadable saves are backed up, never overwritten.
- **Autosave checkpoints:** a won battle, the end of a story, leaving the Dialogue scene, and the page being hidden.
- **Story progress is deliberately not saved.** Every story plays from the top. Don't add ink state or screen snapshots to saves.

### Ink

- **Writers' guide:** `src/assets/scripts/AUTHORING.md` explains lines, tags, effects and game state for story writers. Keep it in step when adding or changing tags, moods, FX, text effects or ink functions.
- **Adding a story:** put it in `src/assets/scripts/stories/<key>.ink`. Boot compiles every story once and fails loudly on compile errors.
- **Dev builds check every tag of every story at startup** (`checkStory` in `model/storyTags.ts`, read from the `.ink` source so problems have line numbers). Problems are listed on the loading screen until the player taps "continue anyway", and logged.
- Every story starts with `INCLUDE game.ink`.
- **Lines:**
  - Plain text goes in the message box.
  - A line ending in `#display` is large text over the stage.
  - Lines and `#display` text type out one letter at a time (`LETTER_MS` in `Dialogue.tsx`). A tap finishes the line; the next tap continues.
  - **Voices:** typing plays blips. Message box lines use the `player` voice; `#display` lines use the voice of the character on stage (the last `#enter`). `#voice <key>` picks another for that line, `#voice none` makes it silent. Voices live in `data/voices.ts`; characters without one use `DEFAULT_VOICE`.
  - `#display` and `#voice` change the line they're on (or the next line, from a tag-only line): `parseTag` returns them as modifiers, which `collectCommands` folds into the `line`/`display` command.
- **Text markup:** lines and choices can use HTML-like tags: `<frenzy>Huh?</frenzy>`, `<span class="red big">me</span>`, `<b>`, `<i>`.
  - Parsed by `model/markup.ts`, rendered by `scenes/ui/RichText.tsx`. Unknown tags or classes warn; the text still shows.
  - One-off styles: add a class to `scenes/ui/textStyles.module.css`.
  - New effects: write a component in `scenes/ui/effects/` and add it to `TAGS` in `RichText.tsx`. A plain effect wraps its children; `perLetter: true` gets each letter instead (like `Frenzy`), and should use `groupWords` so words don't break across lines.
  - Never write an empty tag like `<i></i>`: `<>` is glue in ink. `#` and `//` can't appear inside tags either.
- **Tags are for stage directions (visuals and sound):** `#bg <key|none>`, `#enter <character> [emotion]` or `#enter none`, `#foreground <key|none> [backlit]`, `#music <song|stop>` (loops, replaces the current song), `#sfx <sound>` (plays once).
  - One rule for removing things: pictures take `none` (`#bg`, `#enter`, `#foreground`), sounds and effects take `stop` (`#music`, `#ambience`, `#fx`).
  - `#ambience <sound> [volume 0-1]` loops a sound alongside the music, fading in over 1s; several can play at once. The same sound again changes its volume. `#ambience <sound> stop` fades one out, `#ambience stop` all of them. They stop at the end of the story.
  - `#foreground` takes a file in `images/foregrounds/`, any image key (`layers/sakura`) or a URL. `backlit` lights it from behind.
  - `#fx <id>` plays an FX from `data/fx.ts` with its own duration. Add `<ms>` or `infinite` to override it, and `at <character> [face|chest|feet]` to follow the character on stage (chest by default; `CHARACTER_PARTS`), `at <spot>` for a named spot (`STAGE_SPOTS`: `bottom`, `top-left`…), or `at <x> <y>` for a point as fractions of the stage. `#fx <id> stop` stops it (live particles finish, lights fade); `#fx stop` stops every FX, lights included. Looping FX keep going across lines, like `#music`.
  - `#light <mood> [fade ms]` changes the mood, the scene's darkness (`data/lighting.ts`), fading over 500ms by default. Stories start `flat`. Lights (the moon, a fire, a lamp) are FX: `#light night` then `#fx moon-behind`.
  - Tags are parsed in `model/storyTags.ts` (pure, shared by the scene and the startup check), against what exists (`TAG_ASSETS` in `dialogue/tagAssets.ts`). To add a tag: add a `StageCommand` kind and its usage, parse it in `parseTag` (returning a `problem` for wrong arguments or missing assets), and run it in `Dialogue.runCommand`.
- **External functions are for game state:** `stat`, `flag`, `set_flag`, `relationship`, `add_relationship`.
  - Declare them in `game.ink`, with a fallback so stories still run in Inky, and bind them in `dialogue/inkBindings.ts`.
  - Functions that only read are lookahead-safe; functions that change state are not.
- Values only one story needs stay in ink variables. Values the rest of the game needs live in `GameState`.

### FX and lighting

- **An FX is data:** add it to `data/fx.ts` by ID; every field is documented in `fx/types.ts`. Tune it in the FX lab (`?scene=FxLab`), then "copy definition" and paste it back. Boot checks the data (`fx/validate.ts`) and fails loudly.
- **Playing:** `this.fx.play(id, { at, duration })` returns an `FxHandle`. `duration` is ms or `'infinite'`; an infinite FX runs until `handle.stop()`. `stop()` lets particles finish, `stop({ immediate: true })` clears them, `await handle.done` waits for the end. Everything stops when the scene shuts down.
- **Every light is an FX; a mood is only darkness.** Fires, lamps, the moon and spells are FX with `light` layers, so they start, stop, move and follow characters like any FX. A mood (`data/lighting.ts`) is just the ambient color and light steps, one at a time.
- **Layers:** `particles`, `light`, `shake`, `flash`, `vignette`. Particle layers draw at a `depth`: `behind` the characters, in `front` of them, or on `top` of the foreground (`DEPTH` in `fx/types.ts`). Nothing in Phaser can draw over the React UI.
- **Light layers:** a steady light at the FX's position plus `offset` (stage fractions), following a character if the FX does. It gets a point slot before any particle light, and fades in on start and out on stop (`fade`, 500ms default).
  - `behind: true` puts the light between the background and the characters (a moon behind someone): it lights the background as usual, but only rims characters and anything in front of them. The rim's strength and width are `rim` on the front material.
  - `motion` moves it: `swing` (a pendulum from a pivot) or `pass` (travels by `to`, fading in and out, then a gap; street lights overhead). Points are stage fractions from the light's own place; times are ms. Worked out from time each frame, allocating nothing.
  - `bands`/`bandSoftness` give one light its own steps, defined in the data only; without them it uses the mood's. Particle `map` light always uses the mood's.
  - Light-only FX in `data/fx.ts` are placed to look right played without `at` (from the middle of the stage), which is also where the lab plays FX.
- **Light from particles:** a particle layer's `light` is `map` (soft colored light in the low-res light map: cheap, any number, no normal map) or `point` (uses normal maps; only `POINT_SLOTS` exist, given to the brightest, and the rest fall back to `map`).
- **Lit art:** `this.fx.lit(image, { material })` draws an image through the `front` (default) or `backlit` shader. A `<texture>_n` image next to the art is used as its normal map. The image stays the source of position, size and alpha; move or tween the image, not the material.
- **Moods** live in `data/lighting.ts`: ambient color and light steps, named for where they're used (`night`, `firelit`, `pitch-dark`). `this.fx.setMood(id, { fade })`. `flat` is every scene's default and shows art as drawn. The lab's lighting tab edits moods with a pointer-following test light; FX lights are edited in its fx tab.
- **The stage is the main camera's view.** Story scenes point the camera at the stage's box (`Stage.setRectFromElement`), so FX and lights use stage coordinates.
- **Budgets for phones:** `POINT_SLOTS` (8), `PARTICLE_BUDGET` (300), `ART_PIXEL` (light map texel size). The `fxQuality` and `reducedMotion` settings halve particles and drop bloom, and skip shake and flash.
- **Per frame, allocate nothing** in FX and lighting code: pooled light candidates, uniform arrays allocated once. Garbage collection on phones shows up as stutter.
- Phaser's `ADD` blend is `(ONE, DST_ALPHA)`, not plain addition, which is why the light map is cleared to opaque black.

### TypeScript

`strict` is on. `strictPropertyInitialization` is off on purpose, because Phaser
scenes assign their fields in `init`/`create`, not in the constructor.

## How to work in this repo

- **Don't remove existing behavior, defaults or assets unless asked.** Keep changes to what was requested.
- **Propose a design before structural changes,** then wait for a go-ahead.
- **UX decisions are the owner's.** Some things that look like bugs are intentional: the message box and `#display` text both stay on screen, because several pieces of information are meant to be visible at once.
- **Don't commit unless asked.** The owner commits between steps.
- **Before saying something works:** run `npm run typecheck`, and play the change in the browser when it's visible on screen.
  - The browser pane has to be visible. When it's hidden, animations stall and Boot's fade never finishes.
  - There's no test runner yet. Plain modules can be checked by bundling a script with esbuild and running it in Node.

## Known gaps
- `ReactOverlay` shows one scene's UI at a time, so UI can't stack (e.g. dialogue over a battle).
- Battle's rules live in the scene class, and enemy AI (`getNextStateIndex`) takes the scene as an argument.
- `Battle` and `GameOver` still create sounds with `this.sound.add` on every visit.
- Battle doesn't use `Stage` or lighting yet; it's meant to adopt Dialogue's presentation later.
- There's no settings screen for `fxQuality` and `reducedMotion` yet; they're read from `royale:settings`.
