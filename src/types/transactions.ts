import {Hex} from "viem";
import {Account, Address} from "./accounts";
import type {CalldataEncodable} from "./calldata";

export type Hash = `0x${string}` & {length: 66};
export type TransactionHash = Hash;
export type BigNumberish = bigint | number | string;

export enum TransactionStatus {
  UNINITIALIZED = "UNINITIALIZED",
  PENDING = "PENDING",
  PROPOSING = "PROPOSING",
  COMMITTING = "COMMITTING",
  REVEALING = "REVEALING",
  ACCEPTED = "ACCEPTED",
  UNDETERMINED = "UNDETERMINED",
  FINALIZED = "FINALIZED",
  CANCELED = "CANCELED",
  APPEAL_REVEALING = "APPEAL_REVEALING",
  APPEAL_COMMITTING = "APPEAL_COMMITTING",
  VALIDATORS_TIMEOUT = "VALIDATORS_TIMEOUT",
  LEADER_TIMEOUT = "LEADER_TIMEOUT",
  LEADER_REVEALING = "LEADER_REVEALING",
}

export enum TransactionResolutionAction {
  NO_OP = "NoOp",
  CANCEL = "Cancel",
  REPLACE_ACTOR = "ReplaceActor",
  ROTATE_LEADER = "RotateLeader",
  RESOLVE_APPEAL = "ResolveAppeal",
  MATERIALIZE_DECISION = "MaterializeDecision",
  FINALIZE = "Finalize",
}

export const transactionResolutionActionNumberToName = {
  "0": TransactionResolutionAction.NO_OP,
  "1": TransactionResolutionAction.CANCEL,
  "2": TransactionResolutionAction.REPLACE_ACTOR,
  "3": TransactionResolutionAction.ROTATE_LEADER,
  "4": TransactionResolutionAction.RESOLVE_APPEAL,
  "5": TransactionResolutionAction.MATERIALIZE_DECISION,
  "6": TransactionResolutionAction.FINALIZE,
};

/** Exact protocol status names used by the advanced lifecycle RPC. */
export enum TransactionProtocolStatus {
  UNINITIALIZED = "Uninitialized",
  PENDING = "Pending",
  PROPOSING = "Proposing",
  COMMITTING = "Committing",
  REVEALING = "Revealing",
  ACCEPTED = "Accepted",
  UNDETERMINED = "Undetermined",
  FINALIZED = "Finalized",
  CANCELED = "Canceled",
  APPEAL_REVEALING = "AppealRevealing",
  APPEAL_COMMITTING = "AppealCommitting",
  VALIDATORS_TIMEOUT = "ValidatorsTimeout",
  LEADER_TIMEOUT = "LeaderTimeout",
  LEADER_REVEALING = "LeaderRevealing",
}

export const transactionProtocolStatusNumberToName = {
  "0": TransactionProtocolStatus.UNINITIALIZED,
  "1": TransactionProtocolStatus.PENDING,
  "2": TransactionProtocolStatus.PROPOSING,
  "3": TransactionProtocolStatus.COMMITTING,
  "4": TransactionProtocolStatus.REVEALING,
  "5": TransactionProtocolStatus.ACCEPTED,
  "6": TransactionProtocolStatus.UNDETERMINED,
  "7": TransactionProtocolStatus.FINALIZED,
  "8": TransactionProtocolStatus.CANCELED,
  "9": TransactionProtocolStatus.APPEAL_REVEALING,
  "10": TransactionProtocolStatus.APPEAL_COMMITTING,
  "11": TransactionProtocolStatus.VALIDATORS_TIMEOUT,
  "12": TransactionProtocolStatus.LEADER_TIMEOUT,
  "13": TransactionProtocolStatus.LEADER_REVEALING,
};

