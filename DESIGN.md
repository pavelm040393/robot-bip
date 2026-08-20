# Design notes

Why the game is built the way it is, and which decisions were deliberate.
Worth reading before changing anything: half of the oddities here are not
unfinished work.

## What is actually being trained

Not vocabulary, and not pronunciation. **Pragmatics** — being able to say
something so that a person who cannot read your mind understands it.

That is a separate skill, and it does not simply appear because a child talks
a lot. Psycholinguistics has a whole class of tasks for it — referential
communication: describe an object to someone who cannot see what you see.
A preschooler describes egocentrically — "the one like yesterday", "like
mum's skirt" — and genuinely does not see why they were not understood.

The niche is empty for a reason: software for children deals either with
articulation (speech-therapy apps: how to pronounce a sound) or with block
programming. Almost nobody trains the ability to be understood.

## The core mechanism

An incomplete command is **not rejected — it is obeyed literally**.

This is the spine of the game, and stepping away from it breaks everything
else. "Take the ball" with three balls present is not an input error but a
faithfully executed command: the robot takes all three and drops them. The
correction comes from the child unprompted, without a word of moralising.

That is exactly why the robot **never says "I don't understand"**. A refusal
is a dead end and an insult. The robot always does something.

## The three rules

### 1. The robot is always at fault

"Oops, I'm such a clumsy thing", never "you were not precise enough". A
four-year-old already hears ten times a day that they were not understood. A
game that does the same is just one more dissatisfied adult.

### 2. Losing is impossible

No score, no timer, no error sound, no word for "wrong". Only "not yet". The
stakes are high here: speech is the most vulnerable thing a preschooler owns,
and one humiliation is enough to make them go quiet altogether.

### 3. Hint the shape, never the answer

The robot names the **dimension** that was missing, but not the value:

> — there are three of them… and they're different colours. Which one?

Not "say: red". Otherwise the child repeats after the robot and learns
nothing — that is the difference between a hint and copying.

Technically: `hintKey()` in `game.js` looks at how the matched things differ
and names the first difference — kind, colour or size.

## How the levels grow

A level is not a "difficulty step" but **one new word** the child cannot do
without. The scene is always arranged so that the short command is bound to go
wrong.

| | What is learned | Why nothing else works |
|---|---|---|
| 1 | colour | three balls, differing only in colour |
| 2 | size | both balls are blue, so colour is no help |
| 3 | naming the thing | both are yellow and the same size |
| 4 | two properties at once | "red" gives two, "big" gives two |
| 5 | the preposition "in" | a destination appears; naming the thing is not enough |
| 6 | naming the destination | there are two boxes |

Beyond that (not built yet) come sequences — "first… then…" — and conditions:
"if the box is full, put it on the table". That last step is already
algorithmic thinking, programming without a line of code. The game quietly
moves from speech into logic, which is what gives it a four-year lifespan
instead of the usual six months.

## Why voice rather than buttons

Button and block versions exist — Bee-Bot, ScratchJr, Lightbot. There the
child assembles a command out of ready-made pieces, and that is about
programming syntax.

Here it is **live speech** being trained, the same speech the child uses with
their mother. And it works before they can read.

## Two languages, one switch

The language decides far more than button labels: which words can be
recognised, which language the recogniser listens in, and which voice reads
the lines. All of it hangs off one switch in `i18n.js`, because a partial
switch is worse than none — a robot that hears English and answers in Russian
is simply broken.

Fuzzy matching behaves differently in the two languages, and that is not an
oversight. Russian words are long, so a misheard "кащный" is still two edits
from "красный" and can be recovered. English words are short: "ball" is one
edit from "wall", "call" and "tall", so English leans on exact matching and
gets less tolerance for mangled pronunciation. Worth knowing before blaming
the dictionary.

## The main risk

**Recognising child speech.** Everything rests on it.

For a recogniser, a four-year-old is the worst case: a high voice, smeared
articulation, swallowed endings — and the models are trained mostly on adults.

What is done to make it survivable:

- **a closed dictionary** instead of open recognition. The system knows in
  advance every word that could possibly be said, and matches only against
  those;
- **tolerance for mangling** — "кащный" has to land on "красный"
  (`assets/match.js`);
- **recognition failures are never shown to the child.** If nothing was heard,
  the robot distracts itself: "oops, I got distracted, say it again?" The
  fault stays with the robot.

This is checked on a real child in one evening — `tools/test-mic.html` — before
investing in anything else.

## Deliberately not done

- **No grading the child's speech.** No "you got 8 out of 10 commands right" —
  not to the child. A parent may and should see progress; the child must not.
- **No hints in the robot's words.** See rule 3.
- **No visual polish yet.** The robot is circles and rectangles until the main
  hypothesis is confirmed.
- **No open-ended language parsing.** A dictionary and keywords are more
  reliable on this kind of speech than any NLP, and they can be debugged by
  eye.

## Where it could go

**Role reversal.** The robot gives orders and the child carries them out:
"bring me something soft". The child leaves the screen and runs around the
flat — and having been the executor, understands much faster why precision
matters.

**Two players.** One sees a picture and describes it, the other assembles it
from the description — the referential task in its pure form, with the robot
as referee. It also solves the eternal problem of two children and one screen.

**A report for the parent.** Not app activity but growth: "a month ago it was
'gimme that', now it is 'give me the big blue cube'". That is the only metric
here that means anything.
