import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {describe, expect, it} from "vitest";

describe("package entrypoints", () => {
  it("loads the CommonJS build through every public require entrypoint", () => {
    const consumer = String.raw`
      const assert = require("node:assert/strict");
      const sdk = require("genlayer-js");
      const chains = require("genlayer-js/chains");
      const types = require("genlayer-js/types");

      assert.equal(typeof sdk.createClient, "function");
      assert.equal(typeof chains.localnet.id, "number");
      assert.equal(typeof types.CalldataAddress, "function");
      for (const entrypoint of ["genlayer-js", "genlayer-js/chains", "genlayer-js/types"]) {
        // Newer Node releases can require ESM, so successful loading alone
        // would not detect a require condition pointing to the wrong format.
        assert.match(require.resolve(entrypoint), /\.cjs$/);
      }
    `;
    const result = spawnSync(process.execPath, ["--input-type=commonjs", "-e", consumer], {
      cwd: fileURLToPath(new URL("..", import.meta.url)),
      encoding: "utf8",
    });

    expect(result.error).toBeUndefined();
    expect(result.status, result.stderr).toBe(0);
  });
});
