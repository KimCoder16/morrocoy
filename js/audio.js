/* Audio: efectos (WebAudio, generados por código) + música de fondo (fondo.mp3) */
(function () {
  'use strict';

  var actx = null, master = null;
  var S = { vol: 0.6, musicOn: true };

  try {
    var sv = JSON.parse(localStorage.getItem('cum_audio') || '{}');
    if (typeof sv.vol === 'number') S.vol = Math.max(0, Math.min(1, sv.vol));
    if (typeof sv.musicOn === 'boolean') S.musicOn = sv.musicOn;
  } catch (e) {}

  function save() {
    try { localStorage.setItem('cum_audio', JSON.stringify(S)); } catch (e) {}
  }

  function ensure() {
    if (actx) {
      if (actx.state === 'suspended' && actx.resume) actx.resume();
      return actx;
    }
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    actx = new AC();
    master = actx.createGain();
    master.gain.value = S.vol * 0.5;
    master.connect(actx.destination);
    return actx;
  }

  function tone(freq, dur, type, vol, slideTo, delay) {
    var c = ensure();
    if (!c) return;
    var t0 = c.currentTime + (delay || 0);
    var o = c.createOscillator();
    var g = c.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(slideTo, 1), t0 + dur);
    g.gain.setValueAtTime(vol || 0.2, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g);
    g.connect(master);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }

  function noise(dur, vol, freq, delay) {
    var c = ensure();
    if (!c) return;
    var t0 = c.currentTime + (delay || 0);
    var len = Math.max(1, Math.floor(c.sampleRate * dur));
    var buf = c.createBuffer(1, len, c.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    var s = c.createBufferSource();
    s.buffer = buf;
    var f = c.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = freq || 1200;
    var g = c.createGain();
    g.gain.setValueAtTime(vol || 0.2, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f);
    f.connect(g);
    g.connect(master);
    s.start(t0);
  }

  var fx = {
    blip: function () { tone(520 + Math.random() * 220, 0.04, 'square', 0.07); },
    move: function () { tone(520, 0.04, 'square', 0.09); },
    select: function () { tone(880, 0.06, 'square', 0.11); tone(1320, 0.08, 'square', 0.09, 0, 0.05); },
    cancel: function () { tone(300, 0.08, 'square', 0.1, 180); },
    hurt: function () { noise(0.18, 0.35, 600); tone(180, 0.22, 'sawtooth', 0.22, 60); },
    heal: function () { tone(660, 0.08, 'square', 0.1); tone(880, 0.08, 'square', 0.1, 0, 0.08); tone(1320, 0.14, 'square', 0.1, 0, 0.16); },
    slash: function () { noise(0.12, 0.18, 2600); tone(900, 0.1, 'sawtooth', 0.07, 200); },
    hit: function () { noise(0.22, 0.4, 900); tone(320, 0.25, 'square', 0.22, 80); },
    miss: function () { tone(240, 0.18, 'triangle', 0.15, 120); },
    blink: function () { tone(300, 0.12, 'sine', 0.2, 1400); },
    bossdie: function () { noise(0.9, 0.3, 500); tone(400, 0.9, 'sawtooth', 0.18, 40); },
    spare: function () { tone(660, 0.1, 'triangle', 0.15); tone(990, 0.1, 'triangle', 0.15, 0, 0.1); tone(1320, 0.3, 'triangle', 0.15, 0, 0.2); },
    dead: function () { tone(440, 0.5, 'sawtooth', 0.2, 55); },
    crack: function () { noise(0.1, 0.4, 3000); tone(120, 0.15, 'square', 0.2, 60); },
    win: function () {
      var n = [523, 659, 784, 1047, 784, 1047, 1319];
      for (var i = 0; i < n.length; i++) tone(n[i], 0.16, 'square', 0.1, 0, i * 0.12);
    },
    zap: function () { noise(0.7, 0.35, 1800); tone(1400, 0.7, 'sawtooth', 0.14, 90); }
  };

  window.SFX = {
    play: function (name) { if (fx[name]) { try { fx[name](); } catch (e) {} } },
    unlock: ensure,
    setVol: function (v) { if (master) master.gain.value = v * 0.5; }
  };

  /* ---------- Música de fondo ---------- */
  var bgm = document.getElementById('bgm');
  var btn = document.getElementById('musicBtn');
  var slider = document.getElementById('volSlider');
  var panel = document.getElementById('audioPanel');

  function paint() {
    if (btn) {
      btn.textContent = S.musicOn ? 'MÚSICA: ON' : 'MÚSICA: OFF';
      btn.setAttribute('aria-pressed', S.musicOn ? 'true' : 'false');
    }
    if (slider) slider.value = Math.round(S.vol * 100);
  }

  function applyVol() {
    if (bgm) bgm.volume = S.vol;
    window.SFX.setVol(S.vol);
  }

  var Music = {
    start: function () {
      if (!bgm) return;
      bgm.volume = S.vol;
      if (S.musicOn) {
        var p = bgm.play();
        if (p && p.catch) p.catch(function () {});
      }
    },
    toggle: function () {
      S.musicOn = !S.musicOn;
      if (bgm) {
        if (S.musicOn) { Music.start(); } else { bgm.pause(); }
      }
      save();
      paint();
    },
    setVol: function (v) {
      S.vol = Math.max(0, Math.min(1, v));
      applyVol();
      save();
    }
  };
  window.Music = Music;

  if (btn) btn.addEventListener('click', function () { Music.toggle(); });
  if (slider) {
    slider.addEventListener('input', function () { Music.setVol(Number(slider.value) / 100); });
  }
  if (bgm) {
    bgm.addEventListener('error', function () {
      if (panel) {
        panel.classList.add('no-music');
        panel.title = 'No se encontró fondo.mp3 en el repositorio';
      }
    });
  }
  paint();
  applyVol();

  /* ---------- Pantalla de entrada (necesaria para que el navegador deje sonar la música) ---------- */
  var splash = document.getElementById('splash');
  var enter = document.getElementById('enterBtn');

  function enterSite() {
    if (!splash || splash.classList.contains('gone')) return;
    ensure();
    Music.start();
    window.SFX.play('select');
    splash.classList.add('gone');
    document.body.classList.remove('locked');
    setTimeout(function () { if (splash.parentNode) splash.parentNode.removeChild(splash); }, 700);
  }
  if (enter) {
    enter.addEventListener('click', enterSite);
    try { enter.focus(); } catch (e) {}
  }
})();
