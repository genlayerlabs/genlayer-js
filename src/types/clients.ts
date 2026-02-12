import {Transport, Client, PublicActions, WalletActions} from "viem";
import {GenLayerTransaction, TransactionHash, TransactionStatus, TransactionHashVariant} from "./transactions";
import {GenLayerChain} from "./chains";
import {Address, Account} from "./accounts";
import {CalldataEncodable} from "./calldata";
import {ContractSchema} from "./contracts";
import {Network} from "./network";
import {SnapSource} from "@/types/snapSource";
import {MetaMaskClientResult} from "@/types/metamaskClientResult";
import {StakingActions} from "./staking";
import {
  ConsensusEventStream,
  NewTransactionEvent,
  TransactionAcceptedEvent,
  TransactionActivatedEvent,
  TransactionUndeterminedEvent,
  TransactionLeaderTimeoutEvent,
  TransactionFinalizedEvent,
  AppealStartedEvent,
} from "@/types/subscriptions";

/**
 * Status codes from genCall execution
 */
export enum GenCallStatusCode {
  SUCCESS = 0,
  USER_ERROR = 1,
  VM_ERROR = 2,
  INTERNAL_ERROR = 3,
}

/**
 * Status from genCall execution
 */
export interface GenCallStatus {
  /** Status code indicating execution result */
  code: GenCallStatusCode;
  /** Human-readable status message */
  message: string;
}

/**
 * Event emitted during contract execution
 */
export interface GenCallEvent {
  /** Event topics as hex strings */
  topics: string[];
  /** Event data as hex string */
  data: string;
}

/**
 * Message submitted during contract execution
 */
export interface GenCallMessage {
  messageType: number;
  recipient: string;
  value: string;
  data: string;
  onAcceptance: boolean;
  saltNonce: string;
}

/**
 * Result from genCall method
 */
export interface GenCallResult {
  /** Execution result as hex string (without 0x prefix from RPC, prefixed by client) */
  data: `0x${string}`;
  /** Execution status */
  status: GenCallStatus;
  /** Equivalence outputs from non-deterministic operations (hex strings) */
  eqOutputs: string[];
  /** Standard output from contract execution */
  stdout: string;
  /** Standard error from contract execution */
  stderr: string;
  /** Logs from GenVM execution */
  logs: unknown[];
  /** Events emitted during execution */
  events: GenCallEvent[];
  /** Messages submitted during execution */
  messages: GenCallMessage[];
}

export type GenLayerMethod =
  | {method: "sim_fundAccount"; params: [address: Address, amount: number]}
  | {method: "eth_getTransactionByHash"; params: [hash: TransactionHash]}
  | {method: "eth_call"; params: [requestParams: any, blockNumberOrHash: string]}
  | {method: "eth_sendRawTransaction"; params: [signedTransaction: string]}
  | {method: "gen_getContractSchema"; params: [address: Address]}
  | {method: "gen_getContractSchemaForCode"; params: [contractCode: string]}
  | {method: "gen_getContractCode"; params: [address: Address]}
  | {method: "sim_getTransactionsForAddress"; params: [address: Address, filter?: "all" | "from" | "to"]}
  | {method: "eth_getTransactionCount"; params: [address: Address, block: string]}
  | {method: "eth_estimateGas"; params: [transactionParams: any]}
  | {method: "gen_call"; params: [requestParams: any]}
  | {method: "sim_cancelTransaction"; params: [hash: TransactionHash, signature?: string, adminKey?: string]};

/*
  Take all the properties from Client<Transport, TGenLayerChain>
  Remove getTransaction and readContract because they are redefined with custom implementations.
  Keep transport as it's needed for viem contract interactions (e.g., staking).
*/
export type GenLayerClient<TGenLayerChain extends GenLayerChain> = Omit<
  Client<Transport, TGenLayerChain>,
  "getTransaction" | "readContract"
