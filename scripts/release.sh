#!/usr/bin/env bash
# Cut a release of the line owned by a v<MAJOR>-dev branch.
#
# Nothing is published from here: publish.yml ships to npm and creates
# the GitHub Release when the tag arrives. Only this script is supposed
# to create release commits and tags.
#
# Release candidate, one step on v<MAJOR>-dev:
#   scripts/release.sh <X.Y.Z-rc.N>
#     Release commit and tag, both pushed to v<MAJOR>-dev.
#
# Final, two steps:
#   scripts/release.sh <X.Y.Z>              (on v<MAJOR>-dev)
#     Release commit pushed to v<MAJOR>-dev, no tag. It becomes the head
#     of the promotion PR v<MAJOR>-dev -> v<MAJOR>, so E2E Tests runs on it.
#   scripts/release.sh --promote <X.Y.Z>    (any checkout)
#     Fast-forwards v<MAJOR> to that commit with a plain push, then tags it.
#
# The stable branch only accepts commits with a green E2E Tests check,
# so the release commit has to exist (and pass) on dev before it can
# reach v<MAJOR>. That is why finals are no longer bumped on the stable
# branch.
#
# Keywords instead of a version (always a final, step 1):
#   scripts/release.sh patch       # 2.0.0 → 2.0.1
#   scripts/release.sh minor       # 2.0.0 → 2.1.0
#   scripts/release.sh major       # 2.0.0 → 3.0.0 (refuses unless --allow-major)
#
# Options:
#   --dry-run       Run every check and print the plan; change nothing.
#   --allow-major   Allow a major bump (a major means a new branch pair).
#   --promote       Second step of a final.
#
# Checks before a release commit (each one refuses on failure):
#   - On the v<MAJOR>-dev branch of the version, working tree clean,
#     HEAD equal to origin
#   - No red Run Tests workflow run on that exact commit
#
# Checks before --promote:
#   - origin/v<MAJOR>-dev head is the release commit of X.Y.Z
#   - origin/v<MAJOR> is an ancestor of it (the push is a fast-forward)
#   - Run Tests and E2E Tests are green on that exact commit
#   - Tag vX.Y.Z does not exist yet

set -euo pipefail

TESTS_WORKFLOW="test.yml"
E2E_CHECK="E2E Tests"
E2E_APP="ci-core-e2e-runner"

ALLOW_MAJOR=0
DRY_RUN=0
PROMOTE=0
while [[ "${1:-}" == --* ]]; do
  case "$1" in
    --allow-major) ALLOW_MAJOR=1 ;;
    --dry-run) DRY_RUN=1 ;;
    --promote) PROMOTE=1 ;;
    *) echo "Unknown option: $1" >&2; exit 2 ;;
  esac
  shift
done

VERSION_ARG="${1:-}"
if [ -z "$VERSION_ARG" ]; then
  cat >&2 <<EOF
Usage: $0 [--dry-run] [--allow-major] <X.Y.Z-rc.N>             release candidate
       $0 [--dry-run] [--allow-major] <X.Y.Z>|patch|minor|major  final, step 1
       $0 [--dry-run] --promote <X.Y.Z>                        final, step 2
EOF
  exit 2
fi

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

policy() {
  node scripts/release-policy.mjs "$@"
}

package_version_at() {
  git show "$1:package.json" | node -p "JSON.parse(require('fs').readFileSync(0, 'utf8')).version"
}

# Prints green, red or missing for the test workflow runs of one commit.
tests_verdict() {
  local conclusions
  conclusions="$(gh run list --workflow "$TESTS_WORKFLOW" --commit "$1" --json conclusion --jq '.[].conclusion' 2>/dev/null || true)"
  # shellcheck disable=SC2086
  policy runs-verdict $conclusions
}

require_green_e2e() {
  local sha="$1" dev="$2" stable="$3" state
  state="$(
    gh api -X GET "repos/{owner}/{repo}/commits/$sha/check-runs" \
      -f check_name="$E2E_CHECK" -f filter=latest -f per_page=100 \
      --jq "[.check_runs[] | select(.app.slug == \"$E2E_APP\")] | sort_by(.id) | last
            | if . == null then \"missing\" else (.conclusion // .status) end" 2>/dev/null || echo "unknown"
  )"
  if [ "$state" != "success" ]; then
    cat >&2 <<EOF
$E2E_CHECK on $sha is '$state' (not success).

Open the promotion PR $dev -> $stable if there is none, run E2E on it
(comment /run-e2e all) and wait for the check to pass on this commit.
EOF
    exit 1
  fi
}

