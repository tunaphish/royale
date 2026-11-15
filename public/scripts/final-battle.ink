// Line conventions read by the Dialogue scene:
//   speaker: text        -> spoken line (speaker must be in characters.ts)
//   text                 -> narration in the message box (no speaker)
//   text #display        -> large text over the stage
// Stage directions are tags:
//   #bg <background>   #enter <character> [emotion]
//   #foreground <key|none>   #play <song>

-> start

=== start ===
#bg supermarket
#enter eji
eji: We saved those souls... Without reaping them
What was the point? #display
Everyone's still dead #display
Did it change the world? #display
Or did it just feel good #display
Did it change anything? Huh Eji? #display
* [Fight On] -> fight
* [Give Up] -> giveup

=== fight ===
#play knight
#enter eji angry
eji: It changed me.
> ... the wind is howling
So be it #display
-> END

=== giveup ===
Glad you could see reason #display
This is for the best #display
-> END
