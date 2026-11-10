import {describe, expect, it} from "vitest";
import {decodeFunctionResult, encodeAbiParameters, type AbiParameter} from "viem";
import producer from "./fixtures/consensus-consumer-abi.json";
import {STAKING_ABI} from "../src/abi/staking";
import {CONSENSUS_DATA_TRAIN_ABI} from "../src/abi/consensusTrain";

const layout = (parameters: readonly any[]): unknown => parameters.map(p => ({
  type: p.type,
  ...(p.components ? {components: p.components.map((c: any) => ({name: c.name, layout: layout([c])}))} : {}),
}));
const stakingRead = (name: string) => (STAKING_ABI as readonly any[]).find(
  item => item.name === name && item.stateMutability === "view",
)!;

describe(`consumer ABI at consensus ${producer.revision}`, () => {
  it("matches the producer validator views and all claim/commit readers", () => {
    for (const name of ["validatorView", "validatorViewPrimed", "validatorViewPrePrimed"]) {
      expect(layout(stakingRead(name).outputs)).toEqual(layout(producer.validatorView.outputs));
    }
    const [claim, commit] = producer.delegatorDeposit.outputs;
    for (const name of ["delegatorDeposit", "delegatorWithdrawal"]) {
      expect(layout(stakingRead(name).outputs)).toEqual(layout([claim, commit]));
    }
    for (const name of ["validatorDeposit", "validatorWithdrawal", "delegatorDepositByEpoch",
      "delegatorWithdrawalByEpoch", "validatorDepositByEpoch", "validatorWithdrawalByEpoch"]) {
      expect(layout([stakingRead(name).outputs.at(-1)])).toEqual(layout([commit]));
    }
  });

  it("decodes producer claim and commit amounts above uint120 without truncating", () => {
    const amount = (1n << 200n) + 7n;
    const encoded = encodeAbiParameters(producer.delegatorDeposit.outputs as AbiParameter[], [
      {quantity: amount, offset: amount - 1n, commit: 3n},
      {input: amount, output: amount, outstanding: amount, epoch: 4n,
        linkToNextCommit: 0n, priced: true, fragmented: false},
    ]);
    const [claim, commit] = decodeFunctionResult({abi: STAKING_ABI, functionName: "delegatorDeposit", data: encoded});
    expect(claim.quantity).toBe(amount);
    expect(claim.offset).toBe(amount - 1n);
    expect(commit.outstanding).toBe(amount);
  });

  it("matches the producer lifecycle including its independent execution generation", () => {
    const fn = CONSENSUS_DATA_TRAIN_ABI.find(item => item.type === "function" && item.name === "getTransactionLifecycle") as any;
    expect(layout(fn.outputs)).toEqual(layout(producer.getTransactionLifecycle.outputs));
  });
});
