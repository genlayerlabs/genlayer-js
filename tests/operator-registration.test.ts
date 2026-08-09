import {describe, expect, it} from "vitest";
import {getAddress} from "viem";
import {privateKeyToAccount} from "viem/accounts";
import {
  OPERATOR_REGISTRATION_DOMAIN,
  createOperatorRegistration,
  operatorPossessionMessage,
  verifyOperatorRegistration,
  type OperatorRegistrationContext,
} from "../src/vesting/operatorRegistration";

const OPERATOR_KEY = "0x0000000000000000000000000000000000000000000000000000000000000002";
const OTHER_OPERATOR_KEY = "0x0000000000000000000000000000000000000000000000000000000000000003";
const CONTEXT: OperatorRegistrationContext = {
  registrar: "0x1111111111111111111111111111111111111111",
  owner: "0x2222222222222222222222222222222222222222",
  chainId: 61999n,
};

describe("operator registration", () => {
  it("matches the consensus proof-of-possession vector", async () => {
    const registration = await createOperatorRegistration({
      privateKey: OPERATOR_KEY,
      ...CONTEXT,
    });

    expect(OPERATOR_REGISTRATION_DOMAIN).toBe(
      "0x56a1f863be2956668ca2fd6b4010d6fde7a54f2b5a02d6c624a2bad7e5fd5ada",
    );
    expect(registration.operator).toBe(getAddress("0x2B5AD5c4795c026514f8317c7a215E218DcCD6cF"));
    expect(registration.operatorPubKey).toEqual([
      89565891926547004231252920425935692360644145829622209833684329913297188986597n,
      12158399299693830322967808612713398636155367887041628176798871954788371653930n,
    ]);
    expect(operatorPossessionMessage(registration.operatorPubKey, CONTEXT)).toBe(
      "0x7823e1bdaf3a8cea679a7bafaf8ddc39c379ac690f35696328650c3a712f36e0",
    );
    expect(registration.possessionProof).toBe(
      "0x30cedc70f8ab478fbc1a13a3f36e7f6a10eed631f59db4c451e38fe6d94dc640586d7a3202471043dbad68a3850655d39114aaca647df5734b171f8db7e88f161c",
    );
    await expect(verifyOperatorRegistration(registration, CONTEXT)).resolves.toBe(true);
  });

  it("rejects wrong-key and cross-domain proofs", async () => {
    const registration = await createOperatorRegistration({
      privateKey: OPERATOR_KEY,
      ...CONTEXT,
    });
    const wrongKey = privateKeyToAccount(OTHER_OPERATOR_KEY);
    const wrongKeyProof = await wrongKey.signMessage({
      message: {raw: operatorPossessionMessage(registration.operatorPubKey, CONTEXT)},
    });

    await expect(
      verifyOperatorRegistration({...registration, possessionProof: wrongKeyProof}, CONTEXT),
    ).resolves.toBe(false);
    await expect(
      verifyOperatorRegistration(registration, {
        ...CONTEXT,
        registrar: "0x3333333333333333333333333333333333333333",
      }),
    ).resolves.toBe(false);
    await expect(
      verifyOperatorRegistration(registration, {
        ...CONTEXT,
        owner: "0x4444444444444444444444444444444444444444",
      }),
    ).resolves.toBe(false);
    await expect(
      verifyOperatorRegistration(registration, {...CONTEXT, chainId: CONTEXT.chainId + 1n}),
    ).resolves.toBe(false);
  });
});
