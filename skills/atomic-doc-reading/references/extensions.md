---
keyPoints: >-
  Version 1 .sonner.json scopes files and maps suffixes to project-local ES modules. Opt-in extractors receive frozen path/text and return string metadata. Child-process bounds do not make untrusted modules safe to execute.
---

# Project metadata extensions

Markdown keyPoints work without configuration. For other formats, register trusted project-local extractors:

```json
{
  "version": 1,
  "exclude": ["Docs/Private"],
  "extensions": [{ "suffix": ".note", "module": "tools/note-metadata.mjs" }]
}
```

`include` defaults to `["."]`; `exclude` defaults to `[]`. Paths are project-relative with `/` separators and cannot escape the project. Scope filters do not authorize extra filesystem access. For overlapping suffixes, the longest matching suffix wins.

```js
export const apiVersion = 1;
export function extract({ path, text }) {
  return { summary: text.split('\n')[0].trim() };
}
```

Run Sonner with `--extensions` to enable it. Each file supplies a frozen `{ path, text }`; `text` is the UTF-8 prefix up to 64 KiB. Return an object of nonempty string fields, such as `keyPoints`, `summary` or `description`. Blank/null values are omitted. Structural fields such as `path`, `children`, `type` and prototype-sensitive keys are forbidden. Each value is limited to 8192 characters.

Keep extraction pure: use the supplied text rather than reading additional files. The worker has bounded time, memory and output; it is not a security sandbox and does not prevent a module from using Node APIs. Enable only project code you trust. Invalid output or a failed worker makes the command fail visibly.

Existing version 1 extractors can be reused unchanged, including mappings for `.meta` and `.cs` files. Project-specific formats belong in the project, not in this toolkit.
