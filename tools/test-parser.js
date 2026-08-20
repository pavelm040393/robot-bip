// Проверка разбора команд — без браузера и без микрофона.
//
//   node tools/test-parser.js
//
// Микрофон проверяется на живом ребёнке (tools/test-mic.html), а вот разбор
// фразы проверяется здесь и должен проходить всегда. Правило простое: любая
// правка в dict.js, match.js или parser.js — прогнать этот файл. Словарь
// растёт от встреч с ребёнком, и легко, добавляя одно слово, сломать
// соседнее: корень «мал» ловит и «маленький», и «малиновый».
//
// Случаи с ошибками в словах — не выдумка для красоты. Так распознавалка
// действительно слышит детей, и если они перестанут проходить, игра начнёт
// отвечать «я не расслышал» на каждую вторую фразу.
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const sandbox = { window: {}, console };
vm.createContext(sandbox);

['dict.js', 'match.js', 'parser.js'].forEach((f) => {
  const code = fs.readFileSync(path.join(ROOT, 'assets', f), 'utf8');
  vm.runInContext(code, sandbox);
  // Модули кладут себя в window, а друг друга зовут по голому имени.
  Object.assign(sandbox, sandbox.window);
});

const { Parser, Match, DICT } = sandbox;

// ── случаи ──────────────────────────────────────────────────────────────
// action / type / color / size / dest — null означает «не должно найтись».
const CASES = [
  // самое обычное
  ['возьми красный мяч',            { action: 'take', type: 'ball', color: 'red' }],
  ['дай синий кубик',               { action: 'take', type: 'cube', color: 'blue' }],
  ['подними большой мяч',           { action: 'take', type: 'ball', size: 'big' }],

  // лишние слова вокруг — ребёнок не говорит телеграфом
  ['ну возьми пожалуйста вон тот красненький мячик',
                                    { action: 'take', type: 'ball', color: 'red' }],
  ['а теперь дай мне маленький жёлтый кубик',
                                    { action: 'take', type: 'cube', color: 'yellow', size: 'small' }],

  // падежи и уменьшительные
  ['возьми красную коробку',        { action: 'take', type: 'box', color: 'red' }],
  ['дай зелёненький шарик',         { action: 'take', type: 'ball', color: 'green' }],

  // так их слышит распознавалка
  ['возьми кащный мяч',             { action: 'take', type: 'ball', color: 'red' }],
  ['вазьми сини кубик',             { action: 'take', type: 'cube', color: 'blue' }],
  ['дай балшой мяч',                { action: 'take', type: 'ball', size: 'big' }],

  // неполные команды — робот должен их отличать, а не гадать
  ['возьми мяч',                    { action: 'take', type: 'ball', color: null, size: null }],
  ['возьми',                        { action: 'take', type: null }],
  ['красный',                       { action: null, color: 'red' }],

  // предлог делит фразу: что берём / куда кладём
  ['положи мяч в коробку',          { action: 'put', type: 'ball', dest: 'box' }],
  ['положи красный мяч в синюю коробку',
                                    { action: 'put', type: 'ball', color: 'red', dest: 'box', destColor: 'blue' }],
  ['убери маленький кубик в большую коробку',
                                    { action: 'put', type: 'cube', size: 'small', dest: 'box', destSize: 'big' }],

  // мусор
  ['мама пойдём гулять',            { action: null, type: null }],
  ['',                              { action: null, type: null }]
];

let failed = 0;

CASES.forEach(([phrase, want]) => {
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
    console.log(`ПРОВАЛ  «${phrase}»`);
    bad.forEach((k) => console.log(`        ${k}: ждали ${want[k]}, получили ${have[k]}`));
  } else {
    console.log(`ок      «${phrase}»  →  ${Parser.describe(got)}`);
  }
});

// ── ложные срабатывания ─────────────────────────────────────────────────
// Слова, похожие на словарные, но чужие. Если начнут ловиться — робот
// поедет выполнять то, чего не просили, и это хуже, чем не расслышать.
console.log('\nчужие слова (не должны ловиться):');
const ALIEN = [
  ['малиновый', DICT.sizes.small, 'маленький'],
  ['сильный',   DICT.colors.blue, 'синий'],
  ['мячта',     DICT.types.cube,  'кубик'],
  ['два',       DICT.actions.take, 'взять']
];

ALIEN.forEach(([word, entry, title]) => {
  if (Match.word(word, entry)) {
    failed++;
    console.log(`ПРОВАЛ  «${word}» принят за «${title}»`);
  } else {
    console.log(`ок      «${word}» не путается с «${title}»`);
  }
});

console.log(failed ? `\nПровалов: ${failed}` : '\nВсё сошлось.');
process.exit(failed ? 1 : 0);
