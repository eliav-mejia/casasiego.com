/* Casa Siego — coleccion.js (v1.0.0)
   Justo · Diseña tu colección (brands/justo/): the Priority form.
   The site is static, so «Enviar» writes the answers as a plain-text letter and opens the visitor's own
   e-mail to info@casasiego.com (same approach as web.js). «Número de personas» shows only for a company.
   js/medicion.js already records the submit (casa_formulario). */
(function () {
  'use strict';

  var TO = 'info@casasiego.com';
  var form = document.getElementById('coleccion-form');
  if (!form) return;
  var error = document.getElementById('coleccion-error');
  var done = document.getElementById('coleccion-done');
  var mail = document.getElementById('coleccion-mail');
  var personas = document.getElementById('coleccion-personas');

  function value(name) {
    var el = form.elements[name];
    if (!el) return '';
    if (el instanceof RadioNodeList) return el.value || '';
    return el.value.trim();
  }

  function sync() { personas.hidden = value('para') !== 'Mi empresa'; }
  Array.prototype.forEach.call(form.elements.para, function (r) { r.addEventListener('change', sync); });
  sync();

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var nombre = form.elements.nombre, correo = form.elements.correo;
    var bad = [nombre, correo].filter(function (el) { return !el.value.trim() || !el.checkValidity(); });
    if (bad.length) {
      error.textContent = 'Escribe tu nombre y un correo válido.';
      error.hidden = false;
      bad[0].focus();
      return;
    }
    error.hidden = true;
    var lines = [
      'Diseña tu colección · Cliente Priority',
      '',
      'Nombre: ' + value('nombre'),
      'Correo: ' + value('correo'),
      'Teléfono: ' + (value('telefono') || '—'),
      'Ciudad: ' + (value('ciudad') || '—'),
      'Es para: ' + (value('para') || '—')
    ];
    if (value('para') === 'Mi empresa') lines.push('Número de personas: ' + (value('personas') || '—'));
    lines.push('Momento: ' + (value('momento') || '—'), '', 'Comentarios:', value('comentarios') || '—');
    mail.href = 'mailto:' + TO + '?subject=' + encodeURIComponent('Diseña tu colección · ' + value('nombre')) +
      '&body=' + encodeURIComponent(lines.join('\n'));
    form.hidden = true;
    done.hidden = false;
    done.focus();
    window.location.href = mail.href;
  });
})();
