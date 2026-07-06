import {Account, Address as ViemAddress, Chain, Client, GetContractReturnType, PublicClient, Transport} from "viem";
import {Address} from "./accounts";
import {VESTING_ABI, VESTING_FACTORY_ABI} from "@/abi/vesting";

type WalletClientWithAccount = Client<Transport, Chain, Account>;

type VestingKeyedClient = {
  public: PublicClient;
  wallet: WalletClientWithAccount;
};

export type VestingContract = GetContractReturnType<typeof VESTING_ABI, VestingKeyedClient, ViemAddress>;
export type VestingFactoryContract = GetContractReturnType<typeof VESTING_FACTORY_ABI, PublicClient, ViemAddress>;

export type VestingCategory = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface VestingTransactionResult {
  transactionHash: `0x${string}`;
  blockNumber: bigint;
  gasUsed: bigint;
}

export interface VestingDelegatorJoinOptions {
  vesting: Address;
  validator: Address;
  amount: bigint | string;
}

export interface VestingDelegatorJoinResult extends VestingTransactionResult {
  vesting: Address;
  validator: Address;
  beneficiary: Address;
  amount: string;
  amountRaw: bigint;
}

export interface VestingDelegatorExitOptions {
  vesting: Address;
  validator: Address;
  shares: bigint | string;
}

export interface VestingDelegatorClaimOptions {
  vesting: Address;
  validator: Address;
}

export interface VestingValidatorJoinOptions {
  vesting: Address;
  operator: Address;
  amount: bigint | string;
}

export interface VestingValidatorJoinResult extends VestingTransactionResult {
  vesting: Address;
  operator: Address;
  beneficiary: Address;
  amount: string;
  amountRaw: bigint;
}

export interface VestingValidatorDepositOptions {
  vesting: Address;
  wallet: Address;
  amount: bigint | string;
}

export interface VestingValidatorExitOptions {
  vesting: Address;
  wallet: Address;
  shares: bigint | string;
}

export interface VestingValidatorClaimOptions {
  vesting: Address;
  wallet: Address;
}

export interface VestingValidatorInitiateOperatorTransferOptions {
  vesting: Address;
  wallet: Address;
  newOperator: Address;
}

export interface VestingValidatorWalletOptions {
  vesting: Address;
  wallet: Address;
}

export interface VestingValidatorSetIdentityOptions {
  vesting: Address;
  wallet: Address;
  moniker: string;
  logoUri?: string;
  website?: string;
  description?: string;
  email?: string;
  twitter?: string;
  telegram?: string;
  github?: string;
  extraCid?: string;
}

export interface VestingWithdrawOptions {
  vesting: Address;
  amount: bigint | string;
}

export interface VestingWithdrawResult extends VestingTransactionResult {
  vesting: Address;
  beneficiary: Address;
  amount: string;
  amountRaw: bigint;
}

export interface VestingFactoryLookupOptions {
  /** Optional explicit VestingFactory address for custom deployments or tests. */
  factory?: Address;
  /** Optional explicit AddressManager address. Defaults to consensusMainContract.getAddressManager(). */
  addressManager?: Address;
}

export interface VestingSchedule {
  startDate: bigint;
  cliffDuration: bigint;
  periodDuration: bigint;
  numberOfPeriods: bigint;
  cliffUnlockBps: bigint;
  needsManualUnlock: boolean;
}

export interface VestingState extends VestingSchedule {
  name: string;
  category: VestingCategory;
  beneficiary: Address;
  creator: Address;
  revoker: Address;
  factory: Address;
  addressManager: Address;
  totalAmount: string;
  totalAmountRaw: bigint;
  manualUnlocked: boolean;
  revoked: boolean;
  vestingStopped: boolean;
  totalWithdrawn: string;
  totalWithdrawnRaw: bigint;
  vestedAtRevocation: string;
  vestedAtRevocationRaw: bigint;
  totalAmountAtRevocation: string;
  totalAmountAtRevocationRaw: bigint;
  revokedAt: bigint;
  vestingStoppedAt: bigint;
  vestedAtStop: string;
  vestedAtStopRaw: bigint;
  postRevocationBeneficiaryRewards: string;
  postRevocationBeneficiaryRewardsRaw: bigint;
  postRevocationBeneficiaryLosses: string;
  postRevocationBeneficiaryLossesRaw: bigint;
  accumulatedRewards: string;
  accumulatedRewardsRaw: bigint;
  accumulatedLosses: string;
  accumulatedLossesRaw: bigint;
  vestedAmount: string;
  vestedAmountRaw: bigint;
  unvestedAmount: string;
  unvestedAmountRaw: bigint;
  withdrawableAmount: string;
  withdrawableAmountRaw: bigint;
}

