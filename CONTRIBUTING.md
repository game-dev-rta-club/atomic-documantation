# Contributing

Small fixes and focused improvements are welcome. Open an issue first for changes to the writing theory, extension API or distribution contract, so we can agree on the intended behavior before changing it.

## Development

Use Node.js 24+ and Git. There are no runtime npm dependencies.

```sh
npm run build
npm test
npm run check
npm pack --dry-run
```

The tests run on macOS, Windows and Linux. Add an observable regression test for changed behavior, update the relevant skill or specification, and keep refactoring separate from behavior changes.

Edit shared runtime code in `implementation/`. The build generates both `skills/*/scripts/sonner.mjs` files; do not edit them by hand. The Sonner reference is authored in the reading skill and copied into the writing skill by the same build. Each published skill must remain independently usable.

## Releases

Skills and runtime share the version in `package.json`. Use SemVer for changes to behavior and the public contract. Documentation-only releases also advance this version so the installed skill and acquired code always correspond.

1. Update `package.json` and `CHANGELOG.md`.
2. Run the commands above and review the skill changes.
3. Commit the generated runners with their release version and implementation digest.
4. Push main and create an immutable `v<version>` tag at that commit. Never move a published tag.
5. CI verifies the package and publishes a GitHub release. Confirm first-run acquisition from that tag before recommending the update.

GitHub tag archives are the acquisition source; no npm registry account or publish token is required. Do not introduce implicit latest-version resolution, installation lifecycle scripts or project dependency writes.

## Pull requests

Explain the outcome, compatibility impact and checks performed. Conventional Commit prefixes are useful; concise messages in English or Japanese are welcome. Do not include credentials, private project files, caches or generated package archives.

Contributions are licensed under this repository's MIT license. No CLA or DCO is required.
