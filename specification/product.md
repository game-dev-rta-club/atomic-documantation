---
keyPoints: >-
  Two independently installable skills teach atomic writing and Sonner-based reading. Each bundles a generated runner pinned to the same release as the shared reader. Installation is project-local; runtime acquisition is automatic and updates are explicit.
---

# Atomic documentation

Help a new project member understand the system through its folder hierarchy, short pages and useful keyPoints. The public product is two portable Agent Skills, not a Small Loop plugin.

## Distribution

- `atomic-doc-writing` contains the writing theory and its own Sonner runner.
- `atomic-doc-reading` contains the reading approach, extension API and its own runner.
- Neither skill requires the other or a source checkout. No separate guide service is used.
- Skills and implementation share one SemVer version. The runner downloads that exact GitHub release into a user cache on first use, without install scripts. Cached runs need no network. Updates require reinstalling the skills; no background version checks.
- Node.js 24+, npm and Git are the only prerequisites on macOS, Windows and Linux. No global command, project dependency or authentication is required.

## Reader contract

`node <skill>/scripts/sonner.mjs [--path DIR] [--extensions] [--json]`

The default root is the containing Git worktree. An explicit `--project-root DIR` selects another root. Sonner includes tracked and unignored untracked files. Common generated folders are excluded. Paths are project-relative with `/` separators.

Text shows a directory tree: files with metadata are named, other files are counted by extension. JSON schema version 1 exposes the same `files.root`, optional `selection`, `maxDepth`, `metadataOnly` and read `warnings`. It contains no Work Graph, Codex task history or runtime state.

Markdown frontmatter supports scalar, folded and literal `keyPoints`. It reads at most 64 KiB per Markdown/extension file and 512 bytes for other files. `--path` narrows reads. `--depth`, `--no-key-points` and `--metadata-only` change presentation; metadata-only retains counts for the matching files, compatible with existing Sonner use.

`.sonner.json` version 1 supports `include`, `exclude` and suffix/module extension rules. `--extensions` explicitly executes trusted project modules in a bounded child process. API version 1 passes frozen `{path, text}` and accepts nonempty string metadata. It is process isolation, not a security sandbox.

The portable reader skips symlinks, checks path/file identities and reads bounded prefixes. It reports unsafe, changed or unreadable admitted files instead of presenting their missing metadata as a successful inspection. It is not a hostile-filesystem sandbox. Operation timeout, path count and output size are bounded; limit failures return a nonzero exit without partial success output.

## Implementation and verification

`implementation/sonner` owns file reading and projection; `implementation/cli` owns argument parsing; `implementation/bootstrap` owns acquisition. `scripts/build-skills.mjs` generates identical standalone runners for both skills from one source. References belong to their skill folders.

Use Node built-ins and explicit module imports. Tests exercise public CLI output on temporary Git repositories, extensions, invalid options, symlinks and standalone installation/cache behavior. CI repeats them on all three operating systems and checks generated runners and package contents. Run `npm test`, `npm run check` and `npm pack --dry-run` before releasing.

Changes preserve existing `.sonner.json` and extractors. Small Loop itself is not modified. SHG routes project understanding and documentation work to these installed skills rather than keeping a second copy of the theory.
