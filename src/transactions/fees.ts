import {encodeAbiParameters, hexToBytes, keccak256, toHex, type Hex} from "viem";

import {
  BigNumberish,
  ExternalMessageFeeParamsInput,
  FeesDistribution,
  FeesDistributionInput,
  InternalMessageFeeParamsInput,
  MessageFeeAllocationInput,
  MessageFeeAllocationNode,
  MessageType,
  TransactionFeeOptions,
} from "@/types";

export const MESSAGE_ALLOCATION_ROOT_PARENT_INDEX = (1n << 256n) - 1n;
// Wildcard sentinel = keccak256 of empty bytes, untagged. Reserved: it can never be a
// derived key — short names (<32B) are left-aligned with a zero tail byte, long names
// get the low bit forced to 1, and this hash has neither.
export const CALL_KEY_WILDCARD = "0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470" as const;
// Empty method name derives bytes32(0); GenVM emits it for deploy and emit_transfer.
export const CALL_KEY_UNNAMED = "0x0000000000000000000000000000000000000000000000000000000000000000" as const;
export const DEPLOY_CALL_KEY = CALL_KEY_UNNAMED;
export const CALL_KEY_DEPLOY = DEPLOY_CALL_KEY;

export const deployCallKey = (): Hex => DEPLOY_CALL_KEY;

const bytesToPaddedCallKey = (bytes: Uint8Array): Hex => {
  if (bytes.length > 32) {
    throw new Error("call key source bytes must be 32 bytes or fewer.");
  }
  return `0x${toHex(bytes).slice(2).padEnd(64, "0")}` as Hex;
};

export const deriveInternalMessageCallKey = (methodName = ""): Hex => {
  const methodBytes = new TextEncoder().encode(methodName);
  if (methodBytes.length < 32) {
    return bytesToPaddedCallKey(methodBytes);
  }

  const hashed = keccak256(methodBytes);
  const lastByte = Number.parseInt(hashed.slice(-2), 16) | 1;
  return `${hashed.slice(0, -2)}${lastByte.toString(16).padStart(2, "0")}` as Hex;
};

export const deriveExternalMessageCallKey = (selectorOrCalldata: Hex | Uint8Array = "0x"): Hex => {
  const bytes = typeof selectorOrCalldata === "string"
    ? hexToBytes(selectorOrCalldata)
    : selectorOrCalldata;

  if (bytes.length < 4) {
    return CALL_KEY_UNNAMED;
  }

  return bytesToPaddedCallKey(bytes.slice(0, 4));
};

export const DEFAULT_FEES_DISTRIBUTION: FeesDistribution = {
  leaderTimeunitsAllocation: 0n,
  validatorTimeunitsAllocation: 0n,
  appealRounds: 0n,
  executionBudgetPerRound: 0n,
  executionConsumed: 0n,
  totalMessageFees: 0n,
  rotations: [0n],
  maxPriceGenPerTimeUnit: 0n,
  storageFeeMaxGasPrice: 0n,
  receiptFeeMaxGasPrice: 0n,
};

export type NormalizedTransactionFees = {
  distribution: FeesDistribution;
  messageAllocations: MessageFeeAllocationNode[];
  feeValue?: bigint;
  requiresFeeAwareTransaction: boolean;
};

const toUInt = (value: BigNumberish | undefined, fieldName: string, fallback = 0n): bigint => {
  if (value === undefined) {
    return fallback;
  }

  if (typeof value === "number" && !Number.isSafeInteger(value)) {
    throw new Error(`${fieldName} must be a safe integer when provided as a number.`);
  }

  const normalized = BigInt(value);
  if (normalized < 0n) {
    throw new Error(`${fieldName} must be greater than or equal to zero.`);
  }
  return normalized;
};

const normalizeRotations = (
  rotations: BigNumberish[] | undefined,
  appealRounds: bigint,
  fieldName: string,
): bigint[] => {
  const expectedLength = Number(appealRounds + 1n);
  if (!Number.isSafeInteger(expectedLength)) {
    throw new Error(`${fieldName} appealRounds is too large.`);
  }

  if (!rotations) {
    return Array.from({length: expectedLength}, () => 0n);
  }

  const normalized = rotations.map((rotation, index) => toUInt(rotation, `${fieldName}[${index}]`));
  if (normalized.length !== expectedLength) {
    throw new Error(`${fieldName} must contain appealRounds + 1 entries.`);
  }
  return normalized;
};

const hasNonDefaultFeesDistribution = (distribution: FeesDistribution): boolean => {
  return (
    distribution.leaderTimeunitsAllocation !== 0n ||
    distribution.validatorTimeunitsAllocation !== 0n ||
    distribution.appealRounds !== 0n ||
    distribution.executionBudgetPerRound !== 0n ||
    distribution.executionConsumed !== 0n ||
    distribution.totalMessageFees !== 0n ||
    distribution.rotations.length !== 1 ||
    distribution.rotations[0] !== 0n ||
    distribution.maxPriceGenPerTimeUnit !== 0n ||
    distribution.storageFeeMaxGasPrice !== 0n ||
    distribution.receiptFeeMaxGasPrice !== 0n
  );
};

