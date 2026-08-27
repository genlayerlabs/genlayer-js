import {describe, it, expect, vi} from "vitest";
import {decodeAbiParameters, decodeFunctionData, encodeFunctionData, keccak256, toHex} from "viem";
import {contractActions} from "../src/contracts/actions";
import {NFT_MINTER_ABI} from "../src/abi/nftMinter";
import {
  CALL_KEY_DEPLOY,
  CALL_KEY_UNNAMED,
  CALL_KEY_WILDCARD,
  DEPLOY_CALL_KEY,
  deployCallKey,
  deriveExternalMessageCallKey,
  deriveInternalMessageCallKey,
  encodeExternalMessageFeeParams,
  encodeInternalMessageFeeParams,
  MessageType,
} from "../src/transactions/fees";

const MAIN_CONTRACT_ADDRESS = "0x0000000000000000000000000000000000000001";
const SENDER_ADDRESS = "0x0000000000000000000000000000000000000002";
const RECIPIENT_ADDRESS = "0x0000000000000000000000000000000000000003";
const ADDRESS_MANAGER_ADDRESS = "0x0000000000000000000000000000000000000004";
const NFT_MINTER_ADDRESS = "0x0000000000000000000000000000000000000005";
const CONSENSUS_DATA_ADDRESS = "0x0000000000000000000000000000000000000006";
const MOCK_GENLAYER_TX_ID = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const MOCK_EVM_TX_HASH = "0x1234000000000000000000000000000000000000000000000000000000001234";
const MOCK_DECISION_ID = 42n;
const MOCK_ATTEMPT_ID = `0x${"bb".repeat(32)}` as const;

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

const CONSENSUS_ADDRESS_MANAGER_ABI = [
  {
    type: "function",
    name: "getAddressManager",
    stateMutability: "view",
    inputs: [],
    outputs: [{name: "", type: "address"}],
  },
] as const;

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

const FEES_DISTRIBUTION_COMPONENTS = [
  {name: "leaderTimeunitsAllocation", type: "uint256"},
  {name: "validatorTimeunitsAllocation", type: "uint256"},
  {name: "appealRounds", type: "uint256"},
  {name: "executionBudgetPerRound", type: "uint256"},
  {name: "executionConsumed", type: "uint256"},
  {name: "totalMessageFees", type: "uint256"},
  {name: "rotations", type: "uint256[]"},
  {name: "maxPriceGenPerTimeUnit", type: "uint256"},
  {name: "storageFeeMaxGasPrice", type: "uint256"},
  {name: "receiptFeeMaxGasPrice", type: "uint256"},
] as const;

const MESSAGE_FEE_ALLOCATION_COMPONENTS = [
  {name: "messageType", type: "uint8"},
  {name: "onAcceptance", type: "bool"},
  {name: "parentIndex", type: "uint256"},
  {name: "recipient", type: "address"},
  {name: "callKey", type: "bytes32"},
  {name: "budget", type: "uint256"},
  {name: "feeParams", type: "bytes"},
] as const;

const INTERNAL_MESSAGE_FEE_PARAMS_ABI = [
  {
    name: "params",
    type: "tuple",
    components: [
      {name: "leaderTimeunitsAllocation", type: "uint256"},
      {name: "validatorTimeunitsAllocation", type: "uint256"},
      {name: "appealRounds", type: "uint256"},
      {name: "executionBudgetPerRound", type: "uint256"},
      {name: "rotations", type: "uint256[]"},
    ],
  },
] as const;

const EXTERNAL_MESSAGE_FEE_PARAMS_ABI = [
  {
    name: "params",
    type: "tuple",
    components: [
      {name: "gasLimit", type: "uint256"},
      {name: "maxGasPrice", type: "uint256"},
    ],
  },
] as const;

const ADD_TRANSACTION_ABI_WITH_FEES = [
  {
    type: "function",
    name: "addTransaction",
    stateMutability: "payable",
    inputs: [
      {
        name: "_params",
        type: "tuple",
        components: [
          {name: "sender", type: "address"},
          {name: "recipient", type: "address"},
          {name: "numOfInitialValidators", type: "uint256"},
          {name: "maxRotations", type: "uint256"},
          {name: "validUntil", type: "uint256"},
          {name: "saltNonce", type: "uint256"},
          {name: "userValue", type: "uint256"},
          {name: "feesDistribution", type: "tuple", components: FEES_DISTRIBUTION_COMPONENTS},
          {name: "txCalldata", type: "bytes"},
          {name: "messageAllocations", type: "tuple[]", components: MESSAGE_FEE_ALLOCATION_COMPONENTS},
        ],
      },
    ],
    outputs: [],
  },
] as const;

const selectorForFees = encodeFunctionData({
  abi: ADD_TRANSACTION_ABI_WITH_FEES as any,
  functionName: "addTransaction",
  args: [{
    sender: SENDER_ADDRESS,
    recipient: RECIPIENT_ADDRESS,
    numOfInitialValidators: 5n,
    maxRotations: 3n,
    validUntil: 1n,
    saltNonce: 0n,
    userValue: 0n,
    feesDistribution: {
      leaderTimeunitsAllocation: 0n,
      validatorTimeunitsAllocation: 0n,
      appealRounds: 0n,
      executionBudgetPerRound: 0n,
      executionConsumed: 0n,
      totalMessageFees: 0n,
      rotations: [0n],
      maxPriceGenPerTimeUnit: 0n,
      storageFeeMaxGasPrice: 0n,
      receiptFeeMaxGasPrice: 0n,
    },
    txCalldata: "0x",
    messageAllocations: [],
  }],
}).slice(0, 10);

const setupWriteContractHarness = ({
  initialAbi,
  signTransactionMock,
  publicClient = {},
  feeManagerAddress,
  isStudio = false,
  requestMock,
}: {
  initialAbi: readonly unknown[];
  signTransactionMock?: ReturnType<typeof vi.fn>;
  publicClient?: Record<string, unknown>;
  feeManagerAddress?: string;
  isStudio?: boolean;
  requestMock?: ReturnType<typeof vi.fn>;
}) => {
  const estimateTransactionGas = vi.fn().mockResolvedValue(21_000n);
  const signTransaction = signTransactionMock ?? vi.fn().mockRejectedValue(new Error("stop_after_encoding"));

  const client = {
    chain: {
      id: 61_127,
      isStudio,
      defaultNumberOfInitialValidators: 5,
      defaultConsensusMaxRotations: 3,
      consensusMainContract: {
        address: MAIN_CONTRACT_ADDRESS,
        abi: [...initialAbi],
        bytecode: "0x",
      },
      feeManagerContract: feeManagerAddress
        ? {
          address: feeManagerAddress,
          abi: [],
        }
        : null,
    },
    account: {
      address: SENDER_ADDRESS,
      type: "local",
      signTransaction,
    },
    initializeConsensusSmartContract: vi.fn().mockResolvedValue(undefined),
    getCurrentNonce: vi.fn().mockResolvedValue(0n),
    estimateTransactionGas,
    request: requestMock ?? vi.fn().mockImplementation(async ({method}: {method: string}) => {
      if (method === "eth_gasPrice") {
        return "0x1";
      }
      throw new Error(`Unexpected RPC method: ${method}`);
    }),
  };

  const actions = contractActions(client as any, publicClient as any);

  return {actions, estimateTransactionGas, client, signTransaction, publicClient};
};

const setupDeveloperNftHarness = ({
  readContractMock,
  signTransactionMock,
}: {
  readContractMock?: ReturnType<typeof vi.fn>;
  signTransactionMock?: ReturnType<typeof vi.fn>;
} = {}) => {
  const estimateTransactionGas = vi.fn().mockResolvedValue(21_000n);
  const signTransaction = signTransactionMock ?? vi.fn().mockRejectedValue(new Error("stop_after_encoding"));
  const readContract = readContractMock ?? vi.fn().mockImplementation(async ({
    functionName,
    args,
  }: {
    functionName: string;
    args?: readonly unknown[];
  }) => {
    if (functionName === "getAddressManager") return ADDRESS_MANAGER_ADDRESS;
    if (functionName === "getAddressNonZero") {
      expect(args).toEqual(["NFTMinter"]);
      return NFT_MINTER_ADDRESS;
    }
    if (functionName === "developerToNFT") return 7n;
    if (functionName === "nfts") return [SENDER_ADDRESS, 123n, 5n];
    if (functionName === "getGhostsForNFT") return [RECIPIENT_ADDRESS];
    if (functionName === "getClaimableRewardsFromFees") return 123n;
    if (functionName === "getClaimableRewardsFromInflation") return 456n;
    throw new Error(`Unexpected readContract ${functionName}`);
  });

  const publicClient = {
    readContract,
    waitForTransactionReceipt: vi.fn().mockResolvedValue({status: "success"}),
  };
  const client = {
    chain: {
      id: 61_127,
      isStudio: false,
      consensusMainContract: {
        address: MAIN_CONTRACT_ADDRESS,
        abi: CONSENSUS_ADDRESS_MANAGER_ABI,
        bytecode: "0x",
      },
    },
    account: {
      address: SENDER_ADDRESS,
      type: "local",
      signTransaction,
    },
    getCurrentNonce: vi.fn().mockResolvedValue(0n),
    estimateTransactionGas,
    request: vi.fn().mockImplementation(async ({method}: {method: string}) => {
      if (method === "eth_gasPrice") {
        return "0x1";
      }
      throw new Error(`Unexpected RPC method: ${method}`);
    }),
    sendRawTransaction: vi.fn().mockResolvedValue(MOCK_EVM_TX_HASH),
  };

  const actions = contractActions(client as any, publicClient as any);

  return {actions, client, estimateTransactionGas, publicClient, readContract, signTransaction};
};

