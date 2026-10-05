---
name: atomic-doc-writing
description: Write, revise or reorganize project documentation into short canonical pages with clear hierarchy and useful keyPoints. Use when editing specifications, guides, titles, folder structures or documentation summaries.
license: MIT
metadata:
  requires: Node.js 24+, npm and Git on macOS, Windows or Linux; network for first acquisition.
---

# Atomic documentation: writing

Make the system easier to understand than reading its implementation. Write for a 20-year-old new employee who has no prior project knowledge: plain language, concrete examples and only the detail needed to act or decide.

Read the [writing principles](references/writing-principles.md) before working. They cover prose, page boundaries, hierarchy, design intent and keyPoints. Apply them as one coherent approach, not a fixed page template.

Use Sonner to find related pages before writing and to read the changed area afterward. Run from the project; replace `<skill-dir>` with the absolute directory containing this skill:

```sh
node <skill-dir>/scripts/sonner.mjs --path Docs
```

Choose the actual documentation directory; omit `--path` for a whole-project overview. Append `--extensions` when the project has trusted extractors in `.sonner.json`. The [reader reference](references/sonner.md) explains the output and query options.

Leave one authoritative home for each explanation. After a move, repair inbound links and task-entry skills. Finish when the tree, filenames and keyPoints help a newcomer select the right page, and that page gives a short, accurate explanation.
