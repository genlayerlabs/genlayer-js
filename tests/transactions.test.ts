import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  TransactionStatus,
  TransactionResult,
  ExecutionResult,
  DECIDED_STATES,
  isDecidedState,
  transactionsStatusNumberToName,
  transactionsStatusNameToNumber,
  TransactionResolutionAction,
  transactionResolutionActionNumberToName,
  TransactionProtocolStatus,
  transactionProtocolStatusNumberToName,
  TransactionResolutionSource,
  transactionResolutionSourceNumberToName,
  transactionResultNumberToName,
  executionResultNumberToName,
  VoteType,
  voteTypeNumberToName,
  transactionLifecycleFromStoredStatus,
} from "../src/types/transactions";
import { receiptActions, transactionActions, isSuccessful } from "../src/transactions/actions";
import { decodeTransaction, simplifyTransactionReceipt } from "../src/transactions/decoders";
import { localnet } from "../src/chains/localnet";
import type { GenLayerRawTransaction } from "../src/types/transactions";
import {
  decodeFunctionResult,
  encodeFunctionResult,
  keccak256,
  MethodNotFoundRpcError,
  stringToBytes,
} from "viem";
import {CONSENSUS_DATA_BIG_ROUNDS_TRAIN_ABI, CONSENSUS_DATA_TRAIN_ABI} from "../src/abi/consensusTrain";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("DECIDED_STATES constant", () => {
  it("should contain all expected decided states", () => {
    const expectedStates = [
      TransactionStatus.ACCEPTED,
      TransactionStatus.UNDETERMINED,
      TransactionStatus.LEADER_TIMEOUT,
      TransactionStatus.VALIDATORS_TIMEOUT,
      TransactionStatus.CANCELED,
      TransactionStatus.FINALIZED
    ];
    
    expect(DECIDED_STATES).toEqual(expectedStates);
  });
});

describe("isDecidedState utility function", () => {
  it("should return true for all decided states", () => {
    const decidedStatusNumbers = ["5", "6", "12", "11", "8", "7"]; // ACCEPTED, UNDETERMINED, LEADER_TIMEOUT, VALIDATORS_TIMEOUT, CANCELED, FINALIZED
    
    decidedStatusNumbers.forEach(statusNum => {
      expect(isDecidedState(statusNum)).toBe(true);
    });
  });

  it("should return false for non-decided states", () => {
    const nonDecidedStatusNumbers = ["0", "1", "2", "3", "4", "9", "10", "13"]; // transient states
    
    nonDecidedStatusNumbers.forEach(statusNum => {
      expect(isDecidedState(statusNum)).toBe(false);
    });
  });

  it("should return false for invalid statuses", () => {
    const invalidStatuses = ["999", "invalid", ""];
    
    invalidStatuses.forEach(status => {
      expect(isDecidedState(status)).toBe(false);
    });
  });
});

