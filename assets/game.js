// Правила игры: что робот делает с распознанной командой.
//
// Здесь лежит вся педагогика, и здесь же — три правила, которые нельзя
// нарушать. Они не про код, они про то, будет ребёнок смеяться или плакать:
//
//   1. Вина всегда на роботе. Не «ты неточно сказал», а «я растяпа».
//      Ребёнок и так весь день слышит, что сказал непонятно.
//   2. Проиграть нельзя. Нет очков, таймеров и слова «неправильно».
//      Есть только «ещё не получилось».
//   3. Подсказывается форма, а не ответ. Не «скажи: возьми красный мяч»,
//      а растерянное «их тут три… и они разного цвета». Направление даём,
//      слово ребёнок находит сам — иначе он повторяет за роботом и не
//      учится ничему.
//
// Главный механизм: команда «возьми мяч» при трёх мячах не отвергается, а
// выполняется буквально — робот хватает все три и роняет. Ошибка смешная, а
// не обидная, и уточнение рождается само собой.
(function () {
  'use strict';

  var ui = {}, level = null, levelIndex = 0, done = false;

  // ── реплики ──────────────────────────────────────────────────────────
  // Вариантов по нескольку: одна и та же фраза на третий раз перестаёт
  // смешить и начинает раздражать.
  var SAY = {
    manyTake: [
      'Ой! Их тут много, я их все уронил.',
      'Ай! Столько сразу мне не удержать.',
      'Уронил… Я такой неуклюжий.'
    ],
    manyHintColor: [
      'А они разного цвета. Какой брать?',
      'Тут есть разные цвета. Какой нужен?'
    ],
    manyHintSize: [
      'А они разного размера. Какой брать?',
      // Здесь стоял вариант «один большой, другой маленький — какой?».
      // Он называл оба значения вслух, и ребёнку оставалось повторить за
      // роботом. Это подсказка ответом, а не формой, — против правила 3.
      'А они по размеру разные. Какой нужен?'
    ],
    manyHintType: [
      'А тут разные штуки лежат. Какая нужна?',
      'Их тут несколько, и все разные.'
    ],
    none: [
      'Хм… Я такого не вижу.',
      'А где это? Я не нахожу.',
      'Я поискал, но не нашёл.'
    ],
    noAction: [
      'А что мне сделать?',
      'Я слушаю! Что делать-то?'
    ],
    noTarget: [
      'Сделать — понял. А с чем?',
      'Хорошо! А что взять?'
    ],
    noDest: [
      'Взял! А куда положить?',
      'Держу. Куда его?'
    ],
    okTake: [
      'Взял! Смотри!',
      'Готово! Держу.',
      'Вот он!'
    ],
    okPut: [
      'Положил! Ура!',
      'Готово! Всё на месте.'
    ],
    lost: [
      'Ой, я загляделся. Скажи ещё разок?',
      'Я не расслышал, повтори?',
      'Шумно тут. Ещё разок?'
    ],
    win: [
      'Ура! Мы справились!',
      'Получилось! Ты меня хорошо научил.'
    ]
  };

  function pick(list) { return list[Math.floor(Math.random() * list.length)]; }

  function talk(key) {
    var text = pick(SAY[key]);
    Speech.say(text);
    if (ui.onSay) ui.onSay(text);
    return text;
  }

  function talkText(text) {
    Speech.say(text);
    if (ui.onSay) ui.onSay(text);
  }

  // ── подсказка формы ──────────────────────────────────────────────────
  // Смотрим, ЧЕМ найденные предметы отличаются друг от друга, и называем
  // измерение — цвет, размер или вид. Ровно то слово, которого не хватило
  // в команде. Само слово при этом не подсказываем.
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

  // ── движения ─────────────────────────────────────────────────────────
  function goTo(x) { Scene.push({ kind: 'go', x: Math.max(80, Math.min(Scene.width - 80, x)) }); }

  function reach(it) {
    Scene.push({ kind: 'arm', to: 1 });
    Scene.push({ kind: 'grab', it: it });
    Scene.push({ kind: 'arm', to: 0 });
  }

  function faces(f) { Scene.push({ kind: 'face', face: f }); }

  // ── разбор команды ───────────────────────────────────────────────────
  function handle(phrase) {
    if (done) return;
    if (Scene.busy()) return;          // робот занят — новые команды подождут

    var cmd = Parser.parse(phrase);
    if (ui.onHeard) ui.onHeard(phrase, Parser.describe(cmd));

    // Ничего знакомого. Вина — на роботе и на шуме, не на ребёнке.
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

  // Несколько подходит — вот она, главная сцена игры.
  function tooMany(found) {
    var hint = hintKey(found);

    faces('oops');
    // Робот честно едет к каждому и хватает — видно, что он старается.
    found.forEach(function (it) {
      goTo(it.x);
      reach(it);
    });
    goTo((found[0].x + found[found.length - 1].x) / 2);
    Scene.push({ kind: 'wait', ms: 250 });
    Scene.push({ kind: 'drop' });
    Scene.push({ kind: 'face', face: 'confused' });
    // Пауза перед подсказкой — шагом очереди, а не таймером. Реплики идут
    // через один синтезатор, и новая обрывает предыдущую: без этой паузы
    // «какой брать?» съедает «ой, я уронил», и ребёнок не понимает, что
    // вообще произошло.
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

  // ── цель уровня ──────────────────────────────────────────────────────
  // Цель описана в levels.js как «этих предметов на полу быть не должно».
  // Проверяем после каждого удачного действия.
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

  // ── уровни ───────────────────────────────────────────────────────────
  function load(canvas, index) {
    levelIndex = Math.max(0, Math.min(LEVELS.length - 1, index));
    level = LEVELS[levelIndex];
    done = false;
    Scene.clear();
    Scene.setup(canvas, level);
    if (ui.onLevel) ui.onLevel(level, levelIndex, LEVELS.length);
    if (level.intro) setTimeout(function () { talkText(level.intro); }, 500);
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
