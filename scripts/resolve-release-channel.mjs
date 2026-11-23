#!/usr/bin/env node

import {fileURLToPath} from "node:url";
import {resolve} from "node:path";

const DIST_TAG_PATTERN = /^[a-z][a-z0-9._-]*$/i;

export function resolveReleaseChannel(tagVersion, packageVersion) {
  if (!tagVersion || !packageVersion) {
    throw new Error("Usage: resolve-release-channel.mjs <tag-version> <package-version>");
  }
  if (tagVersion !== packageVersion) {
    throw new Error(
      `Tag (${tagVersion}) and package.json (${packageVersion}) disagree — refusing to publish.`,
    );
  }

  const prerelease = tagVersion.includes("-");
  if (!prerelease) {
    return {isPrerelease: false, npmDistTag: "latest"};
  }

  const suffix = tagVersion.slice(tagVersion.indexOf("-") + 1).split("+", 1)[0];
  const npmDistTag = suffix.split(".", 1)[0];
  if (
    !npmDistTag ||
    npmDistTag === "latest" ||
    !DIST_TAG_PATTERN.test(npmDistTag) ||
    /^v?[0-9]/i.test(npmDistTag)
  ) {
    throw new Error(`Invalid prerelease npm dist-tag: '${npmDistTag}'`);
  }

  return {isPrerelease: true, npmDistTag};
}

function main() {
  try {
    const {isPrerelease, npmDistTag} = resolveReleaseChannel(
      process.argv[2],
      process.argv[3],
    );
    process.stdout.write(`is_prerelease=${isPrerelease}\n`);
    process.stdout.write(`npm_dist_tag=${npmDistTag}\n`);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
