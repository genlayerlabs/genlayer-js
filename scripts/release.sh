#!/usr/bin/env bash
# Cut a release on the current stable branch.
#
# Bumps package.json, prepends CHANGELOG.md, commits, tags vX.Y.Z, and
# pushes both the branch commit and the tag. publish.yml takes over from
# the tag push (build → npm publish → GitHub Release).
#
# Releases are deliberate. There is no auto-bump on push; only this
# script (or `npm version` invoked equivalently) is supposed to create
# release tags. Run from the major branch you want to ship a release on
# (e.g. v1 for v1.x.y, v0.18 for v0.18.x once that branch exists).
#
# Usage:
#   scripts/release.sh <X.Y.Z>     # explicit semver — recommended
#   scripts/release.sh patch       # 1.1.8 → 1.1.9
#   scripts/release.sh minor       # 1.1.8 → 1.2.0
#   scripts/release.sh major       # 1.1.8 → 2.0.0 (refuses unless --allow-major)
#   scripts/release.sh --allow-major <X.Y.Z>
#
# Pre-flight (each check refuses to proceed on failure):
#   - On a v<MAJOR> branch (refuses on main / feature branches)
#   - Working tree clean
#   - Local HEAD matches origin/<branch> (no unpushed work, no missed pulls)
#   - Latest CI run on HEAD is green (so we don't ship a broken main)
#   - Major bumps require --allow-major OR explicit X.0.0 with --allow-major
#     since major = new branch in this repo's release model

set -euo pipefail

ALLOW_MAJOR=0
if [ "${1:-}" = "--allow-major" ]; then
  ALLOW_MAJOR=1
  shift
fi

VERSION_ARG="${1:-}"
if [ -z "$VERSION_ARG" ]; then
  echo "Usage: $0 [--allow-major] <X.Y.Z>|patch|minor|major" >&2
  exit 2
fi

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

branch="$(git rev-parse --abbrev-ref HEAD)"
if ! [[ "$branch" =~ ^v[0-9]+(\.[0-9]+)?(-dev)?$ ]]; then
  cat >&2 <<EOF
Refusing to release from '$branch'.

Release branches in this repo are named after the major they ship
(v1, v2, ...) or the next-major dev line (v2-dev, v3-dev). main has
been retired — see CONTRIBUTING.md for the branch model.

If you intended to ship a v1.x release, run:
  git checkout v1 && git pull --ff-only && scripts/release.sh ...
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
Pull (or push) before releasing so the published tag is reachable from
the branch's public history.
EOF
  exit 1
fi

# Latest CI conclusion on HEAD must be success. Skips this check when gh
# isn't installed (operator can override on a machine without gh, but
# CI/Claude flows always have gh).
if command -v gh >/dev/null 2>&1; then
  status="$(gh run list --branch "$branch" --commit "$local_sha" --limit 1 --json conclusion --jq '.[0].conclusion' 2>/dev/null || echo "")"
  case "$status" in
    success) ;;
    "" )
      echo "Warning: no CI run found for $local_sha on $branch. Continuing anyway." >&2
      ;;
    *)
      echo "Latest CI on $branch@$local_sha is '$status' (not success). Refusing to release a red commit." >&2
      exit 1
      ;;
  esac
fi

current_version="$(node -p "require('./package.json').version")"

# Resolve to a concrete X.Y.Z so the major-bump guard can compare.
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

# Validate semver shape early so we don't half-bump.
if ! node -e "if (!require('semver').valid('$next_version')) process.exit(1)"; then
  echo "Not a valid semver: $next_version" >&2
  exit 2
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

echo "Releasing v$next_version on $branch (was v$current_version)."

# release-it does the bump + CHANGELOG generation + commit + tag + push
# in one shot. --no-npm.publish keeps the npm push out of the dev
# machine (publish.yml does that on the tag arrival). --no-github.release
# similarly defers the GH release to publish.yml. release-it's whatBump
# logic isn't exercised here because we're passing an explicit version.
npx release-it "$next_version" --ci \
  --no-npm.publish \
  --no-github.release

echo
echo "Pushed v$next_version. publish.yml will fire on the tag and ship to npm."
echo "Track it at: https://github.com/genlayerlabs/genlayer-js/actions"
