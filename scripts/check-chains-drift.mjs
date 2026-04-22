#!/usr/bin/env node
// Drift check: compare src/chains/testnet{Asimov,Bradbury}.ts against the
// current contract artifacts on github.com/genlayerlabs/genlayer-networks
// (default branch). Fires when genlayer-js has diverged from upstream — e.g.
// when a new contract has been deployed or an ABI has changed on-chain and
// this SDK has not been updated yet.
//
// - Addresses must match exactly (case-insensitive).
// - For contracts where genlayer-js bundles the full ABI (ConsensusMain,
//   ConsensusData) the canonical signature set must match exactly.
// - For contracts where genlayer-js bundles a narrow ABI (FeeManager,
//   RoundsStorage, Appeals) every entry in the narrow ABI must also exist
//   in genlayer-networks with a matching signature — i.e. the narrow ABI
//   must be a subset of the on-chain ABI.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const NETWORKS_REF = process.env.GENLAYER_NETWORKS_REF || "main";
const NETWORKS_BASE = `https://raw.githubusercontent.com/genlayerlabs/genlayer-networks/${NETWORKS_REF}`;

const CHAINS = [
  { name: "asimov", deploymentKey: "deployment_asimov_phase5" },
  { name: "bradbury", deploymentKey: "deployment_bradbury" },
];

// For each contract: where to find the ABI in genlayer-networks and whether
// genlayer-js bundles the full ABI or a narrow (subset) ABI.
const CONTRACTS = [
  {
    jsKey: "consensusMainContract",
    networksKey: "ConsensusMain",
    abiPath: "abi/ConsensusMain.sol/ConsensusMain.json",
    mode: "full",
  },
  {
    jsKey: "consensusDataContract",
    networksKey: "ConsensusData",
    abiPath: "abi/ConsensusData.sol/ConsensusData.json",
    mode: "full",
  },
  {
    jsKey: "feeManagerContract",
    networksKey: "FeeManager",
    abiPath: "abi/FeeManager.sol/FeeManager.json",
    mode: "narrow",
  },
  {
    jsKey: "roundsStorageContract",
    networksKey: "RoundsStorage",
    abiPath: "abi/transactions/RoundsStorage.sol/RoundsStorage.json",
    mode: "narrow",
  },
  {
    jsKey: "appealsContract",
    networksKey: "Appeals",
    abiPath: "abi/transactions/Appeals.sol/Appeals.json",
    mode: "narrow",
  },
];

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}`);
  return res.json();
}

// Canonical signature: selectors depend on (type, name, input types), not
// parameter names or internalType. Events are keyed by topic hash, which
// depends on (name, input types, indexed flags). Using these as set keys
// lets us compare ABIs without being sensitive to naming/ordering.
function canonicalize(entry) {
  const types = (xs) =>
    (xs || [])
      .map((x) => {
        if (x.type === "tuple" || x.type === "tuple[]") {
          return `${x.type}(${types(x.components)})`;
        }
        return x.type;
      })
      .join(",");
  switch (entry.type) {
    case "function":
      return `fn:${entry.name}(${types(entry.inputs)})->${types(
        entry.outputs,
      )}:${entry.stateMutability}`;
    case "event": {
      const inputs = (entry.inputs || [])
        .map((i) => `${i.indexed ? "indexed " : ""}${i.type}`)
        .join(",");
      return `event:${entry.name}(${inputs})`;
    }
    case "error":
      return `error:${entry.name}(${types(entry.inputs)})`;
    case "constructor":
      return `constructor(${types(entry.inputs)})`;
    case "fallback":
      return `fallback:${entry.stateMutability}`;
    case "receive":
      return `receive:${entry.stateMutability}`;
    default:
      return `${entry.type}:${entry.name || ""}`;
  }
}

const canonicalSet = (abi) => new Set((abi || []).map(canonicalize));

function diffSets(jsSet, nwSet, mode) {
  const missing = [...jsSet].filter((s) => !nwSet.has(s));
  const extra = mode === "full" ? [...nwSet].filter((s) => !jsSet.has(s)) : [];
  return { missing, extra };
}

// Load the chain objects from the built output. Running against dist/ keeps
// this script tooling-light (no tsx/ts-node dep) and matches exactly what
// consumers import.
async function loadChains() {
  const distPath = join(REPO_ROOT, "dist", "chains", "index.js");
  try {
    readFileSync(distPath);
  } catch {
    throw new Error(
      `dist/chains/index.js not found. Run 'npm run build' before check:chains.`,
    );
  }
  const mod = await import(distPath);
  return { asimov: mod.testnetAsimov, bradbury: mod.testnetBradbury };
}

async function main() {
  console.log(`Checking against genlayer-networks ref: ${NETWORKS_REF}`);
  const chains = await loadChains();
  const failures = [];

  for (const { name, deploymentKey } of CHAINS) {
    const chain = chains[name];
    if (!chain) {
      failures.push(`[${name}] chain export missing from dist/chains`);
      continue;
    }
    const deployments = await fetchJson(
      `${NETWORKS_BASE}/${name}/testnet_deployments.json`,
    );
    const group = deployments.genlayerTestnet?.[deploymentKey];
    if (!group) {
      failures.push(
        `[${name}] testnet_deployments.json has no .genlayerTestnet.${deploymentKey}`,
      );
      continue;
    }

    for (const { jsKey, networksKey, abiPath, mode } of CONTRACTS) {
      const jsContract = chain[jsKey];
      if (!jsContract) {
        failures.push(`[${name}.${jsKey}] missing in chain config`);
        continue;
      }

      const expectedAddress = group[networksKey];
      if (!expectedAddress) {
        failures.push(
          `[${name}.${jsKey}] ${networksKey} missing in deployments JSON`,
        );
        continue;
      }
      if (jsContract.address.toLowerCase() !== expectedAddress.toLowerCase()) {
        failures.push(
          `[${name}.${jsKey}] address drift: js=${jsContract.address} networks=${expectedAddress}`,
        );
      }

      const nwAbi = (
        await fetchJson(`${NETWORKS_BASE}/${name}/${abiPath}`)
      ).abi;
      const jsSet = canonicalSet(jsContract.abi);
      const nwSet = canonicalSet(nwAbi);
      const { missing, extra } = diffSets(jsSet, nwSet, mode);
      if (missing.length) {
        failures.push(
          `[${name}.${jsKey}] ${missing.length} entries in genlayer-js not present in genlayer-networks:\n    ${missing.slice(0, 8).join("\n    ")}${missing.length > 8 ? `\n    …and ${missing.length - 8} more` : ""}`,
        );
      }
      if (extra.length) {
        failures.push(
          `[${name}.${jsKey}] (full ABI) ${extra.length} entries in genlayer-networks not present in genlayer-js:\n    ${extra.slice(0, 8).join("\n    ")}${extra.length > 8 ? `\n    …and ${extra.length - 8} more` : ""}`,
        );
      }
    }
  }

  if (failures.length) {
    console.error(`\nDrift detected (${failures.length} finding(s)):\n`);
    for (const f of failures) console.error("• " + f);
    console.error(
      `\ngenlayer-networks has moved ahead of this SDK. Regenerate the affected\nchain file(s) from the latest artifacts and open a PR.`,
    );
    process.exit(1);
  }
  console.log(
    "No drift. Chain files match genlayer-networks/" + NETWORKS_REF + ".",
  );
}

main().catch((err) => {
  console.error("check:chains failed:", err.message || err);
  process.exit(2);
});
