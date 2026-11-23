import {describe, expect, it} from "vitest";
import {
  assertNewer,
  compareVersions,
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

describe("version ordering", () => {
  it.each([
    ["2.0.1", "2.0.0", 1],
    ["2.0.1-rc.1", "2.0.1", -1],
    ["2.0.1", "2.0.1-rc.9", 1],
    ["2.0.1-rc.2", "2.0.1-rc.10", -1],
    ["2.0.1-rc.1", "v2.0.1-rc.1", 0],
    ["2.0.1-rc.1", "2.0.1-rc", 1],
    ["2.0.1-1", "2.0.1-rc", -1],
    ["2.0.1-rc1", "2.0.1-rc.1", 1],
    ["2.1.0", "2.0.9", 1],
    ["3.0.0-rc.1", "2.9.9", 1],
  ])("compares %s with %s as %i", (a, b, expected) => {
    expect(compareVersions(a, b)).toBe(expected);
    expect(compareVersions(b, a)).toBe(0 - expected);
  });

  it("accepts a version newer than everything the line has", () => {
    expect(assertNewer("v2.0.1", ["2.0.0", "v2.0.0-rc.3", "v2.0.1-rc.2"])).toBe("2.0.1");
    expect(assertNewer("2.0.1-rc.1", [])).toBe("2.0.1-rc.1");
  });

  it.each([
    ["2.0.1-rc.1", ["2.0.1"]],
    ["2.0.0-rc.9", ["2.0.1"]],
    ["2.0.1", ["2.0.0", "v2.0.1"]],
    ["2.0.1", ["v2.0.2-rc.1"]],
  ])("refuses %s when the line already has %j", (version, existing) => {
    expect(() => assertNewer(version, existing)).toThrow("is not newer than");
  });

  it("ignores tags that are not release versions", () => {
    expect(assertNewer("2.0.1", ["v2.0", "latest", ""])).toBe("2.0.1");
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
    [["success", "pending"], "pending"],
    [["failure", "pending"], "red"],
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
    [["assert-newer", "2.0.1", "2.0.0", "v2.0.1-rc.1"], "2.0.1"],
    [["runs-verdict"], "missing"],
    [["runs-verdict", "success", "success"], "green"],
  ])("%j prints %s", (args, expected) => {
    expect(run(args)).toBe(expected);
  });

  it("fails assert-newer on a version the line already passed", () => {
    expect(() => run(["assert-newer", "2.0.1-rc.1", "2.0.1"])).toThrow("is not newer than");
  });

  it("prints usage for an unknown command", () => {
    expect(() => run(["bump"])).toThrow("usage: release-policy.mjs");
  });
});
