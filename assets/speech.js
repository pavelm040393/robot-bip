// Уши и голос робота.
//
// Уши — Web Speech API. Две вещи, которые надо знать до того, как начнёте
// отлаживать:
//   · работает только в Chrome и Edge, и только по https или с localhost;
//   · звук уходит на серверы Google. Дома это терпимо, но если проект
//     когда-нибудь выйдет наружу — либо честно предупредить, либо менять
//     на локальный Whisper. Голос ребёнка — не то, что раздают молча.
//
// Chrome обрывает распознавание сам: по тишине, по таймауту, иногда просто
// так. Поэтому здесь есть перезапуск — без него микрофон умирает через
// полминуты, и выглядит это как «игра сломалась».
//
// Голос — Speech Synthesis. Русские голоса в системе звучат механически, и
// роботу это только на пользу: живой тёплый голос от железного персонажа
// сбивает с толку сильнее, чем помогает.
(function () {
  'use strict';

  var rec = null, running = false, wanted = false;
  var onPhrase = null, onState = null;

  function supported() {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  function create() {
    var Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
    var r = new Rec();
    r.lang = 'ru-RU';
    r.continuous = true;
    r.interimResults = true;
    r.maxAlternatives = 3;

    r.onresult = function (e) {
      for (var i = e.resultIndex; i < e.results.length; i++) {
        var res = e.results[i];
        var text = res[0].transcript.trim();
        if (!text) continue;

        if (res.isFinal) {
          // Альтернативы копим все: дети говорят невнятно, и нужный
          // вариант нередко оказывается вторым, а не первым.
          var alts = [];
          for (var k = 0; k < res.length; k++) alts.push(res[k].transcript.trim());
          if (onPhrase) onPhrase(text, alts);
        } else if (onState) {
          onState('hearing', text);
        }
      }
    };

    r.onerror = function (e) {
      // no-speech и aborted — обычная жизнь, а не поломка: ребёнок молчит
      // или мы сами остановили. Ругаться на них незачем.
      if (e.error === 'no-speech' || e.error === 'aborted') return;
      if (onState) onState('error', e.error);
    };

    r.onend = function () {
      running = false;
      if (onState) onState('idle', '');
      // Перезапуск с паузой: без неё Chrome при отказе в микрофоне уходит
      // в бесконечный цикл start→end и вешает вкладку.
      if (wanted) setTimeout(function () { if (wanted) start(); }, 300);
    };

    return r;
  }

  function start() {
    if (!supported() || running) return;
    if (!rec) rec = create();
    wanted = true;
    try {
      rec.start();
      running = true;
      if (onState) onState('listening', '');
    } catch (e) {
      // start() на уже запущенном объекте бросает исключение — не страшно.
      running = false;
    }
  }

  function stop() {
    wanted = false;
    if (rec && running) { try { rec.stop(); } catch (e) { /* уже стоит */ } }
  }

  // ── голос ────────────────────────────────────────────────────────────
  var voice = null;

  function pickVoice() {
    if (voice || !window.speechSynthesis) return voice;
    var all = speechSynthesis.getVoices() || [];
    for (var i = 0; i < all.length; i++) {
      if (/ru/i.test(all[i].lang)) { voice = all[i]; break; }
    }
    return voice;
  }
  if (window.speechSynthesis) {
    speechSynthesis.onvoiceschanged = function () { voice = null; pickVoice(); };
  }

  function say(text, done) {
    if (!window.speechSynthesis) { if (done) done(); return; }
    // Робот не должен перебивать сам себя: новая реплика отменяет старую.
    speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(text);
    u.lang = 'ru-RU';
    u.rate = 0.95;
    u.pitch = 1.35;      // повыше: так он звучит игрушечным, а не диктором
    var v = pickVoice();
    if (v) u.voice = v;
    if (done) u.onend = done;
    speechSynthesis.speak(u);
  }

  window.Speech = {
    supported: supported,
    start: start,
    stop: stop,
    say: say,
    onPhrase: function (fn) { onPhrase = fn; },
    onState: function (fn) { onState = fn; }
  };
})();
