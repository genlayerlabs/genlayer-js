#!/usr/bin/env node
// Version, branch and CI-verdict rules used by scripts/release.sh.

import {fileURLToPath} from "node:url";
import {resolve} from "node:path";

const VERSION_PATTERN =
  /^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;
const RED_CONCLUSIONS = new Set(["failure", "timed_out", "startup_failure", "action_required"]);

export function parseVersion(value) {
  const match = VERSION_PATTERN.exec(String(value ?? "").trim());
  if (!match) {
    throw new Error(
      `'${value}' is not a supported release version; use X.Y.Z for a final or X.Y.Z-rc.N for a release candidate`,
    );
  }
  const [, major, minor, patch, prerelease] = match;
  return {
    major: Number(major),
    minor: Number(minor),
    patch: Number(patch),
    prerelease: prerelease ?? null,
    normalized: `${major}.${minor}.${patch}${prerelease ? `-${prerelease}` : ""}`,
  };
}

export function isPrerelease(version) {
  return parseVersion(version).prerelease !== null;
}

// A release line is the major, or the minor while the major is 0.
export function stableBranch(version) {
  const {major, minor} = parseVersion(version);
  return major === 0 ? `v0.${minor}` : `v${major}`;
}

export function devBranch(version) {
  return `${stableBranch(version)}-dev`;
}

export function validateReleaseBranch(branch, version) {
  const {normalized} = parseVersion(version);
  const expected = devBranch(version);
  if (branch !== expected) {
    throw new Error(
      `${normalized} must be cut from ${expected}, not ${branch}; ` +
        `${stableBranch(version)} only moves through release.sh --promote`,
    );
  }
  return normalized;
}

// Summarizes the workflow runs of one commit: green, red or missing.
export function runsVerdict(conclusions) {
  if (conclusions.some((conclusion) => RED_CONCLUSIONS.has(conclusion))) {
    return "red";
  }
  return conclusions.includes("success") ? "green" : "missing";
}

const USAGE =
  "usage: release-policy.mjs normalize <version> | dev-branch <version> | " +
  "stable-branch <version> | is-prerelease <version> | " +
  "validate <branch> <version> | runs-verdict [conclusion ...]";

export function run(args) {
  const [command, ...rest] = args;
  if (command === "normalize" && rest.length === 1) return parseVersion(rest[0]).normalized;
  if (command === "dev-branch" && rest.length === 1) return devBranch(rest[0]);
  if (command === "stable-branch" && rest.length === 1) return stableBranch(rest[0]);
  if (command === "is-prerelease" && rest.length === 1) return String(isPrerelease(rest[0]));
  if (command === "validate" && rest.length === 2) return validateReleaseBranch(rest[0], rest[1]);
  if (command === "runs-verdict") return runsVerdict(rest);
  throw new Error(USAGE);
}

function main() {
  try {
    process.stdout.write(`${run(process.argv.slice(2))}\n`);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 2;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
