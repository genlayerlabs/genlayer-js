// tests/smoke.test.ts
// Basic smoke tests to verify testnet chain configuration and connectivity
import {describe, it, expect} from "vitest";
import {testnetAsimov} from "@/chains/testnetAsimov";
import {createPublicClient, http} from "viem";

describe("Testnet Asimov Chain Config", () => {
  it("should have valid RPC URL", () => {
    const rpcUrl = testnetAsimov.rpcUrls.default.http[0];
    expect(rpcUrl).toBe("https://zksync-os-testnet-genlayer.zksync.dev");
  });

  it("should have valid WebSocket URL", () => {
    const wsUrl = testnetAsimov.rpcUrls.default.webSocket?.[0];
    expect(wsUrl).toBe("wss://zksync-os-testnet-alpha.zksync.dev/ws");
  });

  it("should have consensus main contract address", () => {
    expect(testnetAsimov.consensusMainContract.address).toBe(
      "0x6CAFF6769d70824745AD895663409DC70aB5B28E",
    );
  });

  it("should have consensus data contract address", () => {
    expect(testnetAsimov.consensusDataContract.address).toBe(
      "0x0D9d1d74d72Fa5eB94bcf746C8FCcb312a722c9B",
    );
  });

  it("should have staking contract address", () => {
    expect(testnetAsimov.stakingContract?.address).toBe(
      "0x63Fa5E0bb10fb6fA98F44726C5518223F767687A",
    );
  });

  it("should have correct chain ID", () => {
    expect(testnetAsimov.id).toBe(0x107d);
  });
});

describe("Testnet Asimov RPC Connectivity", () => {
  it("should connect and fetch chain ID", async () => {
    const client = createPublicClient({
      chain: testnetAsimov,
      transport: http(testnetAsimov.rpcUrls.default.http[0]),
    });
    const chainId = await client.getChainId();
    expect(chainId).toBe(testnetAsimov.id);
  }, 15000);

  it("should fetch latest block number", async () => {
    const client = createPublicClient({
      chain: testnetAsimov,
      transport: http(testnetAsimov.rpcUrls.default.http[0]),
    });
    const blockNumber = await client.getBlockNumber();
    expect(blockNumber).toBeGreaterThan(0n);
  }, 15000);
});
