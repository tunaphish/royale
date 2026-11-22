// A witch's campfire deep in the forest.
// Uses: a night mood with the moon behind the witch and a campfire as FX,
// #ambience with volume changes, #fx at a stage point and at a character,
// stopping one FX by name, and the witch's flag/relationship state.

INCLUDE game.ink

-> path

=== path ===
#bg forest
#light pitch-dark 0
// the fire is still far off: quiet crackling through the trees
#ambience fire 0.15
{ flag("met_witch"):
    That smoke again. She's still out here.
- else:
    Smoke, somewhere ahead. Nobody camps this deep in the woods.
}
Branches snap under your feet. The crackling gets louder.
#ambience fire 0.6
-> camp

=== camp ===
#enter witch
#light night 2000
#fx moon-behind
#fx campfire at 0.5 0.97
{ flag("met_witch"):
    Back again? You must like the cold. #display
- else:
    You're late. #display
}
* [Late for what?] -> late
* [Who are you?] -> who
* [Back away slowly] -> leave

=== late ===
~ add_relationship("witch", 1)
For the <span class="red">fire</span>, of course. It only burns like this once a year. #display
-> flare

=== who ===
Someone who knows better than to ask that in these woods. #display
-> flare

=== flare ===
She flicks her fingers at the flames.
#sfx magic
#fx heal-burst at bottom
The fire <frenzy>roars</frenzy> up, then settles.
Look. They come for the warmth. #display
// spirits drift in around the fire
#fx green-motes
Little lights rise out of the grass, circling the camp.
* [Are those... souls?] -> souls
* [What happened to your arms?] -> arms

=== souls ===
What's left of them. They don't remember their names, but they remember fire. #display
-> farewell

=== arms ===
~ add_relationship("witch", 1)
She glances at the bandages, then away.
#fx heal-burst at witch
A price. Nothing is <i>free</i> out here, not even warmth. #display
-> farewell

=== farewell ===
~ set_flag("met_witch", true)
// the spirits go, but the fire stays
#fx green-motes stop
The lights scatter into the dark. The fire keeps burning.
{ relationship("witch") >= 2:
    You can stay until dawn. I won't bite. #display
- else:
    Go on, then. Before the woods notice you. #display
}
-> douse

=== leave ===
You step back into the trees. She doesn't follow.
Smart. #display
-> douse

=== douse ===
// the fire and the moon go out, and the woods go dark
#fx stop
#light pitch-dark 2500
#ambience stop
The fire dies down to embers, then to nothing.
-> END