promote() {
  local version dev stable tag sha stable_sha subject package_version
  version="$(policy normalize "$VERSION_ARG")" || exit 2
  if [ "$(policy is-prerelease "$version")" = "true" ]; then
    echo "$version is a prerelease: those are tagged on the dev branch and never promoted." >&2
    exit 2
  fi
  if ! command -v gh >/dev/null 2>&1; then
    echo "GitHub CLI is required to verify the checks on the release commit." >&2
    exit 1
  fi
  dev="$(policy dev-branch "$version")"
  stable="$(policy stable-branch "$version")"
  tag="v$version"

  if ! git fetch --quiet --tags origin \
    "+refs/heads/$dev:refs/remotes/origin/$dev" \
    "+refs/heads/$stable:refs/remotes/origin/$stable"; then
    echo "Could not fetch $dev and $stable from origin. Both branches must exist before promoting." >&2
    exit 1
  fi
  sha="$(git rev-parse "origin/$dev")"
  stable_sha="$(git rev-parse "origin/$stable")"

  if [ -n "$(git ls-remote --tags origin "refs/tags/$tag")" ]; then
    echo "Tag $tag already exists on origin; $version is already released." >&2
    exit 1
  fi
  if git rev-parse --verify --quiet "refs/tags/$tag" >/dev/null; then
    echo "A local tag $tag exists but is not on origin. Delete it (git tag -d $tag) and retry." >&2
    exit 1
  fi

  subject="$(git log -1 --format=%s "$sha")"
  if [ "$subject" != "Release v$version" ]; then
    cat >&2 <<EOF
The head of $dev is not the release commit of $version:
  $sha $subject

Run 'scripts/release.sh $version' on $dev first. If commits landed after
the release commit, revert it, then cut it again so the changelog and the
tested commit include them.
EOF
    exit 1
  fi
  package_version="$(package_version_at "$sha")"
  if [ "$package_version" != "$version" ]; then
    echo "package.json at $sha says $package_version, not $version. Refusing to tag." >&2
    exit 1
  fi

  if [ "$stable_sha" != "$sha" ] && ! git merge-base --is-ancestor "$stable_sha" "$sha"; then
    cat >&2 <<EOF
$stable ($stable_sha) is not an ancestor of $dev ($sha), so $stable can't
be fast-forwarded. Merge $stable into $dev, cut the release commit again
and let the checks run on the new head.
EOF
    exit 1
  fi

  case "$(tests_verdict "$sha")" in
    green) ;;
    red)
      echo "A Run Tests workflow run on $sha is not green. Refusing to release a red commit." >&2
      exit 1
      ;;
    *)
      echo "No green Run Tests workflow run found for $sha. Refusing to release an unverified commit." >&2
      exit 1
      ;;
  esac
  require_green_e2e "$sha" "$dev" "$stable"

  echo "Promoting v$version: $stable -> $sha, then tag $tag."
  if [[ "$DRY_RUN" -eq 1 ]]; then
    if [ "$stable_sha" = "$sha" ]; then
      echo "  $stable is already at $sha; no branch push needed."
    else
      echo "  would run: git push origin $sha:refs/heads/$stable"
    fi
    echo "  would run: git tag -a $tag -m \"Release $version\" $sha && git push origin refs/tags/$tag"
    echo "Dry run complete; no branch, tag, push, or publication was performed."
    exit 0
  fi

  # Plain fast-forward: keeps ancestry, and the promotion PR closes as merged.
  if [ "$stable_sha" != "$sha" ]; then
    git push origin "$sha:refs/heads/$stable"
  fi
  git tag -a "$tag" -m "Release $version" "$sha"
  git push origin "refs/tags/$tag"

  echo
  echo "Pushed $tag on $stable. publish.yml will fire on the tag and ship to npm."
  echo "Track it at: https://github.com/genlayerlabs/genlayer-js/actions"
}

if [[ "$PROMOTE" -eq 1 ]]; then
  if [[ "$ALLOW_MAJOR" -eq 1 ]]; then
    echo "--promote takes only --dry-run and the final version." >&2
    exit 2
  fi
  promote
  exit 0
fi

branch="$(git rev-parse --abbrev-ref HEAD)"
if ! [[ "$branch" =~ ^v[0-9]+(\.[0-9]+)?-dev$ ]]; then
  cat >&2 <<EOF
Refusing to release from '$branch'.

Release commits are made on the dev branch of the line (v2-dev for
v2.x.y): release candidates are tagged there, and finals are promoted
to the stable branch with 'scripts/release.sh --promote <X.Y.Z>'.
A line without a dev branch needs one first (create v<MAJOR>-dev from
v<MAJOR>). See docs/BRANCHING.md.
EOF
  exit 1
fi

