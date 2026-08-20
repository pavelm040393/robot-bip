// Разбор фразы в команду.
//
// Никакого разбора языка: берём слова, которые нашлись в словаре, и
// раскладываем по трём корзинам — что делать, с чем, куда. Всё остальное
// во фразе игнорируется, поэтому «ну возьми пожалуйста вон тот красненький
// мячик» и «красный мяч» дают одну и ту же команду.
//
// Предлог делит фразу надвое: «положи МАЛЕНЬКИЙ КУБИК в БОЛЬШУЮ КОРОБКУ».
// До предлога — что берём, после — куда кладём. Без этого деления два
// набора признаков в одной фразе не различить.
//
//   Parser.parse('положи красный мяч в коробку') →
//   { action:'put', target:{type:'ball',color:'red'}, dest:{type:'box'} }
(function () {
  'use strict';

  // Признаки предмета из куска фразы. Пустые поля означают «не сказано» —
  // именно они и порождают неоднозначность, на которой держится вся игра.
  function thing(parts) {
    var d = {
      type:  pick(parts, DICT.types),
      color: pick(parts, DICT.colors),
      size:  pick(parts, DICT.sizes)
    };
    return (d.type || d.color || d.size) ? d : null;
  }

  function pick(parts, group) {
    var hit = Match.findAt(parts, group);
    return hit ? hit.key : null;
  }

  function parse(phrase) {
    var parts = Match.split(phrase);
    if (!parts.length) return empty(phrase);

    var act = Match.findAt(parts, DICT.actions);
    var prep = Match.findAt(parts, DICT.preps);

    // Предлог до действия — не разделитель, а мусор распознавания
    // («в общем, возьми мяч»). Считаем, что его нет.
    if (prep && act && prep.at < act.at) prep = null;

    var head = prep ? parts.slice(0, prep.at) : parts;
    var tail = prep ? parts.slice(prep.at + 1) : [];

    return {
      phrase: phrase,
      action: act ? act.key : null,
      target: thing(head),
      dest:   tail.length ? thing(tail) : null,
      prep:   prep ? prep.key : null
    };
  }

  function empty(phrase) {
    return { phrase: phrase, action: null, target: null, dest: null, prep: null };
  }

  // Человеческая запись команды — для журнала на экране и для отладки.
  function describe(cmd) {
    if (!cmd.action && !cmd.target) return 'ничего не понял';
    var out = cmd.action ? DICT.actions[cmd.action].title : '?';
    if (cmd.target) out += ' ' + thingText(cmd.target);
    if (cmd.dest) out += ' → ' + thingText(cmd.dest);
    return out;
  }

  function thingText(t) {
    var s = [];
    if (t.size) s.push(DICT.sizes[t.size].title);
    if (t.color) s.push(DICT.colors[t.color].title);
    if (t.type) s.push(DICT.types[t.type].title);
    return s.join(' ') || 'что-то';
  }

  window.Parser = { parse: parse, describe: describe, thingText: thingText };
})();
