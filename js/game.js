/* ==========================================================================
   MOTOR DEL MINIJUEGO (canvas 2D, sin librerías)
   Controles: flechas/WASD mover · Z/Enter aceptar · X cancelar (mantener = lento)
              Shift = parpadeo (Blink) · H = dificultad (en el tablón)
   Truco para probar: agrega ?desbloquear o ?dios al final del link.
   ========================================================================== */
(function () {
  'use strict';

  var canvas = document.getElementById('gameCanvas');
  if (!canvas || !window.BOSSES || !window.BossKit) return;

  var c = canvas.getContext('2d');
  var W = 640, H = 480;
  var BOSSES = window.BOSSES;
  var Kit = window.BossKit;
  var pixEllipse = Kit.pixEllipse, rnd = Kit.rnd, clamp = Kit.clamp;

  var FP = '"Press Start 2P", "Courier New", monospace';
  var FT = '"VT323", "Courier New", monospace';
  var QS = (window.location && window.location.search) || '';
  var UNLOCK_ALL = QS.indexOf('desbloquear') >= 0;
  var GOD = QS.indexOf('dios') >= 0;

  function sfx(n) { if (window.SFX) window.SFX.play(n); }

  /* ------------------------------ Progreso ------------------------------ */
  var SAVE_KEY = 'cum_progress_v1';
  function loadProgress() {
    try {
      var o = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
      return { done: o.done || {}, hard: o.hard !== false };
    } catch (e) { return { done: {}, hard: true }; }
  }
  var P = loadProgress();
  function saveProgress() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(P)); } catch (e) {} }

  /* ------------------------------ Entrada ------------------------------- */
  var KEYMAP = {
    left: ['ArrowLeft', 'KeyA'], right: ['ArrowRight', 'KeyD'], up: ['ArrowUp', 'KeyW'], down: ['ArrowDown', 'KeyS'],
    ok: ['KeyZ', 'Enter', 'Space'], cancel: ['KeyX', 'Escape', 'Backspace'], blink: ['ShiftLeft', 'ShiftRight'], diff: ['KeyH']
  };
  var HANDLED = {};
  Object.keys(KEYMAP).forEach(function (a) { KEYMAP[a].forEach(function (k) { HANDLED[k] = true; }); });
  var down = {}, pressed = {};

  function isDown(a) { var ks = KEYMAP[a]; for (var i = 0; i < ks.length; i++) if (down[ks[i]]) return true; return false; }
  function once(a) { var ks = KEYMAP[a]; for (var i = 0; i < ks.length; i++) if (pressed[ks[i]]) return true; return false; }

  var G = { scene: 'board', focus: false, t: 0, cursor: 0, lockMsg: 0 };
  var B = null;   // combate
  var E = null;   // final

  canvas.addEventListener('keydown', function (e) {
    if (HANDLED[e.code]) e.preventDefault();
    if (!down[e.code]) pressed[e.code] = true;
    down[e.code] = true;
  });
  canvas.addEventListener('keyup', function (e) { down[e.code] = false; });
  canvas.addEventListener('focus', function () { G.focus = true; });
  canvas.addEventListener('blur', function () { G.focus = false; down = {}; pressed = {}; });
  canvas.addEventListener('mousedown', function () { try { canvas.focus(); } catch (e) {} });

  /* ------------------------------ Texto --------------------------------- */
  function txt(s, x, y, size, color, fam, align) {
    c.font = size + 'px ' + (fam || FT);
    c.fillStyle = color || '#fff';
    c.textAlign = align || 'left';
    c.textBaseline = 'alphabetic';
    c.fillText(s, x, y);
  }

  function wrap(s, maxW, size, fam) {
    c.font = size + 'px ' + (fam || FT);
    var words = String(s).split(' '), lines = [], cur = '';
    for (var i = 0; i < words.length; i++) {
      var test = cur ? cur + ' ' + words[i] : words[i];
      if (cur && c.measureText(test).width > maxW) { lines.push(cur); cur = words[i]; } else { cur = test; }
    }
    if (cur) lines.push(cur);
    return lines;
  }

  function newTw(text) { return { text: text, n: 0, done: false, last: 0 }; }

  function stepTw(tw, dt) {
    if (!tw || tw.done) return;
    tw.n += 44 * dt;
    var ch = Math.floor(tw.n);
    if (ch > tw.last) {
      var chr = tw.text.charAt(ch - 1);
      if (chr && chr !== ' ' && ch % 2 === 0) sfx('blip');
      tw.last = ch;
    }
    if (tw.n >= tw.text.length) { tw.n = tw.text.length; tw.done = true; }
  }

  function drawTw(tw, x, y, maxW, size, lh, color, fam) {
    var lines = wrap(tw.text, maxW, size, fam);
    var rem = Math.floor(tw.n);
    for (var i = 0; i < lines.length; i++) {
      if (rem <= 0) break;
      txt(lines[i].substring(0, rem), x, y + i * lh, size, color, fam);
      rem -= lines[i].length + 1;
    }
  }

  /* ------------------------------ Estrellas ----------------------------- */
  var stars = [];
  for (var si = 0; si < 46; si++) stars.push({ x: Math.random() * W, y: Math.random() * H, r: Math.random() < 0.2 ? 2 : 1, ph: Math.random() * 6 });

  function drawStars() {
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      c.globalAlpha = 0.25 + 0.35 * Math.abs(Math.sin(G.t * 0.8 + s.ph));
      c.fillStyle = '#c77dff';
      c.fillRect(s.x, s.y, s.r, s.r);
    }
    c.globalAlpha = 1;
  }

  /* =======================================================================
     TABLÓN DE MISIONES
     ======================================================================= */
  function doneCount() {
    var n = 0;
    BOSSES.forEach(function (b) { if (!b.final && P.done[b.id]) n++; });
    return n;
  }
  function finalUnlocked() { return UNLOCK_ALL || doneCount() >= 3; }
  function isLocked(b) { return b.final && !finalUnlocked(); }

  function statusOf(b) {
    var d = P.done[b.id];
    if (isLocked(b)) return { t: 'BLOQUEADO', col: '#7d6ba3' };
    if (d && d.w) return { t: 'DERROTADO', col: '#6fe39b' };
    if (d && d.s) return { t: 'PERDONADO', col: '#6ec6ff' };
    return { t: 'NUEVO', col: '#ffd166' };
  }

  function updBoard() {
    if (once('up')) { G.cursor = (G.cursor + BOSSES.length - 1) % BOSSES.length; sfx('move'); }
    if (once('down')) { G.cursor = (G.cursor + 1) % BOSSES.length; sfx('move'); }
    if (once('diff')) { P.hard = !P.hard; saveProgress(); sfx('select'); }
    if (once('ok')) {
      var b = BOSSES[G.cursor];
      if (isLocked(b)) { G.lockMsg = 2.2; sfx('cancel'); }
      else { sfx('select'); startBattle(b); }
    }
    if (G.lockMsg > 0) G.lockMsg -= 1 / 60;
  }

  function panel(x, y, w, h, border) {
    c.fillStyle = '#0d0818';
    c.fillRect(x, y, w, h);
    c.strokeStyle = border || '#fff';
    c.lineWidth = 4;
    c.strokeRect(x + 2, y + 2, w - 4, h - 4);
  }

  function drawBoard() {
    c.fillStyle = '#07040d';
    c.fillRect(0, 0, W, H);
    drawStars();

    c.shadowColor = '#a855f7';
    c.shadowBlur = 14;
    txt('TABLÓN DE MISIONES', 320, 44, 16, '#c77dff', FP, 'center');
    c.shadowBlur = 0;
    txt('Gana peleando... o perdonando.', 320, 72, 22, '#b8a9d9', FT, 'center');

    for (var i = 0; i < BOSSES.length; i++) {
      var b = BOSSES[i], y = 88 + i * 50, sel = i === G.cursor, st = statusOf(b);
      c.fillStyle = sel ? '#2a1650' : '#120a22';
      c.fillRect(24, y, 340, 44);
      c.strokeStyle = sel ? '#c77dff' : '#3b2470';
      c.lineWidth = 3;
      c.strokeRect(25.5, y + 1.5, 337, 41);
      txt(isLocked(b) ? '???' : b.name, 52, y + 30, 26, isLocked(b) ? '#7d6ba3' : '#fff');
      txt(st.t, 352, y + 29, 18, st.col, FT, 'right');
      if (sel) drawHeartAt(38, y + 22, '#ff0000');
    }

    var sb = BOSSES[G.cursor];
    panel(384, 88, 232, 300, '#c77dff');
    if (!isLocked(sb)) {
      c.save();
      c.beginPath();
      c.rect(390, 94, 220, 160);
      c.clip();
      c.translate(500, 170);
      c.scale(0.6, 0.6);
      sb.draw(c, 0, 0, G.t, { phase: 1 });
      c.restore();
      txt(sb.name, 500, 282, 24, '#fff', FT, 'center');
      var dl = wrap(sb.desc, 208, 20);
      for (var k = 0; k < dl.length && k < 3; k++) txt(dl[k], 400, 308 + k * 20, 20, '#b8a9d9');
      txt('Peligro: ' + sb.danger + '/5', 400, 376, 20, '#ffd166');
    } else {
      txt('BLOQUEADO', 500, 190, 20, '#7d6ba3', FP, 'center');
      txt('Derrota o perdona', 500, 250, 22, '#b8a9d9', FT, 'center');
      txt('a 3 jefes primero.', 500, 274, 22, '#b8a9d9', FT, 'center');
      txt('(' + doneCount() + '/3)', 500, 306, 24, '#ffd166', FT, 'center');
    }

    txt('FLECHAS: elegir   Z: aceptar   H: dificultad (' + (P.hard ? 'DIFÍCIL' : 'NORMAL') + ')', 320, 424, 22, P.hard ? '#ff6b7d' : '#6fe39b', FT, 'center');
    txt('Misiones completadas: ' + doneCount() + '/' + (BOSSES.length - 1) + (P.done.final ? ' + final' : ''), 320, 452, 20, '#7d6ba3', FT, 'center');
    if (G.lockMsg > 0) txt('* Todavía no puedes enfrentarte a eso.', 320, 474, 22, '#ff6b7d', FT, 'center');
  }

  /* =======================================================================
     UTILIDADES DE COMBATE
     ======================================================================= */
  var MENU_BOX = { x: 32, y: 246, w: 576, h: 136 };
  var HEART_MAP = ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'];

  function drawHeartAt(x, y, color) {
    c.fillStyle = color;
    for (var r = 0; r < HEART_MAP.length; r++) {
      for (var q = 0; q < HEART_MAP[r].length; q++) {
        if (HEART_MAP[r].charAt(q) === 'X') c.fillRect(Math.round(x - 7 + q * 2), Math.round(y - 6 + r * 2), 2, 2);
      }
    }
  }

  function hitTest(b, px, py, pr) {
    if (b.shape === 'c') {
      var dx = b.x - px, dy = b.y - py, rr = b.r * 0.85 + pr;
      return dx * dx + dy * dy < rr * rr;
    }
    var hx = b.w / 2, hy = b.h / 2;
    var cx = clamp(px, b.x - hx, b.x + hx), cy = clamp(py, b.y - hy, b.y + hy);
    var ex = px - cx, ey = py - cy;
    return ex * ex + ey * ey < pr * pr;
  }

  var API = {
    shoot: shoot, beam: beam, warn: warnFx, after: after,
    ar: null, p: null, k: 1, sp: 1, turn: 0, hard: true
  };

  function shoot(o) {
    var b = { x: 0, y: 0, vx: 0, vy: 0, shape: 'c', r: 6, w: 0, h: 0, color: '#fff', dmg: 4, active: true, warn: 0, life: 30, age: 0 };
    for (var k in o) { if (Object.prototype.hasOwnProperty.call(o, k)) b[k] = o[k]; }
    B.bullets.push(b);
    return b;
  }

  function beam(x, y, w, h, warn, dur, color) {
    return shoot({ shape: 'r', x: x + w / 2, y: y + h / 2, w: w, h: h, color: color || '#fff', dmg: 6, active: false, warn: warn, dur: dur, life: 1e9, isBeam: true });
  }

  function warnFx(x, y, w, h, time, color) { B.fx.push({ x: x, y: y, w: w, h: h, life: time, max: time, color: color || '#fff' }); }
  function after(delay, fn) { B.timers.push({ t: delay, fn: fn }); }

  function computeArena() {
    var bt = B.boxT;
    B.ar = { l: bt.x + 12, r: bt.x + bt.w - 12, t: bt.y + 12, b: bt.y + bt.h - 12 };
    B.ar.w = B.ar.r - B.ar.l;
    B.ar.h = B.ar.b - B.ar.t;
    B.ar.cx = (B.ar.l + B.ar.r) / 2;
    B.ar.cy = (B.ar.t + B.ar.b) / 2;
  }

  /* ----------------------------- Inicio de combate ---------------------- */
  function startBattle(boss) {
    G.scene = 'battle';
    B = {
      boss: boss, maxHp: 20, hp: 20, bossHp: boss.hp, turn: 0, mercy: 0, used: {}, phase: 1,
      items: [
        { name: 'Poción de Curación', n: 3, heal: 10, text: '* Bebes la poción. Sabe a fresa radiactiva. Recuperas 10 PS.' },
        { name: 'Pastelito de Fionna', n: 1, heal: 20, text: '* Te comes el pastelito. ¡Algebraico! Recuperas 20 PS.' }
      ],
      state: 'text', menu: 0, sub: 0, tw: null, queue: [], after: null, bubble: null,
      bullets: [], fx: [], timers: [], ghosts: [], shards: [],
      box: { x: MENU_BOX.x, y: MENU_BOX.y, w: MENU_BOX.w, h: MENU_BOX.h },
      boxT: { x: MENU_BOX.x, y: MENU_BOX.y, w: MENU_BOX.w, h: MENU_BOX.h },
      p: { x: 320, y: 314, inv: 0, cd: 0, binv: 0, lx: 0, ly: -1 },
      shake: 0, bossShake: 0, hpShow: 0, popup: null, anim: 0, applied: false,
      atk: null, atkT: 0, bar: null, dissolve: 0, dmode: '', gone: false, deadT: 0, rs: [], res: ''
    };
    for (var i = 0; i < 24; i++) B.rs.push(Math.random());
    say(boss.intro, function () { toMenu(); });
  }

  function say(lines, cb) {
    B.queue = lines.slice();
    B.after = cb || null;
    B.state = 'text';
    nextLine();
  }

  function nextLine() {
    if (B.queue.length) {
      B.tw = newTw(B.queue.shift());
    } else {
      var cb = B.after;
      B.after = null;
      B.tw = null;
      if (cb) cb();
    }
  }

  function flavor() {
    var boss = B.boss;
    if (B.turn > 0 && B.bossHp / boss.hp < 0.3 && boss.lowText) return boss.lowText;
    return boss.flavor[B.turn % boss.flavor.length];
  }

  function toMenu() {
    B.boxT = { x: MENU_BOX.x, y: MENU_BOX.y, w: MENU_BOX.w, h: MENU_BOX.h };
    // Cambio de fase
    if (B.phase === 1 && B.boss.phase2 && B.bossHp / B.boss.hp < 0.5) {
      B.phase = 2;
      sfx('crack');
      say([B.boss.phase2], function () { B.state = 'menu'; B.tw = newTw(flavor()); });
      return;
    }
    B.state = 'menu';
    B.tw = newTw(flavor());
  }

  /* ----------------------------- Turno del jefe ------------------------- */
  function startEnemyTurn() {
    var b = B, boss = b.boss;
    b.state = 'etalk';
    b.boxT = { x: MENU_BOX.x, y: MENU_BOX.y, w: MENU_BOX.w, h: MENU_BOX.h };
    b.bubble = { tw: newTw(boss.talk[b.turn % boss.talk.length]), t: 0 };
  }

  function startAttack() {
    var b = B, boss = b.boss;
    var atk = boss.pick(b.turn, b.bossHp / boss.hp);
    b.atk = atk;
    b.atkT = -0.55;
    b.bubble = null;
    b.bullets = [];
    b.fx = [];
    b.timers = [];
    b.boxT = { x: 320 - atk.w / 2, y: 314 - atk.h / 2, w: atk.w, h: atk.h };
    computeArena();
    var sx = atk.sx == null ? 0.5 : atk.sx, sy = atk.sy == null ? 0.5 : atk.sy;
    b.p.x = b.ar.l + b.ar.w * sx;
    b.p.y = b.ar.t + b.ar.h * sy;
    b.p.inv = 0.6;
    API.ar = b.ar;
    API.p = b.p;
    API.hard = P.hard;
    API.k = (P.hard ? 1 : 0.7) * (b.phase === 2 ? 1.12 : 1);
    API.sp = (P.hard ? 1 : 0.85) * (1 + Math.min(b.turn * 0.04, 0.2));
    API.turn = b.turn;
    b.state = 'attack';
  }

  function endAttack() {
    var b = B;
    b.bullets = [];
    b.fx = [];
    b.timers = [];
    b.atk = null;
    b.turn++;
    b.p.x = 320;
    b.p.y = 314;
    toMenu();
  }

  /* ----------------------------- Actualización -------------------------- */
  function updBullets(dt) {
    var arr = B.bullets;
    for (var i = arr.length - 1; i >= 0; i--) {
      var b = arr[i];
      if (!b) continue;
      b.age += dt;
      if (b.warn > 0) {
        b.warn -= dt;
        if (b.warn <= 0) { b.active = true; b.life = b.dur || 0.3; sfx('slash'); }
      } else {
        b.life -= dt;
      }
      if (b.update) b.update(b, dt, API);
      if (b.grow && b.active) {
        b.w = Math.min(b.maxW, b.w + b.grow * dt);
        b.x = b.dir === 'l' ? b.x0 + b.w / 2 : b.x0 - b.w / 2;
      }
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.life <= 0 || b.x < -90 || b.x > W + 90 || b.y < -90 || b.y > 470) {
        var idx = arr.indexOf(b);
        if (idx >= 0) arr.splice(idx, 1);
      }
    }
    for (var f = B.fx.length - 1; f >= 0; f--) {
      B.fx[f].life -= dt;
      if (B.fx[f].life <= 0) B.fx.splice(f, 1);
    }
    for (var t = B.timers.length - 1; t >= 0; t--) {
      B.timers[t].t -= dt;
      if (B.timers[t].t <= 0) {
        var fn = B.timers[t].fn;
        B.timers.splice(t, 1);
        fn();
      }
    }
  }

  function moveSoul(dt) {
    var p = B.p, ar = B.ar;
    var mx = (isDown('right') ? 1 : 0) - (isDown('left') ? 1 : 0);
    var my = (isDown('down') ? 1 : 0) - (isDown('up') ? 1 : 0);
    if (mx || my) {
      var len = Math.sqrt(mx * mx + my * my);
      mx /= len; my /= len;
      p.lx = mx; p.ly = my;
    }
    var sp = isDown('cancel') ? 85 : 165;
    p.x = clamp(p.x + mx * sp * dt, ar.l, ar.r);
    p.y = clamp(p.y + my * sp * dt, ar.t, ar.b);

    p.inv -= dt;
    p.binv -= dt;
    if (p.cd > 0) p.cd -= dt;

    if (once('blink') && p.cd <= 0) {
      var dx = (mx || my) ? mx : p.lx, dy = (mx || my) ? my : p.ly;
      for (var g = 1; g <= 3; g++) B.ghosts.push({ x: p.x + dx * 28 * (g - 1), y: p.y + dy * 28 * (g - 1), a: 0.6 - g * 0.1 });
      p.x = clamp(p.x + dx * 86, ar.l, ar.r);
      p.y = clamp(p.y + dy * 86, ar.t, ar.b);
      p.cd = 2.4;
      p.binv = 0.38;
      sfx('blink');
    }
    for (var i = B.ghosts.length - 1; i >= 0; i--) {
      B.ghosts[i].a -= dt * 2.4;
      if (B.ghosts[i].a <= 0) B.ghosts.splice(i, 1);
    }
  }

  function checkHits() {
    var p = B.p;
    if (p.inv > 0 || p.binv > 0) return;
    for (var i = 0; i < B.bullets.length; i++) {
      var b = B.bullets[i];
      if (!b.active) continue;
      if (hitTest(b, p.x, p.y, 4)) {
        var dmg = Math.ceil(b.dmg * (P.hard ? 1 : 0.5));
        if (!GOD) B.hp -= dmg;
        p.inv = 1.0;
        B.shake = 6;
        sfx('hurt');
        if (B.hp <= 0) { B.hp = 0; die(); }
        return;
      }
    }
  }

  function die() {
    B.state = 'dead';
    B.deadT = 0;
    B.shards = [];
    for (var i = 0; i < 8; i++) B.shards.push({ x: B.p.x, y: B.p.y, vx: rnd(-90, 90), vy: rnd(-140, -20), a: 1 });
  }

  function updAttack(dt) {
    var b = B;
    moveSoul(dt);
    b.atkT += dt;
    if (b.atkT >= 0 && b.atkT < b.atk.dur) b.atk.tick(API, b.atkT, dt);
    updBullets(dt);
    checkHits();
    if (b.state === 'attack' && b.atkT >= b.atk.dur + 0.7) endAttack();
  }

  function updBattle(dt) {
    var b = B;
    var kk = 1 - Math.exp(-14 * dt);
    b.box.x += (b.boxT.x - b.box.x) * kk;
    b.box.y += (b.boxT.y - b.box.y) * kk;
    b.box.w += (b.boxT.w - b.box.w) * kk;
    b.box.h += (b.boxT.h - b.box.h) * kk;
    if (b.shake > 0) b.shake = Math.max(0, b.shake - dt * 24);
    if (b.bossShake > 0) b.bossShake = Math.max(0, b.bossShake - dt * 30);
    if (b.hpShow > 0) b.hpShow -= dt;
    if (b.popup) { b.popup.t += dt; if (b.popup.t > 1.2) b.popup = null; }

    switch (b.state) {
      case 'text': updText(dt); break;
      case 'menu': updMenu(dt); break;
      case 'act': updAct(); break;
      case 'item': updItem(); break;
      case 'mercy': updMercy(); break;
      case 'fightbar': updFightBar(dt); break;
      case 'fightanim': updFightAnim(dt); break;
      case 'etalk': updETalk(dt); break;
      case 'attack': updAttack(dt); break;
      case 'dissolve': updDissolve(dt); break;
      case 'dead': updDead(dt); break;
    }
  }

  function updText(dt) {
    stepTw(B.tw, dt);
    if (once('ok')) {
      if (!B.tw.done) { B.tw.n = B.tw.text.length; B.tw.done = true; }
      else { sfx('select'); nextLine(); }
    }
  }

  function updMenu(dt) {
    stepTw(B.tw, dt);
    if (once('left')) { B.menu = (B.menu + 3) % 4; sfx('move'); }
    if (once('right')) { B.menu = (B.menu + 1) % 4; sfx('move'); }
    if (once('ok')) {
      sfx('select');
      B.sub = 0;
      if (B.menu === 0) { B.state = 'fightbar'; B.bar = { x: 0, t: 0, stopped: false, dmg: 0 }; }
      else if (B.menu === 1) B.state = 'act';
      else if (B.menu === 2) B.state = 'item';
      else B.state = 'mercy';
    }
  }

  function backToMenu() { B.state = 'menu'; sfx('cancel'); }

  function updAct() {
    var n = B.boss.acts.length;
    if (once('cancel')) { backToMenu(); return; }
    if (once('left') || once('right')) { B.sub = (B.sub % 2 === 0) ? Math.min(B.sub + 1, n - 1) : B.sub - 1; sfx('move'); }
    if (once('up') && B.sub >= 2) { B.sub -= 2; sfx('move'); }
    if (once('down') && B.sub + 2 < n) { B.sub += 2; sfx('move'); }
    if (once('ok')) {
      sfx('select');
      var a = B.boss.acts[B.sub], lines;
      if (a.good) {
        if (B.used[a.name]) lines = ['* Ya hiciste eso. Una vez bastó.'];
        else { B.used[a.name] = true; B.mercy++; lines = a.text.slice(); }
      } else { lines = a.text.slice(); }
      if (B.mercy >= B.boss.spareNeed && a.good && lines[0] !== '* Ya hiciste eso. Una vez bastó.') lines.push('* ¡Su nombre se vuelve amarillo!');
      say(lines, function () { startEnemyTurn(); });
    }
  }

  function updItem() {
    var items = B.items.filter(function (it) { return it.n > 0; });
    if (once('cancel')) { backToMenu(); return; }
    if (!items.length) { if (once('ok')) backToMenu(); return; }
    if (once('up')) { B.sub = (B.sub + items.length - 1) % items.length; sfx('move'); }
    if (once('down')) { B.sub = (B.sub + 1) % items.length; sfx('move'); }
    B.sub = clamp(B.sub, 0, items.length - 1);
    if (once('ok')) {
      var it = items[B.sub];
      it.n--;
      var before = B.hp;
      B.hp = Math.min(B.maxHp, B.hp + it.heal);
      sfx('heal');
      var lines = [it.text];
      if (B.hp === B.maxHp && before + it.heal > B.maxHp) lines[0] += ' ¡PS al máximo!';
      say(lines, function () { startEnemyTurn(); });
    }
  }

  function canSpare() { return B.mercy >= B.boss.spareNeed; }

  function updMercy() {
    if (once('cancel')) { backToMenu(); return; }
    if (once('up') || once('down')) { B.sub = 1 - B.sub; sfx('move'); }
    if (once('ok')) {
      sfx('select');
      if (B.sub === 0) {
        if (canSpare()) { startDissolve('spare'); }
        else { say(['* ' + B.boss.name.charAt(0) + B.boss.name.slice(1).toLowerCase() + ' no quiere ser perdonado todavía.'], function () { startEnemyTurn(); }); }
      } else {
        say(['* Escapas con el corazón en la mano...', '* Las misiones no se hacen solas.'], function () { G.scene = 'board'; B = null; });
      }
    }
  }

  function updFightBar(dt) {
    var bar = B.bar;
    if (!bar.stopped) {
      bar.x += (P.hard ? 560 : 430) * dt;
      if (once('cancel')) { backToMenu(); return; }
      if (once('ok')) {
        bar.stopped = true;
        var acc = 1 - Math.abs(bar.x - 260) / 260;
        bar.dmg = acc < 0.08 ? 0 : Math.round(B.boss.maxHit * Math.pow(Math.max(0, acc), 1.35));
        sfx('select');
      } else if (bar.x >= 520) { bar.stopped = true; bar.dmg = 0; }
    } else {
      bar.t += dt;
      if (bar.t > 0.4) { B.state = 'fightanim'; B.anim = 0; B.applied = false; }
    }
  }

  function updFightAnim(dt) {
    var b = B;
    b.anim += dt;
    if (!b.applied && b.anim > 0.3) {
      b.applied = true;
      var dmg = b.bar.dmg;
      if (dmg > 0) { b.bossHp = Math.max(0, b.bossHp - dmg); b.bossShake = 8; sfx('hit'); }
      else sfx('miss');
      b.popup = { text: dmg > 0 ? String(dmg) : 'FALLASTE', t: 0 };
      b.hpShow = 1.6;
    }
    if (b.anim > 1.3) {
      if (b.bossHp <= 0) startDissolve('kill');
      else startEnemyTurn();
    }
  }

  function updETalk(dt) {
    var bb = B.bubble;
    stepTw(bb.tw, dt);
    if (bb.tw.done) bb.t += dt;
    if (once('ok')) {
      if (!bb.tw.done) { bb.tw.n = bb.tw.text.length; bb.tw.done = true; }
      else bb.t = 99;
    }
    if (bb.tw.done && bb.t > 0.75) startAttack();
  }

  function startDissolve(mode) {
    B.state = 'dissolve';
    B.dmode = mode;
    B.dissolve = 0;
    B.bubble = null;
    sfx(mode === 'kill' ? 'bossdie' : 'spare');
  }

  function updDissolve(dt) {
    B.dissolve += dt / 1.6;
    if (B.dissolve >= 1) {
      B.gone = true;
      var lines = (B.dmode === 'kill' ? B.boss.win : B.boss.spare).slice();
      lines.push('* ¡GANASTE! Obtuviste: ' + B.boss.loot + '.');
      var mode = B.dmode;
      say(lines, function () { finish(mode); });
    }
  }

  function finish(mode) {
    var boss = B.boss;
    P.done[boss.id] = P.done[boss.id] || {};
    P.done[boss.id][mode === 'kill' ? 'w' : 's'] = 1;
    saveProgress();
    sfx('win');
    if (boss.final) startEnding();
    else { G.scene = 'board'; B = null; }
  }

  function updDead(dt) {
    var b = B;
    b.deadT += dt;
    if (b.deadT > 0.55 && !b.cracked) { b.cracked = true; sfx('crack'); }
    if (b.deadT > 1.1 && !b.broke) { b.broke = true; sfx('dead'); }
    if (b.broke) {
      for (var i = 0; i < b.shards.length; i++) {
        var s = b.shards[i];
        s.vy += 260 * dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.a = Math.max(0, s.a - dt * 0.5);
      }
    }
    if (b.deadT > 2.4) {
      if (once('ok')) { sfx('select'); startBattle(b.boss); }
      else if (once('cancel')) { sfx('cancel'); G.scene = 'board'; B = null; }
    }
  }

  /* =======================================================================
     DIBUJO DEL COMBATE
     ======================================================================= */
  function drawBox() {
    var b = B.box;
    c.fillStyle = '#000';
    c.fillRect(b.x, b.y, b.w, b.h);
    c.strokeStyle = '#fff';
    c.lineWidth = 4;
    c.strokeRect(b.x + 2, b.y + 2, b.w - 4, b.h - 4);
  }

  function drawBoss() {
    var b = B, boss = b.boss;
    var cx = 320, cy = 128;
    var ox = b.bossShake > 0 ? (Math.random() - 0.5) * b.bossShake * 2 : 0;
    var o = { phase: b.phase };
    if (b.state === 'dissolve') {
      var pr = b.dissolve;
      for (var i = 0; i < 24; i++) {
        c.save();
        c.beginPath();
        c.rect(0, 10 + i * 9, W, 9);
        c.clip();
        c.globalAlpha = Math.max(0, 1 - pr);
        if (b.dmode === 'spare') c.filter = 'grayscale(1) brightness(1.2)';
        boss.draw(c, cx + (b.rs[i] - 0.5) * 180 * pr + ox, cy - pr * 20 * b.rs[i], G.t, o);
        c.restore();
      }
      c.filter = 'none';
      return;
    }
    c.save();
    if (b.state === 'fightanim' && b.anim < 0.3) {
      // destello del ataque
      c.strokeStyle = '#fff';
      c.lineWidth = 6;
      var q = b.anim / 0.3;
      c.beginPath(); c.moveTo(250, 50 + q * 60); c.lineTo(390, 100 + q * 60); c.stroke();
    }
    boss.draw(c, cx + ox, cy, G.t, o);
    c.restore();
  }

  function drawBubble() {
    var bb = B.bubble;
    if (!bb) return;
    var x = 420, y = 30, w = 208;
    var lines = wrap(bb.tw.text, w - 28, 22);
    var h = 22 + lines.length * 22 + 10;
    c.fillStyle = '#fff';
    c.fillRect(x, y, w, h);
    c.beginPath();
    c.moveTo(x, y + 20); c.lineTo(x - 14, y + 30); c.lineTo(x, y + 38);
    c.closePath();
    c.fill();
    var rem = Math.floor(bb.tw.n);
    for (var i = 0; i < lines.length; i++) {
      if (rem <= 0) break;
      txt(lines[i].substring(0, rem), x + 14, y + 28 + i * 22, 22, '#000');
      rem -= lines[i].length + 1;
    }
  }

  function drawBossHp() {
    var b = B;
    if (b.hpShow <= 0 || b.gone) return;
    var frac = b.bossHp / b.boss.hp;
    c.fillStyle = '#555';
    c.fillRect(250, 222, 140, 14);
    c.fillStyle = '#2fd45a';
    c.fillRect(250, 222, Math.round(140 * frac), 14);
    c.strokeStyle = '#000';
    c.lineWidth = 2;
    c.strokeRect(250, 222, 140, 14);
    if (b.popup) {
      var py = 206 - Math.min(b.popup.t * 40, 30);
      c.shadowColor = '#000';
      c.shadowBlur = 4;
      txt(b.popup.text, 320, py, 30, b.popup.text === 'FALLASTE' ? '#ccc' : '#ff4d4d', FP, 'center');
      c.shadowBlur = 0;
    }
  }

  function drawMenuContent() {
    var b = B, bx = b.box.x + 24, by = b.box.y + 36;
    if (b.state === 'text' || b.state === 'menu') {
      if (b.tw) drawTw(b.tw, bx, by, b.box.w - 48, 30, 30, '#fff');
    } else if (b.state === 'act') {
      var acts = b.boss.acts;
      for (var i = 0; i < acts.length; i++) {
        var x = bx + 40 + (i % 2) * 270, y = by + 10 + Math.floor(i / 2) * 44;
        var col = (b.used[acts[i].name]) ? '#9a9a9a' : '#fff';
        txt('* ' + acts[i].name, x, y, 30, col);
        if (i === b.sub) drawHeartAt(x - 18, y - 9, '#ff0000');
      }
    } else if (b.state === 'item') {
      var items = b.items.filter(function (it) { return it.n > 0; });
      if (!items.length) txt('* No te quedan objetos.', bx, by, 30, '#9a9a9a');
      for (var j = 0; j < items.length; j++) {
        txt('* ' + items[j].name + ' x' + items[j].n, bx + 40, by + 10 + j * 44, 30, '#fff');
        if (j === b.sub) drawHeartAt(bx + 22, by + 1 + j * 44, '#ff0000');
      }
    } else if (b.state === 'mercy') {
      txt('* Perdonar', bx + 40, by + 10, 30, canSpare() ? '#ffe14d' : '#fff');
      txt('* Huir', bx + 40, by + 54, 30, '#fff');
      drawHeartAt(bx + 22, by + 1 + b.sub * 44, '#ff0000');
    } else if (b.state === 'fightbar') {
      var bar = b.bar;
      var x0 = b.box.x + 28, y0 = b.box.y + 26, w = 520, h = 84;
      c.fillStyle = '#1a1a1a';
      c.fillRect(x0, y0, w, h);
      for (var s = 0; s < 8; s++) {
        var ww = w / 2 * (1 - s / 8);
        c.fillStyle = s % 2 === 0 ? '#3b2470' : '#a855f7';
        c.fillRect(x0 + w / 2 - ww, y0 + 8, ww * 2, h - 16);
        if (s > 6) break;
      }
      c.fillStyle = '#ffe14d';
      c.fillRect(x0 + w / 2 - 3, y0 + 4, 6, h - 8);
      c.strokeStyle = '#fff';
      c.lineWidth = 3;
      c.strokeRect(x0 + 1.5, y0 + 1.5, w - 3, h - 3);
      var blink = bar.stopped && Math.floor(bar.t * 14) % 2 === 0;
      c.fillStyle = blink ? '#ff4d4d' : '#fff';
      c.fillRect(x0 + bar.x - 5, y0 - 4, 10, h + 8);
      c.strokeStyle = '#000';
      c.lineWidth = 2;
      c.strokeRect(x0 + bar.x - 5, y0 - 4, 10, h + 8);
    }
  }

  function drawFx() {
    for (var i = 0; i < B.fx.length; i++) {
      var f = B.fx[i];
      c.globalAlpha = 0.25 + 0.3 * Math.abs(Math.sin(f.life * 18));
      c.fillStyle = f.color;
      c.fillRect(f.x, f.y, f.w, f.h);
      c.globalAlpha = 0.8;
      c.strokeStyle = f.color;
      c.lineWidth = 2;
      c.strokeRect(f.x, f.y, f.w, f.h);
    }
    c.globalAlpha = 1;
  }

  function drawBullets() {
    c.save();
    c.beginPath();
    c.rect(0, 0, W, 388);
    c.clip();
    drawFx();
    for (var i = 0; i < B.bullets.length; i++) {
      var b = B.bullets[i];
      if (b.draw) { b.draw(c, b); continue; }
      if (b.shape === 'c') {
        pixEllipse(c, b.x, b.y, b.r, b.r, 2, 'rgba(255,255,255,0.92)');
        pixEllipse(c, b.x, b.y, Math.max(1, b.r - 2), Math.max(1, b.r - 2), 2, b.color);
      } else {
        var x = Math.round(b.x - b.w / 2), y = Math.round(b.y - b.h / 2);
        if (!b.active) {
          if (b.nowarn) continue;
          c.globalAlpha = 0.35 + 0.35 * Math.abs(Math.sin(b.age * 24));
          c.fillStyle = b.color;
          c.fillRect(x, y, b.w, b.h);
          c.globalAlpha = 1;
          c.strokeStyle = b.color;
          c.lineWidth = 2;
          c.strokeRect(x, y, b.w, b.h);
        } else {
          c.fillStyle = '#fff';
          c.fillRect(x - 1, y - 1, b.w + 2, b.h + 2);
          c.fillStyle = b.color;
          c.fillRect(x + 2, y + 2, Math.max(1, b.w - 4), Math.max(1, b.h - 4));
        }
      }
    }
    c.restore();
  }

  function drawSoulAndGhosts() {
    var b = B, p = b.p;
    for (var i = 0; i < b.ghosts.length; i++) {
      c.globalAlpha = Math.max(0, b.ghosts[i].a);
      drawHeartAt(b.ghosts[i].x, b.ghosts[i].y, '#c77dff');
    }
    c.globalAlpha = 1;
    if (p.inv > 0 && p.binv <= 0 && Math.floor(p.inv * 14) % 2 === 0) return;
    drawHeartAt(p.x, p.y, p.binv > 0 ? '#c77dff' : '#ff0000');
  }

  function drawHud() {
    var b = B;
    c.fillStyle = '#000';
    c.fillRect(0, 388, W, H - 388);
    txt('DAVID', 32, 412, 22, '#fff');
    txt('LV 1', 112, 412, 22, '#fff');
    txt('PS', 214, 412, 20, '#fff');
    c.fillStyle = '#c4141c';
    c.fillRect(244, 396, 100, 18);
    c.fillStyle = '#ffe14d';
    c.fillRect(244, 396, Math.round(100 * b.hp / b.maxHp), 18);
    txt(b.hp + ' / ' + b.maxHp, 354, 412, 22, b.hp <= 6 ? '#ff4d4d' : '#fff');
    // Parpadeo
    txt('BLINK', 450, 412, 18, '#c77dff');
    c.fillStyle = '#2a1650';
    c.fillRect(508, 398, 100, 14);
    c.fillStyle = b.p.cd > 0 ? '#7a3cff' : '#c77dff';
    c.fillRect(508, 398, Math.round(100 * (1 - Math.max(0, b.p.cd) / 2.4)), 14);
    c.strokeStyle = '#c77dff';
    c.lineWidth = 2;
    c.strokeRect(508, 398, 100, 14);

    var names = ['FIGHT', 'ACT', 'ITEM', 'MERCY'];
    for (var i = 0; i < 4; i++) {
      var x = 32 + i * 150, y = 428, sel = (b.state !== 'attack' && b.state !== 'etalk' && b.menu === i);
      var col = sel ? '#ffe14d' : '#ff9a1f';
      c.strokeStyle = col;
      c.lineWidth = 3;
      c.strokeRect(x + 1.5, y + 1.5, 123, 38);
      txt(names[i], x + 72, y + 26, 12, col, FP, 'center');
      if (sel && b.state === 'menu') drawHeartAt(x + 16, y + 20, '#ff0000');
    }
  }

  function drawBattle() {
    var b = B, boss = b.boss;
    c.fillStyle = '#07040d';
    c.fillRect(0, 0, W, H);
    drawStars();

    c.save();
    if (b.shake > 0) c.translate(rnd(-b.shake, b.shake) * 0.5, rnd(-b.shake, b.shake) * 0.5);

    txt(boss.name, 12, 20, 10, '#7d6ba3', FP);
    if (b.state !== 'dead') {
      if (!b.gone) drawBoss();
      drawBossHp();
      drawBubble();
    }
    drawBox();
    if (b.state !== 'attack' && b.state !== 'etalk' && b.state !== 'dead' && b.state !== 'dissolve') drawMenuContent();
    if (b.state === 'attack' || b.state === 'etalk' || b.state === 'dead') drawBullets();
    if (b.state === 'attack') drawSoulAndGhosts();
    if (b.state === 'etalk') drawHeartAt(b.p.x, b.p.y, '#ff0000');
    c.restore();

    drawHud();

    if (b.state === 'dead') drawDead();
  }

  function drawDead() {
    var b = B;
    c.fillStyle = 'rgba(0,0,0,' + Math.min(0.85, b.deadT) + ')';
    c.fillRect(0, 0, W, H);
    if (!b.broke) {
      drawHeartAt(b.p.x, b.p.y, b.deadT > 0.55 ? '#a00' : '#ff0000');
    } else {
      for (var i = 0; i < b.shards.length; i++) {
        var s = b.shards[i];
        c.globalAlpha = s.a;
        c.fillStyle = '#ff0000';
        c.fillRect(s.x, s.y, 5, 5);
      }
      c.globalAlpha = 1;
    }
    if (b.deadT > 1.8) {
      txt('FIN DE LA PARTIDA', 320, 190, 22, '#fff', FP, 'center');
      txt('* Pero no te rindas. Tú estás lleno de DETERMINACIÓN.', 320, 236, 24, '#b8a9d9', FT, 'center');
    }
    if (b.deadT > 2.4) txt('Z: reintentar      X: volver al tablón', 320, 290, 24, '#ffe14d', FT, 'center');
  }

  /* =======================================================================
     FINAL
     ======================================================================= */
  function startEnding() {
    G.scene = 'ending';
    B = null;
    E = { t: 0, bits: [], zapped: false, cheer: false };
    for (var i = 0; i < 90; i++) {
      E.bits.push({ x: Math.random() * W, y: -Math.random() * 400, vy: 60 + Math.random() * 120, vx: rnd(-20, 20), col: ['#a855f7', '#c77dff', '#7cfc5a', '#ff2a44', '#ffffff'][i % 5], s: 4 + Math.floor(Math.random() * 4) });
    }
  }

  function updEnding(dt) {
    E.t += dt;
    if (E.t > 1.2 && !E.zapped) { E.zapped = true; sfx('zap'); }
    if (E.t > 2.2 && !E.cheer) { E.cheer = true; sfx('win'); }
    for (var i = 0; i < E.bits.length; i++) {
      var b = E.bits[i];
      b.y += b.vy * dt;
      b.x += b.vx * dt;
      if (E.t > 2.2 && b.y > H + 10) { b.y = -10; b.x = Math.random() * W; }
    }
    if (E.t > 9 && once('ok')) { sfx('select'); G.scene = 'board'; E = null; }
  }

  function drawEnding() {
    c.fillStyle = '#07040d';
    c.fillRect(0, 0, W, H);
    drawStars();
    var t = E.t;

    // Rayo desvenezuelizador
    if (t > 1.2) {
      var flash = Math.max(0, 1 - (t - 1.2) * 1.6);
      var bw = 70 + Math.sin(t * 40) * 6;
      c.fillStyle = 'rgba(124,252,90,' + (0.18 + flash * 0.5) + ')';
      c.fillRect(320 - bw * 1.6, 0, bw * 3.2, H);
      c.fillStyle = 'rgba(124,252,90,0.75)';
      c.fillRect(320 - bw / 2, 0, bw, H);
      c.fillStyle = '#eaffd9';
      c.fillRect(320 - bw / 5, 0, bw / 2.5, H);
      c.strokeStyle = '#eaffd9';
      c.lineWidth = 3;
      for (var z = 0; z < 5; z++) {
        c.beginPath();
        var yy = (z * 100 + t * 300) % H;
        c.moveTo(320 - bw, yy);
        c.lineTo(320 - bw - 30 - Math.random() * 20, yy + 14);
        c.lineTo(320 - bw - 6, yy + 28);
        c.stroke();
      }
      if (flash > 0) {
        c.fillStyle = 'rgba(255,255,255,' + flash * 0.6 + ')';
        c.fillRect(0, 0, W, H);
      }
    }

    for (var i = 0; i < E.bits.length; i++) {
      var b = E.bits[i];
      if (E.t > 2.2 || b.y > 0) { c.fillStyle = b.col; c.fillRect(Math.round(b.x), Math.round(b.y), b.s, b.s); }
    }

    var msg = window.FINAL_MESSAGE || ['¡FELICIDADES!'];
    var bases = [24, 18, 18];
    for (var m = 0; m < msg.length; m++) {
      var start = 2.2 + m * 2.2;
      if (t < start) continue;
      var shown = Math.min(msg[m].length, Math.floor((t - start) * 18));
      var size = Math.min(bases[m] || 18, Math.floor(580 / Math.max(1, msg[m].length)));
      c.shadowColor = m === 2 ? '#7cfc5a' : '#a855f7';
      c.shadowBlur = 16;
      var y = 150 + m * 70;
      var wob = m === 2 ? Math.sin(t * 12) * 3 : 0;
      c.font = size + 'px ' + FP;
      txt(msg[m].substring(0, shown), 320 + wob, y, size, m === 2 ? '#eaffd9' : '#ffffff', FP, 'center');
      c.shadowBlur = 0;
    }

    if (t > 9) txt('Z: volver al tablón de misiones', 320, 440, 22, '#ffe14d', FT, 'center');
  }

  /* =======================================================================
     BUCLE PRINCIPAL
     ======================================================================= */
  function update(dt) {
    G.t += dt;
    if (G.scene === 'board') updBoard();
    else if (G.scene === 'battle' && B) updBattle(dt);
    else if (G.scene === 'ending' && E) updEnding(dt);
  }

  function render() {
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalAlpha = 1;
    c.textAlign = 'left';
    if (G.scene === 'board') drawBoard();
    else if (G.scene === 'battle' && B) drawBattle();
    else if (G.scene === 'ending' && E) drawEnding();

    if (!G.focus) {
      c.fillStyle = 'rgba(5,2,10,0.78)';
      c.fillRect(0, 0, W, H);
      txt('HAZ CLIC AQUÍ PARA JUGAR', 320, 210, 18, '#ffe14d', FP, 'center');
      txt('Flechas/WASD: mover   Z: aceptar   X: cancelar o ir lento', 320, 258, 22, '#fff', FT, 'center');
      txt('Shift: parpadeo (Blink)', 320, 284, 22, '#c77dff', FT, 'center');
    }
  }

  var last = 0;
  function frame(ts) {
    window.requestAnimationFrame(frame);
    var dt = Math.min(0.033, (ts - last) / 1000 || 0);
    last = ts;
    if (G.focus) update(dt);
    render();
    pressed = {};
  }

  if (document.fonts && document.fonts.load) {
    try { document.fonts.load('16px "Press Start 2P"'); document.fonts.load('22px "VT323"'); } catch (e) {}
  }
  window.requestAnimationFrame(frame);

  // Para pruebas automáticas
  if (window.__CUM_TEST__) {
    window.__CUM_TEST__.api = {
      G: G, getB: function () { return B; }, getE: function () { return E; }, startBattle: startBattle, BOSSES: BOSSES,
      setFocus: function (v) { G.focus = v; }, update: update, render: render, press: function (code) { pressed[code] = true; },
      hold: function (code, v) { down[code] = v; }, clearPressed: function () { pressed = {}; }, P: P
    };
  }
})();