/** Exact resolution-source names used by the advanced lifecycle RPC. */
export enum TransactionResolutionSource {
  UNSPECIFIED = "Unspecified",
  ACTIVATION_INSUFFICIENT_VALIDATORS = "ActivationInsufficientValidators",
  PROPOSAL_HANGING = "ProposalHanging",
  LEADER_RECEIPT_TIMEOUT = "LeaderReceiptTimeout",
  COMMIT_HANGING = "CommitHanging",
  LEADER_REVEAL_HANGING = "LeaderRevealHanging",
  FULL_REVEAL = "FullReveal",
  REVEAL_DEADLINE = "RevealDeadline",
  APPEAL_COMMIT_HANGING = "AppealCommitHanging",
  APPEAL_FULL_REVEAL = "AppealFullReveal",
  APPEAL_REVEAL_DEADLINE = "AppealRevealDeadline",
  SELECTION_DEPLETED = "SelectionDepleted",
}

export const transactionResolutionSourceNumberToName = {
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
};

export enum TransactionResult {
  IDLE = "IDLE",
  AGREE = "AGREE",
  DISAGREE = "DISAGREE",
  TIMEOUT = "TIMEOUT",
  DETERMINISTIC_VIOLATION = "DETERMINISTIC_VIOLATION",
  NO_MAJORITY = "NO_MAJORITY",
  MAJORITY_AGREE = "MAJORITY_AGREE",
  MAJORITY_DISAGREE = "MAJORITY_DISAGREE",
  MAJORITY_TIMEOUT = "MAJORITY_TIMEOUT",
}

// ReadyToFinalize is no longer a transaction status. Advanced consumers derive
// the current finalization capability from resolutionAction === "Finalize".
export const transactionsStatusNumberToName = {
  "0": TransactionStatus.UNINITIALIZED,
  "1": TransactionStatus.PENDING,
  "2": TransactionStatus.PROPOSING,
  "3": TransactionStatus.COMMITTING,
  "4": TransactionStatus.REVEALING,
  "5": TransactionStatus.ACCEPTED,
  "6": TransactionStatus.UNDETERMINED,
  "7": TransactionStatus.FINALIZED,
  "8": TransactionStatus.CANCELED,
  "9": TransactionStatus.APPEAL_REVEALING,
  "10": TransactionStatus.APPEAL_COMMITTING,
  "11": TransactionStatus.VALIDATORS_TIMEOUT,
  "12": TransactionStatus.LEADER_TIMEOUT,
  "13": TransactionStatus.LEADER_REVEALING,
};

export const transactionsStatusNameToNumber: Record<TransactionStatus, string> = {
  [TransactionStatus.UNINITIALIZED]: "0",
  [TransactionStatus.PENDING]: "1",
  [TransactionStatus.PROPOSING]: "2",
  [TransactionStatus.COMMITTING]: "3",
  [TransactionStatus.REVEALING]: "4",
  [TransactionStatus.ACCEPTED]: "5",
  [TransactionStatus.UNDETERMINED]: "6",
  [TransactionStatus.FINALIZED]: "7",
  [TransactionStatus.CANCELED]: "8",
  [TransactionStatus.APPEAL_REVEALING]: "9",
  [TransactionStatus.APPEAL_COMMITTING]: "10",
  [TransactionStatus.VALIDATORS_TIMEOUT]: "11",
  [TransactionStatus.LEADER_TIMEOUT]: "12",
  [TransactionStatus.LEADER_REVEALING]: "13",
};

export const DECIDED_STATES = [
  TransactionStatus.ACCEPTED,
  TransactionStatus.UNDETERMINED,
  TransactionStatus.LEADER_TIMEOUT,
  TransactionStatus.VALIDATORS_TIMEOUT,
  TransactionStatus.CANCELED,
  TransactionStatus.FINALIZED
];

export function isDecidedState(status: string): boolean {
  return DECIDED_STATES.some(state => 
    transactionsStatusNameToNumber[state] === status
  );
}

