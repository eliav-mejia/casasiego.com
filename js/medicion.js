/* Casa Siego — medicion.js (v1.0.0)
   Measurement layer for Google Tag Manager (container GTM-WHTQ77F9, loaded by the snippet at the top of <head>).
   It only pushes events to window.dataLayer; tags, triggers and GA4 are set up in the GTM container.
   Never pushes personal data: no names, e-mails, phone numbers, payment ids or form answers.

   Events (all with marca, seccion and region, so every step can be filtered by brand):
   1. casa_pagina       once per page: plantilla (the page's path without the domain).
   2. casa_region       the visitor or the IP lookup switches México / España (region.js).
   3. casa_pago_inicio  click on a Stripe Payment Link: producto (button text), destino (link without query).
   4. casa_contacto     click on mailto:, tel: or WhatsApp: canal, asunto (mailto subject).
   5. casa_cta          click on a button-styled link (.button, .btn): texto, destino.
   6. casa_salida       click on any other link to another domain: destino.
   7. casa_formulario   submit of a form: formulario (id or name).
   Page scripts push their own steps with the same shape:
   acceso.js (casa_acceso), registro.js (casa_registro), agenda.js (casa_agenda), web.js (casa_consultoria). */
(function () {
  'use strict';

  var dl = window.dataLayer = window.dataLayer || [];
  var path = location.pathname;

  // marca: first folder that names a brand or a section of the house.
  var marca = (path.match(/\/brands\/(fiel|justo|libre)\//) || [])[1] ||
    (path.match(/\/(membresia|ayuda)\//) || [])[1] ||
    (/registro\.html$/.test(path) ? 'registro' : 'casa');
  // seccion: the folder under the brand (tienda, agenda, ejecutivo…), or "portada".
  var seccion = (path.match(/\/brands\/[a-z]+\/([a-z-]+)\//) || path.match(/\/(?:membresia|ayuda)\/([a-z-]+)\//) || [])[1] || 'portada';

  function region() {
    return document.documentElement.getAttribute('data-region') || 'mx';
  }

  function medir(evento, datos) {
    var e = { event: evento, marca: marca, seccion: seccion, region: region() };
    for (var k in datos) e[k] = datos[k];
    dl.push(e);
  }
  window.casaMedir = medir;

  medir('casa_pagina', { plantilla: path });

  window.addEventListener('casasiego:region', function () { medir('casa_region', {}); });

  function texto(el) { return (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80); }
  function sinQuery(href) { return href.split(/[?#]/)[0]; }

  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    var href = a.href;
    if (/^https:\/\/buy\.stripe\.com\//.test(href)) {
      medir('casa_pago_inicio', { producto: texto(a), destino: sinQuery(href) });
    } else if (/^mailto:/.test(href)) {
      var asunto = (href.match(/[?&]subject=([^&]*)/) || [])[1];
      medir('casa_contacto', { canal: 'correo', asunto: asunto ? decodeURIComponent(asunto) : '' });
    } else if (/^tel:/.test(href)) {
      medir('casa_contacto', { canal: 'telefono', asunto: '' });
    } else if (/^https:\/\/(wa\.me|api\.whatsapp\.com)\//.test(href)) {
      medir('casa_contacto', { canal: 'whatsapp', asunto: '' });
    } else if (a.matches('.button, .btn')) {
      medir('casa_cta', { texto: texto(a), destino: sinQuery(href) });
    } else if (a.hostname && a.hostname !== location.hostname) {
      medir('casa_salida', { destino: sinQuery(href) });
    }
  }, true);

  document.addEventListener('submit', function (e) {
    var f = e.target;
    medir('casa_formulario', { formulario: f.id || f.getAttribute('name') || 'formulario' });
  }, true);
})();
