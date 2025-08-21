import {GenLayerClient, BaseActionsClient} from "../types/clients";
import {TransactionHash, TransactionStatus, GenLayerTransaction, GenLayerRawTransaction, transactionsStatusNameToNumber} from "@/types";
import {transactionsConfig} from "../config/transactions";
import {sleep} from "../utils/async";
import {GenLayerChain} from "@/types";
import {Abi, PublicClient, Address} from "viem";
import {localnet} from "@/chains/localnet";
import {decodeLocalnetTransaction, decodeTransaction, simplifyTransactionReceipt} from "./decoders";



type ClientWithGetTransaction<TChain extends GenLayerChain> = BaseActionsClient<TChain> & {
  getTransaction: (args: {hash: TransactionHash}) => Promise<GenLayerTransaction>;
};

export const receiptActions = <TChain extends GenLayerChain>(
  client: ClientWithGetTransaction<TChain>,
  publicClient: PublicClient,
) => ({
  waitForTransactionReceipt: async ({
    hash,
    status = TransactionStatus.ACCEPTED,
    interval = transactionsConfig.waitInterval,
    retries = transactionsConfig.retries,
    fullTransaction = false,
  }: {
    hash: TransactionHash;
    status: TransactionStatus;
    interval?: number;
    retries?: number;
    fullTransaction?: boolean;
  }): Promise<GenLayerTransaction> => {
    const transaction = await client.getTransaction({
      hash,
    });

    if (!transaction) {
      throw new Error("Transaction not found");
    }
    const transactionStatusString = String(transaction.status);
    const transactionStatusFinalized = transactionsStatusNameToNumber[TransactionStatus.FINALIZED];
    const requestedStatus = transactionsStatusNameToNumber[status];
    if (
      transactionStatusString === requestedStatus ||
      (status === TransactionStatus.ACCEPTED && transactionStatusString === transactionStatusFinalized)
    ) {
      let finalTransaction = transaction;
      if (client.chain.id === localnet.id) {
        finalTransaction = decodeLocalnetTransaction(transaction as unknown as GenLayerTransaction);
      }
      if (!fullTransaction) {
        return simplifyTransactionReceipt(finalTransaction as GenLayerTransaction);
      }
      return finalTransaction;
    }

    if (retries === 0) {
      throw new Error("Transaction status is not " + status);
    }

    await sleep(interval);
    return receiptActions(client, publicClient).waitForTransactionReceipt({
      hash,
      status,
      interval,
      retries: retries - 1,
      fullTransaction,
    });
  },
});

type TransactionCapabilities<TChain extends GenLayerChain> = BaseActionsClient<TChain> & {
  // using viem public client for remote branch
};

export const transactionActions = <TChain extends GenLayerChain>(
  client: TransactionCapabilities<TChain>,
  publicClient: PublicClient,
) => ({
  getTransaction: async ({hash}: {hash: TransactionHash}): Promise<GenLayerTransaction> => {
    if (client.chain.id === localnet.id) {
      // Not using viem's getTransaction here: its protected action signature and return type
      // differ from our GenLayerTransaction (localnet adds consensus fields). Direct RPC avoids
      // signature conflicts and preserves our expected types.
      const transaction = (await client.request({
        method: "eth_getTransactionByHash",
        params: [hash],
      })) as GenLayerTransaction;
      const localnetStatus =
        (transaction.status as string) === "ACTIVATED" ? TransactionStatus.PENDING : transaction.status;

      transaction.status = Number(transactionsStatusNameToNumber[localnetStatus as TransactionStatus]);
      transaction.statusName = localnetStatus as TransactionStatus;
      return decodeLocalnetTransaction(transaction);
    }
    const transaction = (await publicClient.readContract({
      address: client.chain.consensusDataContract?.address as Address,
      abi: client.chain.consensusDataContract?.abi as Abi,
      functionName: "getTransactionData",
      args: [
        hash,
        Math.round(new Date().getTime() / 1000), // unix seconds
      ],
    })) as unknown as GenLayerRawTransaction;
    return decodeTransaction(transaction);
  },
});


