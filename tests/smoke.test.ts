// tests/smoke.test.ts
// Smoke tests against live testnet-asimov to verify ABI compatibility and connectivity.
// Run with: npm run test:smoke
// These are excluded from regular `npm test` to avoid CI dependence on testnet availability.

import {describe, it, expect, beforeAll} from "vitest";
import {createPublicClient, http, webSocket, getContract, Address as ViemAddress} from "viem";
import {testnetAsimov} from "@/chains/testnetAsimov";
import {createClient} from "@/client/client";
import {STAKING_ABI} from "@/abi/staking";
import {Address} from "@/types/accounts";

const TIMEOUT = 30_000;

// ─── HTTP RPC Connectivity ───────────────────────────────────────────────────

describe("Testnet Asimov - HTTP RPC", () => {
  it("should fetch chain ID", async () => {
    const client = createPublicClient({
      chain: testnetAsimov,
      transport: http(testnetAsimov.rpcUrls.default.http[0]),
    });
    const chainId = await client.getChainId();
    expect(chainId).toBe(testnetAsimov.id);
  }, TIMEOUT);

  it("should fetch latest block number", async () => {
    const client = createPublicClient({
      chain: testnetAsimov,
      transport: http(testnetAsimov.rpcUrls.default.http[0]),
    });
    const blockNumber = await client.getBlockNumber();
    expect(blockNumber).toBeGreaterThan(0n);
  }, TIMEOUT);
});

// ─── WebSocket RPC Connectivity ──────────────────────────────────────────────