describe("transaction enum maps", () => {
  it("maps v0.6 transaction status, vote type, and result type values", () => {
    // The train removed ReadyToFinalize at ordinal 11 and shifted the three
    // above it down, so LeaderRevealing is 13 now and nothing occupies 14.
    expect(transactionsStatusNumberToName["13"]).toBe(TransactionStatus.LEADER_REVEALING);
    expect(transactionsStatusNumberToName["11"]).toBe(TransactionStatus.VALIDATORS_TIMEOUT);
    expect(transactionsStatusNumberToName["12"]).toBe(TransactionStatus.LEADER_TIMEOUT);
    expect("READY_TO_FINALIZE" in TransactionStatus).toBe(false);
    expect(Object.keys(transactionsStatusNameToNumber)).not.toContain("READY_TO_FINALIZE");
    expect(transactionResolutionActionNumberToName).toEqual({
      "0": TransactionResolutionAction.NO_OP,
      "1": TransactionResolutionAction.CANCEL,
      "2": TransactionResolutionAction.REPLACE_ACTOR,
      "3": TransactionResolutionAction.ROTATE_LEADER,
      "4": TransactionResolutionAction.RESOLVE_APPEAL,
      "5": TransactionResolutionAction.MATERIALIZE_DECISION,
      "6": TransactionResolutionAction.FINALIZE,
    });
    expect(transactionProtocolStatusNumberToName["5"]).toBe(TransactionProtocolStatus.ACCEPTED);
    expect(transactionProtocolStatusNumberToName["13"]).toBe(TransactionProtocolStatus.LEADER_REVEALING);
    expect(transactionResolutionSourceNumberToName).toEqual({
      "0": TransactionResolutionSource.UNSPECIFIED,
      "1": TransactionResolutionSource.ACTIVATION_INSUFFICIENT_VALIDATORS,
      "2": TransactionResolutionSource.PROPOSAL_HANGING,
      "3": TransactionResolutionSource.LEADER_RECEIPT_TIMEOUT,
      "4": TransactionResolutionSource.COMMIT_HANGING,
      "5": TransactionResolutionSource.LEADER_REVEAL_HANGING,
      "6": TransactionResolutionSource.FULL_REVEAL,
      "7": TransactionResolutionSource.REVEAL_DEADLINE,
      "8": TransactionResolutionSource.APPEAL_COMMIT_HANGING,
      "9": TransactionResolutionSource.APPEAL_FULL_REVEAL,
      "10": TransactionResolutionSource.APPEAL_REVEAL_DEADLINE,
      "11": TransactionResolutionSource.SELECTION_DEPLETED,
    });
    expect(CONSENSUS_DATA_TRAIN_ABI.some(item => item.type === "function" && item.name === "canFinalize")).toBe(false);
    expect(isDecidedState("13")).toBe(false);
    expect(executionResultNumberToName["3"]).toBe(ExecutionResult.TIMEOUT);
    expect(executionResultNumberToName["4"]).toBe(ExecutionResult.NONDET_DISAGREE);
    expect(executionResultNumberToName).toEqual({
      "0": ExecutionResult.NOT_VOTED,
      "1": ExecutionResult.FINISHED_WITH_RETURN,
      "2": ExecutionResult.FINISHED_WITH_ERROR,
      "3": ExecutionResult.TIMEOUT,
      "4": ExecutionResult.NONDET_DISAGREE,
      "5": ExecutionResult.DETERMINISTIC_VIOLATION,
    });
    expect(voteTypeNumberToName).toEqual({
      "0": VoteType.NOT_VOTED,
      "1": VoteType.FINISHED_WITH_RETURN,
      "2": VoteType.FINISHED_WITH_ERROR,
      "3": VoteType.TIMEOUT,
      "4": VoteType.NONDET_DISAGREE,
      "5": VoteType.DETERMINISTIC_VIOLATION,
    });
    expect(TransactionResult).toEqual({
      IDLE: "IDLE",
      AGREE: "AGREE",
      DISAGREE: "DISAGREE",
      TIMEOUT: "TIMEOUT",
      DETERMINISTIC_VIOLATION: "DETERMINISTIC_VIOLATION",
      NO_MAJORITY: "NO_MAJORITY",
      MAJORITY_AGREE: "MAJORITY_AGREE",
      MAJORITY_DISAGREE: "MAJORITY_DISAGREE",
      MAJORITY_TIMEOUT: "MAJORITY_TIMEOUT",
    });
    expect(transactionResultNumberToName).toEqual({
      "0": TransactionResult.IDLE,
      "1": TransactionResult.MAJORITY_AGREE,
      "2": TransactionResult.MAJORITY_DISAGREE,
      "3": TransactionResult.MAJORITY_TIMEOUT,
      "4": TransactionResult.DETERMINISTIC_VIOLATION,
      "5": TransactionResult.NO_MAJORITY,
    });
  });

  it("decodes the train lifecycle ABI from raw return bytes", () => {
    const bytes32 = `0x${"00".repeat(32)}` as const;
    const resolution = [
      bytes32, 5, 6, 6, 1, bytes32, 0, 0n, 0n, bytes32, bytes32, 0n, 0n,
      0n, 0, bytes32, 100n, 101n, 102n, 10n, 110n, false, true, false,
    ] as const;
    const latestDecision = [
      true, 1n, 0n, 0, 0, bytes32, 5, 6, 0n, 0n, bytes32, bytes32, 0n,
      0n, 1, bytes32, 100n, 101n, 110n,
    ] as const;
    const encoded = encodeFunctionResult({
      abi: CONSENSUS_DATA_TRAIN_ABI,
      functionName: "getTransactionLifecycle",
      result: [5, resolution, latestDecision, true] as any,
    });

    const decoded = decodeFunctionResult({
      abi: CONSENSUS_DATA_TRAIN_ABI,
      functionName: "getTransactionLifecycle",
      data: encoded,
    }) as any;

    expect(decoded.storedStatus).toBe(5);
    expect(decoded.resolution.projectedStatus).toBe(6);
    expect(decoded.resolution.action).toBe(6);
    expect(decoded.decisionActive).toBe(true);
  });
});

describe("stored transaction lifecycle mapping", () => {
  it.each([
    [0, {state: "processing", phase: "uninitialized"}],
    [1, {state: "processing", phase: "pending"}],
    [2, {state: "processing", phase: "proposing"}],
    [3, {state: "processing", phase: "committing"}],
    [4, {state: "processing", phase: "revealing"}],
    [5, {state: "decided", outcome: "accepted"}],
    [6, {state: "decided", outcome: "undetermined"}],
    [8, {state: "canceled"}],
    [9, {state: "processing", phase: "appeal-revealing"}],
    [10, {state: "processing", phase: "appeal-committing"}],
    [11, {state: "decided", outcome: "validators-timeout"}],
    [12, {state: "decided", outcome: "leader-timeout"}],
    [13, {state: "processing", phase: "leader-revealing"}],
  ] as const)("maps stored status %i without projection", (status, expected) => {
    expect(transactionLifecycleFromStoredStatus(status)).toEqual(expected);
  });

  it.each([
    [1, {state: "finalized", outcome: "accepted"}],
    [2, {state: "finalized", outcome: "undetermined"}],
    [3, {state: "finalized", outcome: "validators-timeout"}],
    [4, {state: "finalized", outcome: "undetermined"}],
    [5, {state: "finalized", outcome: "undetermined"}],
    [0, {state: "finalized"}],
  ] as const)("maps finalized result %i only when its outcome is unambiguous", (result, expected) => {
    expect(transactionLifecycleFromStoredStatus(7, result)).toEqual(expected);
  });

  it("fails loudly for an unknown protocol status", () => {
    expect(() => transactionLifecycleFromStoredStatus(14)).toThrow(
      "Unknown stored transaction status: 14",
    );
  });
});

