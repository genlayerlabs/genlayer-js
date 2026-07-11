/**
 * Bug-hunt regression tests for the v2-dev (v0.6) integration branch.
 *
 * Every test in this file is EXPECTED TO FAIL against the current code — each one
 * reproduces a distinct, confirmed defect that causes wrong results or instability.
 * A follow-up change should make them pass. Each block documents the file:line and
 * root cause of the bug it pins down.
 */
import {describe, it, expect, vi} from "vitest";
import {decodeFunctionData} from "viem";

import {toString} from "@/abi/calldata/string";
import {decode} from "@/abi/calldata/decoder";
import * as consts from "@/abi/calldata/consts";
import {toJsonSafeDeep} from "@/utils/jsonifier";
import {createClient} from "@/client/client";
import {localnet} from "@/chains/localnet";
import {buildGenVmPositionalArgs} from "@/contracts/schema";
import {stakingActions} from "@/staking/actions";
import {vestingActions} from "@/vesting/actions";
import {isSuccessful} from "@/transactions/actions";
import {VESTING_ABI} from "@/abi/vesting";

// ---------------------------------------------------------------------------
// calldata/string.ts — human-readable rendering (used for decoded-tx `readable`)
// ---------------------------------------------------------------------------
describe("BUG: calldata toString() rendering", () => {
  // src/abi/calldata/string.ts:8-16 — toStringImplMap never pushes a separator
  // between key/value pairs (the array branch does, at line 57). Multi-entry
  // maps render as an unparseable, ambiguous blob.
  it("separates map entries with a comma", () => {
    expect(toString({a: 1, b: 2})).toBe('{"a":1,"b":2}');
    // Actual: '{"a":1"b":2}'
  });

  // src/abi/calldata/string.ts:48-52 (bytes) and 62-66 (address) — per-byte hex is
  // emitted via b.toString(16) with no padStart(2,"0"), so distinct byte arrays
  // collide and addresses render with fewer than 40 hex chars.
  it("zero-pads each byte so distinct byte arrays do not collide", () => {
    expect(toString(new Uint8Array([0x00, 0xff]))).toBe("b#00ff"); // actual: "b#0ff"
    expect(toString(new Uint8Array([0x01, 0x02]))).not.toBe(toString(new Uint8Array([0x12])));
    // Actual: both render as "b#12"
  });
});

// ---------------------------------------------------------------------------
// calldata/decoder.ts — untrusted length drives unbounded allocation
// ---------------------------------------------------------------------------
describe("BUG: calldata decode() trusts attacker-supplied container counts", () => {
  // src/abi/calldata/decoder.ts:52-73 — the TYPE_ARR / TYPE_MAP element count comes
  // straight off the wire and drives a while/slice loop with no check against the
  // bytes actually remaining. Since decode() runs on consensus/validator-supplied
  // bytes, a tiny malformed payload forces multi-second allocation before it errors.
  it("rejects an oversized array header without unbounded work", () => {
    // Build a TYPE_ARR header claiming 20,000,000 elements with no payload.
    const count = 20_000_000n;
    const tagged = (count << BigInt(consts.BITS_IN_TYPE)) | BigInt(consts.TYPE_ARR);
    const buf: number[] = [];
    let v = tagged;
    while (v > 0n) {
      let cur = Number(v & 0x7fn);
      v >>= 7n;
      if (v > 0n) cur |= 0x80;
      buf.push(cur);
    }
    const bytes = new Uint8Array(buf);

    const start = Date.now();
    let threw = false;
    try {
      decode(bytes);
    } catch {
      threw = true;
    }
    const elapsed = Date.now() - start;

    expect(threw).toBe(true);
    // A bounds check (count <= remaining bytes) should reject in O(1). Today this
    // allocates ~20M entries first, taking seconds. Fails on the timing assertion.
    expect(elapsed).toBeLessThan(300);
  }, 30_000);
});

// ---------------------------------------------------------------------------
// utils/jsonifier.ts — cycle guard is never released
// ---------------------------------------------------------------------------
describe("BUG: toJsonSafeDeep() nulls out shared (non-cyclic) references", () => {
  // src/utils/jsonifier.ts:~90-94 — `seen.add(value)` is never removed after a
  // subtree finishes, so the WeakSet tracks "ever visited" instead of "on the
  // current path". A DAG (same object referenced twice) loses the 2nd occurrence.
  it("keeps both occurrences of a shared object", () => {
    const shared = {x: 1};
    expect(toJsonSafeDeep([shared, shared])).toEqual([{x: 1}, {x: 1}]);
    // Actual: [{x:1}, null]
  });
});

