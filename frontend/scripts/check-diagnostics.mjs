import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { relative } from 'node:path';
import { pathToFileURL } from 'node:url';

export function unexpectedDiagnostics(actual, baseline) {
  const remaining = [...baseline];
  return actual.filter((item) => {
    const index = remaining.indexOf(item);
    if (index < 0) return true;
    remaining.splice(index, 1);
    return false;
  });
}

export function parseResult(kind, result) {
  if (result.error || result.signal || ![0, 1, ...(kind === 'tsc' ? [2] : [])].includes(result.status)) throw new Error(`${kind} could not run: ${result.error || result.stderr || result.signal || result.status}`);
  if (kind === 'eslint') {
    const files = JSON.parse(result.stdout);
    const errors = files.flatMap((file) => file.messages.filter((message) => message.severity === 2).map((message) => {
      if (message.fatal) throw new Error(`ESLint fatal error: ${message.message}`);
      return `${relative(process.cwd(), file.filePath)}:${message.line}:${message.column} ${message.ruleId} ${message.message}`;
    }));
    if ((result.status === 0) !== (errors.length === 0)) throw new Error('ESLint exit status does not match its diagnostics');
    return errors;
  }
  const output = result.stdout.trim();
  const diagnostics = output ? output.split(/\r?\n/).filter((line) => /\berror TS\d+:/.test(line)) : [];
  if (result.stderr || (result.status === 0 && output) || (result.status !== 0 && (result.status !== 2 || !diagnostics.length))) throw new Error(`TypeScript failed unexpectedly: ${result.stderr || output}`);
  return diagnostics;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const kind = process.argv[2];
  if (!['eslint', 'tsc'].includes(kind)) throw new Error('Expected eslint or tsc');
  const args = kind === 'eslint' ? ['.', '-f', 'json'] : ['--noEmit', '-p', '.', '--pretty', 'false'];
  try {
    const result = spawnSync(`./node_modules/.bin/${kind}`, args, { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
    const actual = parseResult(kind, result);
    const baseline = JSON.parse(readFileSync(new URL(`./${kind}-baseline.json`, import.meta.url), 'utf8'));
    const unexpected = unexpectedDiagnostics(actual, baseline);
    if (unexpected.length) throw new Error(`New ${kind} diagnostics:\n${unexpected.join('\n')}`);
    console.log(`${kind}: ${actual.length} existing diagnostics, no new errors`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
