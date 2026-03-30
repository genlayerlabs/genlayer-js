import {describe, it, expect, vi} from "vitest";
import {encodeFunctionData, keccak256, toHex} from "viem";
import {contractActions} from "../src/contracts/actions";

const MAIN_CONTRACT_ADDRESS = "0x0000000000000000000000000000000000000001";
const SENDER_ADDRESS = "0x0000000000000000000000000000000000000002";
const RECIPIENT_ADDRESS = "0x0000000000000000000000000000000000000003";
const MOCK_GENLAYER_TX_ID = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const MOCK_EVM_TX_HASH = "0x1234000000000000000000000000000000000000000000000000000000001234";

const NEW_TRANSACTION_EVENT_ABI = {
  type: "event" as const,
  name: "NewTransaction",
  inputs: [
    {name: "txId", type: "bytes32", indexed: true},
    {name: "recipient", type: "address", indexed: true},
    {name: "activator", type: "address", indexed: true},
  ],
};

const NEW_TRANSACTION_EVENT_TOPIC = keccak256(
  toHex(new TextEncoder().encode("NewTransaction(bytes32,address,address)")),
);

const makeMockReceiptWithNewTxEvent = (txId: string = MOCK_GENLAYER_TX_ID) => ({
  status: "success" as const,
  logs: [
    {
      address: MAIN_CONTRACT_ADDRESS,
      topics: [
        NEW_TRANSACTION_EVENT_TOPIC,
        txId as `0x${string}`,
        `0x000000000000000000000000${RECIPIENT_ADDRESS.slice(2)}` as `0x${string}`,
        `0x000000000000000000000000${SENDER_ADDRESS.slice(2)}` as `0x${string}`,
      ],
      data: "0x" as `0x${string}`,
      blockNumber: 1n,
      transactionHash: MOCK_EVM_TX_HASH as `0x${string}`,
      transactionIndex: 0,
      blockHash: "0x0" as `0x${string}`,
      logIndex: 0,
      removed: false,
    },
  ],
});

const makeMockPublicClient = (receipt: {status: string; logs: any[]} = makeMockReceiptWithNewTxEvent()) => ({
  waitForTransactionReceipt: vi.fn().mockResolvedValue(receipt),
});

const ADD_TRANSACTION_ABI_V5 = [
  {
    type: "function",
    name: "addTransaction",
    stateMutability: "nonpayable",
    inputs: [
      {name: "_sender", type: "address"},
      {name: "_recipient", type: "address"},
      {name: "_numOfInitialValidators", type: "uint256"},
      {name: "_maxRotations", type: "uint256"},
      {name: "_txData", type: "bytes"},
    ],
    outputs: [],
  },
] as const;

const ADD_TRANSACTION_ABI_V6 = [
  {
    type: "function",
    name: "addTransaction",
    stateMutability: "nonpayable",
    inputs: [
      {name: "_sender", type: "address"},
      {name: "_recipient", type: "address"},
      {name: "_numOfInitialValidators", type: "uint256"},
      {name: "_maxRotations", type: "uint256"},
      {name: "_txData", type: "bytes"},
      {name: "_validUntil", type: "uint256"},
    ],
    outputs: [],
  },
] as const;

const selectorForV5 = encodeFunctionData({
  abi: ADD_TRANSACTION_ABI_V5 as any,
  functionName: "addTransaction",
  args: [SENDER_ADDRESS, RECIPIENT_ADDRESS, 5, 3, "0x"],
}).slice(0, 10);

const selectorForV6 = encodeFunctionData({
  abi: ADD_TRANSACTION_ABI_V6 as any,
  functionName: "addTransaction",
  args: [SENDER_ADDRESS, RECIPIENT_ADDRESS, 5, 3, "0x", 0n],
}).slice(0, 10);

