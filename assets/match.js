// Сопоставление услышанного со словарём — с допуском на детскую речь.
//
// Ребёнок четырёх лет говорит «кащный» вместо «красный», глотает окончания и
// половину звуков произносит не так, как их ждёт распознавалка, обученная на
// взрослых. Требовать точного совпадения строк — значит выкинуть половину
// правильных ответов и решить, что игра не работает.
//
// Поэтому три сита, от дешёвого к дорогому:
//   1) слово начинается с известного корня  — «красненький» → красный;
//   2) слово целиком есть в списке          — «мяч»;
//   3) расстояние Левенштейна ≤ 30% длины   — «кащный» → «красный» (2 правки).
//
// Третье сито работает только по ПОЛНЫМ словам и только от пяти букв, и это
// важно. По корням его пускать нельзя: до «красн» тому же «кащный» уже три
// правки, а вот «убери» до «бери» — всего одна, и робот начинает брать
// вместо того, чтобы класть. Чем короче слово, тем больше чужого собирает
// нечёткое сравнение, поэтому короткие слова — только точным совпадением.
//
// Порог 30% подобран на слух: на 25% «кащный» не проходит, на 40% путаются
// «синий» и «сильный». Подбирать его заново придётся на своём ребёнке — у
// каждого свой набор искажений.
//
//   Match.word('кащный', DICT.colors.red)   → true
//   Match.find('дай красненький мяч', DICT.colors) → 'red'
(function () {
  'use strict';

  var TOLERANCE = 0.3;
  var MIN_ROOT = 3;      // «мяч», «куб», «син» — короче уже опасно
  var MIN_FUZZY = 5;     // ниже этой длины нечёткое сравнение только вредит

  // ё и е для распознавалки одно и то же, регистр тоже не важен.
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

  // Похоже ли одно услышанное слово на понятие из словаря.
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
      // Короткие слова («в», «на», «дай») — только точное совпадение: одна
      // правка в слове из трёх букв превращает его в любое другое.
      if (w.length >= MIN_FUZZY && lev(s, w) <= Math.floor(w.length * TOLERANCE)) return true;
    }

    return false;
  }

  // Режет фразу на слова. Знаки препинания распознавалка иногда вставляет
  // сама («возьми, красный.») — они не должны приклеиваться к словам.
  function split(phrase) {
    return String(phrase || '').toLowerCase().split(/[^а-яёa-z0-9]+/).filter(Boolean);
  }

  // Ищет в фразе первое понятие из группы. Возвращает ключ или null.
  function find(phrase, group) {
    var parts = split(phrase);
    for (var i = 0; i < parts.length; i++) {
      for (var key in group) {
        if (Object.prototype.hasOwnProperty.call(group, key) && word(parts[i], group[key])) return key;
      }
    }
    return null;
  }

  // Позиция слова из группы во фразе — нужна парсеру, чтобы понять,
  // что сказано до предлога, а что после.
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

  window.Match = { word: word, find: find, split: split, findAt: findAt, lev: lev, norm: norm };
})();