export interface VestingActions {
  vestingDelegatorJoin: (options: VestingDelegatorJoinOptions) => Promise<VestingDelegatorJoinResult>;
  vestingDelegatorExit: (options: VestingDelegatorExitOptions) => Promise<VestingTransactionResult>;
  vestingDelegatorClaim: (options: VestingDelegatorClaimOptions) => Promise<VestingTransactionResult>;
  vestingValidatorJoin: (options: VestingValidatorJoinOptions) => Promise<VestingValidatorJoinResult>;
  vestingValidatorDeposit: (options: VestingValidatorDepositOptions) => Promise<VestingTransactionResult>;
  vestingValidatorExit: (options: VestingValidatorExitOptions) => Promise<VestingTransactionResult>;
  vestingValidatorClaim: (options: VestingValidatorClaimOptions) => Promise<VestingTransactionResult>;
  vestingValidatorInitiateOperatorTransfer: (options: VestingValidatorInitiateOperatorTransferOptions) => Promise<VestingTransactionResult>;
  vestingValidatorCompleteOperatorTransfer: (options: VestingValidatorWalletOptions) => Promise<VestingTransactionResult>;
  vestingValidatorCancelOperatorTransfer: (options: VestingValidatorWalletOptions) => Promise<VestingTransactionResult>;
  vestingValidatorSetIdentity: (options: VestingValidatorSetIdentityOptions) => Promise<VestingTransactionResult>;
  vestingWithdraw: (options: VestingWithdrawOptions) => Promise<VestingWithdrawResult>;

  getVestingFactoryAddress: (options?: Omit<VestingFactoryLookupOptions, "factory">) => Promise<Address>;
  getVestingForBeneficiary: (beneficiary: Address, options?: VestingFactoryLookupOptions) => Promise<Address | null>;
  getBeneficiaryVestings: (beneficiary: Address, options?: VestingFactoryLookupOptions) => Promise<Address[]>;
  isVestingAddress: (address: Address, options?: VestingFactoryLookupOptions) => Promise<boolean>;
  getVestingContract: (vesting: Address) => VestingContract;
  getVestingFactoryContract: (factory: Address) => VestingFactoryContract;

  vestedAmount: (vesting: Address) => Promise<bigint>;
  unvestedAmount: (vesting: Address) => Promise<bigint>;
  withdrawableAmount: (vesting: Address) => Promise<bigint>;
  getVestingSchedule: (vesting: Address) => Promise<VestingSchedule>;
  getVestingState: (vesting: Address) => Promise<VestingState>;

  vestingName: (vesting: Address) => Promise<string>;
  vestingCategory: (vesting: Address) => Promise<VestingCategory>;
  vestingBeneficiary: (vesting: Address) => Promise<Address>;
  vestingCreator: (vesting: Address) => Promise<Address>;
  vestingRevoker: (vesting: Address) => Promise<Address>;
  vestingFactory: (vesting: Address) => Promise<Address>;
  vestingAddressManager: (vesting: Address) => Promise<Address>;
  vestingTotalAmount: (vesting: Address) => Promise<bigint>;
  vestingStartDate: (vesting: Address) => Promise<bigint>;
  vestingCliffDuration: (vesting: Address) => Promise<bigint>;
  vestingPeriodDuration: (vesting: Address) => Promise<bigint>;
  vestingNumberOfPeriods: (vesting: Address) => Promise<bigint>;
  vestingCliffUnlockBps: (vesting: Address) => Promise<bigint>;
  vestingNeedsManualUnlock: (vesting: Address) => Promise<boolean>;
  vestingManualUnlocked: (vesting: Address) => Promise<boolean>;
  vestingRevoked: (vesting: Address) => Promise<boolean>;
  vestingStopped: (vesting: Address) => Promise<boolean>;
  vestingTotalWithdrawn: (vesting: Address) => Promise<bigint>;
  vestingVestedAtRevocation: (vesting: Address) => Promise<bigint>;
  vestingTotalAmountAtRevocation: (vesting: Address) => Promise<bigint>;
  vestingRevokedAt: (vesting: Address) => Promise<bigint>;
  vestingStoppedAt: (vesting: Address) => Promise<bigint>;
  vestingVestedAtStop: (vesting: Address) => Promise<bigint>;
  vestingPostRevocationBeneficiaryRewards: (vesting: Address) => Promise<bigint>;
  vestingPostRevocationBeneficiaryLosses: (vesting: Address) => Promise<bigint>;
  vestingDepositedPerValidator: (vesting: Address, validator: Address) => Promise<bigint>;
  vestingPendingExitDeposited: (vesting: Address, validator: Address) => Promise<bigint>;
  getValidatorWallets: (vesting: Address) => Promise<Address[]>;
  validatorWalletCount: (vesting: Address) => Promise<bigint>;
  validatorDeposited: (vesting: Address, wallet: Address) => Promise<bigint>;
  isValidatorWallet: (vesting: Address, wallet: Address) => Promise<boolean>;
  vestingAccumulatedRewards: (vesting: Address) => Promise<bigint>;
  vestingAccumulatedLosses: (vesting: Address) => Promise<bigint>;
}
