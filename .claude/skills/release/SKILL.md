---
name: release
description: Cut a release or release candidate of genlayer-js. Bumps version and CHANGELOG on the dev branch, promotes finals to the stable branch by fast-forward, tags — CI then publishes to npm and creates the GitHub Release. Use when a human asks "release v2.x.y" or "ship a new version".
---

# Release skill — genlayer-js

This repo follows a branch-per-major release model. There is no auto-bump on push. Every release commit is made on the `v<MAJOR>-dev` branch of its line with `scripts/release.sh`. An RC is tagged there; a final is promoted to the stable branch by fast-forward and tagged on the stable head.

## When to use this skill

User asks anything like:
- "release v2.0.1"
- "ship a patch"
- "cut a new minor"
- "cut an RC"
- "tag the latest fix as a release"

If they ask "publish to npm directly" — refuse and point at this flow. The repo doesn't have an unprotected npm push path; the tag is the only release entry point.

## What this repo's release model expects

- Branches are named after the major they ship: `v2` (stable) and `v2-dev` (integration); `v3-dev` is the next major.
- Tags live within those branches: `v2.0.1`, `v2.1.0`, ... on the stable branch; `v2.0.1-rc.1` on the dev branch.
- The stable branch has a ruleset that rejects any commit without a green `E2E Tests` check. A release commit therefore can't be created on the stable branch: it is created on dev, tested there, and the stable branch is fast-forwarded to it.
- The promotion PR `v2-dev` → `v2` is where `E2E Tests` runs. Only `--promote` lands it: it pushes the fast-forward and GitHub closes the PR as merged. It is never merged with the merge button, GitHub auto-merge, the E2E app's merge train (`/merge`, `/merge-train` or its merge action) or the Legatus self-merge loop: this repo only allows squash merges, and a squash commit is a commit `E2E Tests` did not run on that also breaks ancestry between the two branches.
- A major bump means **cutting a new branch pair**, not tagging on the current one. The release script refuses major bumps unless `--allow-major` is passed.
- `CHANGELOG.md` is updated in the release commit (release-it via `@release-it/conventional-changelog`).
- `publish.yml` fires on the tag push and does the npm publish + GitHub Release. Finals go to the `latest` dist-tag, RCs to `rc`.

## Steps: release candidate

1. **Confirm the version** with the user (`X.Y.Z-rc.N`).
2. **Sync the dev branch.**
   ```bash
   git checkout v2-dev
   git pull --ff-only origin v2-dev
   ```
   If the working tree isn't clean, stop and surface what's there — never stash and ship.
3. **Dry run, then release.**
   ```bash
   scripts/release.sh --dry-run 2.0.1-rc.1
   scripts/release.sh 2.0.1-rc.1
   scripts/release.sh --allow-major 3.0.0-rc.1   # first RC of a new major, on v3-dev
   ```
   The real command commits `Release v<X.Y.Z-rc.N>`, tags it, and pushes both to the dev branch.
4. **Watch the publish workflow** (see below).

## Steps: final

1. **Confirm intent with the user.**
   - Which version? If unspecified, ask whether it's patch / minor / explicit.
   - Which line? Default is the current stable line (`v2-dev` → `v2`).

2. **Sync the dev branch and look at what ships.**
   ```bash
   git checkout v2-dev
   git pull --ff-only origin v2-dev
   git log "$(git describe --tags --abbrev=0)..HEAD" --oneline
   ```
   If anything looks unexpected (e.g. an in-flight refactor accidentally landed), surface it and wait for the user's call.

3. **Create the release commit on dev (no tag).**
   ```bash
   scripts/release.sh --dry-run 2.0.1
   scripts/release.sh 2.0.1        # or patch / minor
   ```
   This bumps `package.json` and `package-lock.json`, prepends `CHANGELOG.md`, commits `Release v2.0.1` and pushes it to `v2-dev`. The script refuses a version that is not newer than every tag of the line, and refuses if `v2` is not an ancestor of `v2-dev`. The dry run prints the changelog entry and every command release-it would run. Call the script directly: `npm run release` drops options such as `--dry-run` unless they follow `--`, and the script refuses to run when that happens.

4. **Hold merges into `v2-dev`.** From the push in step 3 until step 6 is done, nothing else merges into `v2-dev`. A commit that lands after the release commit means the head of dev is no longer the tested release commit: `--promote` refuses, and the release commit has to be reverted and cut again with a new full E2E run. Tell the team, and check that no open PR into `v2-dev` has auto-merge enabled or is about to be merged by the Legatus loop.

