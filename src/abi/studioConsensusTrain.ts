import type {Abi} from "viem";

const feesDistributionComponents = [
  {name: "leaderTimeunitsAllocation", type: "uint256"},
  {name: "validatorTimeunitsAllocation", type: "uint256"},
  {name: "appealRounds", type: "uint256"},
  {name: "executionBudgetPerRound", type: "uint256"},
  {name: "executionConsumed", type: "uint256"},
  {name: "totalMessageFees", type: "uint256"},
  {name: "rotations", type: "uint256[]"},
  {name: "maxPriceGenPerTimeUnit", type: "uint256"},
  {name: "storageFeeMaxGasPrice", type: "uint256"},
  {name: "receiptFeeMaxGasPrice", type: "uint256"},
] as const;

const messageAllocationComponents = [
  {name: "messageType", type: "uint8"},
  {name: "onAcceptance", type: "bool"},
  {name: "parentIndex", type: "uint256"},
  {name: "recipient", type: "address"},
  {name: "callKey", type: "bytes32"},
  {name: "budget", type: "uint256"},
  {name: "feeParams", type: "bytes"},
] as const;

const addTransactionParamsComponents = [
  {name: "sender", type: "address"},
  {name: "recipient", type: "address"},
  {name: "numOfInitialValidators", type: "uint256"},
  {name: "maxRotations", type: "uint256"},
  {name: "validUntil", type: "uint256"},
  {name: "saltNonce", type: "uint256"},
  {name: "userValue", type: "uint256"},
  {name: "feesDistribution", type: "tuple", components: feesDistributionComponents},
  {name: "txCalldata", type: "bytes"},
  {name: "messageAllocations", type: "tuple[]", components: messageAllocationComponents},
] as const;

/**
 * Studio's v0.123 transaction surface. The bundled legacy ConsensusMain ABI
 * is retained for unrelated reads/events, while these entries replace every
 * transaction function whose v0.6 signature is authoritative at admission.
 */
export const studioConsensusMainTrainAbi = [
  {
    type: "function",
    name: "addTransaction",
    stateMutability: "payable",
    inputs: [{name: "_params", type: "tuple", components: addTransactionParamsComponents}],
    outputs: [],
  },
  {
    type: "function",
    name: "deploySalted",
    stateMutability: "payable",
    inputs: [{name: "_params", type: "tuple", components: addTransactionParamsComponents}],
    outputs: [],
  },
  {
    type: "function",
    name: "topUpFees",
    stateMutability: "payable",
    inputs: [
      {name: "_txId", type: "bytes32"},
      {name: "_feesDistribution", type: "tuple", components: feesDistributionComponents},
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "topUpAndSubmitAppeal",
    stateMutability: "payable",
    inputs: [
      {name: "_txId", type: "bytes32"},
      {name: "_expectedDecisionId", type: "uint256"},
      {name: "_feesDistribution", type: "tuple", components: feesDistributionComponents},
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "submitAppeal",
    stateMutability: "payable",
    inputs: [
      {name: "_txId", type: "bytes32"},
      {name: "_expectedDecisionId", type: "uint256"},
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "finalizeTransaction",
    stateMutability: "nonpayable",
    inputs: [
      {name: "_txId", type: "bytes32"},
      {name: "_expectedDecisionId", type: "uint256"},
    ],
    outputs: [],
  },
] as const satisfies Abi;

const overriddenNames = new Set(
  studioConsensusMainTrainAbi.map((entry) => entry.name),
);

export const withStudioConsensusMainTrainAbi = (base: readonly unknown[]): Abi => {
  const retained = base.filter((rawEntry) => {
    const entry = rawEntry as {type?: string; name?: string};
    return entry.type !== "function" ||
      entry.name === undefined ||
      !overriddenNames.has(entry.name as typeof studioConsensusMainTrainAbi[number]["name"]);
  });
  return [...retained, ...studioConsensusMainTrainAbi] as Abi;
};
