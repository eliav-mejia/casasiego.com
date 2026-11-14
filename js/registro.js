/* Casa Siego — registro.js 3.1.0 (crear cuenta o iniciar sesión · registro.html, v1.4.0 · v1.4.2 «volver»)
   Simplified: one card, two tabs.
     Crear cuenta   → name, e-mail, password, one box for the mandatory notices (+ optional news) → supabase.auth.signUp
     Iniciar sesión → e-mail and password → supabase.auth.signInWithPassword
     Either tab     → Google, Microsoft («azure»), LinkedIn («linkedin_oidc») or Facebook → signInWithOAuth (PKCE)
   With a session, public.completar_registro() closes the profile (once) and the visitor goes to the main index
   (CFG.redirectOnSuccess = index.html?bienvenida=1), where js/medidas.js asks for the current measurements.
   v1.4.2: ?volver=<ruta> (js/solo-miembros.js: Equipo, Eventos) sends the member back there instead. Only paths in
   CFG.destinosVolver are accepted (no open redirect); the value survives the OAuth trip and the e-mail link.

   Security (front end; the real enforcement is Supabase Auth + RLS + typed RPCs, see migrations 0001, 0005, 0006):
   - No SQL is ever built here. supabase-js sends JSON to PostgREST / GoTrue, which pass values as typed parameters.
   - Same password rule as config.toml (12+, upper, lower, digit), checked before sending; Auth checks it again.
   - Passwords are never stored (not in the draft, not in logs, not in GTM) and the field is cleared after each try.
   - No account enumeration: sign-up always answers «check your e-mail»; failed sign-in is always the same message.
   - PKCE flow; tokens and codes are removed from the address bar. Turnstile token sent when a site key is set.
   - Everything shown to the visitor goes through textContent, never innerHTML with their data.
   Without Supabase configured the card works as a labelled demo and nothing is sent. */
