/**
 * Validation — documentation that must stay true to the build.
 *
 * These exist because the README had already drifted: it described the JunoCam
 * deck as 13 slides when the file contained 11, and documented the beta in one
 * sentence while three files implementing it sat in the repository. Nothing about
 * editing a deck forces anyone to reopen the README, so a test does it instead.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { listPages, readRepoFile, exists, countSlides, REPO_ROOT } from '../support/repo.js';

/** `| [`the-moons.dc.html`](…) | 18 slides | … |` → { file, slides } */
const README_SLIDE_ROW = /^\|\s*\[`([^`]+)`\]\([^)]*\)\s*\|\s*(\d+)\s+slides\s*\|/gm;
/** Markdown links whose target is a path inside the repository. */
const MARKDOWN_LINK = /\[[^\]]*\]\(([^)]+)\)/g;
const RFC_STATUSES = new Set(['Draft', 'Accepted', 'Implemented', 'Rejected', 'Superseded']);

test('README slide counts match the decks they describe @REQ DOCS-005', async () => {
  const readme = await readRepoFile('README.md');
  const rows = [...readme.matchAll(README_SLIDE_ROW)];
  assert.ok(rows.length >= 3, 'expected the README table to state slide counts for the decks');

  const mismatches = [];
  for (const [, file, claimed] of rows) {
    assert.ok(await exists(file), `README describes ${file}, which does not exist`);
    const actual = countSlides(await readRepoFile(file));
    if (actual !== Number(claimed)) mismatches.push(`${file}: README says ${claimed}, file has ${actual}`);
  }
  assert.deepEqual(mismatches, [], `Slide counts out of date:\n  ${mismatches.join('\n  ')}`);
});

test('every published page is listed in the README @REQ DOCS-006', async () => {
  const readme = await readRepoFile('README.md');
  const missing = (await listPages()).filter((page) => !readme.includes(page));
  assert.deepEqual(missing, [], `Pages the README does not mention:\n  ${missing.join('\n  ')}`);
});

test('every repository-relative link in the README resolves @REQ DOCS-007', async () => {
  const readme = await readRepoFile('README.md');
  const broken = [];
  for (const [, target] of readme.matchAll(MARKDOWN_LINK)) {
    if (/^(https?:|mailto:|#)/i.test(target)) continue;
    const path = target.split('#')[0].replace(/\/$/, '');
    if (path === '') continue;
    if (!(await exists(path))) broken.push(target);
  }
  assert.deepEqual(broken, [], `README links that go nowhere:\n  ${broken.join('\n  ')}`);
});

test('image counts stated in the README match the archive @REQ DOCS-008', async () => {
  const readme = await readRepoFile('README.md');
  const frames = (await readdir(join(REPO_ROOT, 'images'))).filter((name) => name.endsWith('.png'));
  assert.equal(frames.length, 30, 'the JunoCam archive is expected to hold 30 frames');
  assert.match(
    readme,
    /thirty processed Jupiter frames/,
    'the README describes the explorer contents; update the wording if the archive changes',
  );
});

test('every RFC carries valid front matter and a known status @REQ DOCS-004', async () => {
  const dir = join(REPO_ROOT, 'docs', 'rfcs');
  const files = (await readdir(dir)).filter((name) => name.endsWith('.md') && name !== '0000-template.md');
  assert.ok(files.length > 0, 'expected at least one RFC');

  const problems = [];
  for (const file of files) {
    const contents = await readRepoFile(`docs/rfcs/${file}`);
    const frontMatter = contents.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!frontMatter) {
      problems.push(`${file}: no front matter`);
      continue;
    }
    const fields = Object.fromEntries(
      frontMatter[1]
        .split(/\r?\n/)
        .map((line) => line.match(/^([a-z-]+):\s*(.*)$/))
        .filter(Boolean)
        .map((match) => [match[1], match[2].trim()]),
    );
    for (const required of ['rfc', 'title', 'status', 'created']) {
      if (!fields[required]) problems.push(`${file}: missing "${required}"`);
    }
    if (fields.status && !RFC_STATUSES.has(fields.status)) {
      problems.push(`${file}: unknown status "${fields.status}"`);
    }
    if (fields.rfc && !file.startsWith(String(fields.rfc).padStart(4, '0'))) {
      problems.push(`${file}: front matter number ${fields.rfc} does not match the filename`);
    }
  }
  assert.deepEqual(problems, [], `RFC front matter:\n  ${problems.join('\n  ')}`);
});
