import * as calldata from "@/abi/calldata";
import {serialize} from "@/abi/transactions";

import {
  Account,
  ContractSchema,
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
} from "@/types";
import {fromHex, toHex, zeroAddress, encodeFunctionData, PublicClient, parseEventLogs, type Abi} from "viem";
import {TransactionHash} from "@/types/transactions";
import {toJsonSafeDeep, b64ToArray, arrayToB64} from "@/utils/jsonifier";
import {
  CALL_KEY_WILDCARD,
  createFeesDistribution,
  MESSAGE_ALLOCATION_ROOT_PARENT_INDEX,
  normalizeMessageFeeAllocations,
  normalizeTransactionFees,
  NormalizedTransactionFees,
} from "@/transactions/fees";

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
    /** Calculates the minimum bond required to appeal a transaction. */
    getMinAppealBond: async (args: {txId: `0x${string}`}): Promise<bigint> => {
      const {txId} = args;

      if (!client.chain.feeManagerContract?.address || !client.chain.roundsStorageContract?.address) {
        throw new Error("Appeal bond calculation not supported on this chain (missing feeManagerContract/roundsStorageContract)");
      }

      const roundNumber = await publicClient.readContract({
        address: client.chain.roundsStorageContract.address as `0x${string}`,
        abi: client.chain.roundsStorageContract.abi as Abi,
        functionName: "getRoundNumber",
        args: [txId],
      }) as bigint;

      const transaction = await client.getTransaction({hash: txId as TransactionHash});
      const txStatus = Number(transaction.status);

      const minBond = await publicClient.readContract({
        address: client.chain.feeManagerContract.address as `0x${string}`,
        abi: client.chain.feeManagerContract.abi as Abi,
        functionName: "calculateMinAppealBond",
        args: [txId, roundNumber, txStatus],
      }) as bigint;

      return minBond;
    },
    /** Returns the current consensus round number for a transaction. */
    getRoundNumber: async (args: {txId: `0x${string}`}): Promise<bigint> => {
      if (!client.chain.roundsStorageContract?.address) {
        throw new Error("getRoundNumber not supported on this chain (missing roundsStorageContract)");
      }
      return publicClient.readContract({
        address: client.chain.roundsStorageContract.address as `0x${string}`,
        abi: client.chain.roundsStorageContract.abi as Abi,
        functionName: "getRoundNumber",
        args: [args.txId],
      }) as Promise<bigint>;
    },
    /** Returns detailed data for a specific consensus round. */
    getRoundData: async (args: {txId: `0x${string}`; round: bigint}) => {
      if (!client.chain.roundsStorageContract?.address) {
        throw new Error("getRoundData not supported on this chain (missing roundsStorageContract)");
      }
      return publicClient.readContract({
        address: client.chain.roundsStorageContract.address as `0x${string}`,
        abi: client.chain.roundsStorageContract.abi as Abi,
        functionName: "getRoundData",
        args: [args.txId, args.round],
      });
    },
    /** Returns the current round number and its data for a transaction. */
    getLastRoundData: async (args: {txId: `0x${string}`}) => {
      if (!client.chain.roundsStorageContract?.address) {
        throw new Error("getLastRoundData not supported on this chain (missing roundsStorageContract)");
      }
      return publicClient.readContract({
        address: client.chain.roundsStorageContract.address as `0x${string}`,
        abi: client.chain.roundsStorageContract.abi as Abi,
        functionName: "getLastRoundData",
        args: [args.txId],
      });
    },
    /** Checks if a transaction can be appealed. */
    canAppeal: async (args: {txId: `0x${string}`}): Promise<boolean> => {
      if (!client.chain.appealsContract?.address) {
        throw new Error("canAppeal not supported on this chain (missing appealsContract)");
      }
      return publicClient.readContract({
        address: client.chain.appealsContract.address as `0x${string}`,
        abi: client.chain.appealsContract.abi as Abi,
        functionName: "canAppeal",
        args: [args.txId],
      }) as Promise<boolean>;
    },
    /** Appeals a consensus transaction to trigger a new round of validation. */
    appealTransaction: async (args: {
      account?: Account;
      txId: `0x${string}`;
      value?: bigint;
    }) => {
      const {account, txId} = args;
      const value = await _resolveAppealValue({client, publicClient, txId, value: args.value});

      const senderAccount = account || client.account;
      const encodedData = _encodeSubmitAppealData({client, txId});
      // Appeals don't go through _sendTransaction because submitAppeal emits
      // AppealStarted/TransactionActivated events, not NewTransaction/CreatedTransaction.
      // The appeal operates on the same GenLayer txId, so we return it directly.
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
     */
    topUpAndSubmitAppeal: async (args: {
      account?: Account;
      txId: `0x${string}`;
      distribution: FeesDistributionInput;
      value?: bigint;
    }): Promise<`0x${string}`> => {
      const {account, txId, distribution} = args;
      const value = await _resolveAppealValue({client, publicClient, txId, value: args.value});

      const senderAccount = account || client.account;
      const encodedData = _encodeTopUpAndSubmitAppealData({txId, distribution});
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
      const encodedData = encodeFunctionData({
        abi: client.chain.consensusMainContract?.abi as any,
        functionName: "finalizeTransaction",
        args: [txId],
      });
      return _sendConsensusCall({
        client,
        publicClient,
        encodedData,
        senderAccount,
        operationName: "Finalize",
      });
    },
    /** Batch-finalizes idle GenLayer transactions (those stuck without progressing). Returns the EVM transaction hash. */
    finalizeIdlenessTxs: async (args: {
      account?: Account;
      txIds: readonly `0x${string}`[];
    }): Promise<`0x${string}`> => {
      const {account, txIds} = args;
      if (txIds.length === 0) {
        throw new Error("finalizeIdlenessTxs requires at least one txId.");
      }
      const senderAccount = account || client.account;
      const encodedData = encodeFunctionData({
        abi: client.chain.consensusMainContract?.abi as any,
        functionName: "finalizeIdlenessTxs",
        args: [txIds],
      });
      return _sendConsensusCall({
        client,
        publicClient,
        encodedData,
        senderAccount,
        operationName: "Finalize idleness",
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
    stateMutability: "payable",
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
      {name: "_feesDistribution", type: "tuple", components: FEES_DISTRIBUTION_COMPONENTS},
    ],
    outputs: [],
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

type AddTransactionAbiVersion = "fees" | "v6" | "v5";

const getAddTransactionAbiVersion = (abi: readonly unknown[] | undefined): AddTransactionAbiVersion => {
  if (!abi || !Array.isArray(abi)) {
    return "v5";
  }

  const addTransactionFunction = abi.find(item => {
    if (!item || typeof item !== "object") {
      return false;
    }

    const candidate = item as {type?: string; name?: string};
    return candidate.type === "function" && candidate.name === "addTransaction";
  }) as {inputs?: readonly {type?: string; components?: readonly unknown[]}[]} | undefined;

  const inputs = addTransactionFunction?.inputs;
  if (!Array.isArray(inputs)) {
    return "v5";
  }

  if (inputs.length === 1 && inputs[0]?.type === "tuple") {
    return "fees";
  }

  return inputs.length >= 6 ? "v6" : "v5";
};

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
const DEFAULT_RECEIPT_SLOTS_CHANGED = 7n;
const DEFAULT_INTRINSIC_GAS = 21_000n;
const DEFAULT_BOOTLOADER_OVERHEAD = 60_000n;
const DEFAULT_GAS_PER_CHANGED_SLOT = 1_000n;
const DEFAULT_CALLDATA_GAS_PER_BYTE = 16n;
const DEFAULT_FIXED_PROPOSE_RECEIPT_GAS = 210_000n;
const DEFAULT_FIXED_MESSAGE_REVEAL_GAS = 100_000n;
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
  const [genPerTimeUnit, storageUnitPrice, receiptGasPrice, executionBudgetFloor] = await Promise.all([
    publicClient.readContract({address, abi, functionName: "GENPerTimeUnit", args: []}) as Promise<bigint>,
    publicClient.readContract({address, abi, functionName: "storageUnitPrice", args: []}) as Promise<bigint>,
    publicClient.readContract({address, abi, functionName: "quoteGasPrice", args: []}) as Promise<bigint>,
    publicClient.readContract({address, abi, functionName: "messageFeeParamsBudgetFloor", args: []}) as Promise<bigint>,
  ]);

  return {
    enabled: genPerTimeUnit > 0n || storageUnitPrice > 0n || receiptGasPrice > 0n,
    genPerTimeUnit,
    storageUnitPrice,
    receiptGasPrice,
    executionBudgetFloor,
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
        defaultExecutionBudgetPerRound(policy),
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

  const addTransactionArgs: [
    Address,
    `0x${string}`,
    number,
    number,
    `0x${string}`,
  ] = [
    validatedSenderAccount.address,
    txRecipient,
    client.chain.defaultNumberOfInitialValidators,
    consensusMaxRotations,
    txCalldata,
  ];

  const buildVariant = (abiVersion: AddTransactionAbiVersion): EncodedTransactionVariant => {
    if (abiVersion === "fees") {
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

      return {
        encodedData: encodeFunctionData({
          abi: ADD_TRANSACTION_ABI_WITH_FEES as any,
          functionName: "addTransaction",
          args: [params],
        }),
        value: userValue + feeValue,
      };
    }

    if (abiVersion === "v6") {
      return {
        encodedData: encodeFunctionData({
          abi: ADD_TRANSACTION_ABI_V6 as any,
          functionName: "addTransaction",
          args: [...addTransactionArgs, txValidUntil],
        }),
        value: userValue,
      };
    }

    return {
      encodedData: encodeFunctionData({
        abi: ADD_TRANSACTION_ABI_V5 as any,
        functionName: "addTransaction",
        args: addTransactionArgs,
      }),
      value: userValue,
    };
  };

  if (transactionFees.requiresFeeAwareTransaction) {
    return [buildVariant("fees")];
  }

  const detectedVersion = getAddTransactionAbiVersion(client.chain.consensusMainContract?.abi);
  const orderByDetectedVersion: Record<AddTransactionAbiVersion, AddTransactionAbiVersion[]> = {
    fees: ["fees", "v6", "v5"],
    v6: ["v6", "v5", "fees"],
    v5: ["v5", "v6", "fees"],
  };

  return orderByDetectedVersion[detectedVersion].map(buildVariant);
};

const _encodeSubmitAppealData = ({
  client,
  txId,
}: {
  client: GenLayerClient<GenLayerChain>;
  txId: `0x${string}`;
}): `0x${string}` => {
  return encodeFunctionData({
    abi: client.chain.consensusMainContract?.abi as any,
    functionName: "submitAppeal",
    args: [txId],
  });
};

const _resolveAppealValue = async ({
  client,
  publicClient,
  txId,
  value,
}: {
  client: GenLayerClient<GenLayerChain>;
  publicClient: PublicClient;
  txId: `0x${string}`;
  value?: bigint;
}): Promise<bigint> => {
  if (value !== undefined) {
    return value;
  }

  if (!client.chain.feeManagerContract?.address || !client.chain.roundsStorageContract?.address) {
    return 0n;
  }

  const roundNumber = await publicClient.readContract({
    address: client.chain.roundsStorageContract.address as `0x${string}`,
    abi: client.chain.roundsStorageContract.abi as Abi,
    functionName: "getRoundNumber",
    args: [txId],
  }) as bigint;

  const transaction = await client.getTransaction({hash: txId as TransactionHash});
  const txStatus = Number(transaction.status);

  return publicClient.readContract({
    address: client.chain.feeManagerContract.address as `0x${string}`,
    abi: client.chain.feeManagerContract.abi as Abi,
    functionName: "calculateMinAppealBond",
    args: [txId, roundNumber, txStatus],
  }) as Promise<bigint>;
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
  distribution,
}: {
  txId: `0x${string}`;
  distribution: FeesDistributionInput;
}): `0x${string}` => {
  return encodeFunctionData({
    abi: CONSENSUS_FEE_MANAGEMENT_ABI,
    functionName: "topUpAndSubmitAppeal",
    args: [txId, createFeesDistribution(distribution)],
  });
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

const isAddTransactionAbiMismatchError = (error: unknown): boolean => {
  const seen = new WeakSet<object>();
  const serializedError =
    typeof error === "object" && error !== null
      ? JSON.stringify(error, (_key, value) => {
        if (typeof value === "bigint") {
          return value.toString();
        }

        if (typeof value === "object" && value !== null) {
          if (seen.has(value as object)) {
            return "[Circular]";
          }
          seen.add(value as object);
        }

        return value;
      })
      : "";
  const errorObject = error as {shortMessage?: string; details?: string; message?: string};
  const errorMessage = [
    errorObject?.shortMessage,
    errorObject?.details,
    errorObject?.message,
    serializedError,
    String(error ?? ""),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return (
    errorMessage.includes("invalid pointer in tuple") ||
    errorMessage.includes("invalid pointer") ||
    errorMessage.includes("could not decode") ||
    errorMessage.includes("invalid arrayify value") ||
    errorMessage.includes("types/value length mismatch")
  );
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

  for (let i = 0; i < transactionVariants.length; i++) {
    try {
      return await sendWithEncodedData(transactionVariants[i]);
    } catch (error) {
      if (i === transactionVariants.length - 1 || !isAddTransactionAbiMismatchError(error)) {
        throw error;
      }
    }
  }

  throw new Error("Unable to send transaction.");
};