describe("isSuccessful", () => {
  it("returns true only for accepted/finalized transactions that finished with return", () => {
    expect(isSuccessful({
      statusName: TransactionStatus.ACCEPTED,
      txExecutionResultName: ExecutionResult.FINISHED_WITH_RETURN,
    } as any)).toBe(true);
    expect(isSuccessful({
      status: 7,
      txExecutionResult: 1,
    } as any)).toBe(true);
    expect(isSuccessful({
      statusName: TransactionStatus.UNDETERMINED,
      txExecutionResultName: ExecutionResult.FINISHED_WITH_RETURN,
    } as any)).toBe(false);
    expect(isSuccessful({
      statusName: TransactionStatus.ACCEPTED,
      txExecutionResultName: ExecutionResult.FINISHED_WITH_ERROR,
    } as any)).toBe(false);
    expect(isSuccessful({
      statusName: TransactionStatus.CANCELED,
      txExecutionResultName: ExecutionResult.FINISHED_WITH_RETURN,
    } as any)).toBe(false);
  });
});

describe("waitForTransactionReceipt with DECIDED_STATES", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("resolves waitUntil decided on UNDETERMINED", async () => {
    const mockTransaction = {
      hash: "0x4b8037744adab7ea8335b4f839979d20031d83a8ccdf706e0ae61312930335f6",
      status: "6",
    };
    const mockClient = {
      chain: localnet,
      getTransaction: vi.fn().mockResolvedValue(mockTransaction)
    };

    const actions = receiptActions(mockClient as any, {} as any);
    const result = await actions.waitForTransactionReceipt({
      hash: "0x4b8037744adab7ea8335b4f839979d20031d83a8ccdf706e0ae61312930335f6" as any,
      waitUntil: "decided",
    });

    expect(result).toEqual(mockTransaction);
  });

  it("keeps legacy ACCEPTED status behavior and warns once", async () => {
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const mockTransaction = {
      hash: "0x4b8037744adab7ea8335b4f839979d20031d83a8ccdf706e0ae61312930335f6",
      status: "6",
    };
    const mockClient = {
      chain: localnet,
      getTransaction: vi.fn().mockResolvedValue(mockTransaction)
    };
    const actions = receiptActions(mockClient as any, {} as any);

    await actions.waitForTransactionReceipt({
      hash: "0x4b8037744adab7ea8335b4f839979d20031d83a8ccdf706e0ae61312930335f6" as any,
      status: TransactionStatus.ACCEPTED,
    });
    await actions.waitForTransactionReceipt({
      hash: "0x4b8037744adab7ea8335b4f839979d20031d83a8ccdf706e0ae61312930335f6" as any,
      status: TransactionStatus.ACCEPTED,
    });

    expect(consoleWarn).toHaveBeenCalledTimes(1);
    expect(consoleWarn.mock.calls[0][0]).toContain("waitForTransactionReceipt({ status }) is deprecated");
    consoleWarn.mockRestore();
  });

  it("should accept all decided states when waiting for ACCEPTED", async () => {
    const decidedStatusNumbers = ["5", "6", "12", "11", "8", "7"]; // All decided states
    
    for (const statusNum of decidedStatusNumbers) {
      const mockTransaction = {
        hash: "0x4b8037744adab7ea8335b4f839979d20031d83a8ccdf706e0ae61312930335f6",
        status: statusNum,
        from_address: "0x123",
        to_address: "0x456",
        value: "0",
        gaslimit: "1000000",
        nonce: "1",
        created_at: "2023-01-01T00:00:00Z",
      };

      const mockClient = {
        chain: localnet,
        getTransaction: vi.fn().mockResolvedValue(mockTransaction)
      };

      const mockPublicClient = {} as any;

      const actions = receiptActions(mockClient as any, mockPublicClient);
      const result = await actions.waitForTransactionReceipt({
        hash: "0x4b8037744adab7ea8335b4f839979d20031d83a8ccdf706e0ae61312930335f6" as any,
        status: TransactionStatus.ACCEPTED,
      });

      expect(result).toEqual(mockTransaction);
    }
  });

  it("should not affect waiting for specific non-ACCEPTED statuses", async () => {
    const mockTransaction = {
      hash: "0x4b8037744adab7ea8335b4f839979d20031d83a8ccdf706e0ae61312930335f6",
      status: "7", // FINALIZED
      from_address: "0x123",
      to_address: "0x456",
      value: "0",
      gaslimit: "1000000",
      nonce: "1",
      created_at: "2023-01-01T00:00:00Z",
    };

    const mockClient = {
      chain: localnet,
      getTransaction: vi.fn().mockResolvedValue(mockTransaction)
    };

    const mockPublicClient = {} as any;

    const actions = receiptActions(mockClient as any, mockPublicClient);
    const result = await actions.waitForTransactionReceipt({
      hash: "0x4b8037744adab7ea8335b4f839979d20031d83a8ccdf706e0ae61312930335f6" as any,
      status: TransactionStatus.FINALIZED,
    });

    expect(result).toEqual(mockTransaction);
  });

  it("should maintain backward compatibility", async () => {
    const mockTransaction = {
      hash: "0x4b8037744adab7ea8335b4f839979d20031d83a8ccdf706e0ae61312930335f6",
      status: "5", // ACCEPTED
      from_address: "0x123",
      to_address: "0x456",
      value: "0",
      gaslimit: "1000000",
      nonce: "1",
      created_at: "2023-01-01T00:00:00Z",
    };

    const mockClient = {
      chain: localnet,
      getTransaction: vi.fn().mockResolvedValue(mockTransaction)
    };

    const mockPublicClient = {} as any;

    const actions = receiptActions(mockClient as any, mockPublicClient);
    const result = await actions.waitForTransactionReceipt({
      hash: "0x4b8037744adab7ea8335b4f839979d20031d83a8ccdf706e0ae61312930335f6" as any,
      status: TransactionStatus.ACCEPTED,
    });

    expect(result).toEqual(mockTransaction);
  });

  it("waitForFinalization ignores a projected final status", async () => {
    const hash = "0x4b8037744adab7ea8335b4f839979d20031d83a8ccdf706e0ae61312930335f6" as any;
    const mockClient = {
      chain: localnet,
      getTransaction: vi.fn().mockResolvedValue({
        hash,
        status: 5,
        statusName: TransactionStatus.ACCEPTED,
        lifecycle: {state: "decided", outcome: "accepted"},
        projectedStatus: 7,
      }),
    };

    await expect(receiptActions(mockClient as any, {} as any).waitForFinalization({
      hash,
      retries: 0,
    })).rejects.toThrow('current status: 5');
  });

  it("provides focused decision and finalization wait helpers", async () => {
    const hash = "0x4b8037744adab7ea8335b4f839979d20031d83a8ccdf706e0ae61312930335f6" as any;
    const decided = {
      hash,
      status: 6,
      statusName: TransactionStatus.UNDETERMINED,
      lifecycle: {state: "decided", outcome: "undetermined"},
    };
    const finalized = {
      hash,
      status: 7,
      statusName: TransactionStatus.FINALIZED,
      lifecycle: {state: "finalized", outcome: "undetermined"},
    };
    const mockClient = {
      chain: localnet,
      getTransaction: vi.fn()
        .mockResolvedValueOnce(decided)
        .mockResolvedValueOnce(finalized),
    };
    const actions = receiptActions(mockClient as any, {} as any);

    await expect(actions.waitForDecision({hash, fullTransaction: true})).resolves.toEqual(decided);
    await expect(actions.waitForFinalization({hash, fullTransaction: true})).resolves.toEqual(finalized);
  });
});

