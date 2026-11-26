/**
 * Validation — referential integrity.
 *
 * With no build step, a mistyped path is not a compile error; it is a missing
 * image on the live site. These tests are the compiler this project does not have.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  listPages,
  listStylesheets,
  readRepoFile,
  exists,
  extractLocalReferences,
  extractFragmentTargets,
  extractIds,
  resolveReference,
} from '../support/repo.js';

test('every local reference in a page resolves to a file @REQ SITE-002', async () => {
  const broken = [];
  for (const page of await listPages()) {
    const contents = await readRepoFile(page);
    for (const reference of extractLocalReferences(contents)) {
      const target = resolveReference(page, reference);
      if (!(await exists(target))) broken.push(`${page} → ${reference} (resolved: ${target})`);
    }
  }
  assert.deepEqual(broken, [], `Unresolved references:\n  ${broken.join('\n  ')}`);
});

test('every local reference in a stylesheet resolves to a file @REQ SITE-002', async () => {
  const broken = [];
  for (const sheet of await listStylesheets()) {
    const contents = await readRepoFile(sheet);
    for (const reference of extractLocalReferences(contents)) {
      const target = resolveReference(sheet, reference);
      if (!(await exists(target))) broken.push(`${sheet} → ${reference} (resolved: ${target})`);
    }
  }
  assert.deepEqual(broken, [], `Unresolved references:\n  ${broken.join('\n  ')}`);
});

test('every in-page fragment link points at an element that exists @REQ SITE-010', async () => {
  const dangling = [];
  for (const page of await listPages()) {
    const contents = await readRepoFile(page);
    const ids = new Set(extractIds(contents));
    for (const target of extractFragmentTargets(contents)) {
      if (!ids.has(target)) dangling.push(`${page} → #${target}`);
    }
  }
  assert.deepEqual(dangling, [], `Fragment links with no target:\n  ${dangling.join('\n  ')}`);
});

test('element identifiers are unique within each page @REQ SITE-011', async () => {
  const collisions = [];
  for (const page of await listPages()) {
    const seen = new Set();
    for (const id of extractIds(await readRepoFile(page))) {
      if (seen.has(id)) collisions.push(`${page} → duplicate id="${id}"`);
      seen.add(id);
    }
  }
  assert.deepEqual(collisions, [], `Duplicate identifiers:\n  ${collisions.join('\n  ')}`);
});

/**
 * The explorer builds its image paths at run time, from each frame's name and a
 * list of the widths it is held at, so the reference checks above cannot see
 * them. A width listed without its file shows a broken picture at exactly the
 * window size or zoom that asks for it, and nowhere else. This reads the list
 * the page carries and checks every file it could ask for.
 */
test('every frame file the explorer can ask for exists @REQ EXPL-020', async () => {
  const source = await readRepoFile('junocam-explorer.dc.html');
  const frames = [...source.matchAll(/name:'([^']+)',[^\n]*?widths:\[([\d,]+)\]/g)];
  assert.equal(frames.length, 30, 'expected the explorer to carry thirty frames, each with a list of widths');

  const missing = [];
  for (const [, name, widths] of frames) {
    for (const width of widths.split(',')) {
      const file = `images/${name}-${width}.webp`;
      if (!(await exists(file))) missing.push(file);
    }
  }
  assert.deepEqual(missing, []);
});
