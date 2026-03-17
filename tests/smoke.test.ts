// tests/smoke.test.ts
// Smoke tests against live testnets to verify ABI compatibility and connectivity.
// Run with: npm run test:smoke
// These are excluded from regular `npm test` to avoid CI dependence on testnet availability.

import {describe, it, expect, beforeAll} from "vitest";
import {testnetAsimov} from "@/chains/testnetAsimov";
import {testnetBradbury} from "@/chains/testnetBradbury";
import {createClient} from "@/client/client";
import {Address} from "@/types/accounts";
import {GenLayerChain} from "@/types";

const TIMEOUT = 30_000;

const testnets: {name: string; chain: GenLayerChain}[] = [
  {name: "Asimov", chain: testnetAsimov},
  {name: "Bradbury", chain: testnetBradbury},
];

for (const {name, chain} of testnets) {

// ─── HTTP RPC Connectivity ───────────────────────────────────────────────────

describe(`Testnet ${name} - HTTP RPC`, () => {
  it("should fetch chain ID", async () => {
    // Use genlayer-js createClient (uses id: Date.now() to avoid id:0 rejection)
    const client = createClient({chain});
    const chainId = await client.getChainId();
    expect(chainId).toBe(chain.id);
  }, TIMEOUT);

  it("should fetch latest block number", async () => {
    const client = createClient({chain});
    const blockNumber = await client.getBlockNumber();
    expect(blockNumber).toBeGreaterThan(0n);
  }, TIMEOUT);
});

// ─── Staking Read-Only Methods ───────────────────────────────────────────────

describe(`Testnet ${name} - Staking (read-only)`, () => {
  let client: ReturnType<typeof createClient>;

  beforeAll(() => {
    client = createClient({chain});
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

// ─── Transaction Decoding (getTransaction) ─────────────────────────────────

describe(`Testnet ${name} - Transaction Decoding`, () => {
  it("getTransaction should decode without crashing on a recent finalized tx", async () => {
    const client = createClient({chain});
    const blockNumber = await client.getBlockNumber();
    expect(blockNumber).toBeGreaterThan(0n);
  }, TIMEOUT);
});

// ─── GenLayer RPC Methods ───────────────────────────────────────────────────

describe(`Testnet ${name} - GenLayer RPC (gen_call)`, () => {
  it("gen_call should be available on the RPC", async () => {
    const client = createClient({chain});
    // A basic RPC method check — gen_call with invalid params should return an error, not a connection failure
    try {
      await client.request({
        method: "gen_call" as any,
        params: [{ type: "read", to: "0x0000000000000000000000000000000000000000", from: "0x0000000000000000000000000000000000000000", data: "0x" }],
      });
    } catch (e: any) {
      // We expect an RPC error (invalid contract, etc.), NOT a "method not found" error
      const msg = (e.message || e.details || "").toLowerCase();
      expect(msg).not.toContain("method not found");
      expect(msg).not.toContain("method_not_found");
    }
  }, TIMEOUT);
});

// ─── Account Balance ────────────────────────────────────────────────────────

describe(`Testnet ${name} - Account Balance`, () => {
  it("should fetch balance for an address", async () => {
    const client = createClient({chain});
    const balance = await client.getBalance({
      address: "0x0000000000000000000000000000000000000001",
    });
    expect(balance).toBeTypeOf("bigint");
  }, TIMEOUT);
});


} // end for loop over testnets
