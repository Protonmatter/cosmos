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

/* The viewer chrome below lives in this file rather than its own script:
 * the dc runtime rebuilds <head> when it renders, and a third head script
 * tag does not survive that (verified: it is never even fetched). */

/* ═══ Viewer chrome for <deck-stage> decks ═══
 *
 * Adds the two things a visitor needs that an authoring component doesn't
 * provide: a way back to the site, and control over the thumbnail rail.
 *
 * The rail is the engine's slide-miniature column. It is an authoring
 * affordance, and showing it to every desktop visitor is what makes a deck
 * read as "a slide in an editor" — it also costs 188px of canvas at 1100px
 * wide. So it starts hidden and the toggle brings it back, with the choice
 * remembered per browser.
 *
 * `no-rail` is a real observed attribute on the element, so this is the
 * supported route — but it is set from JS rather than authored on the
 * <x-import> tag, because collectProps() in support.js runs dashed
 * attributes through kebabToCamel for x-import, so `no-rail` would arrive
 * as a `noRail` prop and never reach the element as an attribute.
 *
 * deck-stage.js is untouched: it is a copied starter that
 * copy_starter_component overwrites.
 */
(() => {
  'use strict';

  const KEY = 'cosmos:deck-rail';        // '1' = visitor asked for the rail
  const IDLE_MS = 2600;
  const NARROW = matchMedia('(max-width: 640px)');  // engine forces the rail off here

  const CSS = `
    .deck-chrome {
      position: fixed; top: 16px; left: 16px; z-index: 50;
      display: flex; gap: 8px; align-items: center;
      font: 500 13px/1 "Lora", Georgia, serif; letter-spacing: .04em;
      transition: opacity .35s ease, transform .35s ease;
    }
    .deck-chrome[data-idle] { opacity: 0; transform: translateY(-6px); pointer-events: none; }
    .deck-chrome:hover, .deck-chrome:focus-within { opacity: 1 !important; transform: none !important; pointer-events: auto !important; }
    .deck-chrome button, .deck-chrome a {
      -webkit-appearance: none; appearance: none; cursor: pointer;
      display: inline-flex; align-items: center; gap: 7px;
      padding: 9px 14px; border-radius: 999px;
      color: #f0ece5; text-decoration: none;
      background: rgba(19, 18, 16, .72); border: 1px solid rgba(240, 236, 229, .18);
      backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
      font: inherit; transition: background .2s, border-color .2s, color .2s;
    }
    .deck-chrome button:hover, .deck-chrome a:hover {
      border-color: rgba(225, 173, 102, .65); color: #e1ad66;
      background: rgba(19, 18, 16, .9);
    }
    .deck-chrome button:focus-visible, .deck-chrome a:focus-visible {
      outline: 2px solid #e1ad66; outline-offset: 2px;
    }
    .deck-chrome button[aria-pressed="true"] {
      color: #1a1207; background: #e1ad66; border-color: #e1ad66;
    }
    .deck-chrome .dot {
      width: 6px; height: 6px; border-radius: 50%; background: currentColor; opacity: .7;
    }
    @media (max-width: 640px) { .deck-chrome [data-rail] { display: none; } }
    @media print { .deck-chrome { display: none !important; } }
    @media (prefers-reduced-motion: reduce) { .deck-chrome { transition: none; } }
  `;

  const wantsRail = () => {
    try { return localStorage.getItem(KEY) === '1'; } catch (e) { return false; }
  };
  const remember = (on) => {
    try { localStorage.setItem(KEY, on ? '1' : '0'); } catch (e) { /* private mode */ }
  };

  const applyRail = (deck, on) => {
    // Attribute absent = rail shown. The engine re-renders on the change and
    // keeps the current slide (verified: canvas resizes, index holds).
    if (on) deck.removeAttribute('no-rail');
    else deck.setAttribute('no-rail', '');
  };

  // The dc runtime rewrites <head> and replaces <body> when it renders, which
  // wipes anything appended before that. So nothing here is build-once: the
  // nodes are created lazily and re-attached whenever they go missing, and the
  // rail attribute is re-applied to whatever deck element currently exists.
  let bar = null;
  let styleEl = null;
  let on = false;

  const build = (deck) => {
    const style = document.createElement('style');
    style.setAttribute('data-deck-chrome', '');
    style.textContent = CSS;
    styleEl = style;

    bar = document.createElement('div');
    bar.className = 'deck-chrome';

    const back = document.createElement('a');
    back.href = './index.html';
    back.innerHTML = '<span aria-hidden="true">←</span> Cosmos';
    back.title = 'Back to the Cosmos index';

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.setAttribute('data-rail', '');
    toggle.innerHTML = '<span class="dot" aria-hidden="true"></span> Slides';
    toggle.title = 'Show or hide the slide thumbnails';

    const sync = (on) => {
      toggle.setAttribute('aria-pressed', on ? 'true' : 'false');
      toggle.setAttribute('aria-label', on ? 'Hide slide thumbnails' : 'Show slide thumbnails');
    };

    on = wantsRail() && !NARROW.matches;
    sync(on);

    toggle.addEventListener('click', () => {
      on = !on;
      applyRail(document.querySelector('deck-stage'), on);
      remember(on);
      sync(on);
    });

    // The deck listens for Space/arrows to navigate; don't let a keypress
    // aimed at these controls also advance the slide.
    bar.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Enter' || e.key.startsWith('Arrow')) e.stopPropagation();
    });

    bar.append(back, toggle);

    // Summoned by the pointer, like the engine's own overlay.
    let timer;
    const wake = () => {
      bar.removeAttribute('data-idle');
      clearTimeout(timer);
      timer = setTimeout(() => bar.setAttribute('data-idle', ''), IDLE_MS);
    };
    addEventListener('mousemove', wake, { passive: true });
    addEventListener('keydown', wake);
    bar.addEventListener('focusin', wake);
    wake();

    // If the viewport crosses into phone territory the engine drops the rail
    // itself; keep our state honest so the toggle doesn't lie.
    NARROW.addEventListener('change', (e) => {
      if (e.matches && on) { on = false; sync(false); }
    });
  };

  // Idempotent: safe to call on every mutation. Only touches the DOM when
  // something it owns is actually missing, so it converges instead of looping.
  const ensure = () => {
    const deck = document.querySelector('deck-stage');
    if (!deck) return false;
    if (!bar) build(deck);
    if (!styleEl.isConnected) document.head.appendChild(styleEl);
    if (!bar.isConnected) document.body.appendChild(bar);
    // A re-render can hand us a fresh element without our attribute.
    if (deck.hasAttribute('no-rail') === on) applyRail(deck, on);
    return true;
  };

  customElements.whenDefined('deck-stage').then(() => {
    // Kept running for the life of the page — the runtime may re-render more
    // than once, and each render drops whatever we attached.
    new MutationObserver(ensure).observe(document.documentElement, { childList: true, subtree: true });
    let tries = 0;
    const tick = () => { ensure(); if (++tries < 90) requestAnimationFrame(tick); };
    tick();
  });
})();
