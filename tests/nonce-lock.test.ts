import {describe, it, expect} from "vitest";
import {acquireNonceLock, nonceLockKey, NonceLockTimeoutError} from "../src/utils/nonceLock";

const tick = () => new Promise(resolve => setTimeout(resolve, 0));

describe("nonceLock", () => {
  it("normalizes address case in the key", () => {
    expect(nonceLockKey(1, "0xABCDEF")).toBe(nonceLockKey(1, "0xabcdef"));
    expect(nonceLockKey(1, "0xabc")).not.toBe(nonceLockKey(2, "0xabc"));
  });

  it("serializes holders of the same key in FIFO order", async () => {
    const key = nonceLockKey(1, "0x01");
    const order: string[] = [];

    const releaseA = await acquireNonceLock(key);
    const b = acquireNonceLock(key).then(release => {
      order.push("b");
      return release;
    });
    const c = acquireNonceLock(key).then(release => {
      order.push("c");
      return release;
    });

    await tick();
    expect(order).toEqual([]);

    releaseA();
    const releaseB = await b;
    await tick();
    expect(order).toEqual(["b"]);

    releaseB();
    releaseB(); // idempotent: must not release c's slot early
    const releaseC = await c;
    expect(order).toEqual(["b", "c"]);
    releaseC();
  });

  it("does not block different senders", async () => {
    const releaseA = await acquireNonceLock(nonceLockKey(1, "0x02"));
    const releaseB = await acquireNonceLock(nonceLockKey(1, "0x03"));
    releaseA();
    releaseB();
  });
});

describe("nonceLock bounds", () => {
  it("keeps a stalled holder exclusive: waiters time out, nobody else acquires until it releases", async () => {
    const key = nonceLockKey(1, "0x10");
    const releaseHolder = await acquireNonceLock(key);

    // A waiter that gives up must not hand the lock to anyone else.
    await expect(acquireNonceLock(key, {waitTimeoutMs: 20})).rejects.toBeInstanceOf(NonceLockTimeoutError);

    let nextAcquired = false;
    const next = acquireNonceLock(key, {waitTimeoutMs: 1_000}).then(release => {
      nextAcquired = true;
      return release;
    });
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(nextAcquired).toBe(false);

    // The stalled holder resumes and finishes; only then does the next one run.
    releaseHolder();
    const releaseNext = await next;
    expect(nextAcquired).toBe(true);
    releaseNext();
  });

  it("rejects with NonceLockTimeoutError when the wait exceeds waitTimeoutMs, without breaking the queue", async () => {
    const key = nonceLockKey(1, "0x11");
    const releaseHolder = await acquireNonceLock(key);

    const timedOut = acquireNonceLock(key, {waitTimeoutMs: 20});
    const later = acquireNonceLock(key, {waitTimeoutMs: 1_000});

    await expect(timedOut).rejects.toBeInstanceOf(NonceLockTimeoutError);
    await expect(timedOut).rejects.toThrow(/Timed out after 20ms/);

    let laterAcquired = false;
    void later.then(() => {
      laterAcquired = true;
    });
    await tick();
    expect(laterAcquired).toBe(false);

    // Once the holder finishes, the timed-out slot passes straight through.
    releaseHolder();
    const releaseLater = await later;
    releaseLater();
  });
});
