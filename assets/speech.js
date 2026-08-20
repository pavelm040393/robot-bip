// The robot's ears and voice.
//
// Ears — the Web Speech API. Two things worth knowing before you start
// debugging it:
//   · it only works in Chrome and Edge, and only over https or on localhost;
//   · the audio is sent to Google's servers. Fine at home, but if this ever
//     goes public, either say so honestly or move to a local Whisper. A
//     child's voice is not something you ship out quietly.
//
// Chrome ends recognition on its own: on silence, on a timeout, sometimes for
// no visible reason. Hence the restart below — without it the microphone dies
// after half a minute, and to a child that looks like the game broke.
//
// Voice — Speech Synthesis. System voices sound mechanical, which suits a
// robot: a warm human voice coming out of a tin character is more confusing
// than helpful.
//
// Both ears and voice follow Lang: switching the language mid-game has to
// switch what the robot listens for AND what it speaks, or the child ends up
// talking to something that answers in a language it cannot hear.
(function () {
  'use strict';

  var rec = null, running = false, wanted = false;
  var onPhrase = null, onState = null;

  function code() {
    return (window.Lang && Lang.code()) || 'en-US';
  }

  function supported() {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  function create() {
    var Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
    var r = new Rec();
    r.lang = code();
    r.continuous = true;
    r.interimResults = true;
    r.maxAlternatives = 3;

    r.onresult = function (e) {
      for (var i = e.resultIndex; i < e.results.length; i++) {
        var res = e.results[i];
        var text = res[0].transcript.trim();
        if (!text) continue;

        if (res.isFinal) {
          // Keep every alternative: children are hard to hear, and the right
          // reading is often the second one rather than the first.
          var alts = [];
          for (var k = 0; k < res.length; k++) alts.push(res[k].transcript.trim());
          if (onPhrase) onPhrase(text, alts);
        } else if (onState) {
          onState('hearing', text);
        }
      }
    };

    r.onerror = function (e) {
      // no-speech and aborted are everyday life, not failures: the child is
      // quiet, or we stopped it ourselves. No point complaining about those.
      if (e.error === 'no-speech' || e.error === 'aborted') return;
      if (onState) onState('error', e.error);
    };

    r.onend = function () {
      running = false;
      if (onState) onState('idle', '');
      // Restart with a delay: without it, when microphone access is denied,
      // Chrome spins through start→end forever and locks up the tab.
      if (wanted) setTimeout(function () { if (wanted) start(); }, 300);
    };

    return r;
  }

  function start() {
    if (!supported() || running) return;
    if (!rec) rec = create();
    rec.lang = code();
    wanted = true;
    try {
      rec.start();
      running = true;
      if (onState) onState('listening', '');
    } catch (e) {
      // start() on an already running instance throws — harmless.
      running = false;
    }
  }

  function stop() {
    wanted = false;
    if (rec && running) { try { rec.stop(); } catch (e) { /* already stopped */ } }
  }

  // Language changed mid-session: drop the recogniser so the next start picks
  // up the new language, and forget the cached voice.
  function relang() {
    voice = null;
    var wasOn = wanted;
    stop();
    rec = null;
    if (wasOn) setTimeout(start, 200);
  }

  // ── voice ─────────────────────────────────────────────────────────────
  var voice = null;

  function pickVoice() {
    if (voice || !window.speechSynthesis) return voice;
    var want = code().slice(0, 2);
    var all = speechSynthesis.getVoices() || [];
    for (var i = 0; i < all.length; i++) {
      if (all[i].lang && all[i].lang.slice(0, 2).toLowerCase() === want) { voice = all[i]; break; }
    }
    return voice;
  }
  if (window.speechSynthesis) {
    speechSynthesis.onvoiceschanged = function () { voice = null; pickVoice(); };
  }

  function say(text, done) {
    if (!window.speechSynthesis) { if (done) done(); return; }
    // The robot must not talk over itself: a new line cancels the old one.
    speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(text);
    u.lang = code();
    u.rate = 0.95;
    u.pitch = 1.35;      // higher, so it sounds like a toy and not a newsreader
    var v = pickVoice();
    if (v) u.voice = v;
    if (done) u.onend = done;
    speechSynthesis.speak(u);
  }

  window.Speech = {
    supported: supported,
    start: start,
    stop: stop,
    relang: relang,
    say: say,
    onPhrase: function (fn) { onPhrase = fn; },
    onState: function (fn) { onState = fn; }
  };
})();
