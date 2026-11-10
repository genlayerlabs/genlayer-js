import {
  concatHex,
  encodeAbiParameters,
  getAddress,
  hexToBigInt,
  keccak256,
  recoverMessageAddress,
  sliceHex,
  stringToHex,
  toHex,
  type Address,
  type Hex,
} from "viem";
import {privateKeyToAccount, publicKeyToAddress} from "viem/accounts";
import type {
  CreateOperatorRegistrationOptions,
  OperatorPublicKey,
  OperatorRegistrationContext,
  OperatorRegistrationProof,
} from "@/types/vesting";

export type {
  CreateOperatorRegistrationOptions,
  OperatorPublicKey,
  OperatorRegistrationContext,
  OperatorRegistrationProof,
} from "@/types/vesting";

export const OPERATOR_REGISTRATION_DOMAIN = keccak256(
  stringToHex("GenLayer/operatorPubKey/proof-of-possession/v1"),
);

export function operatorAddressFromPublicKey(operatorPubKey: OperatorPublicKey): Address {
  const publicKey = concatHex([
    "0x04",
    toHex(operatorPubKey[0], {size: 32}),
    toHex(operatorPubKey[1], {size: 32}),
  ]);
  return getAddress(publicKeyToAddress(publicKey));
}

export function operatorPossessionMessage(
  operatorPubKey: OperatorPublicKey,
  context: OperatorRegistrationContext,
): Hex {
  return keccak256(
    encodeAbiParameters(
      [
        {type: "bytes32"},
        {type: "uint256"},
        {type: "address"},
        {type: "address"},
        {type: "uint256"},
        {type: "uint256"},
      ],
      [
        OPERATOR_REGISTRATION_DOMAIN,
        context.chainId,
        context.registrar,
        context.owner,
        operatorPubKey[0],
        operatorPubKey[1],
      ],
    ),
  );
}

/**
 * Builds the proof package consumed by proof-bearing validator registration.
 * The private key is used only in memory and is never included in the result.
 */
export async function createOperatorRegistration(
  options: CreateOperatorRegistrationOptions,
): Promise<OperatorRegistrationProof> {
  const account = privateKeyToAccount(options.privateKey);
  const operatorPubKey: OperatorPublicKey = [
    hexToBigInt(sliceHex(account.publicKey, 1, 33)),
    hexToBigInt(sliceHex(account.publicKey, 33, 65)),
  ];
  const operator = operatorAddressFromPublicKey(operatorPubKey);

  if (operator !== getAddress(account.address)) {
    throw new Error("Operator private key and public key derive different identities.");
  }

  const possessionProof = await account.signMessage({
    message: {raw: operatorPossessionMessage(operatorPubKey, options)},
  });

  return {operator, operatorPubKey, possessionProof};
}

/** Validates the key identity and the exact registrar/owner/chain-bound proof. */
export async function verifyOperatorRegistration(
  registration: OperatorRegistrationProof,
  context: OperatorRegistrationContext,
): Promise<boolean> {
  try {
    const operator = operatorAddressFromPublicKey(registration.operatorPubKey);
    if (operator !== getAddress(registration.operator)) return false;

    const recovered = await recoverMessageAddress({
      message: {raw: operatorPossessionMessage(registration.operatorPubKey, context)},
      signature: registration.possessionProof,
    });
    return getAddress(recovered) === operator;
  } catch {
    return false;
  }
}
