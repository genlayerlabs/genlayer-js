import {afterEach, describe, expect, it, vi} from "vitest";
import {decodeFunctionData, encodeAbiParameters, type Abi, type PublicClient} from "viem";
import {contractActions} from "../src/contracts/actions";
import {createClient} from "../src/client/client";
import {localnet, testnetBradbury, testnetAsimov} from "../src/chains";
import type {GenLayerChain, GenLayerClient} from "../src/types";

const address = "0x0000000000000000000000000000000000000003";
const makeActions = (chain: GenLayerChain, readContract = vi.fn()) =>
  contractActions({chain} as GenLayerClient<GenLayerChain>, {readContract} as unknown as PublicClient);

afterEach(() => vi.unstubAllGlobals());

describe("getContractPendingQueue", () => {
  it.each([0n, 7n, 2n ** 256n - 1n])("returns %s without precision loss", async (count) => {
    const readContract = vi.fn().mockResolvedValue(count);
    await expect(makeActions(localnet, readContract).getContractPendingQueue(address)).resolves.toBe(count);
    expect(readContract).toHaveBeenCalledTimes(1);
    expect(readContract).toHaveBeenCalledWith({
      address: localnet.consensusDataContract!.address,
      abi: localnet.consensusDataContract!.abi,
      functionName: "getLatestPendingTxCount",
      args: [address],
    });
  });

  it("preserves read errors", async () => {
    const error = new Error("RPC unavailable");
    await expect(makeActions(localnet, vi.fn().mockRejectedValue(error)).getContractPendingQueue(address))
      .rejects.toBe(error);
  });

  it("rejects a missing consensus data deployment", async () => {
    const readContract = vi.fn();
    const chain = {...localnet, consensusDataContract: undefined} as unknown as GenLayerChain;
    await expect(makeActions(chain, readContract).getContractPendingQueue(address))
      .rejects.toThrow("Consensus data contract not initialized");
    expect(readContract).not.toHaveBeenCalled();
  });

  it.each([testnetBradbury, testnetAsimov])("rejects unsupported $name before RPC", async (chain) => {
    const readContract = vi.fn();
    await expect(makeActions(chain, readContract).getContractPendingQueue(address))
      .rejects.toThrow("missing getLatestPendingTxCount");
    expect(readContract).not.toHaveBeenCalled();
  });
});

describe("getContractPendingQueue client/RPC integration", () => {
  it.each([0n, 19n, BigInt(Number.MAX_SAFE_INTEGER) + 2n])("encodes eth_call and decodes %s", async (count) => {
    const fetchMock = vi.fn(async (_url, options) => {
      const request = JSON.parse(options.body);
      expect(request.method).toBe("eth_call");
      expect(request.params[0].to.toLowerCase()).toBe(localnet.consensusDataContract!.address.toLowerCase());
      expect(request.params[1]).toBe("latest");
      expect(decodeFunctionData({
        abi: localnet.consensusDataContract!.abi as Abi,
        data: request.params[0].data,
      })).toEqual({functionName: "getLatestPendingTxCount", args: [address]});
      return {json: async () => ({result: encodeAbiParameters([{type: "uint256"}], [count])})};
    });
    vi.stubGlobal("fetch", fetchMock);
    const client = createClient({chain: localnet});
    await expect(client.getContractPendingQueue(address)).resolves.toBe(count);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects an invalid address before sending RPC", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(createClient({chain: localnet}).getContractPendingQueue("0x123"))
      .rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