export const transactionResultNumberToName = {
  "0": TransactionResult.IDLE,
  "1": TransactionResult.MAJORITY_AGREE,
  "2": TransactionResult.MAJORITY_DISAGREE,
  "3": TransactionResult.MAJORITY_TIMEOUT,
  "4": TransactionResult.DETERMINISTIC_VIOLATION,
  "5": TransactionResult.NO_MAJORITY,
};

export const TransactionResultNameToNumber = {
  [TransactionResult.IDLE]: "0",
  [TransactionResult.MAJORITY_AGREE]: "1",
  [TransactionResult.MAJORITY_DISAGREE]: "2",
  [TransactionResult.MAJORITY_TIMEOUT]: "3",
  [TransactionResult.DETERMINISTIC_VIOLATION]: "4",
  [TransactionResult.NO_MAJORITY]: "5",
};

export enum ExecutionResult {
  NOT_VOTED = "NOT_VOTED",
  FINISHED_WITH_RETURN = "FINISHED_WITH_RETURN",
  FINISHED_WITH_ERROR = "FINISHED_WITH_ERROR",
  TIMEOUT = "TIMEOUT",
  NONDET_DISAGREE = "NONDET_DISAGREE",
  DETERMINISTIC_VIOLATION = "DETERMINISTIC_VIOLATION",
}

export const executionResultNumberToName = {
  "0": ExecutionResult.NOT_VOTED,
  "1": ExecutionResult.FINISHED_WITH_RETURN,
  "2": ExecutionResult.FINISHED_WITH_ERROR,
  "3": ExecutionResult.TIMEOUT,
  "4": ExecutionResult.NONDET_DISAGREE,
  "5": ExecutionResult.DETERMINISTIC_VIOLATION,
};

export enum VoteType {
  NOT_VOTED = "NOT_VOTED",
  FINISHED_WITH_RETURN = "FINISHED_WITH_RETURN",
  FINISHED_WITH_ERROR = "FINISHED_WITH_ERROR",
  TIMEOUT = "TIMEOUT",
  NONDET_DISAGREE = "NONDET_DISAGREE",
  DETERMINISTIC_VIOLATION = "DETERMINISTIC_VIOLATION",
}

export const voteTypeNumberToName = {
  "0": VoteType.NOT_VOTED,
  "1": VoteType.FINISHED_WITH_RETURN,
  "2": VoteType.FINISHED_WITH_ERROR,
  "3": VoteType.TIMEOUT,
  "4": VoteType.NONDET_DISAGREE,
  "5": VoteType.DETERMINISTIC_VIOLATION,
};

export const voteTypeNameToNumber = {
  [VoteType.NOT_VOTED]: "0",
  [VoteType.FINISHED_WITH_RETURN]: "1",
  [VoteType.FINISHED_WITH_ERROR]: "2",
  [VoteType.TIMEOUT]: "3",
  [VoteType.NONDET_DISAGREE]: "4",
  [VoteType.DETERMINISTIC_VIOLATION]: "5",
};

export type TransactionType = "deploy" | "call";

export enum TransactionHashVariant {
  LATEST_FINAL = "latest-final",
  LATEST_NONFINAL = "latest-nonfinal",
}

export type TransactionReceiptWaitUntil = "decided" | "finalized";

export type TransactionProcessingPhase =
  | "uninitialized"
  | "pending"
  | "proposing"
  | "committing"
  | "revealing"
  | "appeal-revealing"
  | "appeal-committing"
  | "leader-revealing";

export type TransactionDecisionOutcome =
  | "accepted"
  | "undetermined"
  | "validators-timeout"
  | "leader-timeout";

/** Consumer-oriented lifecycle derived only from the persisted transaction state. */
export type TransactionLifecycle =
  | {state: "processing"; phase: TransactionProcessingPhase}
  | {state: "decided"; outcome: TransactionDecisionOutcome}
  /** Outcome is omitted when the retained result cannot prove the pre-finalized decision. */
  | {state: "finalized"; outcome?: TransactionDecisionOutcome}
  | {state: "canceled"};

/**
 * Arguments for the advanced protocol lifecycle read. `timestamp` is a Unix
 * timestamp; omitting it evaluates the lifecycle at the node or block time.
 */
