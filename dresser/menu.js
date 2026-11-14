/* Probador · menús (v1.0.0)
   Toma de medidas y Camisería a medida se abren y cierran desde la barra central; la página nunca hace scroll.
   Escritorio (> 1100 px): columnas laterales que se pliegan. Móvil / tableta: hojas inferiores, una a la vez.
   Render (botón central): oculta los dos menús para ver la figura completa; otra pulsación los devuelve.
   Teclas: T toma de medidas · P camisería · R render · Esc cierra la hoja abierta. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const app = document.querySelector('.app'), escena = $('escena');
  const IDS = ['pMedidas', 'pPrenda'];
  const boton = { pMedidas: $('bMenuMedidas'), pPrenda: $('bMenuPrenda') };
  const bRender = $('bRender');
  const movil = matchMedia('(max-width: 1100px)');
  const porDefecto = () => movil.matches ? { pMedidas: false, pPrenda: false } : { pMedidas: true, pPrenda: true };
  let abierto = porDefecto(), previo = null;

  function pintar() {
    for (const id of IDS) {
      const a = abierto[id], p = $(id);
      app.classList.toggle('sin-' + id, !a);
      p.classList.toggle('abierto', a);
      p.inert = !a;
      boton[id].setAttribute('aria-expanded', String(a));
    }
    bRender.setAttribute('aria-pressed', String(!abierto.pMedidas && !abierto.pPrenda));
  }
  function alternar(id) {
    abierto[id] = !abierto[id];
    if (movil.matches && abierto[id]) for (const o of IDS) if (o !== id) abierto[o] = false;   // una hoja a la vez
    previo = null; pintar();
  }
  function render() {
    if (abierto.pMedidas || abierto.pPrenda) { previo = { ...abierto }; abierto = { pMedidas: false, pPrenda: false }; }
    else { abierto = previo || (movil.matches ? { pMedidas: true, pPrenda: false } : porDefecto()); previo = null; }
    pintar();
  }

  for (const id of IDS) boton[id].addEventListener('click', () => alternar(id));
  bRender.addEventListener('click', render);
  document.querySelectorAll('[data-cierra]').forEach(b => b.addEventListener('click', () => { abierto[b.dataset.cierra] = false; pintar(); }));
  movil.addEventListener('change', () => { abierto = porDefecto(); previo = null; pintar(); });
  document.addEventListener('keydown', e => {
    if (e.target.closest('input, textarea, select') || e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (k === 't') alternar('pMedidas');
    else if (k === 'p') alternar('pPrenda');
    else if (k === 'r') render();
    else if (k === 'escape' && movil.matches && (abierto.pMedidas || abierto.pPrenda)) { abierto = { pMedidas: false, pPrenda: false }; pintar(); }
  });

  // El lienzo se mide con el evento resize de la ventana: avisar también cuando la escena cambia de tamaño al plegar un menú.
  let pendiente = false;
  if ('ResizeObserver' in window) new ResizeObserver(() => {
    if (pendiente) return; pendiente = true;
    requestAnimationFrame(() => { pendiente = false; window.dispatchEvent(new Event('resize')); });
  }).observe(escena);

  pintar();
  requestAnimationFrame(() => requestAnimationFrame(() => app.classList.add('listo')));   // transiciones solo después del primer cuadro
})();
