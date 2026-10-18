/* Casa Siego — protect.js (v1.0.2)
   Deterrent only: discourages casual saving of photographs.
   It cannot stop screenshots or a determined visitor; see docs §5.
   Scoped to photographs so text stays selectable and the page stays accessible. */
(function () {
  'use strict';

  var PROTECTED = '.plate__frame, .leaf__image, .hero__plate, .interlude__plate, img';

  function isProtected(target) {
    return target && target.closest && target.closest(PROTECTED);
  }

  // Right-click / long-press menu ("Save image as…") on photographs.
  document.addEventListener('contextmenu', function (e) {
    if (isProtected(e.target)) e.preventDefault();
  });

  // Dragging an image to the desktop or another tab.
  document.addEventListener('dragstart', function (e) {
    if (isProtected(e.target)) e.preventDefault();
  });
})();
