// The world on the canvas: things, the robot, and how it moves.
//
// Not a single game rule lives here — only "drive there", "grab that", "drop
// it", "dance". What to grab and when to fail is decided by game.js. The
// split is deliberate: the rules will be rewritten after every session with a
// real child, while the movements stay as they are.
//
// The look is cartoon, and that is a working decision rather than decoration:
// a four-year-old reads a face long before they read a word. So everything is
// drawn the way a children's cartoon draws it — one dark ink outline around
// every shape, few but saturated colours, oversized eyes, and a mouth that
// carries the emotion. The robot's feelings have to survive being watched
// from across the room with the sound off.
//
// Two rules keep the picture honest:
//   · the outline is always the same ink colour, so the scene reads as one
//     drawing rather than a pile of clip-art;
//   · a thing's colour is the one property a child must be able to name, so
//     highlights and shading stay on the same hue. A red ball lit orange
//     stops being red to a child, and the level quietly breaks.
(function () {
  'use strict';

  var cv, ctx, W = 900, H = 520;
  var items = [], robot = null, queue = [], anim = null;
  var FLOOR = 430;

  var SIZE = { big: 46, small: 26 };

  // ── the world ────────────────────────────────────────────────────────
  function setup(canvas, level) {
    cv = canvas;
    ctx = cv.getContext('2d');
    cv.width = W; cv.height = H;

    items = (level.items || []).map(function (it, i) {
      return {
        id: it.id || ('it' + i),
        type: it.type, color: it.color, size: it.size || 'small',
        x: it.x, y: it.y === undefined ? FLOOR : it.y,
        held: false, gone: false
      };
    });

    robot = { x: 120, y: FLOOR, dir: 1, arm: 0, face: 'calm', hold: [], wobble: 0, squash: 1 };
    queue = [];
    draw();
  }

  function radius(it) { return SIZE[it.size] || SIZE.small; }

  // Every thing matching a description. An empty field means "not said", so
  // any value fits. That is where the ambiguity comes from: "ball" with three
  // balls on the floor returns three — and the whole game rests on it.
  function match(desc) {
    if (!desc) return [];
    return items.filter(function (it) {
      if (it.gone || it.held) return false;
      if (desc.type && it.type !== desc.type) return false;
      if (desc.color && it.color !== desc.color) return false;
      if (desc.size && it.size !== desc.size) return false;
      return true;
    });
  }

  function all() { return items.filter(function (it) { return !it.gone; }); }

  // ── the movement queue ───────────────────────────────────────────────
  // The robot does one step at a time: drove up, reached out, grabbed,
  // carried. The queue lets game.js write the whole script at once instead of
  // juggling timers.
  var onDone = null;

  function push(step) { queue.push(step); ensureLoop(); }

  // Clearing the queue also cancels the pending callback. Otherwise, when the
  // level changes, the emptied queue fires then() from the previous scene and
  // the robot delivers a hint about the old task — "they're different
  // colours" on a level where no colours are involved.
  function clear() { queue = []; onDone = null; }

  function busy() { return queue.length > 0; }
  function then(fn) { onDone = fn; }

  function ensureLoop() {
    if (!anim) anim = requestAnimationFrame(tick);
  }

  function tick() {
    var step = queue[0];

    if (!step) {
      anim = null;
      draw();
      if (onDone) { var f = onDone; onDone = null; f(); }
      return;
    }

    if (step.kind === 'go') {
      var dx = step.x - robot.x;
      robot.dir = dx >= 0 ? 1 : -1;
      if (Math.abs(dx) < 4) { robot.x = step.x; queue.shift(); }
      else robot.x += (dx > 0 ? 1 : -1) * Math.min(7, Math.abs(dx) * 0.12 + 2);
      robot.wobble += 0.25;

    } else if (step.kind === 'arm') {
      robot.arm += (step.to - robot.arm) * 0.2;
      if (Math.abs(step.to - robot.arm) < 0.02) { robot.arm = step.to; queue.shift(); }

    } else if (step.kind === 'grab') {
      step.it.held = true;
      robot.hold.push(step.it);
      queue.shift();

    } else if (step.kind === 'drop') {
      // Dropped things scatter sideways; otherwise several of them land in
      // one heap and you cannot see that there were many.
      var it = robot.hold.shift();
      if (it) {
        it.held = false;
        it.y = FLOOR;
        it.x = Math.max(70, Math.min(W - 70, robot.x + (Math.random() * 160 - 80)));
      }
      if (!robot.hold.length) queue.shift();

    } else if (step.kind === 'into') {
      var got = robot.hold.shift();
      if (got) got.gone = true;
      if (!robot.hold.length) queue.shift();

    } else if (step.kind === 'face') {
      robot.face = step.face;
      queue.shift();

    } else if (step.kind === 'wait') {
      step.t = (step.t || 0) + 16;
      if (step.t >= step.ms) queue.shift();

    } else if (step.kind === 'dance') {
      step.t = (step.t || 0) + 16;
      robot.wobble += 0.4;
      var lift = Math.abs(Math.sin(step.t / 90));
      robot.y = FLOOR - lift * 26;
      // Squash and stretch — the oldest trick in cartoon animation and the
      // cheapest one here: the robot stretches as it flies and flattens as it
      // lands. Without it a jump reads as a picture being slid up and down.
      robot.squash = 1 + lift * 0.1;
      if (step.t >= (step.ms || 1800)) { robot.y = FLOOR; robot.squash = 1; queue.shift(); }

    } else if (step.kind === 'shrug') {
      // Bewilderment: the robot swings its head around looking for something
      // that is not there.
      step.t = (step.t || 0) + 16;
      robot.dir = Math.sin(step.t / 160) >= 0 ? 1 : -1;
      if (step.t >= (step.ms || 1400)) { robot.dir = 1; queue.shift(); }

    } else {
      queue.shift();
    }

    // Whatever is being carried stays by the robot's hand — far enough out
    // that the claw holding it stays visible past the body.
    robot.hold.forEach(function (it, i) {
      it.x = robot.x + robot.dir * 54;
      it.y = FLOOR - 62 - i * 30;
    });

    draw();
    anim = requestAnimationFrame(tick);
  }

  // ── the palette ──────────────────────────────────────────────────────
  // Colours live here rather than in the dictionary: the dictionary is about
  // words a child might say, and it is swapped out when the language changes.
  //
  // Every colour comes as three tones — lit, base, shaded. Cartoon shading is
  // flat: two or three steps of one hue, never a soft airbrush.
  var PAINT = {
    red:    { main: '#f2543d', light: '#ff8d76', dark: '#bf3520' },
    blue:   { main: '#3f8ce8', light: '#83bcff', dark: '#255fa8' },
    yellow: { main: '#f8c62f', light: '#ffe483', dark: '#c58f0d' },
    green:  { main: '#4cbf6d', light: '#92e3a5', dark: '#2d8748' }
  };
  var GREY = { main: '#9aa3ae', light: '#c8ced6', dark: '#6c7681' };

  // One ink for every outline in the scene. Not pure black: black outlines
  // look printed, a dark warm violet looks drawn.
  var INK = '#2f2a3f';

  function paint(name) { return PAINT[name] || GREY; }

  function ink(w) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = w;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
  }

  // ── drawing ──────────────────────────────────────────────────────────
  function draw() {
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);

    drawRoom();

    // Things on the floor first, the robot next, and whatever it is holding
    // last — so a ball in the claw is plainly in front of the robot instead
    // of being swallowed by its body.
    items.forEach(function (it) { if (!it.gone && !it.held) drawItem(it); });
    drawRobot();
    items.forEach(function (it) { if (!it.gone && it.held) drawItem(it); });
  }

  // A child's room rather than an abstract field: the game is about toys on
  // the floor, and a familiar place raises no questions.
  //
  // The wall stops well ABOVE the line the toys stand on. Put the join at
  // their feet instead and everything in the room looks stuck to the wall
  // like a fridge magnet — the floor needs depth in front of the skirting
  // board for the toys to stand in.
  var FLOOR_LINE = FLOOR - 46;

  function drawRoom() {
    var wall = ctx.createLinearGradient(0, 0, 0, FLOOR_LINE);
    wall.addColorStop(0, '#bfe7f4');
    wall.addColorStop(1, '#eaf7fa');
    ctx.fillStyle = wall;
    ctx.fillRect(0, 0, W, FLOOR_LINE);

    wallpaper();
    windowFrame(636, 58, 214, 156);
    bunting();
    floorBoards();
  }

  // Wallpaper dots, faint on purpose: the wall must never compete with the
  // four toy colours the child has to tell apart.
  function wallpaper() {
    ctx.fillStyle = 'rgba(255,255,255,.5)';
    for (var y = 46; y < FLOOR_LINE - 30; y += 62) {
      for (var x = 34 + ((y / 62) % 2) * 31; x < W - 20; x += 62) {
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function windowFrame(x, y, w, h) {
    ctx.save();

    // The sky and everything in it is clipped to the frame, so the sun can
    // sit half behind the sash without escaping onto the wallpaper.
    ctx.save();
    roundRect(x, y, w, h, 16);
    ctx.clip();

    var sky = ctx.createLinearGradient(0, y, 0, y + h);
    sky.addColorStop(0, '#6fc4ee');
    sky.addColorStop(1, '#c8ecfb');
    ctx.fillStyle = sky;
    ctx.fillRect(x, y, w, h);

    // A sun with the straight little rays a child draws themselves.
    var sx = x + w * 0.72, sy = y + h * 0.28;
    ctx.strokeStyle = '#ffd34d';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    for (var i = 0; i < 8; i++) {
      var a = i * Math.PI / 4;
      ctx.beginPath();
      ctx.moveTo(sx + Math.cos(a) * 30, sy + Math.sin(a) * 30);
      ctx.lineTo(sx + Math.cos(a) * 42, sy + Math.sin(a) * 42);
      ctx.stroke();
    }
    ctx.fillStyle = '#ffd94f';
    ctx.beginPath(); ctx.arc(sx, sy, 24, 0, Math.PI * 2); ctx.fill();

    cloud(x + 46, y + 54, 26);
    cloud(x + 150, y + 116, 19);

    ctx.restore();

    // Frame and sash, drawn over the clipped sky.
    ctx.strokeStyle = '#fdfbf4';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w / 2, y + h);
    ctx.moveTo(x, y + h / 2); ctx.lineTo(x + w, y + h / 2);
    ctx.stroke();

    ink(6);
    roundRect(x, y, w, h, 16);
    ctx.stroke();

    // A sill: without it the window floats off the wall.
    ctx.fillStyle = '#fdfbf4';
    roundRect(x - 8, y + h - 2, w + 16, 11, 5);
    ctx.fill();
    ink(5);
    roundRect(x - 8, y + h - 2, w + 16, 11, 5);
    ctx.stroke();

    // Curtains and a rail. Without them a bright rectangle on a wall reads as
    // a television, and the sunshine outside stops being outside.
    ctx.strokeStyle = INK;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(x - 26, y - 12);
    ctx.lineTo(x + w + 26, y - 12);
    ctx.stroke();
    ctx.fillStyle = '#f8c62f';
    [x - 26, x + w + 26].forEach(function (kx) {
      ctx.beginPath();
      ctx.arc(kx, y - 12, 7, 0, Math.PI * 2);
      ctx.fill();
      ink(3);
      ctx.stroke();
    });

    curtain(x - 10, y - 16, 62, h * 0.82);
    curtain(x + w + 10, y - 16, -62, h * 0.82);

    ctx.restore();
  }

  // One curtain panel. The width is signed: positive hangs to the right of
  // the given edge, negative to the left, so both sides come from one shape.
  function curtain(x, y, w, h) {
    ctx.fillStyle = '#f6c6d0';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w, y + h * 0.82);
    // A scalloped hem — a straight cut looks like cardboard.
    ctx.quadraticCurveTo(x + w * 0.72, y + h * 1.05, x + w * 0.45, y + h * 0.86);
    ctx.quadraticCurveTo(x + w * 0.2, y + h * 0.7, x, y + h * 0.92);
    ctx.closePath();
    ctx.fill();
    ink(4);
    ctx.stroke();

    ctx.strokeStyle = '#e7a5b6';
    ctx.lineWidth = 3;
    [0.35, 0.65].forEach(function (k) {
      ctx.beginPath();
      ctx.moveTo(x + w * k, y + 6);
      ctx.lineTo(x + w * k, y + h * (0.78 - k * 0.12));
      ctx.stroke();
    });
  }

  function cloud(x, y, r) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.arc(x + r * 0.9, y + r * 0.2, r * 0.72, 0, Math.PI * 2);
    ctx.arc(x - r * 0.9, y + r * 0.25, r * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }

  // A string of flags along the top of the wall. Decoration, and it earns its
  // place: it says "this is a party" before a single word is spoken.
  function bunting() {
    var FLAGS = ['#f2543d', '#f8c62f', '#4cbf6d', '#3f8ce8', '#f0782f', '#8f6ee0'];
    var x0 = -10, x1 = 596, y0 = 24, cx = (x0 + x1) / 2, cy = y0 + 92, y1 = y0 + 4;

    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo(cx, cy, x1, y1);
    ctx.stroke();

    for (var i = 0; i <= 9; i++) {
      var t = i / 9, u = 1 - t;
      // A point on the same quadratic the string follows, so the flags hang
      // from the rope instead of hovering near it.
      var px = u * u * x0 + 2 * u * t * cx + t * t * x1;
      var py = u * u * y0 + 2 * u * t * cy + t * t * y1;

      ctx.fillStyle = FLAGS[i % FLAGS.length];
      ctx.beginPath();
      ctx.moveTo(px - 13, py);
      ctx.lineTo(px + 13, py);
      ctx.lineTo(px, py + 30);
      ctx.closePath();
      ctx.fill();
      ink(3);
      ctx.stroke();
    }
  }

  function floorBoards() {
    var fl = ctx.createLinearGradient(0, FLOOR_LINE, 0, H);
    fl.addColorStop(0, '#f3cd97');
    fl.addColorStop(1, '#dfae6c');
    ctx.fillStyle = fl;
    ctx.fillRect(0, FLOOR_LINE, W, H - FLOOR_LINE);

    // Boards fanning out towards the viewer — all the perspective this scene
    // needs to stop being a flat coloured strip.
    ctx.strokeStyle = 'rgba(150,101,45,.35)';
    ctx.lineWidth = 2;
    for (var i = 0; i <= 9; i++) {
      var x = i * (W / 9);
      ctx.beginPath();
      ctx.moveTo(x, FLOOR_LINE);
      ctx.lineTo(x + (x - W / 2) * 0.16, H);
      ctx.stroke();
    }

    // Skirting board: the line where the wall stops and the floor begins. It
    // is what makes the toys stand on something instead of floating.
    ctx.fillStyle = '#fdfbf4';
    ctx.fillRect(0, FLOOR_LINE - 15, W, 15);
    // Thinner ink than the objects get. A full-width line at object weight
    // cuts the picture in half and pulls the eye away from the toys.
    ink(3);
    ctx.beginPath();
    ctx.moveTo(0, FLOOR_LINE - 15); ctx.lineTo(W, FLOOR_LINE - 15);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(150,101,45,.45)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, FLOOR_LINE); ctx.lineTo(W, FLOOR_LINE);
    ctx.stroke();

    rug();
  }

  // The rug the toys stand on. It gathers the scene into one place: without
  // it the things look scattered over a floor, with it they look like they
  // are lying where the child plays.
  function rug() {
    ctx.save();
    ctx.translate(470, 452);

    ctx.fillStyle = '#f7e6d4';
    ctx.beginPath();
    ctx.ellipse(0, 0, 392, 56, 0, 0, Math.PI * 2);
    ctx.fill();
    ink(4);
    ctx.stroke();

    ctx.strokeStyle = '#e9cdae';
    ctx.lineWidth = 5;
    [0.72, 0.46].forEach(function (k) {
      ctx.beginPath();
      ctx.ellipse(0, 0, 392 * k, 56 * k, 0, 0, Math.PI * 2);
      ctx.stroke();
    });

    ctx.restore();
  }

  // A soft shadow tying a thing to the floor.
  function shadow(rx) {
    ctx.save();
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = '#3a2b12';
    ctx.beginPath();
    ctx.ellipse(0, 6, rx, rx * 0.26, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawItem(it) {
    var r = radius(it);
    var c = paint(it.color);

    ctx.save();
    ctx.translate(it.x, it.y);

    // A thing on the floor is drawn standing on its point; a thing in the
    // claw is drawn centred on it, so it sits in the grip instead of hovering
    // a radius above it.
    if (it.held) ctx.translate(0, r * 0.9);
    else shadow(r * 0.95);

    if (it.type === 'ball') drawBall(r, c);
    else if (it.type === 'cube') drawCube(r, c);
    else if (it.type === 'box') drawBox(r, c);

    ctx.restore();
  }

  function drawBall(r, c) {
    var g = ctx.createRadialGradient(-r * 0.35, -r * 1.4, r * 0.15, 0, -r, r * 1.25);
    g.addColorStop(0, c.light);
    g.addColorStop(0.55, c.main);
    g.addColorStop(1, c.dark);

    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, -r, r, 0, Math.PI * 2);
    ctx.fill();
    ink(Math.max(3, r * 0.1));
    ctx.stroke();

    // The white seam of a beach ball. White rather than a second colour on
    // purpose: a red ball with a blue stripe is no longer "the red one". Kept
    // upright too — tilted, it reads as a painted-on digit.
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, -r, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    ctx.beginPath();
    ctx.ellipse(0, -r, r * 0.36, r * 1.05, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.12)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = 'rgba(255,255,255,.75)';
    ctx.beginPath();
    ctx.ellipse(-r * 0.34, -r * 1.42, r * 0.26, r * 0.17, -0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // A cube gets a top and a side face as well as a front. Drawn flat-on it
  // reads as a square, and a four-year-old calls a square a picture, not a
  // block.
  function drawCube(r, c) {
    var s = r * 1.75, d = r * 0.5, x = -r * 0.9, top = -s - d;

    ctx.fillStyle = c.light;
    ctx.beginPath();
    ctx.moveTo(x, top + d);
    ctx.lineTo(x + d, top);
    ctx.lineTo(x + d + s, top);
    ctx.lineTo(x + s, top + d);
    ctx.closePath();
    ctx.fill();
    ink(3);
    ctx.stroke();

    ctx.fillStyle = c.dark;
    ctx.beginPath();
    ctx.moveTo(x + s, top + d);
    ctx.lineTo(x + d + s, top);
    ctx.lineTo(x + d + s, top + s);
    ctx.lineTo(x + s, top + d + s);
    ctx.closePath();
    ctx.fill();
    ink(3);
    ctx.stroke();

    ctx.fillStyle = c.main;
    roundRect(x, top + d, s, s, r * 0.16);
    ctx.fill();
    ink(3.5);
    ctx.stroke();

    // The rounded stud every toy block has.
    ctx.fillStyle = 'rgba(255,255,255,.5)';
    ctx.beginPath();
    ctx.arc(x + s / 2, top + d + s / 2, s * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ink(2.5);
    ctx.stroke();
  }

  // The toy box: a crate with the lid thrown open, because the child has to
  // see that things go INTO it. A closed lid turns "put the ball in the box"
  // into a guess.
  function drawBox(r, c) {
    var bw = r * 2.6, bh = r * 1.7, x = -bw / 2, y = -bh;

    // The lid pivots on the back corner of the crate. Drawn free-floating it
    // looks like a plank someone left balanced on top.
    ctx.save();
    ctx.translate(x + 5, y + 7);
    ctx.rotate(-0.55);
    ctx.fillStyle = c.light;
    roundRect(0, -14, bw * 0.95, 14, 5);
    ctx.fill();
    ink(3.5);
    roundRect(0, -14, bw * 0.95, 14, 5);
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = c.dark;
    ctx.beginPath();
    ctx.arc(x + 5, y + 7, 5, 0, Math.PI * 2);
    ctx.fill();
    ink(3);
    ctx.stroke();

    // The dark mouth of the crate, so it is visibly hollow.
    ctx.fillStyle = '#3b3448';
    ctx.beginPath();
    ctx.ellipse(0, y + 6, bw / 2 - 4, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = c.main;
    ctx.beginPath();
    ctx.moveTo(x, y + 6);
    ctx.lineTo(x + bw, y + 6);
    ctx.lineTo(x + bw - 5, 0);
    ctx.lineTo(x + 5, 0);
    ctx.closePath();
    ctx.fill();
    ink(4);
    ctx.stroke();

    // Planks and a band across them: a crate, not a coloured bucket.
    ctx.strokeStyle = c.dark;
    ctx.lineWidth = 2.5;
    for (var i = 1; i < 4; i++) {
      var t = i / 4;
      ctx.beginPath();
      ctx.moveTo(x + bw * t, y + 7);
      ctx.lineTo(x + 5 + (bw - 10) * t, -1);
      ctx.stroke();
    }
    ctx.fillStyle = c.dark;
    ctx.fillRect(x + 3, y + bh * 0.55, bw - 6, 5);
  }

  // ── the robot ────────────────────────────────────────────────────────
  var SHELL = '#dfe8f2', SHELL_DARK = '#b6c6d8', METAL = '#8fa3b8';

  function drawRobot() {
    if (!robot) return;

    var sq = robot.squash || 1;

    ctx.save();
    ctx.translate(robot.x, robot.y);

    ctx.save();
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = '#3a2b12';
    ctx.beginPath();
    ctx.ellipse(0, 8, 48, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Squash and stretch is applied around the wheels rather than the middle,
    // so the robot keeps its feet on the ground while the body springs.
    ctx.scale(1 / sq, sq);
    ctx.rotate(Math.sin(robot.wobble) * 0.035);

    wheels();
    body();
    arm();
    head();

    ctx.restore();
  }

  function wheels() {
    [-25, 25].forEach(function (wx) {
      ctx.save();
      ctx.translate(wx, -16);

      ctx.fillStyle = '#4a4f58';
      ctx.beginPath(); ctx.arc(0, 0, 17, 0, Math.PI * 2); ctx.fill();
      ink(4); ctx.stroke();

      // The hub turns with the robot's own wobble, and wobble only grows
      // while it is driving — so the wheels stop when the robot stops.
      ctx.rotate(robot.wobble * 0.6);
      ctx.fillStyle = '#ffd34d';
      ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();
      ink(3); ctx.stroke();

      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.5;
      for (var i = 0; i < 3; i++) {
        var a = i * Math.PI * 2 / 3;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 3, Math.sin(a) * 3);
        ctx.lineTo(Math.cos(a) * 7, Math.sin(a) * 7);
        ctx.stroke();
      }
      ctx.restore();
    });
  }

  function body() {
    var g = ctx.createLinearGradient(0, -104, 0, -20);
    g.addColorStop(0, SHELL);
    g.addColorStop(1, SHELL_DARK);

    ctx.fillStyle = g;
    roundRect(-38, -104, 76, 86, 28);
    ctx.fill();
    ink(5);
    roundRect(-38, -104, 76, 86, 28);
    ctx.stroke();

    // A belly panel with three lamps. Children read lamps as "it is alive"
    // faster than any amount of detail anywhere else.
    ctx.fillStyle = '#cbd8e6';
    roundRect(-24, -84, 48, 40, 14);
    ctx.fill();
    ink(3.5);
    roundRect(-24, -84, 48, 40, 14);
    ctx.stroke();

    ['#f2543d', '#f8c62f', '#4cbf6d'].forEach(function (col, i) {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(-13 + i * 13, -71, 5, 0, Math.PI * 2);
      ctx.fill();
      ink(2.5);
      ctx.stroke();
    });

    ctx.fillStyle = 'rgba(255,255,255,.55)';
    roundRect(-31, -98, 13, 30, 6);
    ctx.fill();
  }

  // One arm, on whichever side the robot is facing. Two segments with a
  // visible elbow: a straight stick looks like a pointer, a bent arm looks
  // like something reaching for a toy.
  function arm() {
    var d = robot.dir;
    var sx = d * 30, sy = -80;
    var ex = d * (46 + robot.arm * 14), ey = -64 + robot.arm * 26;
    var mx = d * (44 + robot.arm * 6), my = sy + (ey - sy) * 0.35;

    // Drawn twice: an ink pass underneath, then the metal on top of it. That
    // is how a cartoon gets an outline around a stroked line, and without the
    // outline the arm reads as a thin pointer rather than a limb.
    [[INK, 17], [METAL, 12]].forEach(function (pass) {
      ctx.strokeStyle = pass[0];
      ctx.lineWidth = pass[1];
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(mx, my);
      ctx.lineTo(ex, ey);
      ctx.stroke();
    });

    ctx.fillStyle = '#cbd8e6';
    ctx.beginPath();
    ctx.arc(mx, my, 7, 0, Math.PI * 2);
    ctx.fill();
    ink(3);
    ctx.stroke();

    // The claw opens as the arm reaches down. The two fingers start apart
    // rather than from one point — meeting at a single spot they read as an
    // arrowhead pointing at the toy, not as something that can hold it.
    var spread = 0.5 + robot.arm * 0.55;
    [[INK, 12], [METAL, 7]].forEach(function (pass) {
      ctx.strokeStyle = pass[0];
      ctx.lineWidth = pass[1];
      [-1, 1].forEach(function (s) {
        ctx.beginPath();
        ctx.moveTo(ex, ey + s * 4);
        ctx.lineTo(ex + d * 13, ey + s * 16 * spread);
        ctx.stroke();
      });
    });
  }

  function head() {
    ctx.strokeStyle = METAL;
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.moveTo(0, -100);
    ctx.lineTo(0, -112);
    ctx.stroke();

    // The antenna leans with the robot's wobble, so the head never looks
    // bolted down.
    var lean = Math.sin(robot.wobble * 0.7) * 8;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, -160);
    ctx.quadraticCurveTo(lean * 0.6, -176, lean, -186);
    ctx.stroke();
    ctx.fillStyle = '#ffd34d';
    ctx.beginPath();
    ctx.arc(lean, -191, 8, 0, Math.PI * 2);
    ctx.fill();
    ink(3.5);
    ctx.stroke();

    var g = ctx.createLinearGradient(0, -162, 0, -106);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(1, SHELL);

    ctx.fillStyle = g;
    roundRect(-40, -162, 80, 56, 22);
    ctx.fill();
    ink(5);
    roundRect(-40, -162, 80, 56, 22);
    ctx.stroke();

    [-48, 40].forEach(function (ex) {
      ctx.fillStyle = '#cbd8e6';
      roundRect(ex, -146, 8, 20, 4);
      ctx.fill();
      ink(3);
      roundRect(ex, -146, 8, 20, 4);
      ctx.stroke();
    });

    // The visor. Everything expressive happens inside it.
    ctx.fillStyle = '#2b3444';
    roundRect(-31, -154, 62, 34, 16);
    ctx.fill();
    ink(4);
    roundRect(-31, -154, 62, 34, 16);
    ctx.stroke();

    drawFace();
    cheeks();
    mouth();
  }

  // The face is the only thing separating "oops, I'm a klutz" from "I did
  // it!". All of the robot's emotion lives here and in how it moves — words
  // alone are not enough, especially for a child who cannot read.
  //
  // The eyes are deliberately far too big: that is how a cartoon signals a
  // friendly character, and it is what keeps the failures funny rather than
  // frightening. Nobody is scared of something with saucer eyes.
  function drawFace() {
    var y = -137, EYE = '#8ef0ff';

    function eye(cx, r, pupil) {
      ctx.fillStyle = EYE;
      ctx.beginPath(); ctx.arc(cx, y, r, 0, Math.PI * 2); ctx.fill();
      if (pupil) {
        ctx.fillStyle = '#1d2430';
        ctx.beginPath(); ctx.arc(cx, y + 1, r * 0.42, 0, Math.PI * 2); ctx.fill();
      }
      // The glint. One white dot is the whole difference between an eye and
      // a lamp.
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(cx - r * 0.34, y - r * 0.4, r * 0.24, 0, Math.PI * 2); ctx.fill();
    }

    if (robot.face === 'confused') {
      eye(-13, 9, true);
      eye(13, 5, false);

    } else if (robot.face === 'happy') {
      // Eyes screwed shut with delight: two arches, the oldest happy face
      // there is.
      ctx.strokeStyle = EYE;
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(-13, y + 3, 9, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
      ctx.beginPath(); ctx.arc(13, y + 3, 9, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();

    } else if (robot.face === 'oops') {
      eye(-13, 11, true);
      eye(13, 11, true);

    } else {
      eye(-13, 8, true);
      eye(13, 8, true);
    }
  }

  // Blush. Two pink smudges do more for warmth than any amount of shading.
  function cheeks() {
    var strong = robot.face === 'happy' || robot.face === 'oops';
    ctx.save();
    ctx.globalAlpha = strong ? 0.55 : 0.3;
    ctx.fillStyle = '#ff8aa0';
    [-1, 1].forEach(function (s) {
      ctx.beginPath();
      ctx.ellipse(s * 33, -117, 9, 6, 0, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  function mouth() {
    var y = -114;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';

    if (robot.face === 'happy') {
      ctx.beginPath(); ctx.arc(0, y - 5, 13, 0.12 * Math.PI, 0.88 * Math.PI); ctx.stroke();

    } else if (robot.face === 'oops') {
      // A round "o" of dismay — the shape a child's own mouth makes when
      // something falls.
      ctx.fillStyle = '#2b3444';
      ctx.beginPath(); ctx.ellipse(0, y, 6, 7, 0, 0, Math.PI * 2); ctx.fill();
      ctx.stroke();

    } else if (robot.face === 'confused') {
      // A wavy line: puzzled, not unhappy. A downturned mouth would read as
      // "you did something wrong", and that is the one thing forbidden here.
      ctx.beginPath();
      ctx.moveTo(-9, y);
      ctx.quadraticCurveTo(-4, y - 5, 0, y);
      ctx.quadraticCurveTo(4, y + 5, 9, y);
      ctx.stroke();

    } else {
      ctx.beginPath(); ctx.arc(0, y - 4, 9, 0.16 * Math.PI, 0.84 * Math.PI); ctx.stroke();
    }
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  window.Scene = {
    setup: setup, match: match, all: all,
    push: push, clear: clear, busy: busy, then: then, draw: draw,
    robot: function () { return robot; },
    floor: FLOOR, width: W
  };
})();