describe("contractActions developer NFT actions", () => {
  it("returns developer NFT data from the AddressManager-resolved NFTMinter", async () => {
    const {actions, readContract} = setupDeveloperNftHarness();

    const nft = await actions.getDeveloperNft({developer: SENDER_ADDRESS});

    expect(nft).toEqual({
      nftId: 7n,
      developer: SENDER_ADDRESS,
      claimableRewards: 123n,
      lastClaimedEpoch: 5n,
      ghosts: [RECIPIENT_ADDRESS],
    });
    expect(readContract).toHaveBeenCalledWith(expect.objectContaining({
      address: MAIN_CONTRACT_ADDRESS,
      functionName: "getAddressManager",
      args: [],
    }));
    expect(readContract).toHaveBeenCalledWith(expect.objectContaining({
      address: ADDRESS_MANAGER_ADDRESS,
      functionName: "getAddressNonZero",
      args: ["NFTMinter"],
    }));
    expect(readContract).toHaveBeenCalledWith(expect.objectContaining({
      address: NFT_MINTER_ADDRESS,
      functionName: "developerToNFT",
      args: [SENDER_ADDRESS],
    }));
    expect(readContract).toHaveBeenCalledWith(expect.objectContaining({
      address: NFT_MINTER_ADDRESS,
      functionName: "nfts",
      args: [7n],
    }));
    expect(readContract).toHaveBeenCalledWith(expect.objectContaining({
      address: NFT_MINTER_ADDRESS,
      functionName: "getGhostsForNFT",
      args: [7n],
    }));
  });

  it("returns null when a developer has no NFT", async () => {
    const readContract = vi.fn().mockImplementation(async ({functionName}: {functionName: string}) => {
      if (functionName === "getAddressManager") return ADDRESS_MANAGER_ADDRESS;
      if (functionName === "getAddressNonZero") return NFT_MINTER_ADDRESS;
      if (functionName === "developerToNFT") return 0n;
      throw new Error(`Unexpected readContract ${functionName}`);
    });
    const {actions} = setupDeveloperNftHarness({readContractMock: readContract});

    await expect(actions.getDeveloperNft({developer: SENDER_ADDRESS})).resolves.toBeNull();
    expect(readContract).not.toHaveBeenCalledWith(expect.objectContaining({
      functionName: "nfts",
    }));
  });

  it("reads claimable rewards from fees and inflation on NFTMinter", async () => {
    const {actions, readContract} = setupDeveloperNftHarness();

    await expect(actions.getClaimableRewardsFromFees({nftId: 7n})).resolves.toBe(123n);
    await expect(
      actions.getClaimableRewardsFromInflation({
        nftId: 7n,
        numberOfEpochsToClaim: 3n,
      }),
    ).resolves.toBe(456n);

    expect(readContract).toHaveBeenCalledWith(expect.objectContaining({
      address: NFT_MINTER_ADDRESS,
      functionName: "getClaimableRewardsFromFees",
      args: [7n],
    }));
    expect(readContract).toHaveBeenCalledWith(expect.objectContaining({
      address: NFT_MINTER_ADDRESS,
      functionName: "getClaimableRewardsFromInflation",
      args: [7n, 3n],
    }));
  });

  it("encodes claimNftRewards to the AddressManager-resolved NFTMinter", async () => {
    const {actions, estimateTransactionGas} = setupDeveloperNftHarness();

    await expect(actions.claimNftRewards({nftId: 7n})).rejects.toThrow("stop_after_encoding");

    const expectedData = encodeFunctionData({
      abi: NFT_MINTER_ABI,
      functionName: "claim",
      args: [7n],
    });
    expect(estimateTransactionGas).toHaveBeenCalledWith(expect.objectContaining({
      to: NFT_MINTER_ADDRESS,
      data: expectedData,
      value: 0n,
    }));
  });

  it("encodes claimNftEpochs to the AddressManager-resolved NFTMinter", async () => {
    const {actions, estimateTransactionGas} = setupDeveloperNftHarness();

    await expect(
      actions.claimNftEpochs({
        nftId: 7n,
        numberOfEpochsToClaim: 3n,
      }),
    ).rejects.toThrow("stop_after_encoding");

    const expectedData = encodeFunctionData({
      abi: NFT_MINTER_ABI,
      functionName: "claimEpochs",
      args: [7n, 3n],
    });
    expect(estimateTransactionGas).toHaveBeenCalledWith(expect.objectContaining({
      to: NFT_MINTER_ADDRESS,
      data: expectedData,
      value: 0n,
    }));
  });
});

