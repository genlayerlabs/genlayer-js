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
  // Producer contract: genlayer-studio@6f2053f2576d1cdb3ab536fdbc283b3117a4c36a
  // backend/protocol_rpc/rpc_methods.py registers gen_getStudioTransactionByHash(hash, full=True).
  it.each([undefined, false, true])("forwards full=%s without overriding the server default", async full => {
    respond({hash, status: TransactionStatus.PENDING});
    const client = createClient({chain: localnet});
    await expect(client.getStudioTransactionByHash({hash, full})).resolves.toMatchObject({
      hash, status: 1, statusName: TransactionStatus.PENDING,
    });
    expect(requestBody()).toMatchObject({
      method: "gen_getStudioTransactionByHash",
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

  // Studio endpoints.get_transaction_status accepts {txId} and returns _status_payload.
  // Node uses the same object request and canonical numeric statusCode.
  it.each([
    {backend: "Studio", chain: localnet, response: {status: "FINALIZED", statusCode: 7}, expected: TransactionStatus.FINALIZED},
    {backend: "Studio ACTIVATED", chain: localnet, response: {status: "ACTIVATED", statusCode: 2}, expected: TransactionStatus.PENDING},
    {backend: "node", chain: {...localnet, isStudio: false}, response: {status: "LeaderRevealing", statusCode: 13}, expected: TransactionStatus.LEADER_REVEALING},
    {backend: "node Pending", chain: {...localnet, isStudio: false}, response: {status: "Pending", statusCode: 1}, expected: TransactionStatus.PENDING},
  ])("retrieves and normalizes $backend status", async ({chain, response, expected}) => {
    respond(response);
    await expect(createClient({chain}).getTransactionStatus({hash})).resolves.toBe(expected);
    expect(requestBody()).toMatchObject({method: "gen_getTransactionStatus", params: [{txId: hash}]});
  });

  it.each([null, "ACTIVATED", {}, {statusCode: 999}, {statusCode: "1"}, {statusCode: -1}])(
    "rejects invalid status responses %j", async response => {
      respond(response);
      await expect(createClient({chain: localnet}).getTransactionStatus({hash}))
        .rejects.toThrow("Invalid gen_getTransactionStatus response");
    },
  );

  it("normalizes Studio's registered lookup not-found error and preserves its cause", async () => {
    mockFetch.mockResolvedValue({json: async () => ({
      error: {code: -32001, message: `Transaction ${hash} not found`, data: {hash}},
    })});
    await expect(createClient({chain: localnet}).getStudioTransactionByHash({hash}))
      .rejects.toMatchObject({message: `Transaction not found: ${hash}`, cause: {code: -32001}});
    expect(requestBody()).toMatchObject({method: "gen_getStudioTransactionByHash", params: [hash]});
  });

  it.each(["getStudioTransactionByHash", "getTransactionStatus"] as const)("propagates RPC errors from %s", async method => {
    const error = {code: -32601, message: "Method not found"};
    mockFetch.mockResolvedValue({json: async () => ({error})});
    await expect(createClient({chain: localnet})[method]({hash})).rejects.toMatchObject({code: error.code, details: error.message});
  });
});
