# Branching and Release Trains

This repo follows the GenLayer release-train model.

## Current Train

- Current stable branch: `v1`
- Active integration branch: `v2-dev`
- Next stable target: `v2`
- `main`: default/static branch alias for the active integration branch

## Stable Branches

Stable branches are long-lived release lines. They are named after the version
line they ship, for example `v1` or `v2`.

PRs may target a stable branch directly when the merged result should be
releasable immediately. This is appropriate for bug fixes, small non-breaking
features, isolated release fixes, or a breaking change that is intentionally
shipping as the next version by itself.

Stable branches must remain releasable. PRs into stable branches are expected to
pass the required cross-repo `E2E Tests` gate before merge.

## Integration Branches

Integration branches are optional. Use one when multiple changes need to
accumulate before release, especially for cross-repo work, dependent features,
breaking changes that must ship together, or a train that needs advisory E2E
while still expected to be red.

Integration branches are named after the target stable branch plus `-dev`, for
example `v2-dev`. Feature PRs for that train target the integration branch.

PRs into integration branches may run `E2E Tests` as advisory checks. They are
not the release gate.

## Promotion and Release

When an integration train is ready, open a promotion PR from the integration
branch to the matching stable branch, for example `v2-dev` to `v2`.

That promotion PR is the release-readiness gate and must pass required
cross-repo `E2E Tests`. The stable branch rejects any commit without a green
`E2E Tests` check, so the final version bump is made on the integration branch
before promotion, never on the stable branch after it:

1. `scripts/release.sh X.Y.Z` on `vX-dev` pushes the release commit
   (`package.json`, `package-lock.json`, `CHANGELOG.md`) to the integration
   branch, without a tag. It is now the head of the promotion PR.
2. `Run Tests` and `E2E Tests` run on that commit.
3. `scripts/release.sh --promote X.Y.Z` fast-forwards `vX` to that exact commit
   with a plain push and pushes the annotated tag `vX.Y.Z` on it. The tag push
   triggers the publish workflow.

The promotion PR is never merged with the merge button. This repo only allows
squash merges, and a squash commit is a new commit that `E2E Tests` did not run
on; it also breaks ancestry between the two branches, so the next promotion PR
conflicts on the version lines. After the fast-forward GitHub marks the PR as
merged by itself.

If a fix lands on the integration branch after the release commit, revert the
release commit and run step 1 again, so the tested commit and the changelog
include the fix.

A release candidate may be cut earlier from the integration branch with
`scripts/release.sh X.Y.Z-rc.N`; RC tags use `vX.Y.Z-rc.N`, sit on the
integration branch, publish to the `rc` npm dist-tag, and never substitute for
the promotion PR's final release gate.

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
