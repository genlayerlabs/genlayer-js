import {
  Account,
  Address as ViemAddress,
  BaseError,
  Chain,
  Client,
  ContractFunctionRevertedError,
  decodeErrorResult,
  encodeFunctionData,
  getContract,
  isHex,
  PublicClient,
  RawContractError,
  toHex,
  Transport,
  zeroAddress,
} from "viem";
import {ADDRESS_MANAGER_ABI, CONSENSUS_ADDRESS_MANAGER_ABI, VESTING_ABI, VESTING_FACTORY_ABI} from "@/abi/vesting";
import {STAKING_ABI} from "@/abi/staking";
import {Address, GenLayerChain, GenLayerClient} from "@/types";
import {
  VestingCategory,
  VestingContract,
  VestingDelegatorClaimOptions,
  VestingDelegatorExitOptions,
  VestingDelegatorJoinOptions,
  VestingDelegatorJoinResult,
  VestingFactoryContract,
  VestingFactoryLookupOptions,
  VestingSchedule,
  VestingState,
  VestingTransactionResult,
  VestingValidatorClaimOptions,
  VestingValidatorDepositOptions,
  VestingValidatorExitOptions,
  VestingValidatorInitiateOperatorTransferOptions,
  VestingValidatorJoinOptions,
  VestingValidatorJoinResult,
  VestingValidatorSetIdentityOptions,
  VestingValidatorWalletOptions,
  VestingWithdrawOptions,
  VestingWithdrawResult,
} from "@/types/vesting";
import {formatStakingAmount, parseStakingAmount} from "@/staking/utils";

type WalletClientWithAccount = Client<Transport, Chain, Account>;

const FALLBACK_GAS = 1000000n;
const GAS_BUFFER_MULTIPLIER = 2n;
const VESTING_FACTORY_KEY = "VestingFactory";
const COMBINED_ERROR_ABI = [...VESTING_ABI, ...VESTING_FACTORY_ABI, ...ADDRESS_MANAGER_ABI, ...STAKING_ABI] as const;

function extractRevertReason(err: unknown): string {
  if (err instanceof BaseError) {
    const rawError = err.walk(e => e instanceof RawContractError);
    if (rawError instanceof RawContractError && rawError.data && typeof rawError.data === "string") {
      try {
        const decoded = decodeErrorResult({abi: COMBINED_ERROR_ABI, data: rawError.data as `0x${string}`});
        return decoded.errorName;
      } catch {
        // Fall through to other methods.
      }
    }

    let current: unknown = err;
    while (current) {
      if (current && typeof current === "object") {
        const obj = current as Record<string, unknown>;
        if (obj.data && typeof obj.data === "string" && obj.data.startsWith("0x")) {
          try {
            const decoded = decodeErrorResult({abi: COMBINED_ERROR_ABI, data: obj.data as `0x${string}`});
            return decoded.errorName;
          } catch {
            // Continue searching.
          }
        }
        current = obj.cause;
      } else {
        break;
      }
    }

    const revertError = err.walk(e => e instanceof ContractFunctionRevertedError);
    if (revertError instanceof ContractFunctionRevertedError) {
      if (revertError.data?.errorName) {
        return revertError.data.errorName;
      }
      return revertError.reason || "Unknown reason";
    }
    if (err.shortMessage) return err.shortMessage;
  }
  if (err instanceof Error) return err.message;
  return "Unknown reason";
}

function encodeExtraCid(extraCid?: string): `0x${string}` {
  if (!extraCid) return "0x";
  if (extraCid.startsWith("0x")) {
    if (!isHex(extraCid, {strict: true}) || extraCid.length % 2 !== 0) {
      throw new Error("extraCid must be a valid even-length hex string");
    }
    return extraCid;
  }
  return toHex(new TextEncoder().encode(extraCid));
}

function parseExitShares(shares: bigint | string): bigint {
  if (typeof shares === "string" && shares.trim() === "") {
    throw new Error("shares must not be empty");
  }
  const parsed = typeof shares === "string" ? BigInt(shares) : shares;
  if (parsed <= 0n) {
    throw new Error("shares must be greater than zero");
  }
  return parsed;
}

