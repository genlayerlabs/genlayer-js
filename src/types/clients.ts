import {Transport, Client, PublicActions, WalletActions, TransactionReceipt} from "viem";
import {
  GenLayerTransaction,
  TransactionHash,
  TransactionStatus,
  TransactionReceiptWaitUntil,
  TransactionHashVariant,
  DebugTraceResult,
  TransactionFeeOptions,
  TransactionFeeEstimate,
  FeeEstimateOptions,
  SimulationFeeEstimateOptions,
  WriteFeeEstimateOptions,
  FeePolicyQuote,
  BigNumberish,
  FeesDistributionInput,
  SimulateWriteContractResult,
  ConsensusRoundData,
  ConsensusLastRoundData,
  TransactionProtocolLifecycle,
  TransactionProtocolLifecycleArgs,
} from "./transactions";
import {GenLayerChain} from "./chains";
import {Address, Account} from "./accounts";
import {CalldataEncodable} from "./calldata";
import {ContractSchema, DeveloperNft} from "./contracts";
import {Network} from "./network";
import {SnapSource} from "@/types/snapSource";
import {MetaMaskClientResult} from "@/types/metamaskClientResult";
import {StakingActions} from "./staking";
import {VestingActions} from "./vesting";

export type GenLayerMethod =
  | {method: "sim_fundAccount"; params: [address: Address, amount: number]}
  | {method: "eth_getTransactionByHash"; params: [hash: TransactionHash]}
  | {method: "eth_call"; params: [requestParams: any, blockNumberOrHash: string]}
  | {method: "eth_sendRawTransaction"; params: [signedTransaction: string]}
  | {method: "gen_getContractSchema"; params: [address: Address] | [{address: Address}] | [{code: string}]}
  | {method: "gen_getContractSchemaForCode"; params: [contractCode: string]}
  | {method: "gen_getContractCode"; params: [address: Address] | [{address: Address}]}
  | {method: "gen_getTransactionLifecycle"; params: [{txId: TransactionHash; timestamp?: number}]}
  | {method: "gen_estimateLatestAppealCharge"; params: [{txId: TransactionHash}]}
  | {method: "sim_getTransactionsForAddress"; params: [address: Address, filter?: "all" | "from" | "to"]}
  | {method: "eth_getTransactionCount"; params: [address: Address, block: string]}
  | {method: "eth_estimateGas"; params: [transactionParams: any]}
  | {method: "gen_call"; params: [requestParams: any]}
  | {method: "sim_call"; params: [requestParams: any]}
  | {method: "sim_estimateTransactionFees"; params: [requestParams: any]}
  | {method: "sim_cancelTransaction"; params: [hash: TransactionHash, signature?: string, adminKey?: string]}
  | {method: "sim_getFeeConfig"; params: []};

/*
  The action factories below describe the slice of the client each one actually
  touches, so the composition in `createClient` type-checks step by step instead
  of being laundered through `as unknown as GenLayerClient<GenLayerChain>` at
  every hop.
*/

/**
 * The RPC surface the action factories call.
 *
 * This is deliberately *not* `GenLayerClient["request"]`: that type is an
 * intersection with a GenLayer-specific overload, and no viem client satisfies
 * it structurally, which is why every call site previously needed a cast. The
 * factories cast their own results anyway, so accepting both call shapes here
 * keeps the checks that do matter (method names, argument shapes) while letting
 * the chain compose.
 */
export type ClientRequestFn = {
  <TMethod extends GenLayerMethod>(
    args: Extract<GenLayerMethod, {method: TMethod["method"]}>,
  ): Promise<unknown>;
  (args: {method: string; params?: unknown}): Promise<unknown>;
};

/** `request`, `account` and `chain`: enough for read-only RPC-backed actions. */
export type ClientRequester = {
  request: ClientRequestFn;
  account?: GenLayerClient<GenLayerChain>["account"];
  chain: GenLayerChain;
};

/** Adds the GenLayer-typed `getTransaction` the receipt actions poll with. */
export type TransactionReader = ClientRequester & {
  getTransaction: GenLayerClient<GenLayerChain>["getTransaction"];
};