export type TransactionProtocolLifecycleArgs = {
  hash: TransactionHash;
  timestamp?: number;
};

/**
 * Advanced protocol lifecycle normalized across Studio and contract networks.
 * `resolutionAction === "Finalize"` is the protocol's finalization capability;
 * finalization is not a transaction status or a separate readiness flag.
 */
export type TransactionProtocolLifecycle = {
  storedStatus: TransactionProtocolStatus;
  storedStatusCode: number;
  projectedStatus: TransactionProtocolStatus;
  projectedStatusCode: number;
  resolutionAction: TransactionResolutionAction;
  resolutionActionCode: number;
  resolutionSource: TransactionResolutionSource;
  resolutionSourceCode: number;
  decisionId: string | null;
  decisionActive: boolean;
  evaluatedAt: number;
};

const finalizedOutcomeFromResult = (
  result: TransactionResult | number | undefined,
): TransactionDecisionOutcome | undefined => {
  const resultName = typeof result === "number"
    ? transactionResultNumberToName[String(result) as keyof typeof transactionResultNumberToName]
    : result;

  switch (resultName) {
    case TransactionResult.MAJORITY_AGREE:
      return "accepted";
    case TransactionResult.MAJORITY_TIMEOUT:
      return "validators-timeout";
    case TransactionResult.MAJORITY_DISAGREE:
    case TransactionResult.DETERMINISTIC_VIOLATION:
    case TransactionResult.NO_MAJORITY:
      return "undetermined";
    default:
      // IDLE does not distinguish a finalized leader timeout from every other
      // result-less path, so the SDK must not invent an outcome for it.
      return undefined;
  }
};

/** Maps the exact stored protocol status to the non-projecting public lifecycle. */
export const transactionLifecycleFromStoredStatus = (
  status: TransactionStatus | number,
  result?: TransactionResult | number,
): TransactionLifecycle => {
  const statusName = typeof status === "number"
    ? transactionsStatusNumberToName[String(status) as keyof typeof transactionsStatusNumberToName]
    : status;

  switch (statusName) {
    case TransactionStatus.UNINITIALIZED:
      return {state: "processing", phase: "uninitialized"};
    case TransactionStatus.PENDING:
      return {state: "processing", phase: "pending"};
    case TransactionStatus.PROPOSING:
      return {state: "processing", phase: "proposing"};
    case TransactionStatus.COMMITTING:
      return {state: "processing", phase: "committing"};
    case TransactionStatus.REVEALING:
      return {state: "processing", phase: "revealing"};
    case TransactionStatus.APPEAL_REVEALING:
      return {state: "processing", phase: "appeal-revealing"};
    case TransactionStatus.APPEAL_COMMITTING:
      return {state: "processing", phase: "appeal-committing"};
    case TransactionStatus.LEADER_REVEALING:
      return {state: "processing", phase: "leader-revealing"};
    case TransactionStatus.ACCEPTED:
      return {state: "decided", outcome: "accepted"};
    case TransactionStatus.UNDETERMINED:
      return {state: "decided", outcome: "undetermined"};
    case TransactionStatus.VALIDATORS_TIMEOUT:
      return {state: "decided", outcome: "validators-timeout"};
    case TransactionStatus.LEADER_TIMEOUT:
      return {state: "decided", outcome: "leader-timeout"};
    case TransactionStatus.FINALIZED: {
      const outcome = finalizedOutcomeFromResult(result);
      return outcome ? {state: "finalized", outcome} : {state: "finalized"};
    }
    case TransactionStatus.CANCELED:
      return {state: "canceled"};
    default:
      throw new Error(`Unknown stored transaction status: ${String(status)}`);
  }
};

/** Full public round shape reconstructed from bounded train reads. */
export interface ConsensusRoundData {
  round: bigint;
  leaderIndex: bigint;
  votesCommitted: bigint;
  votesRevealed: bigint;
  appealBond: bigint;
  rotationsLeft: bigint;
  result: number;
  roundValidators: Address[];
  validatorVotes: number[];
  validatorVotesHash: Hash[];
  validatorResultHash: Hash[];
}

