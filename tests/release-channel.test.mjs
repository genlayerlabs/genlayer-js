import {describe, expect, it} from "vitest";
import {resolveReleaseChannel} from "../scripts/resolve-release-channel.mjs";

describe("release channel policy", () => {
  it("publishes stable releases to latest", () => {
    expect(resolveReleaseChannel("2.0.0", "2.0.0")).toEqual({
      isPrerelease: false,
      npmDistTag: "latest",
    });
  });

  it("publishes RC releases to rc without moving latest", () => {
    expect(resolveReleaseChannel("2.0.0-rc.1", "2.0.0-rc.1")).toEqual({
      isPrerelease: true,
      npmDistTag: "rc",
    });
  });

  it("rejects mismatched tags", () => {
    expect(() => resolveReleaseChannel("2.0.0-rc.1", "1.1.8")).toThrow(
      "disagree",
    );
  });

  it("rejects prereleases that could target latest", () => {
    expect(() => resolveReleaseChannel("2.0.0-latest.1", "2.0.0-latest.1")).toThrow(
      "Invalid prerelease npm dist-tag",
    );
  });

  it("rejects version-like prerelease channels", () => {
    expect(() => resolveReleaseChannel("2.0.0-2.1", "2.0.0-2.1")).toThrow(
      "Invalid prerelease npm dist-tag",
    );
  });
});
