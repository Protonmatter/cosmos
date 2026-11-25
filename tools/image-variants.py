#!/usr/bin/env python3
"""Make the WebP variants a full-bleed slide serves.

The site has no build step: every file it serves is committed. This script is
the recipe those committed files were made with, so that the next image added
to a deck is produced the same way. It is development tooling and nothing on
the site depends on it.

    python3 tools/image-variants.py SOURCE NAME [options]

For a SOURCE of any format Pillow reads, it writes NAME-<width>.webp for each
requested width that is narrower than the source, plus one at the source's own
width (or at --max, if the source is larger). The widest file is the one the
image viewer opens; the others go in the slide's srcset.

    python3 tools/image-variants.py ~/Downloads/PIA00104.jpg venus --max 4096

Options:
    --out DIR        where to write (default: planets)
    --widths A,B,C   srcset widths (default: 960,1440,1920,2560)
    --max N          cap the widest file at N pixels wide
    --quality N      WebP quality (default: 86)
    --disc           the source is a full disc that touches all four edges on a
                     background that is not black: mask everything outside the
                     disc to black, with a soft two-pixel edge

Requires Python 3 and Pillow (`pip install pillow`).
"""
import argparse
import os
import sys

from PIL import Image, ImageDraw, ImageFilter

Image.MAX_IMAGE_PIXELS = None  # spacecraft mosaics are legitimately enormous


def mask_disc(image):
    """Black out everything outside the inscribed circle."""
    width, height = image.size
    scale = 4 if max(width, height) <= 4096 else 1  # supersample small masks
    mask = Image.new('L', (width * scale, height * scale), 0)
    inset = 3 * scale  # sit just inside the limb, where mosaics are ragged
    ImageDraw.Draw(mask).ellipse((inset, inset, width * scale - inset, height * scale - inset), fill=255)
    if scale > 1:
        mask = mask.resize((width, height), Image.LANCZOS)
    else:
        mask = mask.filter(ImageFilter.GaussianBlur(1.0))
    black = Image.new(image.mode, image.size, 0)
    return Image.composite(image, black, mask)


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('source')
    parser.add_argument('name')
    parser.add_argument('--out', default='planets')
    parser.add_argument('--widths', default='960,1440,1920,2560')
    parser.add_argument('--max', type=int, default=0)
    parser.add_argument('--quality', type=int, default=86)
    parser.add_argument('--disc', action='store_true')
    args = parser.parse_args()

    image = Image.open(args.source)
    image = image.convert('RGB') if image.mode not in ('RGB', 'L') else image
    print(f'source  {image.width} x {image.height}  {os.path.getsize(args.source) / 1e6:.2f} MB')

    top = min(image.width, args.max) if args.max else image.width
    if top < image.width:
        image = image.resize((top, round(image.height * top / image.width)), Image.LANCZOS)
    if args.disc:
        image = mask_disc(image)
    image = image.convert('RGB')

    widths = sorted({int(w) for w in args.widths.split(',') if int(w) < top} | {top})
    os.makedirs(args.out, exist_ok=True)
    for width in widths:
        variant = image if width == image.width else image.resize(
            (width, round(image.height * width / image.width)), Image.LANCZOS)
        path = os.path.join(args.out, f'{args.name}-{width}.webp')
        variant.save(path, 'WEBP', quality=args.quality, method=6)
        print(f'{path}  {variant.width} x {variant.height}  {os.path.getsize(path) / 1e3:.0f} KB')

    srcset = ', '.join(f'{args.out}/{args.name}-{w}.webp {w}w' for w in widths)
    print(f'\nsrcset="{srcset}"')
    print(f'viewer: data-zoom="{args.out}/{args.name}-{top}.webp" data-zoom-w="{top}" '
          f'data-zoom-h="{round(image.height)}"')
    return 0


if __name__ == '__main__':
    sys.exit(main())
