import {describe, expect, it} from "vitest";
import {decodeFunctionResult, encodeAbiParameters} from "viem";
import {STAKING_ABI} from "../src/abi/staking";

const STAKE = 100000000000000000n;
const CLAIM_COMPONENTS = [
  {name: "quantity", type: "uint120"},
  {name: "offset", type: "uint120"},
  {name: "commit", type: "uint256"},
];
const COMMIT_COMPONENTS = [
  {name: "input", type: "uint256"},
  {name: "output", type: "uint256"},
  {name: "outstanding", type: "uint120"},
  {name: "epoch", type: "uint64"},
  {name: "linkToNextCommit", type: "uint56"},
  {name: "priced", type: "bool"},
  {name: "fragmented", type: "bool"},
];
const VALIDATOR_VIEW_COMPONENTS = [
  {name: "eBanned", type: "uint256"},
  {name: "ePrimed", type: "uint256"},
  {name: "vStake", type: "uint256"},
  {name: "vShares", type: "uint256"},
  {name: "dStake", type: "uint256"},
  {name: "dShares", type: "uint256"},
  {name: "vDeposit", type: "uint256"},
  {name: "vWithdrawal", type: "uint256"},
  {name: "live", type: "bool"},
];

const view = (name: string) =>
  (STAKING_ABI as readonly any[]).find(
    entry => entry.type === "function" && entry.name === name && entry.stateMutability === "view",
  )!;

describe("staking Claim/Commit train layout", () => {
  it("does not ship duplicate function signatures", () => {
    const signatures = (STAKING_ABI as readonly any[])
      .filter(entry => entry.type === "function")
      .map(entry => `${entry.name}(${entry.inputs.map((input: any) => input.type).join(",")})`);
    expect(new Set(signatures).size).toBe(signatures.length);
  });

  it("uses the canonical train tuple in every commit read", () => {
    for (const name of [
      "delegatorDeposit",
      "delegatorWithdrawal",
      "delegatorDepositByEpoch",
      "delegatorWithdrawalByEpoch",
      "validatorDeposit",
      "validatorWithdrawal",
      "validatorDepositByEpoch",
      "validatorWithdrawalByEpoch",
    ]) {
      const commit = view(name).outputs.at(-1);
      expect(commit.components, name).toEqual(COMMIT_COMPONENTS);
    }

    expect(view("delegatorDeposit").outputs[0].components).toEqual(CLAIM_COMPONENTS);
    expect(view("delegatorWithdrawal").outputs[0].components).toEqual(CLAIM_COMPONENTS);
  });

  it("decodes raw train delegator bytes without a layout probe", () => {
    const outputs = view("delegatorDeposit").outputs;
    const encoded = encodeAbiParameters(outputs, [
      {quantity: 7n, offset: 2n, commit: 3n},
      {
        input: STAKE,
        output: 5n,
        outstanding: 9n,
        epoch: 4n,
        linkToNextCommit: 0n,
        priced: true,
        fragmented: false,
      },
    ] as any);

    const [claim, commit] = decodeFunctionResult({
      abi: STAKING_ABI,
      functionName: "delegatorDeposit",
      data: encoded,
    }) as any;

    expect(claim).toMatchObject({quantity: 7n, offset: 2n, commit: 3n});
    expect(commit).toMatchObject({input: STAKE, outstanding: 9n, epoch: 4n, priced: true});
  });
});

describe("staking ValidatorView train layout", () => {
  it("uses the canonical nine-field tuple in every validator view", () => {
    for (const name of ["validatorView", "validatorViewPrimed", "validatorViewPrePrimed"]) {
      expect(view(name).outputs[0].components, name).toEqual(VALIDATOR_VIEW_COMPONENTS);
    }
  });

  it("decodes raw train validator bytes without removed tree links", () => {
    const output = view("validatorView").outputs[0];
    const encoded = encodeAbiParameters([output], [{
      eBanned: 1n,
      ePrimed: 2n,
      vStake: 3n,
      vShares: 4n,
      dStake: 5n,
      dShares: 6n,
      vDeposit: 7n,
      vWithdrawal: 8n,
      live: true,
    }] as any);

    const decoded = decodeFunctionResult({
      abi: STAKING_ABI,
      functionName: "validatorView",
      data: encoded,
    }) as any;

    expect(decoded).toMatchObject({
      eBanned: 1n,
      ePrimed: 2n,
      vStake: 3n,
      dStake: 5n,
      live: true,
    });
    expect(decoded).not.toHaveProperty("left");
    expect(decoded).not.toHaveProperty("right");
    expect(decoded).not.toHaveProperty("parent");
  });
});
