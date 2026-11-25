import {describe, expect, it} from "vitest";
import {studioDevnet, studionet, testnetBradbury} from "../src/chains";

describe("Studio chain presets", () => {
  it("exports the dedicated Studio preview deployment", () => {
    expect(studioDevnet).toMatchObject({
      id: 61_997,
      isStudio: true,
      name: "GenLayer Studio Devnet",
      rpcUrls: {
        default: {
          http: ["https://studio-dev.genlayer.com/api"],
        },
      },
      testnet: true,
    });
    expect(studioDevnet.blockExplorers).toBeUndefined();
    expect(studioDevnet.consensusMainContract?.address).toBe(
      studionet.consensusMainContract?.address,
    );
    expect(studioDevnet.consensusDataContract?.address).toBe(
      studionet.consensusDataContract?.address,
    );
  });

  it("does not move the stable Studio preset", () => {
    expect(studionet.id).toBe(61_999);
    expect(studionet.rpcUrls.default.http).toEqual([
      "https://studio.genlayer.com/api",
    ]);
  });
});

describe("Bradbury chain preset", () => {
  it("targets the Bradbury Phase 3 deployment", () => {
    expect(testnetBradbury).toMatchObject({
      id: 4221,
      isStudio: false,
      rpcUrls: {default: {http: ["https://rpc.testnet-chain.genlayer.com"]}},
      blockExplorers: {default: {url: "https://scan.testnet-chain.genlayer.com"}},
    });
    expect(testnetBradbury.consensusMainContract?.address).toBe("0x0f4F0e05475723790E4a2ed0598370783C300926");
    expect(testnetBradbury.consensusDataContract?.address).toBe("0x2247b85b7ca7fb1Fea990b4aFAB4328D9c597f28");
    expect(testnetBradbury.stakingContract?.address).toBe("0xcE16862EAf10B97A0619BeBb662991fb4a52e346");
    expect(testnetBradbury.feeManagerContract?.address).toBe("0x8E8B6194020dB1CbEf9C6c9dcFeE8FfF1e5E33c3");
    expect(testnetBradbury.roundsStorageContract?.address).toBe("0xa6bdB728B82c23786D6e3CAfc0B97235490A64Fb");
    expect(testnetBradbury.appealsContract?.address).toBe("0x10F2d70ABB8F588f96bEB1a02c99163EB75A2CF1");
  });
});
