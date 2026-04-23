/**
 * release-it configuration.
 *
 * Converted from `.release-it.json` to `.cjs` so we can supply a custom
 * `whatBump` function that caps the recommended bump at `minor`. Reason:
 *
 *   `@release-it/conventional-changelog` forwards the default bump logic to
 *   `conventional-recommended-bump`, whose `conventionalcommits` preset always
 *   returns `major` when any commit's body contains a "BREAKING CHANGE" footer
 *   (case-insensitive) or a `!:` marker. PR #155 landed with `Breaking change:`
 *   in the body, which immediately jumped `0.28.7 → 1.0.0` without anyone
 *   intending a stability declaration — just an automation side effect.
 *
 * This override forces the recommended bump to stop at `minor`. A genuine
 * major release still requires an operator to pass `release-it major`
 * explicitly, which is how most mature TS libraries handle it.
 *
 * `.release-it.json` takes precedence over `.release-it.cjs` in release-it's
 * config resolution order, so the JSON file must not exist.
 */

module.exports = {
  git: {
    commitMessage: "Release v${version} [skip ci]",
    tagName: "v${version}",
    requireCleanWorkingDir: false,
    requireUpstream: false,
    requireCommits: false,
    push: true,
  },
  github: {
    release: true,
    tokenRef: "GITHUB_TOKEN",
  },
  npm: {
    publish: true,
    publishArgs: ["--provenance --access public"],
    skipChecks: true,
  },
  plugins: {
    "@release-it/conventional-changelog": {
      preset: "conventionalcommits",
      infile: "CHANGELOG.md",
      /**
       * Cap automatic bumps at minor. Levels: 0 = major, 1 = minor, 2 = patch.
       *   BREAKING CHANGE footer or `!:` marker → minor (was: major)
       *   feat:                                  → minor (unchanged)
       *   fix: / chore: / etc.                   → patch (unchanged)
       * Run `release-it major` manually for a genuine major release.
       */
      whatBump: (commits) => {
        const hasBreaking = commits.some((c) => {
          const bangMarker = typeof c.header === "string" && /^[^:!\s]+!:/.test(c.header);
          const breakingFooter =
            Array.isArray(c.notes) && c.notes.some((n) => /BREAKING[ -]CHANGE/i.test(n.title ?? ""));
          return bangMarker || breakingFooter;
        });
        const hasFeat = commits.some((c) => c.type === "feat");

        if (hasBreaking) {
          return {
            level: 1,
            reason:
              "BREAKING CHANGE detected; auto-bump capped at minor. Run `release-it major` to force a major release.",
          };
        }
        if (hasFeat) {
          return { level: 1, reason: "feat commits present → minor" };
        }
        return { level: 2, reason: "no feat/breaking commits → patch" };
      },
      types: [
        { type: "feat", section: "Features" },
        { type: "fix", section: "Bug Fixes" },
        { type: "chore", section: "Improvement Tasks" },
        { type: "ci", section: "Continuous Integration" },
        { type: "docs", section: "Documentation" },
        { type: "style", section: "Styles" },
        { type: "refactor", section: "Refactor Tasks" },
        { type: "perf", section: "Performance Improvements" },
        { type: "test", section: "Testing" },
      ],
    },
  },
  hooks: {
    "after:bump": "npm run build",
  },
};
