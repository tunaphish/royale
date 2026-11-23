// How to write stories (lines, tags, effects, game state): src/assets/scripts/AUTHORING.md

INCLUDE game.ink

-> start

=== start ===
#bg supermarket
#enter rena
#light night 0
#fx moonlight
// the souls they saved, drifting around them for the rest of the scene
#fx green-motes
We saved those <span class="red big">souls</span>... Without <b>reaping</b> them, and that changed <frenzy>everything about who we are</frenzy> forever.
#sfx bomb
#fx impact
What was the <frenzy>point?</frenzy> #display
Everyone's still dead #display
Did it change the world? #display
Or did it just feel good #display
Did it change anything? Huh, Thief? #display
* [Fight On] -> fight
* [Give Up] -> giveup

=== fight ===
#music knight
#enter rena
#light firelit 1500
#fx moonlight stop
#fx warm-light
#fx heal-burst at rena
It changed me.
#foreground layers/sakura backlit
> ... the wind is howling
So be it #display
-> END

=== giveup ===
// the souls fade out with his resolve
#fx green-motes stop
#fx moonlight stop
#light pitch-dark 2000
Glad you could see reason #display
This is for the best #display
-> END
