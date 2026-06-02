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
  READY_TO_FINALIZE = "READY_TO_FINALIZE",
  VALIDATORS_TIMEOUT = "VALIDATORS_TIMEOUT",
  LEADER_TIMEOUT = "LEADER_TIMEOUT",
}

export enum TransactionResult {
  SUCCESS = "SUCCESS",
  FAILURE = "FAILURE",
}

export enum TransactionResult {
  IDLE = "IDLE",
  AGREE = "AGREE",
  DISAGREE = "DISAGREE",
  TIMEOUT = "TIMEOUT",
  DETERMINISTIC_VIOLATION = "DETERMINISTIC_VIOLATION",
  NO_MAJORITY = "NO_MAJORITY",
  MAJORITY_AGREE = "MAJORITY_AGREE",
  MAJORITY_DISAGREE = "MAJORITY_DISAGREE",
}

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
  "11": TransactionStatus.READY_TO_FINALIZE,
  "12": TransactionStatus.VALIDATORS_TIMEOUT,
  "13": TransactionStatus.LEADER_TIMEOUT,
};

export const transactionsStatusNameToNumber = {
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
  [TransactionStatus.READY_TO_FINALIZE]: "11",
  [TransactionStatus.VALIDATORS_TIMEOUT]: "12",
  [TransactionStatus.LEADER_TIMEOUT]: "13",
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
  "1": TransactionResult.AGREE,
  "2": TransactionResult.DISAGREE,
  "3": TransactionResult.TIMEOUT,
  "4": TransactionResult.DETERMINISTIC_VIOLATION,
  "5": TransactionResult.NO_MAJORITY,
  "6": TransactionResult.MAJORITY_AGREE,
  "7": TransactionResult.MAJORITY_DISAGREE,
};

export const TransactionResultNameToNumber = {
  [TransactionResult.IDLE]: "0",
  [TransactionResult.AGREE]: "1",
  [TransactionResult.DISAGREE]: "2",
  [TransactionResult.TIMEOUT]: "3",
  [TransactionResult.DETERMINISTIC_VIOLATION]: "4",
  [TransactionResult.NO_MAJORITY]: "5",
  [TransactionResult.MAJORITY_AGREE]: "6",
  [TransactionResult.MAJORITY_DISAGREE]: "7",
};

export enum ExecutionResult {
  NOT_VOTED = "NOT_VOTED",
  FINISHED_WITH_RETURN = "FINISHED_WITH_RETURN",
  FINISHED_WITH_ERROR = "FINISHED_WITH_ERROR",
}

export const executionResultNumberToName = {
  "0": ExecutionResult.NOT_VOTED,
  "1": ExecutionResult.FINISHED_WITH_RETURN,
  "2": ExecutionResult.FINISHED_WITH_ERROR,
};

export enum VoteType {
  NOT_VOTED = "NOT_VOTED",
  AGREE = "AGREE",
  DISAGREE = "DISAGREE",
  TIMEOUT = "TIMEOUT",
  DETERMINISTIC_VIOLATION = "DETERMINISTIC_VIOLATION",
}

export const voteTypeNumberToName = {
  "0": VoteType.NOT_VOTED,
  "1": VoteType.AGREE,
  "2": VoteType.DISAGREE,
  "3": VoteType.TIMEOUT,
  "4": VoteType.DETERMINISTIC_VIOLATION,
};

export const voteTypeNameToNumber = {
  [VoteType.NOT_VOTED]: "0",
  [VoteType.AGREE]: "1",
  [VoteType.DISAGREE]: "2",
  [VoteType.TIMEOUT]: "3",
  [VoteType.DETERMINISTIC_VIOLATION]: "4",
};

export type TransactionType = "deploy" | "call";

export enum TransactionHashVariant {
  LATEST_FINAL = "latest-final",
  LATEST_NONFINAL = "latest-nonfinal",
}

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
  // txReceipt: testnet
  txReceipt?: Hash;

  // messages: testnet
  messages?: unknown[];

  // queueType: testnet
  queueType?: number;

  // queuePosition: testnet
  queuePosition?: string;

  // activator: testnet
  activator?: Address;

  // lastLeader: testnet
  lastLeader?: Address;

  // status: localnet: TransactionStatus // status: testnet: number
  status?: TransactionStatus | number;
  statusName?: TransactionStatus;

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
  currentTimestamp: bigint;
  sender: Address;
  recipient: Address;
  numOfInitialValidators?: bigint; // undefined on Bradbury — use `initialRotations` instead
  initialRotations?: bigint;       // Bradbury equivalent of `numOfInitialValidators`
  txSlot: bigint;
  createdTimestamp: bigint;
  lastVoteTimestamp: bigint;
  randomSeed: Hash;
  result: number;
  txExecutionResult?: number;
  txData: Hex | undefined | null;
  txReceipt: Hash;
  messages: unknown[];
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
    validatorVotes: number[];
  };
};
