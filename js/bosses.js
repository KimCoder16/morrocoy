/* ==========================================================================
   JEFES: dibujo, diálogos, opciones de ACT y patrones de ataque.
   Todo el arte está dibujado por código (pixel art propio).
   Para cambiar chistes o textos, edita los arreglos "talk", "flavor", "acts",
   "win" y "spare" de cada jefe, y FINAL_MESSAGE más abajo.
   ========================================================================== */
(function () {
  'use strict';

  var TAU = Math.PI * 2;

  function rnd(a, b) { return a + Math.random() * (b - a); }
  function ri(a, b) { return Math.floor(rnd(a, b + 1)); }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function angDiff(a, b) {
    var d = a - b;
    while (d > Math.PI) d -= TAU;
    while (d < -Math.PI) d += TAU;
    return d;
  }

  function pixEllipse(c, cx, cy, rx, ry, st, color) {
    c.fillStyle = color;
    for (var y = -ry; y < ry; y += st) {
      var yy = y + st / 2;
      var kk = Math.sqrt(Math.max(0, 1 - (yy * yy) / (ry * ry)));
      var hw = Math.round((rx * kk) / st) * st;
      if (hw > 0) c.fillRect(Math.round(cx - hw), Math.round(cy + y), hw * 2, st);
    }
  }

  function R(c, x, y, w, h, color) {
    c.fillStyle = color;
    c.fillRect(Math.round(x), Math.round(y), w, h);
  }

  /* ----------------------------------------------------------------------
     MENSAJE FINAL (se muestra al vencer o perdonar al jefe final)
     ---------------------------------------------------------------------- */
  window.FINAL_MESSAGE = [
    '¡FELICIDADES, DAVID!',
    'Ya no eres veneco jsjs',
    '¡¡RAYO DESVENEZUELIZADOR!!'
  ];

  /* ----------------------------------------------------------------------
     DIBUJO DE BALAS ESPECIALES
     ---------------------------------------------------------------------- */
  function dSlime(c, b) {
    pixEllipse(c, b.x, b.y, b.r, b.r, 2, '#bfe0ff');
    pixEllipse(c, b.x, b.y + 1, b.r - 2, b.r - 2, 2, '#2c7be5');
    R(c, b.x - b.r / 2, b.y - b.r / 2, 3, 3, '#e8f4ff');
  }

  function dEye(c, b) {
    pixEllipse(c, b.x, b.y, b.r, b.r, 2, '#fff');
    pixEllipse(c, b.x, b.y, b.r - 2, b.r - 2, 2, '#f3ecd9');
    pixEllipse(c, b.x, b.y, Math.max(2, b.r / 2), Math.max(2, b.r / 2), 2, '#d62d2d');
    R(c, b.x - 1, b.y - 1, 3, 3, '#111');
  }

  function dBigEye(c, b) {
    pixEllipse(c, b.x, b.y, b.r + 2, b.r + 2, 4, '#fff');
    pixEllipse(c, b.x, b.y, b.r, b.r, 4, '#efe8d6');
    pixEllipse(c, b.x, b.y, b.r / 2, b.r / 2, 4, '#c0392b');
    pixEllipse(c, b.x, b.y, b.r / 4, b.r / 4, 2, '#111');
  }

  function dPortal(c, b) {
    var t = b.age || 0;
    pixEllipse(c, b.x, b.y, 12, 20, 3, '#0f5a0f');
    pixEllipse(c, b.x, b.y, 9, 17, 3, '#1c8a1a');
    pixEllipse(c, b.x, b.y, 6, 13, 3, '#7cfc5a');
    pixEllipse(c, b.x, b.y, 3, 8, 3, '#eaffd9');
    var a = t * 5;
    R(c, b.x + Math.cos(a) * 9 - 1, b.y + Math.sin(a) * 15 - 1, 3, 3, '#fff');
    R(c, b.x + Math.cos(a + Math.PI) * 9 - 1, b.y + Math.sin(a + Math.PI) * 15 - 1, 3, 3, '#fff');
  }

  function dMeeseeks(c, b) {
    pixEllipse(c, b.x, b.y, b.r, b.r, 2, '#fff');
    pixEllipse(c, b.x, b.y, b.r - 2, b.r - 2, 2, '#4fc3f7');
    R(c, b.x - 4, b.y - 3, 2, 2, '#111');
    R(c, b.x + 2, b.y - 3, 2, 2, '#111');
    R(c, b.x - 3, b.y + 2, 6, 2, '#111');
  }

  function dRat(c, b) {
    var dir = b.vx >= 0 ? 1 : -1;
    pixEllipse(c, b.x, b.y, b.r, b.r - 1, 2, '#fff');
    pixEllipse(c, b.x, b.y, b.r - 2, b.r - 3, 2, '#8a6a4a');
    R(c, b.x - dir * (b.r + 3), b.y, 4, 2, '#d9b8a0');
    R(c, b.x + dir * (b.r - 3), b.y - 2, 2, 2, '#111');
  }

  function dText(c, b) {
    R(c, b.x - b.w / 2 - 1, b.y - b.h / 2 - 1, b.w + 2, b.h + 2, '#fff');
    R(c, b.x - b.w / 2, b.y - b.h / 2, b.w, b.h, '#12320f');
    c.font = '18px "VT323", monospace';
    c.fillStyle = '#9cff7a';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(b.txt || 'no sé', b.x, b.y + 1);
    c.textAlign = 'left';
    c.textBaseline = 'alphabetic';
  }

  var HEART_MAP = ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'];
  function dHeart(c, b) {
    var s = 2;
    c.fillStyle = b.color;
    for (var r = 0; r < HEART_MAP.length; r++) {
      for (var q = 0; q < HEART_MAP[r].length; q++) {
        if (HEART_MAP[r].charAt(q) === 'X') c.fillRect(Math.round(b.x - 7 + q * s), Math.round(b.y - 6 + r * s), s, s);
      }
    }
    R(c, b.x - 4, b.y - 4, 2, 2, '#fff');
  }

  function dShell(c, b) {
    pixEllipse(c, b.x, b.y, b.r, b.r, 2, '#fff');
    pixEllipse(c, b.x, b.y, b.r - 2, b.r - 2, 2, '#7a5c2e');
    pixEllipse(c, b.x, b.y, b.r / 2, b.r / 2, 2, '#a07c3c');
  }

  function dFlame(c, b) {
    pixEllipse(c, b.x, b.y, 7, 8, 2, '#ff8c42');
    pixEllipse(c, b.x, b.y + 1, 4, 5, 2, '#ffd166');
  }

  /* ----------------------------------------------------------------------
     UTILIDADES DE PATRONES
     ---------------------------------------------------------------------- */
  function mix(a, b) {
    return {
      dur: Math.max(a.dur, b.dur), w: Math.max(a.w, b.w), h: Math.max(a.h, b.h), sx: a.sx, sy: a.sy,
      tick: function (g, t, dt) {
        if (t < a.dur) a.tick(g, t, dt);
        if (t < b.dur) b.tick(g, t, dt);
      }
    };
  }

  /* Muro de balas con un hueco. side: 'l' | 'r' | 't' (de dónde viene). Devuelve el nuevo inicio del hueco. */
  function wall(g, side, o) {
    var ar = g.ar;
    var horizontal = (side === 'l' || side === 'r');
    var len = horizontal ? ar.h : ar.w;
    var size = o.r * 2 + 2;
    var n = Math.floor(len / size);
    var gap = o.gap;
    var gs = clamp(o.start, 0, n - gap);
    for (var i = 0; i < n; i++) {
      if (i >= gs && i < gs + gap) continue;
      var off = (i + 0.5) * (len / n);
      var x, y, vx = 0, vy = 0;
      if (side === 'l') { x = ar.l - 12; y = ar.t + off; vx = o.speed; }
      else if (side === 'r') { x = ar.r + 12; y = ar.t + off; vx = -o.speed; }
      else { y = ar.t - 12; x = ar.l + off; vy = o.speed; }
      g.shoot({ x: x, y: y, vx: vx, vy: vy, r: o.r, color: o.color, draw: o.draw });
    }
    return { n: n, gs: gs };
  }

  /* ======================================================================
     PATRONES: REY SLIME
     ====================================================================== */
  function bounce(b, dt, g) {
    b.vy += 170 * dt;
    var ar = g.ar;
    if (b.bn > 0 && b.y > ar.b - b.r && b.vy > 0) {
      b.y = ar.b - b.r;
      b.vy = -b.vy * 0.82;
      b.bn--;
    }
    if ((b.x < ar.l + b.r && b.vx < 0) || (b.x > ar.r - b.r && b.vx > 0)) b.vx = -b.vx;
  }

  function wallBounce(b, dt, g) {
    var ar = g.ar;
    if (b.bn > 0) {
      if (b.x < ar.l + b.r && b.vx < 0) { b.vx = -b.vx; b.bn--; }
      else if (b.x > ar.r - b.r && b.vx > 0) { b.vx = -b.vx; b.bn--; }
    }
  }

  function slimeRain(rate) {
    var acc = 0;
    rate = rate || 1;
    return {
      dur: 6, w: 250, h: 150,
      tick: function (g, t, dt) {
        if (t > 5.4) return;
        acc += dt;
        var iv = 0.3 / (g.k * rate);
        while (acc > iv) {
          acc -= iv;
          g.shoot({ x: rnd(g.ar.l + 10, g.ar.r - 10), y: g.ar.t - 12, vx: rnd(-25, 25), vy: 90 * g.sp, r: 8, bn: 2, update: bounce, draw: dSlime });
        }
      }
    };
  }

  function slimeCrush() {
    var n = 0, nxt = 0.4;
    return {
      dur: 6.2, w: 260, h: 150,
      tick: function (g, t) {
        if (t >= nxt && n < 5) {
          n++;
          nxt = t + 1.1 / g.k;
          var x = clamp(g.p.x + rnd(-24, 24), g.ar.l + 24, g.ar.r - 24);
          g.beam(x - 24, g.ar.t, 48, g.ar.h, 0.7, 0.3, '#4aa3ff');
          if (n >= 3) {
            var x2 = clamp(g.p.x + rnd(-90, 90), g.ar.l + 24, g.ar.r - 24);
            if (Math.abs(x2 - x) > 60) g.beam(x2 - 24, g.ar.t, 48, g.ar.h, 0.7, 0.3, '#4aa3ff');
          }
        }
      }
    };
  }

  function slimeFan() {
    var acc = 0.2;
    return {
      dur: 6, w: 260, h: 150,
      tick: function (g, t, dt) {
        if (t > 5.3) return;
        acc -= dt;
        if (acc <= 0) {
          acc = 0.85 / g.k;
          var n = 5, base = rnd(-0.2, 0.2);
          for (var i = 0; i < n; i++) {
            var a = Math.PI / 2 + base + (i - (n - 1) / 2) * 0.38;
            g.shoot({ x: g.ar.cx, y: g.ar.t - 8, vx: Math.cos(a) * 120 * g.sp, vy: Math.sin(a) * 120 * g.sp, r: 7, bn: 1, update: wallBounce, draw: dSlime });
          }
        }
      }
    };
  }

  /* ======================================================================
     PATRONES: OJO DE CTHULHU
     ====================================================================== */
  function eyeServants() {
    var acc = 0.3;
    return {
      dur: 6, w: 260, h: 150,
      tick: function (g, t, dt) {
        if (t > 5.3) return;
        acc -= dt;
        if (acc <= 0) {
          acc = 0.62 / g.k;
          var ar = g.ar, side = ri(0, 3), x, y;
          if (side === 0) { x = ar.l - 14; y = rnd(ar.t, ar.b); }
          else if (side === 1) { x = ar.r + 14; y = rnd(ar.t, ar.b); }
          else if (side === 2) { y = ar.t - 14; x = rnd(ar.l, ar.r); }
          else { y = ar.b + 14; x = rnd(ar.l, ar.r); }
          var a = Math.atan2(g.p.y - y, g.p.x - x), sp = 150 * g.sp;
          g.shoot({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 8, draw: dEye });
        }
      }
    };
  }

  function eyeLasers() {
    var n = 0, nxt = 0.4;
    return {
      dur: 6.4, w: 260, h: 150,
      tick: function (g, t) {
        if (t >= nxt && n < 6) {
          var ar = g.ar;
          nxt = t + 0.9 / g.k;
          if (n % 2 === 0) {
            var y = clamp(g.p.y + rnd(-14, 14), ar.t + 14, ar.b - 14);
            g.beam(ar.l - 4, y - 13, ar.w + 8, 26, 0.7, 0.22, '#ff4d4d');
          } else {
            var x = clamp(g.p.x + rnd(-14, 14), ar.l + 14, ar.r - 14);
            g.beam(x - 13, ar.t - 4, 26, ar.h + 8, 0.7, 0.22, '#ff4d4d');
          }
          n++;
        }
      }
    };
  }

  function eyeDash() {
    var n = 0, nxt = 0.3;
    return {
      dur: 6.2, w: 300, h: 160,
      tick: function (g, t) {
        if (t >= nxt && n < 4) {
          n++;
          nxt = t + 1.4 / g.k;
          var ar = g.ar;
          var fromLeft = (n % 2 === 1);
          var y = clamp(g.p.y + rnd(-10, 10), ar.t + 22, ar.b - 22);
          g.warn(ar.l, y - 20, ar.w, 40, 0.75, '#ff4d4d');
          g.after(0.75, function () {
            g.shoot({ x: fromLeft ? ar.l - 30 : ar.r + 30, y: y, vx: (fromLeft ? 1 : -1) * 430 * g.sp, r: 20, draw: dBigEye });
          });
        }
      }
    };
  }

  function eyeSway() {
    var acc = 0;
    return {
      dur: 6, w: 230, h: 160, sy: 0.82,
      tick: function (g, t, dt) {
        if (t > 5.4) return;
        acc += dt;
        var iv = 0.12 / g.k;
        while (acc > iv) {
          acc -= iv;
          for (var i = -1; i <= 1; i++) {
            var a = Math.PI / 2 + Math.sin(t * 1.9) * 1.0 + i * 0.32;
            g.shoot({ x: g.ar.cx, y: g.ar.t - 10, vx: Math.cos(a) * 105 * g.sp, vy: Math.sin(a) * 105 * g.sp, r: 5, color: '#ff7b7b' });
          }
        }
      }
    };
  }

  /* ======================================================================
     PATRONES: RICK
     ====================================================================== */
  function rickPortals() {
    var acc = 0, made = false;
    return {
      dur: 6.4, w: 270, h: 150,
      tick: function (g, t, dt) {
        var ar = g.ar;
        if (!made) {
          made = true;
          var follow = function (b, d, gg) { b.y = gg.ar.cy + Math.sin(b.age * 1.4 + b.ph) * 52; };
          g.shoot({ x: ar.l - 6, y: ar.cy, r: 14, active: false, life: 6.4, draw: dPortal, update: follow, ph: 0, side: 'l' });
          g.shoot({ x: ar.r + 6, y: ar.cy, r: 14, active: false, life: 6.4, draw: dPortal, update: follow, ph: Math.PI, side: 'r' });
        }
        if (t > 5.8) return;
        acc += dt;
        var iv = 0.2 / g.k;
        while (acc > iv) {
          acc -= iv;
          var left = Math.random() < 0.5;
          var py = ar.cy + Math.sin(t * 1.4 + (left ? 0 : Math.PI)) * 52;
          var a = (left ? 0 : Math.PI) + rnd(-0.45, 0.45);
          g.shoot({ x: left ? ar.l : ar.r, y: py, vx: Math.cos(a) * 190 * g.sp, vy: Math.sin(a) * 190 * g.sp, r: 4, color: '#7cfc5a' });
        }
      }
    };
  }

  function rickBurp(rate) {
    var acc = 0.2;
    rate = rate || 1;
    return {
      dur: 6, w: 270, h: 150,
      tick: function (g, t, dt) {
        if (t > 5.5) return;
        acc -= dt;
        if (acc <= 0) {
          acc = 0.95 / (g.k * rate);
          var n = 9, off = rnd(-0.1, 0.1);
          for (var i = 0; i < n; i++) {
            var a = 0.25 + (Math.PI - 0.5) * i / (n - 1) + off;
            g.shoot({ x: g.ar.cx, y: g.ar.t - 10, vx: Math.cos(a) * 100 * g.sp, vy: Math.sin(a) * 100 * g.sp, r: 6, color: '#9be15d' });
          }
        }
      }
    };
  }

  function rickGun() {
    var n = 0, nxt = 0.4;
    return {
      dur: 6.4, w: 270, h: 150,
      tick: function (g, t) {
        if (t >= nxt && n < 7) {
          var ar = g.ar;
          nxt = t + 0.85 / g.k;
          if (n % 2 === 0) {
            var x = clamp(g.p.x, ar.l + 11, ar.r - 11);
            g.beam(x - 11, ar.t - 4, 22, ar.h + 8, 0.62, 0.2, '#7cfc5a');
          } else {
            var y = clamp(g.p.y, ar.t + 11, ar.b - 11);
            g.beam(ar.l - 4, y - 11, ar.w + 8, 22, 0.62, 0.2, '#7cfc5a');
          }
          n++;
        }
      }
    };
  }

  function homing(b, dt, g) {
    var ta = Math.atan2(g.p.y - b.y, g.p.x - b.x);
    var ca = (b.vx === 0 && b.vy === 0) ? ta : Math.atan2(b.vy, b.vx);
    var d = angDiff(ta, ca);
    var maxTurn = 1.5 * dt;
    ca += clamp(d, -maxTurn, maxTurn);
    b.vx = Math.cos(ca) * b.spd;
    b.vy = Math.sin(ca) * b.spd;
  }

  function rickMeeseeks() {
    var spawned = 0;
    return {
      dur: 6.4, w: 270, h: 150,
      tick: function (g, t) {
        if (spawned < 3 && t >= spawned * 1.3) {
          spawned++;
          var ar = g.ar;
          var corner = ri(0, 3);
          var x = (corner % 2 === 0) ? ar.l - 8 : ar.r + 8;
          var y = (corner < 2) ? ar.t - 8 : ar.b + 8;
          g.shoot({ x: x, y: y, r: 9, spd: 78 * g.sp, life: 4.4, update: homing, draw: dMeeseeks });
        }
      }
    };
  }

  /* ======================================================================
     PATRONES: ASESINO ENMASCARADO
     ====================================================================== */
  function assBlades() {
    var n = 0, nxt = 0.4;
    return {
      dur: 6.6, w: 260, h: 150,
      tick: function (g, t) {
        if (t >= nxt && n < 5) {
          var ar = g.ar;
          n++;
          nxt = t + 1.25 / g.k;
          var x = clamp(g.p.x, ar.l + 10, ar.r - 10);
          var y = clamp(g.p.y, ar.t + 10, ar.b - 10);
          g.beam(x - 10, ar.t - 4, 20, ar.h + 8, 0.6, 0.16, '#e8e0ff');
          g.beam(ar.l - 4, y - 10, ar.w + 8, 20, 0.6, 0.16, '#e8e0ff');
          if (n % 2 === 0) {
            var x2 = clamp(x + (Math.random() < 0.5 ? -70 : 70), ar.l + 10, ar.r - 10);
            g.beam(x2 - 10, ar.t - 4, 20, ar.h + 8, 0.6, 0.16, '#c77dff');
          }
        }
      }
    };
  }

  function assDarts() {
    var acc = 0.2;
    return {
      dur: 6, w: 260, h: 150,
      tick: function (g, t, dt) {
        if (t > 5.4) return;
        acc -= dt;
        if (acc <= 0) {
          acc = 0.19 / g.k;
          var ar = g.ar, sp = 250 * g.sp;
          var side = t > 3 ? ri(0, 3) : ri(0, 1);
          if (side === 0) g.shoot({ shape: 'r', x: ar.l - 14, y: rnd(ar.t, ar.b), vx: sp, w: 22, h: 5, color: '#cfd8e8' });
          else if (side === 1) g.shoot({ shape: 'r', x: ar.r + 14, y: rnd(ar.t, ar.b), vx: -sp, w: 22, h: 5, color: '#cfd8e8' });
          else if (side === 2) g.shoot({ shape: 'r', x: rnd(ar.l, ar.r), y: ar.t - 14, vy: sp, w: 5, h: 22, color: '#cfd8e8' });
          else g.shoot({ shape: 'r', x: rnd(ar.l, ar.r), y: ar.b + 14, vy: -sp, w: 5, h: 22, color: '#cfd8e8' });
        }
      }
    };
  }

  function assRats() {
    var n = 0, nxt = 0.3, gs = ri(2, 6), side = Math.random() < 0.5 ? 'l' : 'r';
    return {
      dur: 6.4, w: 260, h: 150,
      tick: function (g, t) {
        if (t >= nxt && n < 5) {
          n++;
          nxt = t + 1.05 / g.k;
          var res = wall(g, side, { r: 6, gap: g.hard ? 3 : 4, start: gs, speed: 150 * g.sp, color: '#8a6a4a', draw: dRat });
          gs = clamp(res.gs + ri(-3, 3), 0, res.n - 3);
        }
      }
    };
  }

  function assMark() {
    var acc = 0, cnt = 0;
    return {
      dur: 6, w: 240, h: 160, sy: 0.88,
      tick: function (g, t, dt) {
        if (t > 5.4) return;
        acc += dt;
        var iv = 0.09 / g.k;
        while (acc > iv) {
          acc -= iv;
          cnt++;
          if (cnt % 4 === 0) continue;
          for (var i = 0; i < 3; i++) {
            var a = t * 1.15 + i * TAU / 3;
            g.shoot({ x: g.ar.cx, y: g.ar.cy, vx: Math.cos(a) * 88 * g.sp, vy: Math.sin(a) * 88 * g.sp, r: 5, color: '#c77dff' });
          }
        }
      }
    };
  }

  /* ======================================================================
     PATRONES: MORROCOY
     ====================================================================== */
  function shellBounce(b, dt, g) {
    var ar = g.ar;
    if ((b.x < ar.l + b.r && b.vx < 0) || (b.x > ar.r - b.r && b.vx > 0)) b.vx = -b.vx;
    if ((b.y < ar.t + b.r && b.vy < 0) || (b.y > ar.b - b.r && b.vy > 0)) b.vy = -b.vy;
  }

  function shellRoll() {
    var acc = 0, made = false;
    return {
      dur: 6.4, w: 300, h: 150, sy: 0.85,
      tick: function (g, t, dt) {
        var ar = g.ar;
        if (!made) {
          made = true;
          g.shoot({ x: ar.l + 40, y: ar.t + 40, vx: 115 * g.sp, vy: 80 * g.sp, r: 26, life: 6.4, update: shellBounce, draw: dShell });
        }
        if (t > 5.6) return;
        acc += dt;
        var iv = 0.65 / g.k;
        while (acc > iv) {
          acc -= iv;
          g.shoot({ x: rnd(ar.l + 8, ar.r - 8), y: ar.t - 10, vy: 75 * g.sp, vx: rnd(-20, 20), r: 7, draw: dShell });
        }
      }
    };
  }

  function noSe() {
    var acc = 0;
    return {
      dur: 6, w: 280, h: 150,
      tick: function (g, t, dt) {
        if (t > 5.4) return;
        acc += dt;
        var iv = 0.36 / g.k;
        while (acc > iv) {
          acc -= iv;
          var txt = Math.random() < 0.25 ? 'morrocoy' : 'no sé';
          g.shoot({ shape: 'r', x: rnd(g.ar.l + 30, g.ar.r - 30), y: g.ar.t - 12, vy: 85 * g.sp, w: 14 + txt.length * 8, h: 16, txt: txt, draw: dText });
        }
      }
    };
  }

  function lettuce() {
    var acc = 0;
    return {
      dur: 6, w: 280, h: 150,
      tick: function (g, t, dt) {
        if (t > 5.4) return;
        acc += dt;
        var iv = 0.55 / g.k;
        while (acc > iv) {
          acc -= iv;
          for (var i = -2; i <= 2; i++) {
            g.shoot({
              x: g.ar.cx + i * 46, x0: g.ar.cx + i * 46, y: g.ar.t - 10, vy: 95 * g.sp, r: 7, color: '#7cd957', ph: t * 3,
              update: function (b) { b.x = b.x0 + Math.sin(b.age * 2.4 + b.ph) * 28; }
            });
          }
        }
      }
    };
  }

  function stomp() {
    var n = 0, nxt = 0.4;
    return {
      dur: 6.4, w: 280, h: 150,
      tick: function (g, t) {
        if (t >= nxt && n < 5) {
          n++;
          nxt = t + 1.15 / g.k;
          var ar = g.ar;
          var x = clamp(g.p.x + rnd(-30, 30), ar.l + 45, ar.r - 45);
          g.beam(x - 45, ar.t, 90, ar.h, 0.9, 0.35, '#c2a15a');
          g.after(0.9, function () {
            g.shoot({ x: x - 20, y: ar.b - 8, vx: -140, r: 6, color: '#c2a15a', life: 2.5 });
            g.shoot({ x: x + 20, y: ar.b - 8, vx: 140, r: 6, color: '#c2a15a', life: 2.5 });
          });
        }
      }
    };
  }

  /* ======================================================================
     PATRONES: CAKE Y FIONNA (jefe final)
     ====================================================================== */
  function fionnaSlash() {
    var a = false, b = false, c2 = false;
    function rows(g, open) {
      var ar = g.ar, rh = ar.h / 4;
      for (var i = 0; i < 4; i++) if (i !== open) g.beam(ar.l - 4, ar.t + i * rh, ar.w + 8, rh, 0.9, 0.25, '#6ec6ff');
    }
    function cols(g, open) {
      var ar = g.ar, cw = ar.w / 5;
      for (var i = 0; i < 5; i++) if (i !== open) g.beam(ar.l + i * cw, ar.t - 4, cw, ar.h + 8, 0.9, 0.25, '#6ec6ff');
    }
    return {
      dur: 6.6, w: 280, h: 160,
      tick: function (g, t) {
        if (t >= 0.3 && !a) { a = true; rows(g, ri(0, 3)); }
        if (t >= 2.3 && !b) { b = true; cols(g, ri(0, 4)); }
        if (t >= 4.3 && !c2) { c2 = true; rows(g, ri(0, 3)); }
      }
    };
  }

  function candle(rate) {
    var acc = 0;
    rate = rate || 1;
    return {
      dur: 6.2, w: 280, h: 160,
      tick: function (g, t, dt) {
        if (t > 5.4) return;
        acc += dt;
        var iv = 0.55 / (g.k * rate);
        while (acc > iv) {
          acc -= iv;
          g.shoot({
            x: rnd(g.ar.l + 10, g.ar.r - 10), y: g.ar.b + 10, vx: rnd(-30, 30), vy: -rnd(230, 280), r: 6, draw: dFlame,
            update: function (b, d, gg) {
              b.vy += 260 * d;
              if (!b.burst && b.vy >= 0) {
                b.burst = true;
                b.life = 0;
                var off = Math.random() * TAU;
                for (var i = 0; i < 7; i++) {
                  gg.shoot({ x: b.x, y: b.y, vx: Math.cos(off + i * TAU / 7) * 95, vy: Math.sin(off + i * TAU / 7) * 95, r: 4, color: '#ff8c42' });
                }
              }
            }
          });
        }
      }
    };
  }

  function cakeStretch() {
    var n = 0, nxt = 0.4;
    return {
      dur: 6.2, w: 280, h: 160,
      tick: function (g, t) {
        if (t >= nxt && n < 4) {
          var ar = g.ar;
          var y = clamp(g.p.y + rnd(-20, 20), ar.t + 16, ar.b - 16);
          var left = (n % 2 === 0);
          nxt = t + 1.2 / g.k;
          n++;
          g.warn(ar.l, y - 14, ar.w, 28, 0.7, '#ff9ecb');
          var x0 = left ? ar.l : ar.r;
          var b = g.beam(x0, y - 14, 6, 28, 0.7, 0.6, '#ff9ecb');
          b.nowarn = true;
          b.grow = 900;
          b.dir = left ? 'l' : 'r';
          b.x0 = x0;
          b.maxW = ar.w;
          b.x = left ? x0 + 3 : x0 - 3;
        }
      }
    };
  }

  function frostRain(rate) {
    var acc = 0, acc2 = 0;
    rate = rate || 1;
    return {
      dur: 6, w: 280, h: 160,
      tick: function (g, t, dt) {
        if (t > 5.4) return;
        acc += dt;
        acc2 += dt;
        var iv = 0.11 / (g.k * rate);
        while (acc > iv) {
          acc -= iv;
          g.shoot({ x: rnd(g.ar.l, g.ar.r), y: g.ar.t - 10, vy: 140 * g.sp, r: 5, color: Math.random() < 0.5 ? '#ff9ecb' : '#ffffff' });
        }
        var iv2 = 0.35 / (g.k * rate);
        while (acc2 > iv2) {
          acc2 -= iv2;
          var left = Math.random() < 0.5;
          g.shoot({ shape: 'r', x: left ? g.ar.l - 10 : g.ar.r + 10, y: rnd(g.ar.t, g.ar.b), vx: (left ? 1 : -1) * 110 * g.sp, w: 8, h: 8, color: ['#ffd166', '#6ec6ff', '#9be15d'][ri(0, 2)] });
        }
      }
    };
  }

  function heartWall() {
    var n = 0, nxt = 0.3, gs = ri(3, 10);
    return {
      dur: 6.4, w: 280, h: 160,
      tick: function (g, t) {
        if (t >= nxt && n < 5) {
          n++;
          nxt = t + 1.0 / g.k;
          var res = wall(g, 't', { r: 7, gap: g.hard ? 3 : 4, start: gs, speed: 135 * g.sp, color: '#ff6fa8', draw: dHeart });
          gs = clamp(res.gs + ri(-3, 3), 0, res.n - 3);
        }
      }
    };
  }

  /* ----------------------------------------------------------------------
     DIBUJO DE LOS JEFES
     ---------------------------------------------------------------------- */
  function drawSlime(c, cx, cy, t) {
    var s = Math.sin(t * 3) * 4;
    pixEllipse(c, cx, cy + 22, 74 + s, 54 - s, 6, '#1d5fb8');
    pixEllipse(c, cx, cy + 24, 66 + s, 46 - s, 6, '#2c7be5');
    pixEllipse(c, cx - 22, cy + 6, 20, 12, 4, '#7fbaff');
    R(c, cx - 30, cy + 14, 16, 22, '#fff');
    R(c, cx + 14, cy + 14, 16, 22, '#fff');
    R(c, cx - 26, cy + 22, 8, 12, '#111');
    R(c, cx + 18, cy + 22, 8, 12, '#111');
    R(c, cx - 14, cy + 50, 28, 4, '#0b2f66');
    R(c, cx - 18, cy + 46, 4, 4, '#0b2f66');
    R(c, cx + 14, cy + 46, 4, 4, '#0b2f66');
    R(c, cx - 30, cy - 34, 60, 10, '#f5c518');
    R(c, cx - 30, cy - 50, 10, 16, '#f5c518');
    R(c, cx - 5, cy - 56, 10, 22, '#f5c518');
    R(c, cx + 20, cy - 50, 10, 16, '#f5c518');
    R(c, cx - 30, cy - 34, 60, 3, '#ffe27a');
    R(c, cx - 3, cy - 32, 6, 6, '#e0245e');
  }

  function drawEyeBoss(c, cx, cy, t, o) {
    var ph2 = o && o.phase === 2;
    var lx = Math.sin(t * 1.3) * 10, ly = Math.cos(t * 0.9) * 6;
    cy += Math.sin(t * 2) * 4;
    pixEllipse(c, cx, cy, 66, 66, 6, ph2 ? '#8e2a2a' : '#d8d0bc');
    pixEllipse(c, cx, cy, 60, 60, 6, ph2 ? '#c64a3f' : '#fff6e0');
    c.strokeStyle = '#c0392b';
    c.lineWidth = 3;
    var vs = [[-58, -20, -30, -6], [58, 24, 28, 8], [-20, 58, -8, 30], [30, -58, 14, -30], [-50, 34, -26, 16]];
    for (var i = 0; i < vs.length; i++) {
      c.beginPath();
      c.moveTo(cx + vs[i][0], cy + vs[i][1]);
      c.lineTo(cx + vs[i][2], cy + vs[i][3]);
      c.stroke();
    }
    if (!ph2) {
      pixEllipse(c, cx + lx, cy + ly, 28, 28, 4, '#7a1f1f');
      pixEllipse(c, cx + lx, cy + ly, 24, 24, 4, '#c0392b');
      pixEllipse(c, cx + lx, cy + ly, 11, 11, 4, '#111');
      R(c, cx + lx - 12, cy + ly - 14, 6, 6, '#ffb3a8');
    } else {
      pixEllipse(c, cx, cy + 6, 46, 36, 6, '#2a0710');
      for (var j = 0; j < 6; j++) {
        R(c, cx - 40 + j * 14, cy - 28, 10, 14, '#fff');
        R(c, cx - 40 + j * 14, cy + 20, 10, 14, '#fff');
      }
      R(c, cx - 8, cy - 4, 16, 14, '#d62d2d');
    }
  }

  function drawRick(c, cx, cy, t) {
    var bob = Math.sin(t * 2.4) * 3;
    cy += bob;
    R(c, cx - 36, cy + 70, 28, 26, '#5b6b85');
    R(c, cx + 8, cy + 70, 28, 26, '#5b6b85');
    R(c, cx - 42, cy + 14, 84, 60, '#eef2f7');
    R(c, cx - 14, cy + 14, 28, 60, '#78c8ea');
    R(c, cx - 2, cy + 14, 4, 60, '#d9e2ee');
    R(c, cx - 56, cy + 22, 16, 44, '#eef2f7');
    R(c, cx + 40, cy + 22, 16, 44, '#eef2f7');
    R(c, cx + 44, cy + 56, 28, 12, '#7cfc5a');
    R(c, cx + 62, cy + 52, 10, 20, '#2f8a2a');
    R(c, cx - 30, cy - 36, 60, 52, '#f2d3b0');
    var heights = [14, 28, 18, 34, 20, 30, 14];
    for (var i = 0; i < heights.length; i++) R(c, cx - 36 + i * 10, cy - 38 - heights[i], 8, heights[i] + 8, '#a6d8ea');
    R(c, cx - 36, cy - 44, 72, 14, '#a6d8ea');
    R(c, cx - 22, cy - 22, 44, 5, '#7fb8cc');
    pixEllipse(c, cx - 12, cy - 8, 10, 10, 2, '#fff');
    pixEllipse(c, cx + 12, cy - 8, 10, 10, 2, '#fff');
    R(c, cx - 14 + Math.round(Math.sin(t * 3) * 2), cy - 10, 4, 4, '#111');
    R(c, cx + 10 + Math.round(Math.sin(t * 3) * 2), cy - 10, 4, 4, '#111');
    R(c, cx - 14, cy + 6, 28, 5, '#6b3a2a');
    R(c, cx - 14, cy + 6, 4, 8, '#7cfc5a');
    R(c, cx + 12, cy + 6, 3, 14 + Math.round(Math.sin(t * 4) * 3), '#7cfc5a');
  }

  function drawAssassin(c, cx, cy, t) {
    cy += Math.sin(t * 1.8) * 5;
    pixEllipse(c, cx, cy + 96, 60, 8, 4, 'rgba(120,60,200,0.35)');
    pixEllipse(c, cx, cy + 40, 66, 56, 6, '#1d1d2b');
    pixEllipse(c, cx, cy + 36, 54, 50, 6, '#2b2b3d');
    R(c, cx - 3, cy + 6, 6, 80, '#14141f');
    pixEllipse(c, cx, cy - 22, 36, 38, 6, '#1d1d2b');
    pixEllipse(c, cx, cy - 18, 26, 28, 4, '#d9d6e6');
    pixEllipse(c, cx - 11, cy - 20, 9, 9, 3, '#7a3cff');
    pixEllipse(c, cx + 11, cy - 20, 9, 9, 3, '#7a3cff');
    pixEllipse(c, cx - 11, cy - 20, 5, 5, 2, '#111');
    pixEllipse(c, cx + 11, cy - 20, 5, 5, 2, '#111');
    for (var i = 0; i < 4; i++) R(c, cx - 10, cy - 2 + i * 5, 20, 2, '#6a647a');
    c.strokeStyle = '#cfd8e8';
    c.lineWidth = 5;
    c.beginPath(); c.moveTo(cx - 74, cy + 20); c.lineTo(cx - 36, cy + 66); c.stroke();
    c.beginPath(); c.moveTo(cx + 74, cy + 20); c.lineTo(cx + 36, cy + 66); c.stroke();
    R(c, cx - 82, cy + 12, 12, 6, '#6a647a');
    R(c, cx + 70, cy + 12, 12, 6, '#6a647a');
  }

  function drawMorrocoy(c, cx, cy, t) {
    var sway = Math.sin(t * 1.2) * 3;
    R(c, cx - 66, cy + 44, 22, 20, '#6e8f3a');
    R(c, cx + 36, cy + 44, 22, 20, '#6e8f3a');
    R(c, cx - 30, cy + 44, 22, 20, '#6e8f3a');
    pixEllipse(c, cx, cy + 20, 78, 54, 6, '#4f3a1c');
    pixEllipse(c, cx, cy + 20, 72, 48, 6, '#7a5c2e');
    var hex = [[-36, 0], [0, -4], [36, 0], [-18, 24], [18, 24], [-50, 28], [50, 28]];
    for (var i = 0; i < hex.length; i++) pixEllipse(c, cx + hex[i][0], cy + hex[i][1] + 10, 13, 11, 4, '#a07c3c');
    R(c, cx - 66, cy + 50, 132, 10, '#d2b48c');
    pixEllipse(c, cx + 84 + sway, cy + 30, 22, 20, 4, '#6e8f3a');
    pixEllipse(c, cx + 84 + sway, cy + 30, 18, 16, 4, '#8bb04a');
    R(c, cx + 88 + sway, cy + 22, 8, 8, '#fff');
    R(c, cx + 92 + sway, cy + 24, 4, 4, '#111');
    R(c, cx + 78 + sway, cy + 40, 20, 3, '#3b4d1d');
    R(c, cx - 8, cy - 42, 8, 8, '#e0245e');
    R(c, cx - 12, cy - 34, 16, 8, '#f5c518');
    R(c, cx - 16, cy - 26, 24, 8, '#e0245e');
    R(c, cx - 20, cy - 18, 32, 8, '#f5c518');
    R(c, cx - 5, cy - 50, 6, 6, '#fff');
  }

  function drawFinal(c, cx, cy, t, o) {
    var ph2 = o && o.phase === 2;
    var b = Math.sin(t * 2.2) * 3;
    // Cake (la torta gata)
    var ax = cx + 18;
    R(c, ax - 80, cy + 38 + b, 160, 38, '#f48fb8');
    R(c, ax - 80, cy + 38 + b, 160, 8, '#fff');
    for (var i = 0; i < 8; i++) R(c, ax - 76 + i * 20, cy + 46 + b, 10, 10 + (i % 3) * 4, '#fff');
    R(c, ax - 62, cy + 6 + b, 124, 32, '#ffd0e2');
    R(c, ax - 62, cy + 6 + b, 124, 8, '#fff');
    R(c, ax - 46, cy - 24 + b, 92, 30, '#f48fb8');
    R(c, ax - 46, cy - 24 + b, 92, 7, '#fff');
    R(c, ax - 46, cy - 34 + b, 12, 12, '#f48fb8');
    R(c, ax + 34, cy - 34 + b, 12, 12, '#f48fb8');
    R(c, ax - 30, cy - 10 + b, 8, ph2 ? 6 : 8, '#111');
    R(c, ax + 22, cy - 10 + b, 8, ph2 ? 6 : 8, '#111');
    R(c, ax - 6, cy - 2 + b, 12, 3, '#111');
    R(c, ax - 12, cy + 1 + b, 4, 3, '#111');
    R(c, ax + 8, cy + 1 + b, 4, 3, '#111');
    for (var k = -1; k <= 1; k++) {
      R(c, ax + k * 26 - 2, cy - 50 + b, 5, 18, '#7cc8ff');
      var fl = (Math.floor(t * 8) + k) % 2 === 0 ? 6 : 8;
      pixEllipse(c, ax + k * 26, cy - 56 + b, 4, fl, 2, '#ffb347');
    }
    // Fionna
    var fx = cx - 92;
    R(c, fx - 10, cy - 20 + b, 6, 30, '#fff');
    R(c, fx + 12, cy - 20 + b, 6, 30, '#fff');
    R(c, fx - 14, cy + 6 + b, 36, 24, '#fff');
    R(c, fx - 16, cy + 8 + b, 6, 20, '#f6d55c');
    R(c, fx + 18, cy + 8 + b, 6, 20, '#f6d55c');
    R(c, fx - 8, cy + 10 + b, 24, 20, '#f2d3b0');
    R(c, fx - 4, cy + 16 + b, 3, 3, '#111');
    R(c, fx + 8, cy + 16 + b, 3, 3, '#111');
    R(c, fx - 10, cy + 32 + b, 28, 28, '#4aa3ff');
    R(c, fx - 8, cy + 60 + b, 10, 22, '#3a3a5a');
    R(c, fx + 6, cy + 60 + b, 10, 22, '#3a3a5a');
    c.strokeStyle = '#e8eef8';
    c.lineWidth = 4;
    c.beginPath(); c.moveTo(fx + 22, cy + 48 + b); c.lineTo(fx + 46, cy - 10 + b + Math.sin(t * 5) * 4); c.stroke();
    R(c, fx + 18, cy + 46 + b, 12, 4, '#a855f7');
  }

  /* ----------------------------------------------------------------------
     DEFINICIÓN DE LOS JEFES
     ---------------------------------------------------------------------- */
  var BOSSES = [
    {
      id: 'slime', name: 'REY SLIME', sub: 'Invocado con: gelatina sospechosa', danger: 2,
      desc: 'Reina el reino de la gelatina. Rebota más que tus notas.',
      hp: 100, maxHit: 40, spareNeed: 2, loot: 'Corona de Gelatina',
      draw: drawSlime,
      intro: ['* ¡El Rey Slime bloquea el camino!', '* Tiene una corona demasiado grande para su cabeza.'],
      flavor: ['* El Rey Slime tiembla como gelatina.', '* Huele a gelatina de fresa.', '* La corona se tambalea.', '* Rebota con aires de grandeza.'],
      lowText: '* El Rey Slime se está deshaciendo.',
      talk: ['¡Plof! Soy el rey de los slimes.', '¡Rebotarás conmigo!', '¿Sabías que hoy cumples años? ¡Yo no!', 'Mi corona, mi reino, mi gelatina.', '¡Blup! (Eso es "feliz cum" en slime)'],
      acts: [
        { name: 'Revisar', check: true, text: ['* REY SLIME - ATQ 6 DEF 2', '* Rey de la gelatina. Parece disfrutar la cortesía y las golosinas.'] },
        { name: 'Reverencia', good: true, text: ['* Haces una reverencia profunda.', '* El Rey Slime infla el pecho. Está complacido.'] },
        { name: 'Dar gelatina', good: true, text: ['* Le ofreces gelatina. Se la come con la corona puesta.'] },
        { name: 'Quitar corona', text: ['* Intentas quitarle la corona.', '* No se deja. Rebota más fuerte de la rabia.'] }
      ],
      win: ['* ¡El Rey Slime se desparrama en un charco!'],
      spare: ['* El Rey Slime te hace una reverencia y se va rebotando.'],
      pick: function (turn) {
        var a = [slimeRain, slimeCrush, slimeFan, function () { return mix(slimeRain(0.5), slimeCrush()); }];
        return a[turn % a.length]();
      }
    },
    {
      id: 'morrocoy', name: 'EL MORROCOY', sub: 'Invocado con: lechuga y paciencia', danger: 2,
      desc: 'Llega tarde a todo. Su defensa es no entender nada.',
      hp: 130, maxHit: 40, spareNeed: 2, loot: 'Caparazón Sabio',
      draw: drawMorrocoy,
      intro: ['* Un morrocoy se cruza en el camino. Despacio.', '* Llegará a la pelea en unos minutos.'],
      flavor: ['* El morrocoy te mira con calma.', '* Se tomó 4 minutos en parpadear.', '* Su sombrero de fiesta está ladeado.', '* Parece que no sabe nada. Y está tranquilo.'],
      lowText: '* El morrocoy se está metiendo en su caparazón.',
      talk: ['No sé.', 'No sé, morrocoy.', 'Tengo prisa. (Es mentira.)', '¿Qué hora es? No sé.', 'Con calma, con calma.'],
      acts: [
        { name: 'Revisar', check: true, text: ['* MORROCOY - ATQ 5 DEF 20', '* Vive tranquilo. Le gustan las lechugas y los cumpleaños.'] },
        { name: 'Dar lechuga', good: true, text: ['* Le das una lechuga.', '* La mastica durante dos minutos. Es feliz.'] },
        { name: 'Preguntar hora', good: true, text: ['* Le preguntas la hora.', '* "...no sé, morrocoy." Respuesta honesta. Lo respetas.'] },
        { name: 'Apurarlo', text: ['* Le dices que se apure.', '* Se mete en el caparazón durante 5 minutos.'] }
      ],
      win: ['* El morrocoy se mete en su caparazón para siempre.'],
      spare: ['* El morrocoy asiente lentamente. Se va. Llegará mañana.'],
      pick: function (turn) {
        var a = [shellRoll, noSe, lettuce, stomp];
        return a[turn % a.length]();
      }
    },
    {
      id: 'eye', name: 'OJO DE CTHULHU', sub: 'Invocado con: lente sospechoso', danger: 3,
      desc: 'Solo despierta de noche. O cuando alguien cumple años.',
      hp: 120, maxHit: 40, spareNeed: 2, loot: 'Lente Demoníaca',
      draw: drawEyeBoss,
      intro: ['* Un ojo gigante te observa desde la oscuridad.', '* ¡El Ojo de Cthulhu despertó!'],
      flavor: ['* El Ojo de Cthulhu no parpadea.', '* La pupila te sigue.', '* Se siente observado. Es porque lo están observando.', '* Una vena roja palpita.'],
      lowText: '* El Ojo está muy irritado.',
      phase2: '* ¡El Ojo de Cthulhu muestra los dientes! ¡Fase 2!',
      talk: ['...', '*pestañea*', 'Te estoy viendo, David.', 'No parpadeo. Es un dato.', 'Veo todo. Hasta tu historial de juegos.'],
      acts: [
        { name: 'Revisar', check: true, text: ['* OJO DE CTHULHU - ATQ 8 DEF 3', '* Le molesta la luz y la resequedad.'] },
        { name: 'Cerrar cortinas', good: true, text: ['* Cierras las cortinas.', '* El Ojo parpadea aliviado.'] },
        { name: 'Poner gotas', good: true, text: ['* Le echas gotas para los ojos.', '* "Ahhh..." dice una pupila agradecida.'] },
        { name: 'Mirarlo fijo', text: ['* Le sostienes la mirada.', '* Pierdes. Siempre pierdes.'] }
      ],
      win: ['* El Ojo de Cthulhu se desvanece en la oscuridad.'],
      spare: ['* El Ojo de Cthulhu cierra los párpados, agradecido, y se va a dormir.'],
      pick: function (turn, frac) {
        var a = [eyeServants, eyeLasers, eyeDash, eyeSway];
        if (frac < 0.5) a = [eyeDash, function () { return mix(eyeServants(), eyeLasers()); }, eyeSway, eyeLasers];
        return a[turn % a.length]();
      }
    },
    {
      id: 'assassin', name: 'ASESINO ENMASCARADO', sub: 'Invocado con: aceite de ballena', danger: 4,
      desc: 'Un parpadeo y ya estás en la lista. Cobra bien, pero es limpio.',
      hp: 140, maxHit: 40, spareNeed: 2, loot: 'Máscara Rota',
      draw: drawAssassin,
      intro: ['* Una figura enmascarada se materializa de las sombras.', '* Nadie lo oyó llegar.'],
      flavor: ['* El Asesino te estudia en silencio.', '* Las hojas brillan en la penumbra.', '* Huele a aceite de ballena.', '* Una rata observa desde la esquina.'],
      lowText: '* La máscara del Asesino se agrieta.',
      talk: ['...', 'Esta noche, tu nombre está en la lista.', 'Un parpadeo y ya estás muerto.', 'No te preocupes. Es limpio.', 'Pagaron bien. O es tu cumpleaños, no sé.'],
      acts: [
        { name: 'Revisar', check: true, text: ['* ASESINO ENMASCARADO - ATQ 12 DEF 4', '* Respeta el sigilo, la paciencia y los buenos regalos.'] },
        { name: 'Hacer sigilo', good: true, text: ['* Te agachas y esperas en silencio.', '* El Asesino asiente. Respeta tu paciencia.'] },
        { name: 'Dar aceite', good: true, text: ['* Le ofreces aceite de ballena.', '* Lo acepta. Es de buena calidad.'] },
        { name: 'Gritar ALERTA', text: ['* Gritas "¡ALERTA!".', '* Todos te miran. Todos.'] }
      ],
      win: ['* El Asesino cae. Su máscara se parte en dos.'],
      spare: ['* El Asesino guarda sus cuchillas. Desaparece sin hacer ruido.'],
      pick: function (turn) {
        var a = [assBlades, assDarts, assRats, assMark];
        return a[turn % a.length]();
      }
    },
    {
      id: 'rick', name: 'RICK SÁNCHEZ', sub: 'Invocado con: un pepinillo', danger: 4,
      desc: 'El más inteligente del universo. Con tendencia al eructo.',
      hp: 140, maxHit: 40, spareNeed: 2, loot: 'Pistola de Portales (de juguete)',
      draw: drawRick,
      intro: ['* ¡Rick Sánchez cae por un portal!', '* Huele a alcohol y a ciencia mal hecha.'],
      flavor: ['* Rick eructa. Vibra el suelo.', '* Un portal parpadea a su espalda.', '* Rick revisa su cantimplora. Vacía.', '* Rick murmura una ecuación que no existe.'],
      lowText: '* Rick tiene el cabello desordenado. Más.',
      talk: ['*burp* Escucha, David, la vida no tiene sentido.', 'Esto es un ataque científico, no personal.', 'Morty, ¿dónde dejé mi pistola de portales?', 'Wubba lubba dub dub.', 'Cumplir años es dar una vuelta al sol, *burp*.'],
      acts: [
        { name: 'Revisar', check: true, text: ['* RICK SÁNCHEZ - ATQ 10 DEF 5', '* Le encanta que lo escuchen y los pepinillos.'] },
        { name: 'Pedir ciencia', good: true, text: ['* Le pides que te explique algo.', '* Habla 40 minutos. Está feliz de ser escuchado.'] },
        { name: 'Dar pepinillo', good: true, text: ['* Le das un pepinillo.', '* Rick: "¡Soy un pepinillo... *burp*... en paz!"'] },
        { name: 'Llamarlo Morty', text: ['* Lo llamaste Morty.', '* Rick te mira con desprecio científico.'] }
      ],
      win: ['* Rick cae por su propio portal. Se oye un "*burp*" a lo lejos.'],
      spare: ['* Rick abre un portal y se despide con un "ya fue, David".'],
      pick: function (turn) {
        var a = [rickPortals, rickBurp, rickGun, function () { return mix(rickMeeseeks(), rickBurp(0.5)); }];
        return a[turn % a.length]();
      }
    },
    {
      id: 'final', final: true, name: 'CAKE Y FIONNA', sub: 'Invocado con: velas de cumpleaños', danger: 5,
      desc: 'Una aventurera y una gata de pastel. Tienen una fiesta para ti.',
      hp: 200, maxHit: 40, spareNeed: 3, loot: 'Pastel de Cumpleaños',
      draw: drawFinal,
      intro: ['* ¡Una fiesta sorpresa te rodea!', '* Fionna y Cake bloquean el camino. Con mucho cariño.'],
      flavor: ['* Cake maúlla. Fionna afila su espada de fiesta.', '* Huele a vainilla y a aventura.', '* Las velas del pastel parpadean.', '* Se escucha un "¡Algebraico!" a lo lejos.'],
      lowText: '* Cake bosteza. Fionna sonríe, cansada.',
      phase2: '* ¡Cake se estira! ¡Las velas se encienden! ¡Fase 2!',
      talk: ['¡Cake, a tu posición!', '¡Algebraico! ¡Es hora de la torta!', 'Miau... ¿quieres un pedacito?', '¡No hay cumpleaños sin batalla!', '¡Pastel para todos! Menos para los malos.'],
      acts: [
        { name: 'Revisar', check: true, text: ['* CAKE Y FIONNA - ATQ 14 DEF 6', '* Les gusta cantar, pedir deseos y compartir pastel.'] },
        { name: 'Cantar cumple', good: true, text: ['* Cantas "Cumpleaños feliz".', '* Cake maúlla a coro. Fionna llora un poquito.'] },
        { name: 'Pedir deseo', good: true, text: ['* Soplas una vela y pides un deseo.', '* No digas cuál. Si no, no se cumple.'] },
        { name: 'Dar pastel', good: true, text: ['* Repartes pastel entre todos.', '* Fionna: "¡Algebraico!"'] }
      ],
      win: ['* Fionna y Cake sueltan sus armas y sonríen.'],
      spare: ['* Fionna y Cake te abrazan. El pastel es para ti.'],
      pick: function (turn, frac) {
        var a = [fionnaSlash, candle, heartWall, cakeStretch];
        if (frac < 0.5) {
          a = [
            function () { return mix(candle(0.6), cakeStretch()); },
            function () { return mix(heartWall(), frostRain(0.5)); },
            fionnaSlash,
            function () { return mix(cakeStretch(), candle(0.5)); }
          ];
        }
        return a[turn % a.length]();
      }
    }
  ];

  window.BOSSES = BOSSES;
  window.BossKit = { pixEllipse: pixEllipse, rnd: rnd, ri: ri, clamp: clamp };
})();
