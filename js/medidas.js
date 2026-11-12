/* Casa Siego — medidas.js 1.0.0 (v1.4.0 · portada index.html)
   Pop-up «Tus medidas actuales» for a signed-in member. It opens:
     - right after sign-up or sign-in from registro.html (index.html?bienvenida=1),
     - from any link to index.html#medidas,
     - on its own when the member has no measurements yet (once per browser tab if they choose «Más tarde»).
   It reuses the Supabase client of js/acceso.js (event «casa:sesion»), reads the latest measurements through RLS
   (public.medidas_vigentes: only the member's own rows) and saves a new one with public.registrar_mis_medidas()
   (migration 0006). Security:
   - No SQL here: the RPC receives typed numeric / text parameters through PostgREST. No dynamic SQL in the function.
   - The function takes the member from auth.uid(); the page never sends a user id.
   - Same ranges in the browser (for a friendly message) and in the database (the real check), options from a whitelist.
   - History is insert-only (0002): a new record corrects the previous one; nothing is overwritten.
   - Values are written into the form with .value and messages with textContent, never innerHTML. */
(function () {
  'use strict';

  var OMITIDO_KEY = 'casasiego.medidas.mas-tarde';
  // [name, label, min, max, required]  — mirror of registrar_mis_medidas() in 0006
  var CAMPOS = [
    ['cuello', 'Cuello', 30, 60, true],
    ['pecho', 'Pecho', 70, 170, true],
    ['largo_manga', 'Largo de manga', 45, 80, true],
    ['cintura', 'Cintura', 55, 170, false],
    ['hombros', 'Hombros', 35, 65, false],
    ['muneca', 'Muñeca', 13, 25, false],
    ['largo_camisa', 'Largo de camisa', 60, 100, false],
    ['estatura_cm', 'Estatura', 140, 220, false],
    ['peso_kg', 'Peso (kg)', 40, 200, false]
  ];
  var OPCIONES = {
    ajuste: [['', '—'], ['entallado', 'Entallado'], ['regular', 'Regular'], ['holgado', 'Holgado']],
    cuello_preferido: [['', '—'], ['CR', 'Regular'], ['CL', 'Largo en punta abierta']],
    puno: [['', '—'], ['sencillo', 'Sencillo'], ['doble', 'Doble'], ['mancuernas', 'Mancuernas']]
  };
  var ETIQUETA_OPCION = { ajuste: 'Ajuste', cuello_preferido: 'Cuello', puno: 'Puño' };

  var params = new URLSearchParams(location.search);
  var pedido = params.get('bienvenida') === '1' || location.hash === '#medidas';
  var cliente = null, sesion = null, abierto = false;

  function leerOmitido() { try { return sessionStorage.getItem(OMITIDO_KEY) === '1'; } catch (e) { return false; } }
  function guardarOmitido() { try { sessionStorage.setItem(OMITIDO_KEY, '1'); } catch (e) { /* ignore */ } }

  function limpiarURL() {
    if (params.has('bienvenida')) {
      params.delete('bienvenida');
      var q = params.toString();
      history.replaceState(null, '', location.pathname + (q ? '?' + q : '') + location.hash);
    }
  }

  function el(tag, attrs, text) {
    var n = document.createElement(tag);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (text) n.textContent = text;
    return n;
  }

  function campoNumero(c) {
    var label = el('label', { 'class': 'medidas__campo' });
    label.appendChild(el('span', { 'class': 'medidas__etiqueta' }, c[1] + (c[4] ? '' : ' · opcional')));
    var fila = el('span', { 'class': 'medidas__fila' });
    var input = el('input', { 'class': 'medidas__input', type: 'text', name: c[0], inputmode: 'decimal', autocomplete: 'off',
                              maxlength: '5', pattern: '[0-9]{2,3}([.,][0-9])?', 'aria-describedby': 'medidas-ayuda' });
    if (c[4]) input.required = true;
    fila.appendChild(input);
    fila.appendChild(el('span', { 'class': 'medidas__unidad', 'aria-hidden': 'true' }, c[0] === 'peso_kg' ? 'kg' : 'cm'));
    label.appendChild(fila);
    return label;
  }

  function campoOpcion(nombre) {
    var label = el('label', { 'class': 'medidas__campo' });
    label.appendChild(el('span', { 'class': 'medidas__etiqueta' }, ETIQUETA_OPCION[nombre]));
    var select = el('select', { 'class': 'medidas__input', name: nombre });
    OPCIONES[nombre].forEach(function (o) { select.appendChild(el('option', { value: o[0] }, o[1])); });
    label.appendChild(select);
    return label;
  }

  function construir(previas) {
    var capa = el('div', { 'class': 'medidas', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'medidas-titulo' });
    var tarjeta = el('div', { 'class': 'medidas__tarjeta' });
    tarjeta.appendChild(el('p', { 'class': 'eyebrow eyebrow--gold' }, 'Justo por Siego · Camisería a medida'));
    tarjeta.appendChild(el('h2', { 'class': 'medidas__titulo', id: 'medidas-titulo' }, '¿Cuáles son tus medidas actuales?'));
    tarjeta.appendChild(el('p', { 'class': 'medidas__lede', id: 'medidas-ayuda' }, previas
      ? 'Estas son las últimas que tenemos. Corrige lo que haya cambiado; guardamos una toma nueva y conservamos el historial.'
      : 'Con cuello, pecho y largo de manga cortamos tu primera camisa. En centímetros, con cinta métrica y sin apretar.'));

    var form = el('form', { 'class': 'medidas__form', novalidate: '' });
    var grid = el('div', { 'class': 'medidas__grid' });
    CAMPOS.slice(0, 3).forEach(function (c) { grid.appendChild(campoNumero(c)); });
    form.appendChild(grid);

    var mas = el('details', { 'class': 'medidas__mas' });
    mas.appendChild(el('summary', {}, 'Más medidas y preferencias'));
    var grid2 = el('div', { 'class': 'medidas__grid' });
    CAMPOS.slice(3).forEach(function (c) { grid2.appendChild(campoNumero(c)); });
    ['ajuste', 'cuello_preferido', 'puno'].forEach(function (n) { grid2.appendChild(campoOpcion(n)); });
    mas.appendChild(grid2);
    form.appendChild(mas);

    var nota = el('p', { 'class': 'medidas__nota', role: 'status', 'aria-live': 'polite' });
    form.appendChild(nota);
    var guardar = el('button', { 'class': 'button medidas__guardar', type: 'submit' }, 'Guardar mis medidas');
    form.appendChild(guardar);
    var luego = el('button', { 'class': 'medidas__luego', type: 'button' }, 'Más tarde');
    form.appendChild(luego);
    tarjeta.appendChild(form);
    capa.appendChild(tarjeta);

    if (previas) {
      CAMPOS.forEach(function (c) { if (previas[c[0]] != null) form.elements[c[0]].value = String(previas[c[0]]); });
      Object.keys(OPCIONES).forEach(function (n) { if (previas[n]) form.elements[n].value = previas[n]; });
      if (CAMPOS.slice(3).some(function (c) { return previas[c[0]] != null; })) mas.open = true;
    }

    function cerrar() {
      abierto = false;
      capa.classList.add('is-leaving');
      document.removeEventListener('keydown', onKey);
      Array.prototype.forEach.call(document.querySelectorAll('[data-medidas-inert]'), function (n) {
        n.removeAttribute('inert'); n.removeAttribute('data-medidas-inert');
      });
      setTimeout(function () { capa.remove(); }, 500);
      if (location.hash === '#medidas') history.replaceState(null, '', location.pathname + location.search);
    }
    function onKey(e) { if (e.key === 'Escape') { guardarOmitido(); cerrar(); } }

    luego.addEventListener('click', function () {
      guardarOmitido();
      if (window.casaMedir) window.casaMedir('casa_medidas', { paso: 'mas_tarde' });
      cerrar();
    });

    form.addEventListener('input', function (e) { e.target.removeAttribute('aria-invalid'); nota.textContent = ''; });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (guardar.disabled) return;
      nota.textContent = '';
      var args = {};
      for (var i = 0; i < CAMPOS.length; i++) {
        var c = CAMPOS[i], input = form.elements[c[0]];
        var raw = input.value.trim().replace(',', '.');
        if (raw === '') {
          if (c[4]) return marcar(input, 'Falta ' + c[1].toLowerCase() + '.');
          args['p_' + c[0]] = null;
          continue;
        }
        if (!/^\d{2,3}(\.\d)?$/.test(raw)) return marcar(input, c[1] + ': escribe solo números, con un decimal como máximo.');
        var v = Number(raw);
        if (v < c[2] || v > c[3]) {
          if (c[0] !== 'cuello' && c[0] !== 'pecho' && c[0] !== 'largo_manga') mas.open = true;
          return marcar(input, c[1] + ': esperamos entre ' + c[2] + ' y ' + c[3] + (c[0] === 'peso_kg' ? ' kg.' : ' cm.'));
        }
        args['p_' + c[0]] = v;
      }
      Object.keys(OPCIONES).forEach(function (n) {
        var val = form.elements[n].value;
        var ok = OPCIONES[n].some(function (o) { return o[0] === val; });
        args['p_' + n] = ok && val ? val : null;
      });

      guardar.disabled = true;
      guardar.textContent = 'Guardando…';
      cliente.rpc('registrar_mis_medidas', args).then(function (res) {
        if (res.error) throw res.error;
        if (window.casaMedir) window.casaMedir('casa_medidas', { paso: 'guardadas' });
        nota.classList.add('es-tranquila');
        nota.textContent = 'Gracias. Tus medidas quedaron guardadas y tu asesor de Justo ya puede verlas.';
        guardar.textContent = 'Guardadas';
        setTimeout(cerrar, 1800);
      }).catch(function (err) {
        var m = String((err && err.message) || '');
        guardar.disabled = false;
        guardar.textContent = 'Guardar mis medidas';
        nota.classList.remove('es-tranquila');
        nota.textContent = /registro incompleto/.test(m) ? 'Antes termina tu registro en casasiego.com/registro.html.'
          : /demasiadas/.test(m) ? 'Ya guardaste varias tomas hoy. Inténtalo mañana o escríbenos a info@casasiego.com.'
          : /rango|opción/.test(m) ? 'Alguna medida no parece correcta. Revísala e intenta de nuevo.'
          : /JWT|sesión|401|42501/.test(m) ? 'Tu sesión venció. Recarga la página para entrar de nuevo.'
          : 'No pudimos guardar tus medidas. Intenta de nuevo en un momento.';
      });
    });

    function marcar(input, msg) {
      input.setAttribute('aria-invalid', 'true');
      input.focus();
      nota.classList.remove('es-tranquila');
      nota.textContent = msg;
    }

    Array.prototype.forEach.call(document.body.children, function (n) {
      if (n.tagName !== 'SCRIPT' && !n.hasAttribute('inert')) { n.setAttribute('inert', ''); n.setAttribute('data-medidas-inert', ''); }
    });
    document.body.appendChild(capa);
    document.addEventListener('keydown', onKey);
    setTimeout(function () { form.elements.cuello.focus({ preventScroll: true }); }, 350);
  }

  function abrir(forzar) {
    if (abierto || !cliente || !sesion) return;
    var columnas = CAMPOS.map(function (c) { return c[0]; }).concat(Object.keys(OPCIONES)).join(',');
    cliente.from('medidas_vigentes').select(columnas).eq('user_id', sesion.user.id).maybeSingle()
      .then(function (res) {
        var previas = res && !res.error ? res.data : null;
        if (!forzar && (previas || leerOmitido())) return;
        abierto = true;
        construir(previas);
        if (window.casaMedir) window.casaMedir('casa_medidas', { paso: 'abierto', previas: previas ? 'si' : 'no' });
      });
  }

  document.addEventListener('casa:sesion', function (e) {
    cliente = e.detail && e.detail.cliente;
    sesion = e.detail && e.detail.sesion;
    limpiarURL();
    setTimeout(function () { abrir(pedido); }, 900);   // after the page has faded in
  });
  window.addEventListener('hashchange', function () { if (location.hash === '#medidas') abrir(true); });
})();
