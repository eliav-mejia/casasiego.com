/* Casa Siego — retratos.js (v1.0.0)
   Fiel portrait cards (brands/fiel/, .sessions--portrait):
   1. Scroll zoom: each card writes --zoom (0 at the edges of the viewport, 1 at its centre),
      and brand.css scales the card and its photograph from it.
   2. Pop-up: a click opens #retrato, a <dialog> filled from the card (photo, number, tag, data-desc, href),
      with an animated entrance and exit. Esc, × or a click on the backdrop close it.
   Without JavaScript or <dialog> support the cards stay plain links. Reduced motion: no zoom, no animation. */
(function () {
  'use strict';
  var cards = Array.prototype.slice.call(document.querySelectorAll('.sessions--portrait .session--link'));
  if (!cards.length) return;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* 1. Scroll zoom */
  var ticking = false;
  function update() {
    ticking = false;
    if (reduce.matches) return;
    var vh = window.innerHeight;
    cards.forEach(function (card) {
      var r = card.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
      var d = Math.abs(r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2);
      card.style.setProperty('--zoom', (1 - Math.min(d, 1)).toFixed(3));
    });
  }
  function request() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', request);
  update();

  /* 2. Pop-up */
  var dialog = document.getElementById('retrato');
  if (!dialog || typeof dialog.showModal !== 'function') return;
  var img = dialog.querySelector('.retrato__img');
  var no = dialog.querySelector('.retrato__no');
  var tag = dialog.querySelector('.retrato__tag');
  var desc = dialog.querySelector('.retrato__desc');
  var go = dialog.querySelector('.retrato__go');
  var opener = null;

  function close() {
    if (!dialog.open || dialog.classList.contains('is-closing')) return;
    if (reduce.matches) { dialog.close(); return; }
    dialog.classList.add('is-closing');
    dialog.addEventListener('animationend', function done() {
      dialog.removeEventListener('animationend', done);
      dialog.classList.remove('is-closing');
      dialog.close();
    });
  }

  cards.forEach(function (card) {
    card.addEventListener('click', function (e) {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;   // new tab still works
      e.preventDefault();
      var photo = card.querySelector('img');
      img.src = photo.currentSrc || photo.src;
      img.alt = photo.alt;
      no.textContent = card.querySelector('.leaf__no').textContent;
      tag.textContent = card.querySelector('.session__tag').textContent;
      desc.textContent = card.dataset.desc || '';
      go.href = card.getAttribute('href');
      go.textContent = 'Ver sesiones de ' + tag.textContent.toLowerCase() + ' →';
      opener = card;
      dialog.showModal();
    });
  });

  dialog.addEventListener('cancel', function (e) { e.preventDefault(); close(); });   // Esc
  dialog.addEventListener('click', function (e) {
    if (e.target === dialog || e.target.closest('.retrato__close')) close();
  });
  dialog.addEventListener('close', function () { if (opener) opener.focus(); });
})();
