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
#   scripts/release.sh --promote <X.Y.Z>    (any checkout with this script)
#     Fast-forwards v<MAJOR> to that commit with a plain push, then tags it.
#     If an earlier run moved v<MAJOR> but did not push the tag, it only tags.
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
# Options (accepted before or after the version):
#   --dry-run       Run every check and print the plan; change nothing.
#   --allow-major   Allow a major bump (a major means a new branch pair).
#   --promote       Second step of a final.
#
# Through npm the options have to follow "--" (npm run release -- --dry-run
# 2.0.1); npm keeps them otherwise, and the script then refuses to run.
#
# Checks before a release commit (each one refuses on failure):
#   - origin is this repository; on the v<MAJOR>-dev branch of the version,
#     working tree clean, HEAD equal to origin
#   - No red Run Tests workflow run on that exact commit
#   - The version is newer than package.json and every tag of the line
#   - For a final: origin/v<MAJOR> exists and is an ancestor of HEAD
#
# Checks before --promote:
#   - Tag vX.Y.Z does not exist on origin
#   - origin/v<MAJOR>-dev head is the release commit of X.Y.Z and
#     origin/v<MAJOR> is an ancestor of it, or origin/v<MAJOR> already is
#     that release commit
#   - Run Tests and E2E Tests are green on that exact commit

set -euo pipefail

# Checks are read from this repository, so origin has to be it too.
REPO="genlayerlabs/genlayer-js"
TESTS_WORKFLOW="test.yml"
TESTS_NAME="Run Tests"
TESTS_RUN="Run Tests workflow run"
E2E_CHECK="E2E Tests"
# GitHub App the stable-branch ruleset requires the check from.
E2E_APP_ID=2929262

usage() {
  cat >&2 <<EOF
Usage: $0 [--dry-run] [--allow-major] <X.Y.Z-rc.N>             release candidate
       $0 [--dry-run] [--allow-major] <X.Y.Z>|patch|minor|major  final, step 1
       $0 [--dry-run] --promote <X.Y.Z>                        final, step 2
EOF
}

ALLOW_MAJOR=0
DRY_RUN=0
PROMOTE=0
VERSION_ARG=""
for arg in "$@"; do
  case "$arg" in
    --allow-major) ALLOW_MAJOR=1 ;;
    --dry-run) DRY_RUN=1 ;;
    --promote) PROMOTE=1 ;;
    -*)
      echo "Unknown option: $arg" >&2
      usage
      exit 2
      ;;
    *)
      if [ -n "$VERSION_ARG" ]; then
        echo "Unexpected extra argument: $arg" >&2
        usage
        exit 2
      fi
      VERSION_ARG="$arg"
      ;;
  esac
done

# npm keeps options that do not follow "--", so the script would run without them.
if [ -n "${npm_lifecycle_event:-}" ]; then
  kept=""
  if [[ "${npm_config_dry_run:-}" == "true" && "$DRY_RUN" -eq 0 ]]; then kept+=" --dry-run"; fi
  if [[ "${npm_config_promote:-}" == "true" && "$PROMOTE" -eq 0 ]]; then kept+=" --promote"; fi
  if [[ "${npm_config_allow_major:-}" == "true" && "$ALLOW_MAJOR" -eq 0 ]]; then kept+=" --allow-major"; fi
  if [ -n "$kept" ]; then
    cat >&2 <<EOF
npm kept$kept for itself, so this script did not receive it.
Call scripts/release.sh directly, or put the options after "--":
  npm run release --$kept <version>
EOF
    exit 2
  fi
fi

if [ -z "$VERSION_ARG" ]; then
  usage
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

require_canonical_origin() {
  local url
  url="$(git config --get remote.origin.url | tr '[:upper:]' '[:lower:]' || true)"
  if ! [[ "$url" =~ github\.com[:/]+$REPO(\.git)?/?$ ]]; then
    cat >&2 <<EOF
origin is '${url:-unset}', not github.com/$REPO.
The checks are read from $REPO, so the branches and the tag have to be
pushed there as well. Run this from a clone whose origin is that repository.
EOF
    exit 1
  fi
}

# True when the commit is the release commit of the version.
is_release_commit() {
  [ "$(git log -1 --format=%s "$1")" = "Release v$2" ] && [ "$(package_version_at "$1")" = "$2" ]
}

