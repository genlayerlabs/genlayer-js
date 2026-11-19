import {describe, expect, it, vi} from "vitest";
import {parseEther} from "viem";
import {accountActions} from "../src/accounts/actions";
import {stakingActions} from "../src/staking/actions";
import {vestingActions} from "../src/vesting/actions";

// Concurrent submissions from the same local account through different SDK
// lanes (native transfer, staking, vesting) must share one nonce sequence.

const ACCOUNT_ADDRESS = "0x00000000000000000000000000000000000000c1";
const TO_ADDRESS = "0x0000000000000000000000000000000000000022";
const VALIDATOR_ADDRESS = "0x0000000000000000000000000000000000000099";
const VESTING_ADDRESS = "0x0000000000000000000000000000000000000055";
const STAKING_ADDRESS = "0x0000000000000000000000000000000000000044";
const MOCK_TX_HASH = "0x1234000000000000000000000000000000000000000000000000000000001234";

const chain = {
  id: 4_242,
  name: "test",
  nativeCurrency: {name: "GEN", symbol: "GEN", decimals: 18},
  rpcUrls: {default: {http: ["http://127.0.0.1"]}},
  isStudio: false,
  stakingContract: {address: STAKING_ADDRESS},
};

// A node whose "pending" count only advances once a transaction is broadcast.
const makeHarness = () => {
  let pendingCount = 0;
  const assignedNonces: number[] = [];
  const delay = () => new Promise(resolve => setTimeout(resolve, 1));

  const signTransaction = vi.fn().mockImplementation(async (tx: {nonce: number}) => `0x${tx.nonce.toString(16).padStart(2, "0")}`);
  const client = {
    account: {address: ACCOUNT_ADDRESS, type: "local", signTransaction},
    chain,
  };
  const publicClient = {
    call: vi.fn().mockResolvedValue("0x"),
    estimateGas: vi.fn().mockResolvedValue(21000n),
    getTransactionCount: vi.fn().mockImplementation(async () => {
      await delay();
      return pendingCount;
    }),
    prepareTransactionRequest: vi.fn().mockImplementation(async (r: any) => {
      await delay();
      return r;
    }),
    sendRawTransaction: vi.fn().mockImplementation(async ({serializedTransaction}: {serializedTransaction: string}) => {
      await delay();
      const nonce = parseInt(serializedTransaction.slice(2), 16);
      if (assignedNonces.includes(nonce)) throw new Error("nonce too low");
      assignedNonces.push(nonce);
      pendingCount++;
      return MOCK_TX_HASH;
    }),
    waitForTransactionReceipt: vi.fn().mockResolvedValue({
      status: "success",
      transactionHash: MOCK_TX_HASH,
      blockNumber: 1n,
      gasUsed: 21000n,
      logs: [],
    }),
  };

  return {
    account: accountActions(client as any, publicClient as any),
    staking: stakingActions(client as any, publicClient as any),
    vesting: vestingActions(client as any, publicClient as any),
    publicClient,
    assignedNonces,
  };
};

describe("nonce allocation across lanes", () => {
  it("assigns distinct nonces to concurrent transfer, staking and vesting writes", async () => {
    const {account, staking, vesting, publicClient, assignedNonces} = makeHarness();

    await Promise.all([
      account.transfer({to: TO_ADDRESS, value: parseEther("1")}),
      staking.validatorExit({validator: VALIDATOR_ADDRESS, shares: 1n}),
      vesting.vestingDelegatorExit({vesting: VESTING_ADDRESS, validator: VALIDATOR_ADDRESS, shares: 1n}),
      account.transfer({to: TO_ADDRESS, value: parseEther("2")}),
    ]);

    expect(assignedNonces.sort()).toEqual([0, 1, 2, 3]);
    // Staking and vesting now read the pending count, like transfer and contract writes.
    for (const [args] of publicClient.getTransactionCount.mock.calls) {
      expect(args).toEqual({address: ACCOUNT_ADDRESS, blockTag: "pending"});
    }
  });
});

describe("nonce allocation with a stalled submission", () => {
  it("never reuses a nonce when a stalled transfer resumes after later sends timed out", async () => {
    vi.useFakeTimers();
    try {
      let pendingCount = 0;
      const broadcastNonces: number[] = [];
      let resumeStalledSigner!: () => void;
      const stalled = new Promise<void>(resolve => {
        resumeStalledSigner = resolve;
      });

      let signCalls = 0;
      const signTransaction = vi.fn().mockImplementation(async (tx: {nonce: number}) => {
        // The first submission's signer stalls well past the lock wait timeout.
        if (signCalls++ === 0) await stalled;
        return `0x${tx.nonce.toString(16).padStart(2, "0")}`;
      });
      const client = {account: {address: ACCOUNT_ADDRESS, type: "local", signTransaction}, chain};
      const publicClient = {
        estimateGas: vi.fn().mockResolvedValue(21000n),
        getTransactionCount: vi.fn().mockImplementation(async () => pendingCount),
        prepareTransactionRequest: vi.fn().mockImplementation(async (r: any) => r),
        sendRawTransaction: vi.fn().mockImplementation(async ({serializedTransaction}: {serializedTransaction: string}) => {
          broadcastNonces.push(parseInt(serializedTransaction.slice(2), 16));
          pendingCount++;
          return MOCK_TX_HASH;
        }),
        waitForTransactionReceipt: vi.fn().mockResolvedValue({status: "success", logs: []}),
      };
      const account = accountActions(client as any, publicClient as any);

      const first = account.transfer({to: TO_ADDRESS, value: 1n});
      const second = account.transfer({to: TO_ADDRESS, value: 2n});
      const secondRejected = expect(second).rejects.toThrow(/Timed out after 120000ms/);

      // Well past the 120s wait timeout: the waiter gives up, the holder keeps the lock.
      await vi.advanceTimersByTimeAsync(180_000);
      await secondRejected;
      expect(broadcastNonces).toEqual([]);

      // A send started while the holder is still stalled must queue, not read nonce 0.
      const third = account.transfer({to: TO_ADDRESS, value: 3n});
      await vi.advanceTimersByTimeAsync(10);

      // The stalled holder resumes and broadcasts its nonce; the queued send gets the next one.
      resumeStalledSigner();
      await first;
      await third;
      expect(broadcastNonces).toEqual([0, 1]);
    } finally {
      vi.useRealTimers();
    }
  });
});
