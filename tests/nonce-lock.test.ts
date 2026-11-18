import {describe, it, expect} from "vitest";
import {acquireNonceLock, nonceLockKey} from "../src/utils/nonceLock";

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
