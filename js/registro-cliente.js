/* Casa Siego — registro-cliente.js (v1.0.0) · /registro/
   Registro de clientes POR el personal (representante o admin_cliente). No hay registro público ni botón que lleve aquí.
   1. Sesión: la misma que abre el avatar de la barra superior (index.html#acceso, js/acceso.js; clave sb-<ref>-auth-token).
   2. Sin sesión → pide entrar con el avatar. Con sesión pero sin rol de personal (public.soy_personal) → sin permiso.
   3. Envío → Edge Function registrar-cliente (invita por correo + perfil, contacto, medidas y avisos en una transacción).
   Supabase sin configurar (js/supabase-config.js vacío) → el formulario se ve en modo demostración y no envía nada. */
(function () {
  'use strict';

  var CFG = window.CASASIEGO_ACCESO || {};
  var configured = Boolean(CFG.supabaseUrl && CFG.publishableKey);
  var form = document.getElementById('rc-form');
  var aviso = document.getElementById('rc-aviso');
  var errorBox = document.getElementById('rc-error');
  var client = null;

  var NUMEROS = ['estatura_cm', 'peso_kg', 'cuello', 'pecho', 'largo_manga', 'cintura', 'cadera', 'hombros', 'biceps', 'muneca',
    'largo_camisa', 'largo_saco', 'cintura_pantalon', 'tiro', 'entrepierna', 'muslo', 'bajo_pantalon'];
  var OPCIONES = ['lugar', 'hombros_forma', 'postura', 'abdomen', 'ajuste', 'cuello_preferido', 'manga_preferida', 'puno'];

  function decir(texto) { aviso.textContent = texto; }
  function error(texto) { errorBox.textContent = texto; errorBox.hidden = !texto; }

  function cargar(src) {
    return new Promise(function (ok, mal) {
      var s = document.createElement('script');
      s.src = src; s.async = true; s.crossOrigin = 'anonymous';
      s.onload = ok; s.onerror = function () { mal(new Error('No se pudo cargar supabase-js')); };
      document.head.appendChild(s);
    });
  }

  // El teléfono se guarda en E.164: +52 55 1234 5678 → +525512345678
  function e164(v) { var d = String(v || '').replace(/[^\d+]/g, ''); return d ? (d[0] === '+' ? d : '+' + d) : ''; }

  function datos() {
    var f = form.elements, m = {};
    NUMEROS.forEach(function (k) { if (f[k].value !== '') m[k] = Number(f[k].value); });
    OPCIONES.forEach(function (k) { if (f[k].value) m[k] = f[k].value; });
    if (f.notas_medidas.value.trim()) m.notas = f.notas_medidas.value.trim();
    return {
      nombre: f.nombre.value.trim(), apellidos: f.apellidos.value.trim(), email: f.email.value.trim(),
      telefono: e164(f.telefono.value), fecha_nacimiento: f.fecha_nacimiento.value, ciudad: f.ciudad.value.trim(),
      pais: f.pais.value, contacto_preferido: f.contacto_preferido.value, marca: f.marca.value, notas: f.notas.value.trim(),
      medidas: m,
      consentimientos: { privacidad: f.privacidad.checked, terminos: f.terminos.checked, marketing: f.marketing.checked }
    };
  }

  function validar() {
    var primero = null;
    Array.prototype.forEach.call(form.querySelectorAll('input, select, textarea'), function (el) {
      var ok = el.checkValidity();
      el.setAttribute('aria-invalid', ok ? 'false' : 'true');
      if (!ok && !primero) primero = el;
    });
    var tel = form.elements.telefono.value;
    if (tel && !/^\+[1-9]\d{7,14}$/.test(e164(tel))) {
      form.elements.telefono.setAttribute('aria-invalid', 'true');
      primero = primero || form.elements.telefono;
    }
    if (primero) { primero.focus(); error('Revisa los campos marcados: faltan datos o están fuera de rango.'); return false; }
    return true;
  }

  function enviar(e) {
    e.preventDefault();
    error('');
    if (!validar()) return;
    var p = datos();
    if (!configured) { decir('Modo demostración: Supabase sin configurar (.env → python3 tools/env-a-config.py). No se envió nada.'); return; }
    var boton = form.querySelector('button[type="submit"]');
    boton.disabled = true;
    client.auth.getSession().then(function (r) {
      var s = r.data && r.data.session;
      if (!s) throw new Error('Tu sesión expiró: vuelve a entrar con el avatar de la barra superior.');
      return fetch(CFG.supabaseUrl + '/functions/v1/registrar-cliente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: CFG.publishableKey, Authorization: 'Bearer ' + s.access_token },
        body: JSON.stringify(p)
      });
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (j) {
        if (!res.ok) throw new Error(j.error || 'No se pudo registrar al cliente.');
        form.reset();
        Array.prototype.forEach.call(form.querySelectorAll('[aria-invalid]'), function (el) { el.removeAttribute('aria-invalid'); });
        decir('Listo: ' + p.email + ' recibirá un correo de Casa Siego para elegir su contraseña. Sus medidas quedaron guardadas.');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }).catch(function (err) {
      console.error('[casasiego] registro:', err);
      error(err.message || 'No se pudo registrar al cliente.');
    }).then(function () { boton.disabled = false; });
  }

  form.addEventListener('submit', enviar);

  if (!configured) {
    decir('Modo demostración: Supabase sin configurar. El formulario no envía nada.');
    form.hidden = false;
    return;
  }

  cargar(CFG.supabaseJs).then(function () {
    client = window.supabase.createClient(CFG.supabaseUrl, CFG.publishableKey, {
      auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
    });
    return client.auth.getUser();                      // valida el token con Supabase (no solo lo guardado)
  }).then(function (r) {
    if (!r.data || !r.data.user) {
      decir('Solo personal de Casa Siego. Entra con el avatar de la barra superior y vuelve a esta página.');
      return;
    }
    return client.rpc('soy_personal').then(function (q) {
      if (q.error || q.data !== true) {
        decir('Tu cuenta no tiene permiso para registrar clientes. Pide el rol de representante a la Casa.');
        return;
      }
      decir('');
      form.hidden = false;
    });
  }).catch(function (err) {
    console.error('[casasiego] registro:', err);
    decir('No se pudo comprobar tu sesión. Revisa tu conexión y recarga la página.');
  });
})();
