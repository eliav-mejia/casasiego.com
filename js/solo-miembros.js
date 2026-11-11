/* Casa Siego — solo-miembros.js 1.0.0 (v1.4.2 · membresia/equipo/ y membresia/eventos/)
   Equipo y Eventos son solo para miembros con sesión. Sin sesión guardada, la página no se pinta y el visitante va a
   iniciar sesión (registro.html?modo=acceso) con «volver» = esta página; tras entrar, registro.js lo regresa aquí.
   Va como PRIMER script del <head>, sin defer, para redirigir antes de pintar nada.
     <script src="../../js/solo-miembros.js?v=1.0.0" data-acceso="../../registro.html" data-volver="membresia/equipo/"></script>
   Misma prueba que cuenta/: una sesión de Supabase guardada (sb-<ref>-auth-token con refresh_token).
   Límite: GitHub Pages sirve HTML estático; esto aparta a quien no tiene cuenta, no protege un secreto. Lo que deba ser
   privado de verdad (datos del miembro) se lee de Supabase con RLS, como en /cuenta/. */
(function () {
  'use strict';
  var yo = document.currentScript;
  try {
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (/^sb-[a-z0-9]+-auth-token$/.test(k) && (JSON.parse(localStorage.getItem(k)) || {}).refresh_token) return;
    }
  } catch (e) { /* sin almacenamiento = sin sesión */ }
  var acceso = (yo && yo.getAttribute('data-acceso')) || '/registro.html';
  var volver = (yo && yo.getAttribute('data-volver')) || '';
  location.replace(acceso + '?' + new URLSearchParams({ modo: 'acceso', volver: volver }).toString());
})();