describe("cancelTransaction", () => {
  const exampleHash = "0x4b8037744adab7ea8335b4f839979d20031d83a8ccdf706e0ae61312930335f6" as any;

  it("should cancel a transaction with a private key account", async () => {
    const mockSignMessage = vi.fn().mockResolvedValue("0xmocksignature");
    const mockRequest = vi.fn().mockResolvedValue({ transaction_hash: exampleHash, status: "CANCELED" });

    const mockClient = {
      chain: { ...localnet, isStudio: true },
      account: { signMessage: mockSignMessage, address: "0x1234567890123456789012345678901234567890" },
      request: mockRequest,
    };

    const actions = transactionActions(mockClient as any, {} as any);
    const result = await actions.cancelTransaction({ hash: exampleHash });

    expect(result).toEqual({ transaction_hash: exampleHash, status: "CANCELED" });
    expect(mockSignMessage).toHaveBeenCalledOnce();
    expect(mockRequest).toHaveBeenCalledWith({
      method: "sim_cancelTransaction",
      params: [exampleHash, "0xmocksignature"],
    });
  });

  it("should throw on non-studio chains", async () => {
    const mockClient = {
      chain: { isStudio: false },
      account: { signMessage: vi.fn() },
    };

    const actions = transactionActions(mockClient as any, {} as any);
    await expect(actions.cancelTransaction({ hash: exampleHash })).rejects.toThrow(
      "cancelTransaction is only available on studio-based chains"
    );
  });

  it("should throw when no account is configured", async () => {
    const mockClient = {
      chain: { ...localnet, isStudio: true },
      account: undefined,
    };

    const actions = transactionActions(mockClient as any, {} as any);
    await expect(actions.cancelTransaction({ hash: exampleHash })).rejects.toThrow(
      "No account set"
    );
  });

  it("should use personal_sign for address-only accounts", async () => {
    const mockProviderRequest = vi.fn().mockResolvedValue("0xprovidersignature");
    vi.stubGlobal("window", { ethereum: { request: mockProviderRequest } });

    const mockRequest = vi.fn().mockResolvedValue({ transaction_hash: exampleHash, status: "CANCELED" });

    const mockClient = {
      chain: { ...localnet, isStudio: true },
      account: "0x1234567890123456789012345678901234567890",
      request: mockRequest,
    };

    const actions = transactionActions(mockClient as any, {} as any);
    const result = await actions.cancelTransaction({ hash: exampleHash });

    expect(result).toEqual({ transaction_hash: exampleHash, status: "CANCELED" });
    expect(mockProviderRequest).toHaveBeenCalledWith({
      method: "personal_sign",
      params: [expect.any(String), "0x1234567890123456789012345678901234567890"],
    });
    expect(mockRequest).toHaveBeenCalledWith({
      method: "sim_cancelTransaction",
      params: [exampleHash, "0xprovidersignature"],
    });

    vi.unstubAllGlobals();
    vi.stubGlobal("fetch", mockFetch);
  });
});

// ─── decodeTransaction train layout ─────────────────────────────────────────

