// Guarded portable prefix reads, adapted from Small Loop's MIT-licensed reader.
import { execFile } from 'node:child_process';
import { constants } from 'node:fs';
import { lstat, open, realpath } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { parseSonnerConfig, selectSonnerPaths, sonnerReadBytes, sonnerSelection } from './sonner-options.mjs';

const exec = promisify(execFile);
const excluded = new Set(['.git', '.codex-small-loop', '.cache', '.next', '.parcel-cache',
  '.pytest_cache', '.turbo', '__pycache__', 'build', 'cache', 'coverage', 'dist', 'node_modules', 'out', 'target']);
const MAX_PATHS = 100_000;
const MAX_OUTPUT = 64 * 1024 * 1024;
export function fail(code, message) { throw Object.assign(new Error(message), { code }); }
function sameIdentity(a, b) { return a.dev === b.dev && a.ino === b.ino; }
function sameFile(a, b) { return sameIdentity(a, b) && a.mode === b.mode && a.nlink === b.nlink
  && a.size === b.size && a.mtimeNs === b.mtimeNs && a.ctimeNs === b.ctimeNs; }
function validPath(value) {
  return value && !/^[A-Za-z]:/.test(value) && !value.includes('\\') && !value.includes('\0') && Buffer.byteLength(value) <= 4096
    && value.split('/').every(p => p && p !== '.' && p !== '..' && Buffer.byteLength(p) <= 512);
}

function gitEnvironment() {
  const source = process.env;
  return { PATH: source.PATH ?? source.Path ?? '', PATHEXT: source.PATHEXT ?? '.COM;.EXE;.BAT;.CMD',
    SystemRoot: source.SystemRoot ?? source.SYSTEMROOT ?? 'C:\\Windows',
    HOME: source.HOME ?? source.USERPROFILE ?? '', USERPROFILE: source.USERPROFILE ?? source.HOME ?? '',
    XDG_CONFIG_HOME: source.XDG_CONFIG_HOME ?? '', LC_ALL: 'C', LANG: 'C',
    GIT_TERMINAL_PROMPT: '0', GIT_OPTIONAL_LOCKS: '0', GIT_PAGER: 'cat' };
}
async function git(root, args, timeout, signal) {
  try {
    return (await exec('git', ['-c', 'core.fsmonitor=false', '-c', 'core.untrackedCache=false',
      '-C', root, ...args], { encoding: 'buffer', maxBuffer: 32 * 1024 * 1024,
      timeout, signal, windowsHide: true, env: gitEnvironment() })).stdout;
  } catch (error) {
    if (signal?.aborted) throw signal.reason;
    fail('SONNER_GIT_FAILED', `Could not list the Git worktree. Check Git installation and --project-root. ${String(error.stderr ?? '').trim().slice(0, 512)}`);
  }
}

export async function openSession(root, timeoutMs) {
  if (!['darwin', 'win32', 'linux'].includes(process.platform)) fail('SONNER_PLATFORM_UNSUPPORTED', 'Use macOS, Windows or Linux.');
  const controller = new AbortController();
  const deadline = Date.now() + timeoutMs;
  const timer = setTimeout(() => controller.abort(Object.assign(new Error('Operation timed out; narrow --path or increase --timeout-ms.'), { code: 'SONNER_OPERATION_ABORTED' })), timeoutMs);
  const session = {
    signal: controller.signal, project: null,
    remainingMs() { return Math.max(1, deadline - Date.now()); },
    throwIfAborted() { if (controller.signal.aborted) throw controller.signal.reason; },
    async close() { clearTimeout(timer); },
  };
  try {
    const requested = path.resolve(root ?? process.cwd());
    const selected = root === undefined ? (await git(requested, ['rev-parse', '--show-toplevel'], session.remainingMs(), session.signal)).toString('utf8').trimEnd() : requested;
    const canonical = await realpath(selected);
    const identity = await lstat(canonical, { bigint: true });
    if (!identity.isDirectory()) fail('SONNER_PROJECT_INVALID', 'Project root must be a directory.');
    session.project = { root: canonical, identity };
    session.throwIfAborted();
    return session;
  } catch (error) { await session.close(); throw error; }
}

async function assertRoot(session) {
  session.throwIfAborted();
  const status = await lstat(session.project.root, { bigint: true });
  if (!status.isDirectory() || status.isSymbolicLink() || !sameIdentity(status, session.project.identity)) {
    fail('SONNER_PROJECT_CHANGED', 'Project root changed during reading. Retry after filesystem changes settle.');
  }
}