(function () {
  'use strict';

  var CFG = window.CASASIEGO_REGISTRO || {};
  var configured = Boolean(CFG.supabaseUrl && CFG.publishableKey);
  var MSG_OK = 'Encantados de volvernos a encontrar';
  var MSG_NUEVO = 'Bienvenido a la Casa';
  var DRAFT_KEY = 'casasiego.registro';
  var DRAFT_MS = 3600000;                     // = otp_expiry of the confirmation link
  var PROVEEDORES = { google: 'Google', azure: 'Microsoft', linkedin_oidc: 'LinkedIn', facebook: 'Facebook' };
  var MARCAS = ['casa', 'fiel', 'justo'];
  var REGLA = new RegExp(CFG.reglaContrasena || '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{8,72}$');
  var EMAIL = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]{2,}$/;

  var $ = function (sel) { return document.querySelector(sel); };
  var form = $('#formulario');
  var nota = $('#nota');
  var enviar = $('#enviar');
  var enviarTexto = $('#enviar-texto');

  var params = new URLSearchParams(location.search);
  var slug = function (v) { return /^[a-z0-9-]{1,40}$/.test(v || '') ? v : ''; };
  var marca = MARCAS.indexOf(params.get('marca')) >= 0 ? params.get('marca') : 'casa';
  var campana = slug(params.get('campana'));
  var volver = (CFG.destinosVolver || []).indexOf(params.get('volver')) >= 0 ? params.get('volver') : '';
  var destino = volver || CFG.redirectOnSuccess || 'index.html';
  var extra = function (o) { if (volver) o.volver = volver; return o; };

  var state = { modo: params.get('modo') === 'acceso' ? 'acceso' : 'registro', avisos: CFG.avisos || [],
                sesion: null, completando: false, busy: false, captcha: '' };
  var clientPromise = null;

  // --- draft: survives the trip to the provider or to the e-mail link. Never the password. ----------
  function readDraft() {
    try {
      var d = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
      return d && Date.now() - d.ts < DRAFT_MS ? d : null;
    } catch (e) { return null; }
  }
  function writeDraft() {
    var d = { nombre: form.nombre.value.trim().slice(0, 120), acepto: form.acepto.checked,
              novedades: form.novedades.checked, marca: marca, campana: campana, ts: Date.now() };
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(d)); } catch (e) { /* convenience only */ }
  }
  function clearDraft() { try { localStorage.removeItem(DRAFT_KEY); } catch (e) { /* ignore */ } }

  // --- Supabase --------------------------------------------------------------------------------
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
          auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
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
  // Runs a supabase-js call and returns data, or throws the Supabase error (with .status / .code).
  function call(fn) {
    return withTimeout(getClient().then(fn)).then(function (res) {
      if (res && res.error) throw res.error;
      return res ? res.data : null;
    });
  }

  // --- edge log (Worker + D1) and GTM: step and provider only, never the e-mail or the password ------
  function bitacora(evento, extra) {
    extra = extra || {};
    if (window.casaMedir) window.casaMedir('casa_registro', { paso: evento, proveedor: extra.proveedor || '', modo: state.modo });
    if (!CFG.bitacoraBorde || !configured) return;
    var body = { evento: evento };
    for (var k in extra) body[k] = extra[k];
    var headers = { 'Content-Type': 'application/json' };
    if (state.sesion) headers.Authorization = 'Bearer ' + state.sesion.access_token;
    try {
      fetch(CFG.bitacoraBorde, { method: 'POST', keepalive: true, credentials: 'same-origin', headers: headers,
                                 body: JSON.stringify(body) }).catch(function () {});
    } catch (e) { /* never block the card */ }
  }

  // --- UI ----------------------------------------------------------------------------------------
  function setNota(texto, tranquila) {
    nota.textContent = texto;
    nota.classList.toggle('es-tranquila', Boolean(tranquila));
  }
  function textoBoton() {
    return state.completando ? 'Completar registro' : state.modo === 'acceso' ? 'Entrar' : 'Crear cuenta';
  }
  function setBusy(b, texto) {
    state.busy = b;
    enviar.disabled = b;
    enviarTexto.textContent = texto || textoBoton();
    Array.prototype.forEach.call(document.querySelectorAll('.social, .pestana'), function (el) { el.disabled = b; });
  }
  function marcar(el, msg) {
    if (el) { el.setAttribute('aria-invalid', 'true'); el.focus(); }
    setNota(msg);
    return false;
  }

  function setModo(modo) {
    state.modo = modo;
    Array.prototype.forEach.call(document.querySelectorAll('[data-solo]'), function (el) {
      el.hidden = el.getAttribute('data-solo') !== modo;
    });
    Array.prototype.forEach.call(document.querySelectorAll('.pestana'), function (b) {
      var on = b.getAttribute('data-modo') === modo;
      b.setAttribute('aria-selected', String(on));
      b.tabIndex = on ? 0 : -1;
    });
    form.setAttribute('aria-labelledby', modo === 'acceso' ? 'tab-acceso' : 'tab-registro');
    form.password.setAttribute('autocomplete', modo === 'acceso' ? 'current-password' : 'new-password');
    $('[data-requiere="contrasena"]').hidden = state.completando;
    enviarTexto.textContent = textoBoton();
    $('#pie').textContent = modo === 'acceso'
      ? '¿Olvidaste tu contraseña? Escríbenos a info@casasiego.com.'
      : 'Tu cuenta te da acceso a la portada de miembros y a tus medidas.';
    setNota('');
  }

  function responder(texto, destino) {
    var r = $('#respuesta');
    $('#respuesta-texto').textContent = texto;
    r.hidden = false;
    Array.prototype.forEach.call(document.body.children, function (el) {
      if (el !== r && el.tagName !== 'SCRIPT') el.setAttribute('inert', '');
    });
    if (destino) setTimeout(function () { location.assign(destino); }, CFG.messageMs || 3200);
  }

  // Mandatory notices go with «acepto»; marketing with «novedades»; anything else optional stays false.
  function consentimientos() {
    return state.avisos.map(function (a) {
      var ok = a.obligatorio ? form.acepto.checked : a.tipo === 'marketing' ? form.novedades.checked : false;
      return { tipo: a.tipo, version: a.version, otorgado: ok };
    });
  }

  function leerEmail() {
    var e = form.email.value.trim().toLowerCase();
    return e.length <= 254 && EMAIL.test(e) ? e : '';
  }

  function errorTexto(err, modo) {
    var status = err && err.status;
    var code = String((err && (err.code || err.name)) || '');
    var msg = String((err && err.message) || '');
    if (status === 429 || /rate|too many/i.test(msg)) return 'Demasiados intentos. Espera unos minutos e intenta de nuevo.';
    if (/captcha/i.test(code + msg)) return 'No pudimos confirmar que eres una persona. Recarga la página e intenta de nuevo.';
    if (modo === 'registro' && (code === 'weak_password' || /password/i.test(msg))) {
      return 'Esa contraseña no es válida: usa 8 caracteres o más, con mayúscula, minúscula y número, y evita contraseñas comunes.';
    }
    if (modo === 'acceso' && (code === 'email_not_confirmed' || /not confirmed/i.test(msg))) {
      return 'Primero confirma tu correo con el enlace que te enviamos.';
    }
    if (modo === 'acceso') return 'Correo o contraseña incorrectos.';
    return 'No pudimos crear tu cuenta en este momento. Intenta de nuevo en unos minutos.';
  }

  // --- session: complete the profile once, then the main index ----------------------------------
  function proveedorDe(sesion) {
    var p = sesion && sesion.user && sesion.user.app_metadata && sesion.user.app_metadata.provider;
    return PROVEEDORES[p] || p === 'email' ? p : null;
  }

  function terminar(sesion) {
    state.sesion = sesion;
    var proveedor = proveedorDe(sesion);
    return call(function (c) {
      return c.from('profiles').select('registro_completo').eq('id', sesion.user.id).maybeSingle();
    }).then(function (perfil) {
      if (perfil && perfil.registro_completo) {
        clearDraft();
        bitacora(proveedor === 'email' ? 'login_ok' : 'oauth_ok', { proveedor: proveedor });
        responder(MSG_OK, destino);
        return;
      }
      // New account (e-mail confirmed, or first time with a provider): finish with the draft, or ask for what is missing.
      var d = readDraft() || {};
      var meta = sesion.user.user_metadata || {};
      state.completando = true;
      setModo('registro');
      form.email.value = sesion.user.email || '';
      form.email.readOnly = true;
      form.nombre.value = String(d.nombre || meta.nombre || meta.full_name || meta.name || '').slice(0, 120);
      form.acepto.checked = Boolean(d.acepto);
      form.novedades.checked = Boolean(d.novedades);
      if (form.nombre.value.trim().length >= 2 && form.acepto.checked) return completar(proveedor);
      setNota('Ya te reconocemos' + (PROVEEDORES[proveedor] ? ' por ' + PROVEEDORES[proveedor] : '') +
              '. Completa tu nombre y acepta los avisos para terminar.', true);
    });
  }

  function completar(proveedor) {
    var nombre = form.nombre.value.trim();
    if (nombre.length < 2) return marcar(form.nombre, 'Escribe tu nombre y apellido.');
    if (!form.acepto.checked) return marcar(form.acepto, 'Para crear tu cuenta hace falta aceptar el aviso de privacidad y los términos.');
    setBusy(true, 'Guardando…');
    return call(function (c) {
      return c.rpc('completar_registro', {
        p_nombre: nombre.slice(0, 120), p_idioma: 'es', p_pais: '', p_marca: marca, p_campana: campana,
        p_atributos: {}, p_consentimientos: consentimientos()
      });
    }).then(function () {
      clearDraft();
      bitacora('registro_ok', { proveedor: proveedor });
      return call(function (c) { return c.auth.refreshSession(); }).catch(function () {}); // claim registro_completo
    }).then(function () {
      responder(MSG_NUEVO, destino);
    }).catch(function (err) {
      var m = String((err && err.message) || '');
      setBusy(false);
      if (/ya completado/.test(m)) return responder(MSG_OK, destino);
      setNota(/aviso|aceptar/.test(m) ? 'Los avisos cambiaron hace un momento. Recarga la página y vuelve a aceptarlos.'
            : 'No pudimos guardar tu registro. Intenta de nuevo en un momento.');
    });
  }

  // --- e-mail and password -----------------------------------------------------------------------
  function onSubmit(e) {
    e.preventDefault();
    if (state.busy) return;
    setNota('');
    if (state.completando) return completar(proveedorDe(state.sesion));

    var email = leerEmail();
    var password = form.password.value;
    if (!email) return marcar(form.email, 'Revisa tu correo: parece incompleto.');

    if (state.modo === 'registro') {
      if (form.nombre.value.trim().length < 2) return marcar(form.nombre, 'Escribe tu nombre y apellido.');
      if (!REGLA.test(password)) return marcar(form.password, 'La contraseña necesita 8 caracteres o más, con mayúscula, minúscula y número.');
      if (!form.acepto.checked) return marcar(form.acepto, 'Para crear tu cuenta hace falta aceptar el aviso de privacidad y los términos.');
    } else if (!password) {
      return marcar(form.password, 'Escribe tu contraseña.');
    }
    if (CFG.turnstileSiteKey && !state.captcha) return setNota('Un momento: confirmamos que eres una persona.', true);

    if (!configured) {
      form.password.value = '';
      return setNota('Demostración: Supabase aún no está conectado, así que no se creó ni abrió ninguna cuenta.', true);
    }

    var opciones = {};
    if (state.captcha) opciones.captchaToken = state.captcha;

    if (state.modo === 'registro') {
      writeDraft();
      setBusy(true, 'Creando tu cuenta…');
      opciones.emailRedirectTo = new URL(CFG.emailRedirect || 'registro.html', location.href).href +
        '?' + new URLSearchParams(extra({ marca: marca, campana: campana })).toString();
      opciones.data = { nombre: form.nombre.value.trim().slice(0, 120) };
      call(function (c) { return c.auth.signUp({ email: email, password: password, options: opciones }); })
        .then(function (data) {
          form.password.value = '';
          resetCaptcha();
          setBusy(false);
          if (data && data.session) return terminar(data.session);    // confirmations off: already signed in
          // Same answer whether the address is new or already registered (no enumeration).
          bitacora('otp_enviado', { proveedor: 'email' });
          setNota('Te enviamos un enlace a ' + email + '. Ábrelo en este navegador para activar tu cuenta y entrar.', true);
        })
        .catch(function (err) {
          form.password.value = '';
          resetCaptcha();
          setBusy(false);
          setNota(errorTexto(err, 'registro'));
        });
      return;
    }

    setBusy(true, 'Verificando…');
    call(function (c) { return c.auth.signInWithPassword({ email: email, password: password, options: opciones }); })
      .then(function (data) {
        form.password.value = '';
        if (!data || !data.session) throw new Error('Sin sesión');
        setBusy(false);
        return terminar(data.session);
      })
      .catch(function (err) {
        form.password.value = '';
        resetCaptcha();
        setBusy(false);
        bitacora('login_fallido', { proveedor: 'email', resultado: 'denegado' });
        marcar(form.password, errorTexto(err, 'acceso'));
      });
  }

  // --- Google, Microsoft, LinkedIn, Facebook ------------------------------------------------------
  function onSocial(e) {
    var btn = e.target.closest('.social');
    if (!btn || state.busy) return;
    var proveedor = btn.getAttribute('data-proveedor');
    if (!PROVEEDORES[proveedor]) return;
    setNota('');
    if (state.modo === 'registro' && !form.acepto.checked) {
      return marcar(form.acepto, 'Para crear tu cuenta hace falta aceptar el aviso de privacidad y los términos.');
    }
    writeDraft();
    if (!configured) {
      return setNota('Demostración: Supabase aún no está conectado, así que no se abre ' + PROVEEDORES[proveedor] + '.', true);
    }
    setBusy(true);
    bitacora('oauth_iniciado', { proveedor: proveedor });
    var back = location.origin + location.pathname + '?' +
      new URLSearchParams(extra({ modo: state.modo, marca: marca, campana: campana })).toString();
    call(function (c) {
      return c.auth.signInWithOAuth({
        provider: proveedor,
        options: { redirectTo: back, scopes: proveedor === 'azure' ? 'email' : undefined }
      });
    }).catch(function () {
      setBusy(false);
      bitacora('oauth_fallido', { proveedor: proveedor, resultado: 'error' });
      setNota('No pudimos abrir ' + PROVEEDORES[proveedor] + '. Intenta de nuevo.');
    });
  }

  // --- Turnstile (when a site key is configured) ---------------------------------------------------
  function iniciarCaptcha() {
    if (!CFG.turnstileSiteKey) return;
    var box = $('#turnstile');
    box.hidden = false;
    loadScript('https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit').then(function () {
      window.turnstile.render(box, {
        sitekey: CFG.turnstileSiteKey, theme: 'light', language: 'es',
        callback: function (t) { state.captcha = t; },
        'expired-callback': function () { state.captcha = ''; }
      });
    }).catch(function () { /* Supabase refuses without a token; the error note explains */ });
  }
  function resetCaptcha() {
    state.captcha = '';
    if (window.turnstile && CFG.turnstileSiteKey) window.turnstile.reset($('#turnstile'));
  }

  // --- start ---------------------------------------------------------------------------------------
  function cargarAvisos() {
    if (!configured) return Promise.resolve();
    return call(function (c) { return c.rpc('formulario_registro', { p_marca: marca, p_campana: campana }); })
      .then(function (d) { if (d && d.avisos && d.avisos.length) state.avisos = d.avisos; })
      .catch(function () { /* fallback: CFG.avisos */ });
  }

  function limpiarURL() {
    var keep = new URLSearchParams();
    ['modo', 'marca', 'campana'].forEach(function (k) { if (slug(params.get(k))) keep.set(k, params.get(k)); });
    if (volver) keep.set('volver', volver);
    var q = keep.toString();
    history.replaceState(null, '', location.pathname + (q ? '?' + q : ''));
  }

  function confirmadoEnOtroNavegador() {
    setModo('acceso');
    setNota('Tu correo quedó confirmado. Inicia sesión con tu contraseña.', true);
  }

  function start() {
    form.addEventListener('submit', onSubmit);
    form.addEventListener('input', function (e) { if (e.target.removeAttribute) e.target.removeAttribute('aria-invalid'); });
    form.addEventListener('change', function (e) { if (e.target.removeAttribute) e.target.removeAttribute('aria-invalid'); });
    $('.sociales').addEventListener('click', onSocial);
    Array.prototype.forEach.call(document.querySelectorAll('.pestana'), function (b) {
      b.addEventListener('click', function () { if (!state.busy && !state.completando) setModo(b.getAttribute('data-modo')); });
    });
    var d = readDraft();
    if (d) { form.nombre.value = d.nombre || ''; form.acepto.checked = Boolean(d.acepto); form.novedades.checked = Boolean(d.novedades); }
    setModo(state.modo);
    if (volver && state.modo === 'acceso') setNota(volver.indexOf('cita/') === 0 ? 'Inicia sesión o crea tu cuenta para agendar tu cita.' : 'Equipo y Eventos son solo para miembros. Inicia sesión para continuar.', true);
    iniciarCaptcha();

    var oauthError = params.get('error_description') || params.get('error');
    var traeCodigo = params.has('code');
    cargarAvisos().then(function () {
      if (oauthError) {
        limpiarURL();
        bitacora('oauth_fallido', { resultado: 'denegado' });
        return setNota('No se pudo conectar tu cuenta. Intenta de nuevo o elige otra forma de entrar.');
      }
      if (!configured) return;
      // Back from a provider or from the confirmation e-mail (PKCE code in the URL), or an open session.
      return call(function (c) { return c.auth.getSession(); }).then(function (data) {
        limpiarURL();
        if (data && data.session) return terminar(data.session);
        // The link was opened in another browser (no PKCE verifier here): the e-mail is confirmed anyway.
        if (traeCodigo) confirmadoEnOtroNavegador();
      });
    }).catch(function () {
      limpiarURL();
      if (traeCodigo) return confirmadoEnOtroNavegador();
      setNota('No pudimos abrir el acceso en este momento. Intenta de nuevo en unos minutos.');
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
