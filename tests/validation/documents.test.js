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

/** The vendored bundles, keyed by the constant each runtime declares for it. */
const BUNDLE_FILES = {
  REACT: 'vendor/react.production.min.js',
  REACT_DOM: 'vendor/react-dom.production.min.js',
  BABEL: 'vendor/babel.min.js',
};

/** The same three paths as a list. Derived, so the two cannot drift apart. */
const VENDORED = Object.values(BUNDLE_FILES);

/**
 * Every copy of the runtime in the repository.
 *
 * The beta prototype carries its own build so it can move independently of the
 * decks. Both copies declare the same three bundle URLs and the same three
 * integrity digests, and both are checked below: a second copy is exactly where a
 * remote URL can hide from the `<script src>` analysis SITE-001 performs.
 */
const RUNTIMES = ['support.js', 'beta/pocket-planetarium/support.js'];

/** `var BABEL_URL = "vendor/babel.min.js"` -> { REACT, REACT_DOM, BABEL }. */
function declaredUrls(source) {
  return Object.fromEntries(
    [...source.matchAll(/var (REACT|REACT_DOM|BABEL)_URL = "([^"]*)"/g)].map((m) => [m[1], m[2]]),
  );
}

/** `var BABEL_SRI = "sha384-..."` -> { REACT, REACT_DOM, BABEL }. */
function declaredDigests(source) {
  return Object.fromEntries(
    [...source.matchAll(/var (REACT|REACT_DOM|BABEL)_SRI = "sha384-([A-Za-z0-9+/=]+)"/g)].map((m) => [m[1], m[2]]),
  );
}

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

test('every runtime loads its bundles from vendor/ rather than a remote origin @REQ SITE-019', async () => {
  const remote = [];
  for (const runtime of RUNTIMES) {
    const urls = declaredUrls(await readRepoFile(runtime));
    assert.equal(
      Object.keys(urls).length,
      3,
      `expected three bundle URL declarations in ${runtime}, found ${Object.keys(urls).length}`,
    );
    for (const [key, url] of Object.entries(urls)) {
      if (!isLocalReference(url)) remote.push(`${runtime} -> ${key}_URL = "${url}"`);
      else if (url !== BUNDLE_FILES[key]) {
        remote.push(`${runtime} -> ${key}_URL = "${url}" (expected "${BUNDLE_FILES[key]}")`);
      }
    }
  }
  assert.deepEqual(
    remote,
    [],
    'SITE-001 reads <script src> out of the HTML, so it cannot see a URL held in a variable\n' +
      'inside a runtime. That is where the Pocket Planetarium hid a dependency on unpkg until\n' +
      'RFC 0003. This check reads the runtimes themselves:\n' +
      `  ${remote.join('\n  ')}`,
  );
});

test('each vendored bundle matches the SRI digest every runtime declares @REQ SITE-016', async () => {
  // Hash each bundle once, not once per runtime: babel.min.js alone is 3MB.
  const actualDigests = {};
  for (const [key, file] of Object.entries(BUNDLE_FILES)) {
    const bytes = await readFile(join(REPO_ROOT, file));
    actualDigests[key] = createHash('sha384').update(bytes).digest('base64');
  }

  const mismatches = [];
  for (const runtime of RUNTIMES) {
    const declared = declaredDigests(await readRepoFile(runtime));
    assert.equal(
      Object.keys(declared).length,
      3,
      `expected three SRI declarations in ${runtime}, found ${Object.keys(declared).length}`,
    );

    for (const [key, file] of Object.entries(BUNDLE_FILES)) {
      if (actualDigests[key] !== declared[key]) {
        mismatches.push(
          `${runtime} -> ${file}\n      declared sha384-${declared[key]}\n      actual   sha384-${actualDigests[key]}`,
        );
      }
    }
  }

  assert.deepEqual(
    mismatches,
    [],
    'Vendored bundle bytes do not match their integrity digests, so the browser will refuse to\n' +
      'execute them and the affected pages will render blank.\n' +
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
