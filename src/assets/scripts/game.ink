
// Shared by every story: add `INCLUDE game.ink` at the top of a story file.
//
// These functions read and change the game's state. The game binds the real
// versions in code (src/scenes/story/inkBindings.ts). The fallback
// versions below are only used when nothing is bound, e.g. when playing a
// story in Inky, so stories can still be previewed outside the game.
//
//   stat("perception")             -> number, 0 if never set
//   flag("knows_timeline")         -> true / false
//   ~ set_flag("knows_timeline", true)
//   disposition("rena")            -> number from -10 (hostile) to 10 (close), 0 if never set
//   ~ add_disposition("rena", 1)
//   mood("rena", "embarrassed")    -> true / false
//   ~ set_mood("rena", "embarrassed", 4)   for 4 slots; 0 removes it
//   has_star("rena-first-meeting") -> true / false
//   history("rena", "humiliated")  -> true / false
//
// relationship() and add_relationship() are the old names for disposition()
// and add_disposition(), kept so older stories still work.

EXTERNAL stat(name)
EXTERNAL flag(name)
EXTERNAL set_flag(name, value)
EXTERNAL disposition(student)
EXTERNAL add_disposition(student, amount)
EXTERNAL relationship(student)
EXTERNAL add_relationship(student, amount)
EXTERNAL mood(student, name)
EXTERNAL set_mood(student, name, slots)
EXTERNAL has_star(star)
EXTERNAL history(student, event)

=== function stat(name) ===
~ return 0

=== function flag(name) ===
~ return false

=== function set_flag(name, value) ===
~ return

=== function disposition(student) ===
~ return 0

=== function add_disposition(student, amount) ===
~ return

=== function relationship(student) ===
~ return 0

=== function add_relationship(student, amount) ===
~ return

=== function mood(student, name) ===
~ return false

=== function set_mood(student, name, slots) ===
~ return

=== function has_star(star) ===
~ return false

=== function history(student, event) ===
~ return false
