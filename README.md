# Bip — the robot that takes you literally

A game for children aged 4–7. There is a clumsy robot on the screen. The child
gives it spoken commands, and the robot does **exactly what it heard**.

```
— Take the ball!
  (there are three balls; Bip drives to each one, grabs them all, drops them)
— Oops. There are lots of them, and I dropped them all.
  But they are different colours. Which one?
— The red one!
  (picks up the red ball, dances)
```

The child is not drilled on vocabulary. They discover that "gimme that one"
does not work — and go looking for the word that was missing.

Available in **English and Russian**, switchable in the game.

## Why this exists

An adult always guesses. A child points and mumbles "that one", and their
mother hands over the right thing, because she loves them and knows the
context. There is no feedback at all. Another child cannot explain what they
failed to understand — they simply lose interest.

The robot never guesses. That is not cruelty; it is the only conversational
partner that honestly shows a child when their words were not enough.

There is a well-studied idea behind this — referential communication tasks:
describing an object so that someone who does not share your view can identify
it. Preschoolers solve them egocentrically ("the one like yesterday"), and the
shift from "I said it" to "I was understood" is a major milestone in language
development.

There is usually nobody to practise it against. Here there is.

## Running it

```bash
node server.js      # → http://localhost:8080
```

Node 18+, no dependencies, nothing to install.

The server exists **only for the microphone's sake**: browsers refuse
microphone access to pages opened straight from disk (`file://`). Everything
else is plain static files.

## Where to run it

The whole game runs in the browser and needs no backend, so it can be dropped
onto any static host.

| Where | How | Microphone |
|---|---|---|
| your own computer | `node server.js` | works (`localhost` is trusted) |
| a tablet, someone else's machine | Netlify Drop, GitHub Pages, Cloudflare Pages | works (HTTPS) |
| home network by IP | `http://192.168.x.x:8080` | **does not work** — HTTPS required |

The quickest way to hand a child a link is to drag the project folder onto
[netlify.com/drop](https://app.netlify.com/drop): you get a
`https://….netlify.app` address, free and without signing up.

## Check this first

**Whether the browser understands your child** — everything else depends on
the answer.

```
http://localhost:8080/tools/test-mic.html
```

Let the child say ten commands in their own words. The page shows what the
browser heard, which words were recognised, and what share of the phrases came
through. The language switch there changes the recogniser as well, so test in
the language the child actually speaks.

- **above 66%** — carry on building the game;
- **40–66%** — try a better microphone and a quiet room first, then widen the
  word lists to match how your child speaks;
- **below 40%** — the Web Speech API cannot handle this speech; the only way
  on is a local Whisper, which is a different scale of work.

Parsing is checked separately, without a child:

```bash
npm test
```

Run it after **any** dictionary edit. One added word breaks a neighbouring one
more often than you would think: the Russian stem "мал" swallows "малиновый",
and the English root "red" swallows "redo".

## How it is put together

No build step, no dependencies, no framework. Scripts are included with plain
tags in the right order; edit a file, reload the page.

| File | What it does |
|---|---|
| `assets/dict.js` | every word the robot can hear, in both languages |
| `assets/i18n.js` | interface text, robot lines and level texts |
| `assets/match.js` | matching with room for child pronunciation |
| `assets/parser.js` | sentence → command `{action, thing, destination}` |
| `assets/speech.js` | microphone and the robot's voice |
| `assets/scene.js` | canvas: things, the robot, movement |
| `assets/game.js` | **the rules** |
| `assets/levels.js` | level layouts |

Rules and movement are deliberately separated: the rules get rewritten after
every session with a real child, while the movements stay the same.

The reasoning, and the things deliberately left undone, are in
[DESIGN.md](DESIGN.md).

## Three rules that must not be broken

They are not about code. They decide whether the child laughs or cries.

1. **The robot is always at fault.** Never "you said it wrong", always "I'm
   such a clumsy thing". A child hears "I don't understand you" often enough
   already.
2. **Losing is impossible.** No score, no timer, no word for "wrong". Only
   "not yet".
3. **Hint the shape, never the answer.** Not "say: take the red ball" but a
   puzzled "there are three of them… and they're different colours". Give the
   direction; let the child find the word.

The third rule is enforced by tests: `tools/test-scene.js` checks, in both
languages, that no line blames the child and none gives the answer away.

## What you need, and what not to expect

**Chrome or Edge.** Speech recognition exists nowhere else. On iPad and iPhone
the game opens and works through the text box, but talking to the robot will
not: Safari has no recognition, and Chrome on iOS is Safari underneath.

**An internet connection.** The Web Speech API does not recognise speech on the
device — it sends audio to Google's servers and gets text back. In a car with
no signal the game stays silent. For the same reason a child's voice leaves the
device: acceptable at home, but a public deployment should either say so
plainly or move to a local Whisper.

**A robot drawn from circles and rectangles.** Not a placeholder — an order of
work. Until it is proven that the robot understands children, spending time on
an artist is wasted. A beautiful robot nobody can talk to ends up in a drawer
all the same.

## What comes next

- levels with sequences ("first… then…") and conditions — that is algorithmic
  thinking, programming without a line of code;
- role reversal: the robot gives the orders and the child runs around the flat
  carrying things out;
- a two-player mode — one describes, the other collects;
- a report for the parent: not app usage, but growth in how the child speaks.

## Licence

[MIT](LICENSE).
