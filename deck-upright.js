/* Decks on a phone held upright.
 *
 * The deck engine draws every slide on a fixed 1920 by 1080 stage and scales it
 * to fit the window. On an upright phone that is a strip a quarter of the
 * screen high, with its smallest text under 5 px.
 *
 * The engine is not modified. It reads its design size from its `width` and
 * `height` attributes and refits when they change, so on an upright phone this
 * gives it a canvas the shape of the window, 540 px wide, and marks the root
 * with `data-upright`. deck-upright.css lays the slides out again under that
 * attribute. A sideways swipe turns the page through the engine's own
 * next() and prev().
 *
 * See docs/rfcs/0008-decks-on-an-upright-phone.md.
 */
(function () {
  'use strict';

  // 24 px, the decks' smallest text, is drawn at 17.3 px on a 390 px phone
  // when the canvas is 540 wide, and at 16 px on a 360 px one.
  var CANVAS = 540;
  var UPRIGHT = window.matchMedia('(orientation: portrait) and (max-width: 640px)');
  var SWIPE = 48; // px a finger must travel sideways to turn the page

  var authored = null; // the size the deck was written at
  var printing = false;

  function stage() {
    return document.querySelector('deck-stage');
  }

  function fit() {
    var el = stage();
    if (!el) return;
    if (!authored) {
      authored = { width: el.getAttribute('width') || '1920', height: el.getAttribute('height') || '1080' };
    }
    var upright = UPRIGHT.matches && !printing;
    var width = upright ? String(CANVAS) : authored.width;
    var height = upright ? String(Math.round((CANVAS * window.innerHeight) / window.innerWidth)) : authored.height;
    if (el.getAttribute('width') !== width) el.setAttribute('width', width);
    if (el.getAttribute('height') !== height) el.setAttribute('height', height);
    document.documentElement.toggleAttribute('data-upright', upright);
  }

  // The runtime builds the stage after the page has loaded.
  var waiting = new MutationObserver(function () {
    if (!stage()) return;
    waiting.disconnect();
    fit();
  });
  waiting.observe(document.documentElement, { childList: true, subtree: true });
  fit();

  window.addEventListener('resize', fit);
  window.addEventListener('orientationchange', fit);
  if (UPRIGHT.addEventListener) UPRIGHT.addEventListener('change', fit);

  // Print is laid out by the engine at the design size, one slide to a page.
  window.addEventListener('beforeprint', function () { printing = true; fit(); });
  window.addEventListener('afterprint', function () { printing = false; fit(); });

  // A slide that was scrolled should open at its top the next time.
  document.addEventListener('slidechange', function () {
    if (!document.documentElement.hasAttribute('data-upright')) return;
    var slides = document.querySelectorAll('deck-stage > section');
    for (var i = 0; i < slides.length; i += 1) slides[i].scrollTop = 0;
  }, true);

  // One finger, moved mostly sideways, turns the page. Anything else (a tap, a
  // scroll, a pinch, a touch that starts in the image viewer) is left alone.
  var from = null;
  document.addEventListener('touchstart', function (event) {
    from = null;
    var el = stage();
    if (!el || !document.documentElement.hasAttribute('data-upright')) return;
    if (event.touches.length !== 1 || event.composedPath().indexOf(el) === -1) return;
    from = { x: event.touches[0].clientX, y: event.touches[0].clientY };
  }, { passive: true });
  document.addEventListener('touchmove', function (event) {
    if (event.touches.length !== 1) from = null;
  }, { passive: true });
  document.addEventListener('touchcancel', function () { from = null; }, { passive: true });
  document.addEventListener('touchend', function (event) {
    var el = stage();
    var start = from;
    from = null;
    if (!el || !start || !event.changedTouches.length) return;
    var dx = event.changedTouches[0].clientX - start.x;
    var dy = event.changedTouches[0].clientY - start.y;
    if (Math.abs(dx) < SWIPE || Math.abs(dx) < Math.abs(dy) * 2) return;
    if (dx < 0) el.next(); else el.prev();
  }, { passive: true });
})();
