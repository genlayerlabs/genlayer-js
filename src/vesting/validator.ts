export type {
  VestingValidatorClaimOptions,
  VestingValidatorDepositOptions,
  VestingValidatorExitOptions,
  VestingValidatorInitiateOperatorTransferOptions,
  VestingValidatorJoinOptions,
  VestingValidatorJoinResult,
  VestingValidatorSetIdentityOptions,
  VestingValidatorWalletOptions,
  CreateOperatorRegistrationOptions,
  OperatorPublicKey,
  OperatorRegistrationContext,
  OperatorRegistrationProof,
} from "@/types/vesting";

export {
  OPERATOR_REGISTRATION_DOMAIN,
  createOperatorRegistration,
  operatorAddressFromPublicKey,
  operatorPossessionMessage,
  verifyOperatorRegistration,
} from "./operatorRegistration";
