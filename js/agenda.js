/* Casa Siego — agenda.js (v2.0.0)
   Fiel Mascotas · calendar of Esencial, Clásica and Legado (brands/fiel/agenda/<sesión>/), opened by Stripe
   after the deposit.
   1. Without ?pago=cs_… the calendar stays closed and the page points back to the sessions.
   2. Only two weeks exist: the current one (Monday to Sunday, Mexico City time) and the next. The rules in
      ../calendario.json say how many slots each week offers (3 now, 9 next), at 9:00 or 16:00. Weekdays are
      drawn at random; Sunday opens in 30 % of the weeks; Saturday never. The draw is seeded with the week's
      Monday, so every visitor sees the same slots. Slots already past (or sooner than anticipacion_horas)
      and those in ../ocupados.json (edited by hand) drop out, and the next ones of the draw take their place.
   3. The visitor picks a day and a slot, fills a short form, and the request opens in their own mail,
      addressed to info@casasiego.com with the Stripe payment id. Fiel confirms by mail and adds the
      slot to ocupados.json. Nothing is stored or sent from the browser. */
(function () {
  'use strict';

  var TO = 'info@casasiego.com';
  var page = document.getElementById('agenda');
  if (!page) return;
  var S = page.dataset;                        // sesion, nombre, duracion, anticipo
  var pago = new URLSearchParams(location.search).get('pago') || '';
  var closed = document.getElementById('agenda-sin-pago');

  if (!/^cs_(live|test)_[A-Za-z0-9]+$/.test(pago)) { closed.hidden = false; return; }
  page.hidden = false;
  document.getElementById('agenda-estado-pago').textContent = 'Anticipo recibido · Elige tu fecha';

  var DIAS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
  var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre',
               'octubre', 'noviembre', 'diciembre'];
  var FRANJA = { manana: 'Mañana', tarde: 'Tarde' };
  var SEMANA = ['Esta semana', 'La próxima semana'];
  var CDMX = -6 * 3600 * 1000;                 // UTC−6 all year (no daylight saving since 2022)
  var DAY = 24 * 3600 * 1000;

  var weeksBox = document.getElementById('agenda-semanas');
  var slotsBox = document.getElementById('agenda-horarios');
  var slotsDay = document.getElementById('agenda-dia');
  var slots = document.getElementById('agenda-franjas');
  var form = document.getElementById('agenda-form');
  var error = document.getElementById('agenda-error');
  var done = document.getElementById('agenda-done');
  var summary = document.getElementById('agenda-summary');
  var mailLink = document.getElementById('agenda-mail');
  var status = document.getElementById('agenda-estado');

  var open = {};                               // 'YYYY-MM-DD' → { manana: {inicio}, tarde: {inicio} } offered
  var chosen = null;                           // { fecha, franja, inicio }

  function startsAt(fecha, hora) { return new Date(fecha + 'T' + hora + ':00-06:00'); }
  function parts(fecha) { var p = fecha.split('-').map(Number); return { y: p[0], m: p[1], d: p[2] }; }
  function weekday(fecha) { var p = parts(fecha); return (new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay() + 6) % 7; }
  function longDate(fecha) { var p = parts(fecha); return DIAS[weekday(fecha)] + ' ' + p.d + ' de ' + MESES[p.m - 1] + ' de ' + p.y; }
  function iso(ms) { return new Date(ms).toISOString().slice(0, 10); }
  function addDays(fecha, n) { return iso(Date.parse(fecha + 'T00:00:00Z') + n * DAY); }

  // Seeded random numbers: FNV-1a hash of the seed, then mulberry32
  function random(seed) {
    var h = 2166136261;
    for (var i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
    return function () {
      h = (h + 0x6D2B79F5) | 0;
      var t = Math.imul(h ^ (h >>> 15), 1 | h);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // The fixed draw of one week: Sunday first when it opens, then every weekday slot in random order
  function draw(cal, monday) {
    var rnd = random(cal.semilla + ':' + monday);
    var franjas = Object.keys(cal.horarios);
    var list = [];
    for (var d = 0; d < 5; d++) franjas.forEach(function (f) { list.push({ fecha: addDays(monday, d), franja: f }); });
    for (var i = list.length - 1; i > 0; i--) {
      var j = Math.floor(rnd() * (i + 1)), t = list[i]; list[i] = list[j]; list[j] = t;
    }
    if (rnd() < cal.domingo) list.unshift({ fecha: addDays(monday, 6), franja: franjas[Math.floor(rnd() * franjas.length)] });
    return list;
  }

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
      var today = iso(Date.now() + CDMX);
      var monday = addDays(today, -weekday(today));
      var weeks = cal.semanas.map(function (count, w) {
        var start = addDays(monday, 7 * w);
        var offered = draw(cal, start).filter(function (s) {
          return !taken[s.fecha + ' ' + s.franja] && startsAt(s.fecha, cal.horarios[s.franja]).getTime() > limit;
        }).slice(0, count);
        offered.forEach(function (s) {
          (open[s.fecha] = open[s.fecha] || {})[s.franja] = { inicio: cal.horarios[s.franja] };
        });
        return { start: start, count: offered.length };
      });
      status.hidden = true;
      drawWeeks(weeks, today);
      if (!Object.keys(open).length) {
        status.textContent = 'Por ahora no hay fechas libres. Escríbenos a ' + TO + ' con tu número de pago y te proponemos una.';
        status.hidden = false;
      }
    })
    .catch(function () {
      status.textContent = 'No pudimos cargar el calendario. Recarga la página o escríbenos a ' + TO + ' con tu número de pago.';
    });

  // --- Two weeks ---------------------------------------------------------------------
  function drawWeeks(weeks, today) {
    weeksBox.textContent = '';
    weeks.forEach(function (week, w) {
      var box = document.createElement('section');
      box.className = 'agenda-semana';
      var head = document.createElement('h3');
      head.className = 'agenda-semana__titulo';
      var a = parts(week.start), b = parts(addDays(week.start, 6));
      head.innerHTML = '<span></span><small></small>';
      head.firstChild.textContent = SEMANA[w] || 'Semana';
      head.lastChild.textContent = a.d + (a.m !== b.m ? ' de ' + MESES[a.m - 1] : '') + ' – ' + b.d + ' de ' + MESES[b.m - 1] +
        ' · ' + (week.count === 1 ? '1 horario' : week.count + ' horarios');
      box.appendChild(head);
      var grid = document.createElement('div');
      grid.className = 'agenda-cal__grid';
      for (var d = 0; d < 7; d++) {
        var fecha = addDays(week.start, d);
        var free = open[fecha];
        var cell = document.createElement(free ? 'button' : 'span');
        cell.innerHTML = '<span class="agenda-cal__dia"></span><span class="agenda-cal__num"></span>';
        cell.firstChild.textContent = DIAS[d].slice(0, 2);
        cell.lastChild.textContent = parts(fecha).d;
        if (free) {
          cell.type = 'button';
          cell.dataset.fecha = fecha;
          var n = Object.keys(free).length;
          var dots = document.createElement('span');
          dots.className = 'agenda-cal__puntos';
          dots.setAttribute('aria-hidden', 'true');
          dots.textContent = n === 2 ? '••' : '•';
          cell.appendChild(dots);
          cell.setAttribute('aria-label', longDate(fecha) + ', ' + (n === 2 ? 'dos horarios' : 'un horario') + ' libre' + (n === 2 ? 's' : ''));
          if (chosen && chosen.fecha === fecha) cell.setAttribute('aria-pressed', 'true');
        } else {
          cell.className = 'agenda-cal__off' + (d === 5 ? ' agenda-cal__off--sabado' : '');
          if (fecha < today) cell.className += ' agenda-cal__off--pasado';
        }
        if (fecha === today) cell.classList.add('agenda-cal__hoy');
        grid.appendChild(cell);
      }
      box.appendChild(grid);
      weeksBox.appendChild(box);
    });
  }

  weeksBox.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-fecha]');
    if (!b) return;
    pickDay(b.dataset.fecha);
  });

  // --- Slots -----------------------------------------------------------------------
  function pickDay(fecha) {
    chosen = null;
    Array.prototype.forEach.call(weeksBox.querySelectorAll('[aria-pressed]'), function (el) { el.removeAttribute('aria-pressed'); });
    var b = weeksBox.querySelector('[data-fecha="' + fecha + '"]');
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
        chosen = { fecha: fecha, franja: f, inicio: s.inicio };
        form.hidden = false;
      });
      label.lastChild.textContent = FRANJA[f] + ' · ' + s.inicio.replace(/^0/, '');
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
      'Horario: ' + FRANJA[chosen.franja].toLowerCase() + ', ' + chosen.inicio.replace(/^0/, '') + ' h (hora de la Ciudad de México)',
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
