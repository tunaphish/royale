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
  only game state (stats, flags, relationships, see below).

**Testing:** run `npm run dev` and open
`http://localhost:5173/royale/?scene=Dialogue&storyKey=<key>` to jump straight into a story.

- **Tag mistakes show up when the game starts.** Every tag in every story is
  checked when `npm run dev` loads the game: unknown tags, misspelled moods or
  effects, missing images or sounds, wrong arguments. If anything is wrong, the
  loading screen lists each problem with its file and line (`forest.ink:28`),
  and you tap "continue anyway" to play. A tag with a problem does nothing.
- **Testing doesn't touch your real save.** Runs started with `?scene=` use their
  own save slot, so flags and relationships carry over from one test to the next.
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
| `#enter <character> [emotion]` | Puts a character on stage, from `images/characters/`. `#enter eji angry` shows `eji-angry.png`. |
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

| Mood | Use it for |
| --- | --- |
| `flat` | No lighting, art as drawn |
| `dim` | A dim room, an overcast day |
| `firelit` | Indoors at night, lit by fire or candles |
| `night` | Outdoors at night, cool blue |
| `pitch-dark` | Almost black: only effects light the scene |
| `city-night` | A purple city night under signs |

Moods are defined in `src/data/lighting.ts`.

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

Options combine: `#fx heal-burst 800 at eji`.

**Lights.** Each is placed to look right played without `at`.

| Effect | What it is |
| --- | --- |
| `soft-light` | A soft warm light on the character's face |
| `warm-light` | A strong warm light on the face, like a fire just off stage |
| `candlelight` | A small flickering candle near the face |
| `moonlight` | Moonlight from the front, deeper blue from the upper right |
| `moon-behind` | The moon behind the character: lights the background, outlines the character in blue |
| `neon-signs` | Pink and cyan signs |
| `hanging-lamp` | A lamp swinging overhead |
| `street-lights` | Street lights passing overhead, like the passenger seat of a car |
| `dashboard-glow` | A cool glow from below, like a car's dashboard |

**Other effects.**

| Effect | What it is |
| --- | --- |
| `campfire` | A fire with its own glow, flames, embers and smoke. Play it at the bottom: `at bottom`. |
| `green-motes` | Green and gold sparkles drifting up, forever |
| `heal-burst` | A quick upward burst of light |
| `impact` | A screen shake and white flash |

Effects are defined in `src/data/fx.ts` and tuned in the FX lab (`?scene=FxLab`).

## Game state

`game.ink` gives every story functions that read and change the game, so
choices can matter beyond one story:

| Function | Returns / does |
| --- | --- |
| `stat("perception")` | A number, 0 if never set |
| `flag("knows_timeline")` | true or false |
| `~ set_flag("knows_timeline", true)` | Sets a flag |
| `relationship("ava")` | A number, 0 if never set |
| `~ add_relationship("ava", 1)` | Changes a relationship |

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
~ add_relationship("rena", 1)
Me neither. #display
-> END

=== watch ===
// the fire and the moon go out
#fx stop
#light pitch-dark 2000
Suit yourself. #display
-> END
```