/** Legacy tuple shape returned by getLastRoundData, with named properties retained. */
export type ConsensusLastRoundData = [round: bigint, roundData: ConsensusRoundData] & {
  round: bigint;
  roundData: ConsensusRoundData;
};

export enum MessageType {
  External = 0,
  Internal = 1,
}

export type FeesDistribution = {
  leaderTimeunitsAllocation: bigint;
  validatorTimeunitsAllocation: bigint;
  appealRounds: bigint;
  executionBudgetPerRound: bigint;
  executionConsumed: bigint;
  totalMessageFees: bigint;
  rotations: bigint[];
  maxPriceGenPerTimeUnit: bigint;
  storageFeeMaxGasPrice: bigint;
  receiptFeeMaxGasPrice: bigint;
};

export type FeesDistributionInput = {
  leaderTimeunitsAllocation?: BigNumberish;
  validatorTimeunitsAllocation?: BigNumberish;
  appealRounds?: BigNumberish;
  executionBudgetPerRound?: BigNumberish;
  executionConsumed?: BigNumberish;
  totalMessageFees?: BigNumberish;
  rotations?: BigNumberish[];
  maxPriceGenPerTimeUnit?: BigNumberish;
  storageFeeMaxGasPrice?: BigNumberish;
  receiptFeeMaxGasPrice?: BigNumberish;
};

export type InternalMessageFeeParamsInput = {
  leaderTimeunitsAllocation?: BigNumberish;
  validatorTimeunitsAllocation?: BigNumberish;
  appealRounds?: BigNumberish;
  executionBudgetPerRound?: BigNumberish;
  rotations?: BigNumberish[];
  maxPriceGenPerTimeUnit?: BigNumberish;
  storageFeeMaxGasPrice?: BigNumberish;
  receiptFeeMaxGasPrice?: BigNumberish;
};

export type ExternalMessageFeeParamsInput = {
  gasLimit?: BigNumberish;
  maxGasPrice?: BigNumberish;
};

export type MessageFeeAllocationNode = {
  messageType: MessageType;
  onAcceptance: boolean;
  parentIndex: bigint;
  recipient: Address;
  callKey: Hex;
  budget: bigint;
  feeParams: Hex;
};

export type MessageFeeAllocationInput = {
  messageType: MessageType;
  onAcceptance?: boolean;
  parentIndex?: BigNumberish;
  recipient: Address;
  callKey?: Hex;
  budget?: BigNumberish;
  feeParams?: Hex;
};

export type TransactionFeeOptions = {
  distribution?: FeesDistributionInput;
  messageAllocations?: MessageFeeAllocationInput[];
  feeValue?: BigNumberish;
};

export type FeePolicyQuote = {
  enabled: boolean;
  genPerTimeUnit: bigint;
  storageUnitPrice: bigint;
  receiptGasPrice: bigint;
  executionBudgetFloor: bigint;
  /** Combined developer/DAO share, grossed up over taxable time-unit work. */
  timeUnitOverlayBps?: bigint;
};

export type FeeEstimateOptions = FeesDistributionInput & {
  /**
   * Basis-points multiplier applied to current network prices when filling
   * unset cap fields. Defaults to 12000 (20% headroom).
   */
  priceCapHeadroomBps?: BigNumberish;
  messageAllocations?: MessageFeeAllocationInput[];
};

export type TransactionFeeEstimate = {
  distribution: FeesDistribution;
  messageAllocations?: MessageFeeAllocationInput[];
  feeValue: bigint;
  policy: FeePolicyQuote;
  observed?: SimulationFeeUsage;
};

export type SimulateWriteContractReceipt = Record<string, unknown>;