5. **Promotion PR and E2E.** Open `v2-dev` → `v2` if it isn't open yet (the Branch Policy check only accepts the dev branch as head). Its head is now the release commit. Ask for E2E on it with a PR comment:
   ```text
   /run-e2e all
   ```
   Wait for `Run Tests` and `E2E Tests` to be green on the release commit. Do not merge the PR, and do not let anything else merge it (auto-merge, `/merge`, `/merge-train`, Legatus).

6. **Promote.**
   ```bash
   scripts/release.sh --promote --dry-run 2.0.1
   scripts/release.sh --promote 2.0.1
   ```
   Run it from a checkout that has this version of the script: the dev branch, or the stable branch once it has been promoted with it. It verifies that the head of `v2-dev` is the release commit of that version, that `v2` is an ancestor of it, and that `Run Tests` and `E2E Tests` are green on it. Then it runs `git push origin <sha>:refs/heads/v2` (a plain fast-forward) and pushes the annotated tag `v2.0.1` on the same commit. Options are accepted before or after the version.

7. **Watch the publish workflow.**
   ```bash
   gh run watch
   ```
   or
   ```bash
   gh run list --workflow=publish.yml --limit 1
   ```
   If `publish.yml` fails (typical causes: tag/package.json mismatch — caused by hand-editing `package.json` outside the script; `NPM_TOKEN` rotated; npm provenance check), report the failure verbatim and stop. Do not retry blindly.

8. **Confirm on npm.**
   ```bash
   npm view genlayer-js dist-tags
   ```
   The `latest` tag should show the new version. Report back to the user with the version and the GitHub Release URL.

## When something goes wrong between the steps

- **E2E is red on the release commit, or a commit landed on dev after it, and the stable branch has not moved.** The head of dev is no longer a tested release commit and `--promote` refuses. Revert the release commit (`git revert <sha>`, pushed to dev), land the fix if there is one, and run step 3 again. The new release commit lists the change in the changelog, and E2E runs again on it.
- **The stable branch moved** (it is not an ancestor of dev any more). Merge the stable branch into dev, cut the release commit again, and let the checks run on the new head.
- **`--promote` stopped after the branch push and before the tag.** Run it again. It finds the release commit at the head of the stable branch, checks it again and pushes only the tag; this works even when dev has moved on since, and it reuses the local tag a failed tag push left behind. Do not revert anything in this case: the stable branch already holds the release.
- **The fast-forward push is rejected by the ruleset.** The commit does not have a green `E2E Tests` check from the E2E app. Do not ask for a bypass; get the check green on that commit.

## Things to refuse

- **Major bump on the current branch** without `--allow-major`. The right move for a major is a new branch pair + new track in the runner matrix (separate workflow).
- **Releasing from `main` or from the stable branch** — the script only makes release commits on `v<MAJOR>-dev`.
- **Merging the promotion PR** with the merge button, GitHub auto-merge, `/merge` or `/merge-train` (the E2E app's merge commands) or the Legatus self-merge loop, or pushing anything to the stable branch other than the `--promote` fast-forward.
- **Tagging a final by hand** — the tag must sit on the commit that `E2E Tests` ran on, which is what `--promote` guarantees.
- **Hand-editing `package.json` to bump the version** instead of running the script. The script keeps `package.json`, the CHANGELOG entry, the commit message, and the tag in lockstep; doing it by hand drifts them.
- **Publishing a tag where `publish.yml` failed** — fix the underlying issue, re-cut the release (delete the bad tag both locally and on origin, re-run the script). Don't manually `npm publish`.

## Roll-back

If a release shipped but is broken:

1. **Don't unpublish from npm** unless someone with elevated permissions has assessed the impact — npm unpublish has a 72-hour window and a deprecation path that consumers prefer.
2. **Deprecate the bad version**:
   ```bash
   npm deprecate "genlayer-js@<X.Y.Z>" "broken release; install <X.Y.Z+1> or later"
   ```
3. **Ship a follow-up patch** via the same flow (fix on `v<MAJOR>-dev`, then the final steps above).

## Why no auto-bump?

The previous flow auto-bumped on every push to `main`, which:
- Twice landed accidental major bumps (`0.28.7 → 1.0.0`, `v1-prerelease → v2-yanked` in testing-suite) because conventional-commit `BREAKING CHANGE` notes are too easy to drop into a PR.
- Tied "shipping a release" to "merging a PR", which conflated two decisions.
- Left no human checkpoint between "code lands" and "users get it".

Manual + scripted is the trade we made: small overhead per release in exchange for never shipping a surprise.
