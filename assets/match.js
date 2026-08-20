// Matching what was heard against the dictionary, with room for child speech.
//
// A four-year-old says "kaschny" where an adult says "krasny", swallows
// endings and pronounces half the sounds differently from what a recogniser
// trained on adults expects. Demanding exact string equality throws away half
// the correct answers and makes it look like the game is broken.
//
// So three sieves, cheapest first:
//   1) the word starts with a known root  — "красненький" → красный;
//   2) the word is in the list verbatim   — "ball";
//   3) Levenshtein distance ≤ 30% of length — "кащный" → "красный" (2 edits).
//
// The third sieve only ever runs on FULL words of five letters or more, and
// that matters. Running it on roots is not allowed: "кащный" is three edits
// from the stem "красн", while "убери" (put away) is a single edit from
// "бери" (take) — and the robot starts picking things up instead of tidying
// them away. The shorter the word, the more junk fuzzy matching collects.
//
// This is also why English leans on exact matching much more than Russian
// does: "ball", "red", "big" are all too short to fuzz safely, since "ball"
// would happily match "wall", "call" and "tall".
//
// The 30% threshold was tuned by ear: at 25% "кащный" no longer passes, at
// 40% "синий" and "сильный" start colliding. Expect to retune it on your own
// child — every child mangles words in their own way.
//
//   Match.word('кащный', DICT.colors.red)           → true
//   Match.find('give me the red ball', DICT.colors) → 'red'
(function () {
  'use strict';

  var TOLERANCE = 0.3;
  var MIN_ROOT = 3;      // "мяч", "куб", "red" — anything shorter is a trap
  var MIN_FUZZY = 5;     // below this, fuzzy matching does more harm than good

  // For a recogniser ё and е are the same letter, and case never matters.
  function norm(s) {
    return String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/[^а-яa-z0-9]/g, '');
  }

  function lev(a, b) {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;

    var prev = [], cur = [], i, j;
    for (j = 0; j <= b.length; j++) prev[j] = j;

    for (i = 1; i <= a.length; i++) {
      cur[0] = i;
      for (j = 1; j <= b.length; j++) {
        var cost = a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1;
        cur[j] = Math.min(cur[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
      }
      prev = cur.slice();
    }
    return prev[b.length];
  }

  // Does one heard word mean this dictionary concept?
  function word(said, entry) {
    var s = norm(said);
    if (!s) return false;

    var roots = entry.roots || [], words = entry.words || [], k;

    for (k = 0; k < roots.length; k++) {
      var r = norm(roots[k]);
      if (r.length >= MIN_ROOT && s.indexOf(r) === 0) return true;
    }

    for (k = 0; k < words.length; k++) {
      var w = norm(words[k]);
      if (s === w) return true;
      // Short words ("in", "on", "get") — exact match only: a single edit in a
      // three-letter word turns it into some other three-letter word.
      if (w.length >= MIN_FUZZY && lev(s, w) <= Math.floor(w.length * TOLERANCE)) return true;
    }

    return false;
  }

  // Split a sentence into words. Recognisers sometimes add punctuation of
  // their own ("take, the red one.") and it must not stick to the words.
  function split(phrase) {
    return String(phrase || '').toLowerCase().split(/[^а-яёa-z0-9]+/).filter(Boolean);
  }

  // First concept from a group found anywhere in the sentence, or null.
  function find(phrase, group) {
    var parts = split(phrase);
    for (var i = 0; i < parts.length; i++) {
      for (var key in group) {
        if (Object.prototype.hasOwnProperty.call(group, key) && word(parts[i], group[key])) return key;
      }
    }
    return null;
  }

  // Where in the sentence a group's word sits — the parser needs this to tell
  // what was said before the preposition from what came after it.
  function findAt(parts, group) {
    for (var i = 0; i < parts.length; i++) {
      for (var key in group) {
        if (Object.prototype.hasOwnProperty.call(group, key) && word(parts[i], group[key])) {
          return { key: key, at: i };
        }
      }
    }
    return null;
  }

  window.Match = { word: word, find: find, findAt: findAt, split: split, lev: lev, norm: norm };
})();
