import {describe, expect, it, vi} from "vitest";
import {chainActions} from "../src/chains/actions";

const makeClient = (chainId: number, overrides: Record<string, any> = {}) =>
  ({
    chain: {
      id: chainId,
      rpcUrls: {
        default: {
          http: ["http://localhost:4000"],
        },
      },
      consensusMainContract: {
        address: "0x0000000000000000000000000000000000000001",
        abi: [{type: "function", name: "addTransaction", inputs: [], outputs: []}],
        bytecode: "0x",
      },
      ...overrides,
    },
  }) as any;

describe("chainActions.initializeConsensusSmartContract", () => {
  it("returns early without network calls when chain has static consensus contract", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const client = makeClient(1);
    const actions = chainActions(client);

    await actions.initializeConsensusSmartContract();

    expect(fetchSpy).not.toHaveBeenCalled();

    fetchSpy.mockRestore();
  });
});
