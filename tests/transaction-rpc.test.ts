import {beforeEach, describe, expect, it, vi} from "vitest";
import {createClient} from "../src/client/client";
import {localnet} from "../src/chains/localnet";
import {studionet} from "../src/chains/studionet";
import {encode} from "../src/abi/calldata";
import {TransactionHash, TransactionStatus} from "../src/types/transactions";

const hash = ("0x" + "12".repeat(32)) as TransactionHash;
const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch);
  mockFetch.mockReset();
});

const respond = (result: unknown) => {
  mockFetch.mockResolvedValue({json: async () => ({jsonrpc: "2.0", id: 1, result: structuredClone(result)})});
};

const requestBody = () => JSON.parse(mockFetch.mock.calls[0][1].body);

describe("transaction RPC actions", () => {
  it.each([undefined, false, true])("forwards full=%s without overriding the server default", async full => {
    respond({hash, status: TransactionStatus.PENDING});
    const client = createClient({chain: localnet});
    await expect(client.getStudioTransactionByHash({hash, full})).resolves.toMatchObject({
      hash, status: 1, statusName: TransactionStatus.PENDING,
    });
    expect(requestBody()).toMatchObject({
      method: "sim_getTransactionByHash",
      params: full === undefined ? [hash] : [hash, full],
    });
  });

  it.each([localnet, studionet, {...localnet, id: 123456}])("decodes calldata on Studio chain $id", async chain => {
    const calldata = Buffer.from(encode({method: "example", args: []})).toString("base64");
    respond({hash, status: TransactionStatus.PENDING, data: {calldata}});
    const result = await createClient({chain}).getStudioTransactionByHash({hash});
    expect(result.data?.calldata).toMatchObject({base64: calldata});
    expect(typeof result.data?.calldata).toBe("object");
  });

  it.each(["ACTIVATED", ...Object.values(TransactionStatus)])("normalizes Studio status %s like getTransaction", async status => {
    respond({hash, status});
    const client = createClient({chain: localnet});
    const transaction = await client.getStudioTransactionByHash({hash});
    expect(await client.getTransaction({hash})).toMatchObject(transaction);
    expect(transaction.statusName).toBe(status === "ACTIVATED" ? TransactionStatus.PENDING : status);
    expect(Number.isFinite(transaction.status)).toBe(true);
    expect(transaction.lifecycle).toBeDefined();
  });

  it("preserves the response on non-Studio chains", async () => {
    const transaction = {hash, data: {calldata: "raw"}};
    respond(transaction);
    const chain = {...localnet, isStudio: false};
    const client = createClient({chain});
    await expect(client.getStudioTransactionByHash({hash})).resolves.toEqual(transaction);
  });

  it("reports missing transactions", async () => {
    respond(null);
    await expect(createClient({chain: localnet}).getStudioTransactionByHash({hash}))
      .rejects.toThrow(`Transaction not found: ${hash}`);
  });

  it("retrieves the transaction status by hash", async () => {
    respond(TransactionStatus.FINALIZED);
    await expect(createClient({chain: localnet}).getTransactionStatus({hash}))
      .resolves.toBe(TransactionStatus.FINALIZED);
    expect(requestBody()).toMatchObject({method: "gen_getTransactionStatus", params: [hash]});
  });

  it.each(["getStudioTransactionByHash", "getTransactionStatus"] as const)("propagates RPC errors from %s", async method => {
    const error = {code: -32601, message: "Method not found"};
    mockFetch.mockResolvedValue({json: async () => ({error})});
    await expect(createClient({chain: localnet})[method]({hash})).rejects.toMatchObject({code: error.code, details: error.message});
  });
});
