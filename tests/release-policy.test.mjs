import {describe, expect, it} from "vitest";
import {
  devBranch,
  isPrerelease,
  parseVersion,
  run,
  runsVerdict,
  stableBranch,
  validateReleaseBranch,
} from "../scripts/release-policy.mjs";

describe("release branch policy", () => {
  it.each([
    ["2.0.1", "v2", "v2-dev"],
    ["v2.1.0-rc.1", "v2", "v2-dev"],
    ["3.0.0-rc.1", "v3", "v3-dev"],
    ["0.40.1", "v0.40", "v0.40-dev"],
  ])("maps %s to its stable and dev branch", (version, stable, dev) => {
    expect(stableBranch(version)).toBe(stable);
    expect(devBranch(version)).toBe(dev);
  });

  it("tells release candidates from finals", () => {
    expect(isPrerelease("2.0.1-rc.1")).toBe(true);
    expect(isPrerelease("2.0.1")).toBe(false);
    expect(parseVersion("v2.0.1-rc.1").normalized).toBe("2.0.1-rc.1");
  });

  it.each(["2.0", "2.0.1.0", "02.0.1", "latest", ""])("rejects malformed version '%s'", (version) => {
    expect(() => parseVersion(version)).toThrow("not a supported release version");
  });

  it.each(["2.0.1", "2.0.1-rc.1"])("accepts %s on the dev branch of its line", (version) => {
    expect(validateReleaseBranch("v2-dev", version)).toBe(version);
  });

  it.each([
    ["v2", "2.0.1"],
    ["v2", "2.0.1-rc.1"],
    ["v3-dev", "2.0.1"],
    ["main", "2.0.1"],
  ])("refuses a release commit on %s for %s", (branch, version) => {
    expect(() => validateReleaseBranch(branch, version)).toThrow("must be cut from v2-dev");
  });
});

describe("workflow run verdict", () => {
  it.each([
    [[], "missing"],
    [["cancelled", "skipped"], "missing"],
    [["success"], "green"],
    [["success", "cancelled"], "green"],
    [["success", "failure"], "red"],
    [["timed_out"], "red"],
  ])("%j is %s", (conclusions, verdict) => {
    expect(runsVerdict(conclusions)).toBe(verdict);
  });
});

describe("release-policy command line", () => {
  it.each([
    [["dev-branch", "2.0.1"], "v2-dev"],
    [["stable-branch", "2.0.1"], "v2"],
    [["is-prerelease", "2.0.1-rc.1"], "true"],
    [["normalize", "v2.0.1"], "2.0.1"],
    [["validate", "v2-dev", "2.0.1"], "2.0.1"],
    [["runs-verdict"], "missing"],
    [["runs-verdict", "success", "success"], "green"],
  ])("%j prints %s", (args, expected) => {
    expect(run(args)).toBe(expected);
  });

  it("prints usage for an unknown command", () => {
    expect(() => run(["bump"])).toThrow("usage: release-policy.mjs");
  });
});
