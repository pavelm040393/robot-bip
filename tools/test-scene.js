// Whole-game scenarios — no browser required.
//
//   node tools/test-scene.js
//
// This checks the thing the game exists for: that an incomplete command leads
// to a funny failure and a complete one leads to success. Sentence parsing is
// checked separately (test-parser.js); here it is the robot's behaviour that
// matters.
//
// Every scenario runs in BOTH languages. A line group that quietly loses a
// variant in one language, or a rule that only holds in Russian, is exactly
// the kind of thing nobody notices by hand.
//
// The canvas and requestAnimationFrame are stubbed and frames are advanced by
// hand. That makes the run instant and independent of whether a tab is
// focused: in the background Chrome freezes animation, and "check it in the
// browser" silently turns into staring at a frozen picture.
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');

// ── browser stubs ───────────────────────────────────────────────────────
const frames = [];
const said = [];

// Every canvas call the drawing code makes has to exist here, or the scene
// throws on the first frame and every scenario below fails at once. Adding a
// new brush stroke in scene.js means adding its method to this list.
const gradient = () => ({ addColorStop() {} });
const ctx = {
  createLinearGradient: gradient, createRadialGradient: gradient,
  clearRect() {}, fillRect() {}, beginPath() {}, closePath() {}, clip() {},
  moveTo() {}, lineTo() {}, arc() {}, arcTo() {}, ellipse() {}, quadraticCurveTo() {},
  fill() {}, stroke() {}, save() {}, restore() {}, translate() {}, rotate() {}, scale() {}
};

const sandbox = {
  console,
  window: {},
  navigator: { language: 'en' },
  requestAnimationFrame: (fn) => { frames.push(fn); return frames.length; },
  // Deferred work runs immediately: the level greeting sits on a timer and
  // there is nothing to wait for in a test.
  setTimeout: (fn) => { if (typeof fn === 'function') fn(); return 0; },
  Math, JSON, Object, Array, String, Number, Date
};
vm.createContext(sandbox);

['dict.js', 'i18n.js', 'match.js', 'parser.js', 'scene.js', 'levels.js', 'game.js'].forEach((f) => {
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'assets', f), 'utf8'), sandbox);
  Object.assign(sandbox, sandbox.window);
});

// The robot's voice: instead of sound, a list of lines — that is what the
// checks read.
sandbox.Speech = { say: (t) => said.push(t), supported: () => false, relang: () => {} };

const { Scene, Game, Lang } = sandbox;
const canvas = { getContext: () => ctx, width: 0, height: 0 };

// Play the queue to the end (or give up on a step that never finishes).
function run(limit = 4000) {
  let n = 0;
  while (frames.length && n++ < limit) frames.shift()();
  if (n >= limit) throw new Error('the queue never emptied — some step runs forever');
}

// Advance a few frames only, leaving the robot halfway.
function runSome(n) {
  while (frames.length && n-- > 0) frames.shift()();
}

function reset(levelIndex) {
  frames.length = 0;
  said.length = 0;
  Game.init({});
  Game.load(canvas, levelIndex);
  run();
  said.length = 0;      // the greeting takes no part in the checks
}

let failed = 0;

function check(name, ok, extra) {
  if (ok) { console.log(`ok    ${name}`); return; }
  failed++;
  console.log(`FAIL  ${name}`);
  if (extra) console.log(`      ${extra}`);
}

// ── the same scenarios, in each language ────────────────────────────────
const SUITES = {
  ru: {
    takeAny:   'возьми мяч',
    takeRed:   'возьми красный мяч',
    takeGhost: 'возьми зелёный кубик',
    nonsense:  'мама пойдём гулять',
    putRed:    'положи красный мяч в коробку',
    putNoDest: 'положи красный мяч',
    putAny:    'положи мяч в коробку',
    dropped:    /уронил|удержать|неуклюж/i,
    blaming:    /ты .*(сказал|неправильно)|неверно|ошибка/i,
    winning:    /ура|справились|получилось/i,
    aboutSize:  /размер/i,
    givesAway:  /большой мяч|маленький мяч/i,
    notFound:   /не вижу|не нахожу|не нашёл/i,
    distracted: /загляделся|не расслышал|шумно/i,
    asksWhere:  /куда/i,
    hintish:    /разного цвета|уронил|удержать/i
  },
  en: {
    takeAny:   'take the ball',
    takeRed:   'take the red ball',
    takeGhost: 'take the green cube',
    nonsense:  'mummy lets go outside',
    putRed:    'put the red ball in the box',
    putNoDest: 'put the red ball',
    putAny:    'put the ball in the box',
    dropped:    /dropped|too many|clumsy/i,
    blaming:    /you said|you were wrong|incorrect/i,
    winning:    /hooray|we did it|it worked/i,
    aboutSize:  /size/i,
    givesAway:  /big ball|small ball/i,
    notFound:   /do not see|cannot find|did not find/i,
    distracted: /distracted|did not catch|noisy/i,
    asksWhere:  /where/i,
    hintish:    /different colours|dropped|too many/i
  }
};

