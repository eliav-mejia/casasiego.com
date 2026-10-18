/* Casa Siego — compare.js (v1.0.5)
   Before/after plates: the range input sets --pos on its frame.
   Without JS the frame rests at 50%, so both halves stay visible. */
(function () {
  'use strict';

  document.querySelectorAll('.compare__frame').forEach(function (frame) {
    var range = frame.querySelector('.compare__range');
    if (!range) return;
    function set() { frame.style.setProperty('--pos', range.value + '%'); }
    range.addEventListener('input', set);
    set();
  });
})();
