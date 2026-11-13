/* Casa Siego — elige.js (v1.0.0)
   visitante.html: buttons marked data-elige="medida" or data-elige="rtw" first ask «Dama o Caballero»
   in a small dialog, then go to A medida (Atemporal / Justo) or Ready to Wear (their tiendas).
   Without JavaScript the button keeps its own href (Caballero). */
(function () {
  'use strict';

  var me = document.currentScript;
  var ROOT = me ? new URL('../', me.src).href : '/';
  var DESTINOS = {
    medida: { titulo: 'A medida', dama: 'brands/atemporal/', caballero: 'brands/justo/',
              notaDama: 'Atemporal', notaCaballero: 'Justo' },
    rtw:    { titulo: 'Ready to Wear', dama: 'brands/atemporal/tienda/', caballero: 'brands/justo/tienda/',
              notaDama: 'Atemporal', notaCaballero: 'Justo' }
  };

  var dlg, eyebrow, linkDama, linkCaballero, notaDama, notaCaballero, origen;

  function crear() {
    dlg = document.createElement('dialog');
    dlg.className = 'elige';
    dlg.setAttribute('aria-labelledby', 'elige-titulo');
    dlg.setAttribute('autofocus', '');   // focus the card itself, not the close button
    dlg.innerHTML =
      '<div class="elige__marco">' +
        '<button class="elige__cerrar" type="button" aria-label="Cerrar">&times;</button>' +
        '<p class="eyebrow eyebrow--gold elige__eyebrow"></p>' +
        '<h2 class="elige__titulo" id="elige-titulo">¿Para quién es?</h2>' +
        '<hr class="rule rule--short">' +
        '<div class="elige__opciones">' +
          '<a class="elige__opcion" data-genero="dama"><span class="elige__nombre">Dama</span><span class="elige__nota"></span></a>' +
          '<a class="elige__opcion" data-genero="caballero"><span class="elige__nombre">Caballero</span><span class="elige__nota"></span></a>' +
        '</div>' +
      '</div>';
    document.body.appendChild(dlg);
    eyebrow = dlg.querySelector('.elige__eyebrow');
    linkDama = dlg.querySelector('[data-genero="dama"]');
    linkCaballero = dlg.querySelector('[data-genero="caballero"]');
    notaDama = linkDama.querySelector('.elige__nota');
    notaCaballero = linkCaballero.querySelector('.elige__nota');

    dlg.querySelector('.elige__cerrar').addEventListener('click', cerrar);
    dlg.addEventListener('click', function (e) { if (e.target === dlg) cerrar(); });   // backdrop
    dlg.addEventListener('cancel', function (e) { e.preventDefault(); cerrar(); });   // Escape
  }

  function abrir(tipo, boton) {
    var d = DESTINOS[tipo];
    if (!d) return false;
    if (!dlg) crear();
    if (typeof dlg.showModal !== 'function') return false;   // very old browser: follow the plain link
    origen = boton;
    eyebrow.textContent = d.titulo;
    linkDama.href = ROOT + d.dama;
    linkCaballero.href = ROOT + d.caballero;
    notaDama.textContent = d.notaDama;
    notaCaballero.textContent = d.notaCaballero;
    dlg.classList.remove('is-cerrando');
    dlg.showModal();
    return true;
  }

  function cerrar() {
    if (!dlg || !dlg.open) return;
    var fin = function () { dlg.classList.remove('is-cerrando'); dlg.close(); if (origen) origen.focus({ preventScroll: true }); };
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return fin();
    dlg.classList.add('is-cerrando');
    setTimeout(fin, 280);
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-elige]');
    if (!b || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (abrir(b.getAttribute('data-elige'), b)) e.preventDefault();
  });
})();
