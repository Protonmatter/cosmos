/* ═══ Stage chrome for <deck-stage> decks ═══
 *
 * deck-stage draws two things that read as "this is a slide on a screen":
 * a 1.5px white hairline around the canvas (commented in the engine as
 * "Slide edge on the black stage") and a flat #000 letterbox behind it.
 * Both live in the shadow root, out of reach of author CSS.
 *
 * The engine attaches with mode:'open', so rather than editing deck-stage.js
 * — a copied starter that copy_starter_component overwrites — we append one
 * stylesheet to the shadow root. Custom properties inherit across the shadow
 * boundary, so the colours come from --cin-canvas / --cin-stage set on the
 * deck-stage element in deck-cinema.css and stay overridable per deck.
 *
 * Print is left alone: the engine's @media print rule already resets
 * .canvas background to none, and it is declared after this sheet.
 */
(() => {
  'use strict';

  // Screen-only. These need !important to beat the engine's own .canvas
  // rules, which would otherwise also beat its @media print reset of
  // .canvas { background: none } and tint every printed page.
  const SHADOW_CSS = `
    @media screen {
      .canvas {
        box-shadow: none !important;
        background: var(--cin-canvas, #f3f2f2) !important;
      }
      :host {
        background: var(--cin-stage, #0a0908) !important;
      }
    }
  `;

  const done = new WeakSet();

  const inject = (el) => {
    const root = el.shadowRoot;
    if (!root || done.has(el)) return true;
    const style = document.createElement('style');
    style.setAttribute('data-deck-cinema', '');
    style.textContent = SHADOW_CSS;
    root.appendChild(style);
    done.add(el);
    return true;
  };

  // Returns true once every deck-stage on the page has been handled, so the
  // initial retry loop knows when it can stop.
  const scan = () => {
    const decks = document.querySelectorAll('deck-stage');
    if (!decks.length) return false;
    let all = true;
    decks.forEach((el) => { if (!inject(el)) all = false; });
    return all;
  };

  const start = () => {
    // The dc runtime mounts the deck asynchronously and can re-render it, so
    // watch for later arrivals in addition to the ones present right now.
    new MutationObserver(scan).observe(document.documentElement, {
      childList: true,
      subtree: true,
    });

    // A custom element upgraded in the same task as its insertion has no
    // shadowRoot yet when the observer fires; retry briefly to catch it.
    let tries = 0;
    const tick = () => {
      if (scan() || ++tries > 60) return;
      requestAnimationFrame(tick);
    };
    tick();
  };

  customElements.whenDefined('deck-stage').then(start);
})();