const setupWriteContractHarness = ({
  initialAbi,
  signTransactionMock,
}: {
  initialAbi: readonly unknown[];
  signTransactionMock?: ReturnType<typeof vi.fn>;
}) => {
  const estimateTransactionGas = vi.fn().mockResolvedValue(21_000n);
  const signTransaction = signTransactionMock ?? vi.fn().mockRejectedValue(new Error("stop_after_encoding"));

  const client = {
    chain: {
      id: 61_127,
      defaultNumberOfInitialValidators: 5,
      defaultConsensusMaxRotations: 3,
      consensusMainContract: {
        address: MAIN_CONTRACT_ADDRESS,
        abi: [...initialAbi],
        bytecode: "0x",
      },
    },
    account: {
      address: SENDER_ADDRESS,
      type: "local",
      signTransaction,
    },
    initializeConsensusSmartContract: vi.fn().mockResolvedValue(undefined),
    getCurrentNonce: vi.fn().mockResolvedValue(0n),
    estimateTransactionGas,
    request: vi.fn().mockImplementation(async ({method}: {method: string}) => {
      if (method === "eth_gasPrice") {
        return "0x1";
      }
      throw new Error(`Unexpected RPC method: ${method}`);
    }),
  };

  const actions = contractActions(client as any, {} as any);

  return {actions, estimateTransactionGas, client, signTransaction};
};