export type StudioExecutionFeeReportMessage = {
  messageFeeMode?: "mode1" | "mode2" | "external";
  messageType: "External" | "Internal";
  recipient: Address;
  value: BigNumberish;
  dataBytes: BigNumberish;
  onAcceptance: boolean;
  saltNonce: BigNumberish;
  feeParams?: Hex;
  feeParamsDecoded?: InternalMessageFeeParamsInput | ExternalMessageFeeParamsInput | null;
  feeParamsBytes: BigNumberish;
  declaredBudget: BigNumberish;
  allocationSubtree?: Hex;
  allocationSubtreeBytes: BigNumberish;
  callKey: Hex;
};

export type StudioGenvmFeeBucket = {
  index?: BigNumberish;
  name?: string;
  consumed?: BigNumberish;
};

export type StudioGenvmFeeBucketReport = {
  receiptAndNondetOutput?: BigNumberish;
  storage?: BigNumberish;
  message?: BigNumberish;
  totalExecution?: BigNumberish;
  totalWithMessage?: BigNumberish;
  executionBudgetPerRound?: BigNumberish;
  executionBudgetRemaining?: BigNumberish;
  executionBudgetOverrun?: BigNumberish;
  executionBudgetExceeded?: boolean;
  buckets?: StudioGenvmFeeBucket[];
};

export type StudioExecutionFeeReport = {
  receiptGasPrice?: BigNumberish;
  budgetExhaustionReason?: string | null;
  proposalReceipt?: {
    eqBlocksOutputsLength: BigNumberish;
    receiptBytes: BigNumberish;
    estimatedGas: BigNumberish;
    fee: BigNumberish;
  };
  messageReveal?: {
    messageBytes: BigNumberish;
    messageCount: BigNumberish;
    estimatedGas: BigNumberish;
    fee: BigNumberish;
    consensusAdditionalGas?: BigNumberish;
    consensusAdditionalFee?: BigNumberish;
    studioFixedOverheadGas?: BigNumberish;
    studioFixedOverheadFee?: BigNumberish;
    messages?: StudioExecutionFeeReportMessage[];
  };
  genvmBuckets?: StudioGenvmFeeBucketReport;
  chargeableExecution?: StudioGenvmFeeBucketReport;
  executionMetering?: {
    chargeableExecutionFee?: BigNumberish;
    genvmReportedExecution?: BigNumberish;
    genvmDeltaFromChargeable?: BigNumberish;
  };
  messageFees?: {
    budget?: BigNumberish;
    declaredConsumed?: BigNumberish;
    genvmMeteredConsumed?: BigNumberish;
    externalReserved?: BigNumberish;
    externalReimbursed?: BigNumberish;
    externalRemainder?: BigNumberish;
    totalConsumed?: BigNumberish;
    declaredRefunded?: BigNumberish;
    remaining?: BigNumberish;
    meteringDelta?: BigNumberish;
    reportedTotal?: BigNumberish;
  };
  totalEstimatedFee?: BigNumberish;
  totalStudioMeteredFee?: BigNumberish;
};

export type StudioFeeAccounting = Record<string, unknown> & {
  paid_fee_value?: BigNumberish;
  required_fee_value?: BigNumberish;
  primary_fee_required?: BigNumberish;
  primary_fee_budget?: BigNumberish;
  primary_fee_spent?: BigNumberish;
  primary_fee_refunded?: BigNumberish;
  execution_budget_total?: BigNumberish;
  execution_fee_consumed?: BigNumberish;
  execution_fee_consumed_buckets?: BigNumberish[];
  genvm_fee_consumed_buckets?: BigNumberish[];
  genvm_fee_bucket_report?: StudioGenvmFeeBucketReport;
  genvm_message_fee_consumed?: BigNumberish;
  message_fee_budget?: BigNumberish;
  message_fee_consumed?: BigNumberish;
  message_fee_refunded?: BigNumberish;
  external_message_fee_reserved?: BigNumberish;
  external_message_fee_reimbursed?: BigNumberish;
  external_message_fee_remainder?: BigNumberish;
  appeal_bonds_total?: BigNumberish;
  total_refunded?: BigNumberish;
  fees_distribution?: FeesDistributionInput;
  message_allocations?: MessageFeeAllocationInput[];
  execution_fee_report?: StudioExecutionFeeReport;
};

