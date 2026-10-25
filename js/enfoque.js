/* Casa Siego — enfoque.js (v1.0.0)
   «Agendar un retrato» opens a pop-up to choose the Fiel page: perfil ejecutivo, familiar / pareja or mascota.
   Without JavaScript or <dialog> support, the button keeps its href and goes straight to Fiel. */
(function () {
  'use strict';
  var dialog = document.getElementById('enfoque');
  if (!dialog || typeof dialog.showModal !== 'function') return;

  document.addEventListener('click', function (e) {
    var open = e.target.closest('[data-enfoque-abrir]');
    if (open) { e.preventDefault(); dialog.showModal(); return; }
    if (e.target === dialog) dialog.close();   // a click on the backdrop closes it
  });
})();