const makeRawTx = (overrides: Record<string, unknown> = {}): GenLayerRawTransaction => ({
  observedAt: 1000n,
  sender: "0x0000000000000000000000000000000000000001" as any,
  recipient: "0x0000000000000000000000000000000000000002" as any,
  initialRotations: 3n,
  numOfInitialValidators: 5n,
  txSlot: 5n,
  createdTimestamp: 900n,
  lastVoteTimestamp: 950n,
  randomSeed: "0x" + "ab".repeat(32) as any,
  result: 1,
  txCalldata: "0x" as any,
  txExecutionHash: "0x" + "00".repeat(32) as any,
  eqBlocksOutputs: "0x",
  messages: [],
  consumedValidators: [],
  queueType: 0,
  queuePosition: 0n,
  activator: "0x0000000000000000000000000000000000000003" as any,
  lastLeader: "0x0000000000000000000000000000000000000004" as any,
  status: 5,
  txId: "0x" + "ff".repeat(32) as any,
  readStateBlockRange: {
    activationBlock: 100n,
    processingBlock: 101n,
    proposalBlock: 102n,
  },
  numOfRounds: 1n,
  lastRound: {
    round: 0n,
    leaderIndex: 0n,
    votesCommitted: 3n,
    votesRevealed: 3n,
    appealBond: 0n,
    rotationsLeft: 2n,
    result: 1,
    roundValidators: [],
    validatorVotesHash: [],
    validatorResultHash: [],
    validatorVotes: [1, 1, 1],
  },
  ...overrides,
});

const makeLightTx = (overrides: Record<string, unknown> = {}) => {
  const raw = makeRawTx();
  return {
    observedAt: raw.observedAt,
    sender: raw.sender,
    recipient: raw.recipient,
    initialRotations: raw.initialRotations,
    txSlot: raw.txSlot,
    createdTimestamp: raw.createdTimestamp,
    lastVoteTimestamp: raw.lastVoteTimestamp,
    randomSeed: raw.randomSeed,
    result: raw.result,
    txExecutionHash: raw.txExecutionHash,
    txCalldata: raw.txCalldata,
    eqBlocksOutputs: raw.eqBlocksOutputs,
    messages: raw.messages,
    queueType: raw.queueType,
    queuePosition: raw.queuePosition,
    activator: raw.activator,
    lastLeader: raw.lastLeader,
    status: raw.status,
    txId: raw.txId,
    readStateBlockRange: raw.readStateBlockRange,
    numOfRounds: raw.numOfRounds,
    lastRound: {
      round: raw.lastRound.round,
      leaderIndex: raw.lastRound.leaderIndex,
      votesCommitted: raw.lastRound.votesCommitted,
      votesRevealed: raw.lastRound.votesRevealed,
      appealBond: raw.lastRound.appealBond,
      rotationsLeft: raw.lastRound.rotationsLeft,
      result: raw.lastRound.result,
      validatorsCount: 0n,
    },
    consumedValidatorsCount: 0n,
    ...overrides,
  };
};

describe("train light transaction ABI", () => {
  it("decodes the exact nested tuple from raw return bytes", () => {
    const light = makeLightTx({
      messages: [{
        messageType: 1,
        recipient: "0x0000000000000000000000000000000000000005",
        value: 7n,
        data: "0x1234",
        onAcceptance: true,
        saltNonce: 8n,
        feeParams: "0xabcd",
        declaredBudget: 9n,
        allocationSubtree: "0x5678",
        callKey: `0x${"11".repeat(32)}`,
        useBalance: false,
      }],
    });
    const encoded = encodeFunctionResult({
      abi: CONSENSUS_DATA_BIG_ROUNDS_TRAIN_ABI,
      functionName: "getStoredTransactionDataLight",
      result: light as any,
    });
    const decoded = decodeFunctionResult({
      abi: CONSENSUS_DATA_BIG_ROUNDS_TRAIN_ABI,
      functionName: "getStoredTransactionDataLight",
      data: encoded,
    }) as any;

    expect(decoded.txId).toBe(light.txId);
    expect(decoded.txExecutionHash).toBe(light.txExecutionHash);
    expect(decoded.lastRound.validatorsCount).toBe(0n);
    expect(decoded.messages[0]).toMatchObject({
      messageType: 1,
      recipient: "0x0000000000000000000000000000000000000005",
      declaredBudget: 9n,
      useBalance: false,
    });
  });
});

const ADDRESS_MANAGER = "0x0000000000000000000000000000000000000011";
const BIG_ROUNDS = "0x0000000000000000000000000000000000000012";
const ROUNDS_STORAGE = "0x0000000000000000000000000000000000000013";
const TRANSACTION_MANAGER = "0x0000000000000000000000000000000000000014";

const trainLifecycle = (overrides: Record<string, unknown> = {}) => ({
  storedStatus: 5,
  resolution: {projectedStatus: 5, action: 0, source: 0, evaluatedAt: 456n},
  latestDecision: {},
  decisionActive: false,
  ...overrides,
});

const trainReadContract = ({
  light = makeLightTx(),
  lifecycle = trainLifecycle(),
  roundValidators = [] as string[],
  consumedValidators = [] as string[],
}: {
  light?: ReturnType<typeof makeLightTx>;
  lifecycle?: ReturnType<typeof trainLifecycle>;
  roundValidators?: string[];
  consumedValidators?: string[];
} = {}) => vi.fn().mockImplementation(async ({functionName, args}: any) => {
  if (functionName === "addressManager") return ADDRESS_MANAGER;
  if (functionName === "getAddress") {
    if (args[0] === "ConsensusDataBigRounds") return BIG_ROUNDS;
    if (args[0] === "RoundsStorage") return ROUNDS_STORAGE;
    if (args[0] === "TransactionManager") return TRANSACTION_MANAGER;
  }
  if (functionName === "getStoredTransactionDataLight") return light;
  if (functionName === "getTransactionLifecycle") return lifecycle;
  if (functionName === "getRoundValidatorsPaged") {
    const offset = Number(args[2]);
    const size = Number(args[3]);
    return [roundValidators.slice(offset, offset + size), BigInt(roundValidators.length)];
  }
  if (functionName === "getConsumedValidatorsPaged") {
    const offset = Number(args[1]);
    const size = Number(args[2]);
    return [consumedValidators.slice(offset, offset + size), BigInt(consumedValidators.length)];
  }
  if (functionName === "getValidatorVotes") return roundValidators.map(() => 1);
  if (functionName === "getValidatorVotesHash") return roundValidators.map(() => `0x${"01".repeat(32)}`);
  if (functionName === "getValidatorResultHash") return roundValidators.map(() => `0x${"02".repeat(32)}`);
  if (functionName === "getTxExecutionResult") return 1;
  if (functionName === "getNumOfInitialValidators") return 5n;
  throw new Error(`Unexpected read: ${functionName}`);
});

