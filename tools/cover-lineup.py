#!/usr/bin/env python3
"""Draw the Solar System deck's cover image: its eleven bodies in a row, to scale.

    python3 tools/cover-lineup.py [--out planets] [--earth 24]

Writes planets/lineup-<width>.webp at 960, 1440, 1920 and 2560 pixels wide and
prints the position of each body, in the deck's 1920 x 1080 design pixels, for
the name labels on the slide.

Every diameter is drawn in proportion to the others. Distances are not: the
bodies are spaced so that each can be seen and named. The Sun is too large to
fit, so only its limb shows at the left edge.

The radii are the ones on the deck's own slides, plus two the deck does not
state: the Sun's nominal radius, and the outer edge of Saturn's A ring, which
is what the Saturn mosaic is measured by because the rings hide the planet's
equator. Each source image is measured once, below, by the pixels its body
spans; change a source and its measurement must change with it.

Needs Pillow and NumPy. The files it writes are committed; nothing runs this
at build time.
"""
import argparse
import os

import numpy as np
from PIL import Image

Image.MAX_IMAGE_PIXELS = None

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

CANVAS = (1920, 1080)       # design pixels
MASTER_WIDTH = 2560         # the canvas is drawn at this width, then reduced
WIDTHS = (960, 1440, 1920, 2560)
QUALITY = 92               # the file is small; the Sun's glow bands at lower settings

EARTH_RADIUS_KM = 6378.1
SUN_RADIUS_KM = 695_700     # IAU 2015 nominal solar radius
A_RING_OUTER_KM = 136_780   # NASA Saturnian Rings Fact Sheet, "A outer edge"

# name, file, (left, top, right, bottom) of the body in that file, the span in
# pixels that is measured, and what that span is in kilometres.
#
# Jupiter is lit from the left and its night side is dark, so its width is not
# its diameter; it is measured pole to pole. Saturn is measured across the
# rings. Everything else is a full disc measured across.
BODIES = [
    ('Mercury', 'planets/mercury-2147.webp', (97, 96, 2049, 2048), 1953, 2 * 2439.7),
    ('Venus', 'planets/venus-2560.webp', (128, 128, 2431, 2431), 2304, 2 * 6051.8),
    ('Earth', 'planets/earth-2560.webp', (176, 176, 2381, 2320), 2206, 2 * EARTH_RADIUS_KM),
    ('Moon', 'planets/moon-2560.webp', (1, 1, 2557, 2558), 2557, 2 * 1737.4),
    ('Mars', 'planets/mars-2970.webp', (4, 0, 2969, 2826), 2966, 2 * 3396.2),
    ('Jupiter', 'planets/jupiter-1920.webp', (204, 96, 1599, 2309), 2214, 2 * 66_854),
    ('Io', 'moons/gp-io.png', (3, 0, 201, 201), 199, 2 * 1821.6),
    ('Saturn', 'planets/saturn-3545.webp', (108, 192, 3397, 1622), 3290, 2 * A_RING_OUTER_KM),
    ('Uranus', 'planets/uranus-1920.webp', (454, 47, 1455, 1025), 1002, 2 * 25_559),
    ('Neptune', 'planets/neptune-1920.webp', (446, 52, 1402, 1023), 972, 2 * 24_764),
]

# Saturn's mosaic sits on a background of 3, not 0. Levels at or below this are
# drawn as black, or its frame shows as a faint rectangle on the cover.
BLACK_POINT = {'Saturn': 6}

# The Sun's disc in planets/sun.png, from a circle fitted to its limb.
SUN = ('planets/sun.png', (958, 957), 746)

ROW_Y = 650                 # the line the bodies sit on
SUN_LIMB_X = 215            # where the Sun's limb crosses that line
FIRST_X = 350               # centre of Mercury
INNER_PITCH = 104           # centre to centre, Mercury to Mars
GAP = 34                    # clear space either side of the giants
MOON_OFFSET = (29, -27)     # the Moon from Earth's centre, Io from Jupiter's limb
IO_OFFSET = (16, -62)


def composite_lighter(canvas, tile, left, top):
    """Paste `tile` keeping the brighter of the two, so black never covers anything."""
    h, w = tile.shape[:2]
    x0, y0 = max(left, 0), max(top, 0)
    x1, y1 = min(left + w, canvas.shape[1]), min(top + h, canvas.shape[0])
    if x1 <= x0 or y1 <= y0:
        return
    part = tile[y0 - top:y1 - top, x0 - left:x1 - left]
    canvas[y0:y1, x0:x1] = np.maximum(canvas[y0:y1, x0:x1], part)


def load_rgb(path):
    image = Image.open(os.path.join(ROOT, path))
    if image.mode == 'RGBA':
        backdrop = Image.new('RGB', image.size, (0, 0, 0))
        backdrop.paste(image, mask=image.getchannel('A'))
        return backdrop
    return image.convert('RGB')


