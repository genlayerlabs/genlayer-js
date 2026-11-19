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
 * The lock is bounded so a single hung RPC call cannot stall every later
 * submission from the same sender:
 * - A holder's lease expires after `leaseMs`; the next waiter then proceeds.
 *   If the stalled holder later broadcasts with the same nonce, the node
 *   rejects that one submission, as it would have without the lock.
 * - A waiter that cannot acquire the lock within `waitTimeoutMs` rejects with
 *   a `NonceLockTimeoutError` instead of waiting indefinitely.
 */
const nonceLocks = new Map<string, Promise<void>>();

export const DEFAULT_NONCE_LOCK_LEASE_MS = 60_000;
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
  /** Max time the lock may be held before it is released automatically. */
  leaseMs?: number;
  /** Max time to wait for the lock before rejecting with NonceLockTimeoutError. */
  waitTimeoutMs?: number;
};

export const nonceLockKey = (chainId: number | undefined, address: string): string =>
  `${chainId ?? "unknown"}:${address.toLowerCase()}`;

/**
 * Waits for any in-flight submission from the same sender/chain to broadcast
 * (or for its lease to expire), then returns an idempotent `release` function
 * that must be called once the transaction has been broadcast or the
 * submission failed.
 */
export const acquireNonceLock = async (
  key: string,
  {
    leaseMs = DEFAULT_NONCE_LOCK_LEASE_MS,
    waitTimeoutMs = DEFAULT_NONCE_LOCK_WAIT_TIMEOUT_MS,
  }: NonceLockOptions = {},
): Promise<() => void> => {
  const previous = nonceLocks.get(key) ?? Promise.resolve();
  let resolveCurrent!: () => void;
  const current = new Promise<void>(resolve => {
    resolveCurrent = resolve;
  });
  const tail = previous.then(() => current);
  nonceLocks.set(key, tail);

  let released = false;
  let leaseTimer: ReturnType<typeof setTimeout> | undefined;
  const release = () => {
    if (released) return;
    released = true;
    if (leaseTimer !== undefined) clearTimeout(leaseTimer);
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
    // Keep queue order: our slot passes straight through once the earlier
    // holder finishes, so later waiters are neither skipped nor blocked by us.
    void previous.then(release);
    throw new NonceLockTimeoutError(key, waitTimeoutMs);
  }

  leaseTimer = setTimeout(() => {
    if (!released) {
      console.warn(
        `Nonce lock for ${key} held for more than ${leaseMs}ms; releasing it so later transactions can proceed.`,
      );
      release();
    }
  }, leaseMs);
  // Don't keep a Node.js process alive just for the lease timer.
  (leaseTimer as {unref?: () => void}).unref?.();

  return release;
};
