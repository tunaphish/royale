// Line conventions read by the Dialogue scene:
//   text                 -> a line in the message box
//   text #display        -> large text over the stage
// Stage directions are tags:
//   #bg <background>   #enter <character> [emotion]
//   #foreground <key|none>   #music <song>   #sfx <sound>

INCLUDE game.ink

-> start

=== start ===
#bg supermarket
#enter eji
We saved those souls... Without reaping them
#sfx bomb
What was the point? #display
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
