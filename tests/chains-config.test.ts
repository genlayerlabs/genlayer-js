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
  it("targets the Bradbury Phase 2 deployment", () => {
    expect(testnetBradbury).toMatchObject({
      id: 4221,
      isStudio: false,
      rpcUrls: {default: {http: ["https://rpc.testnet-chain.genlayer.com"]}},
      blockExplorers: {default: {url: "https://scan.testnet-chain.genlayer.com"}},
    });
    expect(testnetBradbury.consensusMainContract?.address).toBe("0x2E2766cbc3E5e61Ce93bBcdCBb3eAcB82082A019");
    expect(testnetBradbury.consensusDataContract?.address).toBe("0xc5FA6f82BEe53598825d6edf7E3e24613082c75B");
    expect(testnetBradbury.stakingContract?.address).toBe("0xD8fBa96C0dBB0257028dBc0107060b958e5c7113");
    expect(testnetBradbury.feeManagerContract?.address).toBe("0x7678587A847712f2A96082AC07883A88D0fc7245");
    expect(testnetBradbury.roundsStorageContract?.address).toBe("0x4038d4F72C7aAbA5a442cC0dA946012B9E3f4B8a");
    expect(testnetBradbury.appealsContract?.address).toBe("0xdc953c3bCf8837987853ca05a78D52fFC3E18651");
  });
});
