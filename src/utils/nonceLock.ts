/**
 * Per-sender serialization of the "read nonce → sign → broadcast" section.
 *
 * `getCurrentNonce` reads the `"pending"` transaction count, which only
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
 */
const nonceLocks = new Map<string, Promise<void>>();

export const nonceLockKey = (chainId: number | undefined, address: string): string =>
  `${chainId ?? "unknown"}:${address.toLowerCase()}`;

/**
 * Waits for any in-flight submission from the same sender/chain to broadcast,
 * then returns an idempotent `release` function that must be called once the
 * transaction has been broadcast (or the submission failed).
 */
export const acquireNonceLock = async (key: string): Promise<() => void> => {
  const previous = nonceLocks.get(key) ?? Promise.resolve();
  let resolveCurrent!: () => void;
  const current = new Promise<void>(resolve => {
    resolveCurrent = resolve;
  });
  const tail = previous.then(() => current);
  nonceLocks.set(key, tail);

  await previous;

  let released = false;
  return () => {
    if (released) return;
    released = true;
    resolveCurrent();
    if (nonceLocks.get(key) === tail) {
      nonceLocks.delete(key);
    }
  };
};
