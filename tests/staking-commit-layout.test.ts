/**
 * The Claim/Commit layout probe rests on one asymmetry, so pin it.
 *
 * CON-715 widened both structs without renaming the functions. Decoding a
 * post-CON-715 response with the older shape does NOT fail — it returns
 * neighbouring words — so a successful decode cannot identify the layout.
 * Only the reverse throws. That is why stakingActions tries the current shape
 * first and treats a decode failure, rather than a success, as the signal.
 *
 * If this asymmetry ever stops holding, the probe silently starts reporting
 * wrong balances again, which is exactly the bug it exists to prevent.
 */
import {describe, expect, it} from "vitest";
import {decodeFunctionResult, encodeAbiParameters} from "viem";
import {STAKING_ABI, STAKING_COMMIT_VIEWS_CURRENT_ABI} from "../src/abi/staking";

const STAKE = 100000000000000000n; // 0.1 GEN
const CLAIM_COMMIT_INDEX = 2n;

const outputsOf = (abi: readonly any[], name: string) =>
  abi.find((e: any) => e.type === "function" && e.name === name)!.outputs;

const legacyOutputs = outputsOf(STAKING_ABI as any, "delegatorDeposit");
const currentOutputs = outputsOf(STAKING_COMMIT_VIEWS_CURRENT_ABI as any, "delegatorDeposit");

const legacyResponse = encodeAbiParameters(legacyOutputs, [
  {quantity: 7n, commit: CLAIM_COMMIT_INDEX},
  {input: STAKE, output: 5n, epoch: 3n, linkToNextCommit: 0n},
] as any);

const currentResponse = encodeAbiParameters(currentOutputs, [
  {quantity: 7n, offset: 0n, commit: CLAIM_COMMIT_INDEX},
  {
    input: STAKE,
    output: 5n,
    outstanding: 9n,
    epoch: 3n,
    linkToNextCommit: 0n,
    priced: true,
    fragmented: false,
  },
] as any);

const decodeWith = (abi: readonly any[], data: `0x${string}`) =>
  decodeFunctionResult({abi: abi as any, functionName: "delegatorDeposit", data}) as any;

describe("staking Claim/Commit layout", () => {
  it("reads the amount when the shape matches the response", () => {
    expect(decodeWith(STAKING_COMMIT_VIEWS_CURRENT_ABI as any, currentResponse)[1].input).toBe(STAKE);
    expect(decodeWith(STAKING_ABI as any, legacyResponse)[1].input).toBe(STAKE);
  });

  it("throws when the current shape meets a legacy response — this is the probe", () => {
    expect(() => decodeWith(STAKING_COMMIT_VIEWS_CURRENT_ABI as any, legacyResponse)).toThrow();
  });

  it("silently misreads when the legacy shape meets a current response", () => {
    // Not a throw: claim.commit lands where commit.input is expected, which is
    // how pending deposits came back as small indices instead of amounts.
    const misread = decodeWith(STAKING_ABI as any, currentResponse)[1].input;
    expect(misread).not.toBe(STAKE);
    expect(misread).toBe(CLAIM_COMMIT_INDEX);
  });
});
