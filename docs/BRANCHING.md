# Branching and Release Trains

This repo follows the GenLayer release-train model.

## Current Train

- Current stable branch: `v2`
- Active integration branch: `v2-dev` (patch releases of `v2`)
- Next line: `v3-dev`, promoted to `v3` when it is ready
- `main`: default/static branch alias for the active integration branch

## Stable Branches

Stable branches are long-lived release lines. They are named after the major
line they ship, for example `v2` or `v3`.

A stable branch is protected by a ruleset that rejects any commit without a
green cross-repo `E2E Tests` check, and it only moves through
`scripts/release.sh --promote`, which fast-forwards it to a release commit that
was made and tested on its integration branch.

PRs do not target a stable branch directly. A commit that lands there first is
missing from the integration branch, so the next release commit can no longer be
fast-forwarded onto the stable branch. Every change for a line, a one-line fix
included, lands on its integration branch and ships with the next release.

When a new line opens, create its stable branch `vX` at a commit that is
already in `vX-dev`, for example the commit the integration branch was created
from. The ruleset does not apply to creating a branch, and the promotion PR
needs the stable branch as its base.

## Integration Branches

Every release line has an integration branch, named after the stable branch
plus `-dev`, for example `v2-dev`. All PRs for the line target it, and
release commits are only made there.

PRs into integration branches may run `E2E Tests` as advisory checks. They are
not the release gate.

## Promotion and Release

When an integration train is ready, open a promotion PR from the integration
branch to the matching stable branch, for example `v2-dev` to `v2`.

That promotion PR is the release-readiness gate and must pass required
cross-repo `E2E Tests`. Because the stable branch rejects any commit without
that check, the final version bump is made on the integration branch before
promotion, never on the stable branch after it:

1. `scripts/release.sh X.Y.Z` on `vX-dev` pushes the release commit
   (`package.json`, `package-lock.json`, `CHANGELOG.md`) to the integration branch, without a tag. It is now the head
   of the promotion PR. The script refuses if the stable branch is not an
   ancestor of the integration branch.
2. Hold every merge into `vX-dev` until step 4 is done. A commit that lands
   after the release commit forces a new release commit and a new E2E run.
3. `Run Tests` and `E2E Tests` run on the release commit (comment
   `/run-e2e all` on the promotion PR).
4. `scripts/release.sh --promote X.Y.Z` fast-forwards `vX` to that exact
   commit with a plain push and pushes the annotated tag `vX.Y.Z` on it. The
   tag push triggers the publish workflow.

Only `--promote` lands the promotion PR. It must not be merged with the merge
button, with GitHub auto-merge, by the E2E app's merge train (`/merge`,
`/merge-train` or its merge action) or by the Legatus self-merge loop.
This repo only allows squash merges, and a squash commit is a new commit that
`E2E Tests` did not run on; it also breaks ancestry between the two branches,
so the next promotion PR conflicts on the version lines. After the fast-forward GitHub marks the PR as merged by itself.

Run `--promote` from a checkout that has this version of the script: the
integration branch, or the stable branch once it has been promoted with it.

If a commit lands on the integration branch after the release commit and the
stable branch has not moved yet, revert the release commit and run step 1
again, so the tested commit and the changelog include that change.

If `--promote` stops after it moved the stable branch and before the tag is on
origin, run it again. It finds the release commit at the head of the stable
branch, checks it again and pushes only the tag, even when the integration
branch has moved on in the meantime. Do not revert anything in that case: the
stable branch already holds the release.

A release candidate may be cut earlier from the integration branch with
`scripts/release.sh X.Y.Z-rc.N`; RC tags use `vX.Y.Z-rc.N`, sit on the
integration branch, publish to the `rc` npm dist-tag, and never substitute for the
promotion PR's final release gate.

An older stable line that has no integration branch needs one to release:
create `vX-dev` from `vX`, land the fix there, and follow the same steps.

## `main`

`main` exists for GitHub UX and tools that require a stable default branch. It is
not a release branch and it is not the integration target.

This repo keeps `main` forwarded to the active integration branch using
automation. PRs opened against `main` are automatically retargeted to the branch
listed in `support/ci/ACTIVE_DEV_BRANCH`.

When changing the active integration branch, update
`support/ci/ACTIVE_DEV_BRANCH`, the repo docs, and the corresponding
`genlayer-e2e` release-train matrix in the same change set.
