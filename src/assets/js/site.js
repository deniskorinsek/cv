/*
 * Denis Korinšek — portfolio script (no dependencies).
 * Draws the two-lane trail beside the content and lets it fill in as you scroll; on the
 * homepage the lanes split into a technical and a leadership trail for "Two paths" and
 * join again before the earlier years. Also: parallax contour lines, cards that settle
 * into place, the header state, section highlighting in the navigation and the
 * "Copy address" button, and "Highlight a path" in the career card. Everything on the
 * page is readable without this file.
 */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var root = document.documentElement;
  var page = document.getElementById('page');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  function $(q) { return document.querySelector(q); }
  function $$(q) { return [].slice.call(document.querySelectorAll(q)); }
  function f(v) { return (+v).toFixed(1); }

  /* ---------- header, navigation, copy button, arrival motion ---------- */
  var topbar = $('[data-topbar]');
  var navLinks = $$('[data-nav]').filter(function (a) { var h = a.getAttribute('href') || ''; return h.charAt(0) === '#' && document.getElementById(h.slice(1)); });
  function chrome() {
    if (topbar) topbar.classList.toggle('stuck', window.scrollY > 8);
    var vh = window.innerHeight;
    navLinks.forEach(function (a) {
      var r = document.getElementById(a.getAttribute('href').slice(1)).getBoundingClientRect();
      var on = !a.classList.contains('pill') && r.top < vh * 0.5 && r.bottom > vh * 0.3;
      a.classList.toggle('on', on);
      if (on) a.setAttribute('aria-current', 'true'); else if (a.getAttribute('aria-current') === 'true') a.removeAttribute('aria-current');
    });
  }
  window.addEventListener('scroll', chrome, { passive: true });
  chrome();

  $$('[data-copy]').forEach(function (btn) {
    var label = btn.textContent;
    btn.addEventListener('click', function () {
      var value = btn.getAttribute('data-copy');
      function done(msg) { btn.textContent = msg; setTimeout(function () { btn.textContent = label; }, 2200); }
      function selectIt() {
        var target = document.getElementById('email-link');
        if (target) { var r = document.createRange(); r.selectNodeContents(target); var s = window.getSelection(); s.removeAllRanges(); s.addRange(r); }
        done('Selected, press Ctrl+C');
      }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(value).then(function () { done('Copied'); }, selectIt);
      else selectIt();
    });
  });

  /* ---------- career card: the column labels become "Highlight a path" buttons ---------- */
  var journeyEl = $('.journey');
  if (journeyEl) {
    var laneGroup = journeyEl.querySelector('.jx-lanes'), laneButtons = [];
    if (laneGroup) {
      laneGroup.setAttribute('role', 'group');
      laneGroup.setAttribute('aria-label', 'Highlight a path');
      [].slice.call(laneGroup.querySelectorAll('.lane')).forEach(function (span) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = span.className;
        b.setAttribute('data-lane', span.getAttribute('data-lane'));
        b.setAttribute('aria-pressed', 'false');
        b.innerHTML = span.innerHTML;
        span.parentNode.replaceChild(b, span);
        laneButtons.push(b);
      });
      laneButtons.forEach(function (b) {
        b.addEventListener('click', function () {
          var on = b.getAttribute('aria-pressed') !== 'true';
          laneButtons.forEach(function (o) { o.setAttribute('aria-pressed', o === b && on ? 'true' : 'false'); });
          if (on) journeyEl.setAttribute('data-focus', b.getAttribute('data-lane')); else journeyEl.removeAttribute('data-focus');
        });
      });
    }
  }

  var arrivals = $$('.rv');
  if ('IntersectionObserver' in window && !reduce.matches) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    arrivals.forEach(function (n) { io.observe(n); });
  } else arrivals.forEach(function (n) { n.classList.add('in'); });

  /* ---------- the trail ---------- */
  var startEl = $('[data-trail-start]');
  if (!page || !startEl || !document.createElementNS) return;
  function mk(cls) { var s = document.createElementNS(NS, 'svg'); s.setAttribute('class', cls); s.setAttribute('aria-hidden', 'true'); s.setAttribute('focusable', 'false'); page.insertBefore(s, page.firstChild); return s; }
  var svg = mk('trail'), bg = mk('terrain');
  var fallback = page.querySelector('.no-js-trail'); if (fallback) fallback.parentNode.removeChild(fallback);
  var S = { walkY: 0, target: 0, marks: [], para: [], ready: false };
  var C = { t: { band: 'var(--tech-band)', soft: 'var(--tech-soft)', dash: 'var(--tech-dash)', solid: 'var(--tech)' },
            l: { band: 'var(--lead-band)', soft: 'var(--lead-soft)', dash: 'var(--lead-dash)', solid: 'var(--lead)' },
            s: { band: 'var(--stone-band)', soft: 'var(--stone-soft)', dash: 'var(--stone-dash)', solid: 'var(--stone)' },
            g: { band: 'var(--ghost)', soft: 'var(--ghost)', dash: 'var(--ghost-dash)', solid: 'var(--ghost-dash)' } };
  function el(name, attrs, parent) { var n = document.createElementNS(NS, name); for (var k in attrs) if (attrs[k] !== '' && attrs[k] != null) n.setAttribute(k, attrs[k]); (parent || svg).appendChild(n); return n; }
  function pinPath(x, y, r) {
    var cy = y - r * 1.75;
    return 'M' + f(x) + ' ' + f(y) + ' C' + f(x - r * 0.35) + ' ' + f(y - r * 0.45) + ' ' + f(x - r) + ' ' + f(cy + r * 0.55) + ' ' + f(x - r) + ' ' + f(cy) +
      ' A' + r + ' ' + r + ' 0 1 1 ' + f(x + r) + ' ' + f(cy) + ' C' + f(x + r) + ' ' + f(cy + r * 0.55) + ' ' + f(x + r * 0.35) + ' ' + f(y - r * 0.45) + ' ' + f(x) + ' ' + f(y) + ' Z';
  }
  function pin(x, y, r, fill, delay) {
    var st = delay ? 'transition-delay:' + delay + 's' : '';
    return [el('path', { d: pinPath(x, y, r), class: 'pin wait', fill: fill, stroke: '#fff', 'stroke-width': 1.5, style: st }),
            el('circle', { cx: f(x), cy: f(y - r * 1.75), r: f(r * 0.36), fill: '#fff', class: 'pin wait', style: st })];
  }
  function mark(y, nodes, cls) { S.marks.push({ y: y, nodes: nodes, cls: cls || 'wait' }); }
  function rng(seed) { return function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }

  // the two path columns line up era by era when they sit side by side
  function equalize(side) {
    var groups = {};
    $$('[data-era]').forEach(function (n) { n.style.minHeight = ''; var k = n.getAttribute('data-era'); (groups[k] = groups[k] || []).push(n); });
    if (!side) return;
    Object.keys(groups).forEach(function (k) {
      var g = groups[k]; if (g.length < 2) return;
      var h = Math.max.apply(null, g.map(function (n) { return n.getBoundingClientRect().height; }));
      g.forEach(function (n) { n.style.minHeight = Math.ceil(h) + 'px'; });
    });
  }

  function build() {
    root.classList.add('measuring');
    var tCol = $('#technical'), lCol = $('#leadership'), duoEl = $('.duo');
    var hasDuo = Boolean(tCol && lCol && duoEl);
    var side = hasDuo && lCol.getBoundingClientRect().left > tCol.getBoundingClientRect().left + 100;
    if (hasDuo) equalize(side);
    svg.innerHTML = ''; bg.innerHTML = ''; S.marks = []; S.para = [];
    var W = page.offsetWidth, H = page.scrollHeight;
    [svg, bg].forEach(function (s) { s.setAttribute('width', W); s.setAttribute('height', H); });
    var P = page.getBoundingClientRect();
    function box(n) { var r = n.getBoundingClientRect(); return { l: r.left - P.left, t: r.top - P.top, b: r.bottom - P.top, r: r.right - P.left, h: r.height }; }
    var main = box($('#main'));
    var trailW = parseFloat(getComputedStyle(root).getPropertyValue('--trail')) || 220;
    var narrow = trailW < 80;
    var cx = main.l + trailW * 0.42, amp = narrow ? 6 : trailW * 0.14, wave = narrow ? 470 : 660;
    function xAt(y) { return cx + amp * Math.sin(y / wave * 2 * Math.PI + 0.5) + amp * 0.38 * Math.sin(y / (wave * 0.43) * 2 * Math.PI + 1.9); }
    var LO = narrow ? 4.5 : 6, BW = narrow ? 7.5 : 10.5, ONE = narrow ? 10 : 15;

    var stops = $$('[data-trail-stop]');
    var endEl = stops.length ? stops[stops.length - 1] : $('[data-trail-end]');
    var y0 = box(startEl).t + 20;
    var y1 = endEl ? box(endEl).t + (stops.length ? 26 : 40) : main.b - 40;
    var yF = y1, yM = y1, R = 36, gx0 = 0;
    if (hasDuo) {
      var duo = box(duoEl);
      yF = duo.t - (narrow ? 26 : 54); yM = duo.b + (narrow ? 10 : 18);
      gx0 = box(lCol).l - 60;
    }
    function gx(y) { return gx0 + 8 * Math.sin(y / 420 * 2 * Math.PI + 1.3) + 3 * Math.sin(y / 170 * 2 * Math.PI); }
    var twoEnd = hasDuo ? (side ? yF : yM) : y1;
    S.side = side; S.hasDuo = hasDuo; S.xAt = xAt; S.gx = gx; S.LO = LO; S.yF = yF; S.yM = yM; S.R = R; S.twoEnd = twoEnd; S.y0 = y0; S.y1 = y1;

    function trailD(a, b, fx) { var d = '', y; fx = fx || xAt; for (y = a; y < b; y += 6) d += (y === a ? 'M' : 'L') + f(fx(y)) + ' ' + f(y) + ' '; return d + 'L' + f(fx(b)) + ' ' + f(b); }
    var dAll = trailD(y0, y1);
    var defs = el('defs', {});
    var walked = el('clipPath', { id: 'walked' }, defs);
    S.walkRect = el('rect', { x: 0, y: 0, width: W, height: 0 }, walked);
    var nClip = 0;
    function clip(a, b) { var id = 'c' + (nClip++), c = el('clipPath', { id: id }, defs); el('rect', { x: 0, y: f(a), width: W, height: f(Math.max(0, b - a)) }, c); return 'url(#' + id + ')'; }
    function band(parent, d, c, w, o) {
      o = o || {};
      var g = el('g', { 'clip-path': o.clip, transform: o.dx ? 'translate(' + o.dx + ' 0)' : '', class: o.cls }, parent);
      var extra = o.grow ? { class: 'grow', pathLength: 1 } : {};
      function p(stroke, sw, more) { var a = { d: d, fill: 'none', stroke: stroke, 'stroke-width': sw, 'stroke-linecap': 'round' }; for (var k in more) a[k] = more[k]; return el('path', a, g); }
      p(c.band, w, extra);
      if (w > 9) p(c.soft, w - 3.5, extra);
      p(c.dash, 1.3, { 'stroke-dasharray': '5 6', class: o.grow ? 'later' : '' });
      return g;
    }

    // the way ahead, in pale ghost colours
    band(svg, dAll, C.g, 2 * BW + 1, { clip: clip(y0 - 80, twoEnd) });
    if (twoEnd < y1) band(svg, dAll, C.g, ONE, { clip: clip(twoEnd, y1 + 60) });
    var dLv = '', dFork = '', dMerge = '';
    if (side) {
      dLv = trailD(yF + R, yM - R, gx);
      var a = xAt(yF) + LO, gt = gx(yF + R);
      dFork = 'M' + f(a) + ' ' + f(yF) + ' L' + f(gt - R) + ' ' + f(yF) + ' C' + f(gt - R * 0.45) + ' ' + f(yF) + ' ' + f(gt) + ' ' + f(yF + R * 0.55) + ' ' + f(gt) + ' ' + f(yF + R);
      var gb = gx(yM - R), z = xAt(yM);
      dMerge = 'M' + f(gb) + ' ' + f(yM - R) + ' C' + f(gb) + ' ' + f(yM - R * 0.45) + ' ' + f(gb - R * 0.45) + ' ' + f(yM) + ' ' + f(gb - R) + ' ' + f(yM) + ' L' + f(z) + ' ' + f(yM);
      band(svg, dLv, C.g, ONE, {}); band(svg, dFork, C.g, ONE, {}); band(svg, dMerge, C.g, ONE, {});
    }
    // the walked trail, revealed as you scroll
    var gw = el('g', { 'clip-path': 'url(#walked)' });
    var cTwo = clip(y0 - 80, twoEnd);
    band(gw, dAll, C.t, BW, { clip: cTwo, dx: -LO });
    band(gw, dAll, C.l, BW, { clip: cTwo, dx: LO });
    if (side) { band(gw, dAll, C.t, ONE, { clip: clip(yF, yM) }); band(gw, dLv, C.l, ONE, {}); }
    if (twoEnd < y1) band(gw, dAll, C.s, ONE, { clip: clip(yM, y1 + 60) });
    if (side) {
      var fg = band(svg, dFork, C.l, ONE, { grow: true, cls: 'wait' }); mark(yF - 6, [fg]);
      var mg = band(svg, dMerge, C.l, ONE, { grow: true, cls: 'wait' }); mark(yM - R, [mg]);
    }
    // chevrons above the start: the trail keeps going
    [y0 - 16, y0 - 28].forEach(function (cy, i) { var x = xAt(y0); el('polyline', { points: f(x - 6) + ',' + f(cy + 5) + ' ' + f(x) + ',' + f(cy - 1) + ' ' + f(x + 6) + ',' + f(cy + 5), fill: 'none', stroke: i ? 'var(--stone-band)' : 'var(--stone)', 'stroke-width': 1.8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }); });
    // junctions where the paths split and join
    if (hasDuo) [yF, yM].forEach(function (y) {
      var g = el('g', { class: 'pop' });
      el('circle', { cx: f(xAt(y)), cy: f(y), r: narrow ? 8 : 10.5, fill: 'var(--surface)', stroke: 'var(--ink)', 'stroke-width': 2.2 }, g);
      el('circle', { cx: f(xAt(y)), cy: f(y), r: narrow ? 2.6 : 3.4, fill: 'var(--ink)' }, g);
      mark(y, [g], 'on');
    });
    function laneX(lane, y) { if (!side || y < yF || y > yM) return xAt(y) + (lane === 't' ? -LO : LO); return lane === 't' ? xAt(y) : gx(y); }
    // short side paths from a lane to the cards that belong to it
    $$('[data-spur]').forEach(function (n) {
      var b = box(n), lane = n.getAttribute('data-lane') || 't', c = C[lane];
      var y = b.t + (n.classList.contains('head') ? 34 : 30), lx = laneX(lane, y);
      var twoLane = !side || y < yF || y > yM;
      var x = twoLane ? xAt(y) + LO + BW / 2 - 1 : lx, ex = b.l - (narrow ? 6 : 14), ey = y + (narrow ? 0 : 6);
      if (twoLane) mark(y, [el('circle', { cx: f(lx), cy: f(y), r: narrow ? 3.2 : 4.2, class: 'st', style: 'color:' + c.solid })], 'on');
      if (ex - x < 10 || ex - x > trailW * 1.3) return;
      var sd = 'M' + f(x) + ' ' + f(y) + ' C' + f(x + (ex - x) * 0.45) + ' ' + f(y) + ' ' + f(x + (ex - x) * 0.55) + ' ' + f(ey) + ' ' + f(ex) + ' ' + f(ey);
      var sg = el('g', { class: 'wait' });
      el('path', { d: sd, class: 'grow', pathLength: 1, fill: 'none', stroke: c.band, 'stroke-width': narrow ? 4.5 : 6, 'stroke-linecap': 'round' }, sg);
      el('path', { d: sd, class: 'later', fill: 'none', stroke: c.dash, 'stroke-width': 1.2, 'stroke-dasharray': '3 3', 'stroke-linecap': 'round' }, sg);
      mark(y, [sg]);
      mark(y, pin(ex, ey, narrow ? 5 : 6.5, c.solid, 0.5));
    });
    // stations for the earlier years; the last one is where the trail starts
    stops.forEach(function (n, i) {
      var b = box(n), y = b.t + 26, x = xAt(y);
      if (i < stops.length - 1) { mark(y, [el('circle', { cx: f(x), cy: f(y), r: narrow ? 3.4 : 4.6, class: 'st', style: 'color:var(--stone)' })], 'on'); return; }
    });
    var eg = el('g', { class: 'pop' }), ex1 = xAt(y1);
    el('circle', { cx: f(ex1), cy: f(y1), r: narrow ? 7 : 9, fill: 'var(--surface)', stroke: 'var(--stone-ink)', 'stroke-width': 2 }, eg);
    el('circle', { cx: f(ex1), cy: f(y1), r: narrow ? 2.6 : 3.4, fill: 'var(--stone-ink)' }, eg);
    mark(y1 - 2, [eg], 'on');
    // map pins beside section headings
    $$('[data-pin]').forEach(function (n) { var b = box(n), y = b.t + b.h * 0.66; if (y > y0 && y < y1) mark(y, pin(xAt(y), y, narrow ? 7 : 9, 'var(--ink)')); });
    // one walker per lane
    function walker(color) { var g = el('g', {}); el('circle', { r: narrow ? 11 : 14, fill: color, class: 'walker-halo' }, g); el('circle', { r: narrow ? 5.5 : 6.5, fill: 'var(--ink)', stroke: '#fff', 'stroke-width': 2.5 }, g); return g; }
    S.wT = walker('var(--tech)'); S.wL = walker('var(--lead)');

    terrain(H, narrow, box, main);
    root.classList.remove('measuring');
    S.ready = true;
    builtH = page.scrollHeight;
    update(true);
    parallax();
  }

  // parallax: topographic contour lines behind the portrait and a few hills in the margins, each map at its own depth.
  // Every map is one smooth height field traced with marching squares, so its lines never cross.
  function terrain(H, narrow, box, main) {
    var rand = rng(20170901);
    // one height field (a few soft peaks, gently warped) traced into closed contour lines
    function topo(cx, cy, rx, ry, peaks, step, tint, k) {
      var g = narrow ? 6 : 8, x0 = cx - rx, y0 = cy - ry, nx = Math.ceil(rx * 2 / g), ny = Math.ceil(ry * 2 / g), w = nx + 1;
      var p1 = rand() * 6.28, p2 = rand() * 6.28, wa = (narrow ? 14 : 30) + rand() * 14, wf = (narrow ? 0.011 : 0.0055) + rand() * 0.0025;
      var z = new Float32Array(w * (ny + 1)), top = 0;
      for (var j = 0; j <= ny; j++) for (var i = 0; i <= nx; i++) {
        var v = 0;
        if (i && j && i < nx && j < ny) {
          var x = x0 + i * g, y = y0 + j * g, wx = x + wa * Math.sin(y * wf + p1), wy = y + wa * Math.sin(x * wf * 1.3 + p2);
          for (var q = 0; q < peaks.length; q++) {
            var pk = peaks[q], dx = (wx - pk.x) / pk.sx, dy = (wy - pk.y) / pk.sy;
            v += pk.a * Math.exp(-(dx * dx + dy * dy) / 2);
          }
        }
        z[j * w + i] = v; if (v > top) top = v;
      }
      var grp = el('g', {}, bg), n = Math.floor((top - 0.1) / step) + 1;
      for (var L = 0; L < n; L++) {
        var index = L % 4 === 2, op = f(0.4 + 0.6 * Math.min(1, L / 3));
        trace(z, nx, ny, g, x0, y0, 0.1 + L * step).forEach(function (pts) {
          el('path', { d: smooth(pts), fill: 'none', stroke: index ? 'var(--stone-band)' : tint, 'stroke-width': index ? 1.5 : 1, opacity: op }, grp);
        });
      }
      S.para.push({ node: grp, base: cy, k: k });
    }
    var ph = $('.ph');
    if (ph) {
      var pb = box(ph), pcx = pb.l + pb.h / 2, pcy = pb.t + pb.h / 2, s = narrow ? 0.5 : 1;
      topo(pcx, pcy + 30 * s, 480 * s, 400 * s, [
        { x: pcx + 50 * s, y: pcy - 30 * s, sx: 150 * s, sy: 115 * s, a: 1 },
        { x: pcx - 190 * s, y: pcy + 170 * s, sx: 95 * s, sy: 80 * s, a: 0.72 },
        { x: pcx + 230 * s, y: pcy + 200 * s, sx: 70 * s, sy: 60 * s, a: 0.45 },
      ], 0.085, 'var(--contour-a)', 0.12);
    } else {
      var sb = box(startEl), hx0 = main.r - (narrow ? 20 : 120), hy0 = sb.t + 60, s0 = narrow ? 0.6 : 1;
      topo(hx0, hy0, 300 * s0, 260 * s0, [
        { x: hx0, y: hy0, sx: 105 * s0, sy: 85 * s0, a: 1 },
        { x: hx0 - 120 * s0, y: hy0 + 90 * s0, sx: 60 * s0, sy: 55 * s0, a: 0.55 },
      ], 0.1, 'var(--contour-a)', 0.2);
    }
    var step = narrow ? 1400 : 900, n = Math.ceil(H / step);
    for (var i = 1; i < n; i++) {
      var right = i % 2 === 1, sc = narrow ? 0.6 : 1;
      var hx = (right ? main.r + (narrow ? 10 : 70) : main.l + (narrow ? 10 : 40)) + (rand() - 0.5) * 60, hy = i * step + (rand() - 0.5) * 200;
      var ox = (rand() - 0.5) * 140 * sc, oy = (rand() - 0.5) * 120 * sc;
      topo(hx, hy, 230 * sc, 210 * sc, [
        { x: hx, y: hy, sx: (60 + rand() * 20) * sc, sy: (50 + rand() * 15) * sc, a: 1 },
        { x: hx + ox, y: hy + oy, sx: 40 * sc, sy: 36 * sc, a: 0.5 },
      ], 0.12, right ? 'var(--contour-b)' : 'var(--contour-a)', right ? 0.24 : 0.14);
    }
  }
  // marching squares: closed contour loops of the field z at level t, as point lists
  function trace(z, nx, ny, g, x0, y0, t) {
    var w = nx + 1, pt = {}, adj = {};
    function at(i, j) { return z[j * w + i]; }
    function edge(id, ax, ay, bx, by, va, vb) {
      if (!pt[id]) { var u = (t - va) / (vb - va); pt[id] = [x0 + (ax + (bx - ax) * u) * g, y0 + (ay + (by - ay) * u) * g]; }
      return id;
    }
    function link(a, b) { (adj[a] = adj[a] || []).push(b); (adj[b] = adj[b] || []).push(a); }
    for (var j = 0; j < ny; j++) for (var i = 0; i < nx; i++) {
      var a = at(i, j), b = at(i + 1, j), c = at(i + 1, j + 1), d = at(i, j + 1);
      var cs = (a > t ? 8 : 0) | (b > t ? 4 : 0) | (c > t ? 2 : 0) | (d > t ? 1 : 0);
      if (!cs || cs === 15) continue;
      var T = function () { return edge('h' + i + '_' + j, i, j, i + 1, j, a, b); },
          R = function () { return edge('v' + (i + 1) + '_' + j, i + 1, j, i + 1, j + 1, b, c); },
          B = function () { return edge('h' + i + '_' + (j + 1), i, j + 1, i + 1, j + 1, d, c); },
          Lf = function () { return edge('v' + i + '_' + j, i, j, i, j + 1, a, d); };
      var mid = (a + b + c + d) / 4 > t;
      switch (cs) {
        case 1: case 14: link(Lf(), B()); break;
        case 2: case 13: link(B(), R()); break;
        case 3: case 12: link(Lf(), R()); break;
        case 4: case 11: link(T(), R()); break;
        case 6: case 9: link(T(), B()); break;
        case 7: case 8: link(Lf(), T()); break;
        case 5: if (mid) { link(Lf(), T()); link(B(), R()); } else { link(T(), R()); link(Lf(), B()); } break;
        case 10: if (mid) { link(T(), R()); link(Lf(), B()); } else { link(Lf(), T()); link(B(), R()); } break;
      }
    }
    var seen = {}, loops = [];
    Object.keys(adj).forEach(function (s) {
      if (seen[s]) return;
      var line = [], prev = null, cur = s;
      while (cur && !seen[cur]) {
        seen[cur] = true; line.push(pt[cur]);
        var nb = adj[cur], next = nb[0] !== prev && !seen[nb[0]] ? nb[0] : nb[1] !== prev && nb[1] && !seen[nb[1]] ? nb[1] : null;
        prev = cur; cur = next;
      }
      if (line.length > 8) loops.push(line);
    });
    return loops;
  }
  // a closed Catmull-Rom curve through the points, as cubic Béziers
  function smooth(p) {
    var n = p.length, d = 'M' + f(p[0][0]) + ' ' + f(p[0][1]);
    for (var i = 0; i < n; i++) {
      var p0 = p[(i - 1 + n) % n], p1 = p[i], p2 = p[(i + 1) % n], p3 = p[(i + 2) % n];
      d += 'C' + f(p1[0] + (p2[0] - p0[0]) / 6) + ' ' + f(p1[1] + (p2[1] - p0[1]) / 6) + ' ' + f(p2[0] - (p3[0] - p1[0]) / 6) + ' ' + f(p2[1] - (p3[1] - p1[1]) / 6) + ' ' + f(p2[0]) + ' ' + f(p2[1]);
    }
    return d + 'Z';
  }
  var heroLayers = [{ node: $('.ph-ring'), k: 0.08 }, { node: $('.ph picture'), k: 0.03 }];
  var pt = null;
  function parallax() {
    pt = null;
    var off = reduce.matches, mid = window.scrollY + window.innerHeight / 2;
    S.para.forEach(function (p) { var ty = off ? 0 : (mid - p.base) * p.k; p.node.setAttribute('transform', 'translate(0 ' + f(ty) + ')'); });
    heroLayers.forEach(function (h) { if (h.node) h.node.style.transform = off ? '' : 'translate3d(0,' + f(window.scrollY * h.k) + 'px,0)'; });
  }

  function targetY() {
    if (reduce.matches) return S.y1;
    return Math.max(S.y0, Math.min(S.y1, window.scrollY + window.innerHeight * 0.55));
  }
  function place(g, x, y, s, show) { g.style.display = show ? '' : 'none'; if (show) g.setAttribute('transform', 'translate(' + f(x) + ' ' + f(y) + ') scale(' + s + ')'); }
  function apply(y) {
    S.walkRect.setAttribute('height', Math.max(0, y + 2));
    var hide = reduce.matches, xA = S.xAt(y);
    if (y <= S.twoEnd) { place(S.wT, xA - S.LO, y, 0.62, !hide); place(S.wL, xA + S.LO, y, 0.62, !hide); }
    else if (S.side && y < S.yM) { place(S.wT, xA, y, 1, !hide); place(S.wL, S.gx(y), y, 1, !hide && y > S.yF + S.R && y < S.yM - S.R); }
    else { place(S.wT, xA, y, 1, !hide); place(S.wL, 0, 0, 1, false); }
    S.marks.forEach(function (m) {
      var reached = m.y <= y + 4;
      m.nodes.forEach(function (n) { if (m.cls === 'wait') n.classList.toggle('wait', !reached); else n.classList.toggle('on', reached); });
    });
  }
  var anim = null;
  function update(instant) {
    if (!S.ready) return;
    S.target = targetY();
    if (instant || reduce.matches) { S.walkY = S.target; apply(S.walkY); return; }
    if (anim) return;
    anim = requestAnimationFrame(function step() {
      var dy = S.target - S.walkY;
      S.walkY += Math.abs(dy) < 1 ? dy : dy * 0.14;
      apply(S.walkY);
      anim = Math.abs(S.target - S.walkY) < 0.5 ? null : requestAnimationFrame(step);
    });
  }
  function intro() { if (reduce.matches) { update(true); return; } S.walkY = S.y0; apply(S.walkY); update(false); }
  window.addEventListener('scroll', function () { update(false); if (!pt) pt = requestAnimationFrame(parallax); }, { passive: true });
  var rt;
  window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(build, 140); });
  // redraw when the page grows or shrinks without a window resize (late fonts or images)
  var builtH = 0;
  if ('ResizeObserver' in window) new ResizeObserver(function () {
    if (!booted || Math.abs(page.scrollHeight - builtH) < 2) return;
    clearTimeout(rt); rt = setTimeout(build, 60);
  }).observe($('#main'));
  if (reduce.addEventListener) reduce.addEventListener('change', function () { update(true); parallax(); });
  var booted = false;
  function boot() { if (booted) return; booted = true; build(); intro(); }
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(boot);
  setTimeout(boot, 1500);
  window.addEventListener('load', function () { if (booted) build(); });
})();