describe("Testnet Asimov - WebSocket RPC", () => {
  const wsUrl = testnetAsimov.rpcUrls.default.webSocket?.[0];

  it("should have a WS URL configured", () => {
    expect(wsUrl).toBeDefined();
    expect(wsUrl).toMatch(/^wss?:\/\//);
  });

  it("should connect and fetch chain ID over WebSocket", async () => {
    if (!wsUrl) return;
    const client = createPublicClient({
      chain: testnetAsimov,
      transport: webSocket(wsUrl),
    });
    const chainId = await client.getChainId();
    // WS endpoint may point to the underlying chain (different ID from GenLayer overlay)
    // The key assertion is that the connection works and returns a valid number
    expect(chainId).toBeTypeOf("number");
    expect(chainId).toBeGreaterThan(0);
    if (chainId !== testnetAsimov.id) {
      console.warn(
        `WS chain ID (${chainId}) differs from HTTP chain ID (${testnetAsimov.id}). ` +
        `WS URL may point to the underlying L1/L2 chain.`
      );
    }
  }, TIMEOUT);

  it("should fetch latest block number over WebSocket", async () => {
    if (!wsUrl) return;
    const client = createPublicClient({
      chain: testnetAsimov,
      transport: webSocket(wsUrl),
    });
    const blockNumber = await client.getBlockNumber();
    expect(blockNumber).toBeGreaterThan(0n);
  }, TIMEOUT);
});

// ─── Staking Read-Only via WebSocket ─────────────────────────────────────────

describe("Testnet Asimov - Staking over WebSocket", () => {
  const wsUrl = testnetAsimov.rpcUrls.default.webSocket?.[0];
  const stakingAddress = testnetAsimov.stakingContract?.address as ViemAddress;

  // First check if WS points to the same chain — if not, skip staking tests
  let wsMatchesChain = false;
  let wsPub: ReturnType<typeof createPublicClient> | null = null;

  beforeAll(async () => {
    if (!wsUrl) return;
    wsPub = createPublicClient({chain: testnetAsimov, transport: webSocket(wsUrl)});
    try {
      const chainId = await wsPub.getChainId();
      wsMatchesChain = chainId === testnetAsimov.id;
      if (!wsMatchesChain) {
        console.warn(
          `WS chain ID (${chainId}) differs from testnet (${testnetAsimov.id}). ` +
          `Staking contract calls will be skipped — WS endpoint serves a different chain.`
        );
      }
    } catch {
      console.warn("WS connection failed during setup");
    }
  }, TIMEOUT);

  it("epoch() via WS", async () => {
    if (!wsMatchesChain || !wsPub) return;
    const contract = getContract({address: stakingAddress, abi: STAKING_ABI, client: wsPub});
    const epoch = await contract.read.epoch();
    expect(epoch).toBeTypeOf("bigint");
  }, TIMEOUT);

  it("activeValidatorsCount() via WS", async () => {
    if (!wsMatchesChain || !wsPub) return;
    const contract = getContract({address: stakingAddress, abi: STAKING_ABI, client: wsPub});
    const count = await contract.read.activeValidatorsCount();
    expect(count).toBeTypeOf("bigint");
    expect(count).toBeGreaterThanOrEqual(0n);
  }, TIMEOUT);

  it("activeValidators() via WS", async () => {
    if (!wsMatchesChain || !wsPub) return;
    const contract = getContract({address: stakingAddress, abi: STAKING_ABI, client: wsPub});
    const validators = await contract.read.activeValidators();
    expect(Array.isArray(validators)).toBe(true);
  }, TIMEOUT);

  it("isValidator() via WS", async () => {
    if (!wsMatchesChain || !wsPub) return;
    const contract = getContract({address: stakingAddress, abi: STAKING_ABI, client: wsPub});
    const validators = (await contract.read.activeValidators()) as ViemAddress[];
    const nonZero = validators.filter(v => v !== "0x0000000000000000000000000000000000000000");
    if (nonZero.length === 0) return;

    const result = await contract.read.isValidator([nonZero[0]]);
    expect(result).toBe(true);
  }, TIMEOUT);

  it("validatorView() via WS", async () => {
    if (!wsMatchesChain || !wsPub) return;
    const contract = getContract({address: stakingAddress, abi: STAKING_ABI, client: wsPub});
    const validators = (await contract.read.activeValidators()) as ViemAddress[];
    const nonZero = validators.filter(v => v !== "0x0000000000000000000000000000000000000000");
    if (nonZero.length === 0) return;

    const view = await contract.read.validatorView([nonZero[0]]) as unknown;
    // Depending on ABI/runtime decoding, viem may return either:
    // - positional tuple array (length 12), or
    // - named tuple object ({ left, right, ..., live })
    if (Array.isArray(view)) {
      expect(view.length).toBe(12);
      return;
    }

    expect(typeof view).toBe("object");
    expect(view).not.toBeNull();
    const viewObject = view as Record<string, unknown>;
    expect(viewObject).toHaveProperty("left");
    expect(viewObject).toHaveProperty("right");
    expect(viewObject).toHaveProperty("parent");
    expect(viewObject).toHaveProperty("eBanned");
    expect(viewObject).toHaveProperty("ePrimed");
    expect(viewObject).toHaveProperty("vStake");
    expect(viewObject).toHaveProperty("vShares");
    expect(viewObject).toHaveProperty("dStake");
    expect(viewObject).toHaveProperty("dShares");
    expect(viewObject).toHaveProperty("vDeposit");
    expect(viewObject).toHaveProperty("vWithdrawal");
    expect(viewObject).toHaveProperty("live");
  }, TIMEOUT);

  it("getValidatorQuarantineList() via WS", async () => {
    if (!wsMatchesChain || !wsPub) return;
    const contract = getContract({address: stakingAddress, abi: STAKING_ABI, client: wsPub});
    const list = await contract.read.getValidatorQuarantineList();
    expect(Array.isArray(list)).toBe(true);
  }, TIMEOUT);

  it("epochOdd() / epochEven() via WS", async () => {
    if (!wsMatchesChain || !wsPub) return;
    const contract = getContract({address: stakingAddress, abi: STAKING_ABI, client: wsPub});
    const odd = await contract.read.epochOdd();
    const even = await contract.read.epochEven();
    expect(Array.isArray(odd)).toBe(true);
    expect(Array.isArray(even)).toBe(true);
    expect(odd.length).toBe(11);
    expect(even.length).toBe(11);
  }, TIMEOUT);
});

// ─── Staking Read-Only Methods ───────────────────────────────────────────────

describe("Testnet Asimov - Staking (read-only)", () => {
  let client: ReturnType<typeof createClient>;

  beforeAll(() => {
    client = createClient({chain: testnetAsimov});
  });

  it("getEpochInfo", async () => {
    const info = await client.getEpochInfo();
    expect(info.currentEpoch).toBeTypeOf("bigint");
    expect(info.lastFinalizedEpoch).toBeTypeOf("bigint");
    expect(info.activeValidatorsCount).toBeTypeOf("bigint");
    expect(info.epochMinDuration).toBeTypeOf("bigint");
    // nextEpochEstimate is Date | null
    if (info.nextEpochEstimate !== null) {
      expect(info.nextEpochEstimate).toBeInstanceOf(Date);
    }
  }, TIMEOUT);

  it("getActiveValidatorsCount", async () => {
    const count = await client.getActiveValidatorsCount();
    expect(count).toBeTypeOf("bigint");
    expect(count).toBeGreaterThanOrEqual(0n);
  }, TIMEOUT);

  it("getActiveValidators", async () => {
    const validators = await client.getActiveValidators();
    expect(Array.isArray(validators)).toBe(true);
    // Each entry should be a hex address
    for (const v of validators) {
      expect(v).toMatch(/^0x[0-9a-fA-F]{40}$/);
    }
  }, TIMEOUT);

  it("getEpochData for current epoch", async () => {
    const {currentEpoch} = await client.getEpochInfo();
    const data = await client.getEpochData(currentEpoch);
    expect(data.start).toBeTypeOf("bigint");
    expect(data.weight).toBeTypeOf("bigint");
    expect(data.vcount).toBeTypeOf("bigint");
  }, TIMEOUT);

  it("isValidator returns boolean", async () => {
    const validators = await client.getActiveValidators();
    if (validators.length === 0) return; // nothing to test

    const result = await client.isValidator(validators[0]);
    expect(result).toBe(true);

    // zero address should not be a validator
    const fake = await client.isValidator("0x0000000000000000000000000000000000000001" as Address);
    expect(fake).toBe(false);
  }, TIMEOUT);

  it("getValidatorInfo for an active validator", async () => {
    const validators = await client.getActiveValidators();
    if (validators.length === 0) return;

    const info = await client.getValidatorInfo(validators[0]);
    expect(info.address).toBe(validators[0]);
    expect(info.owner).toMatch(/^0x[0-9a-fA-F]{40}$/);
    expect(info.operator).toMatch(/^0x[0-9a-fA-F]{40}$/);
    expect(info.vStakeRaw).toBeTypeOf("bigint");
    expect(typeof info.live).toBe("boolean");
    expect(typeof info.banned).toBe("boolean");
    expect(typeof info.needsPriming).toBe("boolean");
    expect(Array.isArray(info.pendingDeposits)).toBe(true);
    expect(Array.isArray(info.pendingWithdrawals)).toBe(true);
  }, TIMEOUT);

  it("getStakeInfo for validator self-stake", async () => {
    const validators = await client.getActiveValidators();
    if (validators.length === 0) return;

    const validatorAddr = validators[0];
    // Self-stake: delegator = validator address
    const stakeInfo = await client.getStakeInfo(validatorAddr, validatorAddr);
    expect(stakeInfo.delegator).toBe(validatorAddr);
    expect(stakeInfo.validator).toBe(validatorAddr);
    expect(stakeInfo.shares).toBeTypeOf("bigint");
    expect(stakeInfo.stakeRaw).toBeTypeOf("bigint");
    expect(Array.isArray(stakeInfo.pendingDeposits)).toBe(true);
    expect(Array.isArray(stakeInfo.pendingWithdrawals)).toBe(true);
  }, TIMEOUT);

  it("getQuarantinedValidators returns array", async () => {
    // This calls getValidatorQuarantineList() — the v0.5 renamed function
    const quarantined = await (client as any).getQuarantinedValidators();
    expect(Array.isArray(quarantined)).toBe(true);
  }, TIMEOUT);

  it("getBannedValidators returns array", async () => {
    const banned = await (client as any).getBannedValidators();
    expect(Array.isArray(banned)).toBe(true);
    for (const b of banned) {
      expect(b.validator).toMatch(/^0x[0-9a-fA-F]{40}$/);
      expect(b.untilEpoch).toBeTypeOf("bigint");
      expect(typeof b.permanentlyBanned).toBe("boolean");
    }
  }, TIMEOUT);

  it("getStakingContract returns a contract instance", () => {
    const contract = client.getStakingContract();
    expect(contract).toBeDefined();
    expect(contract.address).toMatch(/^0x[0-9a-fA-F]{40}$/);
    expect(contract.read).toBeDefined();
  });

  it("parseStakingAmount and formatStakingAmount round-trip", () => {
    // parseStakingAmount treats bare strings as wei; use "gen" suffix for human amounts
    const amount = client.parseStakingAmount("1.5gen");
    expect(amount).toBeTypeOf("bigint");
    expect(amount).toBe(1500000000000000000n);
    const formatted = client.formatStakingAmount(amount);
    expect(formatted).toBe("1.5 GEN");

    // Raw wei round-trip
    const weiAmount = client.parseStakingAmount("42000000000000000000");
    expect(client.formatStakingAmount(weiAmount)).toBe("42 GEN");
  });
});
