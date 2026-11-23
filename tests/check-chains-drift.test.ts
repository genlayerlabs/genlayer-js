import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, expect, it } from "vitest";

let root: string;

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), "chains-drift-"));
  cpSync("scripts", join(root, "scripts"), { recursive: true });
  mkdirSync(join(root, "dist/chains"), { recursive: true });
  writeFileSync(join(root, "package.json"), '{"type":"module"}');
  writeFileSync(join(root, "dist/chains/index.js"), `
    import { readFileSync } from "node:fs";
    const group = JSON.parse(readFileSync(new URL(
      "../../scripts/deployments/bradbury-phase-2.json", import.meta.url,
    ))).genlayerOrbitTestnet.deployment_bradbury_phase_2;
    const keys = {
      consensusMainContract: "ConsensusMain",
      consensusDataContract: "ConsensusData",
      feeManagerContract: "FeeManager",
      roundsStorageContract: "RoundsStorage",
      appealsContract: "Appeals",
    };
    export const testnetAsimov = Object.fromEntries(
      Object.keys(keys).map((key) => [key, { address: "0x1", abi: [] }]),
    );
    export const testnetBradbury = Object.fromEntries(
      Object.entries(keys).map(([key, name]) => [
        key, { address: group[name], abi: [] },
      ]),
    );
    if (process.env.FIXTURE_ADDRESS_DRIFT) {
      testnetBradbury.appealsContract.address = "0x2";
    }
  `);
  writeFileSync(join(root, "run.mjs"), `
    globalThis.fetch = async (url) => {
      if (url.includes("contracts.conduit.xyz")) {
        const status = Number(process.env.FIXTURE_STATUS);
        const body = process.env.FIXTURE_ABI
          ? JSON.parse(process.env.FIXTURE_ABI)
          : { abi: [] };
        return Response.json(body, { status });
      }
      if (process.env.FIXTURE_NETWORKS_OUTAGE) return Response.json({}, { status: 503 });
      if (url.endsWith("testnet_deployments.json")) {
        const keys = ["ConsensusMain", "ConsensusData", "FeeManager", "RoundsStorage", "Appeals"];
        return Response.json({
          genlayerTestnet: {
            deployment_asimov_phase5: Object.fromEntries(keys.map(key => [key, "0x1"])),
          },
        });
      }
      return Response.json({ abi: [] });
    };
    await import("./scripts/check-chains-drift.mjs");
  `);
});

afterAll(() => {
  if (root) rmSync(root, { recursive: true, force: true });
});

function run(event: string, status = 503, fixture: Record<string, string> = {}) {
  return spawnSync(process.execPath, [join(root, "run.mjs")], {
    encoding: "utf8",
    timeout: 5000,
    env: {
      ...process.env,
      GITHUB_EVENT_NAME: event,
      FETCH_RETRY_ATTEMPTS: "1",
      FIXTURE_STATUS: String(status),
      ...fixture,
    },
  });
}

it.each(["pull_request", "push"])("warns about incomplete ABI checks on %s", (event) => {
  const result = run(event);
  expect(result.status).toBe(0);
  expect(result.stderr).toContain("::warning title=Conduit ABI source unavailable::[bradbury]");
  expect(result.stderr).toContain("503");
  expect(result.stdout).toContain("ABI checks incomplete for: bradbury");
});

it.each(["schedule", "workflow_dispatch", ""])("fails closed during an outage for event %j", (event) => {
  const result = run(event);
  expect(result.status).toBe(2);
  expect(result.stderr).toContain("503");
  expect(result.stderr).not.toContain("::warning");
});

it("reports address drift on a later contract even during an ABI outage", () => {
  const result = run("pull_request", 503, { FIXTURE_ADDRESS_DRIFT: "1" });
  expect(result.status).toBe(1);
  expect(result.stderr).toContain("[bradbury.appealsContract] address drift");
});

it("fails closed for permanent Conduit errors in PRs", () => {
  const result = run("pull_request", 404);
  expect(result.status).toBe(2);
  expect(result.stderr).toContain("404");
  expect(result.stderr).not.toContain("::warning");
});

it("reports a complete comparison when Conduit is available", () => {
  const result = run("pull_request", 200);
  expect(result.status).toBe(0);
  expect(result.stdout).toContain("No drift. Chain files match");
});

it("detects ABI drift when Conduit is available", () => {
  const result = run("pull_request", 200, {
    FIXTURE_ABI: JSON.stringify({ abi: [{ type: "error", name: "NewError" }] }),
  });
  expect(result.status).toBe(1);
  expect(result.stderr).toContain("[bradbury.consensusMainContract] (full ABI)");
});

it("fails closed for a successful response without an ABI array", () => {
  const result = run("pull_request", 200, { FIXTURE_ABI: "{}" });
  expect(result.status).toBe(2);
  expect(result.stderr).toContain("did not return an ABI array");
});

it("fails closed during a genlayer-networks outage in PRs", () => {
  const result = run("pull_request", 200, { FIXTURE_NETWORKS_OUTAGE: "1" });
  expect(result.status).toBe(2);
  expect(result.stderr).toContain("503");
  expect(result.stderr).not.toContain("::warning");
});