describe("getTriggeredTransactionIds", () => {
  it("finds child transaction IDs in the parent decision receipt", async () => {
    const parentHash = ("0x" + "11".repeat(32)) as any;
    const childHash = ("0x" + "22".repeat(32)) as any;
    const decisionHash = ("0x" + "33".repeat(32)) as any;
    const consensusAddress = "0x0000000000000000000000000000000000000010";
    const messagePaymentsAddress = "0x0000000000000000000000000000000000000020";
    const internalMessageTopic = keccak256(
      stringToBytes("InternalMessageProcessed(bytes32,address,address)"),
    );
    const readContract = trainReadContract({
      light: makeLightTx({
        readStateBlockRange: {activationBlock: 0n, processingBlock: 0n, proposalBlock: 100n},
      }),
    });
    const getLogs = vi.fn().mockResolvedValue([{transactionHash: decisionHash}]);
    const getTransactionReceipt = vi.fn().mockResolvedValue({
      logs: [
        {
          address: messagePaymentsAddress,
          topics: [internalMessageTopic, childHash],
        },
      ],
    });
    const publicClient = {
      readContract,
      getBlock: vi.fn().mockResolvedValue({number: 150n, timestamp: 1000n}),
      getBlockNumber: vi.fn().mockResolvedValue(200n),
      getLogs,
      getTransactionReceipt,
    } as any;
    const client = {
      chain: {
        isStudio: false,
        consensusDataContract: {address: consensusAddress, abi: []},
        consensusMainContract: {address: consensusAddress, abi: []},
      },
    } as any;

    const result = await transactionActions(client, publicClient).getTriggeredTransactionIds({
      hash: parentHash,
    });

    expect(result).toEqual([childHash]);
    expect(getLogs.mock.calls[0][0].topics[1]).toBe(parentHash);
    expect(Array.isArray(getLogs.mock.calls[0][0].topics[0])).toBe(true);
    expect(getTransactionReceipt).toHaveBeenCalledWith({hash: decisionHash});
  });
});

