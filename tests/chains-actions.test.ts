import {beforeEach, describe, expect, it, vi} from "vitest";
import {chainActions} from "../src/chains/actions";
import {localnet} from "../src/chains/localnet";
import {studionet} from "../src/chains/studionet";

const STATIC_CONTRACT = {
  address: "0x0000000000000000000000000000000000000001",
  abi: [{type: "function", name: "addTransaction", inputs: [], outputs: []}],
  bytecode: "0x",
};

const RUNTIME_CONTRACT = {
  address: "0x00000000000000000000000000000000000000AA",
  abi: [{type: "function", name: "addTransaction", inputs: [{type: "uint256"}], outputs: []}],
  bytecode: "0x",
};

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

const makeClient = (chainId: number, consensusMainContract: any = STATIC_CONTRACT) =>
  ({
    chain: {
      id: chainId,
      rpcUrls: {
        default: {
          http: ["http://localhost:4000"],
        },
      },
      consensusMainContract,
    },
  }) as any;

describe("chainActions.initializeConsensusSmartContract", () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it("skips runtime fetch on non-local/studio chains when static contract exists", async () => {
    const client = makeClient(1);
    const actions = chainActions(client);

    await actions.initializeConsensusSmartContract();

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refreshes consensus contract on localnet even if static contract exists", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({result: RUNTIME_CONTRACT}),
    });
    const client = makeClient(localnet.id);
    const actions = chainActions(client);

    await actions.initializeConsensusSmartContract();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(client.chain.consensusMainContract).toEqual(RUNTIME_CONTRACT);
    expect(client.chain.__consensusAbiFetchedFromRpc).toBe(true);
  });

  it("falls back to static contract on studio when runtime endpoint is unavailable", async () => {
    fetchMock.mockRejectedValue(new Error("rpc unavailable"));
    const client = makeClient(studionet.id);
    const actions = chainActions(client);

    await expect(actions.initializeConsensusSmartContract()).resolves.toBeUndefined();

    expect(client.chain.consensusMainContract).toEqual(STATIC_CONTRACT);
    expect(client.chain.__consensusAbiFetchedFromRpc).toBe(false);
  });

  it("throws when runtime fetch fails and no static contract exists", async () => {
    fetchMock.mockRejectedValue(new Error("rpc unavailable"));
    const client = makeClient(localnet.id, null);
    const actions = chainActions(client);

    await expect(actions.initializeConsensusSmartContract()).rejects.toThrow("rpc unavailable");
  });
});
