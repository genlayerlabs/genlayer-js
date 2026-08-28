import * as calldata from "@/abi/calldata";
import {serialize} from "@/abi/transactions";
import {ADDRESS_MANAGER_ABI, NFT_MINTER_ABI} from "@/abi/nftMinter";

import {
  Account,
  ContractSchema,
  DeveloperNft,
  GenLayerChain,
  GenLayerClient,
  CalldataEncodable,
  Address,
  TransactionHashVariant,
  TransactionFeeOptions,
  TransactionFeeEstimate,
  FeeEstimateOptions,
  SimulationFeeEstimateOptions,
  SimulationFeeUsage,
  WriteFeeEstimateOptions,
  FeePolicyQuote,
  BigNumberish,
  FeesDistribution,
  FeesDistributionInput,
  MessageFeeAllocationInput,
  MessageType,
  SimulateWriteContractResult,
  StudioExecutionFeeReport,
  StudioFeeAccounting,
  ConsensusRoundData,
  ConsensusLastRoundData,
} from "@/types";
import {fromHex, toHex, zeroAddress, encodeFunctionData, PublicClient, parseEventLogs, type Abi} from "viem";
import {toJsonSafeDeep, b64ToArray, arrayToB64} from "@/utils/jsonifier";
import {
  CALL_KEY_WILDCARD,
  createFeesDistribution,
  MESSAGE_ALLOCATION_ROOT_PARENT_INDEX,
  normalizeMessageFeeAllocations,
  normalizeTransactionFees,
  NormalizedTransactionFees,
} from "@/transactions/fees";
import {CONSENSUS_DATA_TRAIN_ABI, ROUNDS_STORAGE_TRAIN_READ_ABI} from "@/abi/consensusTrain";

const prefixHex = (hex: string): `0x${string}` => {
  return (hex.startsWith("0x") ? hex : `0x${hex}`) as `0x${string}`;
};

/**
 * Extract hex data from a simulation result.
 * Some RPCs return a bare hex string, others return an object like
 * { data: "hex...", status: { code, message }, ... }. Studio's `sim_call`
 * returns the full receipt with `result` as base64-encoded GenVM result bytes,
 * where byte 0 is the result code and the payload starts at byte 1.
 */
function extractGenCallResult(result: unknown): `0x${string}` {
  if (typeof result === "string") {
    return prefixHex(result);
  }
  if (result && typeof result === "object" && "data" in result) {
    const obj = result as {data: string; status?: {code: number; message: string}};
    if (obj.status && obj.status.code !== 0) {
      throw new Error(`gen_call failed: ${obj.status.message}`);
    }
    return prefixHex(obj.data);
  }
  if (result && typeof result === "object" && "result" in result) {
    const obj = result as {result: string; execution_result?: string};
    if (obj.execution_result && obj.execution_result !== "SUCCESS") {
      throw new Error(`sim_call failed: ${obj.execution_result}`);
    }
    if (typeof obj.result === "string" && obj.result.startsWith("0x")) {
      return prefixHex(obj.result);
    }
    const resultBytes = b64ToArray(obj.result);
    if (resultBytes.length === 0) {
      throw new Error("sim_call returned an empty result payload");
    }
    return toHex(resultBytes.slice(1));
  }
  throw new Error(`Unexpected simulation response: ${JSON.stringify(result)}`);
}

function normalizeGenCallReceipt(result: unknown, data: `0x${string}`): Record<string, unknown> {
  if (result && typeof result === "object" && !Array.isArray(result)) {
    return result as Record<string, unknown>;
  }
  return {data};
}

function extractGenCallFeeAccounting(result: unknown): StudioFeeAccounting | undefined {
  if (!result || typeof result !== "object" || Array.isArray(result)) return undefined;
  const genvmResult = (result as Record<string, unknown>).genvm_result;
  if (!genvmResult || typeof genvmResult !== "object" || Array.isArray(genvmResult)) return undefined;
  const feeAccounting = (genvmResult as Record<string, unknown>).fee_accounting;
  if (!feeAccounting || typeof feeAccounting !== "object" || Array.isArray(feeAccounting)) return undefined;
  return feeAccounting as StudioFeeAccounting;
}

function extractGenCallFeeReport(feeAccounting?: StudioFeeAccounting): StudioExecutionFeeReport | undefined {
  const report = feeAccounting?.execution_fee_report;
  if (!report || typeof report !== "object" || Array.isArray(report)) return undefined;
  return report;
}

function transactionFeesToRpc(fees?: TransactionFeeOptions) {
  if (!fees) return undefined;
  const normalized = normalizeTransactionFees(fees);
  return {
    distribution: {
      leaderTimeunitsAllocation: normalized.distribution.leaderTimeunitsAllocation.toString(),
      validatorTimeunitsAllocation: normalized.distribution.validatorTimeunitsAllocation.toString(),
      appealRounds: normalized.distribution.appealRounds.toString(),
      executionBudgetPerRound: normalized.distribution.executionBudgetPerRound.toString(),
      executionConsumed: normalized.distribution.executionConsumed.toString(),
      totalMessageFees: normalized.distribution.totalMessageFees.toString(),
      rotations: normalized.distribution.rotations.map((rotation) => rotation.toString()),
      maxPriceGenPerTimeUnit: normalized.distribution.maxPriceGenPerTimeUnit.toString(),
      storageFeeMaxGasPrice: normalized.distribution.storageFeeMaxGasPrice.toString(),
      receiptFeeMaxGasPrice: normalized.distribution.receiptFeeMaxGasPrice.toString(),
    },
    messageAllocations: normalized.messageAllocations.map((allocation) => ({
      messageType: allocation.messageType,
      onAcceptance: allocation.onAcceptance,
      parentIndex: allocation.parentIndex.toString(),
      recipient: allocation.recipient,
      callKey: allocation.callKey,
      budget: allocation.budget.toString(),
      feeParams: allocation.feeParams,
    })),
    ...(normalized.feeValue === undefined ? {} : {feeValue: normalized.feeValue.toString()}),
  };
}

