# Contributing to Cosmos

Thanks for looking. This is a small project with an unusual property worth knowing
before you start: **the site has no build step and never will.** The pages are
standalone HTML that open straight from the filesystem. Everything below is
development tooling — it tests the site, it does not build it.

## Getting set up

```bash
git clone https://github.com/Protonmatter/cosmos.git
cd cosmos
npm install
npm run serve     # http://localhost:8000
```

You can also just open `index.html` in a browser. Both work.

> **On Windows**, clone *after* `.gitattributes` exists (it does, on `main`). The
> vendored React bundles are loaded with a Subresource Integrity digest, and a
> checkout that rewrites LF to CRLF changes their bytes, fails the integrity check,
> and renders every deck completely blank with no obvious cause. `npm run
> test:validation` detects this in about a second if it ever happens to you.

## Running the tests

```bash
npm test                 # everything the pull-request gate runs
npm run test:validation  # static checks, ~1s, no browser
npm run test:trace       # requirement ↔ test traceability
npm run test:functional  # per-page behaviour
npm run test:e2e         # journeys across pages
npm run test:regression  # invariants and past defects
npm run test:visual      # screenshots; Linux only, see docs/specs/visual.spec.md
```

To run only the tests covering one requirement:

```bash
npx playwright test --grep "@REQ DECK-005"
```

## Before you open a pull request

1. **Does it need an RFC?** Substantive changes do. See
   [docs/SDLC.md](docs/SDLC.md) for the substantive/routine split — it is
   deliberately generous about what counts as routine.
2. **Is it specified?** New behaviour needs a requirement in `docs/specs/`.
3. **Is it tested?** Every MUST-level requirement needs a test annotated
   `@REQ <ID>`. CI fails otherwise, on purpose.
4. **Does `npm test` pass?**

## Adding a full-bleed image

The decks show their photographs in several WebP widths. To add or replace one,
run the image tool on the original (`--out moons` for the Moons deck, `--out
images` for the JunoCam deck):

```bash
python3 tools/image-variants.py path/to/original.jpg venus --max 4096
```

It needs Python 3 and Pillow (`pip install Pillow`). It writes
`planets/venus-<width>.webp` and prints the `srcset` and the image viewer's
attributes to paste into the slide. Commit the files it writes; the site has no
build step, so nothing regenerates them. Keep widths above about 3000 pixels out
of the slide's `srcset` and use the largest only for the viewer. Credit the image
on the deck's Sources slide and in the README.
[RFC 0005](docs/rfcs/0005-full-bleed-decks.md) has the reasoning.

The deck's cover shows every body at one scale and is drawn from those files. If
you replace one, or change a radius, redraw it with `python3 tools/cover-lineup.py`
(it also needs NumPy), and move the names on the cover slide to the positions it
prints.

The landing page's row of worlds is drawn from those files too. If you replace a
planet's photograph, measure the new one, update its line in
`tools/world-portraits.py`, and run it: it rewrites `site/worlds/` and prints the
size and the edge of each portrait, which `--check` repeats without redrawing.

## Adding or changing a slide

Every slide has two layouts. On anything but an upright phone or small tablet it is
the 1920 by 1080 stage. On those `deck-upright.css` lays it out again as one column,
on a canvas 540 px wide for a phone and 720 px wide for a tablet up to 900 px. Its rules are written for the shared patterns (`.fb`,
`.dk-side`, `.dk-lineup`, `.dk-pair` and the rest), with a few at the end for single
slides.

So, after changing a slide:

- Look at it at 390 by 844 and at 768 by 1024 as well. A browser's device toolbar is
  enough.
- A slide built from the existing patterns usually needs nothing.
- A block positioned with its own inline `left` and `top` needs a rule putting it
  back into the flow, or it will sit where the wide slide put it.
- Nothing may be set smaller than 24 px there either. It is drawn at 17.3 px on a
  390 px phone.

`tests/functional/upright.spec.js` goes through every slide and will fail on text
that is too small, on anything that runs off the side, and on a tall slide that
cannot scroll. It cannot tell you whether the page looks right.

## Writing tests

The house rules, in full:

- **No fixed sleeps.** Wait on observable state. The helpers in
  `tests/support/pages.js` know how each kind of page signals readiness — the deck
  pages in particular render nothing until their runtime has booted, so waiting on
  `load` asserts against a blank document.
- **Address pages the way a reader does** — by role, label, and visible text.
  Fall back to the documented data attributes only where the runtime provides no
  accessible handle.
- **Say why, not what.** A test called `checks the counter` tells a future reader
  nothing; `reports position and total in the counter @REQ DECK-011` tells them
  what broke and which decision it protects.

## Reporting something broken

Open an issue with the bug template. The single most useful thing you can include
is which page, at what viewport, in which browser — the decks scale to fit, so
layout problems are often viewport-specific.

## Code of conduct

Be decent. The imagery in this repository was processed by volunteers who did it
for the pleasure of it; that is the spirit to work in.
