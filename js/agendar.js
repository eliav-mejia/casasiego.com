/* Casa Siego — agendar.js (v1.0.0) · brands/justo/agendar/ y brands/atemporal/agendar/
   La página ya pasó por js/solo-miembros.js (sin sesión → registro.html). Aquí se lee la sesión guardada de Supabase
   (sb-<ref>-auth-token: user.email y user_metadata) y se abre la agenda (cita/agenda.html, build de citas.lameyer.net)
   con ?nombre=&correo=, para apartar la cita sin volver a pedir correo ni código. Sin red: todo sale del navegador. */
(function () {
  'use strict';

  function sesion() {
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (!/^sb-[a-z0-9]+-auth-token$/.test(k)) continue;
        var s = JSON.parse(localStorage.getItem(k)) || {};
        if (s.refresh_token && s.user) return s.user;
      }
    } catch (e) { /* sin almacenamiento */ }
    return null;
  }

  window.addEventListener('DOMContentLoaded', function () {
    var marco = document.getElementById('agenda');
    if (!marco) return;
    var u = sesion() || {}, meta = u.user_metadata || {};
    var correo = u.email || meta.email || '';
    var nombre = meta.full_name || meta.name || meta.nombre || '';
    var q = new URLSearchParams();
    if (correo) { q.set('correo', correo); if (nombre) q.set('nombre', nombre); }
    var servicio = new URLSearchParams(location.search).get('servicio');   // ?servicio=cita-virtual | cita-domicilio
    if (servicio) q.set('servicio', servicio);
    marco.src = marco.getAttribute('data-src') + (q.toString() ? '?' + q.toString() : '');

    var hola = document.getElementById('agendar-hola');
    if (hola && (nombre || correo)) {
      hola.textContent = 'Agendas como ' + (nombre ? nombre.split(' ')[0] + ' · ' : '') + correo;
      hola.hidden = false;
    }
  });
})();
