import {Address} from "./accounts";
import {GetContractReturnType, PublicClient, Client, Transport, Chain, Account, Address as ViemAddress} from "viem";
import {STAKING_ABI} from "@/abi/staking";

// Wallet client with account and chain defined (not undefined)
type WalletClientWithAccount = Client<Transport, Chain, Account>;

// Keyed client type for combined read+write contract access
type StakingKeyedClient = {
  public: PublicClient;
  wallet: WalletClientWithAccount;
};

// Full staking contract type with read and write methods
export type StakingContract = GetContractReturnType<
  typeof STAKING_ABI,
  StakingKeyedClient,
  ViemAddress
>;

// Validator view struct returned from contract
export interface ValidatorView {
  left: Address;
  right: Address;
  parent: Address;
  eBanned: bigint;
  ePrimed: bigint;
  vStake: bigint;
  vShares: bigint;
  dStake: bigint;
  dShares: bigint;
  vDeposit: bigint;
  vWithdrawal: bigint;
  live: boolean;
}

// Validator identity metadata
export interface ValidatorIdentity {
  moniker: string;
  logoUri: string;
  website: string;
  description: string;
  email: string;
  twitter: string;
  telegram: string;
  github: string;
  extraCid: string;
}

// Formatted validator info (human-readable)
export interface ValidatorInfo {
  address: Address;
  owner: Address;
  operator: Address;
  vStake: string;
  vStakeRaw: bigint;
  vShares: bigint;
  dStake: string;
  dStakeRaw: bigint;
  dShares: bigint;
  vDeposit: string;
  vDepositRaw: bigint;
  vWithdrawal: string;
  vWithdrawalRaw: bigint;
  ePrimed: bigint;
  live: boolean;
  banned: boolean;
  bannedEpoch?: bigint;
  needsPriming: boolean;
  identity?: ValidatorIdentity;
  pendingDeposits: PendingDeposit[];
  pendingWithdrawals: PendingWithdrawal[];
}

// Withdrawal commit from contract
export interface WithdrawalCommit {
  input: bigint; // shares for withdrawals
  output: bigint; // stake amount for withdrawals
  epoch: bigint;
  linkToNextCommit: bigint;
}

// Pending deposit info
export interface PendingDeposit {
  epoch: bigint;
  stake: string;
  stakeRaw: bigint;
  shares: bigint;
}

// Pending withdrawal info
export interface PendingWithdrawal {
  epoch: bigint;
  shares: bigint;
  stake: string;
  stakeRaw: bigint;
}

// Banned/quarantined validator info
export interface BannedValidatorInfo {
  validator: Address;
  untilEpoch: bigint;
  permanentlyBanned: boolean;
}

// Stake info for delegator
export interface StakeInfo {
  delegator: Address;
  validator: Address;
  shares: bigint;
  stake: string;
  stakeRaw: bigint;
  pendingDeposits: PendingDeposit[];
  pendingWithdrawals: PendingWithdrawal[];
}

// Epoch struct from contract
export interface EpochData {
  start: bigint;
  end: bigint;
  inflation: bigint;
  weight: bigint;
  weightDeposit: bigint;
  weightWithdrawal: bigint;
  vcount: bigint;
  claimed: bigint;
  stakeDeposit: bigint;
  stakeWithdrawal: bigint;
}

// Epoch info
export interface EpochInfo {
  currentEpoch: bigint;
  validatorMinStake: string;
  validatorMinStakeRaw: bigint;
  delegatorMinStake: string;
  delegatorMinStakeRaw: bigint;
  activeValidatorsCount: bigint;
  epochMinDuration: bigint;
  currentEpochStart: Date;
  currentEpochEnd: Date | null;
  nextEpochEstimate: Date | null;
  // Inflation/rewards data for current epoch
  inflation: string;
  inflationRaw: bigint;
  totalWeight: bigint;
  totalClaimed: string;
  totalClaimedRaw: bigint;
}

// Transaction result
export interface StakingTransactionResult {
  transactionHash: `0x${string}`;
  blockNumber: bigint;
  gasUsed: bigint;
}

export interface ValidatorJoinResult extends StakingTransactionResult {
  validatorWallet: Address;
  operator: Address;
  amount: string;
  amountRaw: bigint;
}

export interface DelegatorJoinResult extends StakingTransactionResult {
  validator: Address;
  delegator: Address;
  amount: string;
  amountRaw: bigint;
}

// Input options
export interface ValidatorJoinOptions {
  amount: bigint | string;
  operator?: Address;
}

export interface ValidatorDepositOptions {
  amount: bigint | string;
}

export interface ValidatorExitOptions {
  shares: bigint | string;
}

export interface ValidatorClaimOptions {
  validator?: Address;
}

export interface ValidatorPrimeOptions {
  validator: Address;
}

export interface SetOperatorOptions {
  validator: Address;
  operator: Address;
}

export interface SetIdentityOptions {
  validator: Address;
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

export interface DelegatorJoinOptions {
  validator: Address;
  amount: bigint | string;
}

export interface DelegatorExitOptions {
  validator: Address;
  shares: bigint | string;
}

export interface DelegatorClaimOptions {
  validator: Address;
  delegator?: Address;
}

// Staking actions interface
export interface StakingActions {
  // Validator operations
  validatorJoin: (options: ValidatorJoinOptions) => Promise<ValidatorJoinResult>;
  validatorDeposit: (options: ValidatorDepositOptions) => Promise<StakingTransactionResult>;
  validatorExit: (options: ValidatorExitOptions) => Promise<StakingTransactionResult>;
  validatorClaim: (options?: ValidatorClaimOptions) => Promise<StakingTransactionResult & {claimedAmount: bigint}>;

  // Delegator operations
  delegatorJoin: (options: DelegatorJoinOptions) => Promise<DelegatorJoinResult>;
  delegatorExit: (options: DelegatorExitOptions) => Promise<StakingTransactionResult>;
  delegatorClaim: (options: DelegatorClaimOptions) => Promise<StakingTransactionResult>;

  // Read operations
  isValidator: (address: Address) => Promise<boolean>;
  getValidatorInfo: (validator: Address) => Promise<ValidatorInfo>;
  getStakeInfo: (delegator: Address, validator: Address) => Promise<StakeInfo>;
  getEpochInfo: () => Promise<EpochInfo>;
  getActiveValidators: () => Promise<Address[]>;
  getActiveValidatorsCount: () => Promise<bigint>;

  // Raw contract access (returns viem contract instance)
  getStakingContract: () => StakingContract;

  // Helpers
  parseStakingAmount: (amount: string | bigint) => bigint;
  formatStakingAmount: (amount: bigint) => string;
}
