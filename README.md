# atomic-documantation

[![CI](https://github.com/game-dev-rta-club/atomic-documantation/actions/workflows/ci.yml/badge.svg)](https://github.com/game-dev-rta-club/atomic-documantation/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/game-dev-rta-club/atomic-documantation)](https://github.com/game-dev-rta-club/atomic-documantation/releases/latest)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Two agent skills for documentation that is easy to write, understand and revisit. Organize short pages into a meaningful hierarchy, explain them to a 20-year-old new employee, and use Sonner to see the whole before opening the details.

## /atomic-doc-writing

Writes and reorganizes specifications and guides into short, canonical pages. Clear filenames, concrete examples and useful `keyPoints` let readers find what they need without reading everything.

[Read the writing skill](skills/atomic-doc-writing/SKILL.md).

## /atomic-doc-reading

Uses Sonner to understand a project through its folder tree and document previews, then reads the relevant pages in full. It works with ordinary Markdown and can include project-specific code or asset metadata through extensions.

[Read the reading skill](skills/atomic-doc-reading/SKILL.md).

```text
Files:
  Docs/
    Delivery/
      retry.md keyPoints="Retries three times, then records a failed job."
    Accounts/
      deletion.md keyPoints="Deletion removes access immediately; records expire after 30 days."
```

## Install

Requires Node.js 24+, npm and Git on macOS, Windows or Linux. Use any agent that supports [Agent Skills](https://agentskills.io); Codex and Claude Code commands are shown below.

Run this from the project where you want to use the skills:

```sh
npx skills@latest add game-dev-rta-club/atomic-documantation
```

Choose either or both skills and your target agents. Installation is project-local by default.

To install both for Codex and Claude Code without prompts:

```sh
npx skills@latest add game-dev-rta-club/atomic-documantation \
  --skill atomic-doc-writing \
  --skill atomic-doc-reading \
  --agent codex \
  --agent claude-code \
  --yes
```

Codex discovers `.agents/skills/`; Claude Code uses `.claude/skills/`. Newly installed skills become available when the agent refreshes its skill list, normally on the next turn in Codex Desktop.

Each skill works on its own. Sonner is prepared automatically on first use, with no global command or project dependency setup. The first run needs network access; later cached runs work offline. Its implementation is pinned and integrity-checked against the installed skill release.

## Use

In Codex:

```text
$atomic-doc-reading Understand this project before changing its delivery system.
$atomic-doc-writing Organize the delivery documentation so a new employee can use it.
```

In Claude Code:

```text
/atomic-doc-reading Understand this project before changing its delivery system.
/atomic-doc-writing Organize the delivery documentation so a new employee can use it.
```

Existing Markdown works as-is. Add English `keyPoints` to make important pages visible in the overview:

```markdown
---
keyPoints: >-
  Delivery retries three times, then records a failed job for manual retry.
---
```

For code and assets, use [project metadata extensions](skills/atomic-doc-reading/references/extensions.md). There is no dependency on Small Loop or on a particular agent harness.

## Update

Updates are deliberate. Rerun the installation command when you want a newer release. There are no automatic runtime update checks; each installed skill selects its own release. [Release notes](CHANGELOG.md) describe changes.

## Development

```sh
git clone https://github.com/game-dev-rta-club/atomic-documantation.git
cd atomic-documantation
npm run build
npm test
npm run check
npm pack --dry-run
```

No dependency installation is required for development. The skills contain the guidance; `implementation/` contains the shared reader and acquisition code. Both use one version. See the [product contract](specification/product.md) for the small public surface.

## Contributing

Focused issues and pull requests are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md), the [Code of Conduct](CODE_OF_CONDUCT.md) and [security policy](SECURITY.md).

## Maintainers

[Game Dev RTA Club](https://github.com/game-dev-rta-club)

## License

[MIT](LICENSE) © 2026 Game Dev RTA Club. Attribution is recorded in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
