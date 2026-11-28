#!/usr/bin/env python3
"""Make the portraits of the ten worlds on the landing page.

    python3 tools/world-portraits.py [--out site/worlds] [--check]

The landing page shows the Sun, the eight planets and the Moon side by side,
one photograph each. The decks' own files will not do for that: one body fills
its frame and the next floats in the middle of a wide one, two frames have a
sky that is not quite black, and the Sun's glow runs off the edge of its
image. Shown in a row they come out at ten different sizes, with the edges of
three frames visible.

This script redraws each body from the widest file the deck serves, so that:

  * every round body is the same size, FILL of the way across a square canvas,
    and centred in it;
  * the sky is black to the last pixel, so no frame can show;
  * nothing is enlarged. A width is only written if the source holds that
    many pixels of the body, which is why Uranus and Neptune stop at 1080.

Two bodies are not plain discs. Saturn is drawn on a canvas twice as wide as
it is tall, measured across its rings. The Sun is drawn a little smaller in
its canvas, to leave room for its prominences, and the glow is faded out
before the canvas ends. The page enlarges both to match the others; the
factor for each is printed, and is the value of --zoom on its stage.

Each source is measured once, below, by the pixels its body spans. Change a
source and its measurement must change with it. --check redraws nothing: it
reads the files already written and reports the size and the edge of each.

Needs Pillow and NumPy. The files it writes are committed; nothing runs this
at build time.
"""
import argparse
import os

import numpy as np
from PIL import Image

Image.MAX_IMAGE_PIXELS = None

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

FILL = 0.90                 # a round body's diameter, as a share of its canvas
WIDTHS = (720, 1080, 1440)  # square canvases
SATURN_WIDTHS = (960, 1440, 1920)   # canvases twice as wide as tall
SATURN_FILL = 0.94          # the rings' span, as a share of the canvas width
SATURN_SPAN = 1.30          # and as a multiple of the stage the page gives it
SUN_FILL = 0.74
QUALITY = 86
SUN_QUALITY = 90            # the Sun's glow bands at lower settings
LIT = 40                    # a pixel brighter than this belongs to the body

# name, file, the body's centre in that file, and the span in pixels that is
# drawn FILL wide. The span is the extent of pixels brighter than LIT: across
# the disc for a full disc, and pole to pole for Jupiter, which is lit from
# the left and narrower than it is tall. Jupiter is centred on what is lit.
DISCS = [
    ('mercury', 'planets/mercury-2147.webp', (1072.5, 1072.5), 1952),
    ('venus', 'planets/venus-4096.webp', (2047.5, 2047.5), 3688),
    ('earth', 'planets/earth-4096.webp', (2045.5, 2046.0), 3536),
    ('moon', 'planets/moon-4096.webp', (2047.5, 2047.5), 4090),
    ('mars', 'planets/mars-2970.webp', (1485.0, 1485.0), 2966),
    ('jupiter', 'planets/jupiter-1920.webp', (867.5, 1209.5), 2200),
    ('uranus', 'planets/uranus-1920.webp', (955.0, 534.5), 1001),
    ('neptune', 'planets/neptune-1920.webp', (942.0, 545.0), 980),
]

# Everything further from the centre than this many radii is drawn black, with
# a soft edge. It clears the specks some frames carry in their sky. Jupiter is
# left alone: its lit half is not a circle about its centre, and its sky is
# already black.
CLEAR_BEYOND = 1.05
CLEAR_FEATHER = 0.025
NO_CLEAR = {'jupiter'}

# The Sun's disc in planets/sun.png, from a circle fitted to its limb. The
# image ends 1.28 radii from the centre, so the glow is gone by 1.27.
SUN = ('planets/sun.png', (958.0, 957.0), 746.0)
SUN_FADE = (1.12, 1.27)

# Saturn's rings in planets/saturn-3545.webp, from the outer edge of the A
# ring on one side to the other. Its sky is 3, not 0: levels at or below the
# black point are drawn as black.
SATURN = ('planets/saturn-3545.webp', (1752.5, 907.0), 3290)
SATURN_BLACK_POINT = 6


def load(path):
    image = Image.open(os.path.join(ROOT, path))
    if image.mode == 'RGBA':
        backdrop = Image.new('RGB', image.size, (0, 0, 0))
        backdrop.paste(image, mask=image.getchannel('A'))
        return backdrop
    return image.convert('RGB')


