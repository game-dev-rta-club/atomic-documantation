#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { buildSonner } from '../sonner/sonner.mjs';
import { formatSonnerText } from '../sonner/sonner-text.mjs';

const help = `Sonner — project hierarchy and metadata
Usage: sonner [options]
  --project-root DIR  Git worktree root (default: containing worktree)
  --path DIR          Read only this project-relative directory
  --extensions        Run trusted .sonner.json metadata extractors
  --metadata-only     Show only metadata files and their ancestor directories
  --depth N           Limit tree expansion (root = 0)
  --no-key-points     Omit keyPoints, retaining other metadata
  --json              Return JSON schema version 1
  --timeout-ms N      Operation deadline (default: 30000, maximum: 300000)
  --version           Show release version
  --help              Show this help
`;
export async function run(args) {
  if (Number(process.versions.node.split('.')[0]) < 24) throw new Error('Node.js 24+ is required.');
  if (args.length === 1 && args[0] === '--help') { process.stdout.write(help); return; }
  if (args.length === 1 && args[0] === '--version') {
    const pkg = JSON.parse(await readFile(new URL('../../package.json', import.meta.url), 'utf8'));
    process.stdout.write(`${pkg.version}\n`); return;
  }
  const query = {};
  const options = { query };
  const seen = new Set();
  let json = false;
  const valued = new Set(['--project-root', '--path', '--depth', '--timeout-ms']);
  for (let index = 0; index < args.length; index++) {
    const flag = args[index];
    if (seen.has(flag)) throw new Error(`Duplicate option ${flag}. Use --help.`);
    seen.add(flag);
    if (valued.has(flag)) {
      const value = args[++index];
      if (!value || value.startsWith('--')) throw new Error(`Missing value for ${flag}.`);
      if (flag === '--project-root') options.projectRoot = value;
      else if (flag === '--path') query.path = value;
      else {
        if (!/^\d+$/.test(value)) throw new Error(`Expected an integer for ${flag}.`);
        const number = Number(value);
        if (flag === '--depth') query.depth = number;
        else { if (number < 1 || number > 300000) throw new Error('Timeout must be 1–300000 ms.'); options.timeoutMs = number; }
      }
    } else if (flag === '--json') json = true;
    else if (flag === '--extensions') query.extensions = true;
    else if (flag === '--metadata-only') query.metadataOnly = true;
    else if (flag === '--no-key-points') query.noKeyPoints = true;
    else throw new Error(`Unknown option ${flag}. Use --help.`);
  }
  const value = await buildSonner(options);
  process.stdout.write(json ? `${JSON.stringify(value)}\n` : formatSonnerText(value));
}
// This file is an executable entry point, not an imported library.
try { await run(process.argv.slice(2)); }
catch (error) { process.stderr.write(`Sonner: ${error.code ? `${error.code}: ` : ''}${error.message}\n`); process.exitCode = 1; }
