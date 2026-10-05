---
keyPoints: >-
  Sonner names metadata-bearing files and counts other files by extension. Path scopes narrow reads; depth and keyPoint filters change presentation. Each skill runner acquires its exact release once and uses an integrity-checked cache without automatic updates.
---

# Read the project with Sonner

Run `node <skill-dir>/scripts/sonner.mjs` from the project. Sonner finds the containing Git worktree, including worktrees with a `.git` file. `--project-root /absolute/path` selects another worktree.

```text
Sonner v1
Files:
  ./
    Docs/
      Delivery/
        retry.md keyPoints="Retries three times, then records a failed job."
        2 md
```

Metadata-bearing files have names and previews. Other files are counted by extension directly inside their directory. A count does not imply their contents were understood. Open the relevant files to learn their details.

## Focused queries

| Option | Effect |
| --- | --- |
| `--path Docs/Delivery` | Read only this project-relative subtree. Use `/` separators on every OS. |
| `--extensions` | Run trusted project extractors configured in `.sonner.json`. |
| `--metadata-only` | Show only metadata-bearing files and ancestors; counts include those matching files. |
| `--depth 2` | Limit tree expansion, with the selected root at depth 0. |
| `--no-key-points` | Hide keyPoints while retaining summary, description and other metadata. |
| `--json` | Return structured schema version 1, with the same file tree and scope. |
| `--timeout-ms 60000` | Allow more time for a large project. Default 30000; maximum 300000. |

`--path` narrows content reads. Depth and metadata filters only change output. Tracked files and unignored untracked files are included; Git-ignored untracked and common generated folders are excluded. Metadata is read from the first 64 KiB, not entire large files.

Warnings identify files whose metadata could not be inspected. Symlinks are not followed. Fatal configuration, extension, timeout and size errors return a nonzero exit rather than partial success.

## Acquisition and updates

The runner automatically acquires the release bundled with its skill from public GitHub. It verifies package identity, version and implementation digest, then caches it under `~/.cache/atomic-documantation/<version>/`. It does not install globally, change project dependencies or run package installation scripts. Windows uses the current user's home directory for the same cache layout.

The first acquisition needs Node.js 24+, npm, Git and network access; cached runs need Node.js and Git but no network. There are no update checks. Update the installed skill deliberately to select a new version; never substitute `main`, `latest` or another cached version after a failure.
