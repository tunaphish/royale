# royale

A narrative card game, played mostly on phones. Phaser 3 runs scenes, loading
and audio; React draws the UI through a global plugin; MobX holds state.
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

## Layout

- `src/scenes/<name>/` — one folder per scene: the scene class, its MobX store, its views, a CSS module
- `src/plugins/` — global Phaser plugins: `ReactOverlay` (`this.reactOverlay`), `GameSession` (`this.session`)
- `src/state/` — `GameState` (the live game) and `saves.ts` (save files, slots, settings)
- `src/data/` — content definitions (cards, enemies, techniques, new-game state), keyed by ID
- `src/model/` — cross cutting concerns, core business
- `src/assets/` — every asset, found by `src/assets/manifest.ts` with `import.meta.glob`: `audio/sfx`, `audio/music`, `images/<category>`, `fonts`, `scripts/stories/*.ink` (one per story) and `scripts/game.ink` (shared includes)
- `public/` — only files that need a fixed URL (`favicon.ico`)

## Conventions

### Scenes

- Each scene follows scene + store + view:
  - **Scene:** owns the logic and the methods the view calls (`battle.endTurn()`, `dialogue.advance()`).
  - **Store:** a `makeAutoObservable` MobX store with small setters.
  - **View:** `observer` components that take the scene as a prop.
- Put logic that doesn't need Phaser in plain modules under `src/model/` so it can be tested on its own.
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

- **Adding a story:** put it in `src/assets/scripts/stories/<key>.ink`. Boot compiles every story once and fails loudly on compile errors.
- Every story starts with `INCLUDE game.ink`.
- **Lines:**
  - Plain text goes in the message box.
  - A line ending in `#display` is large text over the stage.
  - Lines and `#display` text type out one letter at a time (`LETTER_MS` in `Dialogue.tsx`). A tap finishes the line; the next tap continues.
  - **Voices:** typing plays blips. Message box lines use the `player` voice; `#display` lines use the voice of the character on stage (the last `#enter`). `#voice <key>` picks another for that line, `#voice none` makes it silent. Voices live in `data/voices.ts`; characters without one use `DEFAULT_VOICE`.
  - `#display` and `#voice` change the line they're on (or the next line, from a tag-only line), so `collectCommands` reads them into the `line`/`display` command instead of making commands of their own.
- **Text markup:** lines and choices can use HTML-like tags: `<frenzy>Huh?</frenzy>`, `<span class="red big">me</span>`, `<b>`, `<i>`.
  - Parsed by `model/markup.ts`, rendered by `scenes/ui/RichText.tsx`. Unknown tags or classes warn; the text still shows.
  - One-off styles: add a class to `scenes/ui/textStyles.module.css`.
  - New effects: write a component in `scenes/ui/effects/` and add it to `TAGS` in `RichText.tsx`. A plain effect wraps its children; `perLetter: true` gets each letter instead (like `Frenzy`), and should use `groupWords` so words don't break across lines.
  - Never write an empty tag like `<i></i>`: `<>` is glue in ink. `#` and `//` can't appear inside tags either.
- **Tags are for stage directions (visuals and sound):** `#bg <key>`, `#enter <character> [emotion]`, `#foreground <key|none>`, `#music <song>` (loops, replaces the current song), `#sfx <sound>` (plays once). To add one in `Dialogue.tsx`: add a `Command` kind, parse it in `parseTag` (which warns on wrong arguments), and run it in `runCommand`.
- **External functions are for game state:** `stat`, `flag`, `set_flag`, `relationship`, `add_relationship`.
  - Declare them in `game.ink`, with a fallback so stories still run in Inky, and bind them in `dialogue/inkBindings.ts`.
  - Functions that only read are lookahead-safe; functions that change state are not.
- Values only one story needs stay in ink variables. Values the rest of the game needs live in `GameState`.

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