Object.keys(SUITES).forEach((lang) => {
  const s = SUITES[lang];
  Lang.set(lang);
  sandbox.DICT = sandbox.window.DICT;
  console.log(`\n── ${lang} ─────────────────────────────────────────`);

  // 1. The core mechanism: three balls, "ball" was said — grab all, drop all.
  reset(0);
  Game.handle(s.takeAny);
  run();
  check('"take the ball" with three balls — everything dropped, nothing held',
    Scene.robot().hold.length === 0 && Scene.all().every((i) => !i.held),
    'in hand: ' + Scene.robot().hold.length);

  check('the robot blames its own clumsiness',
    said.some((t) => s.dropped.test(t)), said.join(' | '));

  check('no line blames the child',
    !said.some((t) => s.blaming.test(t)), said.join(' | '));

  // 2. Colour named — exactly one is taken.
  said.length = 0;
  Game.handle(s.takeRed);
  run();
  const red = Scene.all().filter((i) => i.color === 'red')[0];
  check('naming the colour takes exactly one, and the right one',
    Scene.robot().hold.length === 1 && red && red.held === true);

  check('the level goal is registered',
    said.some((t) => s.winning.test(t)), said.join(' | '));

  // 3. The hint names the dimension, never the value.
  reset(1);   // two blue balls, different sizes
  Game.handle(s.takeAny);
  run();
  check('hint mentions size without giving away the answer',
    said.some((t) => s.aboutSize.test(t)) && !said.some((t) => s.givesAway.test(t)),
    said.join(' | '));

  // 4. Nothing matches — the robot looks around instead of scolding.
  reset(0);
  Game.handle(s.takeGhost);
  run();
  check('a thing that is not there — the robot shrugs',
    said.some((t) => s.notFound.test(t)), said.join(' | '));

  // 5. Unintelligible — the fault is the robot's and the room's.
  reset(0);
  Game.handle(s.nonsense);
  run();
  check('unintelligible speech — the robot got distracted itself',
    said.some((t) => s.distracted.test(t)), said.join(' | '));

  // 6. Preposition: the thing ends up inside the box.
  reset(4);
  Game.handle(s.putRed);
  run();
  check('"put ... in the box" removes the ball from the floor',
    !Scene.all().some((i) => i.type === 'ball' && i.color === 'red'),
    Scene.all().map((i) => i.type + '/' + i.color).join(', '));

  // 7. Picked up, but no destination given.
  reset(4);
  Game.handle(s.putNoDest);
  run();
  check('with no destination the robot holds on and asks where',
    Scene.robot().hold.length === 1 && said.some((t) => s.asksWhere.test(t)),
    said.join(' | '));

  // 8. Two boxes — the ambiguity moves to the destination.
  reset(5);
  Game.handle(s.putAny);
  run();
  check('two boxes — the robot fumbles instead of silently choosing',
    said.some((t) => s.dropped.test(t)), said.join(' | '));

  // 9. Changing level mid-action must not drag old lines along. Only this
  // catches it: in the browser it shows up as "the robot sometimes says
  // something odd", with no way to trace it.
  reset(0);
  Game.handle(s.takeAny);
  runSome(5);                      // the robot has barely set off
  said.length = 0;
  Game.load(canvas, 4);            // moved to another level mid-action
  run();                           // and simply let the frames play out
  check('no hints from the previous scene after a level change',
    !said.some((t) => s.hintish.test(t)), said.join(' | '));
});

console.log(failed ? `\nFailures: ${failed}` : '\nAll good.');
process.exit(failed ? 1 : 0);