/**
 * What `transactionActions` reads from the client it is handed.
 *
 * It calls the underlying `getTransaction` and then installs its own
 * GenLayer-typed override as a returned method, so the input cannot be typed as
 * the override it produces. Studio answers with a mutable record carrying a
 * string `status` and a `result`, not viem's decoded transaction, and the
 * action rewrites those fields in place before decoding.
 */
export type RawTransactionRead = {
  status?: unknown;
  statusName?: unknown;
  result?: unknown;
  triggered_transactions?: unknown;
  [key: string]: unknown;
};

export type TransactionActionInput = ClientRequester & {
  getTransaction: (args: {hash: TransactionHash}) => Promise<RawTransactionRead>;
};

/** Adds the custom write helpers used by the contract actions. */
export type ContractWriter = ClientRequester & {
  estimateTransactionGas: GenLayerClient<GenLayerChain>["estimateTransactionGas"];
  getCurrentNonce: GenLayerClient<GenLayerChain>["getCurrentNonce"];
  sendRawTransaction: WalletActions<GenLayerChain>["sendRawTransaction"];
};

/** `connect` reassigns `chain`, so the wallet actions need it writable. */
export type ChainSwitcher = {
  chain: GenLayerChain;
};

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
      value?: bigint;
      leaderOnly?: boolean;
      consensusMaxRotations?: number;
      validUntil?: BigNumberish;
      fees?: TransactionFeeOptions;
    }) => Promise<any>;
    simulateWriteContract: <
      RawReturn extends boolean | undefined = undefined,
      IncludeReceipt extends boolean | undefined = undefined,
    >(args: {
      account?: Account;
      address: Address;
      functionName: string;
      args?: CalldataEncodable[];
      kwargs?: Map<string, CalldataEncodable> | { [key: string]: CalldataEncodable };
      rawReturn?: RawReturn;
      includeReceipt?: IncludeReceipt;
      value?: BigNumberish;
      leaderOnly?: boolean;
      fees?: TransactionFeeOptions;
      transactionHashVariant?: TransactionHashVariant;
    }) => Promise<IncludeReceipt extends true
      ? SimulateWriteContractResult<RawReturn>
      : RawReturn extends true ? `0x${string}` : CalldataEncodable>;
    deployContract: (args: {
      account?: Account;
      code: string | Uint8Array;
      args?: CalldataEncodable[];
      kwargs?: Map<string, CalldataEncodable> | {[key: string]: CalldataEncodable};
      leaderOnly?: boolean;
      consensusMaxRotations?: number;
      validUntil?: BigNumberish;
      fees?: TransactionFeeOptions;
    }) => Promise<`0x${string}`>;
    getTransaction: (args: {hash: TransactionHash}) => Promise<GenLayerTransaction>;
    advanced: {
      /** Protocol lifecycle read with projection and resolution action details. */
      getTransactionLifecycle: (args: TransactionProtocolLifecycleArgs) => Promise<TransactionProtocolLifecycle>;
    };
    getCurrentNonce: (args: {address: Address}) => Promise<number>;
    transfer: (args: {to: Address; value: bigint}) => Promise<TransactionReceipt>;
    estimateTransactionGas: (transactionParams: {
      from?: Address;
      to: Address;
      data?: `0x${string}`;
      value?: bigint;
    }) => Promise<bigint>;
    waitForTransactionReceipt: (args: {
      hash: TransactionHash;
      /** @deprecated Use waitUntil: "decided" or waitUntil: "finalized" instead. */
      status?: TransactionStatus;
      waitUntil?: TransactionReceiptWaitUntil;
      interval?: number;
      retries?: number;
      fullTransaction?: boolean;
    }) => Promise<GenLayerTransaction>;
    waitForDecision: (args: {
      hash: TransactionHash;
      interval?: number;
      retries?: number;
      fullTransaction?: boolean;
    }) => Promise<GenLayerTransaction>;
    waitForFinalization: (args: {
      hash: TransactionHash;
      interval?: number;
      retries?: number;
      fullTransaction?: boolean;
    }) => Promise<GenLayerTransaction>;
    getContractSchema: (address: Address) => Promise<ContractSchema>;
    getContractSchemaForCode: (contractCode: string | Uint8Array) => Promise<ContractSchema>;
    getContractCode: (address: Address) => Promise<string>;
    /** @deprecated This method is deprecated. The consensus contract is now resolved from the static chain definition. */
    initializeConsensusSmartContract: (forceReset?: boolean) => Promise<void>;
    connect: (network?: Network, snapSource?: SnapSource) => Promise<void>;
    metamaskClient: (snapSource?: SnapSource) => Promise<MetaMaskClientResult>;
    getTriggeredTransactionIds: (args: {hash: TransactionHash}) => Promise<TransactionHash[]>;
    debugTraceTransaction: (args: {hash: TransactionHash; round?: number}) => Promise<DebugTraceResult>;
    getTransactionQueuePosition: (args: {hash: TransactionHash}) => Promise<number>;
    cancelTransaction: (args: {hash: TransactionHash}) => Promise<{transaction_hash: string; status: string}>;
    getRoundNumber: (args: {txId: `0x${string}`}) => Promise<bigint>;
    getRoundData: (args: {txId: `0x${string}`; round: bigint}) => Promise<ConsensusRoundData>;
    getLastRoundData: (args: {txId: `0x${string}`}) => Promise<ConsensusLastRoundData>;
    canAppeal: (args: {txId: `0x${string}`}) => Promise<boolean>;
    getDeveloperNft: (args: {developer: Address}) => Promise<DeveloperNft | null>;
    getClaimableRewardsFromFees: (args: {nftId: BigNumberish}) => Promise<bigint>;
    getClaimableRewardsFromInflation: (args: {
      nftId: BigNumberish;
      numberOfEpochsToClaim: BigNumberish;
    }) => Promise<bigint>;
    claimNftRewards: (args: {
      account?: Account;
      nftId: BigNumberish;
    }) => Promise<`0x${string}`>;
    claimNftEpochs: (args: {
      account?: Account;
      nftId: BigNumberish;
      numberOfEpochsToClaim: BigNumberish;
    }) => Promise<`0x${string}`>;
    appealTransaction: (args: {
      account?: Account;
      txId: `0x${string}`;
      value?: bigint;
    }) => Promise<any>;
    topUpFees: (args: {
      account?: Account;
      txId: `0x${string}`;
      distribution: FeesDistributionInput;
      value: bigint;
    }) => Promise<`0x${string}`>;
    topUpAndSubmitAppeal: (args: {
      account?: Account;
      txId: `0x${string}`;
      distribution: FeesDistributionInput;
      value?: bigint;
    }) => Promise<`0x${string}`>;
    finalizeTransaction: (args: {
      account?: Account;
      txId: `0x${string}`;
    }) => Promise<`0x${string}`>;
    finalizeIdlenessTxs: (args: {
      account?: Account;
      txIds: readonly `0x${string}`[];
    }) => Promise<`0x${string}`>;
    resolveTransactions: (args: {
      account?: Account;
      txIds: readonly `0x${string}`[];
    }) => Promise<`0x${string}`>;
    finalizeDecisions: (args: {
      account?: Account;
      txIds: readonly `0x${string}`[];
    }) => Promise<`0x${string}`>;
    getAppealCharge: (args: {txId: `0x${string}`}) => Promise<bigint>;
    /** @deprecated Use getAppealCharge. This alias returns bond plus appeal funding. */
    getMinAppealBond: (args: {txId: `0x${string}`}) => Promise<bigint>;
    getCurrentFeePolicy: () => Promise<FeePolicyQuote>;
    estimateFeesDistribution: (args?: FeeEstimateOptions) => Promise<TransactionFeeEstimate["distribution"]>;
    estimateTransactionFees: (args?: FeeEstimateOptions) => Promise<TransactionFeeEstimate>;
    estimateTransactionFeesFromSimulation: (args: SimulationFeeEstimateOptions) => Promise<TransactionFeeEstimate>;
    estimateTransactionFeesForWrite: (args: WriteFeeEstimateOptions) => Promise<TransactionFeeEstimate>;
  } & StakingActions & VestingActions;
