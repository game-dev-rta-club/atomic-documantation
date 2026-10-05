# Security

The current release line is supported. Report vulnerabilities through this repository's GitHub private vulnerability reporting, not through a public issue containing exploit details or private project data.

Sonner is read-only, but `--extensions` executes project-provided Node.js code. Enable only trusted modules. Process limits are not a sandbox. Filesystem identity checks reduce accidental unsafe reads; they do not guarantee isolation from an adversary changing the filesystem.

Skill runners acquire only their pinned release with install scripts disabled and verify its implementation digest. If a release or cache fails verification, report the failure rather than switching to an unpinned version.
