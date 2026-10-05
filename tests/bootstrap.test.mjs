import test from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import os from 'node:os';
import { ensureCli, VERSION, PACKAGE, PACKAGE_SPEC } from '../skills/atomic-doc-reading/scripts/sonner.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const exec = promisify(execFile);
async function cache() { return mkdtemp(path.join(os.tmpdir(), 'atomic-doc-cache-')); }
async function install(directory) {
  const target = path.join(directory, 'node_modules', PACKAGE);
  await mkdir(target, { recursive: true });
  await cp(path.join(root, 'implementation'), path.join(target, 'implementation'), { recursive: true });
  await cp(path.join(root, 'package.json'), path.join(target, 'package.json'));
}

test('exact release is pinned, cached calls never update or access the installer', async () => {
  assert.equal(PACKAGE_SPEC, `https://github.com/game-dev-rta-club/atomic-documantation/archive/refs/tags/v${VERSION}.tar.gz`);
  const cacheRoot = await cache();
  const entry = await ensureCli({ cacheRoot, install });
  assert.equal((await exec(process.execPath, [entry, '--version'])).stdout.trim(), VERSION);
  const second = await ensureCli({ cacheRoot, install() { throw Error('offline'); } });
  assert.equal(second, entry);
});

test('mismatch fails instead of falling back to another version', async () => {
  const cacheRoot = await cache();
  await assert.rejects(ensureCli({ cacheRoot, async install(directory) {
    await install(directory);
    const target = path.join(directory, 'node_modules', PACKAGE, 'package.json');
    const pkg = JSON.parse(await readFile(target)); pkg.version = '999.0.0';
    await writeFile(target, JSON.stringify(pkg));
  } }), /No different version was substituted/);
});

test('same-version implementation tampering is rejected and a cache is repaired', async () => {
  const cacheRoot = await cache();
  const entry = await ensureCli({ cacheRoot, install });
  await writeFile(entry, 'throw Error("tampered");');
  await assert.rejects(ensureCli({ cacheRoot, install() { throw Error('offline'); } }), /Could not prepare/);
  const repaired = await ensureCli({ cacheRoot, install });
  assert.notEqual(repaired, entry);
});

test('concurrent acquisition publishes complete caches and retains active packages', async () => {
  const cacheRoot = await cache();
  const results = await Promise.all([ensureCli({ cacheRoot, install }), ensureCli({ cacheRoot, install })]);
  for (const entry of results) assert.match((await exec(process.execPath, [entry, '--help'])).stdout, /Sonner/);
  const cached = await ensureCli({ cacheRoot, install() { throw Error('must not install'); } });
  assert.ok(results.includes(cached));
});

test('either copied skill runs without its sibling or source checkout', async () => {
  for (const name of ['atomic-doc-writing', 'atomic-doc-reading']) {
    const directory = await cache();
    await cp(path.join(root, 'skills', name), path.join(directory, name), { recursive: true });
    const { ensureCli: isolatedEnsure } = await import(pathToFileURL(path.join(directory, name, 'scripts/sonner.mjs')));
    const entry = await isolatedEnsure({ cacheRoot: path.join(directory, 'cache'), install });
    assert.equal((await exec(process.execPath, [entry, '--version'])).stdout.trim(), VERSION);
  }
});
