/**
 * Functional: the decks on a phone held upright.
 *
 * On a 390 by 844 window the 16:9 stage is a strip 219 px high and its smallest
 * text is drawn under 5 px. RFC 0008 gives every slide a second layout for that
 * case. These tests go through every slide of every deck, because a layout that
 * is written pattern by pattern can be right on forty slides and wrong on one.
 */
import { test, expect } from '../support/fixtures.js';
import { DECKS, open } from '../support/pages.js';

const PHONE = { width: 390, height: 844 };

test.use({ viewport: PHONE, hasTouch: true });

const deck = (descriptor) => ({ ...descriptor, kind: 'deck' });

/** Show slide `index` (zero-based) and wait until the engine has made it active. */
async function show(page, index) {
  await page.evaluate((target) => document.querySelector('deck-stage').goTo(target), index);
  await expect(page.locator(`deck-stage > section[data-deck-slide="${index}"]`)).toHaveAttribute('data-deck-active', '');
}

/** Run `measure` in the page against the active slide. */
const onActive = (page, measure) =>
  page.evaluate(
    (source) => new Function('slide', `return (${source})(slide)`)(document.querySelector('deck-stage > section[data-deck-active]')),
    measure.toString(),
  );

/** Drag one finger across the stage, the way a swipe does. */
async function swipe(page, fromX, toX, y = 600) {
  await page.evaluate(
    ({ fromX, toX, y }) => {
      const stage = document.querySelector('deck-stage');
      const finger = (x) => new Touch({ identifier: 1, target: stage, clientX: x, clientY: y });
      const send = (type, x, down) =>
        stage.dispatchEvent(
          new TouchEvent(type, {
            bubbles: true,
            cancelable: true,
            composed: true,
            touches: down ? [finger(x)] : [],
            targetTouches: down ? [finger(x)] : [],
            changedTouches: [finger(x)],
          }),
        );
      send('touchstart', fromX, true);
      send('touchmove', (fromX + toX) / 2, true);
      send('touchend', toX, false);
    },
    { fromX, toX, y },
  );
}

