/* Probador · panel (v2.0.0)
   Un solo panel (color, corte y talla, medidas, holgura, ficha técnica) que se abre y cierra desde la barra central;
   la página nunca hace scroll. Escritorio (> 1100 px): columna derecha que se pliega. Móvil / tableta: hoja inferior.
   Render (botón central): oculta el panel para ver la figura completa; otra pulsación lo devuelve.
   Teclas: P (o T) panel · R render · Esc cierra la hoja abierta. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const app = document.querySelector('.app'), escena = $('escena'), panel = $('pPrenda');
  const boton = $('bMenuPrenda'), bRender = $('bRender');
  const movil = matchMedia('(max-width: 1100px)');
  let abierto = !movil.matches;

  function pintar() {
    app.classList.toggle('sin-pPrenda', !abierto);
    panel.classList.toggle('abierto', abierto);
    panel.inert = !abierto;
    boton.setAttribute('aria-expanded', String(abierto));
    bRender.setAttribute('aria-pressed', String(!abierto));
  }
  const alternar = () => { abierto = !abierto; pintar(); };

  boton.addEventListener('click', alternar);
  bRender.addEventListener('click', alternar);
  document.querySelectorAll('[data-cierra]').forEach(b => b.addEventListener('click', () => { abierto = false; pintar(); }));
  movil.addEventListener('change', () => { abierto = !movil.matches; pintar(); });
  document.addEventListener('keydown', e => {
    if (e.target.closest('input, textarea, select, dialog') || document.querySelector('dialog[open]') || e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (k === 'p' || k === 't' || k === 'r') alternar();
    else if (k === 'escape' && movil.matches && abierto) { abierto = false; pintar(); }
  });

  // El lienzo se mide con el evento resize de la ventana: avisar también cuando la escena cambia de tamaño al plegar el panel.
  let pendiente = false;
  if ('ResizeObserver' in window) new ResizeObserver(() => {
    if (pendiente) return; pendiente = true;
    requestAnimationFrame(() => { pendiente = false; window.dispatchEvent(new Event('resize')); });
  }).observe(escena);

  pintar();
  requestAnimationFrame(() => requestAnimationFrame(() => app.classList.add('listo')));   // transiciones solo después del primer cuadro
})();
