import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, symlink } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const exec = promisify(execFile);
const cli = fileURLToPath(new URL('../implementation/cli/sonner.mjs', import.meta.url));
async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'atomic-doc-test-'));
  await exec('git', ['init', '-q', root]);
  await mkdir(path.join(root, 'docs'));
  await writeFile(path.join(root, 'docs/one.md'), '---\nkeyPoints: >-\n  Stops retrying after three failures.\n---\n# Retry\n');
  await writeFile(path.join(root, 'docs/two.md'), '# No metadata\n');
  await writeFile(path.join(root, '.gitignore'), 'ignored/\n');
  await mkdir(path.join(root, 'ignored'));
  await writeFile(path.join(root, 'ignored/secret.md'), '---\nkeyPoints: hidden\n---\n');
  return root;
}
async function run(root, ...args) {
  return exec(process.execPath, [cli, ...args], { cwd: root });
}
function nodes(node) { return [node, ...(node.children ?? []).flatMap(nodes)]; }

test('text and JSON describe files without Small Loop coupling', async () => {
  const root = await fixture();
  const text = (await run(root)).stdout;
  assert.match(text, /one\.md keyPoints="Stops retrying after three failures\."/);
  assert.match(text, /1 md/);
  assert.doesNotMatch(text, /Work Graph|Runtime|hidden/);
  const json = JSON.parse((await run(root, '--json')).stdout);
  assert.equal(json.version, 1);
  assert.deepEqual(Object.keys(json), ['version', 'files']);
  assert.equal(nodes(json.files.root).filter(n => n.keyPoints).length, 1);
});

test('path narrows contents; depth and metadata filters preserve selected metadata', async () => {
  const root = await fixture();
  await mkdir(path.join(root, 'docs/nested'));
  await writeFile(path.join(root, 'docs/nested/three.md'), '---\nkeyPoints: Third page\n---\n');
  const selected = JSON.parse((await run(root, '--path', 'docs', '--json')).stdout);
  assert.equal(selected.files.root.path, 'docs');
  assert.equal(selected.selection.partial, true);
  const shallow = JSON.parse((await run(root, '--path', 'docs', '--depth', '0', '--json')).stdout);
  assert.equal(shallow.files.root.truncated, true);
  assert.equal(nodes(shallow.files.root).filter(n => n.type === 'directory').length, 1);
  const filtered = JSON.parse((await run(root, '--metadata-only', '--no-key-points', '--json')).stdout);
  assert.equal(filtered.metadataOnly, true);
  assert.equal(nodes(filtered.files.root).filter(n => n.type === 'file').length, 2);
  assert.ok(nodes(filtered.files.root).every(n => !n.keyPoints));
});

test('extension API is opt-in and preserves custom fields', async () => {
  const root = await fixture();
  await writeFile(path.join(root, '.sonner.json'), JSON.stringify({ version: 1, extensions: [{ suffix: '.meta', module: 'metadata.mjs' }] }));
  await writeFile(path.join(root, 'metadata.mjs'), 'export const apiVersion=1; export function extract(input) { if (!Object.isFrozen(input)) throw Error("mutable"); return {description: input.text.trim()}; }');
  await writeFile(path.join(root, 'asset.meta'), 'Moves on contact');
  assert.doesNotMatch((await run(root)).stdout, /description=/);
  assert.match((await run(root, '--extensions')).stdout, /asset\.meta description="Moves on contact"/);
});

test('bad extension, option, config and traversal are explicit failures', async () => {
  const root = await fixture();
  for (const args of [['--path', '../'], ['--runtime'], ['--depth', '-1'], ['--json', '--json'], ['--timeout-ms', '0']]) {
    await assert.rejects(run(root, ...args), error => error.code === 1 && /Sonner:/.test(error.stderr));
  }
  await writeFile(path.join(root, '.sonner.json'), '{"version":2}');
  await assert.rejects(run(root), /Command failed/);
  await writeFile(path.join(root, '.sonner.json'), '{"version":1,"extensions":[{"suffix":".meta","module":"bad.mjs"}]}');
  await writeFile(path.join(root, 'bad.mjs'), 'export const apiVersion=1; export function extract(){return {children:"bad"}}');
  await writeFile(path.join(root, 'asset.meta'), 'data');
  await assert.rejects(run(root, '--extensions'), error => /SONNER_EXTENSION_FAILED/.test(error.stderr));
});

test('file symlinks do not expose external content', async t => {
  const root = await fixture();
  const outside = await mkdtemp(path.join(os.tmpdir(), 'atomic-doc-outside-'));
  await writeFile(path.join(outside, 'private.md'), '---\nkeyPoints: MUST_NOT_BE_READ\n---\n');
  try { await symlink(path.join(outside, 'private.md'), path.join(root, 'link.md'), 'file'); }
  catch (error) { if (process.platform === 'win32' && error.code === 'EPERM') { t.skip('Symlink privilege unavailable'); return; } throw error; }
  const output = (await run(root, '--json')).stdout;
  assert.doesNotMatch(output, /MUST_NOT_BE_READ/);
  assert.match(output, /symlink/);
});
