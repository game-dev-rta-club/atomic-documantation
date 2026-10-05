#!/usr/bin/env node
// Generated into each skill; no checkout or sibling skill is needed.
import { execFile, spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, mkdtemp, readFile, realpath, rename, rm, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const exec = promisify(execFile);
export const VERSION = '0.1.1';
export const PACKAGE = '@game-dev-rta-club/atomic-documantation';
export const PACKAGE_SPEC = `https://github.com/game-dev-rta-club/atomic-documantation/archive/refs/tags/v${VERSION}.tar.gz`;
const BIN = 'implementation/cli/sonner.mjs';
const RUNTIME_FILES = ["implementation/cli/sonner.mjs","implementation/sonner/project-reader.mjs","implementation/sonner/sonner-extension-worker.mjs","implementation/sonner/sonner-extensions.mjs","implementation/sonner/sonner-metadata.mjs","implementation/sonner/sonner-options.mjs","implementation/sonner/sonner-text.mjs","implementation/sonner/sonner.mjs","package.json"];
const RUNTIME_HASH = '3049577d001cb5c4a5bb9833cb408b5af5d10f940276a61d48aabcebcc6e7a57';

export async function findNpmCli() {
  const directories = [path.dirname(process.execPath), ...(process.env.PATH ?? process.env.Path ?? '').split(path.delimiter)];
  for (const directory of directories.filter(Boolean)) {
    const candidates = [path.join(directory, 'node_modules/npm/bin/npm-cli.js')];
    try { candidates.push(await realpath(path.join(directory, 'npm'))); } catch {}
    for (const candidate of candidates) {
      if (path.basename(candidate) === 'npm-cli.js' && (await stat(candidate).catch(() => null))?.isFile()) return candidate;
    }
  }
  throw new Error('Install Node.js 24+ with npm to prepare Sonner.');
}
async function installPackage(directory) {
  const npm = await findNpmCli();
  await writeFile(path.join(directory, 'package.json'), '{"private":true}\n');
  await exec(process.execPath, [npm, 'install', PACKAGE_SPEC, '--prefix', directory,
    '--ignore-scripts', '--omit=dev', '--no-audit', '--no-fund', '--package-lock=false',
    '--fetch-retries=0', '--fetch-timeout=20000'], { cwd: directory, timeout: 60_000,
    maxBuffer: 1024 * 1024, windowsHide: true });
}
async function packageEntry(directory) {
  const root = path.join(directory, 'node_modules', PACKAGE);
  const manifest = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
  if (manifest.name !== PACKAGE || manifest.version !== VERSION || manifest.bin?.sonner !== BIN) throw new Error('Incompatible Sonner package.');
  const digest = createHash('sha256');
  for (const filename of RUNTIME_FILES) digest.update(filename).update('\0').update(await readFile(path.join(root, filename))).update('\0');
  if (digest.digest('hex') !== RUNTIME_HASH) throw new Error('Sonner implementation differs from this skill release.');
  return path.join(root, BIN);
}

export async function ensureCli({
  cacheRoot = path.join(os.homedir(), '.cache', 'atomic-documantation', VERSION),
  install = installPackage,
} = {}) {
  await mkdir(cacheRoot, { recursive: true, mode: 0o700 });
  try {
    const state = JSON.parse(await readFile(path.join(cacheRoot, 'current.json'), 'utf8'));
    if (state.version !== VERSION || !/^package-[a-zA-Z0-9-]+$/.test(state.directory)) throw new Error('Invalid cache state.');
    return await packageEntry(path.join(cacheRoot, state.directory));
  } catch { /* Repair missing/corrupt caches, never select another version. */ }
  const staging = await mkdtemp(path.join(cacheRoot, 'package-'));
  const pointer = path.join(cacheRoot, `state-${randomUUID()}.tmp`);
  try {
    await install(staging);
    const entry = await packageEntry(staging);
    await exec(process.execPath, [entry, '--help'], { timeout: 10_000, windowsHide: true });
    await writeFile(pointer, JSON.stringify({ version: VERSION, directory: path.basename(staging) }), { mode: 0o600 });
    await rename(pointer, path.join(cacheRoot, 'current.json'));
    return entry;
  } catch (error) {
    await rm(staging, { recursive: true, force: true });
    throw new Error(`Could not prepare Sonner ${VERSION}. Check Node/npm and network access, then retry. No different version was substituted.`, { cause: error });
  } finally { await rm(pointer, { force: true }); }
}
export async function runBootstrap(args = process.argv.slice(2)) {
  if (Number(process.versions.node.split('.')[0]) < 24) throw new Error('Node.js 24+ is required.');
  const entry = await ensureCli();
  const child = spawn(process.execPath, [entry, ...args], { stdio: 'inherit', windowsHide: true });
  const signals = ['SIGINT', 'SIGTERM'];
  const handlers = signals.map(signal => () => child.kill(signal));
  signals.forEach((signal, index) => process.on(signal, handlers[index]));
  try {
    return await new Promise((resolve, reject) => {
      child.once('error', reject);
      child.once('exit', (code, signal) => resolve(code ?? (signal === 'SIGINT' ? 130 : 143)));
    });
  } finally { signals.forEach((signal, index) => process.off(signal, handlers[index])); }
}
async function isMain() {
  if (typeof import.meta.main === 'boolean') return import.meta.main;
  if (!process.argv[1]) return false;
  const [arg, module] = await Promise.all([stat(process.argv[1], { bigint: true }), stat(fileURLToPath(import.meta.url), { bigint: true })]);
  return arg.dev === module.dev && arg.ino === module.ino;
}
if (await isMain()) {
  try { process.exitCode = await runBootstrap(); }
  catch (error) { process.stderr.write(`Atomic documentation: ${error.message}\n`); process.exitCode = 1; }
}