def place(source, centre, factor, size):
    """Reduce `source` by `factor` and set its `centre` in the middle of a black canvas."""
    width, height = size
    reduced = source.resize((round(source.width * factor), round(source.height * factor)), Image.LANCZOS)
    canvas = Image.new('RGB', size, (0, 0, 0))
    canvas.paste(reduced, (round(width / 2 - centre[0] * factor), round(height / 2 - centre[1] * factor)))
    return np.asarray(canvas, dtype=np.float32)


def distance(size, radius):
    """Each pixel's distance from the middle of the canvas, in `radius` units."""
    width, height = size
    yy, xx = np.mgrid[0:height, 0:width]
    return np.hypot(xx - (width - 1) / 2, yy - (height - 1) / 2) / radius


def frame(pixels):
    """Fade the last few pixels to black, so the canvas can never show as a box."""
    height, width = pixels.shape[:2]
    margin = max(4, round(min(width, height) * 0.012))
    ramp_x = np.clip(np.minimum(np.arange(width), width - 1 - np.arange(width)) / margin, 0, 1)
    ramp_y = np.clip(np.minimum(np.arange(height), height - 1 - np.arange(height)) / margin, 0, 1)
    return pixels * ramp_x[None, :, None] * ramp_y[:, None, None]


def disc(name, path, centre, span, width):
    factor = FILL * width / span
    pixels = place(load(path), centre, factor, (width, width))
    if name not in NO_CLEAR:
        away = distance((width, width), FILL * width / 2)
        pixels = pixels * np.clip((CLEAR_BEYOND - away) / CLEAR_FEATHER, 0, 1)[..., None]
    return frame(pixels)


def sun(width):
    path, centre, radius = SUN
    factor = SUN_FILL * width / (2 * radius)
    pixels = place(load(path), centre, factor, (width, width))
    away = distance((width, width), SUN_FILL * width / 2)
    start, end = SUN_FADE
    return frame(pixels * np.clip((end - away) / (end - start), 0, 1)[..., None])


def saturn(width):
    path, centre, span = SATURN
    factor = SATURN_FILL * width / span
    pixels = place(load(path), centre, factor, (width, width // 2))
    pixels = np.clip((pixels - SATURN_BLACK_POINT) * 255 / (255 - SATURN_BLACK_POINT), 0, 255)
    return frame(pixels)


def measure(path):
    """The lit body's longer side as a share of the canvas width, and the brightest edge pixel."""
    pixels = np.asarray(Image.open(path).convert('RGB')).max(axis=2)
    lit = pixels > LIT
    rows, columns = np.where(lit.any(axis=1))[0], np.where(lit.any(axis=0))[0]
    span = max(rows[-1] - rows[0] + 1, columns[-1] - columns[0] + 1)
    edge = max(pixels[0].max(), pixels[-1].max(), pixels[:, 0].max(), pixels[:, -1].max())
    return span / pixels.shape[1], int(edge)


def main():
    parser = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    parser.add_argument('--out', default='site/worlds')
    parser.add_argument('--check', action='store_true', help='measure the files already written and draw nothing')
    args = parser.parse_args()
    out = os.path.join(ROOT, args.out)
    os.makedirs(out, exist_ok=True)

    jobs = [('sun', WIDTHS, lambda width: sun(width), 2 * SUN[2], SUN_FILL, FILL / SUN_FILL)]
    for name, path, centre, span in DISCS:
        jobs.append((name, WIDTHS, lambda width, a=(name, path, centre, span): disc(*a, width), span, FILL, 1.0))
    jobs.insert(7, ('saturn', SATURN_WIDTHS, lambda width: saturn(width), SATURN[2], SATURN_FILL,
                    SATURN_SPAN / SATURN_FILL))

    for name, widths, draw, span, fill, zoom in jobs:
        # Never enlarge: keep the widths at which the body is drawn no larger than it was photographed.
        kept = [width for width in widths if fill * width <= span]
        line = []
        for width in kept:
            target = os.path.join(out, f'{name}-{width}.webp')
            if not args.check:
                Image.fromarray(np.clip(draw(width), 0, 255).astype(np.uint8)).save(
                    target, 'WEBP', quality=SUN_QUALITY if name == 'sun' else QUALITY, method=6)
            share, edge = measure(target)
            line.append(f'{width}w {os.path.getsize(target) // 1024} kB, body {share:.3f} of the width, edge {edge}')
        print(f'{name:8} --zoom:{zoom:.3f}  ' + '; '.join(line))


if __name__ == '__main__':
    main()
