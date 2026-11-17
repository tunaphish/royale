// Line conventions read by the Dialogue scene:
//   text                 -> a line in the message box
//   text #display        -> large text over the stage
//   text #voice <key|none> -> blip voice for this line (default: player in the box, the #enter character on stage)
// Text markup: <frenzy>shaking</frenzy>  <span class="red big">styled</span>  <b>  <i>
// Stage directions are tags:
//   #bg <background>   #enter <character> [emotion]
//   #foreground <key|none>   #music <song>   #sfx <sound>

INCLUDE game.ink

-> start

=== start ===
#bg supermarket
#enter eji
We saved those <span class="red big">souls</span>... Without <b>reaping</b> them, and that changed <frenzy>everything about who we are</frenzy> forever.
#sfx bomb
What was the <frenzy>point?</frenzy> #display
Everyone's still dead #display
Did it change the world? #display
Or did it just feel good #display
Did it change anything? Huh Eji? #display
* [Fight On] -> fight
* [Give Up] -> giveup

=== fight ===
#music knight
#enter eji angry
It changed me.
> ... the wind is howling
So be it #display
-> END

=== giveup ===
Glad you could see reason #display
This is for the best #display
-> END
