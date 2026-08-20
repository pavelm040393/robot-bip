// Two languages: Russian and English.
//
// The language decides far more here than the wording of a button. It decides
// which words the robot can recognise (dict.js), which language the speech
// engine listens in (speech.js) and which voice reads the lines out loud —
// so switching it has to happen in one place, and that place is this file.
//
// Everything a child or a parent can read or hear lives here: interface
// labels, every line the robot says, and the level texts. Scatter them across
// files and half of them stay untranslated — and the person who notices will
// not be you, it will be the child staring at a button they cannot read.
//
//   Lang.get()              → 'ru' | 'en'
//   Lang.set('en')          → switch and remember
//   Lang.t('ui.next')       → an interface string
//   Lang.say('okTake')      → one random line from a group
//   Lang.level(2)           → the level's texts in the current language
//
// Robot lines come in groups of several. The same sentence stops being funny
// the third time and starts being irritating, so every group needs at least
// two variants — and ALL of them must obey rule 3 from DESIGN.md: name the
// missing dimension, never the answer.
(function () {
  'use strict';

  var KEY = 'bip.lang';
  var LANGS = ['ru', 'en'];

  var TEXTS = {

    // ── Russian ─────────────────────────────────────────────────────────
    ru: {
      code: 'ru-RU',
      title: 'Бип — робот, который понимает буквально',

      ui: {
        speak: 'Говорить',
        listening: 'Слушаю…',
        task: 'Задание',
        of: 'из',
        learning: 'учимся:',
        again: 'Сначала',
        next: 'Дальше →',
        typeHere: 'или напишите команду',
        send: 'Ок',
        logTitle: 'Что услышал Бип',
        child: 'ребёнок',
        understood: 'понял как:',
        complete: 'Задание пройдено',
        nothing: 'ничего не понял',
        something: 'что-то',
        noSpeech: 'Этот браузер не умеет распознавать речь. Нужен Chrome или Edge — ' +
                  'а пока можно писать команды в поле ниже.',
        fileMode: 'Страница открыта файлом — микрофон в таком режиме не работает. ' +
                  'Запустите node server.js и откройте http://localhost:8080',
        micError: 'Микрофон не отвечает. Проверьте разрешение для сайта.',
        voice: 'Голос Бипа',
        voiceAuto: 'Выбран автоматически',
        voiceTry: 'Послушать',
        voiceHi: 'Привет! Я Бип. Слышишь меня?',
        voiceNone: 'В этом браузере нет голоса для этого языка.',
        settings: 'Для взрослого'
      },

      say: {
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
      },

      levels: [
        {
          name: 'Три мяча',
          learn: 'цвет',
          task: 'Попросите взять какой-нибудь один мяч. Скажите просто «возьми мяч» — увидите, что будет.',
          intro: 'Привет! Я Бип. Скажи мне, что делать!'
        },
        {
          name: 'Большой и маленький',
          learn: 'размер',
          task: 'Оба мяча синие. Одного цвета мало — понадобится слово про размер.',
          intro: 'Ой, а эти два похожи…'
        },
        {
          name: 'Мяч и кубик',
          learn: 'название предмета',
          task: 'Оба жёлтые и одинаковые по размеру. Придётся назвать саму вещь.',
          intro: 'Тут два жёлтых. Какой тебе нужен?'
        },
        {
          name: 'Четыре кубика',
          learn: 'два признака вместе',
          task: 'Одного слова не хватит: «красный» — их два, «большой» — тоже два. Нужны оба сразу.',
          intro: 'Ух, сколько кубиков!'
        },
        {
          name: 'Убираем в коробку',
          learn: 'предлог «в»',
          task: 'Теперь мало сказать, что взять, — нужно сказать и куда. Слово «в» делает всю работу.',
          intro: 'Давай приберёмся! Куда всё это?'
        },
        {
          name: 'Две коробки',
          learn: 'уточнение адресата',
          task: 'Коробки две. Сказать «в коробку» теперь недостаточно — Бип не знает, в какую.',
          intro: 'У меня две коробки. Не перепутать бы!'
        }
      ]
    },

    // ── English ─────────────────────────────────────────────────────────
    en: {
      code: 'en-US',
      title: 'Bip — the robot that takes you literally',

      ui: {
        speak: 'Speak',
        listening: 'Listening…',
        task: 'Task',
        of: 'of',
        learning: 'learning:',
        again: 'Restart',
        next: 'Next →',
        typeHere: 'or type a command',
        send: 'OK',
        logTitle: 'What Bip heard',
        child: 'child',
        understood: 'understood as:',
        complete: 'Task complete',
        nothing: 'nothing understood',
        something: 'something',
        noSpeech: 'This browser cannot recognise speech. Chrome or Edge is required — ' +
                  'meanwhile you can type commands in the box below.',
        fileMode: 'The page was opened as a file, and the microphone does not work that way. ' +
                  'Run node server.js and open http://localhost:8080',
        micError: 'The microphone is not responding. Check the site permission.',
        voice: 'Bip’s voice',
        voiceAuto: 'Chosen automatically',
        voiceTry: 'Listen',
        voiceHi: 'Hello! I am Bip. Can you hear me?',
        voiceNone: 'This browser has no voice for this language.',
        settings: 'For the grown-up'
      },

      say: {
        manyTake: [
          'Oops! There are lots of them, and I dropped them all.',
          'Whoa! That is too many for me to hold.',
          'Dropped them… I am so clumsy.'
        ],
        manyHintColor: [
          'But they are different colours. Which one?',
          'There are different colours here. Which one do you want?'
        ],
        manyHintSize: [
          'But they are different sizes. Which one?',
          'They come in different sizes. Which one do you need?'
        ],
        manyHintType: [
          'But these are all different things. Which one?',
          'There are several here, and they are all different.'
        ],
        none: [
          'Hmm… I do not see one of those.',
          'Where is it? I cannot find it.',
          'I looked, but I did not find it.'
        ],
        noAction: [
          'And what should I do?',
          'I am listening! What do I do?'
        ],
        noTarget: [
          'Understood — but with what?',
          'Okay! What should I take?'
        ],
        noDest: [
          'Got it! And where do I put it?',
          'I am holding it. Where does it go?'
        ],
        okTake: [
          'Got it! Look!',
          'Done! I am holding it.',
          'Here it is!'
        ],
        okPut: [
          'Put away! Hooray!',
          'Done! Everything is where it belongs.'
        ],
        lost: [
          'Oops, I got distracted. Say it again?',
          'I did not catch that, once more?',
          'It is noisy in here. One more time?'
        ],
        win: [
          'Hooray! We did it!',
          'It worked! You taught me well.'
        ]
      },

      levels: [
        {
          name: 'Three balls',
          learn: 'colour',
          task: 'Ask for one of the balls. Just say "take the ball" and watch what happens.',
          intro: 'Hello! I am Bip. Tell me what to do!'
        },
        {
          name: 'Big and small',
          learn: 'size',
          task: 'Both balls are blue. Colour will not help — a word about size is needed.',
          intro: 'Oh, these two look alike…'
        },
        {
          name: 'Ball and cube',
          learn: 'naming the thing',
          task: 'Both are yellow and the same size. The thing itself has to be named.',
          intro: 'Two yellow ones here. Which do you need?'
        },
        {
          name: 'Four cubes',
          learn: 'two properties at once',
          task: 'One word is not enough: "red" gives two, "big" gives two as well. Both are needed.',
          intro: 'Wow, so many cubes!'
        },
        {
          name: 'Tidying up',
          learn: 'the preposition "in"',
          task: 'Saying what to take is no longer enough — where it goes matters too. The word "in" does all the work.',
          intro: 'Let us tidy up! Where does all this go?'
        },
        {
          name: 'Two boxes',
          learn: 'naming the destination',
          task: 'There are two boxes. Saying "in the box" is not enough any more — Bip does not know which one.',
          intro: 'I have two boxes. I hope I do not mix them up!'
        }
      ]
    }
  };

  // ── state ─────────────────────────────────────────────────────────────
  // The choice a person made wins. With no choice yet, follow the device —
  // a child handed a tablet should not meet a language they cannot read.
  var current = detect();

  function detect() {
    var saved;
    try { saved = localStorage.getItem(KEY); } catch (e) { /* private mode */ }
    if (saved && TEXTS[saved]) return saved;

    var nav = (navigator.language || 'en').slice(0, 2).toLowerCase();
    return TEXTS[nav] ? nav : 'en';
  }

  function get() { return current; }

  function set(lang) {
    if (!TEXTS[lang]) return current;
    current = lang;
    try { localStorage.setItem(KEY, lang); } catch (e) { /* private mode */ }
    if (window.setDictLang) window.setDictLang(lang);
    return current;
  }

  function pack() { return TEXTS[current]; }

  // Dotted lookup: 'ui.next' → TEXTS[current].ui.next
  function t(key) {
    var node = pack(), parts = String(key).split('.');
    for (var i = 0; i < parts.length; i++) {
      if (!node) return key;
      node = node[parts[i]];
    }
    return node === undefined ? key : node;
  }

  function say(group) {
    var list = pack().say[group];
    if (!list || !list.length) return '';
    return list[Math.floor(Math.random() * list.length)];
  }

  function level(index) {
    return pack().levels[index] || {};
  }

  function code() { return pack().code; }

  window.Lang = {
    get: get, set: set, t: t, say: say, level: level, code: code,
    list: LANGS
  };

  // The dictionary has to match the language from the very first frame,
  // before anything reads DICT.
  if (window.setDictLang) window.setDictLang(current);
})();