export const createFeesDistribution = (input: FeesDistributionInput = {}): FeesDistribution => {
  const appealRounds = toUInt(input.appealRounds, "fees.distribution.appealRounds");
  return {
    leaderTimeunitsAllocation: toUInt(input.leaderTimeunitsAllocation, "fees.distribution.leaderTimeunitsAllocation"),
    validatorTimeunitsAllocation: toUInt(input.validatorTimeunitsAllocation, "fees.distribution.validatorTimeunitsAllocation"),
    appealRounds,
    executionBudgetPerRound: toUInt(input.executionBudgetPerRound, "fees.distribution.executionBudgetPerRound"),
    executionConsumed: toUInt(input.executionConsumed, "fees.distribution.executionConsumed"),
    totalMessageFees: toUInt(input.totalMessageFees, "fees.distribution.totalMessageFees"),
    rotations: normalizeRotations(input.rotations, appealRounds, "fees.distribution.rotations"),
    maxPriceGenPerTimeUnit: toUInt(input.maxPriceGenPerTimeUnit, "fees.distribution.maxPriceGenPerTimeUnit"),
    storageFeeMaxGasPrice: toUInt(input.storageFeeMaxGasPrice, "fees.distribution.storageFeeMaxGasPrice"),
    receiptFeeMaxGasPrice: toUInt(input.receiptFeeMaxGasPrice, "fees.distribution.receiptFeeMaxGasPrice"),
  };
};

export const encodeInternalMessageFeeParams = (input: InternalMessageFeeParamsInput = {}) => {
  const appealRounds = toUInt(input.appealRounds, "internalMessageFeeParams.appealRounds");
  return encodeAbiParameters(
    [
      {
        name: "params",
        type: "tuple",
        components: [
          {name: "leaderTimeunitsAllocation", type: "uint256"},
          {name: "validatorTimeunitsAllocation", type: "uint256"},
          {name: "appealRounds", type: "uint256"},
          {name: "executionBudgetPerRound", type: "uint256"},
          {name: "rotations", type: "uint256[]"},
        ],
      },
    ],
    [
      {
        leaderTimeunitsAllocation: toUInt(input.leaderTimeunitsAllocation, "internalMessageFeeParams.leaderTimeunitsAllocation"),
        validatorTimeunitsAllocation: toUInt(input.validatorTimeunitsAllocation, "internalMessageFeeParams.validatorTimeunitsAllocation"),
        appealRounds,
        executionBudgetPerRound: toUInt(input.executionBudgetPerRound, "internalMessageFeeParams.executionBudgetPerRound"),
        rotations: normalizeRotations(input.rotations, appealRounds, "internalMessageFeeParams.rotations"),
      },
    ],
  );
};

export const encodeExternalMessageFeeParams = (input: ExternalMessageFeeParamsInput = {}) => {
  return encodeAbiParameters(
    [
      {
        name: "params",
        type: "tuple",
        components: [
          {name: "gasLimit", type: "uint256"},
          {name: "maxGasPrice", type: "uint256"},
        ],
      },
    ],
    [
      {
        gasLimit: toUInt(input.gasLimit, "externalMessageFeeParams.gasLimit"),
        maxGasPrice: toUInt(input.maxGasPrice, "externalMessageFeeParams.maxGasPrice"),
      },
    ],
  );
};

export const normalizeMessageFeeAllocations = (
  allocations: MessageFeeAllocationInput[] = [],
): MessageFeeAllocationNode[] => {
  return allocations.map((allocation, index) => ({
    messageType: allocation.messageType,
    onAcceptance: allocation.onAcceptance ?? allocation.messageType !== MessageType.External,
    parentIndex: toUInt(
      allocation.parentIndex,
      `fees.messageAllocations[${index}].parentIndex`,
      MESSAGE_ALLOCATION_ROOT_PARENT_INDEX,
    ),
    recipient: allocation.recipient,
    callKey: allocation.callKey ?? CALL_KEY_WILDCARD,
    budget: toUInt(allocation.budget, `fees.messageAllocations[${index}].budget`),
    feeParams: allocation.feeParams ?? "0x",
  }));
};

export const normalizeTransactionFees = (fees?: TransactionFeeOptions): NormalizedTransactionFees => {
  const distribution = createFeesDistribution(fees?.distribution);
  const messageAllocations = normalizeMessageFeeAllocations(fees?.messageAllocations);
  const feeValue = fees?.feeValue === undefined
    ? undefined
    : toUInt(fees.feeValue, "fees.feeValue");

  return {
    distribution,
    messageAllocations,
    feeValue,
    requiresFeeAwareTransaction:
      hasNonDefaultFeesDistribution(distribution) ||
      messageAllocations.length > 0 ||
      (feeValue ?? 0n) !== 0n,
  };
};

export {
  MessageType,
};
