/**
 * Validation — the specification/test traceability contract itself.
 *
 * tools/spec-trace.js does the analysis; this asserts on it so that the contract
 * is enforced by the same test run as everything else, and so that the
 * requirements describing traceability are themselves traceable.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyze } from '../../tools/spec-trace.js';

test('every mandatory requirement is covered by a test @REQ DOCS-001', async () => {
  const { untestedMandatory } = await analyze();
  const uncovered = untestedMandatory.map((r) => `${r.id} — ${r.location}`);
  assert.deepEqual(
    uncovered,
    [],
    `MUST-level requirements with no @REQ annotation:\n  ${uncovered.join('\n  ')}\n` +
      'Either write the test, or downgrade the requirement in the specification and say why.',
  );
});

test('every @REQ annotation names a requirement that exists @REQ DOCS-002', async () => {
  const { unknown } = await analyze();
  const stale = unknown.map(({ id, files }) => `${id} — referenced by ${files.join(', ')}`);
  assert.deepEqual(stale, [], `Annotations with no matching requirement:\n  ${stale.join('\n  ')}`);
});

test('requirement identifiers are unique across the specifications @REQ DOCS-003', async () => {
  const { duplicates } = await analyze();
  const clashes = duplicates.map(({ id, first, second }) => `${id} — ${first} and ${second}`);
  assert.deepEqual(clashes, [], `Identifiers defined more than once:\n  ${clashes.join('\n  ')}`);
});
