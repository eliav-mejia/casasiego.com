/* Casa Siego — registro.js (Variante D · registro e inicio de sesión)
   The page is a letter to the House; its fields live in a drop-down form (<details>) inside the sheet.
   Two letters share the sheet:
     · «Carta de presentación» (sign-up): name, country, language, e-mail, brand attributes, consents.
     · «Carta de regreso» (sign-in): e-mail only, or a social account.
   Ways in: e-mail with a 6-digit code (P. D.), Google, Facebook, Apple, Microsoft (Supabase provider «azure»).
   Hybrid model: identity, consents and provider go to typed columns through public.completar_registro();
   brand / campaign fields (?marca=fiel&campana=…) go to profiles.atributos (jsonb), validated by the database.
   Access attempts are reported to the edge Worker (D1), which adds hashed IP/UA and forwards them to Supabase.
   Without Supabase configured the letter works as a labelled demo (code 000000) and nothing is sent. */
(function () {
  'use strict';

  var CFG = window.CASASIEGO_REGISTRO || {};
  var configured = Boolean(CFG.supabaseUrl && CFG.publishableKey);
  var MSG_OK = 'Encantados de volvernos a encontrar';
  var MSG_NUEVO = 'Bienvenido a la Casa';
  var DRAFT_KEY = 'casasiego.carta';
  var PROVEEDORES = { google: 'Google', facebook: 'Facebook', apple: 'Apple', azure: 'Microsoft' };
  var MARCAS = ['casa', 'fiel', 'justo'];
  var VALORES = { retrato: 'el retrato', sastreria: 'la sastrería', mascotas: 'mis mascotas', perro: 'perro', gato: 'gato',
                  otro: 'otro', boda: 'una boda', trabajo: 'el trabajo', gala: 'una gala', diario: 'el día a día' };
  var TEXTO_AVISO = {
    privacidad: ['He leído el ', 'aviso de privacidad', ' y lo acepto'],
    terminos: ['Acepto los ', 'términos de la Casa', ''],
    marketing: ['Deseo recibir sus novedades por correo', '', ''],
    cookies_analitica: ['Permito la ', 'analítica de visitas', '']
  };

  var $ = function (sel) { return document.querySelector(sel); };
  var form = $('#formulario');
  var nota = $('#nota');
  var enviar = $('#enviar');
  var enviarTexto = $('#enviar-texto');
  var posdata = $('#posdata');

  var params = new URLSearchParams(location.search);
  var slug = function (v) { return /^[a-z0-9-]{1,40}$/.test(v || '') ? v : ''; };
  var marca = MARCAS.indexOf(params.get('marca')) >= 0 ? params.get('marca') : 'casa';
  var campana = slug(params.get('campana'));

  var state = { modo: params.get('modo') === 'acceso' ? 'acceso' : 'registro', etapa: 'carta', email: '',
                avisos: [], campos: [], sesion: null, busy: false, captcha: '' };
  var clientPromise = null;

  // --- storage (sessionStorage may be blocked) -------------------------------
  function readDraft() {
    try {
      var d = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || 'null');
      return d && Date.now() - d.ts < 3600000 ? d : null;
    } catch (e) { return null; }
  }
  function writeDraft(extra) {
    var d = collect();
    d.ts = Date.now();
    for (var k in extra) d[k] = extra[k];
    try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(d)); } catch (e) { /* draft is a convenience */ }
  }
  function clearDraft() { try { sessionStorage.removeItem(DRAFT_KEY); } catch (e) { /* ignore */ } }

  // --- Supabase ----------------------------------------------------------------
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
  function call(fn) {
    return withTimeout(getClient().then(fn)).then(function (res) {
      if (res && res.error) throw res.error;
      return res ? res.data : null;
    });
  }

  // --- edge log (Worker + D1): fire and forget ---------------------------------
  function bitacora(evento, extra) {
    // Same step to Google Tag Manager (js/medicion.js): only the step and the provider, never the e-mail.
    if (window.casaMedir) window.casaMedir('casa_registro', { paso: evento, proveedor: (extra && extra.proveedor) || '', modo: state.modo });
    if (!CFG.bitacoraBorde || !configured) return;
    var body = { evento: evento };
    for (var k in extra) body[k] = extra[k];
    var headers = { 'Content-Type': 'application/json' };
    if (state.sesion) headers.Authorization = 'Bearer ' + state.sesion.access_token;
    try {
      fetch(CFG.bitacoraBorde, { method: 'POST', keepalive: true, credentials: 'same-origin', headers: headers,
                                 body: JSON.stringify(body) }).catch(function () {});
    } catch (e) { /* never block the letter */ }
  }

  // --- letter: hand and typewriter ---------------------------------------------
  function escribirFecha() {
    var hoy = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
    $('#fecha').textContent = 'Ciudad de México, a ' + hoy.replace(/ de (\d{4})$/, ' de $1');
  }

  function ajustar(input) {
    if (input.tagName !== 'INPUT' || input.type === 'date' || input.type === 'checkbox') return;
    var min = Number(input.getAttribute('data-min')) || 8;
    input.size = Math.max(min, (input.value || '').length + 1);
  }

  function teclear(e) {
    var t = e.target;
    if (!t.classList || !t.classList.contains('t')) return;
    t.classList.remove('golpe');
    void t.offsetWidth;                       // restart the strike animation
    t.classList.add('golpe');
    t.removeAttribute('aria-invalid');
    ajustar(t);
    if (t.name === 'nombre') firmar();
  }

  function firmar() {
    var n = form.nombre.value.trim();
    $('#firma').textContent = n || ' ';
  }

  function etiquetaValor(v) { return VALORES[v] || String(v).replace(/_/g, ' '); }

  function campoHTML(c) {
    var name = 'a_' + c.clave;
    var aria = '';
    if (c.tipo === 'opcion' || c.tipo === 'booleano') {
      var ops = c.tipo === 'booleano' ? ['true', 'false'] : c.opciones || [];
      return '<select class="t" name="' + name + '"' + aria + '><option value="">—</option>' +
        ops.map(function (o) {
          var label = c.tipo === 'booleano' ? (o === 'true' ? 'sí' : 'no') : etiquetaValor(o);
          return '<option value="' + o + '">' + label + '</option>';
        }).join('') + '</select>';
    }
    var type = c.tipo === 'fecha' ? 'date' : c.tipo === 'numero' ? 'number' : 'text';
    return '<input class="t" type="' + type + '" name="' + name + '" maxlength="' + (c.max_largo || 80) + '" data-min="10"' + aria + '>';
  }

  function pintarAtributos() {
    var box = $('#atributos');
    if (!state.campos.length) { box.innerHTML = ''; box.setAttribute('data-vacio', ''); return; }
    box.removeAttribute('data-vacio');
    box.innerHTML = state.campos.map(function (c) {
      var etiqueta = c.etiqueta.replace(/[<>&"]/g, '');
      return '<label class="campo"><span class="campo__etiqueta">' + etiqueta.charAt(0).toUpperCase() + etiqueta.slice(1) +
        '</span>' + campoHTML(c) + '</label>';
    }).join('');
    Array.prototype.forEach.call(box.querySelectorAll('input.t'), ajustar);
  }

  function pintarConsentimientos() {
    var fs = $('#consentimientos');
    Array.prototype.forEach.call(fs.querySelectorAll('.consentimiento'), function (el) { el.remove(); });
    state.avisos.forEach(function (a) {
      var txt = TEXTO_AVISO[a.tipo] || [a.tipo, '', ''];
      var label = document.createElement('label');
      label.className = 'consentimiento';
      var input = document.createElement('input');
      input.type = 'checkbox';
      input.name = 'c_' + a.tipo;
      input.setAttribute('data-version', a.version);
      if (a.obligatorio) input.required = true;
      var span = document.createElement('span');
      span.appendChild(document.createTextNode(txt[0]));
      if (txt[1]) {
        var link = document.createElement('a');
        link.href = a.url; link.target = '_blank'; link.rel = 'noopener';
        link.textContent = txt[1];
        span.appendChild(link);
      }
      span.appendChild(document.createTextNode(txt[2] + ' '));
      var v = document.createElement('span');
      v.className = 'version'; v.textContent = '(v. ' + a.version + ')';
      span.appendChild(v);
      if (!a.obligatorio) {
        var o = document.createElement('span');
        o.className = 'opcional'; o.textContent = ' — opcional';
        span.appendChild(o);
      }
      label.appendChild(input);
      label.appendChild(span);
      fs.appendChild(label);
    });
  }

  function setModo(modo) {
    state.modo = modo;
    Array.prototype.forEach.call(document.querySelectorAll('[data-solo]'), function (el) {
      el.hidden = el.getAttribute('data-solo') !== modo || (el.id === 'atributos' && el.hasAttribute('data-vacio'));
    });
    Array.prototype.forEach.call(document.querySelectorAll('.sobre'), function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-modo') === modo));
    });
    enviarTexto.textContent = 'Sellar y entrar';
    $('#desplegable-texto').textContent = modo === 'acceso' ? 'Formulario de acceso' : 'Formulario de registro';
    form.email.setAttribute('autocomplete', modo === 'acceso' ? 'username' : 'email');
    setEtapa('carta');
    setNota('');
  }

  function setEtapa(etapa) {
    state.etapa = etapa;
    posdata.hidden = etapa !== 'codigo';
    form.email.readOnly = etapa === 'codigo';
    if (etapa === 'codigo') { form.codigo.value = ''; ajustar(form.codigo); setTimeout(function () { form.codigo.focus(); }, 60); }
  }

  function setNota(texto, tranquila) {
    nota.textContent = texto;
    nota.classList.toggle('es-tranquila', Boolean(tranquila));
  }

  function setBusy(b) {
    state.busy = b;
    enviar.disabled = b;
    Array.prototype.forEach.call(document.querySelectorAll('.social'), function (s) { s.disabled = b; });
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

  // --- data from the letter ------------------------------------------------------
  function collect() {
    var atributos = {};
    state.campos.forEach(function (c) {
      var el = form.elements['a_' + c.clave];
      if (!el || el.value === '') return;
      atributos[c.clave] = c.tipo === 'numero' ? Number(el.value) : c.tipo === 'booleano' ? el.value === 'true' : el.value;
    });
    return {
      modo: state.modo, marca: marca, campana: campana,
      nombre: form.nombre.value.trim(), pais: form.pais.value, idioma: form.idioma.value,
      atributos: atributos,
      consentimientos: state.avisos.map(function (a) {
        var el = form.elements['c_' + a.tipo];
        return { tipo: a.tipo, version: a.version, otorgado: Boolean(el && el.checked) };
      })
    };
  }

  function restore(d) {
    if (!d) return;
    if (d.nombre) form.nombre.value = d.nombre;
    if (d.pais !== undefined) form.pais.value = d.pais;
    if (d.idioma) form.idioma.value = d.idioma;
    Object.keys(d.atributos || {}).forEach(function (k) {
      var el = form.elements['a_' + k];
      if (el) el.value = String(d.atributos[k]);
    });
    (d.consentimientos || []).forEach(function (c) {
      var el = form.elements['c_' + c.tipo];
      if (el && el.getAttribute('data-version') === c.version) el.checked = c.otorgado;
    });
    Array.prototype.forEach.call(form.querySelectorAll('input.t'), ajustar);
    firmar();
  }

  function marcar(el, msg) {
    if (el) {
      var caja = el.closest('details');
      if (caja) caja.open = true;
      el.setAttribute('aria-invalid', 'true');
      el.focus();
    }
    setNota(msg);
    return false;
  }

  function validEmail() {
    var e = form.email.value.trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) && e.length <= 254 ? e : '';
  }

  // Requirements before an account may exist: mandatory consents, required brand fields, and a name if asked.
  function validarRegistro(conNombre) {
    var d = collect();
    if (conNombre && d.nombre.length < 2) return marcar(form.nombre, 'Falta firmar con su nombre.');
    for (var i = 0; i < state.campos.length; i++) {
      var c = state.campos[i];
      if (c.obligatorio && d.atributos[c.clave] === undefined) {
        return marcar(form.elements['a_' + c.clave], 'Falta contarnos ' + c.etiqueta + '.');
      }
    }
    for (var j = 0; j < state.avisos.length; j++) {
      var a = state.avisos[j];
      if (a.obligatorio && !d.consentimientos[j].otorgado) {
        return marcar(form.elements['c_' + a.tipo], 'Para presentarse ante la Casa hace falta aceptar ' +
          (TEXTO_AVISO[a.tipo] && TEXTO_AVISO[a.tipo][1] ? (a.tipo === 'terminos' ? 'los ' : 'el ') + TEXTO_AVISO[a.tipo][1] : a.tipo) + '.');
      }
    }
    return d;
  }

  // --- session finished (OTP or OAuth) ----------------------------------------------
  function proveedorDe(sesion) {
    var p = sesion && sesion.user && sesion.user.app_metadata && sesion.user.app_metadata.provider;
    return PROVEEDORES[p] || p === 'email' ? p : null;
  }

  function terminar(sesion) {
    state.sesion = sesion;
    var proveedor = proveedorDe(sesion);
    return call(function (c) {
      return c.from('profiles').select('registro_completo, nombre').eq('id', sesion.user.id).maybeSingle();
    }).then(function (perfil) {
      if (perfil && perfil.registro_completo) {
        bitacora(proveedor === 'email' ? 'login_ok' : 'oauth_ok', { proveedor: proveedor });
        clearDraft();
        responder(MSG_OK, CFG.redirectOnSuccess || 'index.html');
        return;
      }
      // New account (or a social sign-in that never wrote its letter): finish the letter with the draft.
      var d = readDraft();
      var meta = sesion.user.user_metadata || {};
      if (d && d.modo === 'registro') restore(d);
      if (!form.nombre.value.trim()) form.nombre.value = String(meta.full_name || meta.name || '').slice(0, 120);
      firmar();
      Array.prototype.forEach.call(form.querySelectorAll('input.t'), ajustar);
      if (sesion.user.email) { form.email.value = sesion.user.email; ajustar(form.email); }
      if (state.modo !== 'registro') setModo('registro');
      form.email.readOnly = true;
      $('#desplegable').open = true;
      var listo = validarRegistro(true);
      if (!listo) {
        setNota('Ya le reconocemos por ' + (PROVEEDORES[proveedor] || 'su correo') +
                '. Termine su carta de presentación y séllela para entrar.', true);
        return;
      }
      return completar(listo, proveedor);
    });
  }

  function completar(d, proveedor) {
    setBusy(true);
    return call(function (c) {
      return c.rpc('completar_registro', {
        p_nombre: d.nombre, p_idioma: d.idioma, p_pais: d.pais, p_marca: d.marca, p_campana: d.campana,
        p_atributos: d.atributos, p_consentimientos: d.consentimientos
      });
    }).then(function () {
      clearDraft();
      if (window.casaMedir) window.casaMedir('casa_registro', { paso: 'registro_completo', proveedor: proveedor || '', modo: 'registro' });
      bitacora(proveedor === 'email' ? 'login_ok' : 'oauth_ok', { proveedor: proveedor });
      return call(function (c) { return c.auth.refreshSession(); }).catch(function () {}); // new claim registro_completo
    }).then(function () {
      responder(MSG_NUEVO, CFG.redirectOnSuccess || 'index.html');
    }).catch(function (err) {
      setBusy(false);
      var m = String((err && err.message) || '');
      setNota(/atributo|opción|fecha|tipo/.test(m) ? 'Algo de lo que nos cuenta no lo pudimos leer: revise los datos de la carta.'
            : /aceptar|aviso/.test(m) ? 'Los avisos cambiaron mientras escribía. Recargue la página y vuelva a marcarlos.'
            : 'No pudimos guardar su carta. Intente de nuevo en un momento.');
    });
  }

  // --- e-mail with code ----------------------------------------------------------------
  function pedirCodigo(email) {
    var opciones = { shouldCreateUser: state.modo === 'registro' };
    if (state.captcha) opciones.captchaToken = state.captcha;
    return call(function (c) { return c.auth.signInWithOtp({ email: email, options: opciones }); })
      .then(function () { bitacora('otp_enviado', { proveedor: 'email' }); })
      .catch(function (err) {
        // Sign-in for an unknown address: same answer as success (no account enumeration).
        if (state.modo === 'acceso' && /signup|not allowed|not found/i.test(String(err && err.message))) return;
        throw err;
      })
      .then(function () { resetCaptcha(); });
  }

  function onSubmit(e) {
    e.preventDefault();
    if (state.busy) return;
    setNota('');

    // Signed in but the letter is unfinished: just complete it.
    if (state.sesion) {
      var d0 = validarRegistro(true);
      if (d0) completar(d0, proveedorDe(state.sesion));
      return;
    }

    if (state.etapa === 'codigo') return verificar();

    var email = validEmail();
    if (!email) return marcar(form.email, 'La dirección de correo no parece completa.');
    if (state.modo === 'registro' && !validarRegistro(true)) return;
    if (CFG.turnstileSiteKey && !state.captcha) return setNota('Un momento: la Casa confirma que la carta la escribe una persona.');

    state.email = email;
    writeDraft({ pendiente: 'email' });
    setBusy(true);
    enviarTexto.textContent = 'Enviando…';

    if (!configured) {
      setBusy(false);
      setEtapa('codigo');
      enviarTexto.textContent = 'Sellar con el código';
      setNota('Demostración: la Casa aún no envía correos. Escriba 000000 para ver la respuesta.', true);
      return;
    }

    pedirCodigo(email).then(function () {
      setBusy(false);
      setEtapa('codigo');
      enviarTexto.textContent = 'Sellar con el código';
      setNota(state.modo === 'acceso'
        ? 'Si su correo está en nuestros registros, recibirá un código de 6 dígitos en unos instantes.'
        : 'Le enviamos un código de 6 dígitos. Escríbalo en la posdata.', true);
    }).catch(function () {
      setBusy(false);
      enviarTexto.textContent = 'Sellar y entrar';
      setNota('No pudimos enviar el código. Espere un minuto e intente de nuevo.');
    });
  }

  function verificar() {
    var codigo = form.codigo.value.replace(/\D/g, '');
    if (codigo.length !== 6) return marcar(form.codigo, 'El código tiene 6 dígitos.');
    setBusy(true);

    if (!configured) {
      setBusy(false);
      if (codigo !== '000000') return marcar(form.codigo, 'El código no coincide (en la demostración es 000000).');
      clearDraft();
      responder(state.modo === 'acceso' ? MSG_OK : MSG_NUEVO, null);
      return;
    }

    call(function (c) { return c.auth.verifyOtp({ email: state.email, token: codigo, type: 'email' }); })
      .then(function (data) {
        if (!data || !data.session) throw new Error('Sin sesión');
        setBusy(false);
        return terminar(data.session);
      })
      .catch(function () {
        setBusy(false);
        bitacora('otp_fallido', { proveedor: 'email', resultado: 'denegado' });
        marcar(form.codigo, 'El código no coincide o ya venció. Puede pedir otro.');
      });
  }

  // --- social accounts ---------------------------------------------------------------------
  function onSocial(e) {
    var btn = e.target.closest('.social');
    if (!btn || state.busy) return;
    var proveedor = btn.getAttribute('data-proveedor');
    setNota('');
    if (state.modo === 'registro' && !validarRegistro(false)) return;

    writeDraft({ pendiente: proveedor });
    if (!configured) {
      setNota('Demostración: la Casa aún no abre la entrada con ' + PROVEEDORES[proveedor] +
              '. Su carta quedó guardada en este navegador.', true);
      return;
    }
    setBusy(true);
    bitacora('oauth_iniciado', { proveedor: proveedor });
    var back = location.origin + location.pathname + '?' + new URLSearchParams(
      { modo: state.modo, marca: marca, campana: campana }).toString();
    call(function (c) {
      return c.auth.signInWithOAuth({
        provider: proveedor,
        options: { redirectTo: back, scopes: proveedor === 'azure' ? 'email' : undefined }
      });
    }).catch(function () {
      setBusy(false);
      bitacora('oauth_fallido', { proveedor: proveedor, resultado: 'error' });
      setNota('No pudimos abrir la entrada con ' + PROVEEDORES[proveedor] + '. Intente de nuevo.');
    });
  }

  // --- Turnstile (optional) ---------------------------------------------------------------
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
    }).catch(function () { /* Supabase will refuse without a token; the note explains */ });
  }
  function resetCaptcha() {
    state.captcha = '';
    if (window.turnstile && CFG.turnstileSiteKey) window.turnstile.reset($('#turnstile'));
  }

  // --- start -------------------------------------------------------------------------------
  function formulario() {
    var fallback = { avisos: CFG.avisos || [], campos: (CFG.campos || {})[marca] || [] };
    if (!configured) return Promise.resolve(fallback);
    return call(function (c) { return c.rpc('formulario_registro', { p_marca: marca, p_campana: campana }); })
      .then(function (d) { return d && d.avisos ? d : fallback; })
      .catch(function () { return fallback; });
  }

  function limpiarURL() {
    var keep = new URLSearchParams();
    ['modo', 'marca', 'campana'].forEach(function (k) { if (params.get(k)) keep.set(k, params.get(k)); });
    var q = keep.toString();
    history.replaceState(null, '', location.pathname + (q ? '?' + q : ''));
  }

  function start() {
    escribirFecha();
    form.addEventListener('input', teclear);
    form.addEventListener('submit', onSubmit);
    $('.sociales').addEventListener('click', onSocial);
    $('#reenviar').addEventListener('click', function () {
      if (state.busy || !state.email) return;
      if (!configured) return setNota('Demostración: el código es 000000.', true);
      pedirCodigo(state.email).then(function () { setNota('Le enviamos un código nuevo.', true); })
        .catch(function () { setNota('Espere un minuto antes de pedir otro código.'); });
    });
    Array.prototype.forEach.call(document.querySelectorAll('.sobre'), function (b) {
      b.addEventListener('click', function () { if (!state.busy && !state.sesion) setModo(b.getAttribute('data-modo')); });
    });
    Array.prototype.forEach.call(form.querySelectorAll('input.t'), ajustar);

    var oauthError = params.get('error_description') || params.get('error');
    formulario().then(function (f) {
      state.avisos = f.avisos || [];
      state.campos = f.campos || [];
      pintarAtributos();
      pintarConsentimientos();
      var d = readDraft();
      if (d && d.marca === marca) { restore(d); $('#desplegable').open = true; }
      setModo(d && d.pendiente && d.modo ? d.modo : state.modo);
      iniciarCaptcha();

      if (oauthError) {
        var p = d && d.pendiente;
        bitacora('oauth_fallido', { proveedor: PROVEEDORES[p] ? p : null, resultado: 'denegado' });
        setNota('La entrada con ' + (PROVEEDORES[p] || 'su cuenta') + ' no se completó. Puede intentarlo de nuevo o usar su correo.');
        limpiarURL();
        return;
      }
      if (!configured) return;
      // Returning from Google / Facebook / Apple / Microsoft (PKCE code in the URL) or an existing session.
      return call(function (c) { return c.auth.getSession(); }).then(function (data) {
        limpiarURL();
        if (data && data.session) return terminar(data.session);
      });
    }).catch(function () {
      setNota('No pudimos abrir el registro en este momento. Intente de nuevo en unos minutos.');
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
