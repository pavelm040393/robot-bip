// The rules: what the robot does with a recognised command.
//
// All of the pedagogy lives here, and so do the three rules that must never
// be broken. They are not about code — they decide whether the child laughs
// or cries:
//
//   1. The robot is always at fault. Never "you said it wrong", always
//      "I'm such a clumsy thing". A child hears "I don't understand you"
//      often enough already.
//   2. Losing is impossible. No score, no timer, no word for "wrong".
//      Only "not yet".
//   3. Hint the shape, never the answer. Not "say: take the red ball" but a
//      puzzled "there are three of them… and they're different colours".
//      Give the direction; let the child find the word. Otherwise they just
//      repeat after the robot and learn nothing.
//
// The core mechanism: "take the ball" with three balls present is not
// rejected — it is obeyed literally. The robot grabs all three and drops
// them. The mistake is funny rather than shaming, and the correction comes
// from the child unprompted.
//
// Every line the robot speaks lives in i18n.js, in both languages.
(function () {
  'use strict';

  var ui = {}, level = null, levelIndex = 0, done = false;

  function talk(group) {
    var text = Lang.say(group);
    Speech.say(text);
    if (ui.onSay) ui.onSay(text);
    return text;
  }

  function talkText(text) {
    Speech.say(text);
    if (ui.onSay) ui.onSay(text);
  }

  // ── hinting the shape ─────────────────────────────────────────────────
  // Look at how the matched things differ from each other and name that
  // dimension — kind, colour or size. Precisely the word that was missing
  // from the command, without ever giving away its value.
  function hintKey(list) {
    var colors = {}, sizes = {}, types = {};
    list.forEach(function (it) {
      colors[it.color] = 1; sizes[it.size] = 1; types[it.type] = 1;
    });
    if (Object.keys(types).length > 1) return 'manyHintType';
    if (Object.keys(colors).length > 1) return 'manyHintColor';
    if (Object.keys(sizes).length > 1) return 'manyHintSize';
    return 'manyHintType';
  }

  // ── movement helpers ──────────────────────────────────────────────────
  function goTo(x) { Scene.push({ kind: 'go', x: Math.max(80, Math.min(Scene.width - 80, x)) }); }

  function reach(it) {
    Scene.push({ kind: 'arm', to: 1 });
    Scene.push({ kind: 'grab', it: it });
    Scene.push({ kind: 'arm', to: 0 });
  }

  function faces(f) { Scene.push({ kind: 'face', face: f }); }

  // ── handling a command ────────────────────────────────────────────────
  function handle(phrase) {
    if (done) return;
    if (Scene.busy()) return;          // robot is busy; new commands can wait

    var cmd = Parser.parse(phrase);
    if (ui.onHeard) ui.onHeard(phrase, Parser.describe(cmd));

    // Nothing familiar at all. Blame the robot and the noise, never the child.
    if (!cmd.action && !cmd.target) {
      faces('confused');
      Scene.push({ kind: 'shrug', ms: 900 });
      talk('lost');
      return;
    }

    if (!cmd.action) { faces('confused'); talk('noAction'); return; }
    if (!cmd.target) { faces('confused'); talk('noTarget'); return; }

    var found = Scene.match(cmd.target);

    if (!found.length) {
      faces('confused');
      Scene.push({ kind: 'shrug', ms: 1200 });
      talk('none');
      return;
    }

    if (found.length > 1) return tooMany(found);

    return doIt(cmd, found[0]);
  }

  // More than one match — this is the scene the whole game exists for.
  function tooMany(found) {
    var hint = hintKey(found);

    faces('oops');
    // The robot honestly drives to each one and grabs it: you can see it
    // trying, which is what makes the failure funny instead of arbitrary.
    found.forEach(function (it) {
      goTo(it.x);
      reach(it);
    });
    goTo((found[0].x + found[found.length - 1].x) / 2);
    Scene.push({ kind: 'wait', ms: 250 });
    Scene.push({ kind: 'drop' });
    Scene.push({ kind: 'face', face: 'confused' });
    // The pause before the hint is a queue step, not a timer. Lines share one
    // synthesiser and a new line cancels the previous one: without this pause
    // "which one?" eats "oops, I dropped them", and the child never learns
    // what actually happened.
    Scene.push({ kind: 'wait', ms: 900 });

    talk('manyTake');
    Scene.then(function () { talk(hint); });
  }

  function doIt(cmd, it) {
    if (cmd.action === 'take') {
      faces('calm');
      goTo(it.x);
      reach(it);
      faces('happy');
      Scene.push({ kind: 'dance', ms: 1200 });
      talk('okTake');
      Scene.then(checkGoal);
      return;
    }

    if (cmd.action === 'put') {
      if (!cmd.dest) {
        faces('calm');
        goTo(it.x);
        reach(it);
        faces('confused');
        talk('noDest');
        return;
      }

      var boxes = Scene.match(cmd.dest);
      if (!boxes.length) {
        faces('confused');
        Scene.push({ kind: 'shrug', ms: 1000 });
        talk('none');
        return;
      }
      if (boxes.length > 1) return tooMany(boxes);

      faces('calm');
      goTo(it.x);
      reach(it);
      goTo(boxes[0].x);
      Scene.push({ kind: 'arm', to: 1 });
      Scene.push({ kind: 'into' });
      Scene.push({ kind: 'arm', to: 0 });
      faces('happy');
      Scene.push({ kind: 'dance', ms: 1200 });
      talk('okPut');
      Scene.then(checkGoal);
    }
  }

  // ── the level goal ────────────────────────────────────────────────────
  // Described in levels.js as "none of these may be left on the floor".
  // Checked after every successful action.
  function checkGoal() {
    if (!level.goal) return;
    var left = Scene.match(level.goal);
    if (left.length) return;

    done = true;
    faces('happy');
    Scene.push({ kind: 'dance', ms: 2200 });
    talk('win');
    if (ui.onWin) ui.onWin(levelIndex);
  }

  // ── levels ────────────────────────────────────────────────────────────
  function load(canvas, index) {
    levelIndex = Math.max(0, Math.min(LEVELS.length - 1, index));
    level = LEVELS[levelIndex];
    done = false;
    Scene.clear();
    Scene.setup(canvas, level);

    var texts = Lang.level(levelIndex);
    if (ui.onLevel) ui.onLevel(texts, levelIndex, LEVELS.length);
    if (texts.intro) setTimeout(function () { talkText(texts.intro); }, 500);
  }

  function next(canvas) {
    if (levelIndex + 1 < LEVELS.length) load(canvas, levelIndex + 1);
  }

  window.Game = {
    init: function (handlers) { ui = handlers || {}; },
    load: load,
    next: next,
    again: function (canvas) { load(canvas, levelIndex); },
    handle: handle,
    index: function () { return levelIndex; },
    total: function () { return LEVELS.length; }
  };
})();