for (const descriptor of DECKS) {
  test.describe(`${descriptor.name} on an upright phone`, () => {
    test.beforeEach(async ({ page }) => {
      await open(page, deck(descriptor));
    });

    test('draws every slide the full size of the window @REQ DECK-030', async ({ page }) => {
      for (let index = 0; index < descriptor.slides; index += 1) {
        await show(page, index);
        const box = await onActive(page, (slide) => {
          const edge = slide.getBoundingClientRect();
          return { left: edge.left, top: edge.top, width: edge.width, height: edge.height };
        });
        expect(Math.abs(box.left), `slide ${index + 1} left`).toBeLessThanOrEqual(1);
        expect(Math.abs(box.top), `slide ${index + 1} top`).toBeLessThanOrEqual(1);
        expect(Math.abs(box.width - PHONE.width), `slide ${index + 1} width`).toBeLessThanOrEqual(1);
        expect(Math.abs(box.height - PHONE.height), `slide ${index + 1} height`).toBeLessThanOrEqual(2);
      }
    });

    test('draws no text smaller than 16 px @REQ DECK-031', async ({ page }) => {
      for (let index = 0; index < descriptor.slides; index += 1) {
        await show(page, index);
        const small = await onActive(page, (slide) => {
          const scale = slide.getBoundingClientRect().width / slide.offsetWidth;
          const found = [];
          const walker = document.createTreeWalker(slide, NodeFilter.SHOW_TEXT);
          for (let node = walker.nextNode(); node; node = walker.nextNode()) {
            const text = node.textContent.trim();
            const parent = node.parentElement;
            if (!text || !parent || parent.closest('svg')) continue;
            const style = getComputedStyle(parent);
            const box = parent.getBoundingClientRect();
            if (style.visibility === 'hidden' || box.width === 0 || box.height === 0) continue;
            // A block scaled with CSS zoom reports its font size before the zoom.
            const drawn = parseFloat(style.fontSize) * (parent.currentCSSZoom ?? 1) * scale;
            if (drawn < 15.95) found.push(`${drawn.toFixed(1)} px: ${text.slice(0, 40)}`);
          }
          return found;
        });
        expect(small, `slide ${index + 1}`).toEqual([]);
      }
    });

    test('keeps every slide within the width of the window and lets a tall one scroll @REQ DECK-032', async ({ page }) => {
      for (let index = 0; index < descriptor.slides; index += 1) {
        await show(page, index);
        const measured = await onActive(page, (slide) => {
          const edge = slide.getBoundingClientRect();
          const outside = [...slide.querySelectorAll('*')]
            .filter((element) => {
              if (element.closest('svg') && element.tagName.toLowerCase() !== 'svg') return false;
              const box = element.getBoundingClientRect();
              if (box.width === 0 || box.height === 0) return false;
              // A picture may be cropped by the box that holds it; the box is what counts.
              let holder = element.parentElement;
              while (holder && holder !== slide) {
                if (getComputedStyle(holder).overflow !== 'visible') return false;
                holder = holder.parentElement;
              }
              return box.left < edge.left - 1 || box.right > edge.right + 1;
            })
            .map((element) => `${element.tagName.toLowerCase()}.${element.className}`.slice(0, 50));
          return {
            outside: [...new Set(outside)],
            taller: slide.scrollHeight > slide.clientHeight + 1,
            overflowY: getComputedStyle(slide).overflowY,
            overflowX: getComputedStyle(slide).overflowX,
          };
        });
        expect(measured.outside, `slide ${index + 1} has content beyond the sides`).toEqual([]);
        expect(measured.overflowX, `slide ${index + 1}`).toBe('hidden');
        if (measured.taller) expect(measured.overflowY, `slide ${index + 1} is cut off`).toBe('auto');
      }
    });

    test('puts a full-bleed picture above its words @REQ DECK-033', async ({ page }) => {
      let checked = 0;
      for (let index = 0; index < descriptor.slides; index += 1) {
        await show(page, index);
        const order = await onActive(page, (slide) => {
          const plate = slide.querySelector(':scope > .fb-plate');
          const copy = slide.querySelector(':scope > .fb-copy, :scope > .cover-copy');
          if (!slide.classList.contains('fb') || !plate || !copy) return null;
          return { plateBottom: plate.getBoundingClientRect().bottom, copyTop: copy.getBoundingClientRect().top, plateHeight: plate.getBoundingClientRect().height };
        });
        if (!order) continue;
        checked += 1;
        expect(order.plateHeight, `slide ${index + 1} picture`).toBeGreaterThan(120);
        expect(order.copyTop, `slide ${index + 1}`).toBeGreaterThanOrEqual(order.plateBottom - 1);
      }
      expect(checked).toBeGreaterThan(3);
    });

    test('turns the page on a sideways swipe @REQ DECK-034', async ({ page }) => {
      const active = () => page.evaluate(() => document.querySelector('deck-stage').index);
      expect(await active()).toBe(0);

      await swipe(page, 320, 80);
      await expect.poll(active).toBe(1);
      await swipe(page, 320, 80);
      await expect.poll(active).toBe(2);
      await swipe(page, 80, 320);
      await expect.poll(active).toBe(1);

      // A short drag, or one that is mostly up and down, is not a swipe.
      await swipe(page, 200, 170);
      await page.evaluate(() => {
        const stage = document.querySelector('deck-stage');
        const finger = (x, y) => new Touch({ identifier: 2, target: stage, clientX: x, clientY: y });
        stage.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, composed: true, touches: [finger(300, 700)], changedTouches: [finger(300, 700)] }));
        stage.dispatchEvent(new TouchEvent('touchend', { bubbles: true, composed: true, touches: [], changedTouches: [finger(220, 300)] }));
      });
      expect(await active()).toBe(1);
    });

    test('goes back to the 16:9 stage when the window is no longer upright @REQ DECK-035', async ({ page }) => {
      const stageSize = () =>
        page.evaluate(() => {
          const stage = document.querySelector('deck-stage');
          return `${stage.getAttribute('width')}x${stage.getAttribute('height')} ${document.documentElement.hasAttribute('data-upright')}`;
        });
      await expect.poll(stageSize).toBe('540x1169 true');

      await page.setViewportSize({ width: 844, height: 390 });
      await expect.poll(stageSize).toBe('1920x1080 false');
      const side = await onActive(page, (slide) => {
        const edge = slide.getBoundingClientRect();
        return edge.width / edge.height;
      });
      expect(side).toBeCloseTo(16 / 9, 2);

      await page.setViewportSize(PHONE);
      await expect.poll(stageSize).toBe('540x1169 true');
    });
  });
}