export const vestingActions = (
  client: GenLayerClient<GenLayerChain>,
  publicClient: PublicClient,
) => {
  const executeWrite = async (options: {
    to: ViemAddress;
    data: `0x${string}`;
    value?: bigint;
    gas?: bigint;
  }): Promise<VestingTransactionResult> => {
    if (!client.account) {
      throw new Error("Account is required for write operations. Initialize client with a wallet account.");
    }
    const account = client.account;

    try {
      await publicClient.call({
        account,
        to: options.to,
        data: options.data,
        value: options.value,
      });
    } catch (err: unknown) {
      const revertReason = extractRevertReason(err);
      throw new Error(`Transaction would revert: ${revertReason}`);
    }

    let gasLimit = options.gas;
    if (!gasLimit) {
      try {
        const estimated = await publicClient.estimateGas({
          account,
          to: options.to,
          data: options.data,
          value: options.value,
        });
        gasLimit = estimated * GAS_BUFFER_MULTIPLIER;
      } catch {
        gasLimit = FALLBACK_GAS;
      }
    }

    let hash: `0x${string}`;
    if (account.type === "local") {
      const nonce = await publicClient.getTransactionCount({address: account.address as ViemAddress});

      const txRequest = await publicClient.prepareTransactionRequest({
        account,
        to: options.to,
        data: options.data,
        value: options.value,
        type: "legacy",
        nonce,
        gas: gasLimit,
        chain: client.chain,
      });

      const signTransaction = account.signTransaction;
      if (!signTransaction) {
        throw new Error("Account does not support signing transactions");
      }
      const serializedTx = await signTransaction(txRequest as Parameters<typeof signTransaction>[0]);
      hash = await publicClient.sendRawTransaction({serializedTransaction: serializedTx});
    } else {
      // Address-only / injected-provider lane: the connected wallet manages
      // nonce and signing. Mirrors the proven IC provider lane in
      // src/contracts/actions.ts (~:2169-2178 and :2412-2422).
      let gasPrice: `0x${string}` | undefined;
      try {
        gasPrice = (await client.request({method: "eth_gasPrice"})) as `0x${string}`;
      } catch {
        // Best-effort: omit gasPrice and let the wallet choose it.
      }
      hash = (await client.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: account.address,
            to: options.to,
            data: options.data,
            value: options.value ? (`0x${options.value.toString(16)}` as `0x${string}`) : undefined,
            gas: `0x${gasLimit.toString(16)}` as `0x${string}`,
            type: "0x0",
            ...(gasPrice ? {gasPrice} : {}),
          },
        ],
      })) as `0x${string}`;
    }

    const receipt = await publicClient.waitForTransactionReceipt({hash});

    if (receipt.status === "reverted") {
      let revertReason = "Unknown reason";
      try {
        await publicClient.call({
          account,
          to: options.to,
          data: options.data,
          value: options.value,
          blockNumber: receipt.blockNumber,
        });
        const gasUsed = receipt.gasUsed;
        if (gasUsed >= gasLimit - 1000n) {
          revertReason = `Out of gas (used ${gasUsed}, limit ${gasLimit})`;
        } else {
          revertReason = `Unknown (simulation passes but tx reverts). Gas: ${gasUsed}/${gasLimit}`;
        }
      } catch (err: unknown) {
        revertReason = extractRevertReason(err);
      }
      throw new Error(`Transaction reverted: ${revertReason} (tx: ${hash})`);
    }

    return {
      transactionHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed,
    };
  };

  const readVesting = async <T>(vesting: Address, functionName: string, args: readonly unknown[] = []): Promise<T> => {
    return publicClient.readContract({
      address: vesting as ViemAddress,
      abi: VESTING_ABI,
      functionName,
      args,
    } as any) as Promise<T>;
  };

  const readFactory = async <T>(factory: Address, functionName: string, args: readonly unknown[] = []): Promise<T> => {
    return publicClient.readContract({
      address: factory as ViemAddress,
      abi: VESTING_FACTORY_ABI,
      functionName,
      args,
    } as any) as Promise<T>;
  };

  const getAddressManagerAddress = async (addressManager?: Address): Promise<Address> => {
    if (addressManager) return addressManager;

    const consensusMain = client.chain.consensusMainContract;
    if (!consensusMain?.address || consensusMain.address === zeroAddress) {
      throw new Error("Cannot discover VestingFactory without a consensus main contract or explicit addressManager.");
    }

    return publicClient.readContract({
      address: consensusMain.address as ViemAddress,
      abi: CONSENSUS_ADDRESS_MANAGER_ABI,
      functionName: "getAddressManager",
    }) as Promise<Address>;
  };

  const resolveVestingFactoryAddress = async (options?: VestingFactoryLookupOptions): Promise<Address> => {
    if (options?.factory) return options.factory;

    const addressManager = await getAddressManagerAddress(options?.addressManager);
    const factory = await publicClient.readContract({
      address: addressManager as ViemAddress,
      abi: ADDRESS_MANAGER_ABI,
      functionName: "getAddress",
      args: [VESTING_FACTORY_KEY],
    }) as Address;

    if (!factory || factory === zeroAddress) {
      throw new Error(`VestingFactory is not registered in AddressManager under key ${VESTING_FACTORY_KEY}.`);
    }
    return factory;
  };

  const getVestingContract = (vesting: Address): VestingContract => {
    return getContract({
      address: vesting as ViemAddress,
      abi: VESTING_ABI,
      client: {public: publicClient, wallet: client as unknown as WalletClientWithAccount},
    });
  };

  const getVestingFactoryContract = (factory: Address): VestingFactoryContract => {
    return getContract({
      address: factory as ViemAddress,
      abi: VESTING_FACTORY_ABI,
      client: publicClient,
    });
  };

  return {
    /** Delegates vesting-held tokens to a validator. Must be called by the vesting beneficiary. */
    vestingDelegatorJoin: async (options: VestingDelegatorJoinOptions): Promise<VestingDelegatorJoinResult> => {
      const amount = parseStakingAmount(options.amount);
      const data = encodeFunctionData({
        abi: VESTING_ABI,
        functionName: "vestingDelegatorJoin",
        args: [options.validator as ViemAddress, amount],
      });
      const result = await executeWrite({to: options.vesting as ViemAddress, data});

      return {
        ...result,
        vesting: options.vesting,
        validator: options.validator,
        beneficiary: client.account!.address as Address,
        amount: formatStakingAmount(amount),
        amountRaw: amount,
      };
    },

    /** Exits a vesting contract's delegation by burning shares. Must be called by the vesting beneficiary. */
    vestingDelegatorExit: async (options: VestingDelegatorExitOptions): Promise<VestingTransactionResult> => {
      const shares = parseExitShares(options.shares);
      const data = encodeFunctionData({
        abi: VESTING_ABI,
        functionName: "vestingDelegatorExit",
        args: [options.validator as ViemAddress, shares],
      });
      return executeWrite({to: options.vesting as ViemAddress, data});
    },

    /** Claims exited delegation funds back into the vesting contract. Must be called by the vesting beneficiary. */
    vestingDelegatorClaim: async (options: VestingDelegatorClaimOptions): Promise<VestingTransactionResult> => {
      const data = encodeFunctionData({
        abi: VESTING_ABI,
        functionName: "vestingDelegatorClaim",
        args: [options.validator as ViemAddress],
      });
      return executeWrite({to: options.vesting as ViemAddress, data});
    },

    /** Creates a validator wallet and self-stakes vesting-held tokens. Must be called by the vesting beneficiary. */
    vestingValidatorJoin: async (options: VestingValidatorJoinOptions): Promise<VestingValidatorJoinResult> => {
      const amount = parseStakingAmount(options.amount);
      const data = encodeFunctionData({
        abi: VESTING_ABI,
        functionName: "vestingValidatorJoin",
        args: [options.operator as ViemAddress, amount],
      });
      const result = await executeWrite({to: options.vesting as ViemAddress, data});

      return {
        ...result,
        vesting: options.vesting,
        operator: options.operator,
        beneficiary: client.account!.address as Address,
        amount: formatStakingAmount(amount),
        amountRaw: amount,
      };
    },

    /** Adds more vesting-held self-stake to one of the vesting's validator wallets. */
    vestingValidatorDeposit: async (options: VestingValidatorDepositOptions): Promise<VestingTransactionResult> => {
      const amount = parseStakingAmount(options.amount);
      const data = encodeFunctionData({
        abi: VESTING_ABI,
        functionName: "vestingValidatorDeposit",
        args: [options.wallet as ViemAddress, amount],
      });
      return executeWrite({to: options.vesting as ViemAddress, data});
    },

    /** Exits validator self-stake by burning shares from a vesting-owned validator wallet. */
    vestingValidatorExit: async (options: VestingValidatorExitOptions): Promise<VestingTransactionResult> => {
      const shares = parseExitShares(options.shares);
      const data = encodeFunctionData({
        abi: VESTING_ABI,
        functionName: "vestingValidatorExit",
        args: [options.wallet as ViemAddress, shares],
      });
      return executeWrite({to: options.vesting as ViemAddress, data});
    },

    /** Claims exited validator self-stake back into the vesting contract. */
    vestingValidatorClaim: async (options: VestingValidatorClaimOptions): Promise<VestingTransactionResult> => {
      const data = encodeFunctionData({
        abi: VESTING_ABI,
        functionName: "vestingValidatorClaim",
        args: [options.wallet as ViemAddress],
      });
      return executeWrite({to: options.vesting as ViemAddress, data});
    },

    /** Begins a two-step operator transfer for a vesting-owned validator wallet. */
    vestingValidatorInitiateOperatorTransfer: async (options: VestingValidatorInitiateOperatorTransferOptions): Promise<VestingTransactionResult> => {
      const data = encodeFunctionData({
        abi: VESTING_ABI,
        functionName: "vestingValidatorInitiateOperatorTransfer",
        args: [options.wallet as ViemAddress, options.newOperator as ViemAddress],
      });
      return executeWrite({to: options.vesting as ViemAddress, data});
    },

    /** Completes a pending operator transfer for a vesting-owned validator wallet. */
    vestingValidatorCompleteOperatorTransfer: async (options: VestingValidatorWalletOptions): Promise<VestingTransactionResult> => {
      const data = encodeFunctionData({
        abi: VESTING_ABI,
        functionName: "vestingValidatorCompleteOperatorTransfer",
        args: [options.wallet as ViemAddress],
      });
      return executeWrite({to: options.vesting as ViemAddress, data});
    },

    /** Cancels a pending operator transfer for a vesting-owned validator wallet. */
    vestingValidatorCancelOperatorTransfer: async (options: VestingValidatorWalletOptions): Promise<VestingTransactionResult> => {
      const data = encodeFunctionData({
        abi: VESTING_ABI,
        functionName: "vestingValidatorCancelOperatorTransfer",
        args: [options.wallet as ViemAddress],
      });
      return executeWrite({to: options.vesting as ViemAddress, data});
    },

    /** Sets validator identity metadata on a vesting-owned validator wallet. */
    vestingValidatorSetIdentity: async (options: VestingValidatorSetIdentityOptions): Promise<VestingTransactionResult> => {
      const data = encodeFunctionData({
        abi: VESTING_ABI,
        functionName: "vestingValidatorSetIdentity",
        args: [
          options.wallet as ViemAddress,
          options.moniker,
          options.logoUri || "",
          options.website || "",
          options.description || "",
          options.email || "",
          options.twitter || "",
          options.telegram || "",
          options.github || "",
          encodeExtraCid(options.extraCid),
        ],
      });
      return executeWrite({to: options.vesting as ViemAddress, data});
    },

    /** Withdraws vested tokens to the beneficiary. Must be called by the vesting beneficiary. */
    vestingWithdraw: async (options: VestingWithdrawOptions): Promise<VestingWithdrawResult> => {
      const amount = parseStakingAmount(options.amount);
      const data = encodeFunctionData({
        abi: VESTING_ABI,
        functionName: "vestingWithdraw",
        args: [amount],
      });
      const result = await executeWrite({to: options.vesting as ViemAddress, data});

      return {
        ...result,
        vesting: options.vesting,
        beneficiary: client.account!.address as Address,
        amount: formatStakingAmount(amount),
        amountRaw: amount,
      };
    },

    /** Resolves VestingFactory from AddressManager key "VestingFactory". */
    getVestingFactoryAddress: async (options?: Omit<VestingFactoryLookupOptions, "factory">): Promise<Address> => {
      return resolveVestingFactoryAddress(options);
    },

    /** Returns the Vesting contract for a beneficiary, or null when none is registered. */
    getVestingForBeneficiary: async (beneficiary: Address, options?: VestingFactoryLookupOptions): Promise<Address | null> => {
      const factory = await resolveVestingFactoryAddress(options);
      const vesting = await readFactory<Address>(factory, "getVesting", [beneficiary as ViemAddress]);
      return vesting === zeroAddress ? null : vesting;
    },

    /** Returns the beneficiary's vesting contracts. v0.6-dev permits one vesting per beneficiary. */
    getBeneficiaryVestings: async (beneficiary: Address, options?: VestingFactoryLookupOptions): Promise<Address[]> => {
      const vesting = await resolveVestingFactoryAddress(options).then(factory => readFactory<Address>(factory, "getVesting", [beneficiary as ViemAddress]));
      return vesting === zeroAddress ? [] : [vesting];
    },

    /** Checks whether an address is registered as a Vesting contract by the factory. */
    isVestingAddress: async (address: Address, options?: VestingFactoryLookupOptions): Promise<boolean> => {
      const factory = await resolveVestingFactoryAddress(options);
      return readFactory<boolean>(factory, "isVestingAddress", [address as ViemAddress]);
    },

    getVestingContract,
    getVestingFactoryContract,

    vestedAmount: (vesting: Address): Promise<bigint> => readVesting<bigint>(vesting, "vestedAmount"),
    unvestedAmount: (vesting: Address): Promise<bigint> => readVesting<bigint>(vesting, "unvestedAmount"),
    withdrawableAmount: (vesting: Address): Promise<bigint> => readVesting<bigint>(vesting, "withdrawableAmount"),

    getVestingSchedule: async (vesting: Address): Promise<VestingSchedule> => {
      const [startDate, cliffDuration, periodDuration, numberOfPeriods, cliffUnlockBps, needsManualUnlock] = await Promise.all([
        readVesting<bigint>(vesting, "startDate"),
        readVesting<bigint>(vesting, "cliffDuration"),
        readVesting<bigint>(vesting, "periodDuration"),
        readVesting<bigint>(vesting, "numberOfPeriods"),
        readVesting<bigint>(vesting, "cliffUnlockBps"),
        readVesting<boolean>(vesting, "needsManualUnlock"),
      ]);

      return {startDate, cliffDuration, periodDuration, numberOfPeriods, cliffUnlockBps, needsManualUnlock};
    },

    getVestingState: async (vesting: Address): Promise<VestingState> => {
      const [
        name,
        category,
        beneficiary,
        creator,
        revoker,
        factory,
        addressManager,
        totalAmount,
        startDate,
        cliffDuration,
        periodDuration,
        numberOfPeriods,
        cliffUnlockBps,
        needsManualUnlock,
        manualUnlocked,
        revoked,
        vestingStopped,
        totalWithdrawn,
        vestedAtRevocation,
        totalAmountAtRevocation,
        revokedAt,
        vestingStoppedAt,
        vestedAtStop,
        postRevocationBeneficiaryRewards,
        postRevocationBeneficiaryLosses,
        accumulatedRewards,
        accumulatedLosses,
        vested,
        unvested,
        withdrawable,
      ] = await Promise.all([
        readVesting<string>(vesting, "name"),
        readVesting<VestingCategory>(vesting, "category"),
        readVesting<Address>(vesting, "beneficiary"),
        readVesting<Address>(vesting, "creator"),
        readVesting<Address>(vesting, "revoker"),
        readVesting<Address>(vesting, "factory"),
        readVesting<Address>(vesting, "addressManager"),
        readVesting<bigint>(vesting, "totalAmount"),
        readVesting<bigint>(vesting, "startDate"),
        readVesting<bigint>(vesting, "cliffDuration"),
        readVesting<bigint>(vesting, "periodDuration"),
        readVesting<bigint>(vesting, "numberOfPeriods"),
        readVesting<bigint>(vesting, "cliffUnlockBps"),
        readVesting<boolean>(vesting, "needsManualUnlock"),
        readVesting<boolean>(vesting, "manualUnlocked"),
        readVesting<boolean>(vesting, "revoked"),
        readVesting<boolean>(vesting, "vestingStopped"),
        readVesting<bigint>(vesting, "totalWithdrawn"),
        readVesting<bigint>(vesting, "vestedAtRevocation"),
        readVesting<bigint>(vesting, "totalAmountAtRevocation"),
        readVesting<bigint>(vesting, "revokedAt"),
        readVesting<bigint>(vesting, "vestingStoppedAt"),
        readVesting<bigint>(vesting, "vestedAtStop"),
        readVesting<bigint>(vesting, "postRevocationBeneficiaryRewards"),
        readVesting<bigint>(vesting, "postRevocationBeneficiaryLosses"),
        readVesting<bigint>(vesting, "accumulatedRewards"),
        readVesting<bigint>(vesting, "accumulatedLosses"),
        readVesting<bigint>(vesting, "vestedAmount"),
        readVesting<bigint>(vesting, "unvestedAmount"),
        readVesting<bigint>(vesting, "withdrawableAmount"),
      ]);

      return {
        name,
        category,
        beneficiary,
        creator,
        revoker,
        factory,
        addressManager,
        totalAmount: formatStakingAmount(totalAmount),
        totalAmountRaw: totalAmount,
        startDate,
        cliffDuration,
        periodDuration,
        numberOfPeriods,
        cliffUnlockBps,
        needsManualUnlock,
        manualUnlocked,
        revoked,
        vestingStopped,
        totalWithdrawn: formatStakingAmount(totalWithdrawn),
        totalWithdrawnRaw: totalWithdrawn,
        vestedAtRevocation: formatStakingAmount(vestedAtRevocation),
        vestedAtRevocationRaw: vestedAtRevocation,
        totalAmountAtRevocation: formatStakingAmount(totalAmountAtRevocation),
        totalAmountAtRevocationRaw: totalAmountAtRevocation,
        revokedAt,
        vestingStoppedAt,
        vestedAtStop: formatStakingAmount(vestedAtStop),
        vestedAtStopRaw: vestedAtStop,
        postRevocationBeneficiaryRewards: formatStakingAmount(postRevocationBeneficiaryRewards),
        postRevocationBeneficiaryRewardsRaw: postRevocationBeneficiaryRewards,
        postRevocationBeneficiaryLosses: formatStakingAmount(postRevocationBeneficiaryLosses),
        postRevocationBeneficiaryLossesRaw: postRevocationBeneficiaryLosses,
        accumulatedRewards: formatStakingAmount(accumulatedRewards),
        accumulatedRewardsRaw: accumulatedRewards,
        accumulatedLosses: formatStakingAmount(accumulatedLosses),
        accumulatedLossesRaw: accumulatedLosses,
        vestedAmount: formatStakingAmount(vested),
        vestedAmountRaw: vested,
        unvestedAmount: formatStakingAmount(unvested),
        unvestedAmountRaw: unvested,
        withdrawableAmount: formatStakingAmount(withdrawable),
        withdrawableAmountRaw: withdrawable,
      };
    },

    vestingName: (vesting: Address): Promise<string> => readVesting<string>(vesting, "name"),
    vestingCategory: (vesting: Address): Promise<VestingCategory> => readVesting<VestingCategory>(vesting, "category"),
    vestingBeneficiary: (vesting: Address): Promise<Address> => readVesting<Address>(vesting, "beneficiary"),
    vestingCreator: (vesting: Address): Promise<Address> => readVesting<Address>(vesting, "creator"),
    vestingRevoker: (vesting: Address): Promise<Address> => readVesting<Address>(vesting, "revoker"),
    vestingFactory: (vesting: Address): Promise<Address> => readVesting<Address>(vesting, "factory"),
    vestingAddressManager: (vesting: Address): Promise<Address> => readVesting<Address>(vesting, "addressManager"),
    vestingTotalAmount: (vesting: Address): Promise<bigint> => readVesting<bigint>(vesting, "totalAmount"),
    vestingStartDate: (vesting: Address): Promise<bigint> => readVesting<bigint>(vesting, "startDate"),
    vestingCliffDuration: (vesting: Address): Promise<bigint> => readVesting<bigint>(vesting, "cliffDuration"),
    vestingPeriodDuration: (vesting: Address): Promise<bigint> => readVesting<bigint>(vesting, "periodDuration"),
    vestingNumberOfPeriods: (vesting: Address): Promise<bigint> => readVesting<bigint>(vesting, "numberOfPeriods"),
    vestingCliffUnlockBps: (vesting: Address): Promise<bigint> => readVesting<bigint>(vesting, "cliffUnlockBps"),
    vestingNeedsManualUnlock: (vesting: Address): Promise<boolean> => readVesting<boolean>(vesting, "needsManualUnlock"),
    vestingManualUnlocked: (vesting: Address): Promise<boolean> => readVesting<boolean>(vesting, "manualUnlocked"),
    vestingRevoked: (vesting: Address): Promise<boolean> => readVesting<boolean>(vesting, "revoked"),
    vestingStopped: (vesting: Address): Promise<boolean> => readVesting<boolean>(vesting, "vestingStopped"),
    vestingTotalWithdrawn: (vesting: Address): Promise<bigint> => readVesting<bigint>(vesting, "totalWithdrawn"),
    vestingVestedAtRevocation: (vesting: Address): Promise<bigint> => readVesting<bigint>(vesting, "vestedAtRevocation"),
    vestingTotalAmountAtRevocation: (vesting: Address): Promise<bigint> => readVesting<bigint>(vesting, "totalAmountAtRevocation"),
    vestingRevokedAt: (vesting: Address): Promise<bigint> => readVesting<bigint>(vesting, "revokedAt"),
    vestingStoppedAt: (vesting: Address): Promise<bigint> => readVesting<bigint>(vesting, "vestingStoppedAt"),
    vestingVestedAtStop: (vesting: Address): Promise<bigint> => readVesting<bigint>(vesting, "vestedAtStop"),
    vestingPostRevocationBeneficiaryRewards: (vesting: Address): Promise<bigint> => readVesting<bigint>(vesting, "postRevocationBeneficiaryRewards"),
    vestingPostRevocationBeneficiaryLosses: (vesting: Address): Promise<bigint> => readVesting<bigint>(vesting, "postRevocationBeneficiaryLosses"),
    vestingDepositedPerValidator: (vesting: Address, validator: Address): Promise<bigint> => readVesting<bigint>(vesting, "depositedPerValidator", [validator as ViemAddress]),
    vestingPendingExitDeposited: (vesting: Address, validator: Address): Promise<bigint> => readVesting<bigint>(vesting, "pendingExitDeposited", [validator as ViemAddress]),
    getValidatorWallets: (vesting: Address): Promise<Address[]> => readVesting<Address[]>(vesting, "getValidatorWallets"),
    validatorWalletCount: (vesting: Address): Promise<bigint> => readVesting<bigint>(vesting, "validatorWalletCount"),
    validatorDeposited: (vesting: Address, wallet: Address): Promise<bigint> => readVesting<bigint>(vesting, "validatorDeposited", [wallet as ViemAddress]),
    isValidatorWallet: (vesting: Address, wallet: Address): Promise<boolean> => readVesting<boolean>(vesting, "isValidatorWallet", [wallet as ViemAddress]),
    vestingAccumulatedRewards: (vesting: Address): Promise<bigint> => readVesting<bigint>(vesting, "accumulatedRewards"),
    vestingAccumulatedLosses: (vesting: Address): Promise<bigint> => readVesting<bigint>(vesting, "accumulatedLosses"),
  };
};