export async function inspectPath(session, projectPath) {
  if (!validPath(projectPath)) fail('SONNER_PATH_INVALID', 'Invalid project-relative path.');
  await assertRoot(session);
  const parts = projectPath.split('/');
  let filename = session.project.root;
  const ancestors = [];
  for (const part of parts.slice(0, -1)) {
    filename = path.join(filename, part);
    const status = await lstat(filename, { bigint: true });
    if (!status.isDirectory() || status.isSymbolicLink()) fail('SONNER_PATH_UNSAFE', 'Path ancestor is not a regular directory.');
    ancestors.push({ filename, status });
  }
  filename = path.join(filename, parts.at(-1));
  const status = await lstat(filename, { bigint: true });
  return { filename, status, ancestors };
}
async function revalidate(session, inspected) {
  for (const { filename, status } of inspected.ancestors) {
    const current = await lstat(filename, { bigint: true });
    if (!current.isDirectory() || current.isSymbolicLink() || !sameIdentity(current, status)) fail('SONNER_PATH_CHANGED', 'Path ancestor changed.');
  }
  await assertRoot(session);
}
async function readPrefix(session, projectPath, maximum) {
  const inspected = await inspectPath(session, projectPath);
  const { filename, status } = inspected;
  if (status.isSymbolicLink()) return { path: projectPath, type: 'symlink', raw: Buffer.alloc(0) };
  if (!status.isFile()) fail('SONNER_FILE_UNAVAILABLE', 'Not a regular file.');
  let handle;
  try {
    handle = await open(filename, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0) | (constants.O_NONBLOCK ?? 0));
    const opened = await handle.stat({ bigint: true });
    if (!opened.isFile() || !sameFile(status, opened)) fail('SONNER_FILE_CHANGED', 'File changed before reading.');
    const raw = Buffer.alloc(Number(opened.size > BigInt(maximum) ? BigInt(maximum) : opened.size));
    let offset = 0;
    while (offset < raw.length) {
      session.throwIfAborted();
      const { bytesRead } = await handle.read(raw, offset, raw.length - offset, offset);
      if (!bytesRead) break;
      offset += bytesRead;
    }
    if (offset !== raw.length || !sameFile(opened, await handle.stat({ bigint: true }))
      || !sameFile(opened, await lstat(filename, { bigint: true }))) fail('SONNER_FILE_CHANGED', 'File changed during reading.');
    await revalidate(session, inspected);
    return { path: projectPath, type: 'file', raw };
  } finally { await handle?.close(); }
}

export async function readProject(session, query) {
  const raw = await git(session.project.root, ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], session.remainingMs(), session.signal);
  await assertRoot(session);
  if (raw.length && raw.at(-1) !== 0) fail('SONNER_GIT_FAILED', 'Incomplete Git paths.');
  let paths;
  try { paths = raw.length ? new TextDecoder('utf8', { fatal: true }).decode(raw.subarray(0, -1)).split('\0') : []; }
  catch { fail('SONNER_PATH_INVALID', 'Git paths must be UTF-8.'); }
  if (paths.length > MAX_PATHS) fail('SONNER_LIMIT_EXCEEDED', 'Too many project files (maximum 100,000).');
  if (paths.some(p => !validPath(p))) fail('SONNER_PATH_INVALID', 'Git returned an unsafe project path.');
  paths = [...new Set(paths)].filter(p => !p.split('/').some(part => excluded.has(part)))
    .sort((a, b) => Buffer.compare(Buffer.from(a), Buffer.from(b)));
  let configBytes = null;
  if (paths.includes('.sonner.json')) {
    const record = await readPrefix(session, '.sonner.json', 64 * 1024);
    if (record.type !== 'file') fail('SONNER_CONFIG_INVALID', 'Configuration must be a regular file.');
    configBytes = record.raw;
  }
  const config = parseSonnerConfig(configBytes);
  const selected = selectSonnerPaths(paths, config, query);
  const entries = new Array(selected.length);
  const warnings = new Array(selected.length);
  let cursor = 0;
  let outputBytes = 0;
  // Concurrency is bounded; retain Git order without one subprocess per file.
  await Promise.all(Array.from({ length: Math.min(16, selected.length) }, async () => {
    while (cursor < selected.length) {
      session.throwIfAborted();
      const index = cursor++;
      const filename = selected[index];
      let record;
      try { record = await readPrefix(session, filename, sonnerReadBytes(filename, config.extensions, query.extensions)); }
      catch (error) {
        session.throwIfAborted();
        if (error.code === 'SONNER_PROJECT_CHANGED') throw error;
        warnings[index] = { path: filename, code: error.code ?? 'SONNER_FILE_UNAVAILABLE', message: 'Metadata not inspected: file missing, unreadable, unsafe or changed.' };
        continue;
      }
      outputBytes += record.raw.length;
      if (outputBytes > MAX_OUTPUT) fail('SONNER_LIMIT_EXCEEDED', 'Read output exceeds 64 MiB. Narrow --path.');
      if (record.type === 'symlink') warnings[index] = { path: filename, code: 'SONNER_SYMLINK_SKIPPED', message: 'Metadata not inspected: symlink content is not followed.' };
      entries[index] = record;
    }
  }));
  await assertRoot(session);
  return { entries: entries.filter(Boolean), warnings: warnings.filter(Boolean),
    extensions: config.extensions, selection: sonnerSelection(config, query) };
}