describe("contractActions addTransaction ABI compatibility", () => {
  it("passes trusted fees and user value through Studio simulateWriteContract sim_call", async () => {
    const request = vi.fn().mockResolvedValue({
      result: Buffer.from([0, 0xab, 0xcd]).toString("base64"),
      execution_result: "SUCCESS",
      genvm_result: {
        fee_accounting: {
          status: "active",
          primary_fee_budget: "123",
          execution_fee_report: {
            receiptGasPrice: "1",
            proposalReceipt: {
              eqBlocksOutputsLength: "10",
              receiptBytes: "1034",
              estimatedGas: "314544",
              fee: "314544",
            },
            messageReveal: {
              messageBytes: "320",
              messageCount: "1",
              estimatedGas: "187120",
              fee: "187120",
              messages: [
                {
                  messageType: "Internal",
                  recipient: RECIPIENT_ADDRESS,
                  value: "0",
                  dataBytes: "2",
                  onAcceptance: true,
                  saltNonce: "0",
                  feeParamsBytes: "2",
                  declaredBudget: "5",
                  allocationSubtreeBytes: "0",
                  callKey: `0x${"12".repeat(32)}`,
                },
              ],
            },
            totalEstimatedFee: "501664",
          },
        },
      },
    });
    const actions = contractActions({
      chain: {
        id: 61_127,
        defaultNumberOfInitialValidators: 5,
        defaultConsensusMaxRotations: 3,
        isStudio: true,
      },
      account: {
        address: SENDER_ADDRESS,
      },
      request,
    } as any, {} as any);

    const result = await actions.simulateWriteContract({
      address: RECIPIENT_ADDRESS,
      functionName: "update_storage",
      args: ["simulated"],
      rawReturn: true,
      includeReceipt: true,
      value: 12n,
      fees: {
        feeValue: 123n,
        distribution: {
          leaderTimeunitsAllocation: 100n,
          validatorTimeunitsAllocation: 200n,
          totalMessageFees: 5n,
          rotations: [0n],
        },
        messageAllocations: [
          {
            messageType: MessageType.Internal,
            recipient: RECIPIENT_ADDRESS,
            budget: 5n,
            feeParams: "0x1234",
          },
        ],
      },
    });

    expect(request.mock.calls[0][0].method).toBe("sim_call");
    const params = request.mock.calls[0][0].params[0];
    expect(result.result).toBe("0xabcd");
    expect(result.feeAccounting).toEqual({
      status: "active",
      primary_fee_budget: "123",
      execution_fee_report: {
        receiptGasPrice: "1",
        proposalReceipt: {
          eqBlocksOutputsLength: "10",
          receiptBytes: "1034",
          estimatedGas: "314544",
          fee: "314544",
        },
        messageReveal: {
          messageBytes: "320",
          messageCount: "1",
          estimatedGas: "187120",
          fee: "187120",
          messages: [
            {
              messageType: "Internal",
              recipient: RECIPIENT_ADDRESS,
              value: "0",
              dataBytes: "2",
              onAcceptance: true,
              saltNonce: "0",
              feeParamsBytes: "2",
              declaredBudget: "5",
              allocationSubtreeBytes: "0",
              callKey: `0x${"12".repeat(32)}`,
            },
          ],
        },
        totalEstimatedFee: "501664",
      },
    });
    expect(result.feeReport?.messageReveal?.messages?.[0].declaredBudget).toBe("5");
    expect(params.value).toBe("0xc");
    expect(params.fees.feeValue).toBe("123");
    expect(params.fees.distribution.leaderTimeunitsAllocation).toBe("100");
    expect(params.fees.distribution.validatorTimeunitsAllocation).toBe("200");
    expect(params.fees.distribution.totalMessageFees).toBe("5");
    expect(params.fees.distribution.rotations).toEqual(["0"]);
    expect(params.fees.messageAllocations[0].messageType).toBe(MessageType.Internal);
    expect(params.fees.messageAllocations[0].budget).toBe("5");
  });

  it("encodes internal message fee params as the consensus tuple", () => {
    const encoded = encodeInternalMessageFeeParams({
      leaderTimeunitsAllocation: 5n,
      validatorTimeunitsAllocation: 10n,
      appealRounds: 1n,
      executionBudgetPerRound: 20n,
      rotations: [2n, 3n],
    });

    const [decoded] = decodeAbiParameters(INTERNAL_MESSAGE_FEE_PARAMS_ABI, encoded) as any;
    expect(decoded.leaderTimeunitsAllocation).toBe(5n);
    expect(decoded.validatorTimeunitsAllocation).toBe(10n);
    expect(decoded.appealRounds).toBe(1n);
    expect(decoded.executionBudgetPerRound).toBe(20n);
    expect(decoded.rotations).toEqual([2n, 3n]);
  });

  it("encodes external message fee params as the consensus tuple", () => {
    const encoded = encodeExternalMessageFeeParams({
      gasLimit: 21_000n,
      maxGasPrice: 10n,
    });

    const [decoded] = decodeAbiParameters(EXTERNAL_MESSAGE_FEE_PARAMS_ABI, encoded) as any;
    expect(decoded.gasLimit).toBe(21_000n);
    expect(decoded.maxGasPrice).toBe(10n);
  });

  it("derives GenVM-compatible message call keys", () => {
    const shortInternal = deriveInternalMessageCallKey("update_storage");
    expect(shortInternal).toBe(
      `0x${Buffer.from("update_storage", "utf8").toString("hex").padEnd(64, "0")}`,
    );

    const exactLengthMethod = "a".repeat(32);
    const hashed = keccak256(toHex(new TextEncoder().encode(exactLengthMethod)));
    const lastByte = Number.parseInt(hashed.slice(-2), 16) | 1;
    expect(deriveInternalMessageCallKey(exactLengthMethod)).toBe(
      `${hashed.slice(0, -2)}${lastByte.toString(16).padStart(2, "0")}`,
    );

    // Wildcard is the untagged hash of empty bytes — outside the derived-key space.
    expect(CALL_KEY_WILDCARD).toBe(keccak256(new Uint8Array(0)));
    expect(CALL_KEY_WILDCARD).toBe("0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470");

    // Empty name derives bytes32(0): the natural key for deploy and emit_transfer.
    expect(deriveInternalMessageCallKey()).toBe(CALL_KEY_UNNAMED);
    expect(CALL_KEY_UNNAMED).toBe(`0x${"00".repeat(32)}`);
    expect(DEPLOY_CALL_KEY).toBe(CALL_KEY_UNNAMED);
    expect(CALL_KEY_DEPLOY).toBe(DEPLOY_CALL_KEY);
    expect(deployCallKey()).toBe(DEPLOY_CALL_KEY);
    expect(deriveExternalMessageCallKey("0xaabbccdd11223344")).toBe(
      `0xaabbccdd${"0".repeat(56)}`,
    );
    expect(deriveExternalMessageCallKey("0x123456")).toBe(CALL_KEY_UNNAMED);
  });

  it("uses the train tuple layout even when embedded chain metadata is stale v5", async () => {
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
    expect(encodedData.slice(0, 10)).toBe(selectorForFees);
  });

  it("uses the train tuple layout even when embedded chain metadata is stale v6", async () => {
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
    expect(encodedData.slice(0, 10)).toBe(selectorForFees);
  });

  it("encodes addTransaction with v0.6 fee params when ABI has tuple input", async () => {
    const {actions, estimateTransactionGas} = setupWriteContractHarness({
      initialAbi: ADD_TRANSACTION_ABI_WITH_FEES,
    });

    await expect(
      actions.writeContract({
        address: RECIPIENT_ADDRESS,
        functionName: "ping",
        value: 7n,
        validUntil: 123n,
      }),
    ).rejects.toThrow("stop_after_encoding");

    const estimateParams = estimateTransactionGas.mock.calls[0][0];
    const encodedData = estimateParams.data as `0x${string}`;
    expect(encodedData.slice(0, 10)).toBe(selectorForFees);
    expect(estimateParams.value).toBe(7n);

    const decoded = decodeFunctionData({
      abi: ADD_TRANSACTION_ABI_WITH_FEES as any,
      data: encodedData,
    });
    const params = decoded.args[0] as any;
    expect(params.sender).toBe(SENDER_ADDRESS);
    expect(params.recipient).toBe(RECIPIENT_ADDRESS);
    expect(params.numOfInitialValidators).toBe(5n);
    expect(params.maxRotations).toBe(3n);
    expect(params.validUntil).toBe(123n);
    expect(params.userValue).toBe(7n);
    expect(params.feesDistribution.rotations).toEqual([0n]);
    expect(params.messageAllocations).toEqual([]);
  });

  it("separates user value from v0.6 fee deposit value", async () => {
    const {actions, estimateTransactionGas} = setupWriteContractHarness({
      initialAbi: ADD_TRANSACTION_ABI_WITH_FEES,
    });

    await expect(
      actions.writeContract({
        address: RECIPIENT_ADDRESS,
        functionName: "ping",
        value: 5n,
        validUntil: 123n,
        fees: {
          feeValue: 123n,
          distribution: {
            totalMessageFees: 123n,
          },
          messageAllocations: [{
            messageType: MessageType.Internal,
            onAcceptance: false,
            recipient: RECIPIENT_ADDRESS,
            budget: 123n,
            feeParams: "0x1234",
          }],
        },
      }),
    ).rejects.toThrow("stop_after_encoding");

    const estimateParams = estimateTransactionGas.mock.calls[0][0];
    expect(estimateParams.value).toBe(128n);

    const decoded = decodeFunctionData({
      abi: ADD_TRANSACTION_ABI_WITH_FEES as any,
      data: estimateParams.data as `0x${string}`,
    });
    const params = decoded.args[0] as any;
    expect(params.userValue).toBe(5n);
    expect(params.feesDistribution.totalMessageFees).toBe(123n);
    expect(params.messageAllocations).toHaveLength(1);
    expect(params.messageAllocations[0].messageType).toBe(MessageType.Internal);
    expect(params.messageAllocations[0].onAcceptance).toBe(false);
    expect(params.messageAllocations[0].budget).toBe(123n);
    expect(params.messageAllocations[0].feeParams).toBe("0x1234");
  });

  it("defaults external message allocations to on-finalization", async () => {
    const {actions, estimateTransactionGas} = setupWriteContractHarness({
      initialAbi: ADD_TRANSACTION_ABI_WITH_FEES,
    });

    await expect(
      actions.writeContract({
        address: RECIPIENT_ADDRESS,
        functionName: "ping",
        validUntil: 123n,
        fees: {
          feeValue: 210_000n,
          distribution: {
            totalMessageFees: 210_000n,
          },
          messageAllocations: [{
            messageType: MessageType.External,
            recipient: RECIPIENT_ADDRESS,
            budget: 210_000n,
            feeParams: encodeExternalMessageFeeParams({
              gasLimit: 21_000n,
              maxGasPrice: 10n,
            }),
          }],
        },
      }),
    ).rejects.toThrow("stop_after_encoding");

    const decoded = decodeFunctionData({
      abi: ADD_TRANSACTION_ABI_WITH_FEES as any,
      data: estimateTransactionGas.mock.calls[0][0].data as `0x${string}`,
    });
    const params = decoded.args[0] as any;
    expect(params.messageAllocations[0].messageType).toBe(MessageType.External);
    expect(params.messageAllocations[0].onAcceptance).toBe(false);
  });

  it("calculates v0.6 fee deposit from FeeManager when feeValue is omitted", async () => {
    const publicClient = {
      readContract: vi.fn().mockResolvedValue(77n),
    };
    const {actions, estimateTransactionGas} = setupWriteContractHarness({
      initialAbi: ADD_TRANSACTION_ABI_WITH_FEES,
      publicClient,
      feeManagerAddress: "0x00000000000000000000000000000000000000fe",
    });

    await expect(
      actions.writeContract({
        address: RECIPIENT_ADDRESS,
        functionName: "ping",
        value: 2n,
        validUntil: 123n,
        fees: {
          distribution: {
            leaderTimeunitsAllocation: 10n,
            totalMessageFees: 3n,
          },
        },
      }),
    ).rejects.toThrow("stop_after_encoding");

    expect(publicClient.readContract).toHaveBeenCalledWith(expect.objectContaining({
      functionName: "calculateRoundFees",
      args: [expect.any(Object), 5n, 0n],
    }));
    expect(estimateTransactionGas.mock.calls[0][0].value).toBe(82n);
  });

  it("calculates v0.6 fee deposit from FeeManager when only execution budget is provided", async () => {
    const publicClient = {
      readContract: vi.fn().mockResolvedValue(500_000n),
    };
    const {actions, estimateTransactionGas} = setupWriteContractHarness({
      initialAbi: ADD_TRANSACTION_ABI_WITH_FEES,
      publicClient,
      feeManagerAddress: "0x00000000000000000000000000000000000000fe",
    });

    await expect(
      actions.writeContract({
        address: RECIPIENT_ADDRESS,
        functionName: "ping",
        validUntil: 123n,
        fees: {
          distribution: {
            executionBudgetPerRound: 500_000n,
          },
        },
      }),
    ).rejects.toThrow("stop_after_encoding");

    expect(publicClient.readContract).toHaveBeenCalledWith(expect.objectContaining({
      functionName: "calculateRoundFees",
      args: [expect.any(Object), 5n, 0n],
    }));
    expect(estimateTransactionGas.mock.calls[0][0].value).toBe(500_000n);
  });

  it("calculates v0.6 fee deposit locally on Studio when feeValue is omitted", async () => {
    const requestMock = vi.fn().mockImplementation(async ({method}: {method: string}) => {
      if (method === "sim_getFeeConfig") {
        return {
          enabled: true,
          policy: {
            genPerTimeUnit: "10",
            storageUnitPrice: "20",
            receiptGasPrice: "30",
          },
        };
      }
      if (method === "eth_gasPrice") return "0x1";
      throw new Error(`unexpected request ${method}`);
    });
    const {actions, estimateTransactionGas} = setupWriteContractHarness({
      initialAbi: ADD_TRANSACTION_ABI_WITH_FEES,
      isStudio: true,
      requestMock,
    });

    await expect(
      actions.writeContract({
        address: RECIPIENT_ADDRESS,
        functionName: "ping",
        validUntil: 123n,
        fees: {
          distribution: {
            leaderTimeunitsAllocation: 100n,
            validatorTimeunitsAllocation: 200n,
            maxPriceGenPerTimeUnit: 10n,
          },
        },
      }),
    ).rejects.toThrow("stop_after_encoding");

    expect(estimateTransactionGas.mock.calls[0][0].value).toBe(11_000n);
  });

  it("estimates fee distribution caps and fee value from FeeManager prices", async () => {
    const publicClient = {
      readContract: vi.fn().mockImplementation(async ({functionName}: {functionName: string}) => {
        if (functionName === "GENPerTimeUnit") return 10n;
        if (functionName === "storageUnitPrice") return 20n;
        if (functionName === "quoteGasPrice") return 30n;
        if (functionName === "messageFeeParamsBudgetFloor") return 1_234n;
        if (functionName === "calculateRoundFees") return 77n;
        throw new Error(`unexpected readContract ${functionName}`);
      }),
      getGasPrice: vi.fn().mockResolvedValue(1n),
    };
    const {actions} = setupWriteContractHarness({
      initialAbi: ADD_TRANSACTION_ABI_WITH_FEES,
      publicClient,
      feeManagerAddress: "0x00000000000000000000000000000000000000fe",
    });

    const fees = await actions.estimateTransactionFees({totalMessageFees: 5n});

    // Effective floor = max(on-chain view (1,234 — reads ~0-priced quoteGasPrice under
    // eth_call), local recompute at the effective receipt price). Local formula pins
    // FeeManager.estimateProposeReceiptGas(MIN_RECEIPT_BYTES=512):
    // 210,000 + 21,000 + 60,000 + 512*16 + 7*1,000 = 306,192 gas.
    const expectedLocalFloor = 30n * (210_000n + 21_000n + 60_000n + 512n * 16n + 7n * 1_000n);
    expect(expectedLocalFloor).toBe(30n * 306_192n);
    expect(fees.policy).toEqual({
      enabled: true,
      genPerTimeUnit: 10n,
      storageUnitPrice: 20n,
      receiptGasPrice: 30n,
      executionBudgetFloor: expectedLocalFloor,
    });
    expect(fees.distribution.maxPriceGenPerTimeUnit).toBe(12n);
    expect(fees.distribution.storageFeeMaxGasPrice).toBe(24n);
    expect(fees.distribution.receiptFeeMaxGasPrice).toBe(36n);
    expect(fees.distribution.executionBudgetPerRound).toBe(3_000_300_000n);
    expect(fees.feeValue).toBe(82n);
  });

  it("uses the network gas price when FeeManager quotes a lower receipt gas price", async () => {
    const publicClient = {
      readContract: vi.fn().mockImplementation(async ({functionName}: {functionName: string}) => {
        if (functionName === "GENPerTimeUnit") return 10n;
        if (functionName === "storageUnitPrice") return 20n;
        if (functionName === "quoteGasPrice") return 0n;
        if (functionName === "messageFeeParamsBudgetFloor") return 1_234n;
        if (functionName === "calculateRoundFees") return 77n;
        throw new Error(`unexpected readContract ${functionName}`);
      }),
      getGasPrice: vi.fn().mockResolvedValue(25n),
    };
    const {actions} = setupWriteContractHarness({
      initialAbi: ADD_TRANSACTION_ABI_WITH_FEES,
      publicClient,
      feeManagerAddress: "0x00000000000000000000000000000000000000fe",
    });

    const fees = await actions.estimateTransactionFees({priceCapHeadroomBps: 10_000n});

    expect(publicClient.getGasPrice).toHaveBeenCalledOnce();
    expect(fees.policy.receiptGasPrice).toBe(25n);
    expect(fees.distribution.receiptFeeMaxGasPrice).toBe(25n);
  });

  it("throws instead of building a zero receipt gas price cap when policy is enabled", async () => {
    const publicClient = {
      readContract: vi.fn().mockImplementation(async ({functionName}: {functionName: string}) => {
        if (functionName === "GENPerTimeUnit") return 10n;
        if (functionName === "storageUnitPrice") return 0n;
        if (functionName === "quoteGasPrice") return 0n;
        if (functionName === "messageFeeParamsBudgetFloor") return 1_234n;
        throw new Error(`unexpected readContract ${functionName}`);
      }),
      getGasPrice: vi.fn().mockResolvedValue(0n),
    };
    const {actions} = setupWriteContractHarness({
      initialAbi: ADD_TRANSACTION_ABI_WITH_FEES,
      publicClient,
      feeManagerAddress: "0x00000000000000000000000000000000000000fe",
    });

    await expect(actions.estimateTransactionFees()).rejects.toThrow(
      "receipt gas price quoted as zero; refusing to build a zero price cap",
    );
  });

  it("does not fetch network gas price when FeeManager policy is disabled", async () => {
    const publicClient = {
      readContract: vi.fn().mockImplementation(async ({functionName}: {functionName: string}) => {
        if (functionName === "GENPerTimeUnit") return 0n;
        if (functionName === "storageUnitPrice") return 0n;
        if (functionName === "quoteGasPrice") return 0n;
        if (functionName === "messageFeeParamsBudgetFloor") return 0n;
        if (functionName === "calculateRoundFees") return 0n;
        throw new Error(`unexpected readContract ${functionName}`);
      }),
      getGasPrice: vi.fn().mockResolvedValue(0n),
    };
    const {actions} = setupWriteContractHarness({
      initialAbi: ADD_TRANSACTION_ABI_WITH_FEES,
      publicClient,
      feeManagerAddress: "0x00000000000000000000000000000000000000fe",
    });

    const fees = await actions.estimateTransactionFees();

    expect(publicClient.getGasPrice).not.toHaveBeenCalled();
    expect(fees.policy.enabled).toBe(false);
    expect(fees.distribution.receiptFeeMaxGasPrice).toBe(0n);
  });

  it("defaults total message fees from root and external message allocation budgets", async () => {
    const publicClient = {
      readContract: vi.fn().mockImplementation(async ({functionName}: {functionName: string}) => {
        if (functionName === "GENPerTimeUnit") return 10n;
        if (functionName === "storageUnitPrice") return 20n;
        if (functionName === "quoteGasPrice") return 30n;
        if (functionName === "messageFeeParamsBudgetFloor") return 1_234n;
        if (functionName === "calculateRoundFees") return 77n;
        throw new Error(`unexpected readContract ${functionName}`);
      }),
      getGasPrice: vi.fn().mockResolvedValue(1n),
    };
    const {actions} = setupWriteContractHarness({
      initialAbi: ADD_TRANSACTION_ABI_WITH_FEES,
      publicClient,
      feeManagerAddress: "0x00000000000000000000000000000000000000fe",
    });

    const fees = await actions.estimateTransactionFees({
      messageAllocations: [
        {
          messageType: MessageType.Internal,
          recipient: RECIPIENT_ADDRESS,
          budget: 50n,
          feeParams: "0x1234",
        },
        {
          messageType: MessageType.Internal,
          parentIndex: 0n,
          recipient: RECIPIENT_ADDRESS,
          budget: 10n,
          feeParams: "0x1234",
        },
        {
          messageType: MessageType.External,
          recipient: RECIPIENT_ADDRESS,
          budget: 30n,
          feeParams: "0x1234",
        },
      ],
    });

    expect(fees.distribution.totalMessageFees).toBe(80n);
    expect(fees.feeValue).toBe(157n);
  });

  it("estimates Studio fee value from sim_getFeeConfig when no FeeManager contract exists", async () => {
    const requestMock = vi.fn().mockImplementation(async ({method}: {method: string}) => {
      if (method === "sim_getFeeConfig") {
        return {
          enabled: true,
          policy: {
            genPerTimeUnit: "10",
            storageUnitPrice: "20",
            receiptGasPrice: "30",
          },
        };
      }
      if (method === "eth_gasPrice") return "0x1";
      throw new Error(`unexpected request ${method}`);
    });
    const {actions} = setupWriteContractHarness({
      initialAbi: ADD_TRANSACTION_ABI_WITH_FEES,
      isStudio: true,
      requestMock,
    });

    const fees = await actions.estimateTransactionFees({priceCapHeadroomBps: 10_000n});

    expect(fees.distribution.maxPriceGenPerTimeUnit).toBe(10n);
    expect(fees.distribution.storageFeeMaxGasPrice).toBe(20n);
    expect(fees.distribution.receiptFeeMaxGasPrice).toBe(30n);
    expect(fees.distribution.executionBudgetPerRound).toBe(3_000_000_000n);
    expect(fees.feeValue).toBe(3_000_011_000n);
  });

  it("prefers Studio's exposed message fee budget floor over local fallback math", async () => {
    const requestMock = vi.fn().mockImplementation(async ({method}: {method: string}) => {
      if (method === "sim_getFeeConfig") {
        return {
          enabled: true,
          policy: {
            genPerTimeUnit: "10",
            storageUnitPrice: "20",
            receiptGasPrice: "30",
            fixedProposeReceiptGas: "1",
            messageFeeParamsBudgetFloor: "700000",
          },
        };
      }
      if (method === "eth_gasPrice") return "0x1";
      throw new Error(`unexpected request ${method}`);
    });
    const {actions} = setupWriteContractHarness({
      initialAbi: ADD_TRANSACTION_ABI_WITH_FEES,
      isStudio: true,
      requestMock,
    });

    const fees = await actions.estimateTransactionFees({priceCapHeadroomBps: 10_000n});

    expect(fees.policy.executionBudgetFloor).toBe(700_000n);
    expect(fees.distribution.executionBudgetPerRound).toBe(3_000_000_000n);
    expect(fees.feeValue).toBe(3_000_011_000n);
  });

  it("builds a Studio trusted fee preset from a simulation fee report", async () => {
    const requestMock = vi.fn().mockImplementation(async ({method}: {method: string}) => {
      if (method === "sim_getFeeConfig") {
        return {
          enabled: true,
          policy: {
            genPerTimeUnit: "10",
            storageUnitPrice: "20",
            receiptGasPrice: "30",
            messageFeeParamsBudgetFloor: "400000",
          },
        };
      }
      if (method === "eth_gasPrice") return "0x1";
      throw new Error(`unexpected request ${method}`);
    });
    const {actions} = setupWriteContractHarness({
      initialAbi: ADD_TRANSACTION_ABI_WITH_FEES,
      isStudio: true,
      requestMock,
    });

    const fees = await actions.estimateTransactionFeesFromSimulation({
      simulation: {
        feeAccounting: {
          execution_fee_consumed: "100",
          genvm_message_fee_consumed: "5",
          message_fee_budget: "10",
          message_fee_consumed: "5",
          message_fee_refunded: "0",
          external_message_fee_reserved: "0",
          external_message_fee_reimbursed: "0",
          external_message_fee_remainder: "0",
          execution_fee_report: {
            receiptGasPrice: "30",
            proposalReceipt: {
              eqBlocksOutputsLength: "10",
              receiptBytes: "1034",
              estimatedGas: "314544",
              fee: "314544",
            },
            messageReveal: {
              messageBytes: "320",
              messageCount: "1",
              estimatedGas: "187120",
              fee: "187120",
              consensusAdditionalGas: "87120",
              consensusAdditionalFee: "87120",
              studioFixedOverheadGas: "100000",
              studioFixedOverheadFee: "100000",
              messages: [
                {
                  messageFeeMode: "mode1",
                  messageType: "Internal",
                  recipient: RECIPIENT_ADDRESS,
                  value: "0",
                  dataBytes: "2",
                  onAcceptance: true,
                  saltNonce: "0",
                  feeParams: "0x1234",
                  feeParamsDecoded: null,
                  feeParamsBytes: "2",
                  declaredBudget: "5",
                  allocationSubtree: "0x",
                  allocationSubtreeBytes: "0",
                  callKey: `0x${"12".repeat(32)}`,
                },
              ],
            },
            chargeableExecution: {
              receiptAndNondetOutput: "501664",
              storage: "0",
              message: "0",
              totalExecution: "501664",
              totalWithMessage: "501664",
              executionBudgetPerRound: "600000",
              executionBudgetRemaining: "98336",
              executionBudgetOverrun: "0",
              executionBudgetExceeded: false,
            },
            genvmBuckets: {
              receiptAndNondetOutput: "100",
              storage: "0",
              message: "5",
              totalExecution: "100",
              totalWithMessage: "105",
              executionBudgetPerRound: "600000",
              executionBudgetRemaining: "599900",
              executionBudgetOverrun: "0",
              executionBudgetExceeded: false,
              buckets: [
                {index: "0", name: "receiptAndNondetOutput", consumed: "100"},
                {index: "1", name: "storage", consumed: "0"},
                {index: "2", name: "message", consumed: "5"},
              ],
            },
            executionMetering: {
              chargeableExecutionFee: "501664",
              genvmReportedExecution: "100",
              genvmDeltaFromChargeable: "-501564",
            },
            messageFees: {
              budget: "10",
              declaredConsumed: "5",
              genvmMeteredConsumed: "5",
              declaredRefunded: "0",
              remaining: "5",
              meteringDelta: "0",
              reportedTotal: "5",
            },
            totalEstimatedFee: "501664",
            totalStudioMeteredFee: "688784",
          },
        },
      },
      priceCapHeadroomBps: 10_000n,
    });

    const observedExecutionBudget = 100n + 501_664n;
    const observedExecutionBudgetWithHeadroom = (observedExecutionBudget * 12_000n + 9_999n) / 10_000n;
    const expectedExecutionBudgetPerRound = observedExecutionBudgetWithHeadroom > 400_000n
      ? observedExecutionBudgetWithHeadroom
      : 400_000n;
    expect(expectedExecutionBudgetPerRound).toBe(602_117n);

    expect(fees.observed).toEqual({
      executionFeeConsumed: 100n,
      executionFeeReportTotal: 501_664n,
      recommendedExecutionBudgetPerRound: expectedExecutionBudgetPerRound,
      genvmMessageFeeConsumed: 5n,
      messageFeeBudget: 10n,
      messageFeeConsumed: 5n,
      messageFeeRefunded: 0n,
      internalDeclaredBudget: 5n,
      externalMessageReserved: 0n,
      externalMessageReimbursed: 0n,
      externalMessageRemainder: 0n,
      recommendedTotalMessageFees: 6n,
    });
    expect(fees.distribution.executionBudgetPerRound).toBe(expectedExecutionBudgetPerRound);
    expect(fees.distribution.totalMessageFees).toBe(6n);
    expect(fees.feeValue).toBe(613_123n);
  });

  it("uses the execution budget floor for simulation recommendations when observed usage is lower", async () => {
    const requestMock = vi.fn().mockImplementation(async ({method}: {method: string}) => {
      if (method === "sim_getFeeConfig") {
        return {
          enabled: true,
          policy: {
            genPerTimeUnit: "10",
            storageUnitPrice: "20",
            receiptGasPrice: "30",
            messageFeeParamsBudgetFloor: "400000",
          },
        };
      }
      throw new Error(`unexpected request ${method}`);
    });
    const {actions} = setupWriteContractHarness({
      initialAbi: ADD_TRANSACTION_ABI_WITH_FEES,
      isStudio: true,
      requestMock,
    });

    const fees = await actions.estimateTransactionFeesFromSimulation({
      simulation: {
        feeAccounting: {
          execution_fee_consumed: "100",
          execution_fee_report: {
            totalEstimatedFee: "100",
          },
        },
      },
    });

    const observedExecutionBudgetWithHeadroom = ((100n + 100n) * 12_000n + 9_999n) / 10_000n;
    expect(observedExecutionBudgetWithHeadroom).toBe(240n);
    expect(fees.observed?.recommendedExecutionBudgetPerRound).toBe(400_000n);
    expect(fees.distribution.executionBudgetPerRound).toBe(400_000n);
  });

  it("builds a Studio trusted fee preset for a target write in one call", async () => {
    const feeParams = encodeInternalMessageFeeParams({
      leaderTimeunitsAllocation: 5n,
      validatorTimeunitsAllocation: 10n,
    });
    const requestMock = vi.fn().mockImplementation(async ({method}: {method: string}) => {
      if (method === "sim_getFeeConfig") {
        return {
          enabled: true,
          policy: {
            genPerTimeUnit: "10",
            storageUnitPrice: "20",
            receiptGasPrice: "30",
            messageFeeParamsBudgetFloor: "400000",
          },
        };
      }
      if (method === "sim_estimateTransactionFees") {
        return {
          feeAccounting: {
            execution_fee_consumed: "100",
            message_fee_consumed: "50",
            message_fee_budget: "110",
            message_allocations: [
              {
                messageType: MessageType.Internal,
                onAcceptance: true,
                parentIndex: ((1n << 256n) - 1n).toString(),
                recipient: RECIPIENT_ADDRESS,
                callKey: `0x${"00".repeat(32)}`,
                budget: "110",
                feeParams,
              },
            ],
            execution_fee_report: {
              totalEstimatedFee: "501664",
            },
          },
          feeReport: {
            totalEstimatedFee: "501664",
          },
          recommendedPreset: {
            distribution: {
              leaderTimeunitsAllocation: "100",
              validatorTimeunitsAllocation: "200",
              appealRounds: "0",
              executionBudgetPerRound: "3000000000",
              executionConsumed: "0",
              totalMessageFees: "110",
              rotations: ["0"],
              maxPriceGenPerTimeUnit: "10",
              storageFeeMaxGasPrice: "20",
              receiptFeeMaxGasPrice: "30",
            },
            messageAllocations: [
              {
                messageType: MessageType.Internal,
                onAcceptance: true,
                parentIndex: ((1n << 256n) - 1n).toString(),
                recipient: RECIPIENT_ADDRESS,
                callKey: `0x${"00".repeat(32)}`,
                budget: "110",
                feeParams,
              },
            ],
            feeValue: "3000011110",
          },
        };
      }
      throw new Error(`unexpected request ${method}`);
    });
    const {actions} = setupWriteContractHarness({
      initialAbi: ADD_TRANSACTION_ABI_WITH_FEES,
      isStudio: true,
      requestMock,
    });

    const fees = await actions.estimateTransactionFeesForWrite({
      address: RECIPIENT_ADDRESS,
      functionName: "update_storage",
      args: ["after"],
      value: 7n,
      priceCapHeadroomBps: 10_000n,
      messageAllocations: [
        {
          messageType: MessageType.Internal,
          recipient: RECIPIENT_ADDRESS,
          budget: 110n,
          feeParams,
        },
      ],
    });

    const simCall = requestMock.mock.calls.find(([call]) => call.method === "sim_estimateTransactionFees")?.[0];
    expect(simCall).toBeDefined();
    expect(simCall.params[0].value).toBe("0x7");
    expect(simCall.params[0].fees.feeValue).toBe("3000311110");
    expect(simCall.params[0].fees.distribution.totalMessageFees).toBe("110");
    expect(simCall.params[0].fees.messageAllocations[0].budget).toBe("110");
    expect(fees.observed?.recommendedExecutionBudgetPerRound).toBe(602_117n);
    expect(fees.observed?.messageFeeBudget).toBe(110n);
    expect(fees.observed?.messageFeeConsumed).toBe(50n);
    expect(fees.distribution.executionBudgetPerRound).toBe(3_000_000_000n);
    expect(fees.distribution.totalMessageFees).toBe(110n);
    expect(fees.messageAllocations?.[0].budget).toBe(110n);
    expect(fees.feeValue).toBe(3_000_011_110n);
  });

  it("preserves mode-2 message allocations from simulation fee accounting", async () => {
    const feeParams = encodeInternalMessageFeeParams({
      leaderTimeunitsAllocation: 5n,
      validatorTimeunitsAllocation: 10n,
    });
    const requestMock = vi.fn().mockImplementation(async ({method}: {method: string}) => {
      if (method === "sim_getFeeConfig") {
        return {
          enabled: true,
          policy: {
            genPerTimeUnit: "10",
            storageUnitPrice: "20",
            receiptGasPrice: "30",
            messageFeeParamsBudgetFloor: "400000",
          },
        };
      }
      if (method === "eth_gasPrice") return "0x1";
      throw new Error(`unexpected request ${method}`);
    });
    const {actions} = setupWriteContractHarness({
      initialAbi: ADD_TRANSACTION_ABI_WITH_FEES,
      isStudio: true,
      requestMock,
    });

    const fees = await actions.estimateTransactionFeesFromSimulation({
      simulation: {
        feeAccounting: {
          message_fee_consumed: "20",
          message_allocations: [
            {
              messageType: MessageType.Internal,
              onAcceptance: false,
              parentIndex: ((1n << 256n) - 1n).toString(),
              recipient: RECIPIENT_ADDRESS,
              callKey: `0x${"00".repeat(32)}`,
              budget: "50",
              feeParams,
            },
          ],
        },
      },
      priceCapHeadroomBps: 10_000n,
    });

    expect(fees.messageAllocations).toHaveLength(1);
    expect(fees.messageAllocations?.[0].budget).toBe(50n);
    expect(fees.messageAllocations?.[0].feeParams).toBe(feeParams);
    expect(fees.distribution.totalMessageFees).toBe(50n);
    expect(fees.feeValue).toBe(3_000_311_050n);
  });

  it("keeps Studio fee estimation gasless when sim_getFeeConfig is disabled", async () => {
    const requestMock = vi.fn().mockImplementation(async ({method}: {method: string}) => {
      if (method === "sim_getFeeConfig") {
        return {
          enabled: false,
          policy: {
            genPerTimeUnit: "0",
            storageUnitPrice: "0",
            receiptGasPrice: "0",
          },
        };
      }
      if (method === "eth_gasPrice") return "0x1";
      throw new Error(`unexpected request ${method}`);
    });
    const {actions} = setupWriteContractHarness({
      initialAbi: ADD_TRANSACTION_ABI_WITH_FEES,
      isStudio: true,
      requestMock,
    });

    const fees = await actions.estimateTransactionFees();

    expect(fees.policy.enabled).toBe(false);
    expect(fees.distribution.leaderTimeunitsAllocation).toBe(0n);
    expect(fees.distribution.validatorTimeunitsAllocation).toBe(0n);
    expect(fees.distribution.executionBudgetPerRound).toBe(0n);
    expect(fees.distribution.maxPriceGenPerTimeUnit).toBe(0n);
    expect(fees.distribution.storageFeeMaxGasPrice).toBe(0n);
    expect(fees.distribution.receiptFeeMaxGasPrice).toBe(0n);
    expect(fees.feeValue).toBe(0n);
  });

  it("does not retry an obsolete selector when the exact train call fails", async () => {
    const signTransaction = vi
      .fn()
      .mockRejectedValueOnce(new Error("Invalid pointer in tuple at location 128 in payload"));
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
    ).rejects.toThrow("Invalid pointer in tuple");

    expect(signTransaction).toHaveBeenCalledTimes(1);
    const firstEncodedData = signTransaction.mock.calls[0][0].data as `0x${string}`;
    expect(firstEncodedData.slice(0, 10)).toBe(selectorForFees);
    expect(estimateTransactionGas).toHaveBeenCalledTimes(1);
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
      gas: "0xa410",
      nonce: "0x0",
      type: "0x0",
      chainId: "0xeec7",
      gasPrice: "0x1",
    });
  });

  it("does not retry an obsolete selector for injected-wallet errors", async () => {
    const sentPayloads: `0x${string}`[] = [];
    const request = vi.fn().mockImplementation(async ({method, params}: {method: string; params?: any[]}) => {
      if (method === "eth_gasPrice") {
        return "0x1";
      }

      if (method === "eth_sendTransaction") {
        const payload = params?.[0];
        sentPayloads.push(payload?.data);

        throw new Error("Internal JSON-RPC error: invalid tuple pointer");
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
    await expect(
      actions.writeContract({address: RECIPIENT_ADDRESS, functionName: "ping", value: 0n}),
    ).rejects.toThrow("invalid tuple pointer");

    expect(sentPayloads).toHaveLength(1);
    expect(sentPayloads[0].slice(0, 10)).toBe(selectorForFees);
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

  it("decodes BudgetTooLow selector from gas estimation failures", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const signTransaction = vi.fn().mockResolvedValue("0xsigned");
    const {actions, estimateTransactionGas, client} = setupWriteContractHarness({
      initialAbi: ADD_TRANSACTION_ABI_WITH_FEES,
      signTransactionMock: signTransaction,
      publicClient: makeMockPublicClient({status: "reverted", logs: []}),
    });
    estimateTransactionGas.mockRejectedValueOnce(new Error("execution reverted: 0x305e533c"));
    (client as any).sendRawTransaction = vi.fn().mockResolvedValue(MOCK_EVM_TX_HASH);

    await expect(
      actions.writeContract({address: RECIPIENT_ADDRESS, functionName: "ping", value: 0n}),
    ).rejects.toThrow(/BudgetTooLow/);

    consoleError.mockRestore();
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

const FINALIZE_TX_ABI = [
  {
    type: "function" as const,
    name: "finalizeTransaction",
    stateMutability: "nonpayable" as const,
    inputs: [
      {name: "_txId", type: "bytes32"},
      {name: "_expectedDecisionId", type: "uint256"},
    ],
    outputs: [],
  },
  {
    type: "function" as const,
    name: "resolveTransactions",
    stateMutability: "nonpayable" as const,
    inputs: [{
      name: "_commands",
      type: "tuple[]",
      components: [
        {name: "txId", type: "bytes32"},
        {name: "expectedAttemptId", type: "bytes32"},
      ],
    }],
    outputs: [],
  },
  {
    type: "function" as const,
    name: "finalizeDecisions",
    stateMutability: "nonpayable" as const,
    inputs: [{
      name: "_commands",
      type: "tuple[]",
      components: [
        {name: "txId", type: "bytes32"},
        {name: "expectedDecisionId", type: "uint256"},
      ],
    }],
    outputs: [],
  },
];

const FEE_MANAGEMENT_ABI = [
  {
    type: "function" as const,
    name: "topUpFees",
    stateMutability: "payable" as const,
    inputs: [
      {name: "_txId", type: "bytes32"},
      {name: "_feesDistribution", type: "tuple", components: FEES_DISTRIBUTION_COMPONENTS},
    ],
    outputs: [],
  },
  {
    type: "function" as const,
    name: "topUpAndSubmitAppeal",
    stateMutability: "payable" as const,
    inputs: [
      {name: "_txId", type: "bytes32"},
      {name: "_expectedDecisionId", type: "uint256"},
      {name: "_feesDistribution", type: "tuple", components: FEES_DISTRIBUTION_COMPONENTS},
    ],
    outputs: [],
  },
] as const;

const APPEAL_TRAIN_ABI = [
  {
    type: "function" as const,
    name: "submitAppeal",
    stateMutability: "payable" as const,
    inputs: [
      {name: "_txId", type: "bytes32"},
      {name: "_expectedDecisionId", type: "uint256"},
    ],
    outputs: [],
  },
] as const;

const finalizeTransactionSelector = encodeFunctionData({
  abi: FINALIZE_TX_ABI as any,
  functionName: "finalizeTransaction",
  args: [MOCK_GENLAYER_TX_ID, MOCK_DECISION_ID],
}).slice(0, 10);

const resolveTransactionsSelector = encodeFunctionData({
  abi: FINALIZE_TX_ABI as any,
  functionName: "resolveTransactions",
  args: [[{txId: MOCK_GENLAYER_TX_ID, expectedAttemptId: MOCK_ATTEMPT_ID}]],
}).slice(0, 10);

const finalizeDecisionsSelector = encodeFunctionData({
  abi: FINALIZE_TX_ABI as any,
  functionName: "finalizeDecisions",
  args: [[{txId: MOCK_GENLAYER_TX_ID, expectedDecisionId: MOCK_DECISION_ID}]],
}).slice(0, 10);

const topUpFeesSelector = encodeFunctionData({
  abi: FEE_MANAGEMENT_ABI as any,
  functionName: "topUpFees",
  args: [
    MOCK_GENLAYER_TX_ID,
    {
      leaderTimeunitsAllocation: 0n,
      validatorTimeunitsAllocation: 0n,
      appealRounds: 0n,
      executionBudgetPerRound: 0n,
      executionConsumed: 0n,
      totalMessageFees: 0n,
      rotations: [0n],
      maxPriceGenPerTimeUnit: 0n,
      storageFeeMaxGasPrice: 0n,
      receiptFeeMaxGasPrice: 0n,
    },
  ],
}).slice(0, 10);

const topUpAndSubmitAppealSelector = encodeFunctionData({
  abi: FEE_MANAGEMENT_ABI as any,
  functionName: "topUpAndSubmitAppeal",
  args: [
    MOCK_GENLAYER_TX_ID,
    MOCK_DECISION_ID,
    {
      leaderTimeunitsAllocation: 0n,
      validatorTimeunitsAllocation: 0n,
      appealRounds: 0n,
      executionBudgetPerRound: 0n,
      executionConsumed: 0n,
      totalMessageFees: 0n,
      rotations: [0n],
      maxPriceGenPerTimeUnit: 0n,
      storageFeeMaxGasPrice: 0n,
      receiptFeeMaxGasPrice: 0n,
    },
  ],
}).slice(0, 10);

const trainLifecycle = ({action = 6, decisionActive = true}: {action?: number; decisionActive?: boolean} = {}) => ({
  storedStatus: 5,
  resolution: {
    projectedStatus: 5,
    action,
    attemptId: MOCK_ATTEMPT_ID,
  },
  latestDecision: {
    exists: decisionActive,
    decisionId: decisionActive ? MOCK_DECISION_ID : 0n,
  },
  decisionActive,
});

const setupFinalizeHarness = ({receiptStatus = "success"}: {receiptStatus?: string} = {}) => {
  const signTransaction = vi.fn().mockResolvedValue("0xsigned");
  const sendRawTransaction = vi.fn().mockResolvedValue(MOCK_EVM_TX_HASH);
  const waitForTransactionReceipt = vi.fn().mockResolvedValue({status: receiptStatus, logs: []});
  const estimateTransactionGas = vi.fn().mockResolvedValue(21_000n);

  const client = {
    chain: {
      id: 61_127,
      consensusMainContract: {
        address: MAIN_CONTRACT_ADDRESS,
        abi: FINALIZE_TX_ABI,
        bytecode: "0x",
      },
      consensusDataContract: {
        address: CONSENSUS_DATA_ADDRESS,
        abi: [],
        bytecode: "0x",
      },
    },
    account: {
      address: SENDER_ADDRESS,
      type: "local",
      signTransaction,
    },
    getCurrentNonce: vi.fn().mockResolvedValue(0n),
    estimateTransactionGas,
    sendRawTransaction,
    request: vi.fn().mockImplementation(async ({method}: {method: string}) => {
      if (method === "eth_gasPrice") return "0x1";
      throw new Error(`Unexpected RPC method: ${method}`);
    }),
  };

  const readContract = vi.fn().mockImplementation(async ({functionName}: {functionName: string}) => {
    if (functionName === "getTransactionLifecycle") return trainLifecycle();
    throw new Error(`Unexpected contract read: ${functionName}`);
  });
  const publicClient = {
    waitForTransactionReceipt,
    getBlock: vi.fn().mockResolvedValue({number: 123n, timestamp: 456n}),
    readContract,
  };
  const actions = contractActions(client as any, publicClient as any);

  return {actions, signTransaction, sendRawTransaction, waitForTransactionReceipt, estimateTransactionGas, client, publicClient};
};

const setupFeeManagementHarness = ({
  receiptStatus = "success",
  isStudio = false,
  decisionActive = true,
}: {
  receiptStatus?: string;
  isStudio?: boolean;
  decisionActive?: boolean;
} = {}) => {
  const signTransaction = vi.fn().mockResolvedValue("0xsigned");
  const sendRawTransaction = vi.fn().mockResolvedValue(MOCK_EVM_TX_HASH);
  const waitForTransactionReceipt = vi.fn().mockResolvedValue({status: receiptStatus, logs: []});
  const estimateTransactionGas = vi.fn().mockResolvedValue(21_000n);

  const client = {
    chain: {
      id: 61_127,
      isStudio,
      consensusMainContract: {
        address: MAIN_CONTRACT_ADDRESS,
        abi: FEE_MANAGEMENT_ABI,
        bytecode: "0x",
      },
      consensusDataContract: {
        address: CONSENSUS_DATA_ADDRESS,
        abi: [],
        bytecode: "0x",
      },
      appealsContract: {
        address: RECIPIENT_ADDRESS,
        abi: [],
        bytecode: "0x",
      },
      feeManagerContract: {
        address: ADDRESS_MANAGER_ADDRESS,
        abi: [],
        bytecode: "0x",
      },
    },
    account: {
      address: SENDER_ADDRESS,
      type: "local",
      signTransaction,
    },
    getCurrentNonce: vi.fn().mockResolvedValue(0n),
    estimateTransactionGas,
    sendRawTransaction,
    request: vi.fn().mockImplementation(async ({method}: {method: string}) => {
      if (method === "eth_gasPrice") return "0x1";
      throw new Error(`Unexpected RPC method: ${method}`);
    }),
  };

  const readContract = vi.fn().mockImplementation(async ({functionName}: {functionName: string}) => {
    if (functionName === "getTransactionLifecycle") return trainLifecycle({decisionActive});
    if (functionName === "estimateLatestAppealCharge") {
      return [MOCK_DECISION_ID, 1000n, 234n, 999n];
    }
    if (functionName === "canAppeal") return true;
    throw new Error(`Unexpected contract read: ${functionName}`);
  });
  const publicClient = {
    waitForTransactionReceipt,
    getBlock: vi.fn().mockResolvedValue({number: 123n, timestamp: 456n}),
    readContract,
  };
  const actions = contractActions(client as any, publicClient as any);

  return {actions, signTransaction, sendRawTransaction, waitForTransactionReceipt, estimateTransactionGas, client, publicClient};
};

describe("contractActions getContractCode", () => {
  const SOURCE = '# v0.1.0\n# { "Depends": "py-genlayer:test" }\n\nfrom genlayer import *\n';
  const SOURCE_B64 = Buffer.from(SOURCE, "utf-8").toString("base64");
  const CONTRACT = "0x000000000000000000000000000000000000dEaD";

  const buildClient = ({isStudio}: {isStudio: boolean}) => {
    const request = vi.fn().mockResolvedValue(SOURCE_B64);
    const client = {
      chain: {id: isStudio ? 61_127 : 4_221, name: isStudio ? "localnet" : "Bradbury", isStudio},
      request,
    };
    const actions = contractActions(client as any, {} as any);
    return {actions, request};
  };

  it("uses positional params on Studio chains", async () => {
    const {actions, request} = buildClient({isStudio: true});
    const code = await actions.getContractCode(CONTRACT);
    expect(code).toBe(SOURCE);
    expect(request).toHaveBeenCalledWith({
      method: "gen_getContractCode",
      params: [CONTRACT],
    });
  });

  it("uses object-shaped params on non-Studio chains", async () => {
    const {actions, request} = buildClient({isStudio: false});
    const code = await actions.getContractCode(CONTRACT);
    expect(code).toBe(SOURCE);
    expect(request).toHaveBeenCalledWith({
      method: "gen_getContractCode",
      params: [{address: CONTRACT}],
    });
  });
});

describe("contractActions getContractSchema", () => {
  const SOURCE = 'from genlayer import *\n';
  const SOURCE_B64 = Buffer.from(SOURCE, "utf-8").toString("base64");
  const CONTRACT = "0x000000000000000000000000000000000000dEaD";
  const SCHEMA = {ctor: {kwparams: {}, params: []}, methods: {}};

  it("calls gen_getContractSchema(address) directly on Studio", async () => {
    const request = vi.fn().mockResolvedValue(SCHEMA);
    const client = {chain: {id: 61_127, name: "localnet", isStudio: true}, request};
    const actions = contractActions(client as any, {} as any);

    const schema = await actions.getContractSchema(CONTRACT);

    expect(schema).toEqual(SCHEMA);
    expect(request).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledWith({
      method: "gen_getContractSchema",
      params: [CONTRACT],
    });
  });

  it("fetches code then calls gen_getContractSchema({code}) on non-Studio chains", async () => {
    const request = vi.fn().mockImplementation(async ({method}: {method: string}) => {
      if (method === "gen_getContractCode") return SOURCE_B64;
      if (method === "gen_getContractSchema") return SCHEMA;
      throw new Error(`Unexpected RPC method: ${method}`);
    });
    const client = {chain: {id: 4_221, name: "Bradbury", isStudio: false}, request};
    const actions = contractActions(client as any, {} as any);

    const schema = await actions.getContractSchema(CONTRACT);

    expect(schema).toEqual(SCHEMA);
    expect(request).toHaveBeenCalledTimes(2);
    expect(request).toHaveBeenNthCalledWith(1, {
      method: "gen_getContractCode",
      params: [{address: CONTRACT}],
    });
    expect(request).toHaveBeenNthCalledWith(2, {
      method: "gen_getContractSchema",
      params: [{code: SOURCE_B64}],
    });
  });
});

describe("contractActions getContractSchemaForCode", () => {
  const SOURCE = 'from genlayer import *\n';
  const SOURCE_B64 = Buffer.from(SOURCE, "utf-8").toString("base64");
  const SOURCE_HEX = toHex(SOURCE);
  const SCHEMA = {ctor: {kwparams: {}, params: []}, methods: {}};

  it("calls gen_getContractSchemaForCode with hex-encoded code on Studio", async () => {
    const request = vi.fn().mockResolvedValue(SCHEMA);
    const client = {chain: {id: 61_127, name: "localnet", isStudio: true}, request};
    const actions = contractActions(client as any, {} as any);

    const schema = await actions.getContractSchemaForCode(SOURCE);

    expect(schema).toEqual(SCHEMA);
    expect(request).toHaveBeenCalledWith({
      method: "gen_getContractSchemaForCode",
      params: [SOURCE_HEX],
    });
  });

  it("calls gen_getContractSchema({code}) with base64-encoded code on non-Studio chains", async () => {
    const request = vi.fn().mockResolvedValue(SCHEMA);
    const client = {chain: {id: 4_221, name: "Bradbury", isStudio: false}, request};
    const actions = contractActions(client as any, {} as any);

    const schema = await actions.getContractSchemaForCode(SOURCE);

    expect(schema).toEqual(SCHEMA);
    expect(request).toHaveBeenCalledWith({
      method: "gen_getContractSchema",
      params: [{code: SOURCE_B64}],
    });
  });

  it("accepts Uint8Array input and base64-encodes it on non-Studio chains", async () => {
    const request = vi.fn().mockResolvedValue(SCHEMA);
    const client = {chain: {id: 4_221, name: "Bradbury", isStudio: false}, request};
    const actions = contractActions(client as any, {} as any);

    const bytes = new TextEncoder().encode(SOURCE);
    await actions.getContractSchemaForCode(bytes);

    expect(request).toHaveBeenCalledWith({
      method: "gen_getContractSchema",
      params: [{code: SOURCE_B64}],
    });
  });
});

describe("contractActions bounded round reads", () => {
  const validators = Array.from(
    {length: 65},
    (_, index) => `0x${(index + 10).toString(16).padStart(40, "0")}`,
  );
  const voteHashes = validators.map((_, index) =>
    `0x${(index + 1).toString(16).padStart(64, "0")}`,
  );
  const resultHashes = validators.map((_, index) =>
    `0x${(index + 101).toString(16).padStart(64, "0")}`,
  );

  const setup = () => {
    const readContract = vi.fn().mockImplementation(async ({functionName, args}: any) => {
      if (functionName === "getRoundNumber") return 3n;
      if (functionName === "getLeaderIndex") return 2n;
      if (functionName === "getVotesCommitted") return 65n;
      if (functionName === "getVotesRevealed") return 64n;
      if (functionName === "getAppealBond") return 99n;
      if (functionName === "getRotationsLeft") return 4n;
      if (functionName === "getResult") return 1;
      if (functionName === "getValidatorVotes") return validators.map(() => 1);
      if (functionName === "getValidatorVotesHash") return voteHashes;
      if (functionName === "getValidatorResultHash") return resultHashes;
      if (functionName === "getRoundValidatorsPage") {
        const offset = Number(args[2]);
        const limit = Number(args[3]);
        return [validators.slice(offset, offset + limit), BigInt(validators.length)];
      }
      throw new Error(`Unexpected read ${functionName}`);
    });
    const publicClient = {
      getBlock: vi.fn().mockResolvedValue({number: 123n, timestamp: 456n}),
      readContract,
    };
    const client = {
      chain: {
        roundsStorageContract: {address: ADDRESS_MANAGER_ADDRESS, abi: []},
      },
    };
    return {actions: contractActions(client as any, publicClient as any), readContract};
  };

  it("reconstructs getRoundData through fixed-block pages and split arrays", async () => {
    const {actions, readContract} = setup();

    const roundData = await actions.getRoundData({txId: MOCK_GENLAYER_TX_ID, round: 3n});

    expect(roundData.roundValidators).toEqual(validators);
    expect(roundData.validatorVotes).toHaveLength(65);
    expect(roundData.validatorVotesHash).toEqual(voteHashes);
    expect(roundData.validatorResultHash).toEqual(resultHashes);
    expect(readContract.mock.calls.filter(([call]) => call.functionName === "getRoundValidatorsPage"))
      .toHaveLength(2);
    expect(readContract.mock.calls.every(([call]) => call.blockNumber === 123n)).toBe(true);
    expect(readContract.mock.calls.some(([call]) => call.functionName === "getRoundData")).toBe(false);
  });

  it("preserves the legacy getLastRoundData tuple shape without the aggregate getter", async () => {
    const {actions, readContract} = setup();

    const lastRound = await actions.getLastRoundData({txId: MOCK_GENLAYER_TX_ID});

    expect(lastRound[0]).toBe(3n);
    expect(lastRound[1].roundValidators).toEqual(validators);
    expect(lastRound.round).toBe(3n);
    expect(lastRound.roundData).toBe(lastRound[1]);
    expect(readContract.mock.calls.some(([call]) => call.functionName === "getLastRoundData"))
      .toBe(false);
  });
});

describe("contractActions fee management", () => {
  it("quotes the full authoritative appeal charge", async () => {
    const {actions, client} = setupFeeManagementHarness();
    delete (client.chain as any).feeManagerContract;

    await expect(actions.getAppealCharge({txId: MOCK_GENLAYER_TX_ID})).resolves.toBe(1234n);
    await expect(actions.getMinAppealBond({txId: MOCK_GENLAYER_TX_ID})).resolves.toBe(1234n);
  });

  it("encodes submitAppeal with the active decision id and quoted funding", async () => {
    const {actions, signTransaction} = setupFeeManagementHarness();

    await expect(actions.appealTransaction({txId: MOCK_GENLAYER_TX_ID})).resolves.toBe(
      MOCK_GENLAYER_TX_ID,
    );

    const txRequest = signTransaction.mock.calls[0][0];
    expect(txRequest.value).toBe(1234n);
    const decoded = decodeFunctionData({abi: APPEAL_TRAIN_ABI, data: txRequest.data});
    expect(decoded.args).toEqual([MOCK_GENLAYER_TX_ID, MOCK_DECISION_ID]);
  });

  it("returns false from canAppeal when no decision is active", async () => {
    const {actions, publicClient} = setupFeeManagementHarness({decisionActive: false});

    await expect(actions.canAppeal({txId: MOCK_GENLAYER_TX_ID})).resolves.toBe(false);
    expect(publicClient.readContract).not.toHaveBeenCalledWith(
      expect.objectContaining({functionName: "canAppeal"}),
    );
  });

  it("encodes topUpFees(bytes32, FeesDistribution) and returns the EVM tx hash", async () => {
    const {actions, signTransaction, sendRawTransaction} = setupFeeManagementHarness();

    const evmHash = await actions.topUpFees({
      txId: MOCK_GENLAYER_TX_ID,
      value: 999n,
      distribution: {
        leaderTimeunitsAllocation: 100n,
        validatorTimeunitsAllocation: 200n,
        appealRounds: 1n,
        executionBudgetPerRound: 500_000n,
        totalMessageFees: 30n,
        rotations: [0n, 2n],
        maxPriceGenPerTimeUnit: 12n,
        storageFeeMaxGasPrice: 24n,
        receiptFeeMaxGasPrice: 36n,
      },
    });

    expect(evmHash).toBe(MOCK_EVM_TX_HASH);
    expect(sendRawTransaction).toHaveBeenCalledWith({serializedTransaction: "0xsigned"});
    const txRequest = signTransaction.mock.calls[0][0];
    expect(txRequest.to).toBe(MAIN_CONTRACT_ADDRESS);
    expect(txRequest.value).toBe(999n);
    expect(txRequest.data.slice(0, 10)).toBe(topUpFeesSelector);

    const decoded = decodeFunctionData({
      abi: FEE_MANAGEMENT_ABI as any,
      data: txRequest.data,
    });
    const [txId, distribution] = decoded.args as any[];
    expect(txId).toBe(MOCK_GENLAYER_TX_ID);
    expect(distribution.leaderTimeunitsAllocation).toBe(100n);
    expect(distribution.validatorTimeunitsAllocation).toBe(200n);
    expect(distribution.appealRounds).toBe(1n);
    expect(distribution.executionBudgetPerRound).toBe(500_000n);
    expect(distribution.totalMessageFees).toBe(30n);
    expect(distribution.rotations).toEqual([0n, 2n]);
    expect(distribution.maxPriceGenPerTimeUnit).toBe(12n);
    expect(distribution.storageFeeMaxGasPrice).toBe(24n);
    expect(distribution.receiptFeeMaxGasPrice).toBe(36n);
  });

  it("encodes topUpAndSubmitAppeal with the active decision id", async () => {
    const {actions, signTransaction, sendRawTransaction} = setupFeeManagementHarness();

    const txId = await actions.topUpAndSubmitAppeal({
      txId: MOCK_GENLAYER_TX_ID,
      value: 1234n,
      distribution: {
        appealRounds: 1n,
        rotations: [0n, 1n],
      },
    });

    expect(txId).toBe(MOCK_GENLAYER_TX_ID);
    expect(sendRawTransaction).toHaveBeenCalledWith({serializedTransaction: "0xsigned"});
    const txRequest = signTransaction.mock.calls[0][0];
    expect(txRequest.to).toBe(MAIN_CONTRACT_ADDRESS);
    expect(txRequest.value).toBe(1234n);
    expect(txRequest.data.slice(0, 10)).toBe(topUpAndSubmitAppealSelector);

    const decoded = decodeFunctionData({
      abi: FEE_MANAGEMENT_ABI as any,
      data: txRequest.data,
    });
    const [decodedTxId, expectedDecisionId, distribution] = decoded.args as any[];
    expect(decodedTxId).toBe(MOCK_GENLAYER_TX_ID);
    expect(expectedDecisionId).toBe(MOCK_DECISION_ID);
    expect(distribution.appealRounds).toBe(1n);
    expect(distribution.rotations).toEqual([0n, 1n]);
  });

  it("throws when a fee management consensus call is reverted", async () => {
    const {actions} = setupFeeManagementHarness({receiptStatus: "reverted"});

    await expect(
      actions.topUpFees({
        txId: MOCK_GENLAYER_TX_ID,
        value: 1n,
        distribution: {},
      }),
    ).rejects.toThrow(/Top up fees reverted/);
  });

  it("returns the Studio RPC hash for fee management calls without waiting for an EVM receipt", async () => {
    const {actions, waitForTransactionReceipt} = setupFeeManagementHarness({isStudio: true});

    const hash = await actions.topUpFees({
      txId: MOCK_GENLAYER_TX_ID,
      value: 1n,
      distribution: {},
    });

    expect(hash).toBe(MOCK_EVM_TX_HASH);
    expect(waitForTransactionReceipt).not.toHaveBeenCalled();
  });

  it("returns the Studio RPC hash for external-wallet fee management calls without waiting for an EVM receipt", async () => {
    const request = vi.fn().mockImplementation(async ({method}: {method: string}) => {
      if (method === "eth_gasPrice") return "0x1";
      if (method === "eth_sendTransaction") return MOCK_EVM_TX_HASH;
      throw new Error(`Unexpected RPC method: ${method}`);
    });
    const waitForTransactionReceipt = vi.fn();
    const client = {
      chain: {
        id: 61_127,
        isStudio: true,
        consensusMainContract: {
          address: MAIN_CONTRACT_ADDRESS,
          abi: FEE_MANAGEMENT_ABI,
          bytecode: "0x",
        },
      },
      account: {
        address: SENDER_ADDRESS,
        type: "json-rpc",
      },
      getCurrentNonce: vi.fn().mockResolvedValue(0n),
      estimateTransactionGas: vi.fn().mockResolvedValue(21_000n),
      request,
    };
    const actions = contractActions(client as any, {waitForTransactionReceipt} as any);

    const hash = await actions.topUpFees({
      txId: MOCK_GENLAYER_TX_ID,
      value: 1n,
      distribution: {},
    });

    expect(hash).toBe(MOCK_EVM_TX_HASH);
    expect(request).toHaveBeenCalledWith(expect.objectContaining({
      method: "eth_sendTransaction",
    }));
    expect(waitForTransactionReceipt).not.toHaveBeenCalled();
  });
});

describe("contractActions finalizeTransaction", () => {
  it("encodes finalizeTransaction with the active decision id", async () => {
    const {actions, signTransaction, sendRawTransaction} = setupFinalizeHarness();

    const evmHash = await actions.finalizeTransaction({txId: MOCK_GENLAYER_TX_ID});

    expect(evmHash).toBe(MOCK_EVM_TX_HASH);
    expect(sendRawTransaction).toHaveBeenCalledWith({serializedTransaction: "0xsigned"});
    const txRequest = signTransaction.mock.calls[0][0];
    expect(txRequest.to).toBe(MAIN_CONTRACT_ADDRESS);
    expect(txRequest.data.slice(0, 10)).toBe(finalizeTransactionSelector);
    const decoded = decodeFunctionData({abi: FINALIZE_TX_ABI as any, data: txRequest.data});
    expect(decoded.args).toEqual([MOCK_GENLAYER_TX_ID, MOCK_DECISION_ID]);
    expect(txRequest.value).toBe(0n);
  });

  it("throws when receipt is reverted", async () => {
    const {actions} = setupFinalizeHarness({receiptStatus: "reverted"});
    await expect(
      actions.finalizeTransaction({txId: MOCK_GENLAYER_TX_ID}),
    ).rejects.toThrow(/Finalize reverted/);
  });
});

describe("contractActions finalizeIdlenessTxs", () => {
  it("fails with actionable train replacements and never broadcasts", async () => {
    const {actions, signTransaction} = setupFinalizeHarness();
    await expect(
      actions.finalizeIdlenessTxs({txIds: [MOCK_GENLAYER_TX_ID]}),
    ).rejects.toThrow(/resolveTransactions.*finalizeDecisions/);
    expect(signTransaction).not.toHaveBeenCalled();
  });
});

describe("contractActions train lifecycle batches", () => {
  it("encodes resolveTransactions with fixed-block attempt identities", async () => {
    const {actions, signTransaction} = setupFinalizeHarness();

    await actions.resolveTransactions({txIds: [MOCK_GENLAYER_TX_ID]});

    const txRequest = signTransaction.mock.calls[0][0];
    expect(txRequest.data.slice(0, 10)).toBe(resolveTransactionsSelector);
    const decoded = decodeFunctionData({abi: FINALIZE_TX_ABI as any, data: txRequest.data});
    expect(decoded.args?.[0]).toEqual([{
      txId: MOCK_GENLAYER_TX_ID,
      expectedAttemptId: MOCK_ATTEMPT_ID,
    }]);
  });

  it("encodes finalizeDecisions with fixed-block decision identities", async () => {
    const {actions, signTransaction} = setupFinalizeHarness();

    await actions.finalizeDecisions({txIds: [MOCK_GENLAYER_TX_ID]});

    const txRequest = signTransaction.mock.calls[0][0];
    expect(txRequest.data.slice(0, 10)).toBe(finalizeDecisionsSelector);
    const decoded = decodeFunctionData({abi: FINALIZE_TX_ABI as any, data: txRequest.data});
    expect(decoded.args?.[0]).toEqual([{
      txId: MOCK_GENLAYER_TX_ID,
      expectedDecisionId: MOCK_DECISION_ID,
    }]);
  });
});

/** Pre-train entrypoints as the studio-embedded consensus exposes them. */
const CONSENSUS_MAIN_STUDIO_ABI = [
  {
    type: "function" as const,
    name: "submitAppeal",
    stateMutability: "payable" as const,
    inputs: [{name: "_txId", type: "bytes32"}],
    outputs: [],
  },
  {
    type: "function" as const,
    name: "finalizeTransaction",
    stateMutability: "nonpayable" as const,
    inputs: [{name: "_txId", type: "bytes32"}],
    outputs: [],
  },
] as const;

const FEE_MANAGEMENT_STUDIO_ABI = [
  {
    type: "function" as const,
    name: "topUpAndSubmitAppeal",
    stateMutability: "payable" as const,
    inputs: [
      {name: "_txId", type: "bytes32"},
      {name: "_feesDistribution", type: "tuple", components: FEES_DISTRIBUTION_COMPONENTS},
    ],
    outputs: [],
  },
] as const;

/**
 * Mirrors the localnet/studionet chain config: ConsensusMain and ConsensusData
 * resolve, but the fee manager, rounds storage, and appeals contracts carry no
 * address, and ConsensusData answers no train lifecycle read.
 */
const setupStudioLifecycleHarness = () => {
  const signTransaction = vi.fn().mockResolvedValue("0xsigned");
  const sendRawTransaction = vi.fn().mockResolvedValue(MOCK_EVM_TX_HASH);
  const waitForTransactionReceipt = vi.fn().mockResolvedValue({status: "success", logs: []});

  const client = {
    chain: {
      id: 61_999,
      isStudio: true,
      consensusMainContract: {
        address: MAIN_CONTRACT_ADDRESS,
        abi: CONSENSUS_MAIN_STUDIO_ABI,
        bytecode: "0x",
      },
      consensusDataContract: {
        address: CONSENSUS_DATA_ADDRESS,
        abi: [],
        bytecode: "0x",
      },
      appealsContract: {address: undefined, abi: [], bytecode: "0x"},
      feeManagerContract: {address: undefined, abi: [], bytecode: "0x"},
      roundsStorageContract: {address: undefined, abi: [], bytecode: "0x"},
    },
    account: {
      address: SENDER_ADDRESS,
      type: "local",
      signTransaction,
    },
    getCurrentNonce: vi.fn().mockResolvedValue(0n),
    estimateTransactionGas: vi.fn().mockResolvedValue(21_000n),
    sendRawTransaction,
    request: vi.fn().mockImplementation(async ({method}: {method: string}) => {
      if (method === "eth_gasPrice") return "0x1";
      throw new Error(`Unexpected RPC method: ${method}`);
    }),
  };

  // Any consensus read here is the regression: the pre-train deployment answers
  // getTransactionLifecycle with a short tuple, which viem reports as
  // "Position 63 is out of bounds (0 < position < 32)".
  const readContract = vi.fn().mockImplementation(async ({functionName}: {functionName: string}) => {
    throw new Error(`Unexpected consensus read on Studio: ${functionName}`);
  });
  const publicClient = {
    waitForTransactionReceipt,
    getBlock: vi.fn().mockResolvedValue({number: 123n, timestamp: 456n}),
    readContract,
  };

  return {
    actions: contractActions(client as any, publicClient as any),
    signTransaction,
    sendRawTransaction,
    waitForTransactionReceipt,
    readContract,
    client,
    publicClient,
  };
};

describe("contractActions Studio lifecycle compatibility", () => {
  it("encodes submitAppeal(bytes32) without reading the train lifecycle", async () => {
    const {actions, signTransaction, readContract} = setupStudioLifecycleHarness();

    await expect(actions.appealTransaction({txId: MOCK_GENLAYER_TX_ID, value: 500n})).resolves.toBe(
      MOCK_GENLAYER_TX_ID,
    );

    expect(readContract).not.toHaveBeenCalled();
    const txRequest = signTransaction.mock.calls[0][0];
    expect(txRequest.to).toBe(MAIN_CONTRACT_ADDRESS);
    expect(txRequest.value).toBe(500n);
    const decoded = decodeFunctionData({abi: CONSENSUS_MAIN_STUDIO_ABI, data: txRequest.data});
    expect(decoded.functionName).toBe("submitAppeal");
    expect(decoded.args).toEqual([MOCK_GENLAYER_TX_ID]);
  });

  it("defaults the Studio appeal value to zero when the caller omits it", async () => {
    const {actions, signTransaction, readContract} = setupStudioLifecycleHarness();

    await actions.appealTransaction({txId: MOCK_GENLAYER_TX_ID});

    expect(readContract).not.toHaveBeenCalled();
    expect(signTransaction.mock.calls[0][0].value).toBe(0n);
  });

  it("encodes topUpAndSubmitAppeal without a decision id", async () => {
    const {actions, signTransaction, readContract} = setupStudioLifecycleHarness();

    const txId = await actions.topUpAndSubmitAppeal({
      txId: MOCK_GENLAYER_TX_ID,
      value: 1234n,
      distribution: {appealRounds: 1n, rotations: [0n, 1n]},
    });

    expect(txId).toBe(MOCK_GENLAYER_TX_ID);
    expect(readContract).not.toHaveBeenCalled();
    const txRequest = signTransaction.mock.calls[0][0];
    expect(txRequest.value).toBe(1234n);
    const decoded = decodeFunctionData({abi: FEE_MANAGEMENT_STUDIO_ABI as any, data: txRequest.data});
    const [decodedTxId, distribution] = decoded.args as any[];
    expect(decodedTxId).toBe(MOCK_GENLAYER_TX_ID);
    expect(distribution.appealRounds).toBe(1n);
    expect(distribution.rotations).toEqual([0n, 1n]);
  });

  it("encodes finalizeTransaction(bytes32) without a decision id", async () => {
    const {actions, signTransaction, readContract} = setupStudioLifecycleHarness();

    await expect(actions.finalizeTransaction({txId: MOCK_GENLAYER_TX_ID})).resolves.toBe(
      MOCK_EVM_TX_HASH,
    );

    expect(readContract).not.toHaveBeenCalled();
    const decoded = decodeFunctionData({
      abi: CONSENSUS_MAIN_STUDIO_ABI,
      data: signTransaction.mock.calls[0][0].data,
    });
    expect(decoded.functionName).toBe("finalizeTransaction");
    expect(decoded.args).toEqual([MOCK_GENLAYER_TX_ID]);
  });

  it("reports the missing appeal quote surface instead of decoding a train lifecycle", async () => {
    const {actions, readContract} = setupStudioLifecycleHarness();

    await expect(actions.getAppealCharge({txId: MOCK_GENLAYER_TX_ID})).rejects.toThrow(
      /missing feeManagerContract\/roundsStorageContract/,
    );
    await expect(actions.getMinAppealBond({txId: MOCK_GENLAYER_TX_ID})).rejects.toThrow(
      /missing feeManagerContract\/roundsStorageContract/,
    );
    expect(readContract).not.toHaveBeenCalled();
  });

  it("reports the missing appeals contract from canAppeal", async () => {
    const {actions, readContract} = setupStudioLifecycleHarness();

    await expect(actions.canAppeal({txId: MOCK_GENLAYER_TX_ID})).rejects.toThrow(
      /missing appealsContract/,
    );
    expect(readContract).not.toHaveBeenCalled();
  });

  it("rejects the train-only batch actions with an actionable message and never broadcasts", async () => {
    const {actions, signTransaction, readContract} = setupStudioLifecycleHarness();

    await expect(actions.resolveTransactions({txIds: [MOCK_GENLAYER_TX_ID]})).rejects.toThrow(
      /resolveTransactions not supported on this chain.*finalizeTransaction/s,
    );
    await expect(actions.finalizeDecisions({txIds: [MOCK_GENLAYER_TX_ID]})).rejects.toThrow(
      /finalizeDecisions not supported on this chain.*finalizeTransaction/s,
    );
    expect(readContract).not.toHaveBeenCalled();
    expect(signTransaction).not.toHaveBeenCalled();
  });

  it("still threads the decision id through the train path on non-Studio chains", async () => {
    const {actions, signTransaction, publicClient} = setupFeeManagementHarness();

    await actions.appealTransaction({txId: MOCK_GENLAYER_TX_ID});

    expect(publicClient.readContract).toHaveBeenCalledWith(
      expect.objectContaining({functionName: "getTransactionLifecycle"}),
    );
    const decoded = decodeFunctionData({
      abi: APPEAL_TRAIN_ABI,
      data: signTransaction.mock.calls[0][0].data,
    });
    expect(decoded.args).toEqual([MOCK_GENLAYER_TX_ID, MOCK_DECISION_ID]);
  });
});
