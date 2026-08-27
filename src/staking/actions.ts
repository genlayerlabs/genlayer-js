import {getContract, decodeEventLog, PublicClient, Client, Transport, Chain, Account, Address as ViemAddress, GetContractReturnType, toHex, encodeFunctionData, BaseError, ContractFunctionRevertedError, decodeErrorResult, RawContractError, zeroAddress} from "viem";
import {GenLayerClient, GenLayerChain, Address} from "@/types";
import {STAKING_ABI, VALIDATOR_WALLET_ABI} from "@/abi/staking";
import {ADDRESS_MANAGER_ABI, CONSENSUS_ADDRESS_MANAGER_ABI} from "@/abi/vesting";
import {parseStakingAmount, formatStakingAmount} from "./utils";

// The joined validator registry is only readable in slices: committee capacity
// is 1,543 and an address[] that long overruns the return-size limit. 64 is the
// size the paged reads are written around, and the one genlayer-node uses for
// the same walk.
const VALIDATORS_JOINED_PAGE_SIZE = 64n;
import {operatorAddressFromPublicKey, verifyOperatorRegistration} from "@/vesting/operatorRegistration";
import {
  ValidatorInfo,
  ValidatorIdentity,
  BannedValidatorInfo,
  StakeInfo,
  EpochInfo,
  EpochData,
  StakingTransactionResult,
  ValidatorJoinResult,
  DelegatorJoinResult,
  ValidatorJoinOptions,
  ValidatorDepositOptions,
  ValidatorExitOptions,
  ValidatorClaimOptions,
  ValidatorPrimeOptions,
  SetOperatorOptions,
  InitiateOperatorTransferOptions,
  CompleteOperatorTransferOptions,
  CancelOperatorTransferOptions,
  PendingOperatorInfo,
  SetIdentityOptions,
  DelegatorJoinOptions,
  DelegatorExitOptions,
  DelegatorClaimOptions,
  StakingContract,
  PendingDeposit,
  PendingWithdrawal,
} from "@/types/staking";
import type {OperatorRegistrationContext} from "@/types/vesting";

type ReadOnlyStakingContract = GetContractReturnType<typeof STAKING_ABI, PublicClient, ViemAddress>;
type WalletClientWithAccount = Client<Transport, Chain, Account>;

const FALLBACK_GAS = 1000000n;
const GAS_BUFFER_MULTIPLIER = 2n;
const VALIDATOR_WALLET_FACTORY_KEY = "ValidatorWalletFactory";

// Combined ABI for error decoding (both staking and validator wallet errors)
const COMBINED_ERROR_ABI = [...STAKING_ABI, ...VALIDATOR_WALLET_ABI];

