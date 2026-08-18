/**
 * Validation — document conformance, dependency policy, and deploy artefacts.
 *
 * The dependency rules here are the static half of the guarantee; the runtime
 * half lives in tests/regression/invariants.spec.js, which watches what a real
 * browser actually requests.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  listPages,
  readRepoFile,
  exists,
  extractScriptSources,
  extractSubresourceUrls,
  extractImgTags,
  isLocalReference,
  APPROVED_EXTERNAL_ORIGINS,
  REPO_ROOT,
} from '../support/repo.js';

const VENDORED = [
  'vendor/react.production.min.js',
  'vendor/react-dom.production.min.js',
  'vendor/babel.min.js',
];

test('no page loads a script from a third-party origin @REQ SITE-001', async () => {
  const remote = [];
  for (const page of await listPages()) {
    for (const source of extractScriptSources(await readRepoFile(page))) {
      if (!isLocalReference(source)) remote.push(`${page} → <script src="${source}">`);
    }
  }
  assert.deepEqual(remote, [], `Remote scripts (React and Babel are vendored deliberately):\n  ${remote.join('\n  ')}`);
});

test('external subresources are limited to the approved font origins @REQ SITE-015', async () => {
  const unapproved = [];
  for (const page of await listPages()) {
    for (const url of extractSubresourceUrls(await readRepoFile(page))) {
      if (!/^https?:\/\//i.test(url.trim())) continue;
      const approved = APPROVED_EXTERNAL_ORIGINS.some((origin) => url.startsWith(origin));
      if (!approved) unapproved.push(`${page} → ${url}`);
    }
  }
  assert.deepEqual(
    unapproved,
    [],
    `Unapproved external subresources (outbound <a href> links are exempt by design):\n  ${unapproved.join('\n  ')}`,
  );
});

test('the vendored runtime files are present and non-empty @REQ SITE-009', async () => {
  for (const file of VENDORED) {
    assert.ok(await exists(file), `${file} is missing — the pages would fall back to nothing`);
    const contents = await readRepoFile(file);
    assert.ok(contents.length > 1000, `${file} is suspiciously small (${contents.length} bytes)`);
  }
});

test('each vendored bundle matches the SRI digest support.js declares @REQ SITE-016', async () => {
  const runtime = await readRepoFile('support.js');
  const declared = Object.fromEntries(
    [...runtime.matchAll(/var (REACT|REACT_DOM|BABEL)_SRI = "sha384-([A-Za-z0-9+/=]+)"/g)].map((m) => [m[1], m[2]]),
  );
  assert.equal(Object.keys(declared).length, 3, 'expected three SRI declarations in support.js');

  const files = {
    REACT: 'vendor/react.production.min.js',
    REACT_DOM: 'vendor/react-dom.production.min.js',
    BABEL: 'vendor/babel.min.js',
  };

  const mismatches = [];
  for (const [key, file] of Object.entries(files)) {
    const bytes = await readFile(join(REPO_ROOT, file));
    const actual = createHash('sha384').update(bytes).digest('base64');
    if (actual !== declared[key]) mismatches.push(`${file}\n      declared sha384-${declared[key]}\n      actual   sha384-${actual}`);
  }

  assert.deepEqual(
    mismatches,
    [],
    'Vendored bundle bytes do not match their integrity digests, so the browser will refuse to\n' +
      'execute them and every .dc.html page will render blank.\n' +
      'The usual cause is a checkout that rewrote LF to CRLF; .gitattributes should prevent it.\n' +
      `  ${mismatches.join('\n  ')}`,
  );
});

test('every page declares encoding, language, viewport, and a title @REQ SITE-003', async () => {
  const problems = [];
  for (const page of await listPages()) {
    const contents = await readRepoFile(page);
    if (!/<meta\s+charset=/i.test(contents)) problems.push(`${page}: no charset`);
    if (!/<html[^>]*\blang\s*=\s*"[^"]+"/i.test(contents)) problems.push(`${page}: no lang on <html>`);
    if (!/<meta\s+name="viewport"/i.test(contents)) problems.push(`${page}: no viewport`);
    const title = contents.match(/<title>([^<]*)<\/title>/i);
    if (!title || title[1].trim() === '') problems.push(`${page}: no title`);
  }
  assert.deepEqual(problems, [], `Document conformance:\n  ${problems.join('\n  ')}`);
});

test('every page declares a meta description @REQ SITE-013', async () => {
  const problems = [];
  for (const page of await listPages()) {
    const contents = await readRepoFile(page);
    const tag = contents.match(/<meta\s+name="description"\s+content="([^"]*)"/i);
    if (!tag) problems.push(`${page}: no meta description`);
    else if (tag[1].trim().length < 40) {
      // A description short enough to be a placeholder is worse than none: it
      // satisfies the check while telling a search result or a shared link
      // nothing. The shortest real one here is 118 characters.
      problems.push(`${page}: meta description is only ${tag[1].trim().length} characters`);
    }
  }
  assert.deepEqual(problems, [], `Pages needing a description:\n  ${problems.join('\n  ')}`);
});

test('every image carries an alt attribute @REQ SITE-012', async () => {
  const missing = [];
  for (const page of await listPages()) {
    for (const tag of extractImgTags(await readRepoFile(page))) {
      if (!/\balt\s*=/.test(tag)) missing.push(`${page} → ${tag.slice(0, 90)}`);
    }
  }
  assert.deepEqual(missing, [], `Images without alt (use alt="" for decorative art):\n  ${missing.join('\n  ')}`);
});

test('.nojekyll is present so Pages serves underscore directories @REQ SITE-004', async () => {
  assert.ok(
    await exists('.nojekyll'),
    'Without .nojekyll, Pages runs Jekyll and strips beta/pocket-planetarium/_ds/, breaking the beta in production only',
  );
  assert.ok(await exists('beta/pocket-planetarium/_ds'), 'the underscore directory .nojekyll protects should exist');
});

test('licence-encumbered textures are present and attributed @REQ SITE-005', async () => {
  for (const texture of ['textures/moon.jpg', 'textures/saturn_ring.png']) {
    assert.ok(await exists(texture), `${texture} is missing`);
  }
  const readme = await readRepoFile('README.md');
  assert.match(readme, /CC BY 4\.0/, 'README must state the CC BY 4.0 terms');
  assert.match(readme, /Solar System\s*\n?\s*Scope/, 'README must attribute Solar System Scope');
});

test('development artefacts are not tracked in version control @REQ SITE-014', () => {
  const tracked = execFileSync('git', ['ls-files'], { cwd: REPO_ROOT, encoding: 'utf8' }).split('\n');
  const leaked = tracked.filter((file) =>
    /^(node_modules|test-results|playwright-report)\//.test(file) || file.endsWith('.log'),
  );
  assert.deepEqual(leaked, [], `Development artefacts committed:\n  ${leaked.join('\n  ')}`);
});
