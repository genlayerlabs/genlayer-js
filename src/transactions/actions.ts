import {GenLayerClient} from "../types/clients";
import {
  TransactionHash,
  TransactionStatus,
  GenLayerTransaction,
  GenLayerRawTransaction,
  ExecutionResult,
  transactionsStatusNameToNumber,
  transactionsStatusNumberToName,
  executionResultNumberToName,
  isDecidedState,
  DebugTraceResult,
  TransactionReceiptWaitUntil,
  transactionResolutionActionNumberToName,
} from "../types/transactions";
import {transactionsConfig} from "../config/transactions";
import {sleep} from "../utils/async";
import {GenLayerChain} from "@/types";
import {Abi, PublicClient, Address, keccak256, concat, stringToBytes, toBytes, zeroAddress} from "viem";
import {decodeLocalnetTransaction, decodeTransaction, simplifyTransactionReceipt} from "./decoders";
import {
  ADDRESS_MANAGER_TRAIN_ABI,
  CONSENSUS_DATA_BIG_ROUNDS_TRAIN_ABI,
  CONSENSUS_DATA_TRAIN_ABI,
  ROUNDS_STORAGE_TRAIN_READ_ABI,
  TRANSACTION_MANAGER_TRAIN_READ_ABI,
} from "../abi/consensusTrain";

const TRANSACTION_PAGE_SIZE = 64n;

const resolvedAddress = (name: string, address: Address): Address => {
  if (address === zeroAddress) {
    throw new Error(`${name} is not registered in AddressManager`);
  }
  return address;
};

type AddressPage = readonly [readonly Address[], bigint] | {page: readonly Address[]; total: bigint};

const unpackAddressPage = (result: AddressPage): {page: readonly Address[]; total: bigint} =>
  "page" in result ? result : {page: result[0], total: result[1]};

const readAddressPages = async (
  total: bigint,
  readPage: (offset: bigint) => Promise<AddressPage>,
): Promise<Address[]> => {
  const offsets: bigint[] = [];
  for (let offset = 0n; offset < total; offset += TRANSACTION_PAGE_SIZE) offsets.push(offset);
  const pages = (await Promise.all(offsets.map(readPage))).map(unpackAddressPage);
  if (pages.some(page => page.total !== total)) {
    throw new Error("Address page total changed within a fixed block snapshot");
  }
  const items = pages.flatMap(({page}) => [...page]);
  if (BigInt(items.length) !== total) {
    throw new Error(`Incomplete address pages: expected ${total}, received ${items.length}`);
  }
  return items;
};

let didWarnWaitForTransactionReceiptStatus = false;

const warnDeprecatedReceiptStatus = () => {
  if (didWarnWaitForTransactionReceiptStatus) return;
  didWarnWaitForTransactionReceiptStatus = true;
  console.warn("waitForTransactionReceipt({ status }) is deprecated; use waitUntil: 'decided' or waitUntil: 'finalized' instead.");
};

const resolveWaitTarget = (
  status: TransactionStatus | undefined,
  waitUntil: TransactionReceiptWaitUntil | undefined,
): {
  waitUntil?: TransactionReceiptWaitUntil;
  legacyStatus?: TransactionStatus;
  label: string;
} => {
  if (waitUntil) {
    return {waitUntil, label: waitUntil};
  }
  if (!status) {
    return {waitUntil: "decided", label: "decided"};
  }

  warnDeprecatedReceiptStatus();
  if (status === TransactionStatus.ACCEPTED) {
    return {waitUntil: "decided", label: "decided"};
  }
  if (status === TransactionStatus.FINALIZED) {
    return {waitUntil: "finalized", label: "finalized"};
  }
  return {legacyStatus: status, label: status};
};

const hasReachedWaitTarget = (
  transactionStatusString: string,
  target: ReturnType<typeof resolveWaitTarget>,
): boolean => {
  if (target.waitUntil === "decided") {
    return isDecidedState(transactionStatusString);
  }
  if (target.waitUntil === "finalized") {
    return transactionStatusString === transactionsStatusNameToNumber[TransactionStatus.FINALIZED];
  }
  if (!target.legacyStatus) return false;
  return transactionStatusString === transactionsStatusNameToNumber[target.legacyStatus];
};