// ---------------------------------------------------------------------------
// client/client.ts — endpoint override mutates the shared chain singleton
// ---------------------------------------------------------------------------
describe("BUG: createClient({endpoint}) mutates the shared chain config", () => {
  // src/client/client.ts:~132-135 — `chainConfig.rpcUrls.default.http = [endpoint]`
  // assigns in place on the imported chain object. Every client shares that object,
  // so one client's endpoint override leaks into all other clients (and later
  // createClient() calls with no override inherit the last mutation).
  it("does not leak one client's endpoint into other clients", () => {
    const original = localnet.rpcUrls.default.http;
    try {
      createClient({chain: localnet, endpoint: "http://leaked.example:1234"} as any);
      const b = createClient({chain: localnet} as any);
      expect(b.chain.rpcUrls.default.http[0]).toBe("http://127.0.0.1:4000/api");
      // Actual: "http://leaked.example:1234"
    } finally {
      // Restore the singleton so this test cannot pollute the rest of the run.
      (localnet.rpcUrls.default as {http: readonly string[]}).http = original;
    }
  });
});

// ---------------------------------------------------------------------------
// contracts/schema.ts — strictTypes validation is too permissive
// ---------------------------------------------------------------------------
describe("BUG: buildGenVmPositionalArgs strict validation gaps", () => {
  const structSchema = {
    ctor: {params: [], kwparams: {}},
    methods: {
      m: {params: [["profile", {name: "string"}]], kwparams: {}, ret: "any", readonly: false},
    },
  };
  const intSchema = {
    ctor: {params: [], kwparams: {}},
    methods: {
      m: {params: [["n", "int"]], kwparams: {}, ret: "any", readonly: false},
    },
  };

  // src/contracts/schema.ts:101-113 — for a struct-like dict schema the key checks
  // only run `if (isPlainObject(value))`; a non-object value skips the branch and
  // falls through to the terminal `return true`, so a scalar passes as a struct.
  it("rejects a non-object value for a struct parameter", () => {
    expect(() =>
      buildGenVmPositionalArgs({
        schema: structSchema as any,
        functionName: "m",
        valuesByParamName: {profile: 42},
      }),
    ).toThrow(/Invalid argument "profile"/);
    // Actual: returns [42], no error.
  });

  // src/contracts/schema.ts:55 — `'int'` accepts `typeof value === 'number'`, which
  // includes non-integer floats and NaN. Validation passes, then the value later
  // throws deep inside calldata.encode ("invalid calldata input '1.5'").
  it("rejects a non-integer number for an int parameter", () => {
    expect(() =>
      buildGenVmPositionalArgs({
        schema: intSchema as any,
        functionName: "m",
        valuesByParamName: {n: 1.5},
      }),
    ).toThrow(/Invalid argument "n"/);
    // Actual: returns [1.5], later crashes at encode time.
  });
});

// ---------------------------------------------------------------------------
// staking/actions.ts — identity extraCid double-encoding + advertised API name
// ---------------------------------------------------------------------------
describe("BUG: staking getValidatorInfo re-encodes an already-hex extraCid", () => {
  const STAKING_ADDRESS = "0x0000000000000000000000000000000000000044";
  const VALIDATOR = "0x0000000000000000000000000000000000000099";
  const OWNER = "0x0000000000000000000000000000000000000011";
  const OPERATOR = "0x00000000000000000000000000000000000000aa";

  const chain = {
    id: 1,
    name: "test",
    nativeCurrency: {name: "GEN", symbol: "GEN", decimals: 18},
    rpcUrls: {default: {http: ["http://127.0.0.1"]}},
    isStudio: false,
    stakingContract: {address: STAKING_ADDRESS},
  };

  const emptyView = {
    vStake: 0n, vShares: 0n, dStake: 0n, dShares: 0n,
    vDeposit: 0n, vWithdrawal: 0n, ePrimed: 0n, live: true, eBanned: 0n,
  };

  const makeHarness = () => {
    const publicClient = {
      readContract: vi.fn(async ({functionName}: {functionName: string}) => {
        switch (functionName) {
          case "isValidator": return true;
          case "validatorView": return emptyView;
          case "owner": return OWNER;
          case "operator": return OPERATOR;
          case "getIdentity":
            return {
              moniker: "val", logoUri: "", website: "", description: "",
              email: "", twitter: "", telegram: "", github: "",
              // viem decodes ABI `bytes` as an 0x-prefixed hex string.
              extraCid: "0xdeadbeef",
            };
          case "epoch": return 1n;
          case "validatorMinStake": return 0n;
          case "validatorDepositLen": return 0n;
          case "validatorWithdrawalLen": return 0n;
          default: throw new Error(`unexpected read: ${functionName}`);
        }
      }),
    };
    const client = {chain};
    return stakingActions(client as any, publicClient as any);
  };

  // src/staking/actions.ts:473 — `extraCid: toHex(identityRaw.extraCid)`. viem already
  // returns `bytes` as hex, so toHex() UTF-8-encodes the "0x…" characters, corrupting
  // the value on read (and breaking the SDK's own setIdentity→getValidatorInfo round-trip).
  it("returns the on-chain extraCid unchanged", async () => {
    const actions = makeHarness();
    const info = await actions.getValidatorInfo(VALIDATOR as any);
    expect(info.identity!.extraCid).toBe("0xdeadbeef");
    // Actual: "0x30786465616462656566" (hex of the ASCII string "0xdeadbeef").
  });

  // Commit a338ad5 advertised the epoch-zero helper as `isValidatorBelowMinStake`,
  // but src/staking/actions.ts:550 implements it as `isValidatorBelowMin`, so the
  // documented API name is missing at runtime (a caller gets `is not a function`).
  it("exposes the advertised isValidatorBelowMinStake helper", () => {
    const actions = makeHarness();
    expect(typeof (actions as any).isValidatorBelowMinStake).toBe("function");
    // Actual: undefined (method is named isValidatorBelowMin).
  });
});

