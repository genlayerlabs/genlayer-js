import {describe, expect, it, vi} from "vitest";
import {chainActions} from "../src/chains/actions";

const makeClient = (chainId: number) =>
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
    },
  }) as any;

describe("chainActions.initializeConsensusSmartContract", () => {
  it("emits a deprecation warning and makes no network calls", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const client = makeClient(1);
    const actions = chainActions(client);

    await actions.initializeConsensusSmartContract();

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("deprecated"),
    );
    expect(fetchSpy).not.toHaveBeenCalled();

    warnSpy.mockRestore();
    fetchSpy.mockRestore();
  });
});