# Prints green, red, pending or missing for the test workflow runs of one commit.
tests_verdict() {
  local conclusions
  conclusions="$(gh run list -R "$REPO" --workflow "$TESTS_WORKFLOW" --commit "$1" --limit 100 \
    --json status,conclusion \
    --jq '.[] | if .status == "completed" then .conclusion else "pending" end' 2>/dev/null || true)"
  # shellcheck disable=SC2086
  policy runs-verdict $conclusions
}

require_green_e2e() {
  local sha="$1" dev="$2" stable="$3" state
  # filter=all: the newest check run decides, so a rerun in progress is not hidden.
  state="$(
    gh api -X GET "repos/$REPO/commits/$sha/check-runs" \
      -f check_name="$E2E_CHECK" -f filter=all -f per_page=100 \
      --jq "[.check_runs[] | select(.app.id == $E2E_APP_ID)] | sort_by(.id) | last
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
  local version dev stable tag sha dev_sha stable_sha tag_sha have_tag=0
  version="$(policy normalize "$VERSION_ARG")" || exit 2
  if [ "$(policy is-prerelease "$version")" = "true" ]; then
    echo "$version is a prerelease: those are tagged on the dev branch and never promoted." >&2
    exit 2
  fi
  if ! command -v gh >/dev/null 2>&1; then
    echo "GitHub CLI is required to verify the checks on the release commit." >&2
    exit 1
  fi
  require_canonical_origin
  dev="$(policy dev-branch "$version")"
  stable="$(policy stable-branch "$version")"
  tag="v$version"

  if ! git fetch --quiet --tags origin \
    "+refs/heads/$dev:refs/remotes/origin/$dev" \
    "+refs/heads/$stable:refs/remotes/origin/$stable"; then
    echo "Could not fetch $dev and $stable from origin. Both branches must exist before promoting." >&2
    exit 1
  fi
  dev_sha="$(git rev-parse "origin/$dev")"
  stable_sha="$(git rev-parse "origin/$stable")"

  if [ -n "$(git ls-remote --tags origin "refs/tags/$tag")" ]; then
    echo "Tag $tag already exists on origin; $version is already released." >&2
    exit 1
  fi

  if is_release_commit "$stable_sha" "$version"; then
    # An earlier run moved the stable branch but did not push the tag.
    sha="$stable_sha"
  elif is_release_commit "$dev_sha" "$version"; then
    sha="$dev_sha"
    if ! git merge-base --is-ancestor "$stable_sha" "$sha"; then
      cat >&2 <<EOF
$stable ($stable_sha) is not an ancestor of $dev ($sha), so $stable can't
be fast-forwarded. Merge $stable into $dev, cut the release commit again
and let the checks run on the new head.
EOF
      exit 1
    fi
  else
    cat >&2 <<EOF
The head of $dev is not the release commit of $version:
  $dev_sha $(git log -1 --format=%s "$dev_sha")

Run 'scripts/release.sh $version' on $dev first. If commits landed after
the release commit, revert it, then cut it again so the changelog and the
tested commit include them.
EOF
    exit 1
  fi

  if tag_sha="$(git rev-parse --verify --quiet "refs/tags/$tag^{commit}")"; then
    if [ "$tag_sha" != "$sha" ] || [ "$(git cat-file -t "refs/tags/$tag")" != "tag" ]; then
      echo "A local tag $tag exists that is not an annotated tag on $sha. Delete it (git tag -d $tag) and retry." >&2
      exit 1
    fi
    # Left by a run whose tag push failed.
    have_tag=1
  fi

  case "$(tests_verdict "$sha")" in
    green) ;;
    red)
      echo "A $TESTS_RUN on $sha is not green. Refusing to release a red commit." >&2
      exit 1
      ;;
    pending)
      echo "A $TESTS_RUN on $sha is still running. Wait for it and retry." >&2
      exit 1
      ;;
    *)
      echo "No green $TESTS_RUN found for $sha. Refusing to release an unverified commit." >&2
      exit 1
      ;;
  esac
  require_green_e2e "$sha" "$dev" "$stable"

  echo "Promoting v$version: $stable -> $sha, then tag $tag."
  if [[ "$DRY_RUN" -eq 1 ]]; then
    if [ "$stable_sha" = "$sha" ]; then
      echo "  $stable is already at $sha; no branch push needed."
    else
      echo "  would run: git push --no-follow-tags origin $sha:refs/heads/$stable"
    fi
    if [[ "$have_tag" -eq 1 ]]; then
      echo "  would run: git push origin refs/tags/$tag (local tag already on $sha)"
    else
      echo "  would run: git tag -a $tag -m \"Release $version\" $sha && git push origin refs/tags/$tag"
    fi
    echo "Dry run complete; no branch, tag, push, or publication was performed."
    exit 0
  fi

  # Plain fast-forward: keeps ancestry, and the promotion PR closes as merged.
  if [ "$stable_sha" != "$sha" ]; then
    git push --no-follow-tags origin "$sha:refs/heads/$stable"
  fi
  if [[ "$have_tag" -eq 0 ]]; then
    git tag -a "$tag" -m "Release $version" "$sha"
  fi
  git push origin "refs/tags/$tag"

  echo
  echo "Pushed $tag on $stable. publish.yml will fire on the tag and ship to npm."
  echo "Track it at: https://github.com/$REPO/actions"
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

