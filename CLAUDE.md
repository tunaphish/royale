# royale

A narrative card game, played mostly on phones. Phaser 4 runs scenes, loading,
audio, the story stage and FX; React draws the UI through a global plugin; MobX holds state.
Dialogue is written in ink. Built with Vite and TypeScript.

## Commands

- `npm run dev` — dev server at `http://localhost:5173/royale/` (Vite `base` is `/royale`)
- `npm run typecheck` — `tsc --noEmit`
- `npm run build` — checks the writers' guide tables (warns only), then typecheck, lint (without fixing), tests, and `vite build`. GitLab Pages runs this, so a type error, a lint error or a failing test blocks deploys.
- `npm run docs` — rewrites the mood and FX tables in `src/assets/scripts/AUTHORING.md` from the doc comments in `data/lighting.ts` and `data/fx.ts` (`scripts/authoring-tables.mjs`).
- `npm test` — Vitest, once (`npm run test:watch` to keep it running). Tests sit next to their module: `storyTags.test.ts`.
- `npm run lint` — ESLint 9 (`eslint.config.mjs`: typescript-eslint and React hooks, no formatting rules), fixing what it can.

The game starts at `MainMenu` (continue, new game, the story list, the FX lab). The story list, the FX lab and School's settings tab lead back to it.

Dev-only URL params (ignored in production builds):

- `?scene=Battle` — jump straight to a scene after loading. Other params become
  the scene's data: `?scene=Dialogue&storyKey=final-battle` (`SCENE_DEFAULTS` in `Boot.tsx` fills in data a scene needs).
- `?newgame` — start a fresh game instead of loading the save. Works in any build.
- `?scene=` runs load and save the `dev-test` slot (`DEV_TEST_SLOT` in `GameSession`), never the real save. `?scene=…&newgame` resets that slot.
- `?scene=FxLab` — the FX lab, for tuning FX and lighting: `?scene=FxLab&fx=campfire&mood=night`.
- `?scene=School` — the school week. Add `&newgame` to start the week over.

## Layout

- `src/scenes/<name>/` — one folder per scene: the scene class, its MobX store, its views, a CSS module
- `src/scenes/story/` — the story screen shared by scenes: `StoryPlayer` (plays ink on a `Stage` and message box: typing, voices, tags, FX, sounds), `StoryStore`, the stage and message box views, ink bindings and tag assets. Dialogue and School both use it.
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
  - Audio keys are the file name (`attack`, `knight`). Image keys are the path under `images/` without extension (`backgrounds/supermarket`, `characters/thief`).
  - In React, get image URLs with `imageUrl(key)` or import the file directly. Never hard-code `/royale/...` paths: built files have hashed names.
  - Two files with the same key (e.g. `heal.mp3` and `heal.wav`) throw when the game starts.
  - Image extensions can be upper or lower case (`.png` or `.PNG`); audio extensions must be lower case.

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

- **Writers' guide:** `src/assets/scripts/AUTHORING.md` explains lines, tags, effects and game state for story writers. Keep it in step when adding or changing tags, text effects or ink functions.
  - Its mood and FX tables are generated: the doc comment above each entry in `data/lighting.ts` and `data/fx.ts` is its description, so write those for writers. Run `npm run docs` after adding or changing a mood or FX; don't edit between the `<!-- generated -->` markers.
- **Adding a story:** put it in `src/assets/scripts/stories/<key>.ink`. Boot compiles every story once and fails loudly on compile errors.
- **Dev builds check every tag of every story at startup** (`checkStory` in `model/storyTags.ts`, read from the `.ink` source so problems have line numbers). Problems are listed on the loading screen until the player taps "continue anyway", and logged.
- Every story starts with `INCLUDE game.ink`.
- **Lines:**
  - Plain text goes in the message box.
  - A line ending in `#display` is large text over the stage.
  - Lines and `#display` text type out one letter at a time (`LETTER_MS` in `story/StoryPlayer.ts`). A tap finishes the line; the next tap continues.
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
  - `#foreground` takes a file in `images/foregrounds/`, any image key (`layers/sakura`) or a URL, with its slashes escaped (`https:\/\/…`) because ink reads `//` as a comment. `backlit` lights it from behind. Stories start with no foreground.
  - `#fx <id>` plays an FX from `data/fx.ts` with its own duration. Add `<ms>` or `infinite` to override it, and `at <character> [face|chest|feet]` to follow the character on stage (chest by default; `CHARACTER_PARTS`), `at <spot>` for a named spot (`STAGE_SPOTS`: `bottom`, `top-left`…), or `at <x> <y>` for a point as fractions of the stage. `#fx <id> stop` stops it (live particles finish, lights fade); `#fx stop` stops every FX, lights included. Looping FX keep going across lines, like `#music`.
  - `#light <mood> [fade ms]` changes the mood, the scene's darkness (`data/lighting.ts`), fading over 500ms by default. Stories start `flat`. Lights (the moon, a fire, a lamp) are FX: `#light night` then `#fx moon-behind`.
  - Tags are parsed in `model/storyTags.ts` (pure, shared by the scene and the startup check), against what exists (`TAG_ASSETS` in `story/tagAssets.ts`). To add a tag: add a `StageCommand` kind and its usage, parse it in `parseTag` (returning a `problem` for wrong arguments or missing assets), and run it in `StoryPlayer.runCommand`.
