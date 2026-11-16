// Shared by every story: add `INCLUDE game.ink` at the top of a story file.
//
// These functions read and change the game's state. The game binds the real
// versions in code (src/scenes/dialogue/inkBindings.ts). The fallback
// versions below are only used when nothing is bound, e.g. when playing a
// story in Inky, so stories can still be previewed outside the game.
//
//   stat("perception")             -> number, 0 if never set
//   flag("knows_timeline")         -> true / false
//   ~ set_flag("knows_timeline", true)
//   relationship("ava")            -> number, 0 if never set
//   ~ add_relationship("ava", 1)

EXTERNAL stat(name)
EXTERNAL flag(name)
EXTERNAL set_flag(name, value)
EXTERNAL relationship(character)
EXTERNAL add_relationship(character, amount)

=== function stat(name) ===
~ return 0

=== function flag(name) ===
~ return false

=== function set_flag(name, value) ===
~ return

=== function relationship(character) ===
~ return 0

=== function add_relationship(character, amount) ===
~ return
