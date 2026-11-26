/* The poster on a screen.
 *
 * doc-page lays the sheet out at its printed size, 18 inches wide, and does not
 * scale it. This works out the scale that fits the sheet to the width of the
 * window and wires the Print button. The page's stylesheet applies the scale
 * on screens only, so print is untouched.
 *
 * See docs/rfcs/0007-explorer-poster-and-landing.md.
 */
(function () {
  'use strict';

  var SHEET = 18 * 96; // the sheet's width in CSS pixels
  var MARGIN = 24; // doc-page's own padding either side of it

  /* The scale goes on the root as a custom property and the page's stylesheet
   * applies it to the sheet, so it holds whenever the runtime builds or
   * rebuilds the sheet itself. */
  function fit() {
    var room = document.documentElement.clientWidth;
    var scale = Math.min(1, room / (SHEET + MARGIN * 2));
    document.documentElement.style.setProperty('--poster-zoom', String(scale));
  }

  fit();
  window.addEventListener('resize', fit);
  window.addEventListener('load', fit);

  document.addEventListener('click', function (event) {
    var target = event.target instanceof Element ? event.target.closest('[data-print]') : null;
    if (target) window.print();
  });
})();