export const isSuccessful = (transaction: GenLayerTransaction): boolean => {
  const statusName = transaction.statusName ?? (
    typeof transaction.status === "string" && transaction.status in TransactionStatus
      ? transaction.status as TransactionStatus
      : transaction.status === undefined
        ? undefined
        : transactionsStatusNumberToName[String(transaction.status) as keyof typeof transactionsStatusNumberToName]
  );
  const executionResultName = transaction.txExecutionResultName ?? (
    transaction.txExecutionResult === undefined
      ? undefined
      : executionResultNumberToName[String(transaction.txExecutionResult) as keyof typeof executionResultNumberToName]
  );

  return (
    (statusName === TransactionStatus.ACCEPTED || statusName === TransactionStatus.FINALIZED) &&
    executionResultName === ExecutionResult.FINISHED_WITH_RETURN
  );
};

export const receiptActions = (client: GenLayerClient<GenLayerChain>, publicClient: PublicClient) => ({
  /** Polls until a transaction reaches the specified status. Returns the transaction receipt. */
  waitForTransactionReceipt: async ({
    hash,
    status,
    waitUntil,
    interval = transactionsConfig.waitInterval,
    retries = transactionsConfig.retries,
    fullTransaction = false,
  }: {
    hash: TransactionHash;
    /** @deprecated Use waitUntil: "decided" or waitUntil: "finalized" instead. */
    status?: TransactionStatus;
    waitUntil?: TransactionReceiptWaitUntil;
    interval?: number;
    retries?: number;
    fullTransaction?: boolean;
  }): Promise<GenLayerTransaction> => {
    const target = resolveWaitTarget(status, waitUntil);
    const transaction = await client.getTransaction({
      hash,
    });

    if (!transaction) {
      throw new Error(`Transaction not found: ${hash}`);
    }
    const transactionStatusString = String(transaction.status);
    if (hasReachedWaitTarget(transactionStatusString, target)) {
      let finalTransaction = transaction;
      if (client.chain.isStudio) {
        finalTransaction = decodeLocalnetTransaction(transaction as unknown as GenLayerTransaction);
      }
      if (!fullTransaction) {
        return simplifyTransactionReceipt(finalTransaction as GenLayerTransaction);
      }
      return finalTransaction;
    }

    if (retries === 0) {
      throw new Error(`Timed out waiting for transaction ${hash} to reach "${target.label}" (current status: ${transactionStatusString}).`);
    }

    await sleep(interval);
    return receiptActions(client, publicClient).waitForTransactionReceipt({
      hash,
      waitUntil: target.waitUntil,
      status: target.legacyStatus,
      interval,
      retries: retries - 1,
      fullTransaction,
    });
  },
});

