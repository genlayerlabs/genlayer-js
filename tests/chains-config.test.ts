import {describe, expect, it} from "vitest";
import {studioDevnet, studionet} from "../src/chains";

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