describe("getTransaction train lifecycle", () => {
  it("returns only the stored state in the primary transaction model", async () => {
    const validators = Array.from(
      {length: 65},
      (_, index) => `0x${(index + 1).toString(16).padStart(40, "0")}`,
    );
    const consumed = validators.slice(0, 2);
    const light = makeLightTx({
      status: 5,
      lastRound: {...makeLightTx().lastRound, validatorsCount: 65n},
      consumedValidatorsCount: 2n,
    });
    const readContract = trainReadContract({
      light,
      roundValidators: validators,
      consumedValidators: consumed,
    });
    const publicClient = {
      readContract,
      getBlock: vi.fn().mockResolvedValue({number: 123n, timestamp: 456n}),
    } as any;
    const client = {
      chain: {
        isStudio: false,
        consensusDataContract: {
          address: "0x0000000000000000000000000000000000000010",
          abi: [],
        },
      },
    } as any;

    const transaction = await transactionActions(client, publicClient).getTransaction({
      hash: light.txId as any,
    });

    expect(transaction.status).toBe(5);
    expect(transaction.statusName).toBe(TransactionStatus.ACCEPTED);
    expect(transaction.lifecycle).toEqual({state: "decided", outcome: "accepted"});
    expect(transaction).not.toHaveProperty("storedStatus");
    expect(transaction).not.toHaveProperty("resolutionAction");
    expect(transaction).not.toHaveProperty("canFinalize");
    expect(transaction.lastRound?.roundValidators).toEqual(validators);
    expect(transaction.lastRound?.validatorResultHash).toHaveLength(validators.length);
    expect(transaction.consumedValidators).toEqual(consumed);
    expect(readContract).not.toHaveBeenCalledWith(
      expect.objectContaining({functionName: "getTransactionLifecycle"}),
    );
    expect(readContract).not.toHaveBeenCalledWith(
      expect.objectContaining({functionName: "canFinalize"}),
    );
    expect(readContract).not.toHaveBeenCalledWith(
      expect.objectContaining({functionName: "getTransactionAllData"}),
    );
    expect(readContract).not.toHaveBeenCalledWith(
      expect.objectContaining({functionName: "getStoredTransactionData"}),
    );
  });

  it("normalizes the contract-backed advanced lifecycle from one fixed-block read", async () => {
    const light = makeLightTx();
    const readContract = trainReadContract({
      light,
      lifecycle: trainLifecycle({
        storedStatus: 5,
        resolution: {projectedStatus: 6, action: 6, source: 11, evaluatedAt: 500n},
        latestDecision: {decisionId: 7n},
        decisionActive: true,
      }),
    });
    const publicClient = {
      readContract,
      getBlock: vi.fn().mockResolvedValue({number: 123n, timestamp: 456n}),
    } as any;
    const client = {
      chain: {
        isStudio: false,
        consensusDataContract: {
          address: "0x0000000000000000000000000000000000000010",
          abi: [],
        },
      },
    } as any;

    const lifecycle = await transactionActions(client, publicClient).advanced.getTransactionLifecycle({
      hash: light.txId as any,
      timestamp: 500,
    });

    expect(lifecycle).toEqual({
      storedStatus: "Accepted",
      storedStatusCode: 5,
      projectedStatus: "Undetermined",
      projectedStatusCode: 6,
      resolutionAction: "Finalize",
      resolutionActionCode: 6,
      resolutionSource: "SelectionDepleted",
      resolutionSourceCode: 11,
      decisionId: "7",
      decisionActive: true,
      evaluatedAt: 500,
    });
    expect(readContract).toHaveBeenCalledWith(
      expect.objectContaining({
        functionName: "getTransactionLifecycle",
        args: [light.txId, 500n],
        blockNumber: 123n,
      }),
    );
    expect(readContract).toHaveBeenCalledTimes(1);
    expect(lifecycle).not.toHaveProperty("finalization");
    expect(lifecycle).not.toHaveProperty("canFinalize");
  });

  it("uses the advanced node RPC on Studio and returns the same normalized schema", async () => {
    const hash = makeLightTx().txId as any;
    const request = vi.fn().mockResolvedValue({
      storedStatus: "Accepted",
      storedStatusCode: 5,
      projectedStatus: "Undetermined",
      projectedStatusCode: 6,
      resolutionAction: "Finalize",
      resolutionActionCode: 6,
      resolutionSource: "SelectionDepleted",
      resolutionSourceCode: 11,
      decisionId: "0007",
      decisionActive: true,
      evaluatedAt: 500,
    });
    const publicClient = {
      getBlock: vi.fn(),
      readContract: vi.fn(),
    } as any;
    const client = {chain: {isStudio: true}, request} as any;

    const lifecycle = await transactionActions(client, publicClient).advanced.getTransactionLifecycle({
      hash,
      timestamp: 500,
    });

    expect(lifecycle).toEqual({
      storedStatus: "Accepted",
      storedStatusCode: 5,
      projectedStatus: "Undetermined",
      projectedStatusCode: 6,
      resolutionAction: "Finalize",
      resolutionActionCode: 6,
      resolutionSource: "SelectionDepleted",
      resolutionSourceCode: 11,
      decisionId: "7",
      decisionActive: true,
      evaluatedAt: 500,
    });
    expect(request).toHaveBeenCalledWith({
      method: "gen_getTransactionLifecycle",
      params: [{txId: hash, timestamp: 500}],
    });
    expect(publicClient.getBlock).not.toHaveBeenCalled();
    expect(publicClient.readContract).not.toHaveBeenCalled();
    expect(lifecycle).not.toHaveProperty("finalization");
    expect(lifecycle).not.toHaveProperty("canFinalize");
  });

  it("synthesizes the lifecycle from the Studio transaction when the RPC is absent", async () => {
    const hash = makeLightTx().txId as any;
    const request = vi.fn().mockRejectedValue(
      new MethodNotFoundRpcError(new Error("Method not found"), {
        method: "gen_getTransactionLifecycle",
      }),
    );
    const getTransaction = vi.fn().mockResolvedValue({status: TransactionStatus.ACCEPTED});
    const publicClient = {getBlock: vi.fn(), readContract: vi.fn()} as any;
    const client = {chain: {isStudio: true}, request, getTransaction} as any;

    const lifecycle = await transactionActions(client, publicClient).advanced.getTransactionLifecycle({
      hash,
      timestamp: 500,
    });

    // Studio's consumer surface proves the stored status and nothing else: no
    // projection, no resolution action, and no decision identity to report.
    expect(lifecycle).toEqual({
      storedStatus: "Accepted",
      storedStatusCode: 5,
      projectedStatus: "Accepted",
      projectedStatusCode: 5,
      resolutionAction: "NoOp",
      resolutionActionCode: 0,
      resolutionSource: "Unspecified",
      resolutionSourceCode: 0,
      decisionId: null,
      decisionActive: false,
      evaluatedAt: 500,
    });
    expect(getTransaction).toHaveBeenCalledWith({hash});
    expect(publicClient.readContract).not.toHaveBeenCalled();
  });

  it("maps Studio's ACTIVATED state onto the protocol Pending status", async () => {
    const hash = makeLightTx().txId as any;
    const before = Math.floor(Date.now() / 1000);
    const request = vi.fn().mockRejectedValue({code: -32601, message: "Method not found"});
    const client = {
      chain: {isStudio: true},
      request,
      getTransaction: vi.fn().mockResolvedValue({status: "ACTIVATED"}),
    } as any;

    const lifecycle = await transactionActions(client, {} as any).advanced.getTransactionLifecycle({
      hash,
    });

    expect(lifecycle.storedStatus).toBe("Pending");
    expect(lifecycle.projectedStatus).toBe("Pending");
    expect(lifecycle.decisionActive).toBe(false);
    expect(lifecycle.evaluatedAt).toBeGreaterThanOrEqual(before);
  });

  it("propagates a Studio lifecycle failure that is not a missing method", async () => {
    const hash = makeLightTx().txId as any;
    const getTransaction = vi.fn();
    const client = {
      chain: {isStudio: true},
      request: vi.fn().mockRejectedValue({code: -32000, message: "execution reverted"}),
      getTransaction,
    } as any;

    await expect(
      transactionActions(client, {} as any).advanced.getTransactionLifecycle({hash}),
    ).rejects.toEqual({code: -32000, message: "execution reverted"});
    expect(getTransaction).not.toHaveBeenCalled();
  });

  it("re-raises the original RPC error when the Studio status is unreadable", async () => {
    const hash = makeLightTx().txId as any;
    const cause = {code: -32601, message: "Method not found"};
    const client = {
      chain: {isStudio: true},
      request: vi.fn().mockRejectedValue(cause),
      getTransaction: vi.fn().mockResolvedValue({status: "NOT_A_STATUS"}),
    } as any;

    await expect(
      transactionActions(client, {} as any).advanced.getTransactionLifecycle({hash}),
    ).rejects.toEqual(cause);
  });

  it("uses block time by default and nulls an inactive decision identity", async () => {
    const light = makeLightTx();
    const readContract = trainReadContract({
      lifecycle: trainLifecycle({
        storedStatus: 1,
        resolution: {projectedStatus: 1, action: 0, source: 0, evaluatedAt: 456n},
        latestDecision: {decisionId: 999n},
        decisionActive: false,
      }),
    });
    const publicClient = {
      readContract,
      getBlock: vi.fn().mockResolvedValue({number: 123n, timestamp: 456n}),
    } as any;
    const client = {
      chain: {
        isStudio: false,
        consensusDataContract: {address: "0x0000000000000000000000000000000000000010", abi: []},
      },
    } as any;

    const lifecycle = await transactionActions(client, publicClient).advanced.getTransactionLifecycle({
      hash: light.txId as any,
    });

    expect(lifecycle).toEqual({
      storedStatus: "Pending",
      storedStatusCode: 1,
      projectedStatus: "Pending",
      projectedStatusCode: 1,
      resolutionAction: "NoOp",
      resolutionActionCode: 0,
      resolutionSource: "Unspecified",
      resolutionSourceCode: 0,
      decisionId: null,
      decisionActive: false,
      evaluatedAt: 456,
    });
    expect(readContract).toHaveBeenCalledWith(
      expect.objectContaining({args: [light.txId, 456n], blockNumber: 123n}),
    );
  });
});

