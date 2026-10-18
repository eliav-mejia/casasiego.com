/* Casa Siego — casa.js (v1.1.0)
   Shared chrome for the public pages (not the shop or the suit builder, which have their own):
   1. Header with the CASA Siego® wordmark: transparent over a dark hero, white once you scroll,
      tucked away while scrolling down and back on the way up.
   2. Mobile sidebar (≤ 900 px): opens as a circle from the menu button; its colour eases from
      the tone of the section being read into wine, and shifts to each link's own tone.
   3. Section tones: the page background eases between white and vintage beige as sections pass.
   4. A thin wine progress line at the top.
   Links are built from this script's own URL, so the same file works at any folder depth. */
(function () {
  'use strict';

  var me = document.currentScript;
  var ROOT = me ? new URL('../', me.src).href : '/';
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  var WORDMARK = '<span class="wordmark__casa">CASA</span> <span class="wordmark__siego">Siego</span><sup class="wordmark__r">&reg;</sup>';
  var TONE = { white: '#FFFFFF', beige: '#EEE4D3' };

  // [label, href, note, tone of the sidebar while the link is touched or hovered]
  var LINKS = [
    ['Inicio', ROOT, '', '#4A1621'],
    ['Fiel', ROOT + 'brands/fiel/', 'estudio', '#6B1E2C'],
    ['Justo', ROOT + 'brands/justo/', 'sastrería', '#3B1A1F'],
    ['Libre', ROOT + 'brands/libre/', 'coworking', '#6E4E36'],
    ['Membresía', ROOT + 'visitante.html#club', '', '#7A2436'],
    ['Contacto', 'mailto:info@casasiego.com', '', '#4A1621']
  ];

  // Sections without their own background: the page tone shows through them
  var TONES = [
    ['.prologue, .folio:not(.terms)', 'white'], ['.chapter', 'white'], ['.stack', 'beige'],
    ['.gallery', 'white'], ['.houses', 'beige'], ['.sessions', 'beige'], ['.ledger', 'white']
  ];

  function current(href) {
    var a = document.createElement('a'); a.href = href;
    var here = location.pathname.replace(/index\.html$/, '');
    return a.protocol !== 'mailto:' && a.hash === '' && a.pathname.replace(/index\.html$/, '') === here;
  }

  function build() {
    var head = document.createElement('header');
    head.className = 'site-head';
    head.innerHTML =
      '<a class="site-head__mark wordmark" href="' + ROOT + '" aria-label="Casa Siego, inicio">' + WORDMARK + '</a>' +
      '<nav class="site-nav" aria-label="Principal"><ul>' + LINKS.map(function (l) {
        return '<li><a href="' + l[1] + '"' + (current(l[1]) ? ' aria-current="page"' : '') + '>' + l[0] + '</a></li>';
      }).join('') + '</ul></nav>' +
      '<button class="site-burger" type="button" aria-expanded="false" aria-controls="site-drawer">' +
        '<span aria-hidden="true"></span><span aria-hidden="true"></span><span class="sr-only">Menú</span></button>';

    var scrim = document.createElement('div');
    scrim.className = 'site-scrim';

    var drawer = document.createElement('nav');
    drawer.className = 'site-drawer';
    drawer.id = 'site-drawer';
    drawer.setAttribute('aria-label', 'Menú');
    drawer.setAttribute('inert', '');
    drawer.innerHTML =
      '<a class="site-drawer__mark wordmark" href="' + ROOT + '">' + WORDMARK + '</a>' +
      '<ol>' + LINKS.map(function (l, i) {
        return '<li style="--i:' + i + '"><a href="' + l[1] + '" data-tone="' + l[3] + '"' + (current(l[1]) ? ' aria-current="page"' : '') + '>' +
          l[0] + (l[2] ? '<span>' + l[2] + '</span>' : '') + '</a></li>';
      }).join('') + '</ol>' +
      '<p class="site-drawer__foot"><a href="mailto:info@casasiego.com">info@casasiego.com</a><br>' +
        '&copy; 2026 Casa Siego&reg;. Todos los derechos reservados.</p>';

    var bar = document.createElement('div');
    bar.className = 'site-progress';
    bar.setAttribute('aria-hidden', 'true');

    document.body.insertBefore(bar, document.body.firstChild);
    document.body.insertBefore(drawer, document.body.firstChild);
    document.body.insertBefore(scrim, document.body.firstChild);
    document.body.insertBefore(head, document.body.firstChild);
    root.classList.add('has-site-head');

    // Over a dark opening band the header starts transparent; otherwise it is white from the start
    var first = document.querySelector('.hero, .terms-head');
    var darkTop = first && first.getBoundingClientRect().top < 10;
    if (!darkTop) root.classList.add('head-offset');

    /* Header state on scroll */
    var lastY = window.scrollY, ticking = false;
    function onScroll() {
      ticking = false;
      var y = window.scrollY;
      head.classList.toggle('is-solid', !darkTop || y > 40);
      head.classList.toggle('is-hidden', y > 300 && y > lastY + 4 && !root.classList.contains('menu-open'));
      if (y < lastY - 4 || y < 300) head.classList.remove('is-hidden');
      lastY = y;
      var max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.setProperty('--p', max > 0 ? (y / max).toFixed(4) : 0);
    }
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
    onScroll();

    /* Sidebar */
    var burger = head.querySelector('.site-burger');
    function setOpen(open) {
      if (open) {
        // Start from the tone of the section being read, then ease into wine
        drawer.style.setProperty('--drawer-from', getComputedStyle(document.body).backgroundColor);
        drawer.style.removeProperty('--drawer-to');
        drawer.removeAttribute('inert');
      } else {
        drawer.setAttribute('inert', '');
      }
      root.classList.toggle('menu-open', open);
      burger.setAttribute('aria-expanded', String(open));
      if (open) setTimeout(function () { var f = drawer.querySelector('li a'); if (f) f.focus({ preventScroll: true }); }, 350);
      else burger.focus({ preventScroll: true });
    }
    burger.addEventListener('click', function () { setOpen(!root.classList.contains('menu-open')); });
    scrim.addEventListener('click', function () { setOpen(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && root.classList.contains('menu-open')) setOpen(false); });
    drawer.addEventListener('click', function (e) { if (e.target.closest('a')) setOpen(false); });
    Array.prototype.forEach.call(drawer.querySelectorAll('[data-tone]'), function (a) {
      var tint = function () { drawer.style.setProperty('--drawer-to', a.getAttribute('data-tone')); };
      a.addEventListener('pointerenter', tint);
      a.addEventListener('focus', tint);
    });
    window.matchMedia('(min-width: 901px)').addEventListener('change', function (m) { if (m.matches) setOpen(false); });
  }

  /* Section tones */
  function tones() {
    if (!('IntersectionObserver' in window)) return;
    var watched = [];
    TONES.forEach(function (t) {
      Array.prototype.forEach.call(document.querySelectorAll(t[0]), function (el) {
        el.setAttribute('data-tone', t[1]);
        watched.push(el);
      });
    });
    if (!watched.length) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) document.body.style.setProperty('--tone', TONE[e.target.getAttribute('data-tone')]);
      });
    }, { rootMargin: '-45% 0px -45% 0px' });
    watched.forEach(function (el) { io.observe(el); });
  }

  function start() {
    build();
    if (!reduce.matches) tones();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
