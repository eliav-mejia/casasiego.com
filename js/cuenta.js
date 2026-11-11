/* Casa Siego — cuenta.js 1.0.0 (v1.4.2 · /cuenta/)
   Perfil del miembro: medidas sobre una silueta punteada, correo, teléfono, dirección y últimas transacciones.
   - Valida la sesión con Supabase (auth.getUser); sin usuario → visitante.html.
   - Lee todo con una llamada: public.mi_perfil() (0007, security invoker → RLS: solo lo propio).
   - Corrige teléfono y dirección con public.actualizar_mi_contacto() (0007): parámetros tipados, sin user id.
   - Las medidas se actualizan en la portada (index.html#medidas, js/medidas.js · historial de solo inserción).
   - Todo lo que viene de la base se escribe con textContent / .value, nunca innerHTML. */
(function () {
  'use strict';

  // [clave, etiqueta, unidad]  — mismas claves que public.medidas
  var MEDIDAS = [
    ['cuello', 'Cuello', 'cm'], ['hombros', 'Hombros', 'cm'], ['pecho', 'Pecho', 'cm'], ['cintura', 'Cintura', 'cm'],
    ['largo_manga', 'Largo de manga', 'cm'], ['muneca', 'Muñeca', 'cm'], ['largo_camisa', 'Largo de camisa', 'cm'],
    ['estatura_cm', 'Estatura', 'cm'], ['peso_kg', 'Peso', 'kg']
  ];
  var PREFERENCIAS = [
    ['ajuste', 'Ajuste', { entallado: 'Entallado', regular: 'Regular', holgado: 'Holgado' }],
    ['cuello_preferido', 'Cuello', { CR: 'Regular', CL: 'Largo en punta abierta' }],
    ['puno', 'Puño', { sencillo: 'Sencillo', doble: 'Doble', mancuernas: 'Mancuernas' }]
  ];
  var LUGAR = { domicilio: 'en tu domicilio', oficina: 'en tu oficina', casa_siego: 'en Casa Siego', remota: 'declaradas por ti' };
  var ESTADO = { confirmado: 'Confirmado', en_lote: 'En lote', en_fabrica: 'En fábrica', confeccion: 'En confección',
                 listo: 'Listo para entrega', entregado: 'Entregado' };
  var CONTACTO = { correo: 'Correo', telefono: 'Teléfono', whatsapp: 'WhatsApp' };
  var PAIS = { MX: 'México', ES: 'España' };
  var CAMPOS = ['telefono', 'calle', 'interior', 'colonia', 'codigo_postal', 'ciudad', 'estado_region', 'pais', 'contacto_preferido'];

  var $ = function (id) { return document.getElementById(id); };
  var cliente = null, perfil = null;

  function fecha(v) {
    if (!v) return '—';
    var d = new Date(String(v).length === 10 ? v + 'T12:00:00Z' : v);
    return isNaN(d) ? '—' : d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  }
  function numero(v) { return Number(v).toLocaleString('es-MX', { maximumFractionDigits: 1 }); }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  // ------------------------------------------------------------------ medidas
  function pintarMedidas(m) {
    var lista = $('medidas-lista');
    lista.textContent = '';
    Array.prototype.forEach.call(document.querySelectorAll('.silueta__guia'), function (g) { g.classList.remove('is-on'); });
    if (!m) {
      $('medidas-toma').textContent = 'Aún no tenemos tus medidas. Con cuello, pecho y largo de manga cortamos tu primera camisa.';
      $('medidas-actualizar').textContent = 'Registrar mis medidas';
    } else {
      $('medidas-toma').textContent = 'Última toma: ' + fecha(m.tomadas_en) + (LUGAR[m.lugar] ? ', ' + LUGAR[m.lugar] : '') + '.';
      $('medidas-actualizar').textContent = 'Actualizar mis medidas';
    }
    MEDIDAS.forEach(function (c) {
      var v = m && m[c[0]] != null ? numero(m[c[0]]) + ' ' + c[2] : '—';
      var fila = el('div', 'medidas-lista__fila' + (v === '—' ? ' es-vacia' : ''));
      fila.setAttribute('data-medida', c[0]);
      fila.appendChild(el('dt', null, c[1]));
      fila.appendChild(el('dd', null, v));
      lista.appendChild(fila);
      var guia = document.querySelector('.silueta__guia[data-medida="' + c[0] + '"]');
      if (guia && v !== '—') guia.classList.add('is-on');
    });
    var prefs = PREFERENCIAS.filter(function (p) { return m && m[p[0]]; });
    if (prefs.length) {
      var sub = el('div', 'medidas-lista__fila medidas-lista__pref');
      sub.appendChild(el('dt', null, 'Preferencias'));
      sub.appendChild(el('dd', null, prefs.map(function (p) { return p[1] + ' ' + (p[2][m[p[0]]] || m[p[0]]).toLowerCase(); }).join(' · ')));
      lista.appendChild(sub);
    }
  }

  // Resalta la guía de la silueta al pasar por una medida de la lista (y al revés no hace falta: la silueta es decorativa).
  function enlazarSilueta() {
    var lista = $('medidas-lista');
    function marcar(e, on) {
      var fila = e.target.closest && e.target.closest('[data-medida]');
      if (!fila) return;
      var g = document.querySelector('.silueta__guia[data-medida="' + fila.getAttribute('data-medida') + '"]');
      if (g) g.classList.toggle('is-foco', on);
    }
    lista.addEventListener('mouseover', function (e) { marcar(e, true); });
    lista.addEventListener('mouseout', function (e) { marcar(e, false); });
  }

  // ------------------------------------------------------------------ contacto
  function pintarContacto(p) {
    var c = p.contacto || {};
    $('d-correo').textContent = p.correo || '—';
    $('d-telefono').textContent = c.telefono || '—';
    var linea1 = [c.calle, c.interior].filter(Boolean).join(', ');
    var linea2 = [c.colonia, c.codigo_postal && 'C.P. ' + c.codigo_postal].filter(Boolean).join(', ');
    var linea3 = [c.ciudad, c.estado_region, PAIS[c.pais]].filter(Boolean).join(', ');
    var dir = $('d-direccion');
    dir.textContent = '';
    var lineas = [linea1, linea2, linea3].filter(Boolean);
    if (!lineas.length) dir.textContent = '—';
    lineas.forEach(function (l, i) { if (i) dir.appendChild(document.createElement('br')); dir.appendChild(document.createTextNode(l)); });
    $('d-preferido').textContent = CONTACTO[c.contacto_preferido || 'correo'];
  }

  function abrirFormulario() {
    var f = $('contacto-form'), c = (perfil && perfil.contacto) || {};
    CAMPOS.forEach(function (k) { f.elements[k].value = c[k] || (k === 'contacto_preferido' ? 'correo' : ''); });
    $('contacto-nota').textContent = '';
    f.hidden = false;
    $('contacto-datos').hidden = true;
    $('contacto-editar').parentNode.hidden = true;
    f.elements.telefono.focus();
  }
  function cerrarFormulario() {
    $('contacto-form').hidden = true;
    $('contacto-datos').hidden = false;
    $('contacto-editar').parentNode.hidden = false;
  }

  function guardarContacto(e) {
    e.preventDefault();
    var f = $('contacto-form'), nota = $('contacto-nota'), boton = $('contacto-guardar');
    if (boton.disabled) return;
    Array.prototype.forEach.call(f.elements, function (n) { if (n.removeAttribute) n.removeAttribute('aria-invalid'); });
    var v = {};
    CAMPOS.forEach(function (k) { v[k] = String(f.elements[k].value || '').trim(); });
    var tel = v.telefono.replace(/[\s().-]/g, '');
    function mal(campo, msg) { f.elements[campo].setAttribute('aria-invalid', 'true'); f.elements[campo].focus(); nota.textContent = msg; }
    if (tel && !/^\+[1-9]\d{7,14}$/.test(tel)) return mal('telefono', 'Escribe el teléfono con lada internacional, p. ej. +52 55 1234 5678.');
    if (v.contacto_preferido !== 'correo' && !tel) return mal('telefono', 'Para contactarte por ' + CONTACTO[v.contacto_preferido] + ' necesitamos tu teléfono.');
    if (v.codigo_postal && !/^\d{5}$/.test(v.codigo_postal)) return mal('codigo_postal', 'El código postal lleva 5 dígitos.');

    var args = {};
    CAMPOS.forEach(function (k) { args['p_' + k] = v[k] || null; });
    args.p_telefono = tel || null;
    args.p_contacto_preferido = v.contacto_preferido || 'correo';

    boton.disabled = true;
    boton.textContent = 'Guardando…';
    nota.textContent = '';
    cliente.rpc('actualizar_mi_contacto', args).then(function (res) {
      if (res.error) throw res.error;
      return cargar();
    }).then(function () {
      cerrarFormulario();
      $('cuenta-aviso').textContent = 'Tus datos de contacto quedaron guardados.';
    }).catch(function (err) {
      var m = String((err && err.message) || '');
      nota.textContent = /telefono/.test(m) ? 'Revisa el teléfono: con lada internacional, p. ej. +52 55 1234 5678.'
        : /codigo_postal/.test(m) ? 'El código postal lleva 5 dígitos.'
        : /demasiados/.test(m) ? 'Acabas de guardar un cambio. Espera un minuto e intenta de nuevo.'
        : /registro incompleto/.test(m) ? 'Antes termina tu registro en casasiego.com/registro.html.'
        : /JWT|sesión|401|42501/.test(m) ? 'Tu sesión venció. Recarga la página para entrar de nuevo.'
        : 'No pudimos guardar tus datos. Intenta de nuevo en un momento.';
    }).then(function () {
      boton.disabled = false;
      boton.textContent = 'Guardar';
    });
  }

  // ------------------------------------------------------------------ transacciones
  function pintarTransacciones(lista) {
    var tabla = $('transacciones'), cuerpo = tabla.tBodies[0];
    cuerpo.textContent = '';
    lista = lista || [];
    tabla.hidden = !lista.length;
    $('transacciones-vacio').hidden = Boolean(lista.length);
    lista.forEach(function (t) {
      var tr = document.createElement('tr');
      [['Pedido', t.pedido], ['Fecha', fecha(t.fecha)], ['Piezas', String(t.piezas)],
       ['Estado', ESTADO[t.estado] || t.estado], ['Entrega', t.estado === 'entregado' ? '—' : fecha(t.entrega)]]
        .forEach(function (c) {
          var td = el('td', null, c[1]);
          td.setAttribute('data-etiqueta', c[0]);
          if (c[0] === 'Estado') td.className = 'estado estado--' + t.estado;
          tr.appendChild(td);
        });
      cuerpo.appendChild(tr);
    });
  }

  // ------------------------------------------------------------------ carga
  function cargar() {
    return cliente.rpc('mi_perfil').then(function (res) {
      if (res.error) throw res.error;
      perfil = res.data || {};
      var nombre = perfil.nombre || '';
      $('cuenta-hola').textContent = nombre ? 'Hola, ' + nombre.split(' ')[0] : 'Hola';
      document.title = $('cuenta-hola').textContent + ' · Casa Siego®';
      pintarMedidas(perfil.medidas);
      pintarContacto(perfil);
      pintarTransacciones(perfil.transacciones);
      $('perfil').hidden = false;
    });
  }

  window.addEventListener('DOMContentLoaded', function () {
    var CFG = window.CASASIEGO_ACCESO || {};
    var aviso = $('cuenta-aviso'), salir = $('cuenta-salir');
    var fuera = function () { location.replace('../visitante.html'); };
    if (!CFG.supabaseUrl || !CFG.publishableKey) return fuera();
    enlazarSilueta();
    $('contacto-editar').addEventListener('click', abrirFormulario);
    $('contacto-cancelar').addEventListener('click', cerrarFormulario);
    $('contacto-form').addEventListener('submit', guardarContacto);

    var s = document.createElement('script');
    s.src = CFG.supabaseJs; s.crossOrigin = 'anonymous';
    s.onerror = function () { aviso.textContent = 'No se pudo abrir tu cuenta. Revisa tu conexión y recarga.'; };
    s.onload = function () {
      cliente = window.supabase.createClient(CFG.supabaseUrl, CFG.publishableKey, {
        auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
      });
      cliente.auth.getUser().then(function (r) {                    // valida el token con Supabase
        if (!(r.data && r.data.user)) return fuera();
        return cargar().then(function () {
          aviso.textContent = 'Encantados de volvernos a encontrar.';
          salir.hidden = false;
        });
      }).catch(function () { aviso.textContent = 'No se pudo abrir tu cuenta. Recarga la página.'; });
      salir.addEventListener('click', function () {
        salir.disabled = true;
        cliente.auth.signOut().then(fuera, fuera);
      });
    };
    document.head.appendChild(s);
  });
})();