export const contractActions = (client: GenLayerClient<GenLayerChain>, publicClient: PublicClient) => {
  const estimateFeeValue = async (
    distribution: FeesDistribution,
    policy?: FeePolicyQuote,
  ): Promise<bigint> => {
    if (client.chain.feeManagerContract?.address) {
      const roundFees = await publicClient.readContract({
        address: client.chain.feeManagerContract.address as `0x${string}`,
        abi: FEE_MANAGER_CALCULATE_ROUND_FEES_ABI as any,
        functionName: "calculateRoundFees",
        args: [
          distribution,
          BigInt(client.chain.defaultNumberOfInitialValidators),
          0n,
        ],
      }) as bigint;
      return roundFees + distribution.totalMessageFees;
    }

    if (client.chain.isStudio) {
      const studioPolicy = policy ?? await readCurrentFeePolicy(client, publicClient);
      return calculateLocalRoundFees(
        distribution,
        client.chain.defaultNumberOfInitialValidators,
        studioPolicy,
      ) + distribution.totalMessageFees;
    }

    throw new Error("Fee value estimation is not supported on this chain (missing feeManagerContract).");
  };

  return {
    /** Retrieves the source code of a deployed contract. */
    getContractCode: async (address: Address): Promise<string> => {
      const params = (client.chain.isStudio ? [address] : [{address}]) as
        | [Address]
        | [{address: Address}];
      const result = (await client.request({
        method: "gen_getContractCode",
        params,
      })) as string;
      const codeBytes = b64ToArray(result);
      return new TextDecoder().decode(codeBytes);
    },
    /** Gets the schema (methods and constructor) of a deployed contract. */
    getContractSchema: async (address: Address): Promise<ContractSchema> => {
      if (client.chain.isStudio) {
        const schema = (await client.request({
          method: "gen_getContractSchema",
          params: [address],
        })) as string;
        return schema as unknown as ContractSchema;
      }
      // Non-Studio nodes expose `gen_getContractSchema({code})` rather than a per-address lookup,
      // so fetch the code first and ask for its schema.
      const codeB64 = (await client.request({
        method: "gen_getContractCode",
        params: [{address}],
      })) as string;
      const schema = (await client.request({
        method: "gen_getContractSchema",
        params: [{code: codeB64}],
      })) as unknown as ContractSchema;
      return schema;
    },
    /** Generates a schema for contract code without deploying it. */
    getContractSchemaForCode: async (contractCode: string | Uint8Array): Promise<ContractSchema> => {
      if (client.chain.isStudio) {
        const schema = (await client.request({
          method: "gen_getContractSchemaForCode",
          params: [toHex(contractCode)],
        })) as string;
        return schema as unknown as ContractSchema;
      }
      // Non-Studio nodes expose the same semantic as `gen_getContractSchema({code: <base64>})`.
      const bytes = typeof contractCode === "string" ? new TextEncoder().encode(contractCode) : contractCode;
      const codeB64 = arrayToB64(bytes);
      const schema = (await client.request({
        method: "gen_getContractSchema",
        params: [{code: codeB64}],
      })) as unknown as ContractSchema;
      return schema;
    },
    /** Executes a read-only contract call without modifying state. */
    readContract: async <RawReturn extends boolean | undefined>(args: {
      account?: Account;
      address: Address;
      functionName: string;
      args?: CalldataEncodable[];
      kwargs?: Map<string, CalldataEncodable> | {[key: string]: CalldataEncodable};
      rawReturn?: RawReturn;
      jsonSafeReturn?: boolean;
      leaderOnly?: boolean;
      transactionHashVariant?: TransactionHashVariant;
    }): Promise<RawReturn extends true ? `0x${string}` : CalldataEncodable> => {
      const {
        account,
        address,
        functionName,
        args: callArgs,
        kwargs,
        jsonSafeReturn = true,
        leaderOnly = false,
        transactionHashVariant = TransactionHashVariant.LATEST_NONFINAL,
      } = args;

      const encodedData = [calldata.encode(calldata.makeCalldataObject(functionName, callArgs, kwargs)), leaderOnly];
      const serializedData = serialize(encodedData);

      const senderAddress = account?.address ?? client.account?.address ?? zeroAddress;

      const requestParams = {
        type: "read",
        to: address,
        from: senderAddress,
        data: serializedData,
        transaction_hash_variant: transactionHashVariant,
      };
      const result = await client.request({
        method: "gen_call",
        params: [requestParams],
      });
      const prefixedResult = extractGenCallResult(result);

      if (args.rawReturn) {
        return prefixedResult;
      }
      const resultBinary = fromHex(prefixedResult, "bytes");
      const decoded = calldata.decode(resultBinary) as any;
      if (!jsonSafeReturn) {
        return decoded;
      }
      // If jsonSafeReturn is requested, convert to JSON-safe recursively
      return toJsonSafeDeep(decoded) as any;
    },
    /** Simulates a state-modifying contract call without executing on-chain. */
    simulateWriteContract: async <
      RawReturn extends boolean | undefined = undefined,
      IncludeReceipt extends boolean | undefined = undefined,
    >(args: {
      account?: Account;
      address: Address;
      functionName: string;
      args?: CalldataEncodable[];
      kwargs?: Map<string, CalldataEncodable> | {[key: string]: CalldataEncodable};
      rawReturn?: RawReturn;
      includeReceipt?: IncludeReceipt;
      value?: BigNumberish;
      leaderOnly?: boolean;
      fees?: TransactionFeeOptions;
      transactionHashVariant?: TransactionHashVariant;
    }): Promise<IncludeReceipt extends true
      ? SimulateWriteContractResult<RawReturn>
      : RawReturn extends true ? `0x${string}` : CalldataEncodable> => {
      const {
        account,
        address,
        functionName,
        args: callArgs,
        kwargs,
        value,
        fees,
        leaderOnly = false,
        transactionHashVariant = TransactionHashVariant.LATEST_NONFINAL,
      } = args;

      const encodedData = [calldata.encode(calldata.makeCalldataObject(functionName, callArgs, kwargs)), leaderOnly];
      const serializedData = serialize(encodedData);

      const senderAddress = account?.address ?? client.account?.address ?? zeroAddress;

      const requestParams: Record<string, unknown> = {
        type: "write",
        to: address,
        from: senderAddress,
        data: serializedData,
        transaction_hash_variant: transactionHashVariant,
      };
      const userValue = toUInt(value, "value", 0n);
      if (userValue > 0n) {
        requestParams.value = toHex(userValue);
      }
      const rpcFees = transactionFeesToRpc(fees);
      if (rpcFees) {
        requestParams.fees = rpcFees;
      }
      const simulationMethod = args.includeReceipt && client.chain.isStudio ? "sim_call" : "gen_call";
      const result = await client.request({
        method: simulationMethod,
        params: [requestParams],
      });
      const prefixedResult = extractGenCallResult(result);

      let decodedResult: `0x${string}` | CalldataEncodable;
      if (args.rawReturn) {
        decodedResult = prefixedResult;
      } else {
        const resultBinary = fromHex(prefixedResult, "bytes");
        decodedResult = calldata.decode(resultBinary) as any;
      }

      if (args.includeReceipt) {
        const feeAccounting = extractGenCallFeeAccounting(result);
        return {
          result: decodedResult,
          receipt: normalizeGenCallReceipt(result, prefixedResult),
          feeAccounting,
          feeReport: extractGenCallFeeReport(feeAccounting),
        } as IncludeReceipt extends true
          ? SimulateWriteContractResult<RawReturn>
          : RawReturn extends true ? `0x${string}` : CalldataEncodable;
      }

      return decodedResult as IncludeReceipt extends true
        ? SimulateWriteContractResult<RawReturn>
        : RawReturn extends true ? `0x${string}` : CalldataEncodable;
    },
    /** Executes a state-modifying function on a contract through consensus. Returns the transaction hash. */
    writeContract: async (args: {
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
    }): Promise<`0x${string}`> => {
      const {
        account,
        address,
        functionName,
        args: callArgs,
        kwargs,
        value = 0n,
        leaderOnly = false,
        consensusMaxRotations = client.chain.defaultConsensusMaxRotations,
        validUntil,
        fees,
      } = args;

      const data = [calldata.encode(calldata.makeCalldataObject(functionName, callArgs, kwargs)), leaderOnly];
      const serializedData = serialize(data);
      const senderAccount = account || client.account;
      const transactionFees = await _resolveTransactionFees({
        client,
        publicClient,
        fees,
        numOfInitialValidators: client.chain.defaultNumberOfInitialValidators,
      });
      const transactionVariants = _encodeAddTransactionData({
        client,
        senderAccount,
        recipient: address,
        data: serializedData,
        consensusMaxRotations,
        validUntil,
        userValue: value,
        transactionFees,
      });
      return _sendTransaction({
        client,
        publicClient,
        transactionVariants,
        senderAccount,
      });
    },
    /** Deploys a new intelligent contract to GenLayer. Returns the transaction hash. */
    deployContract: async (args: {
      account?: Account;
      code: string | Uint8Array;
      args?: CalldataEncodable[];
      kwargs?: Map<string, CalldataEncodable> | {[key: string]: CalldataEncodable};
      leaderOnly?: boolean;
      consensusMaxRotations?: number;
      validUntil?: BigNumberish;
      fees?: TransactionFeeOptions;
    }) => {
      const {
        account,
        code,
        args: constructorArgs,
        kwargs,
        leaderOnly = false,
        consensusMaxRotations = client.chain.defaultConsensusMaxRotations,
        validUntil,
        fees,
      } = args;

      const data = [
        code,
        calldata.encode(calldata.makeCalldataObject(undefined, constructorArgs, kwargs)),
        leaderOnly,
      ];
      const serializedData = serialize(data);
      const senderAccount = account || client.account;
      const transactionFees = await _resolveTransactionFees({
        client,
        publicClient,
        fees,
        numOfInitialValidators: client.chain.defaultNumberOfInitialValidators,
      });
      const transactionVariants = _encodeAddTransactionData({
        client,
        senderAccount,
        recipient: zeroAddress,
        data: serializedData,
        consensusMaxRotations,
        validUntil,
        userValue: 0n,
        transactionFees,
      });
      return _sendTransaction({
        client,
        publicClient,
        transactionVariants,
        senderAccount,
      });
    },
    /** Returns the active fee price policy used to build user-side caps. */
    getCurrentFeePolicy: async (): Promise<FeePolicyQuote> => {
      return readCurrentFeePolicy(client, publicClient);
    },
    /** Builds a fee distribution with caps derived from the active fee policy. */
    estimateFeesDistribution: async (args?: FeeEstimateOptions): Promise<FeesDistribution> => {
      const policy = await readCurrentFeePolicy(client, publicClient);
      return buildEstimatedFeesDistribution(args, policy);
    },
    /**
     * Builds a complete transaction `fees` object, including feeValue.
     * Studio has no on-chain FeeManager in the chain definition, so this uses
     * the same deterministic round-fee math as Studio trusted mode there.
     */
    estimateTransactionFees: async (args?: FeeEstimateOptions): Promise<TransactionFeeEstimate> => {
      const policy = await readCurrentFeePolicy(client, publicClient);
      const distribution = buildEstimatedFeesDistribution(args, policy);

      return {
        distribution,
        messageAllocations: args?.messageAllocations,
        feeValue: await estimateFeeValue(distribution, policy),
        policy,
      };
    },
    /**
     * Builds a trusted fee preset from a representative Studio simulation.
     * This turns the returned fee accounting/report into execution and message
     * budgets while preserving mode-2 message allocations when the simulation
     * was run with them.
     */
    estimateTransactionFeesFromSimulation: async (
      args: SimulationFeeEstimateOptions,
    ): Promise<TransactionFeeEstimate> => {
      const policy = await readCurrentFeePolicy(client, publicClient);
      const {estimateOptions, observed, messageAllocations} =
        buildEstimatedFeesOptionsFromSimulation(args, policy);
      const distribution = buildEstimatedFeesDistribution(estimateOptions, policy);

      return {
        distribution,
        messageAllocations,
        feeValue: await estimateFeeValue(distribution, policy),
        policy,
        observed,
      };
    },
    /**
     * Builds a trusted fee preset for a concrete write call in one step.
     * The method first gives the simulation a baseline fee budget, then uses
     * the returned Studio/GenVM fee accounting to derive the preset the dapp
     * should pass with the real transaction.
     */
    estimateTransactionFeesForWrite: async (
      args: WriteFeeEstimateOptions,
    ): Promise<TransactionFeeEstimate> => {
      const {
        account,
        address,
        functionName,
        args: callArgs,
        kwargs,
        value,
        leaderOnly = false,
        transactionHashVariant = TransactionHashVariant.LATEST_NONFINAL,
        executionHeadroomBps,
        messageHeadroomBps,
        ...feeOptions
      } = args;

      const policy = await readCurrentFeePolicy(client, publicClient);
      const initialDistribution = buildEstimatedFeesDistribution(feeOptions, policy);
      const initialEstimate: TransactionFeeEstimate = {
        distribution: initialDistribution,
        messageAllocations: feeOptions.messageAllocations,
        feeValue: await estimateFeeValue(initialDistribution, policy),
        policy,
      };

      const encodedData = [
        calldata.encode(calldata.makeCalldataObject(functionName, callArgs, kwargs)),
        leaderOnly,
      ];
      const serializedData = serialize(encodedData);
      const senderAddress = account?.address ?? client.account?.address ?? zeroAddress;
      const requestParams: Record<string, unknown> = {
        type: "write",
        to: address,
        from: senderAddress,
        data: serializedData,
        transaction_hash_variant: transactionHashVariant,
      };
      const userValue = toUInt(value, "value", 0n);
      if (userValue > 0n) {
        requestParams.value = toHex(userValue);
      }
      const rpcFees = transactionFeesToRpc({
        distribution: initialEstimate.distribution,
        messageAllocations: initialEstimate.messageAllocations,
        feeValue: initialEstimate.feeValue,
      });
      if (rpcFees) {
        requestParams.fees = rpcFees;
      }

      if (client.chain.isStudio) {
        const studioEstimate = await client.request({
          method: "sim_estimateTransactionFees",
          params: [requestParams],
        });
        const authoritativeEstimate = transactionFeeEstimateFromStudioEstimate(
          studioEstimate,
          policy,
        );
        if (authoritativeEstimate) {
          return authoritativeEstimate;
        }
      }

      const simulationResult = await client.request({
        method: "gen_call",
        params: [requestParams],
      });
      extractGenCallResult(simulationResult);
      const feeAccounting = extractGenCallFeeAccounting(simulationResult);
      const simulation = {
        feeAccounting,
        feeReport: extractGenCallFeeReport(feeAccounting),
      };
      const {estimateOptions, observed, messageAllocations} =
        buildEstimatedFeesOptionsFromSimulation(
          {
            ...feeOptions,
            executionHeadroomBps,
            messageHeadroomBps,
            simulation,
          },
          policy,
        );
      const distribution = buildEstimatedFeesDistribution(estimateOptions, policy);

      return {
        distribution,
        messageAllocations,
        feeValue: await estimateFeeValue(distribution, policy),
        policy,
        observed,
      };
    },
    /**
     * Returns the full authoritative appeal charge (bond plus appeal funding)
     * on resolution-kernel contract networks. Current Studio has no
     * decision-bound quote surface.
     */
    getAppealCharge: async (args: {txId: `0x${string}`}): Promise<bigint> => {
      if (client.chain.isStudio) {
        throw new Error(STUDIO_APPEAL_QUOTE_UNSUPPORTED);
      }
      const context = await _readAppealContext({client, publicClient, txId: args.txId});
      return context.requiredValue;
    },
    /** @deprecated Use getAppealCharge. This legacy name also returns bond plus appeal funding. */
    getMinAppealBond: async (args: {txId: `0x${string}`}): Promise<bigint> => {
      if (client.chain.isStudio) {
        throw new Error(STUDIO_APPEAL_QUOTE_UNSUPPORTED);
      }
      const context = await _readAppealContext({client, publicClient, txId: args.txId});
      return context.requiredValue;
    },
    /** Returns the current consensus round number for a transaction. */
    getRoundNumber: async (args: {txId: `0x${string}`}): Promise<bigint> => {
      if (!client.chain.roundsStorageContract?.address) {
        throw new Error("getRoundNumber not supported on this chain (missing roundsStorageContract)");
      }
      return publicClient.readContract({
        address: client.chain.roundsStorageContract.address as `0x${string}`,
        abi: ROUNDS_STORAGE_TRAIN_READ_ABI,
        functionName: "getRoundNumber",
        args: [args.txId],
      }) as Promise<bigint>;
    },
    /** Returns detailed data for a specific consensus round. */
    getRoundData: async (args: {txId: `0x${string}`; round: bigint}) => {
      if (!client.chain.roundsStorageContract?.address) {
        throw new Error("getRoundData not supported on this chain (missing roundsStorageContract)");
      }
      const snapshot = await publicClient.getBlock();
      return _readRoundDataSnapshot({
        publicClient,
        address: client.chain.roundsStorageContract.address as `0x${string}`,
        txId: args.txId,
        round: args.round,
        blockNumber: snapshot.number,
      });
    },
    /** Returns the current round number and its data for a transaction. */
    getLastRoundData: async (args: {txId: `0x${string}`}) => {
      if (!client.chain.roundsStorageContract?.address) {
        throw new Error("getLastRoundData not supported on this chain (missing roundsStorageContract)");
      }
      const snapshot = await publicClient.getBlock();
      const address = client.chain.roundsStorageContract.address as `0x${string}`;
      const round = await publicClient.readContract({
        address,
        abi: ROUNDS_STORAGE_TRAIN_READ_ABI,
        functionName: "getRoundNumber",
        args: [args.txId],
        blockNumber: snapshot.number,
      }) as bigint;
      const roundData = await _readRoundDataSnapshot({
        publicClient,
        address,
        txId: args.txId,
        round,
        blockNumber: snapshot.number,
      });
      return Object.assign(
        [round, roundData] as [bigint, ConsensusRoundData],
        {round, roundData},
      ) as ConsensusLastRoundData;
    },
    /** Checks if a transaction can be appealed. */
    canAppeal: async (args: {txId: `0x${string}`}): Promise<boolean> => {
      if (!client.chain.appealsContract?.address) {
        throw new Error("canAppeal not supported on this chain (missing appealsContract)");
      }
      const context = await _readLifecycleIdentity({client, publicClient, txId: args.txId});
      if (!context.decisionActive) return false;
      return publicClient.readContract({
        address: client.chain.appealsContract.address as `0x${string}`,
        abi: APPEALS_TRAIN_ABI,
        functionName: "canAppeal",
        args: [args.txId, context.decisionId],
        blockNumber: context.blockNumber,
      }) as Promise<boolean>;
    },
    /** Returns a developer's NFT reward record, or null when no NFT is registered. */
    getDeveloperNft: async (args: {developer: Address}): Promise<DeveloperNft | null> => {
      const nftMinterAddress = await _resolveNftMinterAddress({client, publicClient});
      const nftId = await publicClient.readContract({
        address: nftMinterAddress,
        abi: NFT_MINTER_ABI,
        functionName: "developerToNFT",
        args: [args.developer],
      }) as bigint;

      if (nftId === 0n) {
        return null;
      }

      const [nftData, ghosts] = await Promise.all([
        publicClient.readContract({
          address: nftMinterAddress,
          abi: NFT_MINTER_ABI,
          functionName: "nfts",
          args: [nftId],
        }),
        publicClient.readContract({
          address: nftMinterAddress,
          abi: NFT_MINTER_ABI,
          functionName: "getGhostsForNFT",
          args: [nftId],
        }),
      ]) as [
        readonly [Address, bigint, bigint] & {
          developer?: Address;
          claimableRewards?: bigint;
          lastClaimedEpoch?: bigint;
        },
        Address[],
      ];

      return {
        nftId,
        developer: nftData.developer ?? nftData[0],
        claimableRewards: nftData.claimableRewards ?? nftData[1],
        lastClaimedEpoch: nftData.lastClaimedEpoch ?? nftData[2],
        ghosts,
      };
    },
    /** Returns claimable developer-NFT rewards accrued from transaction fees. */
    getClaimableRewardsFromFees: async (args: {nftId: BigNumberish}): Promise<bigint> => {
      const nftMinterAddress = await _resolveNftMinterAddress({client, publicClient});
      const nftId = toUInt(args.nftId, "nftId", 0n);
      return publicClient.readContract({
        address: nftMinterAddress,
        abi: NFT_MINTER_ABI,
        functionName: "getClaimableRewardsFromFees",
        args: [nftId],
      }) as Promise<bigint>;
    },
    /** Returns claimable developer-NFT rewards accrued from inflation. */
    getClaimableRewardsFromInflation: async (args: {
      nftId: BigNumberish;
      numberOfEpochsToClaim: BigNumberish;
    }): Promise<bigint> => {
      const nftMinterAddress = await _resolveNftMinterAddress({client, publicClient});
      const nftId = toUInt(args.nftId, "nftId", 0n);
      const numberOfEpochsToClaim = toUInt(
        args.numberOfEpochsToClaim,
        "numberOfEpochsToClaim",
        0n,
      );
      return publicClient.readContract({
        address: nftMinterAddress,
        abi: NFT_MINTER_ABI,
        functionName: "getClaimableRewardsFromInflation",
        args: [nftId, numberOfEpochsToClaim],
      }) as Promise<bigint>;
    },
    /** Claims all currently available rewards for a developer NFT. Returns the EVM transaction hash. */
    claimNftRewards: async (args: {
      account?: Account;
      nftId: BigNumberish;
    }): Promise<`0x${string}`> => {
      const nftMinterAddress = await _resolveNftMinterAddress({client, publicClient});
      const encodedData = encodeFunctionData({
        abi: NFT_MINTER_ABI,
        functionName: "claim",
        args: [toUInt(args.nftId, "nftId", 0n)],
      });
      return _sendEvmContractCall({
        client,
        publicClient,
        to: nftMinterAddress,
        encodedData,
        senderAccount: args.account || client.account,
        operationName: "Claim NFT rewards",
      });
    },
    /** Claims a bounded number of reward epochs for a developer NFT. Returns the EVM transaction hash. */
    claimNftEpochs: async (args: {
      account?: Account;
      nftId: BigNumberish;
      numberOfEpochsToClaim: BigNumberish;
    }): Promise<`0x${string}`> => {
      const nftMinterAddress = await _resolveNftMinterAddress({client, publicClient});
      const encodedData = encodeFunctionData({
        abi: NFT_MINTER_ABI,
        functionName: "claimEpochs",
        args: [
          toUInt(args.nftId, "nftId", 0n),
          toUInt(args.numberOfEpochsToClaim, "numberOfEpochsToClaim", 0n),
        ],
      });
      return _sendEvmContractCall({
        client,
        publicClient,
        to: nftMinterAddress,
        encodedData,
        senderAccount: args.account || client.account,
        operationName: "Claim NFT epochs",
      });
    },
    /**
     * Appeals a consensus transaction to trigger a new round of validation.
     * Contract networks bind the call to the active decision and quote an
     * omitted value. Current Studio uses its native decision-free entrypoint;
     * its value defaults to zero when omitted.
     */
    appealTransaction: async (args: {
      account?: Account;
      txId: `0x${string}`;
      value?: bigint;
    }) => {
      const {account, txId} = args;
      const senderAccount = account || client.account;

      // Appeals don't go through _sendTransaction because submitAppeal emits
      // AppealStarted/TransactionActivated events, not NewTransaction/CreatedTransaction.
      // The appeal operates on the same GenLayer txId, so we return it directly.
      if (client.chain.isStudio) {
        await _sendConsensusCall({
          client,
          publicClient,
          encodedData: _encodeStudioSubmitAppealData({txId}),
          senderAccount,
          value: args.value ?? 0n,
          operationName: "Appeal",
        });
        return txId;
      }

      const context = await _readAppealContext({
        client,
        publicClient,
        txId,
        includeQuote: args.value === undefined,
      });
      const value = args.value ?? context.requiredValue;

      const encodedData = _encodeSubmitAppealData({
        txId,
        expectedDecisionId: context.decisionId,
      });
      await _sendConsensusCall({
        client,
        publicClient,
        encodedData,
        senderAccount,
        value,
        operationName: "Appeal",
      });
      return txId;
    },
    /**
     * Deposits additional fee budget for an existing consensus transaction.
     * Returns the backend RPC hash: an EVM transaction hash on network
     * backends, or the target GenLayer tx id on Studio/localnet.
     */
    topUpFees: async (args: {
      account?: Account;
      txId: `0x${string}`;
      distribution: FeesDistributionInput;
      value: bigint;
    }): Promise<`0x${string}`> => {
      const {account, txId, distribution, value} = args;
      const senderAccount = account || client.account;
      const encodedData = _encodeTopUpFeesData({txId, distribution});
      return _sendConsensusCall({
        client,
        publicClient,
        encodedData,
        senderAccount,
        value,
        operationName: "Top up fees",
      });
    },
    /**
     * Deposits appeal fee budget and submits an appeal in the same consensus call.
     * Returns the existing GenLayer transaction id, matching appealTransaction.
     * Contract networks bind the call to the active decision and quote an
     * omitted value. Current Studio uses its native decision-free entrypoint;
     * its value defaults to zero when omitted.
     */
    topUpAndSubmitAppeal: async (args: {
      account?: Account;
      txId: `0x${string}`;
      distribution: FeesDistributionInput;
      value?: bigint;
    }): Promise<`0x${string}`> => {
      const {account, txId, distribution} = args;
      const senderAccount = account || client.account;

      if (client.chain.isStudio) {
        await _sendConsensusCall({
          client,
          publicClient,
          encodedData: _encodeStudioTopUpAndSubmitAppealData({txId, distribution}),
          senderAccount,
          value: args.value ?? 0n,
          operationName: "Top up and submit appeal",
        });
        return txId;
      }

      const context = await _readAppealContext({
        client,
        publicClient,
        txId,
        includeQuote: args.value === undefined,
      });
      const value = args.value ?? context.requiredValue;

      const encodedData = _encodeTopUpAndSubmitAppealData({
        txId,
        expectedDecisionId: context.decisionId,
        distribution,
      });
      await _sendConsensusCall({
        client,
        publicClient,
        encodedData,
        senderAccount,
        value,
        operationName: "Top up and submit appeal",
      });
      return txId;
    },
    /** Finalizes a single GenLayer transaction that is ready to be finalized. Returns the EVM transaction hash. */
    finalizeTransaction: async (args: {
      account?: Account;
      txId: `0x${string}`;
    }): Promise<`0x${string}`> => {
      const {account, txId} = args;
      const senderAccount = account || client.account;

      if (client.chain.isStudio) {
        return _sendConsensusCall({
          client,
          publicClient,
          encodedData: encodeFunctionData({
            abi: client.chain.consensusMainContract?.abi as any,
            functionName: "finalizeTransaction",
            args: [txId],
          }),
          senderAccount,
          operationName: "Finalize",
        });
      }

      const identity = await _readLifecycleIdentity({client, publicClient, txId});
      if (!identity.decisionActive) {
        throw new Error(`Transaction ${txId} has no active decision to finalize`);
      }
      if (identity.resolutionAction !== 6) {
        throw new Error(
          `Transaction ${txId} is not ready to finalize (resolution action ${identity.resolutionAction})`,
        );
      }
      const encodedData = encodeFunctionData({
        abi: CONSENSUS_FINALIZATION_TRAIN_ABI,
        functionName: "finalizeTransaction",
        args: [txId, identity.decisionId],
      });
      return _sendConsensusCall({
        client,
        publicClient,
        encodedData,
        senderAccount,
        operationName: "Finalize",
      });
    },
    /**
     * @deprecated The train separates attempt-bound resolution from
     * decision-bound finalization. Use resolveTransactions or
     * finalizeDecisions after classifying the lifecycle action.
     */
    finalizeIdlenessTxs: async (args: {
      account?: Account;
      txIds: readonly `0x${string}`[];
    }): Promise<`0x${string}`> => {
      throw new Error(
        `finalizeIdlenessTxs(${args.txIds.length} transaction(s)) is unavailable on the train: ` +
          "use resolveTransactions for attempt-bound lifecycle actions or finalizeDecisions for active decisions.",
      );
    },
    /** Resolves a batch of attempt-bound lifecycle actions. */
    resolveTransactions: async (args: {
      account?: Account;
      txIds: readonly `0x${string}`[];
    }): Promise<`0x${string}`> => {
      if (client.chain.isStudio) {
        throw _studioTrainBatchError("resolveTransactions");
      }
      if (args.txIds.length === 0) {
        throw new Error("resolveTransactions requires at least one txId.");
      }
      const snapshot = await publicClient.getBlock();
      const identities = await Promise.all(args.txIds.map(txId =>
        _readLifecycleIdentity({
          client,
          publicClient,
          txId,
          blockNumber: snapshot.number,
          blockTimestamp: snapshot.timestamp,
        }),
      ));
      const encodedData = encodeFunctionData({
        abi: CONSENSUS_FINALIZATION_TRAIN_ABI,
        functionName: "resolveTransactions",
        args: [args.txIds.map((txId, index) => ({
          txId,
          expectedAttemptId: identities[index].attemptId,
        }))],
      });
      return _sendConsensusCall({
        client,
        publicClient,
        encodedData,
        senderAccount: args.account || client.account,
        operationName: "Resolve transactions",
      });
    },
    /** Finalizes a batch of active, decision-bound transactions. */
    finalizeDecisions: async (args: {
      account?: Account;
      txIds: readonly `0x${string}`[];
    }): Promise<`0x${string}`> => {
      if (client.chain.isStudio) {
        throw _studioTrainBatchError("finalizeDecisions");
      }
      if (args.txIds.length === 0) {
        throw new Error("finalizeDecisions requires at least one txId.");
      }
      const snapshot = await publicClient.getBlock();
      const identities = await Promise.all(args.txIds.map(txId =>
        _readLifecycleIdentity({
          client,
          publicClient,
          txId,
          blockNumber: snapshot.number,
          blockTimestamp: snapshot.timestamp,
        }),
      ));
      identities.forEach((identity, index) => {
        if (!identity.decisionActive) {
          throw new Error(`Transaction ${args.txIds[index]} has no active decision to finalize`);
        }
        if (identity.resolutionAction !== 6) {
          throw new Error(
            `Transaction ${args.txIds[index]} is not ready to finalize ` +
              `(resolution action ${identity.resolutionAction})`,
          );
        }
      });
      const encodedData = encodeFunctionData({
        abi: CONSENSUS_FINALIZATION_TRAIN_ABI,
        functionName: "finalizeDecisions",
        args: [args.txIds.map((txId, index) => ({
          txId,
          expectedDecisionId: identities[index].decisionId,
        }))],
      });
      return _sendConsensusCall({
        client,
        publicClient,
        encodedData,
        senderAccount: args.account || client.account,
        operationName: "Finalize decisions",
      });
    },
  };
};

