---
name: release
description: Cut a release of genlayer-js. Bumps version, updates CHANGELOG, tags, pushes — CI then publishes to npm and creates the GitHub Release. Use when a human asks "release v1.x.y" or "ship a new version".
---

# Release skill — genlayer-js

This repo follows a branch-per-major release model. There is no auto-bump on push. A release happens when a human (or you on their behalf) runs `scripts/release.sh` on the target stable branch.

## When to use this skill

User asks anything like:
- "release v1.2.0"
- "ship a patch"
- "cut a new minor"
- "tag the latest fix as a release"

If they ask "publish to npm directly" — refuse and point at this flow. The repo doesn't have an unprotected npm push path; the tag is the only release entry point.

## What this repo's release model expects

- Branches are named after the major they ship: `v1` (current stable), `v2-dev` / `v2` (next major when it exists).
- Tags live within those branches: `v1.1.9`, `v1.2.0`, ...
- A major bump means **cutting a new branch**, not tagging on the current one. The release script refuses major bumps unless `--allow-major` is passed.
- `CHANGELOG.md` is updated in the release commit (release-it via `@release-it/conventional-changelog`).
- `publish.yml` fires on the tag push and does the npm publish + GitHub Release.

## Steps

1. **Confirm intent with the user.**
   - Which version? If unspecified, ask whether it's patch / minor / explicit.
   - Which branch? Default `v1`. If they're shipping a back-port to an older major, the branch is `v<old>`.

2. **Switch to the target branch + sync.**
   ```bash
   git checkout v1
   git pull --ff-only origin v1
   ```
   If the working tree isn't clean, stop and surface what's there — never stash and ship.

3. **Verify the head is shippable.**
   - Latest CI run on this commit is green (the release script also checks, but check first so you don't half-run the script):
     ```bash
     gh run list --branch v1 --commit "$(git rev-parse HEAD)" --limit 1
     ```
   - Inspect the last few commits since the previous tag for surprises:
     ```bash
     git log "$(git describe --tags --abbrev=0)..HEAD" --oneline
     ```
   - If anything looks unexpected (e.g. an in-flight refactor accidentally landed), surface it and wait for the user's call.

4. **Run the release script.**
   ```bash
   scripts/release.sh <X.Y.Z>     # or patch / minor
   ```
   It will: bump `package.json`, prepend `CHANGELOG.md`, commit `Release v<X.Y.Z> [skip ci]`, tag `v<X.Y.Z>`, and push both the branch commit and the tag. It will NOT publish to npm — CI handles that.

5. **Watch the publish workflow.**
   ```bash
   gh run watch
   ```
   or
   ```bash
   gh run list --workflow=publish.yml --limit 1
   ```
   If `publish.yml` fails (typical causes: tag/package.json mismatch — caused by hand-editing `package.json` outside the script; `NPM_TOKEN` rotated; npm provenance check), report the failure verbatim and stop. Do not retry blindly.

6. **Confirm on npm.**
   ```bash
   npm view genlayer-js dist-tags
   ```
   The `latest` tag should show the new version. Report back to the user with the version and the GitHub Release URL.

## Things to refuse

- **Major bump on the current branch** without `--allow-major`. The right move for a major is a new branch + new track in the runner matrix (separate workflow).
- **Releasing from `main`** — `main` is retired. If somehow `main` exists locally, the script will refuse; explain why.
- **Hand-editing `package.json` to bump the version** instead of running the script. The script keeps `package.json`, the CHANGELOG entry, the commit message, and the tag in lockstep; doing it by hand drifts them.
- **Publishing a tag where `publish.yml` failed** — fix the underlying issue, re-cut the release (delete the bad tag both locally and on origin, re-run the script). Don't manually `npm publish`.

## Roll-back

If a release shipped but is broken:

1. **Don't unpublish from npm** unless someone with elevated permissions has assessed the impact — npm unpublish has a 72-hour window and a deprecation path that consumers prefer.
2. **Deprecate the bad version**:
   ```bash
   npm deprecate "genlayer-js@<X.Y.Z>" "broken release; install <X.Y.Z+1> or later"
   ```
3. **Ship a follow-up patch** via the same flow (`scripts/release.sh patch`).

## Why no auto-bump?

The previous flow auto-bumped on every push to `main`, which:
- Twice landed accidental major bumps (`0.28.7 → 1.0.0`, `v1-prerelease → v2-yanked` in testing-suite) because conventional-commit `BREAKING CHANGE` notes are too easy to drop into a PR.
- Tied "shipping a release" to "merging a PR", which conflated two decisions.
- Left no human checkpoint between "code lands" and "users get it".

Manual + scripted is the trade we made: small overhead per release in exchange for never shipping a surprise.
