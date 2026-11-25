import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseResult, unexpectedDiagnostics } from '../scripts/check-diagnostics.mjs';

test('new errors are rejected even when an old error disappears', () => {
  assert.deepEqual(unexpectedDiagnostics(['old', 'new'], ['old', 'fixed']), ['new']);
  assert.deepEqual(unexpectedDiagnostics(['old', 'old'], ['old']), ['old']);
});

test('tool failures cannot masquerade as clean diagnostics', () => {
  assert.throws(() => parseResult('tsc', { status: 1, stdout: '', stderr: 'crashed' }));
  assert.throws(() => parseResult('tsc', { status: 2, stdout: 'compiler failed', stderr: '' }));
  assert.throws(() => parseResult('eslint', { status: 2, stdout: '', stderr: 'crashed' }));
  assert.throws(() => parseResult('eslint', { status: 1, stdout: '[]', stderr: '' }));
});
