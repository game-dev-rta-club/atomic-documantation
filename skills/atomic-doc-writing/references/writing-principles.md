---
keyPoints: >-
  Write for a new employee: short pages, meaningful hierarchy, one canonical explanation and concrete behavior. Describe outcomes and collaboration rather than field catalogs. English keyPoints add decision-relevant information beyond filenames.
---

# Make the system understandable

Imagine onboarding a 20-year-old new employee. They should understand what the system does, find the relevant page, and return to their work without needing its author's explanation.

## Plain, focused prose

Lead with what the reader can do. Use familiar words; explain an unfamiliar term when it matters. Keep the information needed for judgment and remove repeated explanations.

State the outcome rather than prescribing an arbitrary method. “A first-time reader can explain the data flow” is more useful than “Every page must have a diagram.” Use Markdown to expose relationships and importance, not merely to decorate paragraphs.

Replace vague claims with a small example: “Scale 2 changes a width of 10 to 20.” A diagram or table earns its place when it makes a relationship easier to grasp.

## Short pages, meaningful hierarchy

A folder names a shared subject; a filename names the particular explanation. Split independent topics into short pages. Add intermediate folders when they clarify meaning rather than forcing a shallow tree.

```text
Cooking/
  Baking/
    Time-and-temperature.md
  Storage/
    Time-and-temperature.md
```

Unlike `Cooking/Time-and-temperature.md`, these paths tell the reader which question each page answers. A few lines can be a complete page. A long explanation can stay together when its parts are needed to understand one idea; splitting by paragraph alone is not atomic documentation.

Keep each explanation in one canonical place and link to it. Readers should know both where to check a fact and where to update it.

## Explain behavior and design intent

Describe capabilities, inputs, collaboration and transitions more intuitively than reading code. “Submitting queues delivery; failed delivery retries three times” explains more than a list of timeout and retry fields.

Show which component owns each responsibility and what starts the next behavior. Explain a useful reason that the implementation alone cannot convey. Check that inputs actually reach the stated processing path.

Separate working features from possibilities that require extra configuration or development. Observed behavior is not necessarily intended behavior; do not invent a reason to justify it.

Keep conditions and technical detail when they change a reader's decision. Link to implementation for current fields and values. Transient defects, investigation history and progress reports belong in work records, not in the canonical explanation of the system.

## Preview the page with keyPoints

Read the entire page before writing concise English `keyPoints` in its Markdown frontmatter. Add useful behavior or decision-relevant conditions beyond the filename.

```markdown
---
keyPoints: >-
  Delivery retries three times, then records a failed job for manual retry.
---
```

“Explains delivery” just repeats the title. Keep the detailed explanation in the body, but do not shorten the preview so far that it becomes misleading.

Read the affected area in Sonner, including nearby pages and keyPoints. Can someone explain the structure and choose the right page without opening everything? If not, improve the hierarchy, names or previews.

## Give important guidance an entry point

Task-entry skills help agents find guidance before working. Give the skill a task-level description and link to its canonical documentation. A backlink from the documentation makes it easier to repair the entry point when folders move. Shared toolkit guidance stays inside its own skill; do not maintain another project-local copy.
