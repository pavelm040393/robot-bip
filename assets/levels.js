// The levels — layout only. Every word a person reads or hears lives in
// i18n.js, indexed by position in this array.
//
// A level is not a "difficulty step" but ONE new word the child cannot do
// without. The scene is always arranged so that the short command is bound to
// go wrong: say "take the ball" with three balls on the floor and the robot
// scoops up all three. That is the lesson, and it needs no moralising.
//
// goal — a description of the thing that must no longer be lying around.
// Something held in the hand or tucked into a box drops out of the check, so
// the same rule serves both "take" and "put".
(function () {
  'use strict';

  window.LEVELS = [
    {
      // Colour. The first property children get a handle on.
      items: [
        { type: 'ball', color: 'red',    size: 'small', x: 330 },
        { type: 'ball', color: 'blue',   size: 'small', x: 520 },
        { type: 'ball', color: 'yellow', size: 'small', x: 710 }
      ],
      goal: { type: 'ball', color: 'red' }
    },

    {
      // Size. Colour is no help here — both balls are blue.
      items: [
        { type: 'ball', color: 'blue', size: 'big',   x: 380 },
        { type: 'ball', color: 'blue', size: 'small', x: 640 }
      ],
      goal: { type: 'ball', color: 'blue', size: 'big' }
    },

    {
      // The kind of thing. Same colour, same size.
      items: [
        { type: 'ball', color: 'yellow', size: 'small', x: 380 },
        { type: 'cube', color: 'yellow', size: 'small', x: 620 }
      ],
      goal: { type: 'cube', color: 'yellow' }
    },

    {
      // Two properties at once. Either one alone still leaves two candidates.
      items: [
        { type: 'cube', color: 'red',   size: 'big',   x: 300 },
        { type: 'cube', color: 'red',   size: 'small', x: 460 },
        { type: 'cube', color: 'green', size: 'big',   x: 620 },
        { type: 'cube', color: 'green', size: 'small', x: 780 }
      ],
      goal: { type: 'cube', color: 'red', size: 'big' }
    },

    {
      // A preposition: now there is a destination, not just a thing.
      items: [
        { type: 'ball', color: 'red',   size: 'small', x: 330 },
        { type: 'cube', color: 'blue',  size: 'small', x: 470 },
        { type: 'box',  color: 'green', size: 'big',   x: 730 }
      ],
      goal: { type: 'ball', color: 'red' }
    },

    {
      // Two boxes: the ambiguity moves to the destination. The child already
      // knows how to pin down a thing — now the same trick applies to "where".
      items: [
        { type: 'ball', color: 'yellow', size: 'small', x: 380 },
        { type: 'box',  color: 'red',    size: 'big',   x: 620 },
        { type: 'box',  color: 'blue',   size: 'big',   x: 800 }
      ],
      goal: { type: 'ball', color: 'yellow' }
    }
  ];
})();