> &
  Omit<WalletActions<TGenLayerChain>, "deployContract" | "writeContract"> &
  Omit<
    PublicActions<Transport, TGenLayerChain>,
    "readContract" | "getTransaction" | "waitForTransactionReceipt"
  > & {
    request: Client<Transport, TGenLayerChain>["request"] & {
      <TMethod extends GenLayerMethod>(
        args: Extract<GenLayerMethod, {method: TMethod["method"]}>,
      ): Promise<unknown>;
    };
    readContract: <RawReturn extends boolean | undefined>(args: {
      account?: Account;
      address: Address;
      functionName: string;
      args?: CalldataEncodable[];
      kwargs?: Map<string, CalldataEncodable> | {[key: string]: CalldataEncodable};
      rawReturn?: RawReturn;
      jsonSafeReturn?: boolean;
      transactionHashVariant?: TransactionHashVariant;
    }) => Promise<RawReturn extends true ? `0x${string}` : CalldataEncodable>;
    writeContract: (args: {
      account?: Account;
      address: Address;
      functionName: string;
      args?: CalldataEncodable[];
      kwargs?: Map<string, CalldataEncodable> | {[key: string]: CalldataEncodable};
      value: bigint;
      leaderOnly?: boolean;
      consensusMaxRotations?: number;
    }) => Promise<any>;
    simulateWriteContract: <RawReturn extends boolean | undefined>(args: {
      account?: Account;
      address: Address;
      functionName: string;
      args?: CalldataEncodable[];
      kwargs?: Map<string, CalldataEncodable> | { [key: string]: CalldataEncodable };
      rawReturn?: RawReturn;
      leaderOnly?: boolean;
      transactionHashVariant?: TransactionHashVariant;
    }) => Promise<RawReturn extends true ? `0x${string}` : CalldataEncodable>;
    deployContract: (args: {
      account?: Account;
      code: string | Uint8Array;
      args?: CalldataEncodable[];
      kwargs?: Map<string, CalldataEncodable> | {[key: string]: CalldataEncodable};
      leaderOnly?: boolean;
      consensusMaxRotations?: number;
    }) => Promise<`0x${string}`>;
    getTransaction: (args: {hash: TransactionHash}) => Promise<GenLayerTransaction>;
    getCurrentNonce: (args: {address: Address}) => Promise<number>;
    estimateTransactionGas: (transactionParams: {
      from?: Address;
      to: Address;
      data?: `0x${string}`;
      value?: bigint;
    }) => Promise<bigint>;
    waitForTransactionReceipt: (args: {
      hash: TransactionHash;
      status?: TransactionStatus;
      interval?: number;
      retries?: number;
    }) => Promise<GenLayerTransaction>;
    getContractSchema: (address: Address) => Promise<ContractSchema>;
    getContractSchemaForCode: (contractCode: string | Uint8Array) => Promise<ContractSchema>;
    getContractCode: (address: Address) => Promise<string>;
    initializeConsensusSmartContract: (forceReset?: boolean) => Promise<void>;
    connect: (network?: Network, snapSource?: SnapSource) => Promise<void>;
    metamaskClient: (snapSource?: SnapSource) => Promise<MetaMaskClientResult>;
    cancelTransaction: (args: {hash: TransactionHash}) => Promise<{transaction_hash: string; status: string}>;
    appealTransaction: (args: {
      account?: Account;
      txId: `0x${string}`;
    }) => Promise<any>;
    genCall: (args: {
      type: "read" | "write" | "deploy";
      to: Address;
      from?: Address;
      data: `0x${string}`;
      leaderResults?: string[] | null;
      value?: bigint;
      gas?: bigint;
      blockNumber?: string;
      status?: "accepted" | "finalized";
    }) => Promise<GenCallResult>;
    subscribeToNewTransaction: () => ConsensusEventStream<NewTransactionEvent>;
    subscribeToTransactionAccepted: () => ConsensusEventStream<TransactionAcceptedEvent>;
    subscribeToTransactionActivated: () => ConsensusEventStream<TransactionActivatedEvent>;
    subscribeToTransactionUndetermined: () => ConsensusEventStream<TransactionUndeterminedEvent>;
    subscribeToTransactionLeaderTimeout: () => ConsensusEventStream<TransactionLeaderTimeoutEvent>;
    subscribeToTransactionFinalized: () => ConsensusEventStream<TransactionFinalizedEvent>;
    subscribeToAppealStarted: () => ConsensusEventStream<AppealStartedEvent>;
  } & StakingActions;
