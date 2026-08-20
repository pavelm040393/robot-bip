// Everything the robot is able to hear, in every language it speaks.
//
// Recognition is NOT open-ended. The browser hands us a whole sentence and we
// pull out the words we know, discarding the rest. A child says "well please
// pick up that little red ball over there" — we need three words out of nine,
// and that beats parsing grammar every time.
//
// Each concept carries two lists, and they behave differently:
//
//   roots — word beginnings, matched exactly. They cover inflections in one
//           stroke: Russian "красн" catches красный/красная/красненький,
//           English "ball" catches ball/balls. Because the match is exact, a
//           root must be picked so it cannot grab something else: Russian
//           "мал" would swallow "малиновый" (raspberry-coloured), so the root
//           is "мален" instead.
//
//   words — whole words. These are the only ones compared fuzzily, so they
//           must be FULL forms rather than stems: the misheard "кащный" is
//           two edits away from "красный" but three away from the stem
//           "красн", and would never match through a root.
//
// When you add a word a real child said: put it in `words` whole, do not chop
// it into a stem, and run tools/test-parser.js immediately. One added word
// breaks a neighbouring one more often than you would think.
//
// Russian gets far more mileage out of fuzzy matching than English does:
// its words are longer, and length is what makes fuzzy comparison safe. Short
// English words like "ball" or "red" are matched exactly — see match.js.
(function () {
  'use strict';

  window.WORDS = {

    // ── Russian ─────────────────────────────────────────────────────────
    ru: {
      actions: {
        take: {
          title: 'взять',
          roots: ['возьм', 'взят', 'бер', 'брат', 'подним', 'доста', 'хвата'],
          words: ['дай', 'дать', 'возьми', 'подними', 'достань']
        },
        put: {
          title: 'положить',
          // "убер" has to be a root: routed through `words`, "убери" latches
          // onto "бери" from take and the robot picks up instead of putting.
          roots: ['полож', 'постав', 'клад', 'убер', 'слож', 'засун'],
          words: ['положи', 'поставь', 'убери', 'сложи']
        }
      },
      colors: {
        red:    { title: 'красный', roots: ['красн'], words: ['красный', 'красная', 'красную'] },
        blue:   { title: 'синий',   roots: ['син'],   words: ['синий', 'синяя', 'синюю'] },
        yellow: { title: 'жёлтый',  roots: ['жёлт', 'желт'], words: ['жёлтый', 'жёлтая', 'желтый'] },
        green:  { title: 'зелёный', roots: ['зелён', 'зелен'], words: ['зелёный', 'зелёная', 'зеленый'] }
      },
      sizes: {
        big:   { title: 'большой',   roots: ['больш', 'крупн'], words: ['большой', 'большая', 'большую'] },
        // The root "мал" is off limits — it grabs "малиновый".
        small: { title: 'маленький', roots: ['мален', 'малы', 'мелк'], words: ['маленький', 'маленькая', 'малый'] }
      },
      types: {
        ball: { title: 'мяч',     roots: ['мяч', 'шар'], words: ['мяч', 'мячик', 'шар', 'шарик'] },
        cube: { title: 'кубик',   roots: ['куб'],        words: ['кубик', 'кубики', 'куб'] },
        box:  { title: 'коробка', roots: ['короб', 'ящик'], words: ['коробка', 'коробку', 'ящик'] }
      },
      // The preposition splits the sentence: "put the ball IN the box".
      // Without that split two sets of adjectives in one sentence cannot be
      // told apart — no way to know what goes where.
      preps: {
        into: { title: 'в', roots: [], words: ['в', 'во', 'внутрь'] },
        onto: { title: 'на', roots: [], words: ['на'] }
      }
    },

    // ── English ─────────────────────────────────────────────────────────
    en: {
      actions: {
        take: {
          title: 'take',
          roots: ['take', 'takes', 'pick', 'grab', 'bring', 'lift', 'fetch'],
          words: ['get', 'give', 'hand']
        },
        put: {
          title: 'put',
          // "drop" stays out on purpose: the robot dropping things is its own
          // gag, and a child shouting "drop it!" should not read as tidying up.
          roots: ['put', 'place', 'stack'],
          words: ['tidy']
        }
      },
      // English colours carry no roots at all. There is nothing to inflect
      // here, and a root would do real damage: "red" swallows "redo", "blue"
      // swallows "blueberry". Exact words only.
      colors: {
        red:    { title: 'red',    roots: [], words: ['red'] },
        blue:   { title: 'blue',   roots: [], words: ['blue'] },
        yellow: { title: 'yellow', roots: [], words: ['yellow'] },
        green:  { title: 'green',  roots: [], words: ['green'] }
      },
      sizes: {
        big:   { title: 'big',   roots: ['big', 'large', 'huge'],   words: ['big', 'large'] },
        small: { title: 'small', roots: ['small', 'littl', 'tiny'], words: ['small', 'little'] }
      },
      types: {
        // Same reason "ball" is not a root: it would catch "balloon".
        ball: { title: 'ball', roots: [], words: ['ball', 'balls'] },
        cube: { title: 'cube', roots: ['cube', 'block', 'brick'], words: ['cube', 'block', 'brick'] },
        box:  { title: 'box',  roots: ['box', 'bin', 'basket'],   words: ['box', 'boxes', 'bin'] }
      },
      preps: {
        into: { title: 'in', roots: [], words: ['in', 'into', 'inside'] },
        onto: { title: 'on', roots: [], words: ['on', 'onto'] }
      }
    }
  };

  // The active dictionary. Every other module reads plain `DICT`, so switching
  // languages is a single reassignment rather than threading a language
  // argument through the parser, the scene and the rules.
  window.DICT = window.WORDS.ru;

  window.setDictLang = function (lang) {
    window.DICT = window.WORDS[lang] || window.WORDS.ru;
    return window.DICT;
  };
})();