if [ -n "$(git status --porcelain)" ]; then
  echo "Working tree not clean. Stash or commit first." >&2
  exit 1
fi

git fetch --tags origin "$branch"
local_sha="$(git rev-parse HEAD)"
remote_sha="$(git rev-parse "origin/$branch")"
if [ "$local_sha" != "$remote_sha" ]; then
  cat >&2 <<EOF
Local $branch ($local_sha) does not match origin/$branch ($remote_sha).
Pull (or push) before releasing so the release commit sits on the
branch's public history.
EOF
  exit 1
fi

# Skipped when gh isn't installed; --promote always enforces a green run.
if command -v gh >/dev/null 2>&1; then
  case "$(tests_verdict "$local_sha")" in
    green) ;;
    red)
      echo "A Run Tests workflow run on $branch@$local_sha is not green. Refusing to release a red commit." >&2
      exit 1
      ;;
    *)
      echo "Warning: no Run Tests workflow run found for $local_sha. Continuing anyway." >&2
      ;;
  esac
fi

current_version="$(node -p "require('./package.json').version")"

# Resolve to a concrete X.Y.Z so the guards below can compare.
case "$VERSION_ARG" in
  major|minor|patch)
    next_version="$(node -e "
      const semver = require('semver');
      const cur = require('./package.json').version;
      const inc = '$VERSION_ARG';
      const out = semver.inc(cur, inc);
      if (!out) { console.error('semver.inc failed for', cur, inc); process.exit(1); }
      console.log(out);
    ")"
    ;;
  *)
    next_version="$VERSION_ARG"
    ;;
esac

# Validate the version and its branch early so we don't half-bump.
next_version="$(policy validate "$branch" "$next_version")" || exit 2
stable="$(policy stable-branch "$next_version")"
kind="final"
if [ "$(policy is-prerelease "$next_version")" = "true" ]; then
  kind="rc"
fi

if git rev-parse --verify --quiet "refs/tags/v$next_version" >/dev/null; then
  echo "Tag v$next_version already exists; $next_version is already released." >&2
  exit 1
fi

if [ "$next_version" = "$current_version" ]; then
  cat >&2 <<EOF
package.json is already at $next_version. If $branch carries an untagged
release commit for it, promote it (scripts/release.sh --promote $next_version)
or, if commits landed after it, revert that release commit and run this again.
EOF
  exit 1
fi

cur_major="${current_version%%.*}"
next_major="${next_version%%.*}"
if [ "$next_major" != "$cur_major" ] && [ "$ALLOW_MAJOR" -ne 1 ]; then
  cat >&2 <<EOF
Refusing major bump $current_version → $next_version without --allow-major.

In this repo's release model, a major bump means cutting a new branch
(v$next_major) and switching the default. Don't tag a major on top of
the v$cur_major branch — see CONTRIBUTING.md.

If you actually want this (rare, e.g. retroactively shipping a major
that was developed on v$next_major-dev), pass --allow-major.
EOF
  exit 1
fi

# release-it bumps, writes the CHANGELOG, commits and pushes. npm publish
# and the GitHub Release are left to publish.yml; the tag of a final is
# left to --promote, once the commit is green and on the stable branch.
release_args=("$next_version" --ci --no-npm.publish --no-github.release)
if [ "$kind" = "rc" ]; then
  echo "Releasing v$next_version on $branch (was v$current_version)."
else
  echo "Preparing final v$next_version on $branch (was v$current_version); no tag until --promote."
  release_args+=(--no-git.tag)
fi

if [[ "$DRY_RUN" -eq 1 ]]; then
  npx release-it "${release_args[@]}" --dry-run
  echo "Dry run complete; no release commit, tag, push, or publication was performed."
  exit 0
fi

npx release-it "${release_args[@]}"

if [ "$kind" = "rc" ]; then
  echo
  echo "Pushed v$next_version. publish.yml will fire on the tag and ship to npm."
  echo "Track it at: https://github.com/genlayerlabs/genlayer-js/actions"
  exit 0
fi

release_sha="$(git rev-parse HEAD)"
if [ "$release_sha" = "$local_sha" ]; then
  echo "release-it did not create a release commit for v$next_version." >&2
  exit 1
fi

cat <<EOF

Pushed the release commit of v$next_version to $branch ($release_sha). No tag yet.

Next:
  1. Open the promotion PR $branch -> $stable (or reuse the open one) and
     run E2E on it: comment /run-e2e all.
  2. When Run Tests and $E2E_CHECK are green on $release_sha:
       scripts/release.sh --promote $next_version

Do not press the merge button on that PR: --promote fast-forwards $stable
to this commit and GitHub then closes the PR as merged.
EOF