export const transactionActions = (client: GenLayerClient<GenLayerChain>, publicClient: PublicClient) => ({
  /**
   * Fetches the train transaction snapshot, including projected/stored status,
   * resolution action, authoritative finalization readiness, and split round data.
   */
  getTransaction: async ({hash}: {hash: TransactionHash}): Promise<GenLayerTransaction> => {
    if (client.chain.isStudio) {
      const transaction = await client.getTransaction({hash});
      const localnetStatus =
        (transaction.status as string) === "ACTIVATED" ? TransactionStatus.PENDING : transaction.status;

      transaction.status = Number(transactionsStatusNameToNumber[localnetStatus as TransactionStatus]);
      transaction.statusName = localnetStatus as TransactionStatus;
      return decodeLocalnetTransaction(transaction as unknown as GenLayerTransaction);
    }
    const consensusDataAddress = client.chain.consensusDataContract?.address as Address;
    if (!consensusDataAddress || consensusDataAddress === zeroAddress) {
      throw new Error("ConsensusData contract is not configured for this chain");
    }

    // Freeze every lifecycle and round read to one chain snapshot. A local
    // wall-clock projection mixed with moving latest-state reads can report a
    // status and finalization action that never coexisted.
    const snapshot = await publicClient.getBlock();
    const blockNumber = snapshot.number;
    const observedAt = snapshot.timestamp;
    const addressManagerAddress = resolvedAddress(
      "AddressManager",
      await publicClient.readContract({
        address: consensusDataAddress,
        abi: CONSENSUS_DATA_TRAIN_ABI,
        functionName: "addressManager",
        blockNumber,
      }) as Address,
    );

    const [bigRoundsAddressRaw, roundsStorageAddressRaw, transactionManagerAddressRaw] = await Promise.all([
      publicClient.readContract({
        address: addressManagerAddress,
        abi: ADDRESS_MANAGER_TRAIN_ABI,
        functionName: "getAddress",
        args: ["ConsensusDataBigRounds"],
        blockNumber,
      }),
      publicClient.readContract({
        address: addressManagerAddress,
        abi: ADDRESS_MANAGER_TRAIN_ABI,
        functionName: "getAddress",
        args: ["RoundsStorage"],
        blockNumber,
      }),
      publicClient.readContract({
        address: addressManagerAddress,
        abi: ADDRESS_MANAGER_TRAIN_ABI,
        functionName: "getAddress",
        args: ["TransactionManager"],
        blockNumber,
      }),
    ]) as [Address, Address, Address];
    const bigRoundsAddress = resolvedAddress("ConsensusDataBigRounds", bigRoundsAddressRaw);
    const roundsStorageAddress = resolvedAddress("RoundsStorage", roundsStorageAddressRaw);
    const transactionManagerAddress = resolvedAddress("TransactionManager", transactionManagerAddressRaw);

    const [txData, lifecycle] = await Promise.all([
      publicClient.readContract({
        address: bigRoundsAddress,
        abi: CONSENSUS_DATA_BIG_ROUNDS_TRAIN_ABI,
        functionName: "getStoredTransactionDataLight",
        args: [hash],
        blockNumber,
      }),
      publicClient.readContract({
        address: consensusDataAddress,
        abi: CONSENSUS_DATA_TRAIN_ABI,
        functionName: "getTransactionLifecycle",
        args: [hash, observedAt],
        blockNumber,
      }),
    ]) as [any, any];

    const round = txData.lastRound.round;
    const [roundValidators, consumedValidators, validatorVotes, validatorVotesHash, validatorResultHash, txExecutionResult, numOfInitialValidators] =
      await Promise.all([
        readAddressPages(txData.lastRound.validatorsCount, offset => publicClient.readContract({
          address: bigRoundsAddress,
          abi: CONSENSUS_DATA_BIG_ROUNDS_TRAIN_ABI,
          functionName: "getRoundValidatorsPaged",
          args: [hash, round, offset, TRANSACTION_PAGE_SIZE],
          blockNumber,
        }) as Promise<readonly [readonly Address[], bigint]>),
        readAddressPages(txData.consumedValidatorsCount, offset => publicClient.readContract({
          address: bigRoundsAddress,
          abi: CONSENSUS_DATA_BIG_ROUNDS_TRAIN_ABI,
          functionName: "getConsumedValidatorsPaged",
          args: [hash, offset, TRANSACTION_PAGE_SIZE],
          blockNumber,
        }) as Promise<readonly [readonly Address[], bigint]>),
        publicClient.readContract({
          address: roundsStorageAddress,
          abi: ROUNDS_STORAGE_TRAIN_READ_ABI,
          functionName: "getValidatorVotes",
          args: [hash, round],
          blockNumber,
        }),
        publicClient.readContract({
          address: roundsStorageAddress,
          abi: ROUNDS_STORAGE_TRAIN_READ_ABI,
          functionName: "getValidatorVotesHash",
          args: [hash, round],
          blockNumber,
        }),
        publicClient.readContract({
          address: roundsStorageAddress,
          abi: ROUNDS_STORAGE_TRAIN_READ_ABI,
          functionName: "getValidatorResultHash",
          args: [hash, round],
          blockNumber,
        }),
        publicClient.readContract({
          address: transactionManagerAddress,
          abi: TRANSACTION_MANAGER_TRAIN_READ_ABI,
          functionName: "getTxExecutionResult",
          args: [hash],
          blockNumber,
        }),
        publicClient.readContract({
          address: transactionManagerAddress,
          abi: TRANSACTION_MANAGER_TRAIN_READ_ABI,
          functionName: "getNumOfInitialValidators",
          args: [hash],
          blockNumber,
        }),
      ]) as [Address[], Address[], readonly number[], readonly `0x${string}`[], readonly `0x${string}`[], number, bigint];

    const projectedStatus = Number(lifecycle.resolution.projectedStatus);
    const storedStatus = Number(lifecycle.storedStatus);
    const resolutionAction = Number(lifecycle.resolution.action);
    const decisionId = lifecycle.decisionActive
      ? BigInt(lifecycle.latestDecision.decisionId)
      : 0n;
    const finalizeRead = await publicClient.readContract({
      address: consensusDataAddress,
      abi: CONSENSUS_DATA_TRAIN_ABI,
      functionName: "canFinalize",
      args: [hash, observedAt, decisionId],
      blockNumber,
    }) as any;
    const canFinalize = Boolean(finalizeRead.ready ?? finalizeRead[0]);

    const transaction = {
      ...txData,
      numOfInitialValidators,
      status: projectedStatus,
      txExecutionResult: Number(txExecutionResult),
      consumedValidators,
      lastRound: {
        ...txData.lastRound,
        roundValidators,
        validatorVotes: [...validatorVotes].map(Number),
        validatorVotesHash: [...validatorVotesHash],
        validatorResultHash: [...validatorResultHash],
      },
    } as unknown as GenLayerRawTransaction;
    const decoded = decodeTransaction(transaction);
    const resolutionActionName =
      transactionResolutionActionNumberToName[
        String(resolutionAction) as keyof typeof transactionResolutionActionNumberToName
      ];
    return {
      ...decoded,
      storedStatus,
      storedStatusName:
        transactionsStatusNumberToName[String(storedStatus) as keyof typeof transactionsStatusNumberToName],
      resolutionAction,
      resolutionActionName,
      canFinalize,
    };
  },
  /** Returns transaction IDs of child transactions created from emitted messages. */
  getTriggeredTransactionIds: async ({hash}: {hash: TransactionHash}): Promise<TransactionHash[]> => {
    if (client.chain.isStudio) {
      const tx = await client.getTransaction({hash});
      return ((tx as any).triggered_transactions ?? []) as TransactionHash[];
    }

    const tx = await transactionActions(client, publicClient).getTransaction({hash});
    const proposalBlock = BigInt(tx.readStateBlockRange?.proposalBlock ?? "0");
    if (proposalBlock === BigInt(0)) return [];

    const scanRange = BigInt(10_000);
    const latestBlock = await publicClient.getBlockNumber();
    const toBlock = proposalBlock + scanRange < latestBlock ? proposalBlock + scanRange : latestBlock;

    const consensusAddress = client.chain.consensusMainContract?.address as Address;
    const internalMessageProcessedTopic = keccak256(stringToBytes("InternalMessageProcessed(bytes32,address,address)"));
    const transactionAcceptedTopic = keccak256(stringToBytes("TransactionAccepted(bytes32)"));
    const transactionFinalizedTopic = keccak256(stringToBytes("TransactionFinalized(bytes32)"));

    // InternalMessageProcessed indexes the child transaction ID, not its
    // parent. Find the EVM transactions that decided the parent first, then
    // inspect their receipts for the child-message events emitted alongside
    // that decision.
    const decisionLogs = await publicClient.getLogs({
      address: consensusAddress,
      event: undefined,
      fromBlock: proposalBlock,
      toBlock,
      topics: [[transactionAcceptedTopic, transactionFinalizedTopic], hash],
    } as any);

    const decisionTransactionHashes = [
      ...new Set(decisionLogs.map(log => log.transactionHash).filter(Boolean)),
    ];
    const receipts = await Promise.all(
      decisionTransactionHashes.map(transactionHash =>
        publicClient.getTransactionReceipt({hash: transactionHash!}),
      ),
    );
    const normalizedConsensusAddress = consensusAddress.toLowerCase();

    return [
      ...new Set(
        receipts.flatMap(receipt =>
          receipt.logs
            .filter(
              log =>
                log.address.toLowerCase() === normalizedConsensusAddress &&
                log.topics[0] === internalMessageProcessedTopic,
            )
            .map(log => log.topics[1] as TransactionHash)
            .filter(Boolean),
        ),
      ),
    ];
  },
  /** Fetches the full execution trace including return data, stdout, stderr, and GenVM logs. */
  debugTraceTransaction: async ({hash, round = 0}: {hash: TransactionHash; round?: number}): Promise<DebugTraceResult> => {
    const result = await client.request({
      method: "gen_dbg_traceTransaction" as any,
      params: [{txID: hash, round}],
    });
    return result as DebugTraceResult;
  },
  /** Cancels a pending transaction. Studio networks only. */
  cancelTransaction: async ({hash}: {hash: TransactionHash}): Promise<{transaction_hash: string; status: string}> => {
    if (!client.chain.isStudio) {
      throw new Error("cancelTransaction is only available on studio-based chains (localnet/studionet)");
    }

    if (!client.account) {
      throw new Error("No account set. Configure the client with an account to cancel transactions.");
    }

    const messageHash = keccak256(concat([stringToBytes("cancel_transaction"), toBytes(hash)]));

    let signature: string;

    if (typeof client.account === "object" && "signMessage" in client.account) {
      signature = await (client.account as any).signMessage({message: {raw: messageHash}});
    } else {
      const provider = typeof window !== "undefined" ? window.ethereum : undefined;
      if (!provider) {
        throw new Error("No provider available for signing. Use a private key account or ensure a wallet is connected.");
      }
      const address = typeof client.account === "string" ? client.account : (client.account as any).address;
      signature = await provider.request({
        method: "personal_sign",
        params: [messageHash, address],
      });
    }

    return client.request({
      method: "sim_cancelTransaction",
      params: [hash, signature],
    }) as Promise<{transaction_hash: string; status: string}>;
  },
  /** Returns the queue slot position of a transaction in the pending queue. */
  getTransactionQueuePosition: async ({hash}: {hash: TransactionHash}): Promise<number> => {
    const consensusAddress = client.chain.consensusMainContract?.address as Address;
    const consensusAbi = client.chain.consensusMainContract?.abi as Abi;

    const queuesAddress = await publicClient.readContract({
      address: consensusAddress,
      abi: consensusAbi,
      functionName: "queues",
    }) as Address;

    const QUEUES_ABI = [
      {
        inputs: [{internalType: "bytes32", name: "txId", type: "bytes32"}],
        name: "getTransactionQueuePosition",
        outputs: [{internalType: "uint256", name: "", type: "uint256"}],
        stateMutability: "view",
        type: "function",
      },
    ] as const;

    const position = await publicClient.readContract({
      address: queuesAddress,
      abi: QUEUES_ABI,
      functionName: "getTransactionQueuePosition",
      args: [hash as `0x${string}`],
    }) as bigint;

    return Number(position);
  },
  /** Estimates gas required for a transaction. */
  estimateTransactionGas: async (transactionParams: {
    from?: Address;
    to: Address;
    data?: `0x${string}`;
    value?: bigint;
  }): Promise<bigint> => {
    const formattedParams = {
      from: transactionParams.from || client.account?.address,
      to: transactionParams.to,
      data: transactionParams.data || "0x",
      value: transactionParams.value
        ? (`0x${transactionParams.value.toString(16)}` as `0x${string}`)
        : ("0x0" as `0x${string}`),
    };

    const gasHex = (await client.request({
      method: "eth_estimateGas",
      params: [formattedParams],
    })) as string;

    return BigInt(gasHex);
  },
});
