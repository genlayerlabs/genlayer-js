import {MethodNotFoundRpcError} from "viem";

import {GenLayerClient} from "../types/clients";
import {GenLayerChain} from "../types/chains";
import {
  GenLayerTransaction,
  TransactionHash,
  TransactionStatus,
  transactionsStatusNameToNumber,
  transactionsStatusNumberToName,
} from "../types/transactions";

/** JSON-RPC "method not found" as defined by the spec. */
const METHOD_NOT_FOUND_CODE = -32601;

/**
 * Studio reports a missing method through several shapes: the raw JSON-RPC
 * error object thrown by the SDK transport, viem's typed wrapper, and older
 * gateways that answer with a generic code and only the text to go on.
 */
const METHOD_NOT_FOUND_MESSAGE = /method not found|does not exist|method not supported/i;

/** Studio's pre-proposal state; the protocol equivalent is Pending. */
const STUDIO_ACTIVATED_STATUS = "ACTIVATED";

/**
 * Reports whether the RPC endpoint answered "I do not implement this method",
 * as opposed to failing to answer a method it does implement. Only the former
 * may degrade to a locally synthesized lifecycle.
 */
export const isMethodNotFoundError = (error: unknown): boolean => {
  if (error instanceof MethodNotFoundRpcError) return true;

  const seen = new Set<unknown>();
  let current: unknown = error;
  while (current && typeof current === "object" && !seen.has(current)) {
    seen.add(current);
    const {code, message} = current as {code?: unknown; message?: unknown};
    if (Number(code) === METHOD_NOT_FOUND_CODE) return true;
    if (typeof message === "string" && METHOD_NOT_FOUND_MESSAGE.test(message)) return true;
    current = (current as {cause?: unknown}).cause;
  }
  return false;
};

/**
 * Lifecycle synthesized from the Studio consumer surface. It carries the exact
 * stored status and nothing the consumer surface cannot prove: no projection,
 * no resolution action, and no decision identity.
 */
export type StudioLifecycleFallback = {
  storedStatusCode: number;
  projectedStatusCode: number;
  resolutionActionCode: number;
  resolutionSourceCode: number;
  decisionId: null;
  decisionActive: false;
  evaluatedAt: number;
};

/** Resolution-action and resolution-source codes for "nothing to report". */
const NO_OP_RESOLUTION_ACTION_CODE = 0;
const UNSPECIFIED_RESOLUTION_SOURCE_CODE = 0;

/**
 * Reads the exact stored status off a Studio transaction. `transactionActions`
 * hands over viem's raw transaction, whose `status` is the Studio status name,
 * while `contractActions` hands over the SDK transaction, whose `status` is
 * already the numeric code and whose `statusName` is already normalized.
 */
const storedStatusName = (transaction: GenLayerTransaction): TransactionStatus | undefined => {
  const raw: unknown = transaction.statusName ?? transaction.status;
  const byCode = (code: string): TransactionStatus | undefined =>
    Object.prototype.hasOwnProperty.call(transactionsStatusNumberToName, code)
      ? transactionsStatusNumberToName[code as keyof typeof transactionsStatusNumberToName]
      : undefined;

  if (typeof raw === "number") return byCode(String(raw));
  if (typeof raw !== "string") return undefined;
  if (raw === STUDIO_ACTIVATED_STATUS) return TransactionStatus.PENDING;
  if (/^\d+$/.test(raw)) return byCode(raw);
  return Object.prototype.hasOwnProperty.call(transactionsStatusNameToNumber, raw)
    ? (raw as TransactionStatus)
    : undefined;
};

/**
 * Synthesizes the protocol lifecycle from the Studio consumer surface after the
 * node lifecycle RPC reported that it does not implement the method.
 *
 * Studio's transaction object proves the stored status and nothing else, so the
 * projection repeats the stored status, the resolution is `NoOp`/`Unspecified`,
 * and the decision identity stays inactive. The SDK must never invent a
 * decision id: a fabricated one would be signed into an appeal or finalization.
 *
 * @throws the original RPC error when the status cannot be read, so a genuine
 * gap is never reported as a lifecycle.
 */
export const readStudioLifecycleFallback = async ({
  client,
  hash,
  timestamp,
  cause,
}: {
  client: GenLayerClient<GenLayerChain>;
  hash: TransactionHash;
  timestamp?: number;
  cause: unknown;
}): Promise<StudioLifecycleFallback> => {
  let transaction: GenLayerTransaction;
  try {
    transaction = await client.getTransaction({hash});
  } catch {
    throw cause;
  }

  const status = storedStatusName(transaction);
  if (!status) throw cause;
  const storedStatusCode = Number(transactionsStatusNameToNumber[status]);

  return {
    storedStatusCode,
    // The consumer surface cannot project a status forward in time.
    projectedStatusCode: storedStatusCode,
    resolutionActionCode: NO_OP_RESOLUTION_ACTION_CODE,
    resolutionSourceCode: UNSPECIFIED_RESOLUTION_SOURCE_CODE,
    decisionId: null,
    decisionActive: false,
    evaluatedAt: timestamp ?? Math.floor(Date.now() / 1000),
  };
};
