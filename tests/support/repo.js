/**
 * Static analysis helpers shared by the validation tests.
 *
 * These read the repository as text rather than rendering it. The pages use a
 * declarative template syntax (`<x-dc>`, `<x-import>`, `{{ expression }}`), so a
 * conventional HTML parser would reject them; the extractors below understand
 * enough of the syntax to reason about references without evaluating them.
 */
import { readdir, readFile, stat } from 'node:fs/promises';
import { dirname, join, resolve, relative, posix } from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO_ROOT = resolve(fileURLToPath(new URL('../..', import.meta.url)));

/** Origins the site is permitted to reach out to. See SITE-001 / SITE-008. */
export const APPROVED_EXTERNAL_ORIGINS = [
  'https://fonts.googleapis.com',
  'https://fonts.gstatic.com',
];

/** Files that are development tooling, not part of the published site. */
const NON_SITE_DIRS = new Set(['node_modules', 'tests', 'tools', 'docs', 'test-results', 'playwright-report']);

/** Every page: the HTML documents at the repository root. */
export async function listPages() {
  const entries = await readdir(REPO_ROOT, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.html'))
    .map((entry) => entry.name)
    .sort();
}

/** Every stylesheet tracked in the site tree. */
export async function listStylesheets() {
  return walk(REPO_ROOT, (name) => name.endsWith('.css'));
}

async function walk(dir, predicate) {
  const found = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith('.') || NON_SITE_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...(await walk(full, predicate)));
    else if (predicate(entry.name)) found.push(relative(REPO_ROOT, full).replace(/\\/g, '/'));
  }
  return found;
}

export function readRepoFile(relativePath) {
  return readFile(join(REPO_ROOT, relativePath), 'utf8');
}

export async function exists(relativePath) {
  try {
    await stat(join(REPO_ROOT, relativePath));
    return true;
  } catch {
    return false;
  }
}

/**
 * A reference is "local" when it points at a file in this repository: not an
 * absolute URL, a bare fragment, a data/mailto URI, or a runtime-evaluated
 * template expression such as `src="{{ p.src }}"`.
 */
export function isLocalReference(value) {
  if (!value) return false;
  const trimmed = value.trim();
  if (trimmed === '') return false;
  if (trimmed.includes('{{')) return false;
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return false; // http:, https:, data:, mailto:
  if (trimmed.startsWith('//')) return false;
  if (trimmed.startsWith('#')) return false;
  return true;
}

/** Strip the query string and fragment: `deck-cinema.js?v=2` → `deck-cinema.js`. */
export function referencePath(value) {
  return value.trim().split('#')[0].split('?')[0];
}

/** Resolve a reference found in `fromFile` to a repository-relative path. */
export function resolveReference(fromFile, value) {
  const base = posix.dirname(fromFile.replace(/\\/g, '/'));
  const target = referencePath(value);
  const joined = target.startsWith('/')
    ? target.slice(1)
    : posix.normalize(posix.join(base === '.' ? '' : base, target));
  return joined.replace(/\/$/, '') || 'index.html';
}

const ATTRIBUTE_REFERENCE = /\b(?:href|src)\s*=\s*"([^"]*)"/gi;
const CSS_URL_REFERENCE = /url\(\s*['"]?([^'")]+)['"]?\s*\)/gi;

/** Every href/src value in a document, with the attribute matches in order. */
export function extractAttributeReferences(contents) {
  return [...contents.matchAll(ATTRIBUTE_REFERENCE)].map((match) => match[1]);
}

/** Every `url(...)` target in a stylesheet or inline <style> block. */
export function extractCssReferences(contents) {
  return [...contents.matchAll(CSS_URL_REFERENCE)].map((match) => match[1]);
}

/** All references from a document that point into the repository. */
export function extractLocalReferences(contents) {
  return [...extractAttributeReferences(contents), ...extractCssReferences(contents)]
    .filter(isLocalReference)
    .map(referencePath);
}

/** Absolute http(s) URLs a document mentions, hyperlinks included. */
export function extractExternalUrls(contents) {
  return [...extractAttributeReferences(contents), ...extractCssReferences(contents)].filter((value) =>
    /^https?:\/\//i.test(value.trim()),
  );
}

/**
 * URLs the browser fetches on its own: any `src`, any `<link href>`, and any CSS
 * `url()`. Deliberately excludes `<a href>` — an outbound hyperlink costs the
 * reader nothing until they click it, and the site links out freely by design.
 */
export function extractSubresourceUrls(contents) {
  const fromSrc = [...contents.matchAll(/\bsrc\s*=\s*"([^"]*)"/gi)].map((match) => match[1]);
  const fromLink = [...contents.matchAll(/<link\b[^>]*\bhref\s*=\s*"([^"]*)"/gi)].map((match) => match[1]);
  return [...fromSrc, ...fromLink, ...extractCssReferences(contents)];
}

/** `<script src="...">` values, used to enforce the no-remote-code rule. */
export function extractScriptSources(contents) {
  return [...contents.matchAll(/<script\b[^>]*\bsrc\s*=\s*"([^"]*)"/gi)].map((match) => match[1]);
}

export function extractIds(contents) {
  return [...contents.matchAll(/\bid\s*=\s*"([^"{}]+)"/gi)].map((match) => match[1]);
}

/** Fragment targets: href="#decks" → "decks". Ignores the bare "#". */
export function extractFragmentTargets(contents) {
  return extractAttributeReferences(contents)
    .filter((value) => value.startsWith('#') && value.length > 1)
    .map((value) => value.slice(1));
}

export function extractImgTags(contents) {
  return [...contents.matchAll(/<img\b[^>]*>/gi)].map((match) => match[0]);
}

/** Slides in a deck are the top-level <section> elements of the document. */
export function countSlides(contents) {
  return [...contents.matchAll(/<section\b/gi)].length;
}

export { dirname, join, relative };
