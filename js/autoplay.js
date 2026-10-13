/* ==========================================================================
   AUTOPLAY (SOLO DEMOSTRACIÓN)
   Un bot que juega todos los jefes como lo haría un jugador muy bueno:
   esquiva balas prediciendo su trayectoria, usa el parpadeo (Blink) en apuros,
   se cura con objetos, pelea con la barra bien sincronizada y perdona a algunos.

   PARA QUITARLO CUANDO TODO ESTÉ LISTO:
     1) Borra este archivo (js/autoplay.js)
     2) En index.html borra la línea <script src="js/autoplay.js"></script>
     3) En index.html borra el bloque <div class="demo-bar"> ... </div>
   (El resto del juego no depende de este archivo.)
   ========================================================================== */
(function () {
  'use strict';

  var ENG = window.CUM_ENGINE;
  if (!ENG) return;

  /* Ruta que sigue el bot en cada jefe: 'fight' = pelear, 'spare' = perdonar */
  var ROUTE = { slime: 'spare', morrocoy: 'fight', eye: 'spare', assassin: 'fight', rick: 'spare', final: 'fight' };
  var ORDER = ['slime', 'morrocoy', 'eye', 'assassin', 'rick', 'final'];

  var KEY = { left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', down: 'ArrowDown', ok: 'KeyZ', blink: 'ShiftLeft' };

  var A = { cool: 0.8, wait: 0, jit: 0, lastD: 0, lastFight: -1, deaths: 0 };

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function press(k) { ENG.press(KEY[k]); }
  function hold(k, v) { ENG.hold(KEY[k], v); }
  function releaseMoves() { hold('left', false); hold('right', false); hold('up', false); hold('down', false); }

  /* ----------------------------- Predicción ----------------------------- */
  var SPEED = 165, STEP = 1 / 30, HORIZON = 0.9, N = Math.round(HORIZON / STEP), PAD = 2.5;
  var S2 = 0.70710678;
  var DIRS = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [S2, S2], [S2, -S2], [-S2, S2], [-S2, -S2]];
  var BLINKS = DIRS.slice(1);

  function rawHazards(B) {
    var out = [], i;
    for (i = 0; i < B.bullets.length; i++) {
      var b = B.bullets[i];
      if (!b.active && !(b.warn > 0)) continue;          // portales y adornos
      var h = { c: b.shape === 'c', x: b.x, y: b.y, vx: b.vx, vy: b.vy, g: b.grav || 0, r: b.r * 0.85, w: b.w, h: b.h, t0: 0, t1: 1e9 };
      if (b.warn > 0) { h.t0 = b.warn; h.t1 = b.warn + (b.dur || 0.3); }
      if (b.grow) { h.grow = b.grow; h.x0 = b.x0; h.dir = b.dir; h.maxW = b.maxW; }
      if (b.x0 !== undefined && b.ph !== undefined && !b.isBeam) { h.wave = true; h.age = b.age; h.ph = b.ph; h.wx0 = b.x0; }
      out.push(h);
    }
    for (i = 0; i < B.fx.length; i++) {
      var f = B.fx[i];
      if (f.haz) out.push({ c: false, x: f.x + f.w / 2, y: f.y + f.h / 2, vx: 0, vy: 0, g: 0, r: 0, w: f.w, h: f.h + 8, t0: f.life, t1: f.life + 0.9 });
    }
    return out;
  }

  function buildHazards(B) {
    var ar = B.ar, raw = rawHazards(B), list = [];
    for (var i = 0; i < raw.length; i++) {
      var h = raw[i];
      var X = new Float32Array(N + 1), Y = new Float32Array(N + 1), W = new Float32Array(N + 1), Hh = new Float32Array(N + 1), ACT = new Uint8Array(N + 1);
      var near = false;
      for (var s = 1; s <= N; s++) {
        var t = s * STEP;
        var x = h.x + h.vx * t, y = h.y + h.vy * t + 0.5 * h.g * t * t, w = h.w;
        if (h.wave) x = h.wx0 + Math.sin((h.age + t) * 2.4 + h.ph) * 28;
        if (h.grow) {
          w = Math.min(h.maxW, h.w + h.grow * Math.max(0, t - h.t0));
          x = h.dir === 'l' ? h.x0 + w / 2 : h.x0 - w / 2;
        }
        X[s] = x; Y[s] = y; W[s] = w; Hh[s] = h.h;
        ACT[s] = (t >= h.t0 - 0.03 && t <= h.t1) ? 1 : 0;
        if (ACT[s]) {
          var rx = h.c ? h.r : w / 2, ry = h.c ? h.r : h.h / 2;
          if (x + rx > ar.l - 14 && x - rx < ar.r + 14 && y + ry > ar.t - 14 && y - ry < ar.b + 14) near = true;
        }
      }
      if (near) list.push({ c: h.c, r: h.r, X: X, Y: Y, W: W, H: Hh, ACT: ACT });
    }
    return list;
  }

  function simulate(p, ar, hz, d1, d2, blinkDir, inv0) {
    var x = p.x, y = p.y, cost = 0, inv = inv0;
    if (blinkDir) {
      x = clamp(x + blinkDir[0] * 86, ar.l, ar.r);
      y = clamp(y + blinkDir[1] * 86, ar.t, ar.b);
      inv = Math.max(inv, 0.38);
      cost += 6;
    }
    for (var s = 1; s <= N; s++) {
      var t = s * STEP, d = t <= 0.3 ? d1 : d2;
      x = clamp(x + d[0] * SPEED * STEP, ar.l, ar.r);
      y = clamp(y + d[1] * SPEED * STEP, ar.t, ar.b);
      for (var i = 0; i < hz.length; i++) {
        var h = hz[i];
        if (!h.ACT[s]) continue;
        if (h.c) {
          var dx = h.X[s] - x, dy = h.Y[s] - y, d2s = dx * dx + dy * dy, rr = h.r + 4 + PAD;
          if (d2s < rr * rr) { if (t > inv) cost += 300 * (1.1 - t); }
          else {
            var rc = rr + 10;
            if (d2s < rc * rc) cost += (rc - Math.sqrt(d2s)) * 0.35 * (1 - 0.6 * t);
          }
        } else if (Math.abs(x - h.X[s]) < h.W[s] / 2 + 4 + PAD && Math.abs(y - h.Y[s]) < h.H[s] / 2 + 4 + PAD) {
          if (t > inv) cost += 300 * (1.1 - t);
        }
      }
    }
    var edge = Math.min(x - ar.l, ar.r - x, y - ar.t, ar.b - y);
    if (edge < 10) cost += (10 - edge) * 0.4;
    cost += 0.012 * (Math.abs(x - ar.cx) + Math.abs(y - ar.cy));
    return cost;
  }

  function dodge(B) {
    var p = B.p, ar = B.ar;
    if (B.atkT < 0.05) return;                              // la caja se está acomodando
    var hz = buildHazards(B);
    var inv0 = Math.max(p.inv, p.binv, 0);
    var best = null, i, j, c;
    for (i = 0; i < DIRS.length; i++) {
      for (j = 0; j < DIRS.length; j++) {
        c = simulate(p, ar, hz, DIRS[i], DIRS[j], null, inv0);
        if (DIRS[i][0] !== 0 || DIRS[i][1] !== 0) c += 0.4;
        if (i === A.lastD) c -= 0.5;
        if (!best || c < best.cost) best = { cost: c, d: DIRS[i], di: i, blink: null };
      }
    }
    if (best.cost >= 200 && p.cd <= 0) {                    // se viene un golpe: parpadeo
      var bb = null;
      for (i = 0; i < BLINKS.length; i++) {
        for (j = 0; j < DIRS.length; j++) {
          c = simulate(p, ar, hz, BLINKS[i], DIRS[j], BLINKS[i], inv0);
          if (!bb || c < bb.cost) bb = { cost: c, d: BLINKS[i], di: -1, blink: BLINKS[i] };
        }
      }
      if (bb && bb.cost + 60 < best.cost) best = bb;
    }
    A.lastD = best.di;
    var d = best.d;
    if (d[0] > 0.1) hold('right', true); else if (d[0] < -0.1) hold('left', true);
    if (d[1] > 0.1) hold('down', true); else if (d[1] < -0.1) hold('up', true);
    if (best.blink) press('blink');
  }

  /* ------------------------------ Menús --------------------------------- */
  function menuTarget(B) {
    var potions = 0;
    for (var i = 0; i < B.items.length; i++) potions += B.items[i].n;
    if (B.hp <= 8 && potions > 0) return 2;
    var route = ROUTE[B.boss.id] || 'fight';
    if (route === 'spare') return B.mercy >= B.boss.spareNeed ? 3 : 1;
    return 0;
  }

  function goMenu(B, target) {
    if (A.cool > 0) return;
    if (B.menu === target) { press('ok'); A.cool = 0.45; return; }
    var fw = (target - B.menu + 4) % 4;
    press(fw <= 2 ? 'right' : 'left');
    A.cool = 0.2;
  }

  function goGrid(B, target) {
    if (A.cool > 0) return;
    if (B.sub === target) { press('ok'); A.cool = 0.5; return; }
    var col = B.sub % 2, tcol = target % 2, row = Math.floor(B.sub / 2), trow = Math.floor(target / 2);
    if (col !== tcol) press(tcol > col ? 'right' : 'left');
    else press(trow > row ? 'down' : 'up');
    A.cool = 0.2;
  }

  function botBattle(B, dt) {
    var st = B.state;
    if (st === 'attack') { dodge(B); return; }

    if (st === 'text') {
      if (B.tw && B.tw.done) { A.wait += dt; if (A.wait > 0.6) { press('ok'); A.wait = 0; } } else A.wait = 0;
    } else if (st === 'etalk') {
      if (B.bubble && B.bubble.tw.done) { A.wait += dt; if (A.wait > 0.45) { press('ok'); A.wait = 0; } } else A.wait = 0;
    } else if (st === 'menu') {
      goMenu(B, menuTarget(B));
    } else if (st === 'act') {
      var acts = B.boss.acts, idx = -1;
      for (var i = 0; i < acts.length; i++) if (acts[i].good && !B.used[acts[i].name]) { idx = i; break; }
      goGrid(B, idx < 0 ? 0 : idx);
    } else if (st === 'item') {
      if (A.cool <= 0) { press('ok'); A.cool = 0.5; }
    } else if (st === 'mercy') {
      if (A.cool <= 0) { if (B.sub === 0) { press('ok'); A.cool = 0.5; } else { press('up'); A.cool = 0.2; } }
    } else if (st === 'fightbar') {
      var bar = B.bar;
      if (bar && !bar.stopped) {
        if (bar.x < 4 && A.lastFight !== B.turn + B.bossHp) { A.jit = (Math.random() - 0.5) * 20; A.lastFight = B.turn + B.bossHp; }
        if (bar.x >= 260 + A.jit) press('ok');
      }
    } else if (st === 'dead') {
      if (B.deadT > 2.5) { A.wait += dt; if (A.wait > 0.6) { A.deaths++; press('ok'); A.wait = 0; } }
    }
  }

  /* ------------------------------ Tablón -------------------------------- */
  function nextBoss() {
    for (var i = 0; i < ORDER.length; i++) {
      var id = ORDER[i];
      if (ENG.P.done[id]) continue;
      if (id === 'final' && !ENG.finalUnlocked()) continue;
      return id;
    }
    return null;
  }

  function botBoard(dt) {
    var id = nextBoss();
    if (!id) { Bot.stop(); return; }
    var target = 0;
    for (var i = 0; i < ENG.BOSSES.length; i++) if (ENG.BOSSES[i].id === id) target = i;
    if (A.cool > 0) return;
    var G = ENG.G;
    if (G.cursor === target) { press('ok'); A.cool = 1.0; return; }
    press(((target - G.cursor + ENG.BOSSES.length) % ENG.BOSSES.length) <= ENG.BOSSES.length / 2 ? 'down' : 'up');
    A.cool = 0.25;
  }

  /* ------------------------------ Control ------------------------------- */
  var Bot = {
    on: false,
    speed: 1,
    stats: A,
    start: function () {
      Bot.on = true;
      A.cool = 0.8; A.wait = 0; A.lastD = 0;
      if (ENG.canvas && ENG.canvas.scrollIntoView) { try { ENG.canvas.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) {} }
      paint();
    },
    stop: function () {
      Bot.on = false;
      releaseMoves();
      paint();
    },
    step: function (dt) {
      releaseMoves();
      if (A.cool > 0) A.cool -= dt;
      var G = ENG.G;
      if (G.scene === 'board') botBoard(dt);
      else if (G.scene === 'ending') {
        var E = ENG.getE();
        if (E && E.t > 9.4) { A.wait += dt; if (A.wait > 0.4) { press('ok'); A.wait = 0; } }
      } else if (G.scene === 'battle') {
        var B = ENG.getB();
        if (B) botBattle(B, dt);
      }
    }
  };
  window.CUM_BOT = Bot;

  /* ------------------------------ Botones ------------------------------- */
  var autoBtn = document.getElementById('autoBtn');
  var speedBtn = document.getElementById('speedBtn');
  var speeds = [1, 2, 3];

  function paint() {
    if (autoBtn) {
      autoBtn.textContent = Bot.on ? 'DETENER AUTOPLAY' : 'AUTOPLAY (DEMO)';
      autoBtn.setAttribute('aria-pressed', Bot.on ? 'true' : 'false');
    }
    if (speedBtn) speedBtn.textContent = 'VELOCIDAD x' + Bot.speed;
    var st = document.getElementById('autoState');
    if (st) st.textContent = Bot.on ? '● Jugando solo...' : '';
  }

  if (autoBtn) autoBtn.addEventListener('click', function () { if (Bot.on) Bot.stop(); else Bot.start(); });
  if (speedBtn) {
    speedBtn.addEventListener('click', function () {
      Bot.speed = speeds[(speeds.indexOf(Bot.speed) + 1) % speeds.length];
      paint();
    });
  }
  paint();

  if ((window.location.search || '').indexOf('auto') >= 0) {
    setTimeout(function () { Bot.start(); }, 600);
  }
})();
