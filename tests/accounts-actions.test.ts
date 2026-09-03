import {describe, expect, it, vi} from "vitest";
import {parseEther} from "viem";
import {accountActions} from "../src/accounts/actions";

// Minimal publicClient stub for the getCurrentNonce tests, which never touch it.
// accountActions now requires a publicClient (mandated by the transfer factory
// signature change); these read-path tests are otherwise unchanged.
const noopPublicClient = {} as any;

function makeClient() {
  const request = vi.fn().mockResolvedValue(42);
  return {
    client: {
      request,
      account: undefined,
      chain: {id: 1},
    } as any,
    request,
  };
}

describe("accountActions.getCurrentNonce", () => {
  it("defaults to block=\"pending\" so concurrent submissions do not collide", async () => {
    const {client, request} = makeClient();
    const actions = accountActions(client, noopPublicClient);

    await actions.getCurrentNonce({
      address: "0x0000000000000000000000000000000000000001",
    });

    expect(request).toHaveBeenCalledWith({
      method: "eth_getTransactionCount",
      params: ["0x0000000000000000000000000000000000000001", "pending"],
    });
  });

  it("honors an explicit block override", async () => {
    const {client, request} = makeClient();
    const actions = accountActions(client, noopPublicClient);

    await actions.getCurrentNonce({
      address: "0x0000000000000000000000000000000000000001",
      block: "latest",
    });

    expect(request).toHaveBeenCalledWith({
      method: "eth_getTransactionCount",
      params: ["0x0000000000000000000000000000000000000001", "latest"],
    });
  });

  it("falls back to client.account.address when address is omitted-like", async () => {
    const request = vi.fn().mockResolvedValue(7);
    const client = {
      request,
      account: {address: "0x0000000000000000000000000000000000000abc"},
      chain: {id: 1},
    } as any;
    const actions = accountActions(client, noopPublicClient);

    // Pass empty string, which is falsy per the implementation's fallback chain.
    await actions.getCurrentNonce({address: "" as any});

    expect(request).toHaveBeenCalledWith({
      method: "eth_getTransactionCount",
      params: ["0x0000000000000000000000000000000000000abc", "pending"],
    });
  });

  it("throws when neither address nor client.account is available", async () => {
    const {client} = makeClient();
    const actions = accountActions(client, noopPublicClient);

    await expect(actions.getCurrentNonce({address: "" as any})).rejects.toThrow(
      /No address provided/,
    );
  });
});

const ACCOUNT_ADDRESS = "0x0000000000000000000000000000000000000011";
const TO_ADDRESS = "0x0000000000000000000000000000000000000022";
const MOCK_TX_HASH = "0x1234000000000000000000000000000000000000000000000000000000001234";

const makeTransferReceipt = () => ({
  status: "success" as const,
  transactionHash: MOCK_TX_HASH as `0x${string}`,
  blockNumber: 12n,
  gasUsed: 21000n,
  logs: [],
});

function makeTransferHarness() {
  const signTransaction = vi.fn().mockResolvedValue("0xsigned");
  const client = {
    account: {
      address: ACCOUNT_ADDRESS,
      type: "local",
      signTransaction,
    },
    chain: {id: 1, name: "test"},
  } as any;
  const publicClient = {
    estimateGas: vi.fn().mockResolvedValue(21000n),
    getTransactionCount: vi.fn().mockResolvedValue(7),
    prepareTransactionRequest: vi.fn().mockImplementation(async (request: any) => request),
    sendRawTransaction: vi.fn().mockResolvedValue(MOCK_TX_HASH),
    waitForTransactionReceipt: vi.fn().mockResolvedValue(makeTransferReceipt()),
  } as any;

  return {actions: accountActions(client, publicClient), client, publicClient, signTransaction};
}

describe("accountActions.transfer", () => {
  it("signs a legacy transfer with the pending nonce and returns the receipt", async () => {
    const {actions, publicClient, signTransaction} = makeTransferHarness();

    const receipt = await actions.transfer({to: TO_ADDRESS, value: parseEther("1")});

    // Uses the pending nonce for rapid sequential sends.
    expect(publicClient.getTransactionCount).toHaveBeenCalledWith({
      address: ACCOUNT_ADDRESS,
      blockTag: "pending",
    });

    const prepared = publicClient.prepareTransactionRequest.mock.calls[0][0];
    expect(prepared).toMatchObject({
      to: TO_ADDRESS,
      value: parseEther("1"),
      type: "legacy",
      nonce: 7,
      gas: 21000n,
    });

    expect(signTransaction).toHaveBeenCalledTimes(1);
    expect(publicClient.sendRawTransaction).toHaveBeenCalledWith({serializedTransaction: "0xsigned"});
    expect(receipt).toEqual(makeTransferReceipt());
  });

  it("falls back to a 21000 gas limit when estimateGas rejects", async () => {
    const {actions, publicClient} = makeTransferHarness();
    publicClient.estimateGas.mockRejectedValueOnce(new Error("estimate failed"));

    await actions.transfer({to: TO_ADDRESS, value: parseEther("1")});

    expect(publicClient.prepareTransactionRequest.mock.calls[0][0].gas).toBe(21000n);
  });

  it("throws when the transfer receipt is reverted", async () => {
    const {actions, publicClient} = makeTransferHarness();
    publicClient.waitForTransactionReceipt.mockResolvedValueOnce({
      ...makeTransferReceipt(),
      status: "reverted",
    });

    await expect(actions.transfer({to: TO_ADDRESS, value: parseEther("1")})).rejects.toThrow(
      /Transfer reverted/,
    );
  });

  it("throws when no account is connected", async () => {
    const client = {account: undefined, chain: {id: 1}} as any;
    const publicClient = {} as any;
    const actions = accountActions(client, publicClient);

    await expect(actions.transfer({to: TO_ADDRESS, value: parseEther("1")})).rejects.toThrow(
      /requires a local-key account/,
    );
  });

  it("throws for Address-only (json-rpc) accounts", async () => {
    const client = {account: {address: ACCOUNT_ADDRESS, type: "json-rpc"}, chain: {id: 1}} as any;
    const publicClient = {} as any;
    const actions = accountActions(client, publicClient);

    await expect(actions.transfer({to: TO_ADDRESS, value: parseEther("1")})).rejects.toThrow(
      /requires a local-key account/,
    );
  });
});
