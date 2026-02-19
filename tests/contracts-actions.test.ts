import {describe, it, expect, vi} from "vitest";
import {encodeFunctionData} from "viem";
import {contractActions} from "../src/contracts/actions";

const MAIN_CONTRACT_ADDRESS = "0x0000000000000000000000000000000000000001";
const SENDER_ADDRESS = "0x0000000000000000000000000000000000000002";
const RECIPIENT_ADDRESS = "0x0000000000000000000000000000000000000003";

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
  initializeConsensusSmartContract,
}: {
  initialAbi: readonly unknown[];
  initializeConsensusSmartContract?: (client: any) => Promise<void> | void;
}) => {
  const estimateTransactionGas = vi.fn().mockResolvedValue(21_000n);
  const signTransaction = vi.fn().mockRejectedValue(new Error("stop_after_encoding"));

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
    initializeConsensusSmartContract: vi.fn(async () => {
      if (initializeConsensusSmartContract) {
        await initializeConsensusSmartContract(client);
      }
    }),
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

  return {actions, estimateTransactionGas, client};
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

  it("uses refreshed ABI from initializeConsensusSmartContract before write encoding", async () => {
    const {actions, estimateTransactionGas, client} = setupWriteContractHarness({
      initialAbi: ADD_TRANSACTION_ABI_V5,
      initializeConsensusSmartContract: currentClient => {
        currentClient.chain.consensusMainContract.abi = [...ADD_TRANSACTION_ABI_V6];
      },
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
    expect(client.initializeConsensusSmartContract).toHaveBeenCalledTimes(1);
  });
});
