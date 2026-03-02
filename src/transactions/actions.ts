import {GenLayerClient} from "../types/clients";
import {
  TransactionHash,
  TransactionStatus,
  GenLayerTransaction,
  GenLayerRawTransaction,
  transactionsStatusNameToNumber,
  isDecidedState,
} from "../types/transactions";
import {transactionsConfig} from "../config/transactions";
import {sleep} from "../utils/async";
import {GenLayerChain} from "@/types";
import {Abi, PublicClient, Address, keccak256, concat, stringToBytes, toBytes} from "viem";
import {localnet} from "@/chains/localnet";
import {decodeLocalnetTransaction, decodeTransaction, simplifyTransactionReceipt} from "./decoders";

export const receiptActions = (client: GenLayerClient<GenLayerChain>, publicClient: PublicClient) => ({
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
    const requestedStatus = transactionsStatusNameToNumber[status];
    if (
      transactionStatusString === requestedStatus ||
      (status === TransactionStatus.ACCEPTED && isDecidedState(transactionStatusString))
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

export const transactionActions = (client: GenLayerClient<GenLayerChain>, publicClient: PublicClient) => ({
  getTransaction: async ({hash}: {hash: TransactionHash}): Promise<GenLayerTransaction> => {
    if (client.chain.isStudio) {
      const transaction = await client.getTransaction({hash});
      const localnetStatus =
        (transaction.status as string) === "ACTIVATED" ? TransactionStatus.PENDING : transaction.status;

      transaction.status = Number(transactionsStatusNameToNumber[localnetStatus as TransactionStatus]);
      transaction.statusName = localnetStatus as TransactionStatus;
      return decodeLocalnetTransaction(transaction as unknown as GenLayerTransaction);
    }
    const transaction = (await publicClient.readContract({
      address: client.chain.consensusDataContract?.address as Address,
      abi: client.chain.consensusDataContract?.abi as Abi,
      functionName: "getTransactionData",
      args: [
        hash,
        0n, // Pass 0 to use block.timestamp on-chain
      ],
    })) as unknown as GenLayerRawTransaction;
    return decodeTransaction(transaction);
  },
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