export type SimulateWriteContractResult<
  RawReturn extends boolean | undefined = undefined,
> = {
  result: RawReturn extends true ? Hex : CalldataEncodable;
  receipt: SimulateWriteContractReceipt;
  feeAccounting?: StudioFeeAccounting;
  feeReport?: StudioExecutionFeeReport;
};

export type SimulationFeeUsage = {
  executionFeeConsumed: bigint;
  executionFeeReportTotal: bigint;
  recommendedExecutionBudgetPerRound: bigint;
  genvmMessageFeeConsumed: bigint;
  messageFeeBudget: bigint;
  messageFeeConsumed: bigint;
  messageFeeRefunded: bigint;
  internalDeclaredBudget: bigint;
  externalMessageReserved: bigint;
  externalMessageReimbursed: bigint;
  externalMessageRemainder: bigint;
  recommendedTotalMessageFees: bigint;
};

export type SimulationFeeEstimateOptions = FeeEstimateOptions & {
  simulation: Pick<
    SimulateWriteContractResult<boolean | undefined>,
    "feeAccounting" | "feeReport"
  >;
  /**
   * Basis-points multiplier applied to observed execution fee usage.
   * Defaults to 12000 (20% headroom).
   */
  executionHeadroomBps?: BigNumberish;
  /**
   * Basis-points multiplier applied to observed mode-1 message fee usage.
   * Defaults to 12000 (20% headroom).
   */
  messageHeadroomBps?: BigNumberish;
};

export type WriteFeeEstimateOptions = FeeEstimateOptions & {
  account?: Account;
  address: Address;
  functionName: string;
  args?: CalldataEncodable[];
  kwargs?: Map<string, CalldataEncodable> | {[key: string]: CalldataEncodable};
  value?: BigNumberish;
  leaderOnly?: boolean;
  transactionHashVariant?: TransactionHashVariant;
  /**
   * Basis-points multiplier applied to observed execution fee usage.
   * Defaults to 12000 (20% headroom).
   */
  executionHeadroomBps?: BigNumberish;
  /**
   * Basis-points multiplier applied to observed mode-1 message fee usage.
   * Defaults to 12000 (20% headroom).
   */
  messageHeadroomBps?: BigNumberish;
};

export type DecodedDeployData = {
  code?: Hex;
  constructorArgs?: any; // Type this more strictly if possible
  leaderOnly?: boolean;
  type?: TransactionType;
  contractAddress?: Address;
};

export type DecodedCallData = {
  callData?: any; // Type this more strictly if possible
  leaderOnly?: boolean;
  type: TransactionType;
};

export type DebugTraceResult = {
  transaction_id: string;
  result_code: number;
  return_data: string;
  stdout: string;
  stderr: string;
  genvm_log: Record<string, unknown>[];
  storage_proof: string;
  run_time: string;
  eq_outputs: string[];
  stored_at?: string;
};

export interface LeaderReceipt {
  calldata: string;
  class_name: string;
  contract_state: string;
  eq_outputs: Record<string, unknown>;
  error: string | null;
  execution_result: string;
  gas_used: number;
  mode: string;
  node_config: Record<string, unknown>;
  pending_transactions: unknown[];
  vote: string;
  result: string;
}

