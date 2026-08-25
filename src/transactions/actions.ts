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
} from "../types/transactions";
import {transactionsConfig} from "../config/transactions";
import {sleep} from "../utils/async";
import {GenLayerChain} from "@/types";
import {Abi, PublicClient, Address, keccak256, concat, stringToBytes, toBytes} from "viem";
import {decodeLocalnetTransaction, decodeTransaction, simplifyTransactionReceipt} from "./decoders";

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
  /** Fetches transaction data including status, execution result, and consensus details. */
  getTransaction: async ({hash}: {hash: TransactionHash}): Promise<GenLayerTransaction> => {
    if (client.chain.isStudio) {
      const transaction = await client.getTransaction({hash});
      const localnetStatus =
        (transaction.status as string) === "ACTIVATED" ? TransactionStatus.PENDING : transaction.status;

      transaction.status = Number(transactionsStatusNameToNumber[localnetStatus as TransactionStatus]);
      transaction.statusName = localnetStatus as TransactionStatus;
      return decodeLocalnetTransaction(transaction as unknown as GenLayerTransaction);
    }
    const contractAddress = client.chain.consensusDataContract?.address as Address;
    const contractAbi = client.chain.consensusDataContract?.abi as Abi;

    // getTransactionData(txId, timestamp) answered with a projection evaluated at
    // a caller-supplied clock. The resolution-kernel train splits that apart: the
    // stored record is getStoredTransactionData(txId), and the projection lives
    // behind getTransactionLifecycle. Chains are upgraded independently, so pick
    // whichever read the chain's own ABI actually offers rather than assuming.
    const hasStoredRead = (contractAbi as readonly {name?: string}[]).some(
      entry => entry?.name === "getStoredTransactionData",
    );
    const dataRead = hasStoredRead
      ? {functionName: "getStoredTransactionData", args: [hash] as const}
      : {functionName: "getTransactionData", args: [hash, Math.round(new Date().getTime() / 1000)] as const};

    const [txDataRaw, allDataRaw] = await Promise.all([
      publicClient.readContract({
        address: contractAddress,
        abi: contractAbi,
        functionName: dataRead.functionName,
        args: dataRead.args as unknown as readonly unknown[],
      }) as Promise<GenLayerRawTransaction>,
      publicClient.readContract({
        address: contractAddress,
        abi: contractAbi,
        functionName: "getTransactionAllData",
        args: [hash],
      }) as Promise<[any, any[]]>,
    ]);

    const txData = txDataRaw as unknown as GenLayerRawTransaction;
    const [txAllData, _roundsData] = allDataRaw as unknown as [any, any[]];

    const transaction = {
      ...txData,
      txExecutionResult: Number(txAllData.txExecutionResult),
    } as GenLayerRawTransaction;
    return decodeTransaction(transaction);
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