- **External functions are for game state:** `stat`, `flag`, `set_flag`, `disposition`, `add_disposition`, `mood`, `set_mood`, `has_star`, `history`. `relationship` and `add_relationship` are kept as old names for `disposition` and `add_disposition`.
  - Declare them in `game.ink`, with a fallback so stories still run in Inky, and bind them in `story/inkBindings.ts`.
  - Functions that only read are lookahead-safe; functions that change state are not.
- Values only one story needs stay in ink variables. Values the rest of the game needs live in `GameState`.

### FX and lighting

- **An FX is data:** add it to `data/fx.ts` by ID; every field is documented in `fx/types.ts`. Tune it in the FX lab (`?scene=FxLab`), then "copy definition" and paste it back. Boot checks the data (`fx/validate.ts`) and fails loudly.
- **Playing:** `this.fx.play(id, { at, duration })` returns an `FxHandle`. `duration` is ms or `'infinite'`; an infinite FX runs until `handle.stop()`. `stop()` lets particles finish, `stop({ immediate: true })` clears them, `await handle.done` waits for the end. Everything stops when the scene shuts down.
- **Every light is an FX; a mood is only darkness.** Fires, lamps, the moon and spells are FX with `light` layers, so they start, stop, move and follow characters like any FX. A mood (`data/lighting.ts`) is just the ambient color and light steps, one at a time.
- **Layers:** `particles`, `light`, `pattern`, `shake`, `flash`, `vignette`. Particle layers draw at a `depth`: `behind` the characters, in `front` of them, or on `top` of the foreground (`DEPTH` in `fx/types.ts`). Nothing in Phaser can draw over the React UI.
- **Light layers:** a steady light at the FX's position plus `offset` (stage fractions), following a character if the FX does. It gets a point slot before any particle light, and fades in on start and out on stop (`fade`, 500ms default).
  - `behind: true` puts the light between the background and the characters (a moon behind someone): it lights the background as usual, but only rims characters and anything in front of them. The rim's strength and width are constants in `shaders/front.ts` (`RIM`, `RIM_WIDTH`).
  - `motion` moves it: `swing` (a pendulum from a pivot) or `pass` (travels by `to`, fading in and out, then a gap; street lights overhead). Points are stage fractions from the light's own place; times are ms. Worked out from time each frame, allocating nothing.
  - `bands`/`bandSoftness` give one light its own steps, defined in the data only; without them it uses the mood's. Particle `map` light always uses the mood's.
  - Light-only FX in `data/fx.ts` are placed to look right played without `at` (from the middle of the stage), which is also where the lab plays FX.