// ---------------------------------------------------------------------------
// vesting/actions.ts — unvalidated extraCid + unsafe `shares` string coercion
// ---------------------------------------------------------------------------
describe("BUG: vesting input handling", () => {
  const ACCOUNT = "0x0000000000000000000000000000000000000011";
  const VESTING = "0x0000000000000000000000000000000000000022";
  const VALIDATOR = "0x0000000000000000000000000000000000000033";
  const WALLET = "0x0000000000000000000000000000000000000099";
  const MOCK_TX_HASH = "0x1234000000000000000000000000000000000000000000000000000000001234";

  const makeHarness = () => {
    const signTransaction = vi.fn().mockResolvedValue("0xsigned");
    const client = {
      account: {address: ACCOUNT, type: "local", signTransaction},
      chain: {
        id: 1, name: "test",
        nativeCurrency: {name: "GEN", symbol: "GEN", decimals: 18},
        rpcUrls: {default: {http: ["http://127.0.0.1"]}},
        isStudio: false,
        consensusMainContract: {address: "0x0000000000000000000000000000000000000044", abi: [], bytecode: "0x"},
      },
    };
    const publicClient = {
      call: vi.fn().mockResolvedValue("0x"),
      estimateGas: vi.fn().mockResolvedValue(21000n),
      getTransactionCount: vi.fn().mockResolvedValue(7),
      prepareTransactionRequest: vi.fn().mockImplementation(async (r: any) => r),
      sendRawTransaction: vi.fn().mockResolvedValue(MOCK_TX_HASH),
      waitForTransactionReceipt: vi.fn().mockResolvedValue({
        status: "success", transactionHash: MOCK_TX_HASH, blockNumber: 12n, gasUsed: 345n, logs: [],
      }),
      readContract: vi.fn(),
    };
    return {actions: vestingActions(client as any, publicClient as any), publicClient};
  };

  // src/vesting/actions.ts:95-99 — encodeExtraCid blindly casts any "0x…" string
  // through with no isHex/even-length check. An odd-length CID is silently right-
  // padded by viem's encoder, writing a corrupted identity on-chain with no error.
  it("does not silently corrupt an odd-length hex extraCid", async () => {
    const {actions, publicClient} = makeHarness();
    await actions.vestingValidatorSetIdentity({
      vesting: VESTING, wallet: WALLET, moniker: "m", extraCid: "0x123",
    } as any);

    const data = publicClient.call.mock.calls[0][0].data;
    const decoded = decodeFunctionData({abi: VESTING_ABI, data});
    expect((decoded.args as any)[9]).toBe("0x123");
    // Actual: "0x1230" — a trailing zero nibble was appended.
  });

  // src/vesting/actions.ts:310 — `BigInt(options.shares)` turns "" into 0n, so an
  // empty shares string is silently broadcast as a zero-share exit instead of being
  // rejected as invalid input.
  it("rejects an empty shares string instead of sending a zero-share exit", async () => {
    const {actions} = makeHarness();
    await expect(
      actions.vestingDelegatorExit({vesting: VESTING, validator: VALIDATOR, shares: ""} as any),
    ).rejects.toThrow();
    // Actual: resolves, having encoded vestingDelegatorExit(validator, 0n).
  });
});

// ---------------------------------------------------------------------------
// transactions/actions.ts — isSuccessful() unsatisfiable on studio/localnet
// ---------------------------------------------------------------------------
describe("BUG: isSuccessful() always false for finalized studio transactions", () => {
  // src/transactions/actions.ts:68-86 — success requires
  // executionResultName === FINISHED_WITH_RETURN, derived only from
  // txExecutionResult(Name). The studio getTransaction path never populates those
  // fields (the result lives at consensus_data.leader_receipt[].execution_result),
  // so a finalized, successful studio tx is reported as unsuccessful.
  it("reports a finalized studio transaction with a SUCCESS leader receipt as successful", () => {
    const studioTx = {
      status: "FINALIZED",
      statusName: "FINALIZED",
      txExecutionResult: undefined,
      txExecutionResultName: undefined,
      consensus_data: {final: true, leader_receipt: [{execution_result: "SUCCESS"}]},
    };
    expect(isSuccessful(studioTx as any)).toBe(true);
    // Actual: false.
  });
});
