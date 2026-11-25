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

/* ═══ Image viewer for full-bleed slides (prototype) ═══
 *
 * A slide opts in with a button:
 *   <button data-zoom="planets/saturn-3545.webp" data-zoom-w="3545" data-zoom-h="1834">
 * Clicking it opens the full-resolution file over the deck with pan and zoom
 * (drag, wheel, pinch, double-tap, + - 0, arrows, Esc). The file is fetched
 * on first open, not with the slide.
 *
 * Delegated from the document and built lazily, for the same reason as the
 * chrome above: the dc runtime replaces <body> when it renders. While the
 * viewer is open it is modal: the rest of the page is inert, Tab cycles
 * through its own controls, and it takes the keyboard in the capture phase
 * so arrows and Space cannot advance the deck underneath.
 */
(() => {
  'use strict';

  const CSS = `
    .deck-viewer { position: fixed; inset: 0; z-index: 60; background: #030303; overflow: hidden;
      touch-action: none; cursor: grab; user-select: none; -webkit-user-select: none; }
    .deck-viewer.dragging { cursor: grabbing; }
    .deck-viewer > img { position: absolute; left: 0; top: 0; transform-origin: 0 0; max-width: none;
      will-change: transform; pointer-events: none; }
    .deck-viewer .tools { position: absolute; left: 50%; bottom: 18px; transform: translateX(-50%);
      display: flex; align-items: center; gap: 4px; padding: 4px; border-radius: 999px;
      font: 500 15px/1 "Lora", Georgia, serif; color: #f0ece5;
      background: rgba(12, 11, 10, .78); border: 1px solid rgba(240, 236, 229, .18);
      backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); }
    .deck-viewer .tools button { -webkit-appearance: none; appearance: none; border: 0; background: transparent;
      color: inherit; font: inherit; cursor: pointer; min-width: 44px; height: 44px; padding: 0 14px; border-radius: 999px; }
    .deck-viewer .tools button:hover { background: rgba(240, 236, 229, .1); color: #e1ad66; }
    .deck-viewer .tools button:focus-visible { outline: 2px solid #e1ad66; outline-offset: 2px; }
    .deck-viewer .tools output { min-width: 62px; text-align: center; font-size: 13px; color: #c9c2b6; }
    .deck-viewer .tools .close { background: #e1ad66; color: #1a1207; font-weight: 600; }
    @media print { .deck-viewer { display: none !important; } }
  `;

  let root = null, img = null, out = null, styleEl = null, opener = null;
  let NW = 1, NH = 1, s = 1, tx = 0, ty = 0, min = 1, max = 1;
  let inerted = [];
  // Pointer bookkeeping lives out here, not in build(), so close() can clear
  // it. A viewer closed mid-drag never sees that pointer's pointerup; a stale
  // entry would make the next single touch look like the second finger of a
  // pinch.
  const pts = new Map(); let lastTap = { t: 0, x: 0, y: 0 }, moved = 0, pinch = 0;
  const resetPointers = () => {
    pts.clear(); pinch = 0; moved = 0; lastTap = { t: 0, x: 0, y: 0 };
    if (root) root.classList.remove('dragging');
  };
  const isOpen = () => !!(root && root.isConnected);

  const apply = () => {
    const w = NW * s, h = NH * s, vw = innerWidth, vh = innerHeight;
    tx = w <= vw ? (vw - w) / 2 : Math.min(0, Math.max(vw - w, tx));
    ty = h <= vh ? (vh - h) / 2 : Math.min(0, Math.max(vh - h, ty));
    img.style.transform = 'translate3d(' + tx + 'px,' + ty + 'px,0) scale(' + s + ')';
    out.textContent = Math.round((s / min) * 100) + '%';
  };
  const zoomAt = (cx, cy, factor) => {
    const next = Math.min(max, Math.max(min, s * factor));
    const f = next / s; tx = cx - (cx - tx) * f; ty = cy - (cy - ty) * f; s = next; apply();
  };
  // Never magnify far past the pixels the file actually has.
  const reset = () => {
    min = Math.min(innerWidth / NW, innerHeight / NH);
    max = Math.max(min * 2.5, 1.25 / (window.devicePixelRatio || 1));
    s = min; tx = ty = 0; apply();
  };

  const build = () => {
    styleEl = document.createElement('style');
    styleEl.setAttribute('data-deck-viewer', '');
    styleEl.textContent = CSS;
    root = document.createElement('div');
    root.className = 'deck-viewer';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.innerHTML = '<img alt="" draggable="false"><div class="tools">' +
      '<button type="button" data-act="out" aria-label="Zoom out">−</button><output aria-live="polite"></output>' +
      '<button type="button" data-act="in" aria-label="Zoom in">+</button>' +
      '<button type="button" data-act="fit">Fit</button>' +
      '<button type="button" data-act="close" class="close">Done</button></div>';
    img = root.querySelector('img'); out = root.querySelector('output');

    root.querySelector('.tools').addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      const cx = innerWidth / 2, cy = innerHeight / 2;
      if (b.dataset.act === 'in') zoomAt(cx, cy, 1.5);
      else if (b.dataset.act === 'out') zoomAt(cx, cy, 1 / 1.5);
      else if (b.dataset.act === 'fit') reset();
      else close();
    });

    root.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.tools')) return;
      try { root.setPointerCapture(e.pointerId); } catch (err) { /* pointer already gone */ }
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      moved = 0; root.classList.add('dragging');
      if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); }
    });
    root.addEventListener('pointermove', (e) => {
      const p = pts.get(e.pointerId); if (!p) return;
      const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
      moved += Math.abs(dx) + Math.abs(dy);
      if (pts.size === 1) { tx += dx; ty += dy; apply(); }
      else if (pts.size === 2) {
        const [a, b] = [...pts.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
        tx += dx / 2; ty += dy / 2;
        if (pinch > 0) zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, d / pinch); else apply();
        pinch = d;
      }
    });
    const up = (e) => {
      if (!pts.delete(e.pointerId)) return;
      if (pts.size < 2) pinch = 0;
      if (pts.size) return;
      root.classList.remove('dragging');
      if (e.type !== 'pointerup' || moved >= 8) return;
      const now = performance.now();
      if (now - lastTap.t < 320 && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 30) {
        if (s < min * 1.8) zoomAt(e.clientX, e.clientY, Math.min(max, min * 3) / s); else reset();
        lastTap.t = 0;
      } else lastTap = { t: now, x: e.clientX, y: e.clientY };
    };
    root.addEventListener('pointerup', up); root.addEventListener('pointercancel', up);
    root.addEventListener('lostpointercapture', up);
    root.addEventListener('wheel', (e) => {
      e.preventDefault(); e.stopPropagation();
      zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * .0016));
    }, { passive: false });
    // Clicks inside the viewer must not reach the deck's tap-to-advance.
    root.addEventListener('click', (e) => e.stopPropagation());
  };

  const open = (btn) => {
    if (!root) build();
    opener = btn;
    NW = +btn.getAttribute('data-zoom-w') || 1; NH = +btn.getAttribute('data-zoom-h') || 1;
    img.width = NW; img.height = NH;
    const src = btn.getAttribute('data-zoom');
    if (img.getAttribute('src') !== src) img.setAttribute('src', src);
    root.setAttribute('aria-label', btn.getAttribute('data-zoom-label') || 'Image viewer');
    if (!styleEl.isConnected) document.head.appendChild(styleEl);
    resetPointers();
    document.body.appendChild(root);
    // aria-modal alone is only a hint. Make everything else inert so focus,
    // clicks and assistive technology cannot reach the deck behind the viewer.
    inerted = [...document.body.children].filter((el) => el !== root && !el.inert);
    inerted.forEach((el) => { el.inert = true; });
    reset();
    root.querySelector('.close').focus();
  };
  const close = () => {
    if (!isOpen()) return;
    inerted.forEach((el) => { el.inert = false; });
    inerted = [];
    resetPointers();
    root.remove();
    if (opener && opener.isConnected) opener.focus();
  };

  document.addEventListener('click', (e) => {
    const btn = e.target.closest && e.target.closest('[data-zoom]');
    if (!btn) return;
    e.preventDefault(); e.stopPropagation();
    open(btn);
  }, true);

  addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (!isOpen()) {
      // The deck advances on Space from a window-level handler and cancels the
      // event, which would also cancel a focused button's activation. Keep
      // Space on an opener away from the deck so the button opens the viewer.
      const t = e.composedPath ? e.composedPath()[0] : e.target;
      if ((e.key === ' ' || e.key === 'Spacebar') && t && t.closest && t.closest('[data-zoom]')) e.stopImmediatePropagation();
      return;
    }
    if (e.key === 'Tab') {
      // Cycle through the viewer's own controls; never hand focus to the page.
      const stops = [...root.querySelectorAll('button')];
      const i = stops.indexOf(document.activeElement);
      const next = e.shiftKey ? (i <= 0 ? stops.length - 1 : i - 1) : (i === stops.length - 1 ? 0 : i + 1);
      stops[next].focus();
      e.preventDefault(); e.stopImmediatePropagation();
      return;
    }
    const cx = innerWidth / 2, cy = innerHeight / 2, step = 80;
    if (e.key === 'Escape') close();
    else if (e.key === '+' || e.key === '=') zoomAt(cx, cy, 1.25);
    else if (e.key === '-' || e.key === '_') zoomAt(cx, cy, 1 / 1.25);
    else if (e.key === '0') reset();
    else if (e.key === 'ArrowLeft') { tx += step; apply(); }
    else if (e.key === 'ArrowRight') { tx -= step; apply(); }
    else if (e.key === 'ArrowUp') { ty += step; apply(); }
    else if (e.key === 'ArrowDown') { ty -= step; apply(); }
    else if (e.key === 'Enter') return;   // leave button activation alone
    else if (e.key === ' ' && e.target.closest && e.target.closest('.deck-viewer button')) { e.stopImmediatePropagation(); return; }
    // Everything else (Space, PageDown, Home, End…) is swallowed too, so the
    // deck cannot change slide behind an open viewer.
    e.preventDefault(); e.stopImmediatePropagation();
  }, true);

  addEventListener('resize', () => { if (isOpen()) reset(); });
})();
