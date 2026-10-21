/* ==========================================================================
   MUDKIP RUN: corredor infinito (estilo "dinosaurio sin internet") con un Mudkip cute.
   Todo el arte está dibujado por código (pixel art propio, sin imágenes).
   Controles: ESPACIO / FLECHA ARRIBA / W / Z = saltar · FLECHA ABAJO / S = agacharse
              clic o toque en el juego = saltar
   ========================================================================== */
(function () {
  'use strict';
  window.CUM_V = window.CUM_V || {}; window.CUM_V.runner = 1;

  var canvas = document.getElementById('runnerCanvas');
  if (!canvas) return;
  var c = canvas.getContext('2d');
  var W = 640, H = 220, GROUND = 180, SC = 2;
  var FP = '"Press Start 2P", "Courier New", monospace';
  var FT = '"VT323", "Courier New", monospace';

  var PAL = {"#": "#1d4a8a", "B": "#62b8f5", "D": "#3f98e0", "L": "#9bd6ff", "T": "#e6eeff", "t": "#bfd2f8", "W": "#f6faff", "O": "#ffa53a", "o": "#e6821e", "K": "#14223a", "H": "#ffffff", "P": "#ff9fb5", "C": "#9ee8ff"};
  var ROWS = {"idle": ["..........#BBB#..............", ".........#BBBBB#.............", ".........#BBBBB#.............", ".........#BBLBB#.............", "........#BBBLBBB#............", "........#BBBLBBB#............", "........#BBBLBBB#............", "........#BBBLBBB#............", "........#BBBLBBB#............", ".........#BBBBB######........", "...#####.#BBBBBBBBBBB##......", "..#TTTTT#BBBBBBBBBBBBBB#.....", ".#TTTTTTBBBBBBBBBBBBBBBB#....", ".#TTTTTBBBBBBBBBBBBBBBBBB#...", "#TTTTTBBBBBBBBBBBBBBBBBBBB#..", "#TTTTTBBBBBBBBBBBBBBBHKBBB#..", "#TTTTTBBOOOOBBBBBBBBBKKBBB#..", "#TTTTOBOOOOOOBBBBBBBWKKBBB#..", "#TttttOOOOOOOBBBBWWWWWWWWW#..", "#TttttBOOOOOOBBBWWWWWWWWPP#..", ".#ttOOBOOOOOOBBWWWWWWWWWWW#..", ".#TtttBDOOOODDDWWWWWWWWWKK#..", "..#TTToDooooDDDDWWWWWWWWW#...", "...####oDDDDDDDDDWWWWWWW#....", ".......##DDDDDDDDDWWWWW#.....", ".........##DDDDDDDDDD##......", "...........#DDD####DDD#......", "...........#DDD#..#DDD#......", "...........#ooo#..#ooo#......", "............###....###......."], "run1": ["..........#BBB#..............", ".........#BBBBB#.............", ".........#BBBBB#.............", ".........#BBLBB#.............", "........#BBBLBBB#............", "........#BBBLBBB#............", "........#BBBLBBB#............", "........#BBBLBBB#............", "........#BBBLBBB#............", ".........#BBBBB######........", "...#####.#BBBBBBBBBBB##......", "..#TTTTT#BBBBBBBBBBBBBB#.....", ".#TTTTTTBBBBBBBBBBBBBBBB#....", ".#TTTTTBBBBBBBBBBBBBBBBBB#...", "#TTTTTBBBBBBBBBBBBBBBBBBBB#..", "#TTTTTBBBBBBBBBBBBBBBHKBBB#..", "#TTTTTBBOOOOBBBBBBBBBKKBBB#..", "#TTTTOBOOOOOOBBBBBBBWKKBBB#..", "#TttttOOOOOOOBBBBWWWWWWWWW#..", "#TttttBOOOOOOBBBWWWWWWWWPP#..", ".#ttOOBOOOOOOBBWWWWWWWWWWW#..", ".#TtttBDOOOODDDWWWWWWWWWKK#..", "..#TTToDooooDDDDWWWWWWWWW#...", "...####oDDDDDDDDDWWWDDDW#....", ".......##DDDDDDDDDWWDDD#.....", ".........##DDDDDDDDDooo#.....", "..........#DDD#########......", "..........#DDD#..............", "..........#ooo#..............", "...........###..............."], "run2": ["..........#BBB#..............", ".........#BBBBB#.............", ".........#BBBBB#.............", ".........#BBLBB#.............", "........#BBBLBBB#............", "........#BBBLBBB#............", "........#BBBLBBB#............", "........#BBBLBBB#............", "........#BBBLBBB#............", "...#####.#BBBBB######........", "..#TTTTT##BBBBBBBBBBB##......", ".#TTTTTTTBBBBBBBBBBBBBB#.....", ".#TTTTTTBBBBBBBBBBBBBBBB#....", "#TTTTTTBBBBBBBBBBBBBBBBBB#...", "#TTTTTBBBBBBBBBBBBBBBBBBBB#..", "#TTTTTBBBBBBBBBBBBBBBHKBBB#..", "#TTTTTBBOOOOBBBBBBBBBKKBBB#..", "#TtttOBOOOOOOBBBBBBBWKKBBB#..", "#TttttOOOOOOOBBBBWWWWWWWWW#..", ".#ttttBOOOOOOBBBWWWWWWWWPP#..", ".#TtOOBOOOOOOBBWWWWWWWWWWW#..", "..#TTTBDOOOODDDWWWWWWWWWKK#..", "...###oDooooDDDDWWWWWWWWW#...", "......#oDDDDDDDDDWWWWWWW#....", ".......##DDDDDDDDDWWWWW#.....", ".........##DoooDDDDDD##......", "...........########DDD#......", "..................#DDD#......", "..................#ooo#......", "...................###......."], "jump": [".............................", ".............................", ".............................", ".............................", ".............................", ".........#BBBBB#.............", ".........#BBLBB#.............", "........#BBBLBBB#............", "........#BBBLBBB#............", "........#BBBLBBB#............", "........#BBBLBBB#............", "........#BBBLBBB#............", ".........#BBBBB######........", "...#####.#BBBBBBBBBBB##......", "..#TTTTT#BBBBBBBBBBBBBB#.....", ".#TTTTTTBBBBBBBBBBBBBBBB#....", ".#TTTTTBBBBBBBBBBBBBBBBBB#...", "#TTTTTBBBBBBBBBBBBBBBBBBBB#..", "#TTTTTBBBBBBBBBBBBBBBHKBBB#..", "#TTTTTBBOOOOBBBBBBBBBKKBBB#..", "#TTTTOBOOOOOOBBBBBBBWKKBBB#..", "#TttttOOOOOOOBBBBWWWWWWWWW#..", "#TttttBOOOOOOBBBWWWWWWWWPP#..", ".#ttOOBOOOOOOBBWWWWWWWWWWW#..", ".#TtttBDOOOODDDWWWWWWWWWKK#..", "..#TTToDooooDDDDWWWWWWWWW#...", "...####oDDDDDDDDDWWDDDWW#....", ".......##DDDDDDDDDWDDDW#.....", ".........##DoooDDDDooo#......", "...........###########......."], "duck": [".............................", ".............................", ".............................", ".............................", ".............................", ".............................", ".............................", ".............................", ".............................", ".............................", ".............................", ".............................", ".............................", ".............................", ".........##############......", "...######BBBBBBBBBBBBBB##....", "..#TTTTBBBBBBBBBBBBBBBBBB##..", ".#TTTBBBBBBBBBBBBBBBBBBBBBB#.", "#TTTBBBBBBBBBBBBBBBBBHKBBBBB#", "#TTTBBBBOOOOBBBBBBBBBKKBBBBB#", "#TTTBOBOOOOOOBBBBBBBBKKBBBBB#", "#TttBBOOOOOOOBBBBBBWWWWWBBBB#", ".#ttBBBOOOOOOBBBWWWWWWWWPPWB#", "..#tOOBOOOOOOBBWWWWWWWWWWWWW#", "...##DDDOOOODDDWWWWWWWWWKKW#.", ".....#oDooooDDDDWWWWWWWWWW#..", "......#o#DDDDDDDDDWWWWW###...", ".......#.##DDD#####DDD#......", "..........#DDD#...#DDD#......", "...........###.....###......."], "dead": ["..........#BBB#..............", ".........#BBBBB#.............", ".........#BBBBB#.............", ".........#BBLBB#.............", "........#BBBLBBB#............", "........#BBBLBBB#............", "........#BBBLBBB#............", "........#BBBLBBB#............", "........#BBBLBBB#............", ".........#BBBBB######........", "...#####.#BBBBBBBBBBB##......", "..#TTTTT#BBBBBBBBBBBBBB#.....", ".#TTTTTTBBBBBBBBBBBBBBBB#....", ".#TTTTTBBBBBBBBBBBBBBBBBB#...", "#TTTTTBBBBBBBBBBBBBBKBKBBB#..", "#TTTTTBBBBBBBBBBBBBBBKBBBB#..", "#TTTTTBBOOOOBBBBBBBBKBKBBB#..", "#TTTTOBOOOOOOBBBBBBBWWWBBB#..", "#TttttOOOOOOOBBBBWWWWWWWCW#..", "#TttttBOOOOOOBBBWWWWWWWWCW#..", ".#ttOOBOOOOOOBBWWWWWWWWWWW#..", ".#TtttBDOOOODDDWWWWWWWWWKK#..", "..#TTToDooooDDDDWWWWWWWWW#...", "...####oDDDDDDDDDWWWWWWW#....", ".......##DDDDDDDDDWWWWW#.....", ".........##DDDDDDDDDD##......", "...........#DDD####DDD#......", "...........#DDD#..#DDD#......", "...........#ooo#..#ooo#......", "............###....###......."]};

  function sfx(n) { if (window.SFX) window.SFX.play(n); }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  /* ----------------------------- Sprites -------------------------------- */
  function bake(rows, scale) {
    var h = rows.length, w = rows[0].length;
    var cv = document.createElement('canvas');
    cv.width = w * scale; cv.height = h * scale;
    var g = cv.getContext('2d');
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        var ch = rows[y].charAt(x);
        if (ch !== '.') { g.fillStyle = PAL[ch]; g.fillRect(x * scale, y * scale, scale, scale); }
      }
    }
    return cv;
  }
  var SPR = {};
  Object.keys(ROWS).forEach(function (k) { SPR[k] = bake(ROWS[k], SC); });
  var SPR_W = ROWS.idle[0].length * SC, SPR_H = ROWS.idle.length * SC;

  function pixEll(cx, cy, rx, ry, st, color) {
    c.fillStyle = color;
    for (var y = -ry; y < ry; y += st) {
      var yy = y + st / 2;
      var k = Math.sqrt(Math.max(0, 1 - (yy * yy) / (ry * ry)));
      var hw = Math.round((rx * k) / st) * st;
      if (hw > 0) c.fillRect(Math.round(cx - hw), Math.round(cy + y), hw * 2, st);
    }
  }
  function R(x, y, w, h, col) { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), w, h); }

  /* ----------------------------- Estado --------------------------------- */
  var HI_KEY = 'cum_runner_hi';
  var hi = 0;
  try { hi = parseInt(localStorage.getItem(HI_KEY), 10) || 0; } catch (e) {}

  var S = { state: 'idle', t: 0, focus: false, speed: 320, dist: 0, score: 0, lastHundred: 0, flash: 0, deadT: 0, spawnIn: 1.2, lastWasBird: false };
  var M = { x: 64, y: GROUND, vy: 0, ground: true, duck: false, ft: 0, fr: 0 };
  var obs = [], parts = [], clouds = [], bumps = [];
  var keysDown = {};

  for (var i = 0; i < 4; i++) clouds.push({ x: rnd(0, W), y: rnd(18, 80), s: rnd(0.8, 1.4) });
  for (var j = 0; j < 40; j++) bumps.push({ x: rnd(0, W), y: GROUND + 8 + rnd(0, 26), w: 2 + Math.floor(rnd(0, 4)) * 2 });

  function reset() {
    S.speed = 320; S.dist = 0; S.score = 0; S.lastHundred = 0; S.flash = 0; S.spawnIn = 1.0; S.lastWasBird = false;
    M.y = GROUND; M.vy = 0; M.ground = true; M.duck = false;
    obs = []; parts = [];
  }

  function start() { reset(); S.state = 'run'; jump(); }

  function jump() {
    if (!M.ground) return;
    M.vy = -720; M.ground = false; M.duck = false;
    sfx('jump');
  }

  function dust(x, y, n) {
    for (var i = 0; i < n; i++) parts.push({ x: x + rnd(-4, 4), y: y, vx: rnd(-90, -20), vy: rnd(-70, -15), life: rnd(0.25, 0.5), age: 0, s: 2 + Math.floor(rnd(0, 3)) });
  }

  /* ----------------------------- Obstáculos ----------------------------- */
  var TYPES = {
    rock:    { w: 26, h: 24 },
    pillar:  { w: 22, h: 44 },
    cluster: { w: 54, h: 20 },
    bird:    { w: 30, h: 20 }
  };

  function spawn() {
    var pool = ['rock', 'rock', 'pillar', 'cluster'];
    if (S.score > 250 && !S.lastWasBird) pool.push('bird', 'bird');
    var type = pool[Math.floor(Math.random() * pool.length)];
    var T = TYPES[type];
    var o = { type: type, x: W + 20, w: T.w, h: T.h, y: GROUND, fr: 0, ft: 0 };
    if (type === 'bird') {
      var low = Math.random() < 0.5;
      o.y = low ? GROUND - 6 : GROUND - 36;           // 'y' es la base del pájaro: bajo = saltar, medio = agacharse
      o.low = low;
    }
    obs.push(o);
    S.lastWasBird = (type === 'bird');
    var gapT = rnd(1.05, 1.85) + (S.lastWasBird ? 0.35 : 0);
    S.spawnIn = (T.w / S.speed) + gapT;
  }

  function hitbox() {
    if (M.duck && M.ground) return { x: M.x + 10, y: M.y - 30, w: 40, h: 28 };
    return { x: M.x + 14, y: M.y - 50, w: 34, h: 48 };
  }
  function obsBox(o) { return { x: o.x + 3, y: o.y - o.h + 3, w: o.w - 6, h: o.h - 5 }; }
  function overlap(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }

  /* ----------------------------- Actualización -------------------------- */
  function die() {
    S.state = 'dead'; S.deadT = 0;
    if (S.score > hi) { hi = Math.floor(S.score); try { localStorage.setItem(HI_KEY, String(hi)); } catch (e) {} }
    sfx('fart');
  }

  function update(dt) {
    S.t += dt;
    for (var ci = 0; ci < clouds.length; ci++) {
      clouds[ci].x -= (14 + (S.state === 'run' ? S.speed * 0.06 : 0)) * clouds[ci].s * dt;
      if (clouds[ci].x < -80) { clouds[ci].x = W + rnd(10, 120); clouds[ci].y = rnd(18, 80); }
    }
    if (S.flash > 0) S.flash -= dt;

    if (S.state === 'idle') { M.ft += dt; return; }
    if (S.state === 'dead') { S.deadT += dt; updParts(dt); return; }

    // ---- corriendo ----
    S.speed = Math.min(620, 320 + S.score * 0.45);
    S.dist += S.speed * dt;
    S.score += S.speed * dt * 0.04;
    var hundred = Math.floor(S.score / 100);
    if (hundred > S.lastHundred) { S.lastHundred = hundred; S.flash = 0.9; sfx('point'); }

    // Mudkip: física
    var wantDuck = !!(keysDown.ArrowDown || keysDown.KeyS);
    if (M.ground) { M.duck = wantDuck; }
    else if (wantDuck) { M.vy = Math.max(M.vy, 900); }                // caída rápida
    if (!M.ground) {
      M.vy += 2600 * dt;
      M.y += M.vy * dt;
      if (M.y >= GROUND) { M.y = GROUND; M.vy = 0; M.ground = true; M.duck = wantDuck; dust(M.x + 14, GROUND, 5); }
    } else {
      M.ft += dt;
      if (M.ft > 0.11) { M.ft = 0; M.fr = 1 - M.fr; if (Math.random() < 0.5) dust(M.x + 12, GROUND, 1); }
    }

    // obstáculos
    S.spawnIn -= dt;
    if (S.spawnIn <= 0) spawn();
    var hb = hitbox();
    for (var i = obs.length - 1; i >= 0; i--) {
      var o = obs[i];
      o.x -= S.speed * dt;
      if (o.type === 'bird') { o.x -= 60 * dt; o.ft += dt; if (o.ft > 0.14) { o.ft = 0; o.fr = 1 - o.fr; } }
      if (o.x + o.w < -10) { obs.splice(i, 1); continue; }
      if (overlap(hb, obsBox(o))) { die(); break; }
    }
    updParts(dt);
  }

  function updParts(dt) {
    for (var i = parts.length - 1; i >= 0; i--) {
      var p = parts[i];
      p.age += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 120 * dt;
      if (p.age > p.life) parts.splice(i, 1);
    }
  }

  /* ----------------------------- Dibujo --------------------------------- */
  function drawBg() {
    c.fillStyle = '#f6b79b';
    c.fillRect(0, 0, W, H);
    // cuadrícula blanca que se desplaza (como el fondo de la imagen de referencia)
    var off = S.state === 'run' || S.state === 'dead' ? (S.dist * 0.35) % 24 : (S.t * 8) % 24;
    c.fillStyle = 'rgba(255,255,255,0.38)';
    for (var x = -off; x < W; x += 24) c.fillRect(Math.round(x), 0, 1, GROUND);
    for (var y = 12; y < GROUND; y += 24) c.fillRect(0, y, W, 1);
    // nubes
    for (var i = 0; i < clouds.length; i++) {
      var cl = clouds[i];
      c.globalAlpha = 0.75;
      pixEll(cl.x, cl.y, 26 * cl.s, 9 * cl.s, 3, '#ffffff');
      pixEll(cl.x - 16 * cl.s, cl.y + 4, 16 * cl.s, 7 * cl.s, 3, '#ffffff');
      pixEll(cl.x + 18 * cl.s, cl.y + 4, 18 * cl.s, 7 * cl.s, 3, '#ffffff');
      c.globalAlpha = 1;
    }
    // suelo
    R(0, GROUND, W, H - GROUND, '#e58f6d');
    R(0, GROUND, W, 3, '#b8573a');
    var go = (S.state === 'idle') ? 0 : S.dist;
    for (var b = 0; b < bumps.length; b++) {
      var bx = ((bumps[b].x - go) % W + W) % W;
      R(bx, bumps[b].y, bumps[b].w * 2, 2, '#c9694a');
    }
  }

  function drawObstacle(o) {
    var cx = o.x + o.w / 2;
    if (o.type === 'rock') {
      pixEll(cx, GROUND - o.h / 2 + 2, o.w / 2 + 2, o.h / 2 + 2, 2, '#3f3366');
      pixEll(cx, GROUND - o.h / 2 + 2, o.w / 2, o.h / 2, 2, '#8d7fb5');
      pixEll(cx - 5, GROUND - o.h + 8, 6, 4, 2, '#c4b9e6');
      R(cx + 2, GROUND - o.h / 2, 2, 8, '#5b4d8a');
    } else if (o.type === 'pillar') {
      R(o.x - 2, GROUND - o.h - 2, o.w + 4, o.h + 2, '#4a2d1c');
      R(o.x, GROUND - o.h, o.w, o.h, '#8a5a3c');
      R(o.x + 3, GROUND - o.h + 4, 4, o.h - 10, '#b07a55');
      R(o.x + o.w - 6, GROUND - o.h + 10, 3, 12, '#5e3b26');
      pixEll(cx, GROUND - o.h, o.w / 2 + 2, 5, 2, '#4a2d1c');
      pixEll(cx, GROUND - o.h, o.w / 2, 4, 2, '#a06b47');
      R(cx - 3, GROUND - o.h + 6, 3, 6, '#6fbf73');             // un brotecito
    } else if (o.type === 'cluster') {
      var sizes = [[10, 8], [14, 10], [11, 9]], px = o.x;
      for (var i = 0; i < 3; i++) {
        var sw = sizes[i][0] + 8, sh = sizes[i][1] + 4;
        pixEll(px + sw / 2, GROUND - sh / 2 + 2, sw / 2 + 2, sh / 2 + 2, 2, '#3f3366');
        pixEll(px + sw / 2, GROUND - sh / 2 + 2, sw / 2, sh / 2, 2, '#8d7fb5');
        pixEll(px + sw / 2 - 3, GROUND - sh + 4, 3, 2, 2, '#c4b9e6');
        px += sw + 2;
      }
    } else if (o.type === 'bird') {
      var by = o.y - o.h / 2;
      pixEll(cx, by, 13, 8, 2, '#b54a78');
      pixEll(cx, by, 11, 6, 2, '#ff8fb5');
      R(cx - 18, by - 1, 8, 4, '#ffb347');                       // pico
      R(cx - 8, by - 3, 3, 3, '#14223a');                        // ojo
      if (o.fr === 0) { R(cx - 2, by - 14, 12, 10, '#ff6f9f'); R(cx + 2, by - 18, 6, 6, '#ff6f9f'); }
      else { R(cx - 2, by + 4, 12, 10, '#ff6f9f'); R(cx + 2, by + 12, 6, 6, '#ff6f9f'); }
      R(cx + 10, by - 2, 6, 3, '#ff6f9f');                       // cola
    }
  }

  function drawMudkip() {
    var pose, y = M.y;
    if (S.state === 'dead') pose = 'dead';
    else if (S.state === 'idle') { pose = 'idle'; y = GROUND - Math.abs(Math.sin(S.t * 3)) * 3; }
    else if (!M.ground) pose = 'jump';
    else if (M.duck) pose = 'duck';
    else pose = M.fr === 0 ? 'run1' : 'run2';
    // sombrita
    c.globalAlpha = 0.25;
    pixEll(M.x + SPR_W / 2 - 2, GROUND + 3, 24 - Math.min(14, (GROUND - M.y) / 5), 4, 2, '#7a3a24');
    c.globalAlpha = 1;
    c.drawImage(SPR[pose], Math.round(M.x), Math.round(y - SPR_H + 2));
  }

  function pad(n, l) { var s = String(Math.floor(n)); while (s.length < l) s = '0' + s; return s; }

  function drawHud() {
    var blink = S.flash > 0 && Math.floor(S.flash * 10) % 2 === 0;
    c.font = '12px ' + FP; c.textAlign = 'right'; c.textBaseline = 'alphabetic';
    c.fillStyle = '#a0583c'; c.fillText('HI ' + pad(hi, 5), W - 130, 26);
    c.fillStyle = blink ? '#ffffff' : '#6b2f1c'; c.fillText(pad(S.score, 5), W - 14, 26);
    c.textAlign = 'left';
  }

  function drawText(s, x, y, size, col, fam, align) {
    c.font = size + 'px ' + (fam || FT); c.fillStyle = col; c.textAlign = align || 'center'; c.textBaseline = 'alphabetic';
    c.fillText(s, x, y); c.textAlign = 'left';
  }

  function render() {
    c.setTransform(1, 0, 0, 1, 0, 0);
    drawBg();
    for (var i = 0; i < obs.length; i++) drawObstacle(obs[i]);
    for (var p = 0; p < parts.length; p++) {
      var q = parts[p];
      c.globalAlpha = 1 - q.age / q.life;
      R(q.x, q.y, q.s, q.s, '#fff4ec');
    }
    c.globalAlpha = 1;
    drawMudkip();
    drawHud();

    if (S.state === 'idle') {
      drawText('MUDKIP RUN', W / 2, 70, 18, '#6b2f1c', FP);
      if (Math.floor(S.t * 2) % 2 === 0) drawText('Haz clic aquí y presiona ESPACIO', W / 2, 106, 24, '#6b2f1c', FT);
    } else if (S.state === 'dead') {
      drawText('¡PLOP!', W / 2, 74, 20, '#6b2f1c', FP);
      if (S.deadT > 0.45) drawText('ESPACIO para reintentar', W / 2, 108, 24, '#6b2f1c', FT);
    }
    if (!S.focus) {
      c.fillStyle = 'rgba(40,16,10,0.62)';
      c.fillRect(0, 0, W, H);
      drawText('HAZ CLIC AQUÍ PARA JUGAR', W / 2, 100, 14, '#ffe14d', FP);
      drawText('ESPACIO: saltar    ABAJO: agacharse', W / 2, 136, 22, '#ffffff', FT);
    }
  }

  /* ----------------------------- Entrada -------------------------------- */
  var JUMP = { Space: 1, ArrowUp: 1, KeyW: 1, KeyZ: 1 };
  var DUCK = { ArrowDown: 1, KeyS: 1 };

  function action() {
    if (S.state === 'idle') start();
    else if (S.state === 'dead') { if (S.deadT > 0.45) start(); }
    else jump();
  }

  canvas.addEventListener('keydown', function (e) {
    if (JUMP[e.code] || DUCK[e.code]) e.preventDefault();
    keysDown[e.code] = true;
    if (JUMP[e.code] && !e.repeat) action();
    if (DUCK[e.code] && S.state === 'idle') { /* nada */ }
  });
  canvas.addEventListener('keyup', function (e) { keysDown[e.code] = false; });
  canvas.addEventListener('focus', function () { S.focus = true; });
  canvas.addEventListener('blur', function () { S.focus = false; keysDown = {}; });
  canvas.addEventListener('mousedown', function () { try { canvas.focus(); } catch (e) {} if (S.focus) action(); });
  canvas.addEventListener('touchstart', function (e) { e.preventDefault(); try { canvas.focus(); } catch (er) {} S.focus = true; action(); }, { passive: false });

  /* ----------------------------- Bucle ---------------------------------- */
  var last = 0;
  function frame(ts) {
    window.requestAnimationFrame(frame);
    var dt = Math.min(0.033, (ts - last) / 1000 || 0);
    last = ts;
    if (S.focus || S.state === 'idle') update(dt);
    render();
  }
  window.requestAnimationFrame(frame);

  if (window.__RUNNER_TEST__) {
    window.__RUNNER_TEST__.api = {
      S: S, M: M, getObs: function () { return obs; }, update: update, render: render, action: action, jump: jump,
      keys: keysDown, hitbox: hitbox, obsBox: obsBox, setFocus: function (v) { S.focus = v; }, GROUND: GROUND
    };
  }
})();
