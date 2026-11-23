# Writing stories

How to write a story for the game in [ink](https://github.com/inkle/ink/blob/master/Documentation/WritingWithInk.md).
This page covers what the game adds on top of plain ink: how lines show up,
stage directions, text effects and game state.

## Setting up a story

- One story per file: `src/assets/scripts/stories/<key>.ink`. The file name is the story's key.
- Start every story with `INCLUDE game.ink`.
- Nothing else to register. The game finds the file and compiles it when it starts;
  a compile error stops the game with the error message.
- Every story plays from the top. The player's place in a story isn't saved,
  only game state (stats, flags, dispositions, see below).

**Testing:** run `npm run dev` and open
`http://localhost:5173/royale/?scene=Dialogue&storyKey=<key>` to jump straight into a story.

- **Tag mistakes show up when the game starts.** Every tag in every story is
  checked when `npm run dev` loads the game: unknown tags, misspelled moods or
  effects, missing images or sounds, wrong arguments. If anything is wrong, the
  loading screen lists each problem with its file and line (`forest.ink:28`),
  and you tap "continue anyway" to play. A tag with a problem does nothing.
- **Testing doesn't touch your real save.** Runs started with `?scene=` use their
  own save slot, so flags and dispositions carry over from one test to the next.
  Add `&newgame` to start the test fresh.

## Lines

| You write | It shows as |
| --- | --- |
| `Plain text` | A line in the message box at the bottom. The player is speaking. |
| `Text #display` | Large text over the stage. The character on stage is speaking. |
| `* [Choice]` | A choice button, as in normal ink. |

- Lines type out one letter at a time, pausing briefly after `.` `,` `!` `?`.
  The first tap finishes the line, the next tap continues.
- The message box and `#display` text both stay on screen, so the two can show
  different information at the same time.
- `#display` on a line by itself applies to the next line of text.

### Voices

Typing plays little blips, like speech.

- Message box lines use the player's voice.
- `#display` lines use the voice of the character on stage (the last `#enter`).
- `#voice <key>` gives one line a different voice; `#voice none` makes it silent.
- Voices are defined in `src/data/voices.ts`. A character without one gets the default voice.

```ink
Who's there?
It's only me. #display
... #voice none
```

## Text effects

Lines and choices can use HTML-like tags:

| Markup | Effect |
| --- | --- |
| `<b>bold</b>`, `<i>italic</i>` | Bold, italic |
| `<span class="red">text</span>` | A style. Several at once: `class="red big"` |
| `<frenzy>text</frenzy>` | Each letter shakes |

Styles available now: `red`, `big`. New styles and effects are added in code
(`src/scenes/ui/textStyles.module.css` and `src/scenes/ui/RichText.tsx`).

Things ink won't allow inside text:

- **No empty tags** like `<i></i>`: ink reads `<>` as glue.
- **No `#` or `//` inside a tag**: ink reads them as a tag and a comment.

## Stage directions

Tags set the scene. They take effect as soon as the story reaches them and stay
until something changes them, across lines and choices.

Two words remove things, always the same way:

- **Pictures go away with `none`:** `#bg none`, `#enter none`, `#foreground none`.
- **Sounds and effects end with `stop`:** `#music stop`, `#ambience stop`, `#fx stop`.

### Picture

| Tag | What it does |
| --- | --- |
| `#bg <key>` | Background, from `images/backgrounds/`: `#bg supermarket` |
| `#bg none` | Removes the background. |
| `#enter <character> [emotion]` | Puts a character on stage, from `images/characters/`. `#enter thief angry` shows `thief-angry.png`. |
| `#enter none` | The character leaves the stage. |
| `#foreground <key> [backlit]` | An image over everything, e.g. leaves: `#foreground layers/sakura`. `backlit` lights it from behind. It can also be a web address, written with escaped slashes: `#foreground https:\/\/example.com/leaves.png`. |
| `#foreground none` | Removes the foreground. |

### Sound

| Tag | What it does |
| --- | --- |
| `#music <song>` | Loops a song from `audio/music/`, replacing the current one. |
| `#music stop` | Stops the music. |
| `#sfx <sound>` | Plays a sound from `audio/sfx/` once. |
| `#ambience <sound> [volume]` | Loops a background sound (fire, wind, rain) alongside the music, fading in. Volume is 0 to 1, default 1. Several can play at once; the same sound again changes its volume. |
| `#ambience <sound> stop` | Fades that sound out. |
| `#ambience stop` | Fades out every ambience sound. |

Music and ambience stop when the story ends.

### Lighting

Lighting has two parts:

- **The mood** (`#light`) is the darkness: how dark and what color everything is
  where no light reaches. It has no lights of its own.
- **Lights are effects** (`#fx`): the moon, a fire, a lamp, a spell. Start, stop
  and place them like any other effect.

A typical scene uses one mood and a light or two:

```ink
#light night 2000
#fx moon-behind
#fx campfire at bottom
```

`#light <mood> [fade ms]` changes the darkness, fading over 500 ms unless you
give a time. Stories start with `flat`, which shows the art exactly as drawn.

<!-- generated: moods -->
| Mood | Use it for |
| --- | --- |
| `flat` | No lighting: art exactly as drawn. Every story starts here. |
| `forest-day` | Daytime under trees: green shade, brightened by sunlight FX like `dappled-light`. |
| `dim` | A dim room, an overcast day: everything readable, nothing bright. |
| `rainy` | Rain or a storm by day: grey-blue and gloomy. Pairs with `rain`. |
| `snowy` | Snow by day: cold, pale blue-grey. Pairs with `snow`. |
| `firelit` | Indoors at night, lit by fire or candles: warm, deep shadows. |
| `night` | Outdoors at night: cool blue. Add the moon, a campfire, street lights. |
| `pitch-dark` | Almost black: for scenes lit only by effects (a lamp, a spell, a single fire). |
| `city-night` | A purple city night under signs and screens. |
<!-- end generated -->

Moods are defined in `src/data/lighting.ts`. This table is written from the comments there by `npm run docs`; edit those, not the table.

### Effects

| Tag | What it does |
| --- | --- |
| `#fx <id>` | Plays an effect for its usual length (lights last until stopped). |
| `#fx <id> <ms>` / `#fx <id> infinite` | Plays it for that long, or until stopped. |
| `#fx <id> at <character> [part]` | Plays it on the character on stage, following them: on their `chest` (the default), `face` or `feet`. `#fx heal-burst at rena face` |
| `#fx <id> at <spot>` | Plays it at a named spot on the stage: `center`, `top`, `bottom`, `left`, `right`, `top-left`, `top-right`, `bottom-left`, `bottom-right`. |
| `#fx <id> at <x> <y>` | Plays it at an exact spot, as fractions of the stage: `at 0.5 0.95` is bottom middle. |
| `#fx <id> stop` | Stops it; particles already in the air finish and lights fade out. |
| `#fx stop` | Stops every effect, lights included. To keep the moon up, stop effects by name instead. |

Options combine: `#fx heal-burst 800 at thief`.

**Lights.** Each is placed to look right played without `at`.

<!-- generated: lights -->
| Effect | What it is |
| --- | --- |
| `soft-light` | A soft, warm key light on the character's face. |
| `warm-light` | A strong warm light on the character's face, like a fire just off stage. |
| `candlelight` | A small flickering candle close to the character's face. |
| `moonlight` | Moonlight from the front, with a deeper blue from the upper right. |
| `moon-behind` | The moon behind the character: lights the background and outlines them in blue. |
| `neon-signs` | Pink and cyan signs, one in front, one to the upper right. |
| `hanging-lamp` | A lamp swinging overhead. |
| `street-lights` | Passenger seat at night: street lights passing overhead, again and again. |
| `dashboard-glow` | A cool glow from below the stage, like a car's dashboard. |
<!-- end generated -->

**Other effects.**

<!-- generated: effects -->
| Effect | What it is |
| --- | --- |
| `green-motes` | Green and gold sparkles drifting up over the whole stage, until stopped. |
| `heal-burst` | A quick upward burst of light, e.g. healing. |
| `impact` | Screen hit: a short shake and white flash. |
| `campfire` | A campfire with its own glow, flames, embers drifting up past the character, and smoke behind them. Play it `at bottom`. |
| `falling-leaves` | Leaves drifting down and tumbling over the whole stage, some far behind the character, a few close in front. Runs until stopped. |
| `dappled-light` | Sunlight through a leaf canopy: patches of sun over everything on stage, swaying a little in the wind, and a soft warm light from the upper left. Use with `#light forest-day`. |
| `god-rays` | God rays: slanted shafts of sunlight from the upper left, slowly fading in and out across the stage in front of the character, with dust drifting through them and a soft warm light. Looks best in a dim mood, like `forest-day`. |
| `god-rays-behind` | God rays from behind: the same shafts of sunlight as `god-rays`, but between the background and the character, with the sun behind them lighting their edges. Dust still drifts in front. Looks best in a dim mood, like `forest-day`. |
| `rain` | Steady rain over the whole stage: fine drops far behind the character, bigger faster ones in front, and splashes along the ground. Play it `at bottom` so the splashes land on the ground. Pairs with `#light rainy`. |
| `snow` | Gentle snowfall over the whole stage: small flakes drifting down behind the character, a few big soft ones close in front. Runs until stopped. Pairs with `#light snowy`, or `#light night` and `#fx moonlight` for a snowy night. |
<!-- end generated -->

Effects are defined in `src/data/fx.ts` and tuned in the FX lab (`?scene=FxLab`). These tables are written from the comments there by `npm run docs`; edit those, not the tables.

## Game state

`game.ink` gives every story functions that read and change the game, so
choices can matter beyond one story:

| Function | Returns / does |
| --- | --- |
| `stat("perception")` | A number, 0 if never set |
| `flag("knows_timeline")` | true or false |
| `~ set_flag("knows_timeline", true)` | Sets a flag |
| `disposition("rena")` | How a student feels about the player: -10 (hostile) to 10 (close), 0 if never set |
| `~ add_disposition("rena", 1)` | Changes a disposition (kept within -10 to 10) |
| `mood("rena", "embarrassed")` | true while the student has that mood |
| `~ set_mood("rena", "embarrassed", 4)` | Gives a mood for 4 slots (2 slots a day); `0` removes it |
| `has_star("rena-first-meeting")` | true once that constellation star is lit |
| `history("rena", "humiliated")` | true if that happened between you and the student in a royale |

```ink
{ flag("knows_timeline"):
    You already know how this ends.
- else:
    ~ set_flag("knows_timeline", true)
    So that's how it ends.
}
```

- Values only one story needs can be plain ink variables (`VAR`); they reset each time the story plays.
- Values the rest of the game needs go through these functions; they're saved.
- In Inky, these functions return 0 or false and change nothing, so stories still preview there.
- Dispositions fall into bands: -10 to -6 hostile, -5 to -2 cold, -1 to 1 neutral, 2 to 5 warm, 6 to 10 close.
  Check a band with a comparison: `{ disposition("rena") >= 2: ... }` is warm or better.
- `relationship()` and `add_relationship()` are the old names for `disposition()` and `add_disposition()`. They still work.

## School scenes

Constellation stars and school events are stories too. Each one in
`src/data/school/stars.ts` or `events.ts` names its story (`scene: 'rena-first-words'`),
and the game plays it when the player picks the star or the event happens.

- When the story ends, the player goes back to the school, and the star lights
  or the event's effects apply (disposition, gold, lost time…). Those live in the data,
  so a scene doesn't have to change anything itself, but it can with the functions above.
- `has_star(...)` is true from the next scene on: a star lights after its own scene ends.
- A school scene starts in the lighting of the place it plays at (the classroom's sunbeams,
  the library's candle…), so it doesn't need its own `#light` and `#fx`. It can still change
  them; `#fx stop` turns the place's lights off too. The place is lit again when the scene ends.
- To test one: `?scene=Dialogue&storyKey=rena-first-words`, or play it from the school with `?scene=School`.

## Example

```ink
INCLUDE game.ink

-> camp

=== camp ===
#bg forest
#enter rena
#light night 1500
#fx moon-behind
#fx campfire at bottom
#ambience fire 0.6
The fire crackles.
You're still awake? #display
* [I can't sleep] -> talk
* [Just keeping watch] -> watch

=== talk ===
~ add_disposition("rena", 1)
Me neither. #display
-> END

=== watch ===
// the fire and the moon go out
#fx stop
#light pitch-dark 2000
Suit yourself. #display
-> END
```