function extractRevertReason(err: unknown): string {
  if (err instanceof BaseError) {
    // Try to find raw error data and decode it with our ABI
    const rawError = err.walk((e) => e instanceof RawContractError);
    if (rawError instanceof RawContractError && rawError.data && typeof rawError.data === "string") {
      try {
        const decoded = decodeErrorResult({
          abi: COMBINED_ERROR_ABI,
          data: rawError.data as `0x${string}`,
        });
        return decoded.errorName;
      } catch {
        // Fall through to other methods
      }
    }

    // Try to extract error data from the cause chain
    let current: unknown = err;
    while (current) {
      if (current && typeof current === "object") {
        const obj = current as Record<string, unknown>;
        // Check for data property that looks like hex error data
        if (obj.data && typeof obj.data === "string" && obj.data.startsWith("0x")) {
          try {
            const decoded = decodeErrorResult({
              abi: COMBINED_ERROR_ABI,
              data: obj.data as `0x${string}`,
            });
            return decoded.errorName;
          } catch {
            // Continue searching
          }
        }
        current = obj.cause;
      } else {
        break;
      }
    }

    const revertError = err.walk((e) => e instanceof ContractFunctionRevertedError);
    if (revertError instanceof ContractFunctionRevertedError) {
      // If viem already decoded it, use that
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

export const stakingActions = (
  client: GenLayerClient<GenLayerChain>,
  publicClient: PublicClient,
) => {
  const executeWrite = async (options: {
    to: ViemAddress;
    data: `0x${string}`;
    value?: bigint;
    gas?: bigint;
  }): Promise<StakingTransactionResult> => {
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

  const getStakingAddress = (): ViemAddress => {
    const stakingConfig = client.chain.stakingContract;
    if (!stakingConfig?.address || stakingConfig.address === "0x0000000000000000000000000000000000000000") {
      throw new Error("Staking is not supported on studio-based networks. Use testnet-asimov for staking operations.");
    }
    return stakingConfig.address as ViemAddress;
  };

  /** Returns the underlying staking contract instance for direct interactions. */
  const getStakingContract = (): StakingContract => {
    const address = getStakingAddress();
    return getContract({
      address,
      abi: STAKING_ABI,
      client: {public: publicClient, wallet: client as unknown as WalletClientWithAccount},
    });
  };

  const getReadOnlyStakingContract = (): ReadOnlyStakingContract => {
    const address = getStakingAddress();
    return getContract({
      address,
      abi: STAKING_ABI,
      client: publicClient,
    });
  };

  const getValidatorRegistrationContext = async () => {
    if (!client.account) {
      throw new Error("Account is required to resolve validator registration context.");
    }

    const consensusMain = client.chain.consensusMainContract;
    if (!consensusMain?.address || consensusMain.address === zeroAddress) {
      throw new Error("Cannot resolve ValidatorWalletFactory without a consensus main contract.");
    }

    const [addressManager, chainId] = await Promise.all([
      publicClient.readContract({
        address: consensusMain.address as ViemAddress,
        abi: CONSENSUS_ADDRESS_MANAGER_ABI,
        functionName: "getAddressManager",
      }) as Promise<Address>,
      publicClient.getChainId(),
    ]);
    const registrar = await publicClient.readContract({
      address: addressManager as ViemAddress,
      abi: ADDRESS_MANAGER_ABI,
      functionName: "getAddress",
      args: [VALIDATOR_WALLET_FACTORY_KEY],
    }) as Address;

    if (!registrar || registrar === zeroAddress) {
      throw new Error(
        `ValidatorWalletFactory is not registered in AddressManager under key ${VALIDATOR_WALLET_FACTORY_KEY}.`,
      );
    }

    return {
      registrar,
      owner: client.account.address as Address,
      chainId: BigInt(chainId),
    };
  };

  /**
   * Rotation is verified by the wallet, not the factory, so the registrar is the
   * wallet's own address. The owner is read from the wallet rather than assumed
   * to be the caller: the proof is bound to whoever `owner()` returns, and a
   * mismatch is far easier to diagnose here than as an onlyOwner revert.
   */
  const getOperatorTransferContext = async (validator: Address): Promise<OperatorRegistrationContext> => {
    const [owner, chainId] = await Promise.all([
      publicClient.readContract({
        address: validator as ViemAddress,
        abi: VALIDATOR_WALLET_ABI,
        functionName: "owner",
      }) as Promise<Address>,
      publicClient.getChainId(),
    ]);

    return {
      registrar: validator,
      owner,
      chainId: BigInt(chainId),
    };
  };

  return {
    /** Joins as a validator with the specified stake amount. */
    validatorJoin: async (options: ValidatorJoinOptions): Promise<ValidatorJoinResult> => {
      const amount = parseStakingAmount(options.amount);
      const stakingAddress = getStakingAddress();
      const context = await getValidatorRegistrationContext();
      if (!await verifyOperatorRegistration(options.registration, context)) {
        throw new Error("Operator registration proof does not match the owner, registrar, chain, or public key.");
      }
      const operator = operatorAddressFromPublicKey(options.registration.operatorPubKey);
      const data = encodeFunctionData({
        abi: STAKING_ABI,
        functionName: "validatorJoin",
        args: [options.registration.operatorPubKey, options.registration.possessionProof],
      });

      const result = await executeWrite({to: stakingAddress, data, value: amount});
      const receipt = await publicClient.getTransactionReceipt({hash: result.transactionHash});

      let validatorWallet: Address | undefined;
      let eventFound = false;
      for (const log of receipt.logs) {
        try {
          const decoded = decodeEventLog({abi: STAKING_ABI, data: log.data, topics: log.topics});
          if (decoded.eventName === "ValidatorJoin") {
            validatorWallet = (decoded.args as {validator: Address}).validator;
            eventFound = true;
            break;
          }
        } catch {
          // Not a ValidatorJoin event - continue searching
        }
      }

      if (!eventFound) {
        throw new Error(
          `ValidatorJoin event not found in transaction ${result.transactionHash}. ` +
            `Transaction succeeded but validator wallet address could not be determined.`,
        );
      }

      return {
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed,
        validatorWallet: validatorWallet!,
        operator,
        amount: formatStakingAmount(amount),
        amountRaw: amount,
      };
    },
    /** Resolves the registrar, owner, and chain binding required to create an operator proof. */
    getValidatorRegistrationContext,

    /**
     * Adds additional self-stake to an active validator position. The
     * underlying Staking contract requires msg.sender == ValidatorWallet,
     * so the call is routed through the wallet's own validatorDeposit
     * forwarder (which re-enters Staking with the correct sender).
     */
    validatorDeposit: async (options: ValidatorDepositOptions): Promise<StakingTransactionResult> => {
      const amount = parseStakingAmount(options.amount);
      const data = encodeFunctionData({
        abi: VALIDATOR_WALLET_ABI,
        functionName: "validatorDeposit",
      });
      return executeWrite({to: options.validator as ViemAddress, data, value: amount});
    },

    /**
     * Exits a validator position by burning the specified shares. Same
     * msg.sender constraint as validatorDeposit — routed via the wallet.
     */
    validatorExit: async (options: ValidatorExitOptions): Promise<StakingTransactionResult> => {
      const shares = typeof options.shares === "string" ? BigInt(options.shares) : options.shares;
      const data = encodeFunctionData({
        abi: VALIDATOR_WALLET_ABI,
        functionName: "validatorExit",
        args: [shares],
      });
      return executeWrite({to: options.validator as ViemAddress, data});
    },

    /** Claims pending validator withdrawals. */
    validatorClaim: async (options?: ValidatorClaimOptions): Promise<StakingTransactionResult & {claimedAmount: bigint}> => {
      if (!options?.validator && !client.account) {
        throw new Error("Either provide validator address or initialize client with an account");
      }
      const validatorAddress = options?.validator || (client.account!.address as Address);
      const data = encodeFunctionData({
        abi: STAKING_ABI,
        functionName: "validatorClaim",
        args: [validatorAddress as ViemAddress],
      });
      const result = await executeWrite({to: getStakingAddress(), data});
      // TODO: Parse ClaimAmount from logs if needed
      return {...result, claimedAmount: 0n};
    },

    /** Primes a validator for participation in the next epoch. */
    validatorPrime: async (options: ValidatorPrimeOptions): Promise<StakingTransactionResult> => {
      const data = encodeFunctionData({
        abi: STAKING_ABI,
        functionName: "validatorPrime",
        args: [options.validator as ViemAddress],
      });
      return executeWrite({to: getStakingAddress(), data});
    },

    /** @deprecated Use initiateOperatorTransfer followed by completeOperatorTransfer. */
    setOperator: async (options: SetOperatorOptions): Promise<StakingTransactionResult> => {
      throw new Error(
        `setOperator cannot rotate ${options.validator} to ${options.operator} on the train: ` +
          "create an operator possession proof, then call initiateOperatorTransfer and completeOperatorTransfer.",
      );
    },

    getOperatorTransferContext,

    /**
     * Starts the two-step operator rotation. The proof is checked against the
     * wallet-bound context before submission so a registration built for the
     * wrong registrar fails locally instead of as an opaque on-chain revert.
     */
    initiateOperatorTransfer: async (
      options: InitiateOperatorTransferOptions,
    ): Promise<StakingTransactionResult> => {
      const context = await getOperatorTransferContext(options.validator);
      if (!await verifyOperatorRegistration(options.registration, context)) {
        throw new Error(
          "Operator registration proof does not match the wallet, owner, chain, or public key. " +
            "Rotation proofs must use the validator wallet as their registrar.",
        );
      }
      const data = encodeFunctionData({
        abi: VALIDATOR_WALLET_ABI,
        functionName: "initiateOperatorTransfer",
        args: [options.registration.operatorPubKey, options.registration.possessionProof],
      });
      return executeWrite({to: options.validator as ViemAddress, data});
    },

    /**
     * Completes a pending rotation. Callable by the wallet owner or the pending
     * operator, and only once the factory's operatorTransferDelay has elapsed.
     */
    completeOperatorTransfer: async (
      options: CompleteOperatorTransferOptions,
    ): Promise<StakingTransactionResult> => {
      const data = encodeFunctionData({
        abi: VALIDATOR_WALLET_ABI,
        functionName: "completeOperatorTransfer",
        args: [],
      });
      return executeWrite({to: options.validator as ViemAddress, data});
    },

    /** Abandons a pending rotation, leaving the current operator in place. */
    cancelOperatorTransfer: async (
      options: CancelOperatorTransferOptions,
    ): Promise<StakingTransactionResult> => {
      const data = encodeFunctionData({
        abi: VALIDATOR_WALLET_ABI,
        functionName: "cancelOperatorTransfer",
        args: [],
      });
      return executeWrite({to: options.validator as ViemAddress, data});
    },

    /** Reads the pending operator and when its transfer was initiated. */
    getPendingOperator: async (validator: Address): Promise<PendingOperatorInfo> => {
      const [operator, initiatedAt] = await publicClient.readContract({
        address: validator as ViemAddress,
        abi: VALIDATOR_WALLET_ABI,
        functionName: "getPendingOperator",
      }) as [Address, bigint];

      return {operator, initiatedAt};
    },

    /** Sets validator identity information (name, website, social links). */
    setIdentity: async (options: SetIdentityOptions): Promise<StakingTransactionResult> => {
      let extraCidBytes: `0x${string}` = "0x";
      if (options.extraCid) {
        if (options.extraCid.startsWith("0x")) {
          extraCidBytes = options.extraCid as `0x${string}`;
        } else {
          extraCidBytes = toHex(new TextEncoder().encode(options.extraCid));
        }
      }
      const data = encodeFunctionData({
        abi: VALIDATOR_WALLET_ABI,
        functionName: "setIdentity",
        args: [
          options.moniker,
          options.logoUri || "",
          options.website || "",
          options.description || "",
          options.email || "",
          options.twitter || "",
          options.telegram || "",
          options.github || "",
          extraCidBytes,
        ],
      });
      return executeWrite({to: options.validator as ViemAddress, data});
    },

    /** Delegates stake to a validator. */
    delegatorJoin: async (options: DelegatorJoinOptions): Promise<DelegatorJoinResult> => {
      const amount = parseStakingAmount(options.amount);
      const data = encodeFunctionData({
        abi: STAKING_ABI,
        functionName: "delegatorJoin",
        args: [options.validator as ViemAddress],
      });
      const result = await executeWrite({to: getStakingAddress(), data, value: amount});

      return {
        ...result,
        validator: options.validator,
        delegator: client.account!.address as Address,
        amount: formatStakingAmount(amount),
        amountRaw: amount,
      };
    },

    /** Exits a delegation by burning the specified shares. */
    delegatorExit: async (options: DelegatorExitOptions): Promise<StakingTransactionResult> => {
      const shares = typeof options.shares === "string" ? BigInt(options.shares) : options.shares;
      const data = encodeFunctionData({
        abi: STAKING_ABI,
        functionName: "delegatorExit",
        args: [options.validator as ViemAddress, shares],
      });
      return executeWrite({to: getStakingAddress(), data});
    },

    /** Claims pending delegator withdrawals. */
    delegatorClaim: async (options: DelegatorClaimOptions): Promise<StakingTransactionResult> => {
      if (!options.delegator && !client.account) {
        throw new Error("Either provide delegator address or initialize client with an account");
      }
      const delegatorAddress = options.delegator || (client.account!.address as Address);
      const data = encodeFunctionData({
        abi: STAKING_ABI,
        functionName: "delegatorClaim",
        args: [delegatorAddress as ViemAddress, options.validator as ViemAddress],
      });
      return executeWrite({to: getStakingAddress(), data});
    },

    /** Checks whether an address is a registered/joined validator wallet. */
    isValidator: async (address: Address): Promise<boolean> => {
      const contract = getReadOnlyStakingContract();
      return contract.read.isValidator([address as ViemAddress]) as Promise<boolean>;
    },

    /** Returns comprehensive information about a validator including stake, identity, and status. */
    getValidatorInfo: async (validator: Address): Promise<ValidatorInfo> => {
      const contract = getReadOnlyStakingContract();

      const isVal = await contract.read.isValidator([validator as ViemAddress]);
      if (!isVal) {
        throw new Error(`Address ${validator} is not a validator`);
      }

      // Get validator wallet contract for owner/operator/identity
      const walletContract = getContract({
        address: validator as ViemAddress,
        abi: VALIDATOR_WALLET_ABI,
        client: publicClient,
      });

      // Fetch all data in parallel
      const [view, owner, operator, identityRaw, currentEpoch, validatorMinStake, banned] = await Promise.all([
        contract.read.validatorView([validator as ViemAddress]) as Promise<any>,
        walletContract.read.owner() as Promise<Address>,
        walletContract.read.operator() as Promise<Address>,
        walletContract.read.getIdentity().catch(() => null) as Promise<any>,
        contract.read.epoch() as Promise<bigint>,
        contract.read.validatorMinStake() as Promise<bigint>,
        contract.read.isValidatorBanned([validator as ViemAddress]) as Promise<boolean>,
      ]);

      // Parse identity if available
      let identity: ValidatorIdentity | undefined;
      if (identityRaw && identityRaw.moniker) {
        identity = {
          moniker: identityRaw.moniker,
          logoUri: identityRaw.logoUri,
          website: identityRaw.website,
          description: identityRaw.description,
          email: identityRaw.email,
          twitter: identityRaw.twitter,
          telegram: identityRaw.telegram,
          github: identityRaw.github,
          extraCid: identityRaw.extraCid ? toHex(identityRaw.extraCid) : "",
        };
      }

      // Validator needs priming if ePrimed < currentEpoch - 1
      const needsPriming = currentEpoch > 0n && view.ePrimed < currentEpoch - 1n;

      // Fetch pending self-stake deposits
      const depositLen = (await contract.read.validatorDepositLen([validator as ViemAddress])) as bigint;
      const pendingDeposits: PendingDeposit[] = [];

      for (let i = 0n; i < depositLen; i++) {
        const [epoch, commit] = await contract.read.validatorDeposit([validator as ViemAddress, i]);
        pendingDeposits.push({
          epoch,
          stake: formatStakingAmount(commit.input),
          stakeRaw: commit.input,
          shares: commit.output,
        });
      }

      // Fetch pending self-stake withdrawals
      const withdrawalLen = (await contract.read.validatorWithdrawalLen([validator as ViemAddress])) as bigint;
      const pendingWithdrawals: PendingWithdrawal[] = [];

      for (let i = 0n; i < withdrawalLen; i++) {
        const [epoch, commit] = await contract.read.validatorWithdrawal([validator as ViemAddress, i]);
        pendingWithdrawals.push({
          epoch,
          shares: commit.input,
          stake: formatStakingAmount(commit.output),
          stakeRaw: commit.output,
        });
      }

      return {
        address: validator,
        owner,
        operator,
        vStake: formatStakingAmount(view.vStake),
        vStakeRaw: view.vStake,
        vShares: view.vShares,
        dStake: formatStakingAmount(view.dStake),
        dStakeRaw: view.dStake,
        dShares: view.dShares,
        vDeposit: formatStakingAmount(view.vDeposit),
        vDepositRaw: view.vDeposit,
        vWithdrawal: formatStakingAmount(view.vWithdrawal),
        vWithdrawalRaw: view.vWithdrawal,
        ePrimed: view.ePrimed,
        live: view.live,
        banned,
        bannedEpoch: banned ? view.eBanned : undefined,
        needsPriming,
        currentEpoch,
        validatorMinStake: formatStakingAmount(validatorMinStake),
        validatorMinStakeRaw: validatorMinStake,
        belowMin: view.vStake < validatorMinStake,
        identity,
        pendingDeposits,
        pendingWithdrawals,
      };
    },

    /** Returns the current epoch number. */
    getCurrentEpoch: async (): Promise<bigint> => {
      const contract = getReadOnlyStakingContract();
      return (await contract.read.epoch()) as bigint;
    },

    /** Checks whether a validator's self-stake is below the configured validator minimum. */
    isValidatorBelowMin: async (validator: Address): Promise<boolean> => {
      const contract = getReadOnlyStakingContract();
      const [view, minStake] = await Promise.all([
        contract.read.validatorView([validator as ViemAddress]) as Promise<{vStake: bigint}>,
        contract.read.validatorMinStake() as Promise<bigint>,
      ]);
      return view.vStake < minStake;
    },

    /** Returns delegation stake information for a delegator-validator pair. */
    getStakeInfo: async (delegator: Address, validator: Address): Promise<StakeInfo> => {
      const contract = getReadOnlyStakingContract();

      const shares = (await contract.read.sharesOf([delegator as ViemAddress, validator as ViemAddress])) as bigint;
      // stakeOf divides by shares, so it fails with division by zero if no shares yet
      let stake = 0n;
      if (shares > 0n) {
        stake = (await contract.read.stakeOf([delegator as ViemAddress, validator as ViemAddress])) as bigint;
      }

      // Fetch pending delegator deposits
      const depositLen = (await contract.read.delegatorDepositLen([
        delegator as ViemAddress,
        validator as ViemAddress,
      ])) as bigint;
      const pendingDeposits: PendingDeposit[] = [];

      for (let i = 0n; i < depositLen; i++) {
        const [claim, commit] = await contract.read.delegatorDeposit([
          delegator as ViemAddress,
          validator as ViemAddress,
          i,
        ]);
        pendingDeposits.push({
          epoch: commit.epoch,
          stake: formatStakingAmount(commit.input),
          stakeRaw: commit.input,
          shares: claim.quantity,
        });
      }

      // Fetch pending delegator withdrawals
      const withdrawalLen = (await contract.read.delegatorWithdrawalLen([
        delegator as ViemAddress,
        validator as ViemAddress,
      ])) as bigint;
      const pendingWithdrawals: PendingWithdrawal[] = [];

      for (let i = 0n; i < withdrawalLen; i++) {
        const [claim, commit] = await contract.read.delegatorWithdrawal([
          delegator as ViemAddress,
          validator as ViemAddress,
          i,
        ]);
        pendingWithdrawals.push({
          epoch: commit.epoch,
          shares: claim.quantity,
          stake: formatStakingAmount(commit.output),
          stakeRaw: commit.output,
        });
      }

      return {
        delegator,
        validator,
        shares,
        stake: formatStakingAmount(stake),
        stakeRaw: stake,
        pendingDeposits,
        pendingWithdrawals,
      };
    },

    /** Returns current epoch information including timing, stake requirements, and inflation data. */
    getEpochInfo: async (): Promise<EpochInfo> => {
      const contract = getReadOnlyStakingContract();

      const [
        epoch,
        finalized,
        activeCount,
        epochMinDuration,
        epochZeroMinDuration,
        epochOdd,
        epochEven,
        valMinStake,
        delMinStake,
      ] = await Promise.all([
        contract.read.epoch() as Promise<bigint>,
        contract.read.finalized() as Promise<bigint>,
        contract.read.selectableValidatorsCount() as Promise<bigint>,
        contract.read.epochMinDuration() as Promise<bigint>,
        contract.read.epochZeroMinDuration() as Promise<bigint>,
        contract.read.epochOdd() as Promise<any>,
        contract.read.epochEven() as Promise<any>,
        contract.read.validatorMinStake() as Promise<bigint>,
        contract.read.delegatorMinStake() as Promise<bigint>,
      ]);

      // epochOdd/epochEven return arrays: [start, end, inflation, weight, weightDeposit, weightWithdrawal, vcount, claimed, stakeDeposit, stakeWithdrawal, slashed]
      const raw = epoch % 2n === 0n ? epochEven : epochOdd;
      const currentEpochData = {
        start: raw[0] as bigint,
        end: raw[1] as bigint,
        inflation: raw[2] as bigint,
        weight: raw[3] as bigint,
        weightDeposit: raw[4] as bigint,
        weightWithdrawal: raw[5] as bigint,
        vcount: raw[6] as bigint,
        claimed: raw[7] as bigint,
        stakeDeposit: raw[8] as bigint,
        stakeWithdrawal: raw[9] as bigint,
        slashed: raw[10] as bigint,
      };
      const currentEpochEnd = currentEpochData.end > 0n;

      // Estimate next epoch: current start + min duration (if epoch hasn't ended)
      let nextEpochEstimate: Date | null = null;
      if (!currentEpochEnd) {
        const duration = epoch === 0n ? epochZeroMinDuration : epochMinDuration;
        const estimatedEndMs = Number(currentEpochData.start + duration) * 1000;
        nextEpochEstimate = new Date(estimatedEndMs);
      }

      return {
        currentEpoch: epoch,
        lastFinalizedEpoch: finalized,
        activeValidatorsCount: activeCount,
        epochMinDuration,
        nextEpochEstimate,
        validatorMinStake: formatStakingAmount(valMinStake),
        validatorMinStakeRaw: valMinStake,
        delegatorMinStake: formatStakingAmount(delMinStake),
        delegatorMinStakeRaw: delMinStake,
      };
    },

    /** Returns detailed data for a specific epoch. */
    getEpochData: async (epochNumber: bigint): Promise<EpochData> => {
      const contract = getReadOnlyStakingContract();

      const [currentEpoch, epochOdd, epochEven] = await Promise.all([
        contract.read.epoch() as Promise<bigint>,
        contract.read.epochOdd() as Promise<any>,
        contract.read.epochEven() as Promise<any>,
      ]);

      // Epochs alternate between odd/even storage slots
      // Current epoch N uses: N % 2 === 0 ? epochEven : epochOdd
      // We can only access current epoch and previous epoch (N-1)
      if (epochNumber > currentEpoch) {
        throw new Error(`Epoch ${epochNumber} has not started yet (current: ${currentEpoch})`);
      }
      if (epochNumber < currentEpoch - 1n && currentEpoch > 0n) {
        throw new Error(`Epoch ${epochNumber} data no longer available (only current and previous epoch stored)`);
      }

      // epochOdd/epochEven return arrays: [start, end, inflation, weight, weightDeposit, weightWithdrawal, vcount, claimed, stakeDeposit, stakeWithdrawal, slashed]
      const raw = epochNumber % 2n === 0n ? epochEven : epochOdd;

      return {
        start: raw[0] as bigint,
        end: raw[1] as bigint,
        inflation: raw[2] as bigint,
        weight: raw[3] as bigint,
        weightDeposit: raw[4] as bigint,
        weightWithdrawal: raw[5] as bigint,
        vcount: raw[6] as bigint,
        claimed: raw[7] as bigint,
        stakeDeposit: raw[8] as bigint,
        stakeWithdrawal: raw[9] as bigint,
        slashed: raw[10] as bigint,
      };
    },

    /** Returns validators currently eligible for consensus duties. */
    getActiveValidators: async (): Promise<Address[]> => {
      const contract = getReadOnlyStakingContract();
      return contract.read.selectableValidators() as Promise<Address[]>;
    },

    /** Returns the count of validators currently eligible for consensus duties. */
    getActiveValidatorsCount: async (): Promise<bigint> => {
      const contract = getReadOnlyStakingContract();
      return contract.read.selectableValidatorsCount() as Promise<bigint>;
    },

    /** Returns every validator identity in the append-only joined registry. */
    getJoinedValidators: async (): Promise<Address[]> => {
      const contract = getReadOnlyStakingContract();
      const total = (await contract.read.validatorsJoinedCount()) as bigint;
      const validators: Address[] = [];

      for (let start = 0n; start < total; start += VALIDATORS_JOINED_PAGE_SIZE) {
        const page = (await contract.read.getValidatorsJoined([start, VALIDATORS_JOINED_PAGE_SIZE])) as Address[];
        if (page.length === 0) break;
        validators.push(...page);
      }

      return validators.filter(v => v !== "0x0000000000000000000000000000000000000000");
    },

    /** Returns the size of the append-only joined validator registry. */
    getJoinedValidatorsCount: async (): Promise<bigint> => {
      const contract = getReadOnlyStakingContract();
      return contract.read.validatorsJoinedCount() as Promise<bigint>;
    },

    /** Returns addresses of validators currently in quarantine. */
    getQuarantinedValidators: async (): Promise<Address[]> => {
      const contract = getReadOnlyStakingContract();
      return contract.read.getValidatorQuarantineList() as Promise<Address[]>;
    },

    /** Returns banned validators with ban duration and permanent ban status. */
    getBannedValidators: async (startIndex = 0n, size = 100n): Promise<BannedValidatorInfo[]> => {
      const contract = getReadOnlyStakingContract();
      const result = (await contract.read.getAllBannedValidators([startIndex, size])) as any[];
      return result.map((v: any) => ({
        validator: v.validator as Address,
        untilEpoch: v.untilEpochBanned,
        permanentlyBanned: v.permanentlyBanned,
      }));
    },

    /** Returns detailed quarantine information with pagination. */
    getQuarantinedValidatorsDetailed: async (startIndex = 0n, size = 100n): Promise<BannedValidatorInfo[]> => {
      const contract = getReadOnlyStakingContract();
      const result = (await contract.read.getAllQuarantinedValidators([startIndex, size])) as any[];
      return result.map((v: any) => ({
        validator: v.validator as Address,
        untilEpoch: v.untilEpochBanned,
        permanentlyBanned: v.permanentlyBanned,
      }));
    },

    getStakingContract,
    parseStakingAmount,
    formatStakingAmount,
  };
};