- **Pattern layers:** a texture's brightness (times alpha) as light over the whole stage, repeated to fill it, drawn into the light map (sun through a canopy: `textures/canopy`). It ignores where the FX plays, can `sway`, and fades like a light layer. `fx/patterns.ts` holds the tiling math; `ensurePatternTexture` makes a greyscale copy once.
- **Light from particles:** a particle layer's `light` is `map` (soft colored light in the low-res light map: cheap, any number, no normal map) or `point` (uses normal maps; only `POINT_SLOTS` exist, given to the brightest, and the rest fall back to `map`).
- **Lit art:** `this.fx.lit(image, { material })` draws an image through the `front` (default) or `backlit` shader. A `<texture>_n` image next to the art is used as its normal map. The image stays the source of position, size and alpha; move or tween the image, not the material.
- **Moods** live in `data/lighting.ts`: ambient color and light steps, named for where they're used (`night`, `firelit`, `pitch-dark`). `this.fx.setMood(id, { fade })`. `flat` is every scene's default and shows art as drawn. The lab's lighting tab edits moods with a pointer-following test light; FX lights are edited in its fx tab.
- **The stage is the main camera's view.** Story scenes point the camera at the stage's box (`Stage.setRectFromElement`), so FX and lights use stage coordinates.
- **Budgets for phones:** `POINT_SLOTS` (8), `PARTICLE_BUDGET` (300), `ART_PIXEL` (light map texel size). The `fxQuality` and `reducedMotion` settings halve particles and drop bloom, and skip shake and flash.
- **Per frame, allocate nothing** in FX and lighting code: pooled light candidates, uniform arrays allocated once. Garbage collection on phones shows up as stutter.
- Phaser's `ADD` blend is `(ONE, DST_ALPHA)`, not plain addition, which is why the light map is cleared to opaque black.

### School sim

- The design is in `docs/design.md` (School Sim). Content is data in `src/data/school/` (items, locations, activities, students, stars, events, intel names); its shapes are in `model/school.ts`.
- **Time is a slot count** (`calendar.time`): 2 slots a day, Saturday to Thursday, 12 a week, 0 is the first Saturday morning. Friday is the royale. `model/calendar.ts` turns it into week, day and slot.
- **One condition language** (`model/conditions.ts`) locks activities, stars, events and locations; write them with `when.*`. A condition or effect that leaves out `student` means the student involved (the one you're with, the star's student).
- **One screen:** School is a story screen like Dialogue: the stage on top shows the place (`LocationDef.background`, `foreground` and `lighting`) and the first student there, and is clear on the map; the message box shows the map grid, actions, results and Friday, with a status strip along its bottom. No modals.
- **The menu:** the status strip's ☰ opens tabs in the message box (`MenuTab` in `schoolStore.ts`): the constellation (drawn over an empty stage), students (a profile of the picked one, their portrait on an empty stage) and settings. Not during a story.
- **Scenes play in place:** School plays star, event and activity stories through its own `StoryPlayer`, over the current place; when one ends it calls `player.reset()`, puts the place back, and `finishScene` lights the star or marks the event, then applies its effects.
- **Places are lit and framed:** a location's `lighting` (a mood and light FX) and `foreground` (an image key, as `#foreground` takes it), both on `LocationDef` in `model/school.ts`, are shown while the player is there, and scenes there start with them. `reset()` stops every FX and clears the foreground, so School puts the place back after each scene. The map and the constellation are clear and `flat`. Picked stars and activities use up the slot; events and `auto` stars don't.
- Events are checked when a day starts, `auto` stars whenever the player arrives at a slot. Event rolls come from the save's `calendar.seed`, so they're repeatable. `always` events (the opening) skip the roll and happen as soon as their conditions hold; after a reload only those are checked.
- **The week ends** after Thursday afternoon: a briefing lists the intel, then Friday's royale, then the next Saturday. Intel is cleared after each royale.
- The constellation view's layout (`model/constellation.ts`) comes from the data: a star sits after the stars its `when` needs.
- Boot runs `checkSchoolData` (`model/schoolValidate.ts`) and fails loudly on missing IDs or stories; `data/school/school.test.ts` runs the same check.

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
  - Run `npm test` and `npm run lint`. Add tests for plain modules (no Phaser at import time); `src/stories.test.ts` compiles every story and checks its tags, like Boot does.

## Known gaps
- `ReactOverlay` shows one scene's UI at a time, so UI can't stack (e.g. dialogue over a battle).
- Battle's rules live in the scene class, and enemy AI (`getNextStateIndex`) takes the scene as an argument.
- `Battle` and `GameOver` still create sounds with `this.sound.add` on every visit.
- Battle doesn't use `Stage` or lighting yet; it's meant to adopt the story screen (stage on top, message box below) later.
- Settings (`royale:settings`) live in `GameSession` (`session.settings`, changed with `updateSettings`). The only screen for them is School's settings tab.
- Friday's royale is a stub (`model/royaleStub.ts`): it makes up a placement, ELO, gold and history so the school loop can be played. The main menu's Continue and New game start the School scene.
