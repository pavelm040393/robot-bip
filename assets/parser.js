// Turning a sentence into a command.
//
// No language parsing at all: collect the words that exist in the dictionary
// and sort them into three buckets — what to do, with which thing, where to.
// Everything else in the sentence is ignored, which is why "well please pick
// up that little red ball over there" and "take the red ball" produce exactly
// the same command.
//
// The preposition cuts the sentence in half: "put the SMALL CUBE in the BIG
// BOX". Before it — what we pick up, after it — where it goes. Without that
// cut, two sets of adjectives in one sentence cannot be told apart.
//
//   Parser.parse('put the red ball in the box') →
//   { action:'put', target:{type:'ball',color:'red'}, dest:{type:'box'} }
(function () {
  'use strict';

  // Properties of a thing, taken from one half of the sentence. Empty fields
  // mean "not said" — and those are exactly what create the ambiguity the
  // whole game rests on.
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

    // A preposition before the verb is noise, not a separator ("in any case,
    // take the ball"). Treat it as absent.
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

  // A human-readable command — for the on-screen log and for debugging.
  function describe(cmd) {
    if (!cmd.action && !cmd.target) return Lang.t('ui.nothing');
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
    return s.join(' ') || Lang.t('ui.something');
  }

  window.Parser = { parse: parse, describe: describe, thingText: thingText };
})();