require_canonical_origin
git fetch --tags origin "+refs/heads/$branch:refs/remotes/origin/$branch"
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
      echo "A $TESTS_RUN on $branch@$local_sha is not green. Refusing to release a red commit." >&2
      exit 1
      ;;
    pending)
      echo "Warning: a $TESTS_RUN on $local_sha is still running. Continuing anyway." >&2
      ;;
    *)
      echo "Warning: no $TESTS_RUN found for $local_sha. Continuing anyway." >&2
      ;;
  esac
fi

current_version="$(node -p "require('./package.json').version")"

# Asked from origin: a local tag may be left over from a failed tag push.
if [ "$(policy is-prerelease "$current_version")" = "false" ] &&
  [ -z "$(git ls-remote --tags origin "refs/tags/v$current_version")" ]; then
  cat >&2 <<EOF
package.json is at $current_version, which has no tag on origin: $branch
carries an unpublished final release commit. Finish it with
'scripts/release.sh --promote $current_version'. If it must not ship and the
stable branch has not moved to it, revert that commit and run this again.
EOF
  exit 1
fi

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
  echo "package.json is already at $next_version; nothing to bump." >&2
  exit 1
fi

# Tags of the line may be ahead of package.json, for example after a revert.
# shellcheck disable=SC2046
policy assert-newer "$next_version" "$current_version" $(git tag -l "$stable.*") >/dev/null || exit 1

# A final has to reach the stable branch by fast-forward: catch a diverged
# stable branch now, before an E2E run is spent on the release commit.
if git fetch --quiet origin "+refs/heads/$stable:refs/remotes/origin/$stable" 2>/dev/null; then
  if ! git merge-base --is-ancestor "origin/$stable" HEAD; then
    if [ "$kind" = "final" ]; then
      cat >&2 <<EOF
$stable has commits that are not in $branch, so it can't be fast-forwarded
to a release commit made here. Merge $stable into $branch first.
EOF
      exit 1
    fi
    echo "Warning: $stable has commits that are not in $branch; merge it before the final." >&2
  fi
elif [ "$kind" = "final" ]; then
  cat >&2 <<EOF
$stable does not exist on origin. The promotion PR needs it as its base:
create it from a commit that is already in $branch (see docs/BRANCHING.md).
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
  release_args+=(--no-git.tag --git.pushArgs=--no-follow-tags)
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
  echo "Track it at: https://github.com/$REPO/actions"
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
  1. Hold every merge into $branch until step 3 is done: a commit landing
     after this one forces a new release commit and a new E2E run.
  2. Open the promotion PR $branch -> $stable (or reuse the open one) and
     run E2E on it: comment /run-e2e all.
  3. When $TESTS_NAME and $E2E_CHECK are green on $release_sha:
       scripts/release.sh --promote $next_version

Nothing else may merge that PR: no merge button, no auto-merge, no
/merge-train, no Legatus self-merge. --promote fast-forwards $stable to
this commit and GitHub then closes the PR as merged.
EOF
