import {TransactionHash, TransactionStatus, GenLayerTransaction, TransactionReceiptWaitUntil} from "@/types";

export type ITransactionActions = {
  waitForTransactionReceipt: ({
    hash,
    status,
    waitUntil,
    interval,
    retries,
    fullTransaction,
  }: {
    hash: TransactionHash;
    /** @deprecated Use waitUntil: "decided" or waitUntil: "finalized" instead. */
    status?: TransactionStatus;
    waitUntil?: TransactionReceiptWaitUntil;
    interval?: number;
    retries?: number;
    fullTransaction?: boolean;
  }) => Promise<GenLayerTransaction>;
};
