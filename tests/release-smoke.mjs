// Explicit release verification against public GitHub, not part of offline unit tests.
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { promisify } from 'node:util';
const exec = promisify(execFile);
const { version } = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
for (const name of ['atomic-doc-reading', 'atomic-doc-writing']) {
  const runner = new URL(`../skills/${name}/scripts/sonner.mjs`, import.meta.url);
  const { fileURLToPath } = await import('node:url');
  const run = (...args) => exec(process.execPath, [fileURLToPath(runner), ...args], { timeout: 90_000, maxBuffer: 4 * 1024 * 1024 });
  assert.equal((await run('--version')).stdout.trim(), version);
  const projection = JSON.parse((await run('--json')).stdout);
  assert.equal(projection.version, 1);
  assert.equal(projection.files.root.type, 'directory');
  assert.equal(projection.warnings?.length ?? 0, 0);
  console.log(`${name}: public release acquisition and project reading passed (${version})`);
}
