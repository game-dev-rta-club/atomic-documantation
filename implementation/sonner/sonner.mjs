import path from 'node:path';
import { hasMetadata } from './sonner-metadata.mjs';
import { runSonnerExtensions } from './sonner-extensions.mjs';
import { validateSonnerQuery } from './sonner-options.mjs';
import { openSession, readProject } from './project-reader.mjs';

const compare = (a, b) => Buffer.compare(Buffer.from(a), Buffer.from(b));
export function parseMarkdownKeyPoints(source) {
  const normalized = source.replace(/^\uFEFF/, '').replaceAll('\r\n', '\n');
  if (!normalized.startsWith('---\n')) return null;
  const closing = normalized.slice(4).match(/\n---(?:\n|$)/);
  if (!closing) return null;
  const lines = normalized.slice(4, closing.index + 4).split('\n');
  for (let index = 0; index < lines.length; index++) {
    const match = lines[index].match(/^keyPoints\s*:\s*(.*)$/);
    if (!match) continue;
    const value = match[1].trim();
    if (!['>', '>-', '>+', '|', '|-', '|+'].includes(value)) {
      return value.replace(/^(['"])(.*)\1$/, '$2').trim() || null;
    }
    const block = [];
    for (index++; index < lines.length; index++) {
      const line = lines[index];
      if (line.trim() && !/^\s/.test(line)) break;
      block.push(line.trim());
    }
    return (value.startsWith('>') ? block.join(' ').replace(/\s+/g, ' ') : block.join('\n')).trim() || null;
  }
  return null;
}

function tree(entries, rootPath, metadataOnly) {
  const directories = new Map();
  function directory(filename) {
    if (directories.has(filename)) return directories.get(filename);
    const result = { path: filename, name: path.posix.basename(filename), type: 'directory', children: [] };
    directories.set(filename, result);
    if (filename !== rootPath) directory(path.posix.dirname(filename)).children.push(result);
    return result;
  }
  const root = directory(rootPath);
  const counts = new Map();
  for (const entry of entries) {
    const visible = hasMetadata(entry);
    if (metadataOnly && !visible) continue;
    const parent = directory(path.posix.dirname(entry.path));
    if (visible) parent.children.push(entry);
    if (metadataOnly || !visible) {
      const extension = path.posix.extname(entry.name).slice(1).toLowerCase() || null;
      if (!counts.has(parent.path)) counts.set(parent.path, new Map());
      const here = counts.get(parent.path);
      here.set(extension, (here.get(extension) ?? 0) + 1);
    }
  }
  for (const node of directories.values()) {
    node.children.sort((a, b) => (a.type === 'directory' ? 0 : 1) - (b.type === 'directory' ? 0 : 1) || compare(a.path, b.path));
    const here = counts.get(node.path);
    if (here) node.children.push({ type: 'file-counts', counts: [...here].sort(([a], [b]) => compare(a ?? '', b ?? '')).map(([extension, count]) => ({ extension, count })) });
  }
  return root;
}

export async function buildSonner({ projectRoot, timeoutMs = 30_000, query = {} } = {}) {
  query = validateSonnerQuery(query);
  const session = await openSession(projectRoot, timeoutMs);
  try {
    const reader = await readProject(session, query);
    const metadata = query.extensions ? await runSonnerExtensions(session.project, reader.entries, reader.extensions, session) : new Map();
    const files = reader.entries.map(entry => ({ path: entry.path, name: path.posix.basename(entry.path), type: 'file',
      keyPoints: entry.type === 'file' && /\.md$/i.test(entry.path) ? parseMarkdownKeyPoints(entry.raw.toString('utf8')) : null,
      ...(metadata.get(entry.path) ?? {}) }));
    const result = { version: 1, files: { root: tree(files, reader.selection.path, query.metadataOnly) } };
    if (reader.selection.partial) result.selection = reader.selection;
    if (query.metadataOnly) result.metadataOnly = true;
    if (reader.warnings.length) result.warnings = reader.warnings;
    function present(node, depth) {
      if (query.noKeyPoints) delete node.keyPoints;
      if (node.type !== 'directory') return;
      if (depth === query.depth) {
        if (node.children.some(child => child.type === 'directory')) node.truncated = true;
        node.children = node.children.filter(child => child.type !== 'directory');
      }
      for (const child of node.children) present(child, depth + 1);
    }
    present(result.files.root, 0);
    if (query.depth !== undefined) result.maxDepth = query.depth;
    session.throwIfAborted();
    return result;
  } finally { await session.close(); }
}
