import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile, readdir } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const exec = promisify(execFile);
async function markdown(directory) {
  const files = [];
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const filename = path.join(directory, item.name);
    if (item.isDirectory() && item.name !== '.git' && item.name !== 'node_modules') files.push(...await markdown(filename));
    else if (item.name.endsWith('.md')) files.push(filename);
  }
  return files;
}
test('skills contain no project-specific paths, sibling dependencies or broken local links', async () => {
  for (const name of ['atomic-doc-writing', 'atomic-doc-reading']) {
    const dir = path.join(root, 'skills', name);
    const entry = await readFile(path.join(dir, 'SKILL.md'), 'utf8');
    assert.match(entry, new RegExp(`name: ${name}`));
    for (const filename of await markdown(dir)) {
      const source = await readFile(filename, 'utf8');
      assert.doesNotMatch(source, /\/Users\/|NewSuperHookGirl|StageItemCreation|\.codex\/plugins/);
      for (const match of source.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
        const target = match[1];
        if (/^https?:/.test(target)) continue;
        const resolved = path.resolve(path.dirname(filename), target.split('#')[0]);
        assert.ok(!path.relative(dir, resolved).startsWith('..'), `${filename}: outside skill ${target}`);
        await access(resolved);
      }
    }
  }
});
test('generated runners and shared reference are up to date', async () => {
  await exec(process.execPath, ['scripts/build-skills.mjs', '--check'], { cwd: root });
});
test('repository Markdown links resolve', async () => {
  for (const filename of await markdown(root)) {
    for (const match of (await readFile(filename, 'utf8')).matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
      const target = match[1];
      if (/^https?:/.test(target) || target.startsWith('#')) continue;
      await access(path.resolve(path.dirname(filename), target.split('#')[0]));
    }
  }
});
