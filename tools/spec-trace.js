#!/usr/bin/env node
/**
 * Requirement ↔ test traceability checker.
 *
 * Reads the normative requirement tables in `docs/specs/*.spec.md` and the
 * `@REQ <ID>` annotations in `tests/`, then reports the gaps between them:
 *
 *   - a MUST-level requirement with no test        → error (an unkept promise)
 *   - an annotation naming an unknown requirement  → error (a stale test)
 *   - an identifier defined more than once         → error (an allocation clash)
 *   - a SHOULD-level requirement with no test      → reported, not fatal
 *
 * See docs/rfcs/0001-rfc-process.md for the process this enforces.
 *
 * Usage: node tools/spec-trace.js [--json]
 */
import { readdir, readFile } from 'node:fs/promises';
import { join, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO_ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const SPEC_DIR = join(REPO_ROOT, 'docs', 'specs');
const TEST_DIR = join(REPO_ROOT, 'tests');

/** A requirement table row: | `AREA-001` | MUST | text | */
const REQUIREMENT_ROW =
  /^\|\s*`([A-Z]{3,6}-\d{3})`\s*\|\s*(MUST NOT|MUST|SHOULD NOT|SHOULD|MAY)\s*\|\s*(.+?)\s*\|\s*$/;

/** An annotation in a test title: @REQ AREA-001 */
const REQUIREMENT_ANNOTATION = /@REQ\s+([A-Z]{3,6}-\d{3})/g;

const MANDATORY_LEVELS = new Set(['MUST', 'MUST NOT']);

async function walk(dir, predicate) {
  const found = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return found;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      found.push(...(await walk(full, predicate)));
    } else if (predicate(entry.name)) {
      found.push(full);
    }
  }
  return found;
}

/** Parse every requirement defined across the specification files. */
export async function readRequirements() {
  const files = await walk(SPEC_DIR, (name) => name.endsWith('.spec.md'));
  const requirements = new Map();
  const duplicates = [];

  for (const file of files.sort()) {
    const lines = (await readFile(file, 'utf8')).split(/\r?\n/);
    lines.forEach((line, index) => {
      const match = line.match(REQUIREMENT_ROW);
      if (!match) return;
      const [, id, level, text] = match;
      const location = `${relative(REPO_ROOT, file)}:${index + 1}`;
      if (requirements.has(id)) {
        duplicates.push({ id, first: requirements.get(id).location, second: location });
        return;
      }
      requirements.set(id, { id, level, text, location });
    });
  }

  return { requirements, duplicates };
}

/** Collect every `@REQ` annotation, mapped to the files that reference it. */
export async function readAnnotations() {
  const files = await walk(TEST_DIR, (name) => name.endsWith('.js'));
  const annotations = new Map();

  for (const file of files.sort()) {
    const contents = await readFile(file, 'utf8');
    for (const match of contents.matchAll(REQUIREMENT_ANNOTATION)) {
      const id = match[1];
      if (!annotations.has(id)) annotations.set(id, new Set());
      annotations.get(id).add(relative(REPO_ROOT, file).replace(/\\/g, '/'));
    }
  }

  return annotations;
}

/** Cross-reference requirements against annotations. */
export async function analyze() {
  const { requirements, duplicates } = await readRequirements();
  const annotations = await readAnnotations();

  const untestedMandatory = [];
  const untestedAdvisory = [];
  for (const requirement of requirements.values()) {
    if (annotations.has(requirement.id)) continue;
    if (MANDATORY_LEVELS.has(requirement.level)) untestedMandatory.push(requirement);
    else untestedAdvisory.push(requirement);
  }

  const unknown = [];
  for (const [id, files] of annotations) {
    if (!requirements.has(id)) unknown.push({ id, files: [...files] });
  }

  const covered = [...requirements.values()].filter((r) => annotations.has(r.id));

  return {
    requirements,
    annotations,
    duplicates,
    untestedMandatory,
    untestedAdvisory,
    unknown,
    counts: {
      total: requirements.size,
      covered: covered.length,
      mandatory: [...requirements.values()].filter((r) => MANDATORY_LEVELS.has(r.level)).length,
    },
    ok: duplicates.length === 0 && untestedMandatory.length === 0 && unknown.length === 0,
  };
}

function report(result) {
  const { counts, duplicates, untestedMandatory, untestedAdvisory, unknown } = result;

  process.stdout.write('\nRequirement traceability\n');
  process.stdout.write(`  ${counts.total} requirements defined (${counts.mandatory} mandatory)\n`);
  process.stdout.write(`  ${counts.covered} covered by at least one test\n\n`);

  for (const { id, first, second } of duplicates) {
    process.stdout.write(`  ERROR  ${id} defined twice — ${first} and ${second}\n`);
  }
  for (const requirement of untestedMandatory) {
    process.stdout.write(`  ERROR  ${requirement.id} (${requirement.level}) has no test — ${requirement.location}\n`);
  }
  for (const { id, files } of unknown) {
    process.stdout.write(`  ERROR  @REQ ${id} names no requirement — ${files.join(', ')}\n`);
  }
  for (const requirement of untestedAdvisory) {
    process.stdout.write(`  note   ${requirement.id} (${requirement.level}) has no test — ${requirement.location}\n`);
  }

  process.stdout.write(result.ok ? '\n  Traceability OK\n\n' : '\n  Traceability FAILED\n\n');
}

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isMain) {
  const result = await analyze();
  if (process.argv.includes('--json')) {
    const { requirements, annotations, ...rest } = result;
    process.stdout.write(`${JSON.stringify(rest, null, 2)}\n`);
  } else {
    report(result);
  }
  process.exit(result.ok ? 0 : 1);
}