def main():
    parser = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    parser.add_argument('--out', default='planets')
    parser.add_argument('--earth', type=float, default=24, help="Earth's diameter in design pixels")
    args = parser.parse_args()

    px_per_km = args.earth / (2 * EARTH_RADIUS_KM)      # design pixels
    scale = MASTER_WIDTH / CANVAS[0]                    # design pixels to master pixels
    canvas = np.zeros((round(CANVAS[1] * scale), MASTER_WIDTH, 3), dtype=np.uint8)

    # The Sun: its limb, with the glow faded out before the edge of its image.
    path, (sun_cx, sun_cy), sun_r = SUN
    sun = load_rgb(path)
    radius = SUN_RADIUS_KM * px_per_km * scale          # master pixels
    factor = radius / sun_r
    size = (round(sun.width * factor), round(sun.height * factor))
    tile = np.asarray(sun.resize(size, Image.LANCZOS), dtype=np.float32)
    yy, xx = np.mgrid[0:size[1], 0:size[0]]
    distance = np.hypot(xx - sun_cx * factor, yy - sun_cy * factor) / radius
    fade = np.clip((1.20 - distance) / 0.14, 0, 1)[..., None]
    # A little fixed noise, or the long gradient of the glow shows as stripes.
    grain = np.random.default_rng(2015).normal(0, 1.5, tile.shape[:2])[..., None]
    tile = np.clip(tile * fade + grain * (fade > 0), 0, 255)
    centre_x = SUN_LIMB_X * scale - radius
    composite_lighter(canvas, tile.astype(np.uint8),
                      round(centre_x - sun_cx * factor), round(ROW_Y * scale - sun_cy * factor))

    # The row. Centres are in design pixels.
    size_of = {name: km * px_per_km for name, _, _, _, km in BODIES}
    centre = {}
    x = FIRST_X
    for name in ('Mercury', 'Venus', 'Earth', 'Mars'):
        centre[name] = (x, ROW_Y)
        x += INNER_PITCH
    edge = centre['Mars'][0] + INNER_PITCH / 2
    jupiter_equator = 2 * 71_492 * px_per_km
    for name, width in (('Jupiter', jupiter_equator), ('Saturn', size_of['Saturn']),
                        ('Uranus', size_of['Uranus']), ('Neptune', size_of['Neptune'])):
        centre[name] = (edge + GAP + width / 2, ROW_Y)
        edge += GAP + width
    centre['Moon'] = (centre['Earth'][0] + MOON_OFFSET[0], ROW_Y + MOON_OFFSET[1])
    centre['Io'] = (centre['Jupiter'][0] + jupiter_equator / 2 + IO_OFFSET[0], ROW_Y + IO_OFFSET[1])

    for name, path, box, span, km in BODIES:
        body = load_rgb(path).crop((box[0], box[1], box[2] + 1, box[3] + 1))
        factor = km * px_per_km * scale / span
        size = (max(1, round(body.width * factor)), max(1, round(body.height * factor)))
        tile = np.asarray(body.resize(size, Image.LANCZOS))
        floor = BLACK_POINT.get(name, 0)
        if floor:
            lifted = (tile.astype(np.float32) - floor) * 255 / (255 - floor)
            tile = np.clip(lifted, 0, 255).astype(np.uint8)
        cx, cy = centre[name]
        if name == 'Jupiter':
            # The crop holds only the lit part. Put the planet's centre, not the crop's, on the mark.
            left = round((cx - jupiter_equator / 2) * scale)
        else:
            left = round(cx * scale - size[0] / 2)
        composite_lighter(canvas, tile, left, round(cy * scale - size[1] / 2))

    master = Image.fromarray(canvas)
    out = os.path.join(ROOT, args.out)
    for width in WIDTHS:
        target = os.path.join(out, f'lineup-{width}.webp')
        master.resize((width, round(width * CANVAS[1] / CANVAS[0])), Image.LANCZOS).save(
            target, 'WEBP', quality=QUALITY, method=6)
        print(f'{target}  {os.path.getsize(target) / 1000:.0f} KB')

    print('\nCentres and diameters, in design pixels:')
    for name in ('Mercury', 'Venus', 'Earth', 'Moon', 'Mars', 'Jupiter', 'Io', 'Saturn', 'Uranus', 'Neptune'):
        cx, cy = centre[name]
        print(f'  {name:8s} x {cx:7.1f}  y {cy:6.1f}  d {size_of[name]:6.1f}')
    print(f'  Sun      radius {SUN_RADIUS_KM * px_per_km:.0f}, limb at x {SUN_LIMB_X}')


if __name__ == '__main__':
    main()