describe("decodeTransaction", () => {
  it("decodes the canonical train field layout into stable public names", () => {
    const tx = makeRawTx();
    const decoded = decodeTransaction(tx);
    expect(decoded.numOfInitialValidators).toBe("5");
    expect(decoded.initialRotations).toBe(3n);
    expect(decoded.currentTimestamp).toBe("1000");
    expect(decoded.txData).toBe("0x");
    expect(decoded.txExecutionHash).toBe(tx.txExecutionHash);
    expect(decoded.txReceipt).toBeUndefined();
    expect(decoded.txSlot).toBe("5");
    expect(decoded.statusName).toBe("ACCEPTED");
    expect(decoded.lifecycle).toEqual({state: "decided", outcome: "accepted"});
    expect(decoded.resultName).toBe("MAJORITY_AGREE");
  });

  it("should decode readStateBlockRange fields to strings", () => {
    const decoded = decodeTransaction(makeRawTx());
    expect(decoded.readStateBlockRange?.activationBlock).toBe("100");
    expect(decoded.readStateBlockRange?.processingBlock).toBe("101");
    expect(decoded.readStateBlockRange?.proposalBlock).toBe("102");
  });

  it("should decode lastRound fields to strings", () => {
    const decoded = decodeTransaction(makeRawTx());
    expect(decoded.lastRound?.votesCommitted).toBe("3");
    expect(decoded.lastRound?.votesRevealed).toBe("3");
    expect(decoded.lastRound?.rotationsLeft).toBe("2");
  });

  it("should map validator votes to vote type names", () => {
    const decoded = decodeTransaction(makeRawTx());
    const names = decoded.lastRound?.validatorVotesName;
    expect(names).toEqual([
      "FINISHED_WITH_RETURN",
      "FINISHED_WITH_RETURN",
      "FINISHED_WITH_RETURN",
    ]);
  });
});

describe("simplifyTransactionReceipt", () => {
  it("should preserve string result in leader_receipt (base64 result bytes)", () => {
    const base64Result = "AVtUUkFOU0lFTlRdIHRlc3Q="; // \x01[TRANSIENT] test
    const tx = {
      consensus_data: {
        leader_receipt: [{
          execution_result: "ERROR",
          genvm_result: { stderr: "warnings.warn(...)" },
          result: base64Result,
        }],
      },
    } as any;

    const simplified = simplifyTransactionReceipt(tx);
    const leader = simplified.consensus_data?.leader_receipt?.[0] as any;

    expect(leader.result).toBe(base64Result);
    expect(typeof leader.result).toBe("string");
  });

  it("should preserve object result in leader_receipt", () => {
    const tx = {
      consensus_data: {
        leader_receipt: [{
          execution_result: "ERROR",
          result: { stderr: "ValueError: some error", exit_code: 1 },
        }],
      },
    } as any;

    const simplified = simplifyTransactionReceipt(tx);
    const leader = simplified.consensus_data?.leader_receipt?.[0] as any;

    expect(leader.result).toEqual({ stderr: "ValueError: some error", exit_code: 1 });
  });

  it("should not drop primitive values in nested objects", () => {
    const tx = {
      consensus_data: {
        leader_receipt: [{
          execution_result: "ERROR",
          genvm_result: { stderr: "some error", exit_code: 1 },
        }],
      },
    } as any;

    const simplified = simplifyTransactionReceipt(tx);
    const genvm = (simplified.consensus_data?.leader_receipt?.[0] as any)?.genvm_result;

    expect(genvm.stderr).toBe("some error");
    expect(genvm.exit_code).toBe(1);
  });
});
