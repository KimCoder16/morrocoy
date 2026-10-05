/* ==========================================================================
   CARRUSEL DE VIDEOS
   Edita SOLO la lista VIDEOS de abajo. Cada elemento es un video.

   Tipos disponibles:
     { tipo: 'youtube',   id: 'ID_DEL_VIDEO',               pie: 'texto', formato: 'v' }
         - id: lo que va después de "v=" (o de "/shorts/") en el link de YouTube
         - formato: 'v' = vertical (Shorts / Reels), 'h' = horizontal (video normal)
     { tipo: 'instagram', url: 'https://www.instagram.com/reel/XXXXXXXXX/', pie: 'texto' }
         - La cuenta del Reel debe ser pública
     { tipo: 'mp4',       src: 'videos/video1.mp4',         pie: 'texto', formato: 'v' }
         - Archivo propio subido al repositorio (menos de 50 MB cada uno)
     { tipo: 'vacio',     pie: 'texto' }
         - Un espacio reservado "Próximamente"
   ========================================================================== */
var VIDEOS = [
  { tipo: 'vacio', pie: 'Video 1: próximamente' },
  { tipo: 'vacio', pie: 'Video 2: próximamente' },
  { tipo: 'vacio', pie: 'Video 3: próximamente' },
  { tipo: 'vacio', pie: 'Video 4: próximamente' },
  { tipo: 'vacio', pie: 'Video 5: próximamente' }
];

(function () {
  'use strict';

  var frame = document.getElementById('carFrame');
  var caption = document.getElementById('carCaption');
  var dotsBox = document.getElementById('carDots');
  var prev = document.getElementById('prevBtn');
  var next = document.getElementById('nextBtn');
  var box = document.getElementById('carousel');
  if (!frame || !VIDEOS.length) return;

  var idx = 0;
  var igLoading = false;

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text) e.textContent = text;
    return e;
  }

  function loadInstagram(done) {
    if (window.instgrm && window.instgrm.Embeds) { window.instgrm.Embeds.process(); return; }
    if (igLoading) return;
    igLoading = true;
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.instagram.com/embed.js';
    s.onload = function () { if (window.instgrm && window.instgrm.Embeds) window.instgrm.Embeds.process(); };
    document.body.appendChild(s);
  }

  function render() {
    var v = VIDEOS[idx];
    frame.innerHTML = '';
    var fmt = v.formato === 'h' ? 'h' : 'v';
    frame.className = 'car-frame ' + fmt;

    if (v.tipo === 'youtube' && v.id) {
      var f = document.createElement('iframe');
      f.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(v.id) + '?rel=0&playsinline=1';
      f.title = v.pie || 'Video';
      f.allow = 'encrypted-media; picture-in-picture; fullscreen';
      f.allowFullscreen = true;
      f.loading = 'lazy';
      frame.appendChild(f);
    } else if (v.tipo === 'instagram' && v.url) {
      frame.className = 'car-frame v ig';
      var bq = document.createElement('blockquote');
      bq.className = 'instagram-media';
      bq.setAttribute('data-instgrm-permalink', v.url + (v.url.indexOf('?') > -1 ? '' : '?utm_source=ig_embed'));
      bq.setAttribute('data-instgrm-version', '14');
      bq.style.cssText = 'background:#fff;border:0;margin:0;max-width:540px;min-width:280px;width:100%;';
      var a = document.createElement('a');
      a.href = v.url;
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = 'Ver en Instagram';
      bq.appendChild(a);
      frame.appendChild(bq);
      loadInstagram();
    } else if (v.tipo === 'mp4' && v.src) {
      var vid = document.createElement('video');
      vid.src = v.src;
      vid.controls = true;
      vid.playsInline = true;
      vid.preload = 'metadata';
      if (v.poster) vid.poster = v.poster;
      frame.appendChild(vid);
    } else {
      var empty = el('div', 'car-empty');
      empty.appendChild(el('b', '', 'Video ' + (idx + 1)));
      empty.appendChild(el('span', '', 'Aquí va un video muy bueno.'));
      frame.appendChild(empty);
    }

    caption.textContent = v.pie || '';
    var dots = dotsBox.children;
    for (var i = 0; i < dots.length; i++) dots[i].classList.toggle('on', i === idx);
    var counter = document.getElementById('carCount');
    if (counter) counter.textContent = (idx + 1) + ' / ' + VIDEOS.length;
  }

  function go(n) {
    idx = (n + VIDEOS.length) % VIDEOS.length;
    if (window.SFX) window.SFX.play('move');
    render();
  }

  dotsBox.innerHTML = '';
  VIDEOS.forEach(function (_, i) {
    var d = document.createElement('button');
    d.type = 'button';
    d.className = 'dot';
    d.setAttribute('aria-label', 'Ir al video ' + (i + 1));
    d.addEventListener('click', function () { go(i); });
    dotsBox.appendChild(d);
  });

  prev.addEventListener('click', function () { go(idx - 1); });
  next.addEventListener('click', function () { go(idx + 1); });
  box.addEventListener('keydown', function (e) {
    if (e.target !== box) return;
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(idx - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); go(idx + 1); }
  });

  render();
})();
