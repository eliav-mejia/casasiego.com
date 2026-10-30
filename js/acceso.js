/* Casa Siego — acceso.js (v1.0.5)
   Sign-in gate of the home page (index.html only; brand pages, terms and the shop have no gate).
   1. A login card covers the page (no sign-up: accounts are created by Casa Siego in Supabase).
   2. On submit the card flips to a white card with a script message:
        success → «Encantados de volvernos a encontrar» → the card fades out and the page opens
        error   → «Esperamos tener el honor de conocerte pronto» → redirect to brands/fiel/
      Any failure counts as an error: wrong credentials, Supabase not configured, network, timeout.
   3. A valid Supabase session skips the gate on later visits.
   4. «Omitir», in light grey under the login, goes to visitante.html (copy of the home page without the gate,
      version 1.0.0 «Unrecognized visitor»).
   Deterrent only on a static host: the HTML is still downloadable. Real protection: _interno/acceso-casasiego.md. */
(function () {
  'use strict';

  var CFG = window.CASASIEGO_ACCESO || {};
  var MSG_OK = 'Encantados de volvernos a encontrar';
  var MSG_ERROR = 'Esperamos tener el honor de conocerte pronto';
  var root = document.documentElement;
  var configured = Boolean(CFG.supabaseUrl && CFG.publishableKey);
  var clientPromise = null;

  // --- Supabase ------------------------------------------------------------
  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src; s.async = true; s.crossOrigin = 'anonymous';
      s.onload = resolve; s.onerror = function () { reject(new Error('No se pudo cargar ' + src)); };
      document.head.appendChild(s);
    });
  }

  function getClient() {
    if (!configured) return Promise.reject(new Error('Supabase sin configurar'));
    if (!clientPromise) {
      clientPromise = loadScript(CFG.supabaseJs).then(function () {
        return window.supabase.createClient(CFG.supabaseUrl, CFG.publishableKey, {
          auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
        });
      });
    }
    return clientPromise;
  }

  function withTimeout(promise) {
    return Promise.race([promise, new Promise(function (_, reject) {
      setTimeout(function () { reject(new Error('Tiempo de espera agotado')); }, CFG.timeoutMs || 10000);
    })]);
  }

  function signIn(email, password) {
    return withTimeout(getClient().then(function (client) {
      return client.auth.signInWithPassword({ email: email, password: password });
    })).then(function (res) {
      if (res.error || !res.data || !res.data.session) throw res.error || new Error('Sin sesión');
      return res.data.session;
    });
  }

  function existingSession() {
    if (!configured) return Promise.resolve(null);
    return withTimeout(getClient().then(function (client) { return client.auth.getSession(); }))
      .then(function (res) { return (res && res.data && res.data.session) || null; })
      .catch(function () { return null; });
  }

  // --- Gate ----------------------------------------------------------------
  var TEMPLATE =
    '<div class="acceso__card">' +
      '<div class="acceso__inner">' +
        '<section class="acceso__face acceso__front" aria-labelledby="acceso-titulo">' +
          '<p class="eyebrow eyebrow--gold">Acceso de miembros</p>' +
          '<h2 class="acceso__title wordmark" id="acceso-titulo"><span class="wordmark__casa">CASA</span> <span class="wordmark__siego">Siego</span><sup class="wordmark__r">&reg;</sup></h2>' +
          '<p class="acceso__lede">Un lugar reservado para nuestros miembros. Inicia sesión para entrar.</p>' +
          '<form class="acceso__form" novalidate>' +
            '<label class="acceso__field"><span class="acceso__label">Usuario (correo)</span>' +
              '<input class="acceso__input" type="email" name="email" autocomplete="username" required></label>' +
            '<label class="acceso__field"><span class="acceso__label">Contraseña</span>' +
              '<input class="acceso__input" type="password" name="password" autocomplete="current-password" required></label>' +
            '<button class="button acceso__submit" type="submit">Entrar</button>' +
          '</form>' +
          '<button class="acceso__skip" type="button">Omitir</button>' +
          '<p class="acceso__fine">Las cuentas las crea la Casa. Si eres miembro y no tienes acceso, escribe a info@casasiego.com.</p>' +
        '</section>' +
        '<section class="acceso__face acceso__back" aria-live="assertive">' +
          '<hr class="rule rule--short rule--gold">' +
          '<p class="acceso__message"></p>' +
          '<p class="acceso__sign wordmark"><span class="wordmark__casa">CASA</span> <span class="wordmark__siego">Siego</span><sup class="wordmark__r">&reg;</sup></p>' +
        '</section>' +
      '</div>' +
    '</div>';

  function lockPage(gate) {
    Array.prototype.forEach.call(document.body.children, function (el) {
      if (el !== gate && el.tagName !== 'SCRIPT') el.setAttribute('inert', '');
    });
  }

  function unlockPage() {
    Array.prototype.forEach.call(document.querySelectorAll('[inert]'), function (el) { el.removeAttribute('inert'); });
    root.classList.remove('acceso-pendiente');
  }

  function openPage(gate) {
    unlockPage();
    if (gate) {
      gate.classList.add('is-leaving');
      setTimeout(function () { gate.remove(); }, 950);
    }
  }

  function buildGate() {
    var gate = document.createElement('div');
    gate.className = 'acceso';
    gate.setAttribute('role', 'dialog');
    gate.setAttribute('aria-modal', 'true');
    gate.setAttribute('aria-labelledby', 'acceso-titulo');
    gate.innerHTML = TEMPLATE;
    document.body.appendChild(gate);
    lockPage(gate);

    var form = gate.querySelector('form');
    var button = gate.querySelector('button[type=submit]');
    var front = gate.querySelector('.acceso__front');
    var back = gate.querySelector('.acceso__back');
    var message = gate.querySelector('.acceso__message');
    var skip = gate.querySelector('.acceso__skip');
    var busy = false;

    setTimeout(function () { form.email.focus({ preventScroll: true }); }, 400);

    function flip(text, then) {
      front.setAttribute('aria-hidden', 'true');
      front.setAttribute('inert', '');
      back.removeAttribute('aria-hidden');
      message.textContent = text;
      gate.classList.add('is-flipped');
      setTimeout(then, (CFG.messageMs || 3200) + 1100);   // flip time + reading time
    }

    skip.addEventListener('click', function () {
      if (busy) return;
      busy = true;
      if (window.casaMedir) window.casaMedir('casa_acceso', { paso: 'omitir' });
      window.location.assign(CFG.redirectOnSkip || 'visitante.html');
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (busy) return;
      var email = form.email.value.trim();
      var password = form.password.value;
      if (!email || !password) { (email ? form.password : form.email).focus(); return; }

      busy = true;
      button.disabled = true;
      button.textContent = 'Verificando…';

      signIn(email, password).then(function () {
        form.password.value = '';
        if (window.casaMedir) window.casaMedir('casa_acceso', { paso: 'exito' });
        flip(MSG_OK, function () { openPage(gate); });
      }).catch(function () {
        form.password.value = '';
        if (window.casaMedir) window.casaMedir('casa_acceso', { paso: 'error' });
        flip(MSG_ERROR, function () { window.location.replace(CFG.redirectOnError || 'brands/fiel/'); });
      });
    });

    back.setAttribute('aria-hidden', 'true');
  }

  function start() {
    existingSession().then(function (session) {
      if (session) openPage(null); else buildGate();
    });
  }

  // «Iniciar sesión» in the site menu links to index.html#acceso: already on the open home page, show the card again.
  window.addEventListener('hashchange', function () {
    if (location.hash === '#acceso' && !document.querySelector('.acceso')) buildGate();
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