const validateAccount = (Account?: Account): Account => {
  if (!Account) {
    throw new Error(
      "No account set. Configure the client with an account or pass an account to this function.",
    );
  }
  return Account;
};

const CREATED_TRANSACTION_EVENT_ABI = [
  {
    anonymous: false,
    inputs: [
      {indexed: true, internalType: "bytes32", name: "txId", type: "bytes32"},
      {indexed: false, internalType: "uint256", name: "txSlot", type: "uint256"},
    ],
    name: "CreatedTransaction",
    type: "event",
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

const ADD_TRANSACTION_PARAMS_COMPONENTS = [
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
] as const;

const ADD_TRANSACTION_ABI_WITH_FEES = [
  {
    type: "function",
    name: "addTransaction",
    stateMutability: "payable",
    inputs: [
      {name: "_params", type: "tuple", components: ADD_TRANSACTION_PARAMS_COMPONENTS},
    ],
    outputs: [],
  },
] as const;

const CONSENSUS_FEE_MANAGEMENT_ABI = [
  {
    type: "function",
    name: "topUpFees",
    stateMutability: "payable",
    inputs: [
      {name: "_txId", type: "bytes32"},
      {name: "_feesDistribution", type: "tuple", components: FEES_DISTRIBUTION_COMPONENTS},
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "topUpAndSubmitAppeal",
    stateMutability: "payable",
    inputs: [
      {name: "_txId", type: "bytes32"},
      {name: "_expectedDecisionId", type: "uint256"},
      {name: "_feesDistribution", type: "tuple", components: FEES_DISTRIBUTION_COMPONENTS},
    ],
    outputs: [],
  },
] as const;

/** Studio's current embedded consensus does not carry decision identities. */
const CONSENSUS_FEE_MANAGEMENT_STUDIO_ABI = [
  {
    type: "function",
    name: "topUpAndSubmitAppeal",
    stateMutability: "payable",
    inputs: [
      {name: "_txId", type: "bytes32"},
      {name: "_feesDistribution", type: "tuple", components: FEES_DISTRIBUTION_COMPONENTS},
    ],
    outputs: [],
  },
] as const;

const CONSENSUS_APPEAL_TRAIN_ABI = [
  {
    type: "function",
    name: "submitAppeal",
    stateMutability: "payable",
    inputs: [
      {name: "_txId", type: "bytes32"},
      {name: "_expectedDecisionId", type: "uint256"},
    ],
    outputs: [],
  },
] as const;

const CONSENSUS_FINALIZATION_TRAIN_ABI = [
  {
    type: "function",
    name: "finalizeTransaction",
    stateMutability: "nonpayable",
    inputs: [
      {name: "_txId", type: "bytes32"},
      {name: "_expectedDecisionId", type: "uint256"},
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "resolveTransactions",
    stateMutability: "nonpayable",
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
    type: "function",
    name: "finalizeDecisions",
    stateMutability: "nonpayable",
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
] as const;

const APPEALS_TRAIN_ABI = [
  {
    type: "function",
    name: "canAppeal",
    stateMutability: "view",
    inputs: [
      {name: "_txId", type: "bytes32"},
      {name: "_expectedDecisionId", type: "uint256"},
    ],
    outputs: [{name: "", type: "bool"}],
  },
] as const;

const FEE_MANAGER_CALCULATE_ROUND_FEES_ABI = [
  {
    type: "function",
    name: "GENPerTimeUnit",
    stateMutability: "view",
    inputs: [],
    outputs: [{name: "", type: "uint256"}],
  },
  {
    type: "function",
    name: "storageUnitPrice",
    stateMutability: "view",
    inputs: [],
    outputs: [{name: "", type: "uint256"}],
  },
  {
    type: "function",
    name: "quoteGasPrice",
    stateMutability: "view",
    inputs: [],
    outputs: [{name: "", type: "uint256"}],
  },
  {
    type: "function",
    name: "messageFeeParamsBudgetFloor",
    stateMutability: "view",
    inputs: [],
    outputs: [{name: "", type: "uint256"}],
  },
  {
    type: "function",
    name: "calculateRoundFees",
    stateMutability: "view",
    inputs: [
      {name: "_feesDistribution", type: "tuple", components: FEES_DISTRIBUTION_COMPONENTS},
      {name: "_numOfValidators", type: "uint256"},
      {name: "round", type: "uint256"},
    ],
    outputs: [{name: "totalFeesToPay", type: "uint256"}],
  },
] as const;

type EncodedTransactionVariant = {
  encodedData: `0x${string}`;
  value: bigint;
};

const toUInt = (value: BigNumberish | undefined, fieldName: string, fallback: bigint): bigint => {
  if (value === undefined) {
    return fallback;
  }
  if (typeof value === "number" && !Number.isSafeInteger(value)) {
    throw new Error(`${fieldName} must be a safe integer when provided as a number.`);
  }
  const normalized = BigInt(value);
  if (normalized < 0n) {
    throw new Error(`${fieldName} must be greater than or equal to zero.`);
  }
  return normalized;
};

const hasAbiFunction = (abi: readonly unknown[] | undefined, functionName: string): boolean => {
  if (!Array.isArray(abi)) {
    return false;
  }
  return abi.some(item => {
    if (!item || typeof item !== "object") {
      return false;
    }
    const candidate = item as {type?: string; name?: string};
    return candidate.type === "function" && candidate.name === functionName;
  });
};

const _resolveAddressManagerAddress = async ({
  client,
  publicClient,
}: {
  client: GenLayerClient<GenLayerChain>;
  publicClient: PublicClient;
}): Promise<`0x${string}`> => {
  const consensusMainContract = client.chain.consensusMainContract;
  if (!consensusMainContract?.address) {
    throw new Error("NFTMinter address resolution not supported on this chain (missing consensusMainContract).");
  }

  const functionName = hasAbiFunction(consensusMainContract.abi, "getAddressManager")
    ? "getAddressManager"
    : hasAbiFunction(consensusMainContract.abi, "addressManager")
      ? "addressManager"
      : undefined;

  if (!functionName) {
    throw new Error("NFTMinter address resolution not supported on this chain (missing AddressManager getter).");
  }

  const addressManagerAddress = await publicClient.readContract({
    address: consensusMainContract.address as `0x${string}`,
    abi: consensusMainContract.abi as Abi,
    functionName,
    args: [],
  }) as Address;

  if (addressManagerAddress.toLowerCase() === zeroAddress) {
    throw new Error("NFTMinter address resolution failed: AddressManager is zero.");
  }

  return addressManagerAddress as `0x${string}`;
};

const _resolveNftMinterAddress = async ({
  client,
  publicClient,
}: {
  client: GenLayerClient<GenLayerChain>;
  publicClient: PublicClient;
}): Promise<`0x${string}`> => {
  const addressManagerAddress = await _resolveAddressManagerAddress({client, publicClient});
  const nftMinterAddress = await publicClient.readContract({
    address: addressManagerAddress,
    abi: ADDRESS_MANAGER_ABI,
    functionName: "getAddressNonZero",
    args: ["NFTMinter"],
  }) as Address;

  if (nftMinterAddress.toLowerCase() === zeroAddress) {
    throw new Error("NFTMinter address resolution failed: AddressManager returned zero.");
  }

  return nftMinterAddress as `0x${string}`;
};

const getDefaultValidUntil = () => BigInt(Math.floor(Date.now() / 1000) + 3600);

const requiresFeeDepositCalculation = (distribution: FeesDistribution): boolean => (
  distribution.leaderTimeunitsAllocation !== 0n ||
  distribution.validatorTimeunitsAllocation !== 0n ||
  distribution.executionBudgetPerRound !== 0n ||
  distribution.totalMessageFees !== 0n
);

const DEFAULT_PRICE_CAP_HEADROOM_BPS = 12_000n;
const DEFAULT_LEADER_TIMEUNITS_ALLOCATION = 100n;
const DEFAULT_VALIDATOR_TIMEUNITS_ALLOCATION = 200n;
const DEFAULT_TRANSACTION_EXECUTION_BUDGET_PER_ROUND = 500_000n;
// Provisional heuristic sized ~20x observed dev-env consumption (~5M gas-equivalent).
// TODO(data): replace with telemetry-derived default (p99 x margin) once fee consumption telemetry is collected.
export const DEFAULT_TRANSACTION_EXECUTION_GAS = 100_000_000n;
const DEFAULT_RECEIPT_SLOTS_CHANGED = 7n;
const DEFAULT_INTRINSIC_GAS = 21_000n;
const DEFAULT_BOOTLOADER_OVERHEAD = 60_000n;
const DEFAULT_GAS_PER_CHANGED_SLOT = 1_000n;
const DEFAULT_CALLDATA_GAS_PER_BYTE = 16n;
const DEFAULT_FIXED_PROPOSE_RECEIPT_GAS = 210_000n;
const DEFAULT_FIXED_MESSAGE_REVEAL_GAS = 100_000n;
// ConsensusHelpers.MIN_RECEIPT_BYTES — smallest receipt payload the on-chain budget floor prices.
const DEFAULT_MIN_RECEIPT_BYTES = 512n;
const DEFAULT_MESSAGE_REVEAL_LENGTH_SLOTS = 32n;
const DEFAULT_NONDET_OUTPUT_LENGTH_BYTES = 32n;
const TRANSACTION_GAS_HEADROOM_BPS = 20_000n;
const DEFAULT_PARENT_MESSAGE_RECEIPT_HEADROOM = 10_000n;
const VALIDATORS_PER_ROUND = [
  5n,
  7n,
  11n,
  13n,
  23n,
  25n,
  47n,
  49n,
  95n,
  97n,
  191n,
  193n,
  383n,
  385n,
  767n,
  769n,
  1535n,
  1537n,
] as const;

const withCapHeadroom = (value: bigint, headroomBps: bigint): bigint => {
  if (value === 0n) return 0n;
  return (value * headroomBps + 9_999n) / 10_000n;
};

const withTransactionGasHeadroom = (value: bigint): bigint => {
  if (value === 0n) return 0n;
  return (value * TRANSACTION_GAS_HEADROOM_BPS + 9_999n) / 10_000n;
};

const bigintFromUnknown = (value: unknown, fieldName: string, fallback = 0n): bigint => {
  if (value == null) return fallback;
  if (typeof value === "bigint") return value;
  if (typeof value === "number" && Number.isSafeInteger(value)) return BigInt(value);
  if (typeof value === "string" && value.trim() !== "") return BigInt(value);
  throw new Error(`${fieldName} is not an integer value.`);
};

const extractStudioFeePolicy = (config: unknown): FeePolicyQuote => {
  const configRecord = config && typeof config === "object" && !Array.isArray(config)
    ? config as Record<string, unknown>
    : undefined;
  const policy = configRecord?.policy;
  const enabled = configRecord?.enabled;
  if (enabled !== undefined && typeof enabled !== "boolean") {
    throw new Error(`sim_getFeeConfig enabled flag is not a boolean.`);
  }

  const policyRecord = policy && typeof policy === "object" && !Array.isArray(policy)
    ? policy as Record<string, unknown>
    : undefined;
  if (!policyRecord) {
    throw new Error(`sim_getFeeConfig did not expose a policy object.`);
  }
  const genPerTimeUnit = bigintFromUnknown(policyRecord.genPerTimeUnit, "policy.genPerTimeUnit");
  const storageUnitPrice = bigintFromUnknown(policyRecord.storageUnitPrice, "policy.storageUnitPrice");
  const receiptGasPrice = bigintFromUnknown(policyRecord.receiptGasPrice, "policy.receiptGasPrice");
  const intrinsicGas = bigintFromUnknown(policyRecord.intrinsicGas, "policy.intrinsicGas", DEFAULT_INTRINSIC_GAS);
  const bootloaderOverhead = bigintFromUnknown(
    policyRecord.bootloaderOverhead,
    "policy.bootloaderOverhead",
    DEFAULT_BOOTLOADER_OVERHEAD,
  );
  const gasPerChangedSlot = bigintFromUnknown(
    policyRecord.gasPerChangedSlot,
    "policy.gasPerChangedSlot",
    DEFAULT_GAS_PER_CHANGED_SLOT,
  );
  const calldataGasPerByte = bigintFromUnknown(
    policyRecord.calldataGasPerByte,
    "policy.calldataGasPerByte",
    DEFAULT_CALLDATA_GAS_PER_BYTE,
  );
  const fixedProposeReceiptGas = bigintFromUnknown(
    policyRecord.fixedProposeReceiptGas,
    "policy.fixedProposeReceiptGas",
    DEFAULT_FIXED_PROPOSE_RECEIPT_GAS,
  );
  const fixedMessageRevealGas = bigintFromUnknown(
    policyRecord.fixedMessageRevealGas,
    "policy.fixedMessageRevealGas",
    DEFAULT_FIXED_MESSAGE_REVEAL_GAS,
  );
  const executionBudgetFloor = policyRecord.messageFeeParamsBudgetFloor == null
    ? receiptGasPrice * (
        fixedProposeReceiptGas +
        intrinsicGas +
        bootloaderOverhead +
        (DEFAULT_RECEIPT_SLOTS_CHANGED * gasPerChangedSlot) +
        fixedMessageRevealGas +
        intrinsicGas +
        bootloaderOverhead +
        (DEFAULT_MESSAGE_REVEAL_LENGTH_SLOTS * gasPerChangedSlot) +
        (DEFAULT_NONDET_OUTPUT_LENGTH_BYTES * calldataGasPerByte)
      )
    : bigintFromUnknown(
        policyRecord.messageFeeParamsBudgetFloor,
        "policy.messageFeeParamsBudgetFloor",
      );

  return {
    enabled: enabled ?? (
      genPerTimeUnit > 0n ||
      storageUnitPrice > 0n ||
      receiptGasPrice > 0n
    ),
    genPerTimeUnit,
    storageUnitPrice,
    receiptGasPrice,
    executionBudgetFloor,
  };
};

const readCurrentFeePolicy = async (
  client: GenLayerClient<GenLayerChain>,
  publicClient: PublicClient,
): Promise<FeePolicyQuote> => {
  if (client.chain.isStudio) {
    const config = await client.request({method: "sim_getFeeConfig", params: []});
    return extractStudioFeePolicy(config);
  }

  if (!client.chain.feeManagerContract?.address) {
    throw new Error("Fee policy estimation is not supported on this chain (missing feeManagerContract).");
  }

  const address = client.chain.feeManagerContract.address as `0x${string}`;
  const abi = FEE_MANAGER_CALCULATE_ROUND_FEES_ABI as any;
  const [genPerTimeUnit, storageUnitPrice, quotedReceiptGasPrice, executionBudgetFloor] = await Promise.all([
    publicClient.readContract({address, abi, functionName: "GENPerTimeUnit", args: []}) as Promise<bigint>,
    publicClient.readContract({address, abi, functionName: "storageUnitPrice", args: []}) as Promise<bigint>,
    publicClient.readContract({address, abi, functionName: "quoteGasPrice", args: []}) as Promise<bigint>,
    publicClient.readContract({address, abi, functionName: "messageFeeParamsBudgetFloor", args: []}) as Promise<bigint>,
  ]);
  const enabled = genPerTimeUnit > 0n || storageUnitPrice > 0n || quotedReceiptGasPrice > 0n;
  const networkReceiptGasPrice = enabled ? await publicClient.getGasPrice() : 0n;
  const receiptGasPrice = maxBigint(quotedReceiptGasPrice, networkReceiptGasPrice);
  if (enabled && receiptGasPrice === 0n) {
    throw new Error("receipt gas price quoted as zero; refusing to build a zero price cap");
  }

  // messageFeeParamsBudgetFloor() multiplies by quoteGasPrice() on-chain, which reads
  // tx.gasprice ~ 0 under a plain eth_call — so the view can report a zero floor on
  // chain-derived networks while the real submission-time floor is non-zero. Recompute
  // the floor locally at the effective receipt price (FeeManager.estimateProposeReceiptGas
  // at ConsensusHelpers.MIN_RECEIPT_BYTES) and take the max.
  const localExecutionBudgetFloor = receiptGasPrice * (
    DEFAULT_FIXED_PROPOSE_RECEIPT_GAS +
    DEFAULT_INTRINSIC_GAS +
    DEFAULT_BOOTLOADER_OVERHEAD +
    (DEFAULT_MIN_RECEIPT_BYTES * DEFAULT_CALLDATA_GAS_PER_BYTE) +
    (DEFAULT_RECEIPT_SLOTS_CHANGED * DEFAULT_GAS_PER_CHANGED_SLOT)
  );

  return {
    enabled,
    genPerTimeUnit,
    storageUnitPrice,
    receiptGasPrice,
    executionBudgetFloor: maxBigint(executionBudgetFloor, localExecutionBudgetFloor),
  };
};

const maxBigint = (...values: bigint[]): bigint => values.reduce(
  (max, value) => value > max ? value : max,
  0n,
);

const defaultExecutionBudgetPerRound = (policy: FeePolicyQuote): bigint => {
  if (!policy.enabled || (policy.storageUnitPrice === 0n && policy.receiptGasPrice === 0n)) {
    return 0n;
  }

  return maxBigint(
    DEFAULT_TRANSACTION_EXECUTION_BUDGET_PER_ROUND,
    policy.executionBudgetFloor,
    policy.receiptGasPrice * DEFAULT_TRANSACTION_EXECUTION_GAS,
  );
};

const buildEstimatedFeesDistribution = (
  options: FeeEstimateOptions | undefined,
  policy: FeePolicyQuote,
): FeesDistribution => {
  const headroomBps = toUInt(
    options?.priceCapHeadroomBps,
    "priceCapHeadroomBps",
    DEFAULT_PRICE_CAP_HEADROOM_BPS,
  );
  const baseExecutionBudgetDefault = defaultExecutionBudgetPerRound(policy);
  const messageAllocations = options?.messageAllocations
    ? normalizeMessageFeeAllocations(options.messageAllocations)
    : undefined;
  const totalMessageFees = options?.totalMessageFees ?? (
    messageAllocations
      ? messageAllocations.reduce(
          (sum, allocation) => {
            if (
              allocation.messageType === MessageType.External ||
              allocation.parentIndex === MESSAGE_ALLOCATION_ROOT_PARENT_INDEX
            ) {
              return sum + allocation.budget;
            }
            return sum;
          },
          0n,
        )
      : undefined
  );
  const emitsMessages = (messageAllocations?.length ?? 0) > 0 || (
    totalMessageFees !== undefined && toUInt(totalMessageFees, "totalMessageFees", 0n) > 0n
  );
  const executionBudgetDefault = emitsMessages
    ? baseExecutionBudgetDefault + (policy.receiptGasPrice * DEFAULT_PARENT_MESSAGE_RECEIPT_HEADROOM)
    : baseExecutionBudgetDefault;

  return createFeesDistribution({
    leaderTimeunitsAllocation: options?.leaderTimeunitsAllocation ?? (
      policy.enabled ? DEFAULT_LEADER_TIMEUNITS_ALLOCATION : 0n
    ),
    validatorTimeunitsAllocation: options?.validatorTimeunitsAllocation ?? (
      policy.enabled ? DEFAULT_VALIDATOR_TIMEUNITS_ALLOCATION : 0n
    ),
    appealRounds: options?.appealRounds,
    executionBudgetPerRound: options?.executionBudgetPerRound ?? executionBudgetDefault,
    executionConsumed: options?.executionConsumed,
    totalMessageFees,
    rotations: options?.rotations,
    maxPriceGenPerTimeUnit:
      options?.maxPriceGenPerTimeUnit ?? withCapHeadroom(policy.genPerTimeUnit, headroomBps),
    storageFeeMaxGasPrice:
      options?.storageFeeMaxGasPrice ?? withCapHeadroom(policy.storageUnitPrice, headroomBps),
    receiptFeeMaxGasPrice:
      options?.receiptFeeMaxGasPrice ?? withCapHeadroom(policy.receiptGasPrice, headroomBps),
  });
};

const asRecord = (value: unknown): Record<string, unknown> | undefined => (
  value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined
);

const feeAccountingFromSimulation = (
  simulation: SimulationFeeEstimateOptions["simulation"],
): StudioFeeAccounting | undefined => {
  const direct = simulation.feeAccounting;
  if (direct) return direct;

  const receipt = asRecord((simulation as {receipt?: unknown}).receipt);
  const genvmResult = asRecord(receipt?.genvm_result);
  const feeAccounting = asRecord(genvmResult?.fee_accounting);
  return feeAccounting as StudioFeeAccounting | undefined;
};

const messageAllocationsFromAccounting = (
  accounting: StudioFeeAccounting | undefined,
): MessageFeeAllocationInput[] | undefined => {
  if (!Array.isArray(accounting?.message_allocations) || accounting.message_allocations.length === 0) {
    return undefined;
  }

  return accounting.message_allocations.map((raw, index) => {
    const allocation = asRecord(raw);
    if (!allocation) {
      throw new Error(`simulation.feeAccounting.message_allocations[${index}] must be an object.`);
    }
    return {
      messageType: Number(toUInt(
        allocation.messageType as BigNumberish | undefined,
        `simulation.feeAccounting.message_allocations[${index}].messageType`,
        0n,
      )) as MessageType,
      onAcceptance: Boolean(allocation.onAcceptance),
      parentIndex: toUInt(
        allocation.parentIndex as BigNumberish | undefined,
        `simulation.feeAccounting.message_allocations[${index}].parentIndex`,
        MESSAGE_ALLOCATION_ROOT_PARENT_INDEX,
      ),
      recipient: String(allocation.recipient ?? zeroAddress) as Address,
      callKey: prefixHex(String(allocation.callKey ?? CALL_KEY_WILDCARD)) as `0x${string}`,
      budget: toUInt(
        allocation.budget as BigNumberish | undefined,
        `simulation.feeAccounting.message_allocations[${index}].budget`,
        0n,
      ),
      feeParams: prefixHex(String(allocation.feeParams ?? "0x")) as `0x${string}`,
    };
  });
};

const observedSimulationFeeUsage = (
  args: SimulationFeeEstimateOptions,
  policy: FeePolicyQuote,
): SimulationFeeUsage => {
  const accounting = feeAccountingFromSimulation(args.simulation);
  const report = args.simulation.feeReport ?? accounting?.execution_fee_report;
  const executionHeadroomBps = toUInt(
    args.executionHeadroomBps,
    "executionHeadroomBps",
    DEFAULT_PRICE_CAP_HEADROOM_BPS,
  );
  const messageHeadroomBps = toUInt(
    args.messageHeadroomBps,
    "messageHeadroomBps",
    DEFAULT_PRICE_CAP_HEADROOM_BPS,
  );

  const executionFeeConsumed = bigintFromUnknown(
    accounting?.execution_fee_consumed,
    "simulation.feeAccounting.execution_fee_consumed",
  );
  const executionFeeReportTotal = bigintFromUnknown(
    report?.totalEstimatedFee,
    "simulation.feeReport.totalEstimatedFee",
  );
  const observedExecutionBudget = executionFeeConsumed + executionFeeReportTotal;
  const recommendedExecutionBudgetPerRound = observedExecutionBudget > 0n
    ? maxBigint(
        policy.executionBudgetFloor,
        withCapHeadroom(observedExecutionBudget, executionHeadroomBps),
      )
    : 0n;

  const messageFeeConsumed = bigintFromUnknown(
    accounting?.message_fee_consumed,
    "simulation.feeAccounting.message_fee_consumed",
  );
  const genvmMessageFeeConsumed = bigintFromUnknown(
    accounting?.genvm_message_fee_consumed,
    "simulation.feeAccounting.genvm_message_fee_consumed",
  );
  const messageFeeBudget = bigintFromUnknown(
    accounting?.message_fee_budget,
    "simulation.feeAccounting.message_fee_budget",
  );
  const externalMessageReimbursed = bigintFromUnknown(
    accounting?.external_message_fee_reimbursed,
    "simulation.feeAccounting.external_message_fee_reimbursed",
  );
  const messageFeeRefunded = bigintFromUnknown(
    accounting?.message_fee_refunded,
    "simulation.feeAccounting.message_fee_refunded",
  );
  const externalMessageReserved = bigintFromUnknown(
    accounting?.external_message_fee_reserved,
    "simulation.feeAccounting.external_message_fee_reserved",
  );
  const externalMessageRemainder = bigintFromUnknown(
    accounting?.external_message_fee_remainder,
    "simulation.feeAccounting.external_message_fee_remainder",
  );
  const internalDeclaredBudget = (report?.messageReveal?.messages ?? []).reduce(
    (sum, message, index) => (
      message.messageType === "Internal"
        ? sum + bigintFromUnknown(
            message.declaredBudget,
            `simulation.feeReport.messageReveal.messages[${index}].declaredBudget`,
          )
        : sum
    ),
    0n,
  );
  const observedMessageBudget = maxBigint(
    messageFeeConsumed,
    internalDeclaredBudget + externalMessageReimbursed,
  );

  return {
    executionFeeConsumed,
    executionFeeReportTotal,
    recommendedExecutionBudgetPerRound,
    genvmMessageFeeConsumed,
    messageFeeBudget,
    messageFeeConsumed,
    messageFeeRefunded,
    internalDeclaredBudget,
    externalMessageReserved,
    externalMessageReimbursed,
    externalMessageRemainder,
    recommendedTotalMessageFees: observedMessageBudget > 0n
      ? withCapHeadroom(observedMessageBudget, messageHeadroomBps)
      : 0n,
  };
};

const transactionFeeEstimateFromStudioEstimate = (
  result: unknown,
  policy: FeePolicyQuote,
): TransactionFeeEstimate | undefined => {
  const estimate = asRecord(result);
  const preset = asRecord(estimate?.recommendedPreset);
  const distributionInput = asRecord(preset?.distribution);
  if (!preset || !distributionInput || preset.feeValue === undefined) {
    return undefined;
  }

  const rawAllocations = Array.isArray(preset.messageAllocations)
    ? preset.messageAllocations as MessageFeeAllocationInput[]
    : undefined;
  const feeAccounting = asRecord(estimate?.feeAccounting) as StudioFeeAccounting | undefined;
  const feeReport = (
    asRecord(estimate?.feeReport) ??
    asRecord(feeAccounting?.execution_fee_report)
  ) as StudioExecutionFeeReport | undefined;

  return {
    distribution: createFeesDistribution(distributionInput as FeesDistributionInput),
    messageAllocations: rawAllocations && rawAllocations.length > 0
      ? normalizeMessageFeeAllocations(rawAllocations)
      : undefined,
    feeValue: bigintFromUnknown(preset.feeValue, "recommendedPreset.feeValue"),
    policy,
    observed: observedSimulationFeeUsage(
      {
        simulation: {
          feeAccounting,
          feeReport,
        },
      },
      policy,
    ),
  };
};

const buildEstimatedFeesOptionsFromSimulation = (
  args: SimulationFeeEstimateOptions,
  policy: FeePolicyQuote,
): {
  estimateOptions: FeeEstimateOptions;
  observed: SimulationFeeUsage;
  messageAllocations?: MessageFeeAllocationInput[];
} => {
  const {
    simulation,
    executionHeadroomBps,
    messageHeadroomBps,
    ...feeOptions
  } = args;
  void simulation;
  void executionHeadroomBps;
  void messageHeadroomBps;

  const accounting = feeAccountingFromSimulation(args.simulation);
  const observed = observedSimulationFeeUsage(args, policy);
  const messageAllocations =
    feeOptions.messageAllocations ?? messageAllocationsFromAccounting(accounting);

  return {
    estimateOptions: {
      ...feeOptions,
      messageAllocations,
      executionBudgetPerRound: feeOptions.executionBudgetPerRound ?? (
        observed.recommendedExecutionBudgetPerRound > 0n
          ? observed.recommendedExecutionBudgetPerRound
          : undefined
      ),
      totalMessageFees: feeOptions.totalMessageFees ?? (
        messageAllocations
          ? undefined
          : observed.recommendedTotalMessageFees > 0n
            ? observed.recommendedTotalMessageFees
            : undefined
      ),
    },
    observed,
    messageAllocations,
  };
};

const validatorIndex = (numOfValidators: number): number => {
  const needle = BigInt(numOfValidators);
  const index = VALIDATORS_PER_ROUND.findIndex((validators) => validators === needle);
  if (index < 0) {
    throw new Error(`InvalidNumOfValidators: ${numOfValidators}`);
  }
  return index;
};

const calculateFeeForRound = (
  numOfValidators: bigint,
  rotations: bigint,
  leaderTimeunitsAllocation: bigint,
  validatorTimeunitsAllocation: bigint,
): bigint => rotations * (
  leaderTimeunitsAllocation + (numOfValidators * validatorTimeunitsAllocation)
);

const calculateLocalRoundFees = (
  distribution: FeesDistribution,
  numOfInitialValidators: number,
  policy: FeePolicyQuote,
): bigint => {
  if (distribution.appealRounds !== BigInt(distribution.rotations.length - 1)) {
    throw new Error("InvalidAppealRounds");
  }
  if (
    distribution.maxPriceGenPerTimeUnit > 0n &&
    policy.genPerTimeUnit > distribution.maxPriceGenPerTimeUnit
  ) {
    throw new Error("MaxPriceExceeded");
  }
  if (
    distribution.storageFeeMaxGasPrice > 0n &&
    policy.storageUnitPrice > distribution.storageFeeMaxGasPrice
  ) {
    throw new Error("MaxPriceExceeded");
  }
  if (
    distribution.receiptFeeMaxGasPrice > 0n &&
    policy.receiptGasPrice > distribution.receiptFeeMaxGasPrice
  ) {
    throw new Error("MaxPriceExceeded");
  }

  const startIndex = validatorIndex(numOfInitialValidators);
  if (startIndex + Number(distribution.appealRounds * 2n) >= VALIDATORS_PER_ROUND.length) {
    throw new Error("InvalidNumOfValidators");
  }

  let total = calculateFeeForRound(
    VALIDATORS_PER_ROUND[startIndex],
    distribution.rotations[0] + 1n,
    distribution.leaderTimeunitsAllocation,
    distribution.validatorTimeunitsAllocation,
  );
  let rotationsIndex = 1;
  let rotationsThisRound = 1n;
  for (let offset = 1; offset <= Number(distribution.appealRounds * 2n); offset++) {
    if (offset % 2 === 0 && rotationsIndex < distribution.rotations.length) {
      rotationsThisRound = distribution.rotations[rotationsIndex] + 1n;
      rotationsIndex += 1;
    } else if (offset % 2 === 1) {
      rotationsThisRound = 1n;
    }

    total += calculateFeeForRound(
      VALIDATORS_PER_ROUND[startIndex + offset],
      rotationsThisRound,
      distribution.leaderTimeunitsAllocation,
      distribution.validatorTimeunitsAllocation,
    );
  }

  if (policy.genPerTimeUnit > 0n) {
    total *= policy.genPerTimeUnit;
  }

  const leaderRounds = distribution.rotations.reduce(
    (sum, rotations) => sum + rotations + 1n,
    distribution.appealRounds,
  );
  total += distribution.executionBudgetPerRound * leaderRounds;
  return total;
};

const _resolveTransactionFees = async ({
  client,
  publicClient,
  fees,
  numOfInitialValidators,
}: {
  client: GenLayerClient<GenLayerChain>;
  publicClient: PublicClient;
  fees?: TransactionFeeOptions;
  numOfInitialValidators: number;
}): Promise<NormalizedTransactionFees> => {
  const transactionFees = normalizeTransactionFees(fees);
  if (transactionFees.feeValue !== undefined || !requiresFeeDepositCalculation(transactionFees.distribution)) {
    return {
      ...transactionFees,
      feeValue: transactionFees.feeValue ?? 0n,
    };
  }

  if (!client.chain.feeManagerContract?.address) {
    if (client.chain.isStudio) {
      const policy = await readCurrentFeePolicy(client, publicClient);
      return {
        ...transactionFees,
        feeValue: policy.enabled
          ? calculateLocalRoundFees(
              transactionFees.distribution,
              numOfInitialValidators,
              policy,
            ) + transactionFees.distribution.totalMessageFees
          : 0n,
      };
    }

    throw new Error("fees.feeValue is required when the chain does not expose a feeManagerContract.");
  }

  const roundFees = await publicClient.readContract({
    address: client.chain.feeManagerContract.address as `0x${string}`,
    abi: FEE_MANAGER_CALCULATE_ROUND_FEES_ABI as any,
    functionName: "calculateRoundFees",
    args: [
      transactionFees.distribution,
      BigInt(numOfInitialValidators),
      0n,
    ],
  }) as bigint;

  return {
    ...transactionFees,
    feeValue: roundFees + transactionFees.distribution.totalMessageFees,
  };
};

const _encodeAddTransactionData = ({
  client,
  senderAccount,
  recipient,
  data,
  consensusMaxRotations = client.chain.defaultConsensusMaxRotations,
  validUntil,
  userValue = 0n,
  transactionFees,
}: {
  client: GenLayerClient<GenLayerChain>;
  senderAccount?: Account;
  recipient?: `0x${string}`;
  data?: `0x${string}`;
  consensusMaxRotations?: number;
  validUntil?: BigNumberish;
  userValue?: bigint;
  transactionFees: NormalizedTransactionFees;
}): EncodedTransactionVariant[] => {
  const validatedSenderAccount = validateAccount(senderAccount);
  const txCalldata = data ?? "0x";
  const txRecipient = recipient ?? zeroAddress;
  const txValidUntil = toUInt(validUntil, "validUntil", getDefaultValidUntil());
  const feeValue = transactionFees.feeValue ?? 0n;

  const params = {
    sender: validatedSenderAccount.address,
    recipient: txRecipient,
    numOfInitialValidators: BigInt(client.chain.defaultNumberOfInitialValidators),
    maxRotations: BigInt(consensusMaxRotations),
    validUntil: txValidUntil,
    saltNonce: 0n,
    userValue,
    feesDistribution: transactionFees.distribution,
    txCalldata,
    messageAllocations: transactionFees.messageAllocations,
  };

  return [{
    encodedData: encodeFunctionData({
      abi: ADD_TRANSACTION_ABI_WITH_FEES as any,
      functionName: "addTransaction",
      args: [params],
    }),
    value: userValue + feeValue,
  }];
};

const _encodeSubmitAppealData = ({
  txId,
  expectedDecisionId,
}: {
  txId: `0x${string}`;
  expectedDecisionId: bigint;
}): `0x${string}` => {
  return encodeFunctionData({
    abi: CONSENSUS_APPEAL_TRAIN_ABI,
    functionName: "submitAppeal",
    args: [txId, expectedDecisionId],
  });
};

const STUDIO_APPEAL_QUOTE_UNSUPPORTED =
  "Appeal bond calculation not supported on this chain (missing feeManagerContract/roundsStorageContract)";

const _encodeStudioSubmitAppealData = ({
  txId,
}: {
  txId: `0x${string}`;
}): `0x${string}` => encodeFunctionData({
  abi: [{
    type: "function",
    name: "submitAppeal",
    stateMutability: "payable",
    inputs: [{name: "_txId", type: "bytes32"}],
    outputs: [],
  }],
  functionName: "submitAppeal",
  args: [txId],
});

const _encodeStudioTopUpAndSubmitAppealData = ({
  txId,
  distribution,
}: {
  txId: `0x${string}`;
  distribution: FeesDistributionInput;
}): `0x${string}` => encodeFunctionData({
  abi: CONSENSUS_FEE_MANAGEMENT_STUDIO_ABI,
  functionName: "topUpAndSubmitAppeal",
  args: [txId, createFeesDistribution(distribution)],
});

const _studioTrainBatchError = (action: string): Error =>
  new Error(
    `${action} is not exposed by Studio's embedded consensus: ` +
      "use finalizeTransaction for an individual Studio transaction.",
  );

const ROUND_PAGE_SIZE = 64n;

const _unpackRoundValidatorPage = (
  value: any,
): {validators: readonly Address[]; total: bigint} => ({
  validators: value.validators ?? value[0],
  total: BigInt(value.total ?? value[1]),
});

/** Rebuilds the legacy RoundData shape without the aggregate four-array getter. */
const _readRoundDataSnapshot = async ({
  publicClient,
  address,
  txId,
  round,
  blockNumber,
}: {
  publicClient: PublicClient;
  address: Address;
  txId: `0x${string}`;
  round: bigint;
  blockNumber: bigint;
}): Promise<ConsensusRoundData> => {
  const read = (functionName: string, args: readonly unknown[]) => publicClient.readContract({
    address,
    abi: ROUNDS_STORAGE_TRAIN_READ_ABI,
    functionName,
    args,
    blockNumber,
  } as any) as Promise<any>;

  const [
    leaderIndex,
    votesCommitted,
    votesRevealed,
    appealBond,
    rotationsLeft,
    result,
    validatorVotes,
    validatorVotesHash,
    validatorResultHash,
    firstPageRaw,
  ] = await Promise.all([
    read("getLeaderIndex", [txId, round]),
    read("getVotesCommitted", [txId, round]),
    read("getVotesRevealed", [txId, round]),
    read("getAppealBond", [txId, round]),
    read("getRotationsLeft", [txId, round]),
    read("getResult", [txId, round]),
    read("getValidatorVotes", [txId, round]),
    read("getValidatorVotesHash", [txId, round]),
    read("getValidatorResultHash", [txId, round]),
    read("getRoundValidatorsPage", [txId, round, 0n, ROUND_PAGE_SIZE]),
  ]);

  const firstPage = _unpackRoundValidatorPage(firstPageRaw);
  const offsets: bigint[] = [];
  for (let offset = ROUND_PAGE_SIZE; offset < firstPage.total; offset += ROUND_PAGE_SIZE) {
    offsets.push(offset);
  }
  const remainingPages = await Promise.all(
    offsets.map(offset => read("getRoundValidatorsPage", [txId, round, offset, ROUND_PAGE_SIZE])),
  );
  const pages = [firstPage, ...remainingPages.map(_unpackRoundValidatorPage)];
  if (pages.some(page => page.total !== firstPage.total)) {
    throw new Error("Round validator page total changed within a fixed block snapshot");
  }
  const roundValidators = pages.flatMap(page => [...page.validators]);
  const expected = Number(firstPage.total);
  if (roundValidators.length !== expected) {
    throw new Error(`Incomplete round validator pages: expected ${expected}, received ${roundValidators.length}`);
  }
  for (const [name, values] of [
    ["validator votes", validatorVotes],
    ["validator vote hashes", validatorVotesHash],
    ["validator result hashes", validatorResultHash],
  ] as const) {
    if (values.length !== expected) {
      throw new Error(`Incomplete ${name}: expected ${expected}, received ${values.length}`);
    }
  }

  return {
    round,
    leaderIndex,
    votesCommitted,
    votesRevealed,
    appealBond,
    rotationsLeft,
    result: Number(result),
    roundValidators,
    validatorVotes: [...validatorVotes].map(Number),
    validatorVotesHash: [...validatorVotesHash],
    validatorResultHash: [...validatorResultHash],
  };
};

type LifecycleIdentity = {
  blockNumber: bigint;
  blockTimestamp: bigint;
  resolutionAction: number;
  attemptId: `0x${string}`;
  decisionActive: boolean;
  decisionId: bigint;
};

const _readLifecycleIdentity = async ({
  client,
  publicClient,
  txId,
  blockNumber,
  blockTimestamp,
}: {
  client: GenLayerClient<GenLayerChain>;
  publicClient: PublicClient;
  txId: `0x${string}`;
  blockNumber?: bigint;
  blockTimestamp?: bigint;
}): Promise<LifecycleIdentity> => {
  const consensusDataAddress = client.chain.consensusDataContract?.address as Address | undefined;
  if (!consensusDataAddress || consensusDataAddress === zeroAddress) {
    throw new Error("ConsensusData contract is not configured for this chain");
  }

  let snapshotNumber = blockNumber;
  let snapshotTimestamp = blockTimestamp;
  if (snapshotNumber === undefined || snapshotTimestamp === undefined) {
    const snapshot = await publicClient.getBlock();
    snapshotNumber = snapshot.number;
    snapshotTimestamp = snapshot.timestamp;
  }

  const lifecycle = await publicClient.readContract({
    address: consensusDataAddress,
    abi: CONSENSUS_DATA_TRAIN_ABI,
    functionName: "getTransactionLifecycle",
    args: [txId, snapshotTimestamp],
    blockNumber: snapshotNumber,
  }) as any;
  const resolution = lifecycle.resolution ?? lifecycle[1];
  const latestDecision = lifecycle.latestDecision ?? lifecycle[2];
  const decisionActive = Boolean(lifecycle.decisionActive ?? lifecycle[3]);

  return {
    blockNumber: snapshotNumber,
    blockTimestamp: snapshotTimestamp,
    resolutionAction: Number(resolution.action ?? resolution[3]),
    attemptId: (resolution.attemptId ?? resolution[15]) as `0x${string}`,
    decisionActive,
    decisionId: decisionActive
      ? BigInt(latestDecision.decisionId ?? latestDecision[1])
      : 0n,
  };
};

const _readAppealContext = async ({
  client,
  publicClient,
  txId,
  includeQuote = true,
}: {
  client: GenLayerClient<GenLayerChain>;
  publicClient: PublicClient;
  txId: `0x${string}`;
  includeQuote?: boolean;
}): Promise<LifecycleIdentity & {requiredValue: bigint}> => {
  const identity = await _readLifecycleIdentity({client, publicClient, txId});
  if (!identity.decisionActive) {
    throw new Error(`Transaction ${txId} has no active decision to appeal`);
  }

  if (!includeQuote) {
    return {...identity, requiredValue: 0n};
  }

  const consensusDataAddress = client.chain.consensusDataContract!.address as Address;
  const quote = await publicClient.readContract({
    address: consensusDataAddress,
    abi: CONSENSUS_DATA_TRAIN_ABI,
    functionName: "estimateLatestAppealCharge",
    args: [txId],
    blockNumber: identity.blockNumber,
  }) as any;
  const quoteDecisionId = BigInt(quote.decisionId ?? quote[0]);
  if (quoteDecisionId !== identity.decisionId) {
    throw new Error(
      `Appeal decision changed while reading ${txId}: expected ${identity.decisionId}, received ${quoteDecisionId}`,
    );
  }
  const bond = BigInt(quote.bond ?? quote[1]);
  const funding = BigInt(quote.funding ?? quote[2]);
  return {...identity, requiredValue: bond + funding};
};

const _encodeTopUpFeesData = ({
  txId,
  distribution,
}: {
  txId: `0x${string}`;
  distribution: FeesDistributionInput;
}): `0x${string}` => {
  return encodeFunctionData({
    abi: CONSENSUS_FEE_MANAGEMENT_ABI,
    functionName: "topUpFees",
    args: [txId, createFeesDistribution(distribution)],
  });
};

const _encodeTopUpAndSubmitAppealData = ({
  txId,
  expectedDecisionId,
  distribution,
}: {
  txId: `0x${string}`;
  expectedDecisionId: bigint;
  distribution: FeesDistributionInput;
}): `0x${string}` => {
  return encodeFunctionData({
    abi: CONSENSUS_FEE_MANAGEMENT_ABI,
    functionName: "topUpAndSubmitAppeal",
    args: [txId, expectedDecisionId, createFeesDistribution(distribution)],
  });
};

const _sendEvmContractCall = async ({
  client,
  publicClient,
  to,
  encodedData,
  senderAccount,
  value = 0n,
  operationName = "Contract call",
}: {
  client: GenLayerClient<GenLayerChain>;
  publicClient: PublicClient;
  to: Address;
  encodedData: `0x${string}`;
  senderAccount?: Account;
  value?: bigint;
  operationName?: string;
}): Promise<`0x${string}`> => {
  const validatedAccount = validateAccount(senderAccount);
  const nonce = await client.getCurrentNonce({address: validatedAccount.address});

  let estimatedGas: bigint;
  try {
    estimatedGas = await client.estimateTransactionGas({
      from: validatedAccount.address,
      to,
      data: encodedData,
      value,
    });
  } catch (err) {
    console.error("Gas estimation failed, using default 200_000:", err);
    estimatedGas = 200_000n;
  }

  const gasPriceHex = (await client.request({method: "eth_gasPrice"})) as string;

  if (validatedAccount.type === "local") {
    if (!validatedAccount.signTransaction) {
      throw new Error("Local account does not support signTransaction.");
    }
    const txRequest = {
      account: validatedAccount,
      to,
      data: encodedData,
      value,
      gas: estimatedGas,
      gasPrice: BigInt(gasPriceHex),
      nonce,
      chainId: client.chain.id,
    };
    const serializedTransaction = await validatedAccount.signTransaction(txRequest);
    const evmHash = await client.sendRawTransaction({serializedTransaction});
    if (client.chain.isStudio) {
      return evmHash;
    }
    const receipt = await publicClient.waitForTransactionReceipt({hash: evmHash});
    if (receipt.status === "reverted") {
      throw new Error(`${operationName} reverted: EVM tx ${evmHash}`);
    }
    return evmHash;
  }

  const evmHash = (await client.request({
    method: "eth_sendTransaction",
    params: [{
      from: validatedAccount.address,
      to,
      data: encodedData,
      value: value ? (`0x${value.toString(16)}` as `0x${string}`) : undefined,
      gas: `0x${estimatedGas.toString(16)}` as `0x${string}`,
      nonce: `0x${BigInt(nonce).toString(16)}` as `0x${string}`,
      gasPrice: gasPriceHex as `0x${string}`,
    }],
  })) as `0x${string}`;
  if (client.chain.isStudio) {
    return evmHash;
  }
  const receipt = await publicClient.waitForTransactionReceipt({hash: evmHash});
  if (receipt.status === "reverted") {
    throw new Error(`${operationName} reverted: EVM tx ${evmHash}`);
  }
  return evmHash;
};

/**
 * Sends a pre-encoded call to the consensus main contract, bypassing the
 * NewTransaction/CreatedTransaction log extraction used by _sendTransaction.
 * Used for consensus admin calls (appeal, finalize, etc.) that operate on
 * existing GenLayer transactions rather than creating new ones.
 * Returns the backend RPC hash: an EVM transaction hash on network backends,
 * or the target GenLayer tx id on Studio/localnet fee-management calls.
 */
const _sendConsensusCall = async ({
  client,
  publicClient,
  encodedData,
  senderAccount,
  value = 0n,
  operationName = "Consensus call",
}: {
  client: GenLayerClient<GenLayerChain>;
  publicClient: PublicClient;
  encodedData: `0x${string}`;
  senderAccount?: Account;
  value?: bigint;
  operationName?: string;
}): Promise<`0x${string}`> => {
  if (!client.chain.consensusMainContract?.address) {
    throw new Error("Consensus main contract not initialized.");
  }

  const validatedAccount = validateAccount(senderAccount);
  const nonce = await client.getCurrentNonce({address: validatedAccount.address});

  let estimatedGas: bigint;
  try {
    estimatedGas = await client.estimateTransactionGas({
      to: client.chain.consensusMainContract.address,
      data: encodedData,
      value,
    });
  } catch (err) {
    console.error("Gas estimation failed, using default 200_000:", err);
    estimatedGas = 200_000n;
  }

  const gasPriceHex = (await client.request({method: "eth_gasPrice"})) as string;

  if (validatedAccount.type === "local") {
    if (!validatedAccount.signTransaction) {
      throw new Error("Local account does not support signTransaction.");
    }
    const txRequest = {
      account: validatedAccount,
      to: client.chain.consensusMainContract.address as `0x${string}`,
      data: encodedData,
      value,
      gas: estimatedGas,
      gasPrice: BigInt(gasPriceHex),
      nonce,
      chainId: client.chain.id,
    };
    const serializedTransaction = await validatedAccount.signTransaction(txRequest);
    const evmHash = await client.sendRawTransaction({serializedTransaction});
    if (client.chain.isStudio) {
      return evmHash;
    }
    const receipt = await publicClient.waitForTransactionReceipt({hash: evmHash});
    if (receipt.status === "reverted") {
      throw new Error(`${operationName} reverted: EVM tx ${evmHash}`);
    }
    return evmHash;
  }

  const evmHash = (await client.request({
    method: "eth_sendTransaction",
    params: [{
      from: validatedAccount.address,
      to: client.chain.consensusMainContract.address,
      data: encodedData,
      value: value ? (`0x${value.toString(16)}` as `0x${string}`) : undefined,
      gas: `0x${estimatedGas.toString(16)}` as `0x${string}`,
    }],
  })) as `0x${string}`;
  if (client.chain.isStudio) {
    return evmHash;
  }
  const receipt = await publicClient.waitForTransactionReceipt({hash: evmHash});
  if (receipt.status === "reverted") {
    throw new Error(`${operationName} reverted: EVM tx ${evmHash}`);
  }
  return evmHash;
};

/**
 * Extracts the GenLayer txId from receipt logs by checking for either
 * NewTransaction (immediately activated) or CreatedTransaction (queued) events.
 */
const extractTxIdFromLogs = (
  client: GenLayerClient<GenLayerChain>,
  logs: any[],
): `0x${string}` | null => {
  const newTxEvents = parseEventLogs({
    abi: client.chain.consensusMainContract?.abi as any,
    eventName: "NewTransaction",
    logs,
  }) as unknown as {args: {txId: `0x${string}`}}[];

  if (newTxEvents.length > 0) {
    return newTxEvents[0].args["txId"];
  }

  const createdTxEvents = parseEventLogs({
    abi: CREATED_TRANSACTION_EVENT_ABI as any,
    eventName: "CreatedTransaction",
    logs,
  }) as unknown as {args: {txId: `0x${string}`}}[];

  if (createdTxEvents.length > 0) {
    return createdTxEvents[0].args["txId"];
  }

  return null;
};

const _sendTransaction = async ({
  client,
  publicClient,
  transactionVariants,
  senderAccount,
}: {
  client: GenLayerClient<GenLayerChain>;
  publicClient: PublicClient;
  transactionVariants: EncodedTransactionVariant[];
  senderAccount?: Account;
}) => {
  if (!client.chain.consensusMainContract?.address) {
    throw new Error(`Consensus main contract address not found in chain config for "${client.chain.name}".`);
  }
  if (transactionVariants.length === 0) {
    throw new Error("No transaction variants available to send.");
  }

  const validatedSenderAccount = validateAccount(senderAccount);
  const nonce = await client.getCurrentNonce({address: validatedSenderAccount.address});

  const knownRevertSelectorNames: Record<string, string> = {
    "0x8d53e553": "InsufficientFees",
    "0xb4132db3": "MaxPriceExceeded",
    "0x57df8523": "ExecutionBudgetExceeded",
    "0x305e533c": "BudgetTooLow",
    "0xa70732ee": "RollupBudgetBelowFloor",
    "0x632be5a1": "FeeValueMustBeNonZero",
  };

  const stringifyRpcError = (error: unknown): string => {
    const parts: string[] = [];
    if (error instanceof Error) {
      parts.push(error.message);
    }
    const record = error && typeof error === "object" ? error as Record<string, unknown> : {};
    for (const key of ["details", "shortMessage", "data"]) {
      const value = record[key];
      if (typeof value === "string" && value.trim() !== "") {
        parts.push(value);
      }
    }
    const cause = record.cause;
    if (cause && typeof cause === "object") {
      const causeRecord = cause as Record<string, unknown>;
      for (const key of ["message", "data"]) {
        const value = causeRecord[key];
        if (typeof value === "string" && value.trim() !== "") {
          parts.push(value);
        }
      }
    }
    const text = Array.from(new Set(parts)).join(" ");
    const selectorName = Object.entries(knownRevertSelectorNames)
      .find(([selector]) => text.includes(selector))?.[1];
    return selectorName && !text.includes(selectorName)
      ? `${text} (${selectorName})`
      : text;
  };

  const sendWithEncodedData = async (transactionVariant: EncodedTransactionVariant) => {
    let estimatedGas: bigint;
    let gasEstimationError: string | undefined;
    try {
      estimatedGas = await client.estimateTransactionGas({
        from: validatedSenderAccount.address,
        to: client.chain.consensusMainContract?.address as Address,
        data: transactionVariant.encodedData,
        value: transactionVariant.value,
      });
      estimatedGas = withTransactionGasHeadroom(estimatedGas);
    } catch (err) {
      gasEstimationError = stringifyRpcError(err);
      console.error("Gas estimation failed, using default 200_000:", err);
      estimatedGas = 200_000n;
    }

    // For local accounts, build transaction request directly to avoid viem's
    // prepareTransactionRequest which calls eth_fillTransaction (unsupported by GenLayer RPC)
    if (validatedSenderAccount?.type === "local") {
      if (!validatedSenderAccount?.signTransaction) {
        throw new Error("Local account does not support signTransaction. Use a private key account created via privateKeyToAccount().");
      }

      const gasPriceHex = (await client.request({
        method: "eth_gasPrice",
      })) as string;

      const transactionRequest = {
        account: validatedSenderAccount,
        to: client.chain.consensusMainContract?.address as Address,
        data: transactionVariant.encodedData,
        type: "legacy" as const,
        nonce: Number(nonce),
        value: transactionVariant.value,
        gas: estimatedGas,
        gasPrice: BigInt(gasPriceHex),
        chainId: client.chain.id,
      };

      const serializedTransaction = await validatedSenderAccount.signTransaction(transactionRequest);
      const txHash = await client.sendRawTransaction({serializedTransaction: serializedTransaction});

      if (client.chain.isStudio) {
        // Studio RPCs process eth_sendRawTransaction internally. The returned
        // hash is already the GenLayer tx hash; there is no separate EVM
        // receipt to wait for or consensus event to extract.
        return txHash;
      }

      const receipt = await publicClient.waitForTransactionReceipt({hash: txHash});

      if (receipt.status === "reverted") {
        throw new Error(
          `Transaction reverted: EVM tx ${txHash} to consensus contract ${client.chain.consensusMainContract?.address} was reverted.${
            gasEstimationError ? ` Gas estimation error: ${gasEstimationError}` : ""
          }`,
        );
      }

      const txId = extractTxIdFromLogs(client, receipt.logs);
      if (!txId) {
        throw new Error(
          `Transaction not processed by consensus: EVM tx ${txHash} succeeded but no NewTransaction or CreatedTransaction event was found in the receipt logs.`,
        );
      }

      return txId;
    }

    // For injected/external wallets (e.g. MetaMask), avoid viem's
    // prepareTransactionRequest() because it may call eth_fillTransaction and
    // eth_getBlockByNumber, which are not available on all GenLayer-compatible RPCs.
    let gasPriceHex: `0x${string}` | undefined;
    try {
      const gasPriceResult = await client.request({
        method: "eth_gasPrice",
      });
      if (typeof gasPriceResult === "string") {
        gasPriceHex = gasPriceResult as `0x${string}`;
      }
    } catch (error) {
      console.warn("Failed to fetch gas price, delegating gas price selection to wallet:", error);
    }

    const nonceBigInt =
      typeof nonce === "bigint"
        ? nonce
        : typeof nonce === "string"
          ? BigInt(nonce)
          : BigInt(Number(nonce));

    const formattedRequest = {
      from: validatedSenderAccount.address,
      to: client.chain.consensusMainContract?.address as Address,
      data: transactionVariant.encodedData,
      value: `0x${transactionVariant.value.toString(16)}`,
      gas: `0x${estimatedGas.toString(16)}`,
      nonce: `0x${nonceBigInt.toString(16)}`,
      type: "0x0", // legacy tx
      chainId: `0x${client.chain.id.toString(16)}`,
      ...(gasPriceHex ? {gasPrice: gasPriceHex} : {}),
    };

    const evmTxHash = (await client.request({
      method: "eth_sendTransaction",
      params: [formattedRequest as any],
    })) as `0x${string}`;

    if (client.chain.isStudio) {
      // Studio RPCs process eth_sendRawTransaction internally (MetaMask signs
      // and forwards). The returned hash IS the GenLayer tx hash — no need to
      // wait for an EVM receipt or extract txId from logs.
      return evmTxHash;
    }

    // On real testnets, extract GenLayer txId from the NewTransaction event.
    const externalReceipt = await publicClient.waitForTransactionReceipt({hash: evmTxHash});

    if (externalReceipt.status === "reverted") {
      throw new Error(
        `Transaction reverted: EVM tx ${evmTxHash} to consensus contract ${client.chain.consensusMainContract?.address} was reverted.${
          gasEstimationError ? ` Gas estimation error: ${gasEstimationError}` : ""
        }`,
      );
    }

    const externalTxId = extractTxIdFromLogs(client, externalReceipt.logs);
    if (!externalTxId) {
      throw new Error(
        `Transaction not processed by consensus: EVM tx ${evmTxHash} succeeded but no NewTransaction or CreatedTransaction event was found in the receipt logs.`,
      );
    }

    return externalTxId;
  };

  if (transactionVariants.length !== 1) {
    throw new Error(`Train transaction encoding expected one variant, received ${transactionVariants.length}`);
  }
  return sendWithEncodedData(transactionVariants[0]);
};
