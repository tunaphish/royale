// Line conventions read by the Dialogue scene:
//   text                 -> a line in the message box
//   text #display        -> large text over the stage
//   text #voice <key|none> -> blip voice for this line (default: player in the box, the #enter character on stage)
// Text markup: <frenzy>shaking</frenzy>  <span class="red big">styled</span>  <b>  <i>
// Stage directions are tags:
//   #bg <background>   #enter <character> [emotion]
//   #foreground <key|none> [backlit]   #music <song>   #sfx <sound>
//   #fx <id> [ms|infinite] [at <character>]   #fx <id> stop   #fx stop   #light <mood> [fade ms]

INCLUDE game.ink

-> start

=== start ===
#bg supermarket
#enter rena-sprite
#light moonlight 0
// the souls they saved, drifting around them for the rest of the scene
#fx green-motes
We saved those <span class="red big">souls</span>... Without <b>reaping</b> them, and that changed <frenzy>everything about who we are</frenzy> forever.
#sfx bomb
#fx impact
What was the <frenzy>point?</frenzy> #display
Everyone's still dead #display
Did it change the world? #display
Or did it just feel good #display
Did it change anything? Huh Eji? #display
* [Fight On] -> fight
* [Give Up] -> giveup

=== fight ===
#music knight
#enter rena-sprite
#light ember 1500
#fx heal-burst at rena-sprite
It changed me.
#foreground layers/sakura backlit
> ... the wind is howling
So be it #display
-> END

=== giveup ===
// the souls fade out with his resolve
#fx green-motes stop
#light night 2000
Glad you could see reason #display
This is for the best #display
-> END