describe("contractActions addTransaction ABI compatibility", () => {
  it("encodes addTransaction with 5 args when ABI has 5 inputs", async () => {
    const {actions, estimateTransactionGas} = setupWriteContractHarness({
      initialAbi: ADD_TRANSACTION_ABI_V5,
    });

    await expect(
      actions.writeContract({
        address: RECIPIENT_ADDRESS,
        functionName: "ping",
        value: 0n,
      }),
    ).rejects.toThrow("stop_after_encoding");

    const encodedData = estimateTransactionGas.mock.calls[0][0].data as `0x${string}`;
    expect(encodedData.slice(0, 10)).toBe(selectorForV5);
  });

  it("encodes addTransaction with 6 args when ABI has 6 inputs", async () => {
    const {actions, estimateTransactionGas} = setupWriteContractHarness({
      initialAbi: ADD_TRANSACTION_ABI_V6,
    });

    await expect(
      actions.writeContract({
        address: RECIPIENT_ADDRESS,
        functionName: "ping",
        value: 0n,
      }),
    ).rejects.toThrow("stop_after_encoding");

    const encodedData = estimateTransactionGas.mock.calls[0][0].data as `0x${string}`;
    expect(encodedData.slice(0, 10)).toBe(selectorForV6);
  });

  it("retries with v6 signature when v5 signature fails with ABI mismatch", async () => {
    const signTransaction = vi
      .fn()
      .mockRejectedValueOnce(new Error("Invalid pointer in tuple at location 128 in payload"))
      .mockRejectedValueOnce(new Error("stop_after_retry"));
    const {actions, estimateTransactionGas} = setupWriteContractHarness({
      initialAbi: ADD_TRANSACTION_ABI_V5,
      signTransactionMock: signTransaction,
    });

    await expect(
      actions.writeContract({
        address: RECIPIENT_ADDRESS,
        functionName: "ping",
        value: 0n,
      }),
    ).rejects.toThrow("stop_after_retry");

    expect(signTransaction).toHaveBeenCalledTimes(2);
    const firstEncodedData = signTransaction.mock.calls[0][0].data as `0x${string}`;
    const secondEncodedData = signTransaction.mock.calls[1][0].data as `0x${string}`;
    expect(firstEncodedData.slice(0, 10)).toBe(selectorForV5);
    expect(secondEncodedData.slice(0, 10)).toBe(selectorForV6);
    expect(estimateTransactionGas).toHaveBeenCalledTimes(2);
  });

  it("retries when ABI mismatch details are on error.details (viem InternalRpcError shape)", async () => {
    const signTransaction = vi
      .fn()
      .mockRejectedValueOnce({
        shortMessage: "An internal error was received.",
        details: "Invalid pointer in tuple at location 128 in payload",
      })
      .mockRejectedValueOnce(new Error("stop_after_retry"));
    const {actions} = setupWriteContractHarness({
      initialAbi: ADD_TRANSACTION_ABI_V5,
      signTransactionMock: signTransaction as any,
    });

    await expect(
      actions.writeContract({
        address: RECIPIENT_ADDRESS,
        functionName: "ping",
        value: 0n,
      }),
    ).rejects.toThrow("stop_after_retry");

    expect(signTransaction).toHaveBeenCalledTimes(2);
    const firstEncodedData = signTransaction.mock.calls[0][0].data as `0x${string}`;
    const secondEncodedData = signTransaction.mock.calls[1][0].data as `0x${string}`;
    expect(firstEncodedData.slice(0, 10)).toBe(selectorForV5);
    expect(secondEncodedData.slice(0, 10)).toBe(selectorForV6);
  });

  it("retries with v5 signature when v6 signature fails with ABI mismatch", async () => {
    const signTransaction = vi
      .fn()
      .mockRejectedValueOnce(new Error("Invalid pointer in tuple at location 128 in payload"))
      .mockRejectedValueOnce(new Error("stop_after_retry"));
    const {actions, estimateTransactionGas} = setupWriteContractHarness({
      initialAbi: ADD_TRANSACTION_ABI_V6,
      signTransactionMock: signTransaction,
    });

    await expect(
      actions.writeContract({
        address: RECIPIENT_ADDRESS,
        functionName: "ping",
        value: 0n,
      }),
    ).rejects.toThrow("stop_after_retry");

    expect(signTransaction).toHaveBeenCalledTimes(2);
    const firstEncodedData = signTransaction.mock.calls[0][0].data as `0x${string}`;
    const secondEncodedData = signTransaction.mock.calls[1][0].data as `0x${string}`;
    expect(firstEncodedData.slice(0, 10)).toBe(selectorForV6);
    expect(secondEncodedData.slice(0, 10)).toBe(selectorForV5);
    expect(estimateTransactionGas).toHaveBeenCalledTimes(2);
  });

  it("uses direct eth_sendTransaction for non-local accounts without prepareTransactionRequest", async () => {
    const request = vi.fn().mockImplementation(async ({method, params}: {method: string; params?: any[]}) => {
      if (method === "eth_gasPrice") {
        return "0x1";
      }
      if (method === "eth_sendTransaction") {
        expect(params).toBeDefined();
        return MOCK_EVM_TX_HASH;
      }
      throw new Error(`Unexpected RPC method: ${method}`);
    });

    const mockPublicClient = makeMockPublicClient();

    const client = {
      chain: {
        id: 61_127,
        defaultNumberOfInitialValidators: 5,
        defaultConsensusMaxRotations: 3,
        consensusMainContract: {
          address: MAIN_CONTRACT_ADDRESS,
          abi: [...ADD_TRANSACTION_ABI_V6, NEW_TRANSACTION_EVENT_ABI],
          bytecode: "0x",
        },
      },
      account: {
        address: SENDER_ADDRESS,
        type: "json-rpc",
      },
      initializeConsensusSmartContract: vi.fn().mockResolvedValue(undefined),
      getCurrentNonce: vi.fn().mockResolvedValue(0n),
      estimateTransactionGas: vi.fn().mockResolvedValue(21_000n),
      request,
    };

    const actions = contractActions(client as any, mockPublicClient as any);
    const txHash = await actions.writeContract({
      address: RECIPIENT_ADDRESS,
      functionName: "ping",
      value: 0n,
    });

    // Should return GenLayer txId from NewTransaction event, NOT the EVM tx hash
    expect(txHash).toBe(MOCK_GENLAYER_TX_ID);
    expect(mockPublicClient.waitForTransactionReceipt).toHaveBeenCalledWith({hash: MOCK_EVM_TX_HASH});
    expect(request).toHaveBeenCalledWith({method: "eth_gasPrice"});

    const sendTxCall = request.mock.calls.find(
      call => call[0]?.method === "eth_sendTransaction",
    );
    expect(sendTxCall).toBeDefined();

    const sendTxParams = sendTxCall?.[0]?.params?.[0];
    expect(sendTxParams).toMatchObject({
      from: SENDER_ADDRESS,
      to: MAIN_CONTRACT_ADDRESS,
      value: "0x0",
      gas: "0x5208",
      nonce: "0x0",
      type: "0x0",
      chainId: "0xeec7",
      gasPrice: "0x1",
    });
  });

  it("retries alternate ABI for injected-wallet errors with nested invalid pointer details", async () => {
    const sentPayloads: `0x${string}`[] = [];
    const request = vi.fn().mockImplementation(async ({method, params}: {method: string; params?: any[]}) => {
      if (method === "eth_gasPrice") {
        return "0x1";
      }

      if (method === "eth_sendTransaction") {
        const payload = params?.[0];
        sentPayloads.push(payload?.data);

        if (sentPayloads.length === 1) {
          throw {
            code: -32603,
            message: "Internal JSON-RPC error.",
            data: {
              originalError: {
                message: "Invalid pointer in tuple at location 128 in payload",
              },
            },
          };
        }

        return MOCK_EVM_TX_HASH;
      }

      throw new Error(`Unexpected RPC method: ${method}`);
    });

    const mockPublicClient = makeMockPublicClient();

    const client = {
      chain: {
        id: 61_127,
        defaultNumberOfInitialValidators: 5,
        defaultConsensusMaxRotations: 3,
        consensusMainContract: {
          address: MAIN_CONTRACT_ADDRESS,
          abi: [...ADD_TRANSACTION_ABI_V5, NEW_TRANSACTION_EVENT_ABI],
          bytecode: "0x",
        },
      },
      account: {
        address: SENDER_ADDRESS,
        type: "json-rpc",
      },
      initializeConsensusSmartContract: vi.fn().mockResolvedValue(undefined),
      getCurrentNonce: vi.fn().mockResolvedValue(0n),
      estimateTransactionGas: vi.fn().mockResolvedValue(21_000n),
      request,
    };

    const actions = contractActions(client as any, mockPublicClient as any);
    const txHash = await actions.writeContract({
      address: RECIPIENT_ADDRESS,
      functionName: "ping",
      value: 0n,
    });

    // Should return GenLayer txId, not the EVM hash
    expect(txHash).toBe(MOCK_GENLAYER_TX_ID);
    expect(sentPayloads).toHaveLength(2);
    expect(sentPayloads[0].slice(0, 10)).toBe(selectorForV5);
    expect(sentPayloads[1].slice(0, 10)).toBe(selectorForV6);
  });

  it("throws when external wallet transaction is reverted", async () => {
    const request = vi.fn().mockImplementation(async ({method}: {method: string}) => {
      if (method === "eth_gasPrice") return "0x1";
      if (method === "eth_sendTransaction") return MOCK_EVM_TX_HASH;
      throw new Error(`Unexpected RPC method: ${method}`);
    });

    const mockPublicClient = makeMockPublicClient({
      status: "reverted",
      logs: [],
    });

    const client = {
      chain: {
        id: 61_127,
        defaultNumberOfInitialValidators: 5,
        defaultConsensusMaxRotations: 3,
        consensusMainContract: {
          address: MAIN_CONTRACT_ADDRESS,
          abi: [...ADD_TRANSACTION_ABI_V6, NEW_TRANSACTION_EVENT_ABI],
          bytecode: "0x",
        },
      },
      account: {address: SENDER_ADDRESS, type: "json-rpc"},
      initializeConsensusSmartContract: vi.fn().mockResolvedValue(undefined),
      getCurrentNonce: vi.fn().mockResolvedValue(0n),
      estimateTransactionGas: vi.fn().mockResolvedValue(21_000n),
      request,
    };

    const actions = contractActions(client as any, mockPublicClient as any);
    await expect(
      actions.writeContract({address: RECIPIENT_ADDRESS, functionName: "ping", value: 0n}),
    ).rejects.toThrow("Transaction reverted");
  });

  it("throws when external wallet receipt has no NewTransaction event", async () => {
    const request = vi.fn().mockImplementation(async ({method}: {method: string}) => {
      if (method === "eth_gasPrice") return "0x1";
      if (method === "eth_sendTransaction") return MOCK_EVM_TX_HASH;
      throw new Error(`Unexpected RPC method: ${method}`);
    });

    const mockPublicClient = makeMockPublicClient({
      status: "success" as const,
      logs: [], // no NewTransaction event
    });

    const client = {
      chain: {
        id: 61_127,
        defaultNumberOfInitialValidators: 5,
        defaultConsensusMaxRotations: 3,
        consensusMainContract: {
          address: MAIN_CONTRACT_ADDRESS,
          abi: [...ADD_TRANSACTION_ABI_V6, NEW_TRANSACTION_EVENT_ABI],
          bytecode: "0x",
        },
      },
      account: {address: SENDER_ADDRESS, type: "json-rpc"},
      initializeConsensusSmartContract: vi.fn().mockResolvedValue(undefined),
      getCurrentNonce: vi.fn().mockResolvedValue(0n),
      estimateTransactionGas: vi.fn().mockResolvedValue(21_000n),
      request,
    };

    const actions = contractActions(client as any, mockPublicClient as any);
    await expect(
      actions.writeContract({address: RECIPIENT_ADDRESS, functionName: "ping", value: 0n}),
    ).rejects.toThrow("Transaction not processed by consensus");
  });
});
