/* Casa Siego — parallax.js (v1.1.0)
   Writes a --py offset on each [data-speed] element while it is on screen,
   and adds .is-visible to [data-reveal] elements as they enter.
   No scroll-jacking: native scrolling is never intercepted. */
(function () {
  'use strict';

  var root = document.documentElement;
  root.classList.add('js');

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* Reveal: tag editorial blocks, then fade them in once. */
  var revealTargets = document.querySelectorAll(
    '.folio__text, .folio__margin, .chapter__sticky, .caption, .leaf__text, .gallery__head, .colophon__inner, ' +
    '.plate__frame, .leaf__image, .house, .houses__head, .stack__head, .session, .sessions__head, .club__col'
  );
  revealTargets.forEach(function (el) { el.setAttribute('data-reveal', ''); });

  if ('IntersectionObserver' in window) {
    var revealer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealer.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -10% 0px' });
    revealTargets.forEach(function (el) { revealer.observe(el); });
  } else {
    revealTargets.forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* Parallax: only elements currently near the viewport are updated. */
  var layers = Array.prototype.slice.call(document.querySelectorAll('[data-speed]'));
  var active = new Set();
  var ticking = false;

  function update() {
    ticking = false;
    if (reduce.matches) return;
    var vh = window.innerHeight;
    active.forEach(function (el) {
      var speed = parseFloat(el.dataset.speed) || 0;
      // Subtract the current offset so the element's own transform doesn't feed back.
      var rect = el.getBoundingClientRect();
      var current = el._py || 0;
      var delta = rect.top - current + rect.height / 2 - vh / 2;
      el._py = delta * -speed;
      el.style.setProperty('--py', el._py.toFixed(1) + 'px');
    });
  }

  function request() {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }

  if ('IntersectionObserver' in window) {
    var watcher = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) active.add(entry.target);
        else active.delete(entry.target);
      });
      request();
    }, { rootMargin: '25% 0px 25% 0px' });
    layers.forEach(function (el) { watcher.observe(el); });
  } else {
    layers.forEach(function (el) { active.add(el); });
  }

  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', request);
  reduce.addEventListener && reduce.addEventListener('change', function () {
    layers.forEach(function (el) { el._py = 0; el.style.removeProperty('--py'); });
    request();
  });
  request();
})();
