import {Address} from "./accounts";
import {GetContractReturnType, PublicClient, Client, Transport, Chain, Account, Address as ViemAddress} from "viem";
import {STAKING_ABI} from "@/abi/staking";

type WalletClientWithAccount = Client<Transport, Chain, Account>;

type StakingKeyedClient = {
  public: PublicClient;
  wallet: WalletClientWithAccount;
};

export type StakingContract = GetContractReturnType<
  typeof STAKING_ABI,
  StakingKeyedClient,
  ViemAddress
>;

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

export interface WithdrawalCommit {
  input: bigint;
  output: bigint;
  epoch: bigint;
  linkToNextCommit: bigint;
}

export interface PendingDeposit {
  epoch: bigint;
  stake: string;
  stakeRaw: bigint;
  shares: bigint;
}

export interface PendingWithdrawal {
  epoch: bigint;
  shares: bigint;
  stake: string;
  stakeRaw: bigint;
}

export interface BannedValidatorInfo {
  validator: Address;
  untilEpoch: bigint;
  permanentlyBanned: boolean;
}

export interface StakeInfo {
  delegator: Address;
  validator: Address;
  shares: bigint;
  stake: string;
  stakeRaw: bigint;
  pendingDeposits: PendingDeposit[];
  pendingWithdrawals: PendingWithdrawal[];
}

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
  slashed: bigint;
}

export interface EpochInfo {
  currentEpoch: bigint;
  lastFinalizedEpoch: bigint;
  validatorMinStake: string;
  validatorMinStakeRaw: bigint;
  delegatorMinStake: string;
  delegatorMinStakeRaw: bigint;
  activeValidatorsCount: bigint;
  epochMinDuration: bigint;
  nextEpochEstimate: Date | null;
}

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

export interface StakingActions {
  validatorJoin: (options: ValidatorJoinOptions) => Promise<ValidatorJoinResult>;
  validatorDeposit: (options: ValidatorDepositOptions) => Promise<StakingTransactionResult>;
  validatorExit: (options: ValidatorExitOptions) => Promise<StakingTransactionResult>;
  validatorClaim: (options?: ValidatorClaimOptions) => Promise<StakingTransactionResult & {claimedAmount: bigint}>;
  delegatorJoin: (options: DelegatorJoinOptions) => Promise<DelegatorJoinResult>;
  delegatorExit: (options: DelegatorExitOptions) => Promise<StakingTransactionResult>;
  delegatorClaim: (options: DelegatorClaimOptions) => Promise<StakingTransactionResult>;
  isValidator: (address: Address) => Promise<boolean>;
  getValidatorInfo: (validator: Address) => Promise<ValidatorInfo>;
  getStakeInfo: (delegator: Address, validator: Address) => Promise<StakeInfo>;
  getEpochInfo: () => Promise<EpochInfo>;
  getEpochData: (epochNumber: bigint) => Promise<EpochData>;
  getActiveValidators: () => Promise<Address[]>;
  getActiveValidatorsCount: () => Promise<bigint>;
  getSlashingAddress: () => Promise<Address>;
  getStakingContract: () => StakingContract;
  parseStakingAmount: (amount: string | bigint) => bigint;
  formatStakingAmount: (amount: bigint) => string;
}