// TODO: make localnet compatible with testnet and unify the types
export type GenLayerTransaction = {
  // currentTimestamp: testnet
  currentTimestamp?: string;

  // from_address: localnet // sender: testnet
  from_address?: Address;
  sender?: Address;

  // to_address: localnet // recipient: testnet
  to_address?: Address;
  recipient?: Address;

  // numOfInitialValidators: testnet
  numOfInitialValidators?: string;
  /** Train maximum rotations, distinct from the initial committee size. */
  initialRotations?: bigint;

  // txSlot: testnet
  txSlot?: string;

  // createdTimestamp: testnet
  createdTimestamp?: string;

  // lastVoteTimestamp: testnet
  lastVoteTimestamp?: string;

  // randomSeed: testnet
  randomSeed?: Hash;

  // result: testnet
  result?: number;
  resultName?: TransactionResult;

  // txExecutionResult: testnet (from getTransactionAllData)
  txExecutionResult?: number;
  txExecutionResultName?: ExecutionResult;

  // data: localnet // txData: testnet
  data?: Record<string, unknown>;
  txData?: Hex;
  txDataDecoded?: DecodedDeployData | DecodedCallData;
  /** Authoritative execution hash retained by the train. */
  txExecutionHash?: Hash;
  eqBlocksOutputs?: Hex;
  /** Legacy receipt bytes; unavailable on the train. */
  txReceipt?: Hex;

  // messages: testnet
  messages?: unknown[];
  consumedValidators?: Address[];

  // queueType: testnet
  queueType?: number;

  // queuePosition: testnet
  queuePosition?: string;

  // activator: testnet
  activator?: Address;

  // lastLeader: testnet
  lastLeader?: Address;

  // status: localnet: TransactionStatus // status: testnet: number
  /** Exact lifecycle status persisted by the transaction manager. */
  status?: TransactionStatus | number;
  /** Named form of the exact persisted lifecycle status. */
  statusName?: TransactionStatus;
  /** Simple lifecycle derived from `status`; it never uses timestamp projection. */
  lifecycle: TransactionLifecycle;

  // hash: localnet // txId: testnet// hash: localnet // txId: testnet
  hash?: TransactionHash;
  txId?: TransactionHash;

  // readStateBlockRange: testnet
  readStateBlockRange?: {
    activationBlock: string;
    processingBlock: string;
    proposalBlock: string;
  };

  // numOfRounds: testnet
  numOfRounds?: string;

  // lastRound: testnet
  lastRound?: {
    round: string;
    leaderIndex: string;
    votesCommitted: string;
    votesRevealed: string;
    appealBond: string;
    rotationsLeft: string;
    result: number;
    roundValidators: Address[];
    validatorVotesHash: Hash[];
    validatorResultHash: Hash[];
    validatorVotes: number[];
    validatorVotesName: VoteType[];
  };

  // consensus_data: localnet // leader_receipt: testnet
  consensus_data?: {
    final: boolean;
    leader_receipt?: LeaderReceipt[];
    validators?: Record<string, unknown>[];
    votes?: Record<string, string>;
  };
  nonce?: number;
  value?: number;
  type?: number;
  gaslimit?: bigint;
  created_at?: Date;
  r?: number;
  s?: number;
  v?: number;
};

export type GenLayerRawTransaction = {
  observedAt: bigint;
  sender: Address;
  recipient: Address;
  initialRotations: bigint;
  numOfInitialValidators: bigint;
  txSlot: bigint;
  createdTimestamp: bigint;
  lastVoteTimestamp: bigint;
  randomSeed: Hash;
  result: number;
  txExecutionResult?: number;
  txExecutionHash: Hash;
  txCalldata: Hex;
  eqBlocksOutputs: Hex;
  messages: unknown[];
  consumedValidators: Address[];
  queueType: number;
  queuePosition: bigint;
  activator: Address;
  lastLeader: Address;
  status: number;
  txId: Hash;
  readStateBlockRange: {
    activationBlock: bigint;
    processingBlock: bigint;
    proposalBlock: bigint;
  };
  numOfRounds: bigint;
  lastRound: {
    round: bigint;
    leaderIndex: bigint;
    votesCommitted: bigint;
    votesRevealed: bigint;
    appealBond: bigint;
    rotationsLeft: bigint;
    result: number;
    roundValidators: Address[];
    validatorVotesHash: Hash[];
    validatorResultHash: Hash[];
    validatorVotes: number[];
  };
};
