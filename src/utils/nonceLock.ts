/**
 * Per-sender serialization of the "read nonce → sign → broadcast" section.
 *
 * Nonces are read from the node's `"pending"` transaction count, which only
 * reflects transactions the node has already accepted. Two submissions issued
 * concurrently (e.g. via `Promise.all`) from the same account would otherwise
 * both read the count before either is broadcast and be assigned the same
 * nonce, so one of them is rejected ("already known" / "nonce too low" /
 * "replacement underpriced").
 *
 * Holding this lock from the nonce read until the transaction is broadcast
 * guarantees each concurrent submission sees the previous one in the pending
 * count. The lock is released as soon as the transaction is broadcast, so
 * waiting for receipts still happens in parallel.
 *
 * The holder keeps the lock until it finishes (broadcast or failure): it is
 * never released on a timer, because a stalled holder that resumes after
 * losing the lock would broadcast a nonce another submission already used.
 * Instead the wait is bounded: a submission that cannot acquire the lock
 * within `waitTimeoutMs` rejects with `NonceLockTimeoutError` rather than
 * queueing indefinitely behind a hung RPC call. The active holder is not
 * affected.
 */
const nonceLocks = new Map<string, Promise<void>>();

export const DEFAULT_NONCE_LOCK_WAIT_TIMEOUT_MS = 120_000;

export class NonceLockTimeoutError extends Error {
  constructor(key: string, waitTimeoutMs: number) {
    super(
      `Timed out after ${waitTimeoutMs}ms waiting for an earlier transaction from the same sender ` +
        `(${key}) to be broadcast. An RPC call in that submission may be stalled; retry once the node is responsive.`,
    );
    this.name = "NonceLockTimeoutError";
  }
}

export type NonceLockOptions = {
  /** Max time to wait for the lock before rejecting with NonceLockTimeoutError. */
  waitTimeoutMs?: number;
};

export const nonceLockKey = (chainId: number | undefined, address: string): string =>
  `${chainId ?? "unknown"}:${address.toLowerCase()}`;

/**
 * Waits for any in-flight submission from the same sender/chain to broadcast,
 * then returns an idempotent `release` function that must be called once the
 * transaction has been broadcast or the submission failed. Rejects with
 * `NonceLockTimeoutError` if the lock is not acquired within `waitTimeoutMs`.
 */
export const acquireNonceLock = async (
  key: string,
  {waitTimeoutMs = DEFAULT_NONCE_LOCK_WAIT_TIMEOUT_MS}: NonceLockOptions = {},
): Promise<() => void> => {
  const previous = nonceLocks.get(key) ?? Promise.resolve();
  let resolveCurrent!: () => void;
  const current = new Promise<void>(resolve => {
    resolveCurrent = resolve;
  });
  const tail = previous.then(() => current);
  nonceLocks.set(key, tail);

  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    resolveCurrent();
    if (nonceLocks.get(key) === tail) {
      nonceLocks.delete(key);
    }
  };

  let waitTimer: ReturnType<typeof setTimeout> | undefined;
  const acquired = await Promise.race([
    previous.then(() => true),
    new Promise<boolean>(resolve => {
      waitTimer = setTimeout(() => resolve(false), waitTimeoutMs);
    }),
  ]);
  clearTimeout(waitTimer);

  if (!acquired) {
    // Our slot passes straight through once the earlier holder finishes, so
    // later waiters keep their order and still wait for that holder.
    void previous.then(release);
    throw new NonceLockTimeoutError(key, waitTimeoutMs);
  }

  return release;
};
