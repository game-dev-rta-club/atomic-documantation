import { createHash } from 'node:crypto';
import { chmod, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const manifest = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
const files = ['package.json', 'implementation/cli/sonner.mjs',
  ...(await readdir(path.join(root, 'implementation/sonner'))).filter(f => f.endsWith('.mjs')).map(f => `implementation/sonner/${f}`)].sort();
const digest = createHash('sha256');
for (const filename of files) digest.update(filename).update('\0').update(await readFile(path.join(root, filename))).update('\0');
const source = (await readFile(path.join(root, 'implementation/bootstrap/runner-template.mjs'), 'utf8'))
  .replaceAll('__VERSION__', manifest.version).replace('__RUNTIME_FILES__', JSON.stringify(files))
  .replace('__RUNTIME_HASH__', digest.digest('hex'));
for (const skill of ['atomic-doc-writing', 'atomic-doc-reading']) {
  const target = path.join(root, 'skills', skill, 'scripts/sonner.mjs');
  if (process.argv.includes('--check')) {
    if (await readFile(target, 'utf8') !== source) throw new Error(`Stale generated runner: ${target}. Run npm run build.`);
  } else {
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, source);
    await chmod(target, 0o755);
  }
}
// Source lives in the reading skill; each installed skill carries its own copy.
const referenceSource = await readFile(path.join(root, 'skills/atomic-doc-reading/references/sonner.md'), 'utf8');
const referenceTarget = path.join(root, 'skills/atomic-doc-writing/references/sonner.md');
if (process.argv.includes('--check')) {
  if (await readFile(referenceTarget, 'utf8') !== referenceSource) throw new Error('Stale shared Sonner reference. Run npm run build.');
} else await writeFile(referenceTarget, referenceSource);
