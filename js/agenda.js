/* Casa Siego — agenda.js (v1.0.0)
   Fiel Mascotas · internal calendar (brands/fiel/agenda/<sesión>/), opened by Stripe after the deposit.
   1. Without ?pago=cs_… the calendar stays closed and the page points back to the sessions.
   2. Reads ../calendario.json (open days and their two golden-hour slots, from docs/src/calendario-fiel.py)
      and ../ocupados.json (slots already confirmed, edited by hand), and draws one month at a time.
      Slots that start sooner than anticipacion_horas are not offered.
   3. The visitor picks a day and a slot, fills a short form, and the request opens in their own mail,
      addressed to info@casasiego.com with the Stripe payment id. Fiel confirms by mail and adds the
      slot to ocupados.json. Nothing is stored or sent from the browser. */
(function () {
  'use strict';

  var TO = 'info@casasiego.com';
  var page = document.getElementById('agenda');
  if (!page) return;
  var S = page.dataset;                        // sesion, nombre, duracion, anticipo, lugar ("libre" asks where)
  var pago = new URLSearchParams(location.search).get('pago') || '';
  var closed = document.getElementById('agenda-sin-pago');

  if (!/^cs_(live|test)_[A-Za-z0-9]+$/.test(pago)) { closed.hidden = false; return; }
  page.hidden = false;
  document.getElementById('agenda-estado-pago').textContent = 'Anticipo recibido · Elige tu fecha';

  var DIAS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
  var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre',
               'octubre', 'noviembre', 'diciembre'];
  var FRANJA = { manana: 'Mañana', tarde: 'Tarde' };

  var grid = document.getElementById('agenda-grid');
  var title = document.getElementById('agenda-mes');
  var prev = document.getElementById('agenda-prev');
  var next = document.getElementById('agenda-next');
  var slotsBox = document.getElementById('agenda-horarios');
  var slotsDay = document.getElementById('agenda-dia');
  var slots = document.getElementById('agenda-franjas');
  var form = document.getElementById('agenda-form');
  var error = document.getElementById('agenda-error');
  var done = document.getElementById('agenda-done');
  var summary = document.getElementById('agenda-summary');
  var mailLink = document.getElementById('agenda-mail');
  var status = document.getElementById('agenda-estado');

  var open = {};                               // 'YYYY-MM-DD' → { manana: {inicio, fin}, tarde: {…} } still free
  var months = [];                             // ['YYYY-MM', …] with at least one free slot
  var shown = 0;
  var chosen = null;                           // { fecha, franja, inicio, fin }

  // CDMX is UTC−6 all year (no daylight saving since 2022)
  function startsAt(fecha, hora) { return new Date(fecha + 'T' + hora + ':00-06:00'); }
  function parts(fecha) { var p = fecha.split('-').map(Number); return { y: p[0], m: p[1], d: p[2] }; }
  function weekday(fecha) { var p = parts(fecha); return (new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay() + 6) % 7; }
  function longDate(fecha) { var p = parts(fecha); return DIAS[weekday(fecha)] + ' ' + p.d + ' de ' + MESES[p.m - 1] + ' de ' + p.y; }
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function load(url) {
    return fetch(url, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error(url + ' ' + r.status);
      return r.json();
    });
  }

  Promise.all([load('../calendario.json'), load('../ocupados.json').catch(function () { return { ocupados: [] }; })])
    .then(function (res) {
      var cal = res[0];
      var taken = {};
      (res[1].ocupados || []).forEach(function (k) { taken[k] = true; });
      var limit = Date.now() + (cal.anticipacion_horas || 24) * 3600 * 1000;
      cal.dias.forEach(function (dia) {
        var free = {};
        ['manana', 'tarde'].forEach(function (f) {
          if (!taken[dia.fecha + ' ' + f] && startsAt(dia.fecha, dia[f].inicio).getTime() > limit) free[f] = dia[f];
        });
        if (!free.manana && !free.tarde) return;
        open[dia.fecha] = free;
        var m = dia.fecha.slice(0, 7);
        if (months.indexOf(m) < 0) months.push(m);
      });
      status.hidden = true;
      if (!months.length) {
        status.textContent = 'Por ahora no hay fechas libres. Escríbenos a ' + TO + ' con tu número de pago y te proponemos una.';
        status.hidden = false;
        return;
      }
      draw();
    })
    .catch(function () {
      status.textContent = 'No pudimos cargar el calendario. Recarga la página o escríbenos a ' + TO + ' con tu número de pago.';
    });

  // --- Month grid ------------------------------------------------------------------
  function draw() {
    var ym = months[shown].split('-').map(Number);
    title.textContent = MESES[ym[1] - 1] + ' ' + ym[0];
    prev.disabled = shown === 0;
    next.disabled = shown === months.length - 1;
    grid.textContent = '';
    var first = months[shown] + '-01';
    var blanks = weekday(first);
    var days = new Date(Date.UTC(ym[0], ym[1], 0)).getUTCDate();
    for (var b = 0; b < blanks; b++) grid.appendChild(document.createElement('span'));
    for (var d = 1; d <= days; d++) {
      var fecha = months[shown] + '-' + pad(d);
      var cell;
      if (open[fecha]) {
        cell = document.createElement('button');
        cell.type = 'button';
        cell.dataset.fecha = fecha;
        cell.setAttribute('aria-label', longDate(fecha) + ', con horario libre');
        if (chosen && chosen.fecha === fecha) cell.setAttribute('aria-pressed', 'true');
      } else {
        cell = document.createElement('span');
        cell.className = 'agenda-cal__off';
      }
      cell.textContent = d;
      grid.appendChild(cell);
    }
  }

  prev.addEventListener('click', function () { if (shown > 0) { shown--; draw(); } });
  next.addEventListener('click', function () { if (shown < months.length - 1) { shown++; draw(); } });

  grid.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-fecha]');
    if (!b) return;
    pickDay(b.dataset.fecha);
  });

  // --- Slots -----------------------------------------------------------------------
  function pickDay(fecha) {
    chosen = null;
    Array.prototype.forEach.call(grid.querySelectorAll('[aria-pressed]'), function (el) { el.removeAttribute('aria-pressed'); });
    var b = grid.querySelector('[data-fecha="' + fecha + '"]');
    if (b) b.setAttribute('aria-pressed', 'true');
    slotsDay.textContent = longDate(fecha);
    slots.textContent = '';
    ['manana', 'tarde'].forEach(function (f) {
      var s = open[fecha][f];
      if (!s) return;
      var label = document.createElement('label');
      label.innerHTML = '<input type="radio" name="franja"><span></span>';
      var input = label.firstChild;
      input.value = f;
      input.addEventListener('change', function () {
        chosen = { fecha: fecha, franja: f, inicio: s.inicio, fin: s.fin };
        form.hidden = false;
      });
      label.lastChild.textContent = FRANJA[f] + ' · ' + s.inicio + ' – ' + s.fin;
      slots.appendChild(label);
    });
    slotsBox.hidden = false;
    form.hidden = true;
    slotsBox.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  // --- Request by mail ---------------------------------------------------------------
  function value(name) { var el = form.elements[name]; return el ? el.value.trim() : ''; }

  function letter() {
    var lines = [
      'FIEL · MASCOTAS · SOLICITUD DE CITA', '',
      'Sesión: ' + S.nombre + (S.duracion ? ' (' + S.duracion + ')' : ''),
      'Fecha: ' + longDate(chosen.fecha),
      'Horario: ' + FRANJA[chosen.franja].toLowerCase() + ', ' + chosen.inicio + ' – ' + chosen.fin + ' (hora de la Ciudad de México)',
      'Anticipo: ' + S.anticipo + ' · pago ' + pago, '',
      'Nombre: ' + value('nombre'),
      'Correo: ' + value('correo')
    ];
    if (value('telefono')) lines.push('Teléfono: ' + value('telefono'));
    lines.push('Mascota(s): ' + value('mascota'));
    if (value('donde')) lines.push('Locación: ' + value('donde'));
    if (value('comentarios')) lines.push('', 'Comentarios:', value('comentarios'));
    lines.push('', '—', 'Enviado desde casasiego.com/brands/fiel/agenda/' + S.sesion + '/');
    return lines.join('\n');
  }

  function check() {
    var bad = [];
    ['nombre', 'correo', 'mascota', 'donde'].forEach(function (name) {
      var el = form.elements[name];
      if (!el) return;
      var ok = el.value.trim() !== '' && (el.type !== 'email' || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(el.value.trim()));
      el.setAttribute('aria-invalid', ok ? 'false' : 'true');
      if (!ok) bad.push(el);
    });
    if (!form.elements.consentimiento.checked) bad.push(form.elements.consentimiento);
    return bad;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!chosen) return;
    var bad = check();
    if (bad.length) {
      error.textContent = bad.length === 1 && bad[0] === form.elements.consentimiento
        ? 'Falta aceptar el uso de tus datos para agendar la sesión.'
        : 'Faltan tu nombre, un correo válido, el nombre de tu mascota' + (form.elements.donde ? ' o la locación.' : '.');
      error.hidden = false;
      bad[0].focus();
      return;
    }
    error.hidden = true;
    var text = letter();
    var subject = 'Fiel · Cita ' + S.nombre + ' · ' + chosen.fecha + ' ' + chosen.inicio;
    summary.textContent = text;
    mailLink.href = 'mailto:' + TO + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(text);
    page.querySelector('.agenda-pick').hidden = true;
    done.hidden = false;
    done.focus();
    done.scrollIntoView({ block: 'start' });
    window.location.href = mailLink.href;
  });

  document.getElementById('agenda-copy').addEventListener('click', function () {
    var btn = this;
    navigator.clipboard.writeText(summary.textContent).then(function () {
      btn.textContent = 'Copiada';
      setTimeout(function () { btn.textContent = 'Copiar solicitud'; }, 2400);
    });
  });
  document.getElementById('agenda-edit').addEventListener('click', function () {
    done.hidden = true;
    page.querySelector('.agenda-pick').hidden = false;
  });
})();
