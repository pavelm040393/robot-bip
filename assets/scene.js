// Мир на канвасе: предметы, робот и его движения.
//
// Здесь нет ни одного правила игры — только «поезжай туда», «возьми это»,
// «урони», «станцуй». Что именно брать и когда ошибаться, решает game.js.
// Разделение нужное: правила придётся переписывать после каждой встречи с
// живым ребёнком, а движения останутся теми же.
//
// Рисуется всё примитивами — кругами и прямоугольниками. Это не заглушка и
// не лень: пока не проверено, что робот вообще понимает ребёнка, тратить
// время на художника нельзя. Красивый робот, которого никто не понимает,
// всё равно уедет в стол.
(function () {
  'use strict';

  var cv, ctx, W = 900, H = 520;
  var items = [], robot = null, queue = [], anim = null;
  var FLOOR = 430;

  var SIZE = { big: 46, small: 26 };

  // ── мир ──────────────────────────────────────────────────────────────
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

    robot = { x: 120, y: FLOOR, dir: 1, arm: 0, face: 'calm', hold: [], wobble: 0 };
    queue = [];
    draw();
  }

  function radius(it) { return SIZE[it.size] || SIZE.small; }

  // Все предметы, подходящие под описание. Пустое поле в описании — это
  // «не сказано», то есть подходит любое значение. Отсюда и берётся
  // неоднозначность: «мяч» при трёх мячах вернёт три штуки, и на этом
  // держится вся игра.
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

  // ── очередь движений ─────────────────────────────────────────────────
  // Робот делает по шагу за раз: доехал, потянулся, взял, повёз. Очередь
  // нужна, чтобы game.js писал сценарий целиком и не следил за временем.
  var onDone = null;

  function push(step) { queue.push(step); ensureLoop(); }

  // Вместе с очередью гасим и отложенный колбэк. Иначе при смене уровня
  // опустевшая очередь дёргает then() от прошлой сцены, и робот на новом
  // задании произносит подсказку к предыдущему — «они разного цвета» там,
  // где никаких цветов уже нет.
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
      // Уроненное разлетается в стороны — иначе несколько предметов
      // слипаются в одну кучу и не видно, что их было много.
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
      robot.y = FLOOR - Math.abs(Math.sin(step.t / 90)) * 26;
      if (step.t >= (step.ms || 1800)) { robot.y = FLOOR; queue.shift(); }

    } else if (step.kind === 'shrug') {
      // Растерянность: робот вертит головой, ища то, чего нет.
      step.t = (step.t || 0) + 16;
      robot.dir = Math.sin(step.t / 160) >= 0 ? 1 : -1;
      if (step.t >= (step.ms || 1400)) { robot.dir = 1; queue.shift(); }

    } else {
      queue.shift();
    }

    // Унесённое держится у руки.
    robot.hold.forEach(function (it, i) {
      it.x = robot.x + robot.dir * 44;
      it.y = FLOOR - 62 - i * 30;
    });

    draw();
    anim = requestAnimationFrame(tick);
  }

  // ── рисование ────────────────────────────────────────────────────────
  function draw() {
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);

    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#f7f3e8');
    g.addColorStop(1, '#efe6d2');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#e2d5b8';
    ctx.fillRect(0, FLOOR + 30, W, H - FLOOR - 30);

    items.forEach(function (it) { if (!it.gone) drawItem(it); });
    drawRobot();
  }

  function drawItem(it) {
    var r = radius(it);
    var col = (DICT.colors[it.color] || {}).css || '#888888';

    ctx.save();
    ctx.translate(it.x, it.y);

    ctx.globalAlpha = 0.18;
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.ellipse(0, 6, r * 0.9, r * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.fillStyle = col;
    if (it.type === 'ball') {
      ctx.beginPath();
      ctx.arc(0, -r, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.35)';
      ctx.beginPath();
      ctx.arc(-r * 0.3, -r * 1.35, r * 0.28, 0, Math.PI * 2);
      ctx.fill();

    } else if (it.type === 'cube') {
      ctx.fillRect(-r, -r * 2, r * 2, r * 2);
      ctx.fillStyle = 'rgba(255,255,255,.25)';
      ctx.fillRect(-r, -r * 2, r * 2, r * 0.5);

    } else if (it.type === 'box') {
      var bw = r * 2.4, bh = r * 1.6;
      ctx.fillRect(-bw / 2, -bh, bw, bh);
      ctx.fillStyle = 'rgba(0,0,0,.22)';
      ctx.fillRect(-bw / 2, -bh, bw, bh * 0.22);
    }
    ctx.restore();
  }

  function drawRobot() {
    if (!robot) return;

    ctx.save();
    ctx.translate(robot.x, robot.y);
    ctx.rotate(Math.sin(robot.wobble) * 0.04);

    ctx.globalAlpha = 0.18;
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.ellipse(0, 8, 46, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.fillStyle = '#4a4f58';
    ctx.beginPath(); ctx.arc(-24, -14, 15, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(24, -14, 15, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = '#8fa3b8';
    roundRect(-38, -104, 76, 82, 16);
    ctx.fill();
    ctx.fillStyle = '#7d90a4';
    roundRect(-38, -104, 76, 20, 10);
    ctx.fill();

    ctx.strokeStyle = '#6c7f93';
    ctx.lineWidth = 9;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(robot.dir * 30, -78);
    ctx.lineTo(robot.dir * (44 + robot.arm * 16), -66 + robot.arm * 22);
    ctx.stroke();

    ctx.fillStyle = '#26313d';
    roundRect(-28, -96, 56, 40, 12);
    ctx.fill();

    drawFace();

    ctx.strokeStyle = '#6c7f93';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, -104);
    ctx.lineTo(0, -122);
    ctx.stroke();
    ctx.fillStyle = '#ffb347';
    ctx.beginPath(); ctx.arc(0, -126, 7, 0, Math.PI * 2); ctx.fill();

    ctx.restore();
  }

  // Лицо — единственное, что отличает «ой, я растяпа» от «получилось!».
  // Вся эмоция робота живёт здесь и в движении, слов для этого мало.
  function drawFace() {
    var y = -78;
    ctx.fillStyle = '#8ef0ff';

    if (robot.face === 'confused') {
      ctx.beginPath(); ctx.arc(-11, y, 7, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(11, y - 5, 4, 0, Math.PI * 2); ctx.fill();

    } else if (robot.face === 'happy') {
      ctx.strokeStyle = '#8ef0ff';
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(-11, y + 2, 7, Math.PI, 0); ctx.stroke();
      ctx.beginPath(); ctx.arc(11, y + 2, 7, Math.PI, 0); ctx.stroke();

    } else if (robot.face === 'oops') {
      ctx.beginPath(); ctx.arc(-11, y, 9, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(11, y, 9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#26313d';
      ctx.beginPath(); ctx.arc(-11, y + 2, 4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(11, y + 2, 4, 0, Math.PI * 2); ctx.fill();

    } else {
      ctx.beginPath(); ctx.arc(-11, y, 6, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(11, y, 6, 0, Math.PI * 2); ctx.fill();
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
