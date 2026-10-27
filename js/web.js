/* Casa Siego — web.js (v1.0.0)
   Web · Lujo, Arte e Imagen (web/): the consulting questionnaire.
   1. Keeps a draft in this browser while the visitor writes (localStorage; nothing leaves the device).
   2. Shows progress in the side index and caps «tres palabras» at three.
   3. On send: checks contact data and consent, writes the answers as a plain-text letter and opens the
      visitor's own e-mail to info@casasiego.com. Long letters can be cut by some mail apps, so the
      letter is also shown on the page to copy or download. No server: the site is static. */
(function () {
  'use strict';

  var TO = 'info@casasiego.com';
  var DRAFT_KEY = 'casasiego.web-lujo';
  var form = document.getElementById('web-form');
  if (!form) return;
  var done = document.getElementById('web-done');
  var error = document.getElementById('web-error');
  var bar = document.getElementById('web-progress-bar');
  var barText = document.getElementById('web-progress-text');
  var summary = document.getElementById('web-summary');
  var mailLink = document.getElementById('web-mail');
  var download = document.getElementById('web-download');
  var downloadUrl = '';

  function store(fn) { try { return fn(window.localStorage); } catch (e) { return null; } }

  // --- Draft -------------------------------------------------------------------
  function serialize() {
    var data = {};
    Array.prototype.forEach.call(form.elements, function (el) {
      if (!el.name || el.type === 'submit') return;
      if (el.type === 'checkbox' || el.type === 'radio') {
        if (!el.checked) return;
        if (el.type === 'checkbox' && el.name !== 'consentimiento') (data[el.name] = data[el.name] || []).push(el.value);
        else data[el.name] = el.type === 'radio' ? el.value : true;
      } else if (el.value !== '') {
        data[el.name] = el.value;
      }
    });
    return data;
  }

  function restore() {
    var raw = store(function (s) { return s.getItem(DRAFT_KEY); });
    if (!raw) return;
    var data;
    try { data = JSON.parse(raw); } catch (e) { return; }
    Array.prototype.forEach.call(form.elements, function (el) {
      if (!el.name || !(el.name in data)) return;
      var v = data[el.name];
      if (el.type === 'checkbox' && el.name === 'consentimiento') el.checked = v === true;
      else if (el.type === 'checkbox') el.checked = Array.isArray(v) && v.indexOf(el.value) >= 0;
      else if (el.type === 'radio') el.checked = el.value === v;
      else el.value = v;
    });
  }

  var saveTimer;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      store(function (s) { s.setItem(DRAFT_KEY, JSON.stringify(serialize())); });
    }, 300);
  }

  // --- Progress: share of questions with an answer (scales count once moved) ----
  var questions = Array.prototype.slice.call(form.querySelectorAll('.q, .scale'));
  function answered(q) {
    var els = q.matches('label') ? [q.querySelector('input, select, textarea')] : Array.prototype.slice.call(q.querySelectorAll('input, select, textarea'));
    return els.some(function (el) {
      if (!el) return false;
      if (el.type === 'checkbox' || el.type === 'radio') return el.checked;
      if (el.type === 'range') return el.dataset.moved === '1';
      return el.value.trim() !== '';
    });
  }
  function progress() {
    var n = questions.filter(answered).length;
    var pct = Math.round(n / questions.length * 100);
    if (bar) bar.style.width = pct + '%';
    if (barText) barText.textContent = n + ' de ' + questions.length + ' preguntas · tus respuestas se guardan en este navegador.';
  }

  // --- «Hasta tres palabras» ---------------------------------------------------
  function capWords() {
    Array.prototype.forEach.call(form.querySelectorAll('[data-max]'), function (set) {
      var max = Number(set.dataset.max);
      var boxes = Array.prototype.slice.call(set.querySelectorAll('input[type="checkbox"]'));
      var chosen = boxes.filter(function (b) { return b.checked; }).length;
      boxes.forEach(function (b) { b.disabled = !b.checked && chosen >= max; });
      var hint = set.querySelector('.q__hint');
      if (hint) hint.textContent = chosen >= max ? 'Ya elegiste tres. Quita una para cambiarla.' : '';
    });
  }

  // --- The letter ----------------------------------------------------------------
  function textOf(node) { return node ? node.textContent.replace(/\s+/g, ' ').trim() : ''; }

  function answerOf(q) {
    if (q.matches('.scale')) {
      var r = q.querySelector('input[type="range"]');
      if (r.dataset.moved !== '1') return '';
      var v = Number(r.value);
      var words = ['muy ' + r.dataset.left.toLowerCase(), r.dataset.left.toLowerCase(), 'al centro', r.dataset.right.toLowerCase(), 'muy ' + r.dataset.right.toLowerCase()];
      return r.dataset.left + ' ↔ ' + r.dataset.right + ': ' + words[v - 1] + ' (' + v + ' de 5)';
    }
    var picks = Array.prototype.slice.call(q.querySelectorAll('input:checked')).filter(function (el) { return el.name !== 'consentimiento'; });
    if (picks.length) return picks.map(function (el) { return el.value; }).join(', ');
    var field = q.querySelector('input:not([type="checkbox"]):not([type="radio"]), select, textarea');
    return field ? field.value.trim() : '';
  }

  function letter() {
    var lines = ['WEB · LUJO, ARTE E IMAGEN', 'Cuestionario para la consultoría del Club Casa Siego', ''];
    Array.prototype.forEach.call(form.querySelectorAll('.web-part'), function (part) {
      var block = [];
      Array.prototype.forEach.call(part.querySelectorAll('.q, .scale'), function (q) {
        if (q.parentElement.closest('.q')) return;              // nested inside another question
        var a = answerOf(q);
        if (!a) return;
        var label = q.matches('.scale') ? '' : textOf(q.querySelector('.q__t'));
        block.push(label ? label + '\n  ' + a.replace(/\n/g, '\n  ') : '· ' + a);
      });
      if (!block.length) return;
      var legend = part.querySelector('legend');
      var no = textOf(legend.querySelector('.web-part__no'));
      lines.push((no + ' · ' + textOf(legend).slice(no.length).trim()).toUpperCase(), '');
      lines.push(block.join('\n\n'), '');
    });
    lines.push('—', 'Enviado desde casasiego.com/membresia/web/');
    return lines.join('\n');
  }

  // --- Send ------------------------------------------------------------------------
  function check() {
    var bad = [];
    ['nombre', 'correo', 'marca'].forEach(function (name) {
      var el = form.elements[name];
      var ok = el.value.trim() !== '' && (el.type !== 'email' || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(el.value.trim()));
      el.setAttribute('aria-invalid', ok ? 'false' : 'true');
      if (!ok) bad.push(el);
    });
    var consent = form.elements.consentimiento;
    if (!consent.checked) bad.push(consent);
    return bad;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var bad = check();
    if (bad.length) {
      error.textContent = bad.indexOf(form.elements.consentimiento) >= 0 && bad.length === 1
        ? 'Falta aceptar el uso de tus respuestas al final del cuestionario.'
        : 'Faltan tu nombre, un correo válido o el nombre de tu marca, en la parte I.';
      error.hidden = false;
      bad[0].focus();
      return;
    }
    error.hidden = true;
    var text = letter();
    var subject = 'Web · Lujo, Arte e Imagen · ' + form.elements.marca.value.trim();
    summary.textContent = text;
    mailLink.href = 'mailto:' + TO + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(text);
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    downloadUrl = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
    download.href = downloadUrl;
    form.hidden = true;
    done.hidden = false;
    done.focus();
    done.scrollIntoView({ block: 'start' });
    window.location.href = mailLink.href;
  });

  document.getElementById('web-copy').addEventListener('click', function () {
    var btn = this;
    var ok = function () { btn.textContent = 'Copiadas'; setTimeout(function () { btn.textContent = 'Copiar respuestas'; }, 2400); };
    if (navigator.clipboard) navigator.clipboard.writeText(summary.textContent).then(ok, function () {});
  });

  document.getElementById('web-edit').addEventListener('click', function () {
    done.hidden = true;
    form.hidden = false;
    form.scrollIntoView({ block: 'start' });
  });

  // --- Wiring ------------------------------------------------------------------------
  restore();
  Array.prototype.forEach.call(form.querySelectorAll('input[type="range"]'), function (r) {
    var saved = store(function (s) { return s.getItem(DRAFT_KEY + '.moved'); }) || '';
    if (saved.split(',').indexOf(r.name) >= 0) r.dataset.moved = '1';
    r.addEventListener('input', function () {
      r.dataset.moved = '1';
      var moved = Array.prototype.filter.call(form.querySelectorAll('input[type="range"]'), function (x) { return x.dataset.moved === '1'; })
        .map(function (x) { return x.name; }).join(',');
      store(function (s) { s.setItem(DRAFT_KEY + '.moved', moved); });
    });
  });
  form.addEventListener('input', function (e) {
    if (e.target.getAttribute('aria-invalid') === 'true') e.target.setAttribute('aria-invalid', 'false');
    capWords(); progress(); save();
  });
  form.addEventListener('change', function () { capWords(); progress(); save(); });
  capWords();
  progress();
})();
