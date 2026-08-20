// Command parsing checks — no browser, no microphone.
//
//   node tools/test-parser.js
//
// The microphone is tested on a real child (tools/test-mic.html); sentence
// parsing is tested here and must pass every time. The rule is simple: any
// edit to dict.js, match.js or parser.js means running this file. Dictionaries
// grow out of sessions with a child, and it is easy to break a neighbouring
// word by adding one — the Russian stem "мал" swallows "малиновый".
//
// The misspelled cases are not invented for decoration. That is genuinely how
// a recogniser hears children, and if those stop passing, the game will answer
// "say it again?" to every other sentence.
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const sandbox = {
  console,
  window: {},
  // i18n.js reads the device language and remembers the choice; in Node there
  // is neither, so give it just enough to boot.
  navigator: { language: 'en' },
  localStorage: undefined
};
vm.createContext(sandbox);

['dict.js', 'i18n.js', 'match.js', 'parser.js'].forEach((f) => {
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'assets', f), 'utf8'), sandbox);
  // Modules register themselves on window but call each other by bare name.
  Object.assign(sandbox, sandbox.window);
});

const { Parser, Match, Lang, WORDS } = sandbox;

let failed = 0;

// action / type / color / size / dest — null means "must not be found".
function runCases(lang, cases) {
  Lang.set(lang);
  sandbox.DICT = sandbox.window.DICT;      // the active dictionary was swapped
  console.log(`\n── ${lang} ─────────────────────────────────────────`);

  cases.forEach(([phrase, want]) => {
    const got = Parser.parse(phrase);
    const have = {
      action: got.action,
      type: got.target && got.target.type,
      color: got.target && got.target.color,
      size: got.target && got.target.size,
      dest: got.dest && got.dest.type,
      destColor: got.dest && got.dest.color,
      destSize: got.dest && got.dest.size
    };

    const bad = Object.keys(want).filter((k) => {
      const w = want[k];
      const h = have[k] === undefined ? null : have[k];
      return w === null ? h !== null : h !== w;
    });

    if (bad.length) {
      failed++;
      console.log(`FAIL  "${phrase}"`);
      bad.forEach((k) => console.log(`      ${k}: wanted ${want[k]}, got ${have[k]}`));
    } else {
      console.log(`ok    "${phrase}"  →  ${Parser.describe(got)}`);
    }
  });
}

// ── Russian ─────────────────────────────────────────────────────────────
runCases('ru', [
  // the ordinary cases
  ['возьми красный мяч',            { action: 'take', type: 'ball', color: 'red' }],
  ['дай синий кубик',               { action: 'take', type: 'cube', color: 'blue' }],
  ['подними большой мяч',           { action: 'take', type: 'ball', size: 'big' }],

  // words scattered around — a child does not speak in telegrams
  ['ну возьми пожалуйста вон тот красненький мячик',
                                    { action: 'take', type: 'ball', color: 'red' }],
  ['а теперь дай мне маленький жёлтый кубик',
                                    { action: 'take', type: 'cube', color: 'yellow', size: 'small' }],

  // inflections and diminutives
  ['возьми красную коробку',        { action: 'take', type: 'box', color: 'red' }],
  ['дай зелёненький шарик',         { action: 'take', type: 'ball', color: 'green' }],

  // how a recogniser actually hears them
  ['возьми кащный мяч',             { action: 'take', type: 'ball', color: 'red' }],
  ['вазьми сини кубик',             { action: 'take', type: 'cube', color: 'blue' }],
  ['дай балшой мяч',                { action: 'take', type: 'ball', size: 'big' }],

  // incomplete commands — the robot must tell them apart, not guess
  ['возьми мяч',                    { action: 'take', type: 'ball', color: null, size: null }],
  ['возьми',                        { action: 'take', type: null }],
  ['красный',                       { action: null, color: 'red' }],

  // the preposition splits the sentence
  ['положи мяч в коробку',          { action: 'put', type: 'ball', dest: 'box' }],
  ['положи красный мяч в синюю коробку',
                                    { action: 'put', type: 'ball', color: 'red', dest: 'box', destColor: 'blue' }],
  ['убери маленький кубик в большую коробку',
                                    { action: 'put', type: 'cube', size: 'small', dest: 'box', destSize: 'big' }],

  // noise
  ['мама пойдём гулять',            { action: null, type: null }],
  ['',                              { action: null, type: null }]
]);

// ── English ─────────────────────────────────────────────────────────────
runCases('en', [
  ['take the red ball',             { action: 'take', type: 'ball', color: 'red' }],
  ['give me the blue cube',         { action: 'take', type: 'cube', color: 'blue' }],
  ['pick up the big ball',          { action: 'take', type: 'ball', size: 'big' }],

  ['well please pick up that little red ball over there',
                                    { action: 'take', type: 'ball', color: 'red', size: 'small' }],
  ['now give me the small yellow block',
                                    { action: 'take', type: 'cube', color: 'yellow', size: 'small' }],

  // plurals and synonyms
  ['grab the green balls',          { action: 'take', type: 'ball', color: 'green' }],
  ['take the tiny brick',           { action: 'take', type: 'cube', size: 'small' }],

  // incomplete commands
  ['take the ball',                 { action: 'take', type: 'ball', color: null, size: null }],
  ['take',                          { action: 'take', type: null }],
  ['red',                           { action: null, color: 'red' }],

  // the preposition splits the sentence
  ['put the ball in the box',       { action: 'put', type: 'ball', dest: 'box' }],
  ['put the red ball in the blue box',
                                    { action: 'put', type: 'ball', color: 'red', dest: 'box', destColor: 'blue' }],
  ['put the small cube into the big box',
                                    { action: 'put', type: 'cube', size: 'small', dest: 'box', destSize: 'big' }],

  // noise
  ['mummy lets go outside',         { action: null, type: null }],
  ['',                              { action: null, type: null }]
]);

// ── false positives ─────────────────────────────────────────────────────
// Words that look like dictionary entries but are not. If these start
// matching, the robot goes off to do something nobody asked for — which is
// worse than not hearing at all.
console.log('\n── strangers (must not match) ───────────────────');

const ALIEN = [
  ['ru', 'малиновый', 'sizes',   'small'],
  ['ru', 'сильный',   'colors',  'blue'],
  ['ru', 'мячта',     'types',   'cube'],
  ['ru', 'два',       'actions', 'take'],
  ['en', 'redo',      'colors',  'red'],
  ['en', 'blueberry', 'colors',  'blue'],
  ['en', 'tall',      'types',   'ball'],
  ['en', 'bigger',    'sizes',   'small']
];

ALIEN.forEach(([lang, word, group, key]) => {
  const entry = WORDS[lang][group][key];
  if (Match.word(word, entry)) {
    failed++;
    console.log(`FAIL  "${word}" (${lang}) was taken for "${entry.title}"`);
  } else {
    console.log(`ok    "${word}" (${lang}) is not confused with "${entry.title}"`);
  }
});

console.log(failed ? `\nFailures: ${failed}` : '\nAll good.');
process.exit(failed ? 1 : 0);
