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
