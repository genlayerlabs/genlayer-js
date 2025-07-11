import {Hex} from "viem";
import {Address} from "./accounts";

export type Hash = `0x${string}` & {length: 66};
export type TransactionHash = Hash;

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
  IDLE = "IDLE",
  AGREE = "AGREE",
  DISAGREE = "DISAGREE",
  TIMEOUT = "TIMEOUT",
  DETERMINISTIC_VIOLATION = "DETERMINISTIC_VIOLATION",
  NO_MAJORITY = "NO_MAJORITY",
  MAJORITY_AGREE = "MAJORITY_AGREE",
  MAJORITY_DISAGREE = "MAJORITY_DISAGREE",
  SUCCESS = "SUCCESS",
  FAILURE = "FAILURE",
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
    leader_receipt?: {
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
    }[];
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
  numOfInitialValidators: bigint;
  txSlot: bigint;
  createdTimestamp: bigint;
  lastVoteTimestamp: bigint;
  randomSeed: Hash;
  result: number;
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
