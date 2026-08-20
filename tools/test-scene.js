// Проверка сценариев игры целиком — без браузера.
//
//   node tools/test-scene.js
//
// Проверяет то, ради чего игра существует: что неполная команда приводит к
// смешной ошибке, а полная — к успеху. Разбор фразы проверяется отдельно
// (test-parser.js), здесь важно поведение робота.
//
// Канвас и requestAnimationFrame подменены заглушками, кадры прокручиваются
// вручную. Так тест идёт мгновенно и не зависит от того, в фокусе вкладка
// или нет: в фоне Chrome замораживает анимацию, и «проверить в браузере»
// незаметно превращается в «посмотреть на застывшую картинку».
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');

// ── заглушки браузера ───────────────────────────────────────────────────
const frames = [];
const said = [];

const ctx = {
  createLinearGradient: () => ({ addColorStop() {} }),
  clearRect() {}, fillRect() {}, beginPath() {}, closePath() {},
  moveTo() {}, lineTo() {}, arc() {}, arcTo() {}, ellipse() {},
  fill() {}, stroke() {}, save() {}, restore() {}, translate() {}, rotate() {}
};

const sandbox = {
  console,
  window: {},
  requestAnimationFrame: (fn) => { frames.push(fn); return frames.length; },
  // Отложенное выполняем сразу: приветствие уровня висит на таймере, а
  // ждать его в тесте нечего.
  setTimeout: (fn) => { if (typeof fn === 'function') fn(); return 0; },
  Math, JSON, Object, Array, String, Number, Date
};
vm.createContext(sandbox);

['dict.js', 'match.js', 'parser.js', 'scene.js', 'levels.js', 'game.js'].forEach((f) => {
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'assets', f), 'utf8'), sandbox);
  Object.assign(sandbox, sandbox.window);
});

// Голос робота: вместо звука — запись в список, по нему и проверяем.
sandbox.Speech = { say: (t) => said.push(t), supported: () => false };

const { Scene, Game } = sandbox;
const canvas = { getContext: () => ctx, width: 0, height: 0 };

// Прокрутить анимацию до конца очереди (или пока не надоест).
function run(limit = 4000) {
  let n = 0;
  while (frames.length && n++ < limit) {
    const fn = frames.shift();
    fn();
  }
  if (n >= limit) throw new Error('очередь не кончилась — где-то вечный шаг');
}

// Прокрутить ровно несколько кадров — оставить робота на полпути.
function runSome(n) {
  while (frames.length && n-- > 0) frames.shift()();
}

function reset(levelIndex) {
  frames.length = 0;
  said.length = 0;
  Game.init({});
  Game.load(canvas, levelIndex);
  run();
  said.length = 0;      // приветствие робота в проверках не участвует
}

function items() {
  return Scene.all().map((i) => ({ type: i.type, color: i.color, size: i.size, held: i.held }));
}

// ── случаи ──────────────────────────────────────────────────────────────
let failed = 0;

function check(name, ok, extra) {
  if (ok) { console.log(`ок      ${name}`); return; }
  failed++;
  console.log(`ПРОВАЛ  ${name}`);
  if (extra) console.log(`        ${extra}`);
}

// 1. Главный механизм: мячей три, сказано «мяч» — робот хватает все и роняет.
reset(0);
Game.handle('возьми мяч');
run();
check('«возьми мяч» при трёх мячах — робот роняет, ничего не взято',
  Scene.robot().hold.length === 0 && items().every((i) => !i.held),
  'в руке: ' + Scene.robot().hold.length);

check('и говорит про свою неуклюжесть, а не про ошибку ребёнка',
  said.some((t) => /уронил|удержать|неуклюж/i.test(t)),
  said.join(' | '));

check('ни одна реплика не винит ребёнка',
  !said.some((t) => /ты .*(сказал|неправильно)|неверно|ошибка/i.test(t)),
  said.join(' | '));

// 2. Уточнили цвет — робот берёт ровно один и радуется.
said.length = 0;
Game.handle('возьми красный мяч');
run();
const red = Scene.all().filter((i) => i.color === 'red')[0];
check('«возьми красный мяч» — взят ровно один, и именно красный',
  Scene.robot().hold.length === 1 && red && red.held === true);

check('цель уровня засчитана',
  said.some((t) => /ура|справились|получилось/i.test(t)),
  said.join(' | '));

// 3. Подсказка называет измерение, но не значение.
reset(1);   // два синих мяча, разный размер
Game.handle('возьми мяч');
run();
check('подсказка про размер, без называния ответа',
  said.some((t) => /размер/i.test(t)) && !said.some((t) => /большой мяч|маленький мяч/i.test(t)),
  said.join(' | '));

// 4. Нет такого предмета — робот не находит, но не ругается.
reset(0);
Game.handle('возьми зелёный кубик');
run();
check('несуществующий предмет — робот разводит руками',
  said.some((t) => /не вижу|не нахожу|не нашёл/i.test(t)),
  said.join(' | '));

// 5. Непонятная фраза — вина на роботе и на шуме.
reset(0);
Game.handle('мама пойдём гулять');
run();
check('непонятная фраза — робот отвлёкся сам',
  said.some((t) => /загляделся|не расслышал|шумно/i.test(t)),
  said.join(' | '));

// 6. Предлог: предмет уезжает в коробку.
reset(4);
Game.handle('положи красный мяч в коробку');
run();
check('«положи … в коробку» — мяч убран со сцены',
  !Scene.all().some((i) => i.type === 'ball' && i.color === 'red'),
  items().map((i) => i.type + '/' + i.color).join(', '));

// 7. Взяли, но не сказали куда — робот держит и спрашивает.
reset(4);
Game.handle('положи красный мяч');
run();
check('без адресата робот держит предмет и спрашивает, куда',
  Scene.robot().hold.length === 1 && said.some((t) => /куда/i.test(t)),
  said.join(' | '));

// 8. Две коробки — неоднозначность переезжает на адресата.
reset(5);
Game.handle('положи мяч в коробку');
run();
check('две коробки — робот путается в адресате, а не молча выбирает',
  said.some((t) => /уронил|удержать|неуклюж/i.test(t)),
  said.join(' | '));

// 9. Смена уровня посреди действия не должна тащить за собой старые реплики.
// Ловится только так: в браузере это выглядит как «робот иногда говорит
// невпопад», и концов потом не найти.
reset(0);
Game.handle('возьми мяч');
runSome(5);                      // робот только тронулся с места
said.length = 0;
Game.load(canvas, 4);            // ушли на другой уровень посреди действия
run();                           // и просто дали кадрам доиграть
check('после смены уровня не звучат подсказки от прошлой сцены',
  !said.some((t) => /разного цвета|уронил|удержать/i.test(t)),
  said.join(' | '));

console.log(failed ? `\nПровалов: ${failed}` : '\nВсё сошлось.');
process.exit(failed ? 1 : 0);
