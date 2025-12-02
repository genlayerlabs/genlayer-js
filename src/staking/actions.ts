import {getContract, decodeEventLog, decodeErrorResult, PublicClient, Client, Transport, Chain, Account, Address as ViemAddress, GetContractReturnType, toHex, encodeFunctionData, BaseError, ContractFunctionRevertedError} from "viem";
import {GenLayerClient, GenLayerChain, Address} from "@/types";
import {STAKING_ABI, VALIDATOR_WALLET_ABI} from "@/abi/staking";
import {parseStakingAmount, formatStakingAmount} from "./utils";
import {
  ValidatorInfo,
  ValidatorIdentity,
  BannedValidatorInfo,
  StakeInfo,
  EpochInfo,
  StakingTransactionResult,
  ValidatorJoinResult,
  DelegatorJoinResult,
  ValidatorJoinOptions,
  ValidatorDepositOptions,
  ValidatorExitOptions,
  ValidatorClaimOptions,
  ValidatorPrimeOptions,
  SetOperatorOptions,
  SetIdentityOptions,
  DelegatorJoinOptions,
  DelegatorExitOptions,
  DelegatorClaimOptions,
  StakingContract,
  PendingDeposit,
  PendingWithdrawal,
} from "@/types/staking";

// Read-only contract type (only has .read methods)
type ReadOnlyStakingContract = GetContractReturnType<typeof STAKING_ABI, PublicClient, ViemAddress>;

// Wallet client with account and chain defined (matches type in staking.ts)
type WalletClientWithAccount = Client<Transport, Chain, Account>;

// Fallback gas if estimation fails (zkSync networks can have estimation issues)
const FALLBACK_GAS = 1000000n;
// Gas buffer multiplier (2x) to account for zkSync underestimation
const GAS_BUFFER_MULTIPLIER = 2n;

export const stakingActions = (
  client: GenLayerClient<GenLayerChain>,
  publicClient: PublicClient,
) => {
  /**
   * Execute a write transaction manually to work around zkSync gas estimation issues.
   * zkSync-based networks (like Caldera) have gas estimation quirks that cause
   * viem's contract.write to fail. This helper bypasses that by manually constructing,
   * signing, and sending the transaction.
   *
   * Callers should use encodeFunctionData() to encode their call data with proper types.
   */
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

    // Build debug info for error messages
    const rpcUrl = client.chain.rpcUrls?.default?.http?.[0] || "unknown";
    const valueHex = options.value ? `0x${options.value.toString(16)}` : "0x0";
    const debugCurl = `curl -s -X POST ${rpcUrl} -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"eth_call","params":[{"from":"${account.address}","to":"${options.to}","data":"${options.data}","value":"${valueHex}"},"latest"],"id":1}'`;

    // Simulate first to catch errors before sending
    try {
      await publicClient.call({
        account,
        to: options.to,
        data: options.data,
        value: options.value,
      });
    } catch (err: unknown) {
      // Decode the revert reason
      let revertReason = "Unknown reason";
      if (err instanceof BaseError) {
        const revertError = err.walk((e) => e instanceof ContractFunctionRevertedError);
        if (revertError instanceof ContractFunctionRevertedError) {
          revertReason = revertError.data?.errorName || revertError.reason || revertReason;
        } else if (err.shortMessage) {
          revertReason = err.shortMessage;
        }
      } else if (err instanceof Error) {
        revertReason = err.message;
      }
      throw new Error(`Transaction would revert: ${revertReason}\n\nDebug curl:\n${debugCurl}`);
    }

    // Estimate gas with buffer, fall back to default if estimation fails
    let gasLimit = options.gas;
    if (!gasLimit) {
      try {
        const estimated = await publicClient.estimateGas({
          account,
          to: options.to,
          data: options.data,
          value: options.value,
        });
        // Apply buffer for zkSync underestimation
        gasLimit = estimated * GAS_BUFFER_MULTIPLIER;
      } catch {
        // Estimation failed, use fallback
        gasLimit = FALLBACK_GAS;
      }
    }

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
    const hash = await publicClient.sendRawTransaction({serializedTransaction: serializedTx});
    const receipt = await publicClient.waitForTransactionReceipt({hash});

    if (receipt.status === "reverted") {
      // Try to get revert reason by simulating at the failed block
      let revertReason = "Unknown reason";
      try {
        await publicClient.call({
          account,
          to: options.to,
          data: options.data,
          value: options.value,
          blockNumber: receipt.blockNumber,
        });
        // Simulation passed but tx failed - likely gas or zkSync-specific issue
        const gasUsed = receipt.gasUsed;
        if (gasUsed >= gasLimit - 1000n) {
          revertReason = `Out of gas (used ${gasUsed}, limit ${gasLimit})`;
        } else {
          revertReason = `Unknown (simulation passes but tx reverts). Gas: ${gasUsed}/${gasLimit}`;
        }
      } catch (err: unknown) {
        // Try to decode custom error from viem's error structure
        if (err instanceof BaseError) {
          const revertError = err.walk((e) => e instanceof ContractFunctionRevertedError);
          if (revertError instanceof ContractFunctionRevertedError) {
            revertReason = revertError.data?.errorName || revertError.reason || revertReason;
          } else {
            // Fallback: try to extract from message
            const match = err.message.match(/reverted with.*?["']([^"']+)["']/i);
            if (match) {
              revertReason = match[1];
            } else if (err.shortMessage) {
              revertReason = err.shortMessage;
            }
          }
        } else if (err instanceof Error) {
          revertReason = err.message;
        }
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

  return {
    // === VALIDATOR OPERATIONS ===

    validatorJoin: async (options: ValidatorJoinOptions): Promise<ValidatorJoinResult> => {
      const amount = parseStakingAmount(options.amount);
      const stakingAddress = getStakingAddress();

      const data = options.operator
        ? encodeFunctionData({
            abi: STAKING_ABI,
            functionName: "validatorJoin",
            args: [options.operator as ViemAddress],
          })
        : encodeFunctionData({
            abi: STAKING_ABI,
            functionName: "validatorJoin",
          });

      const result = await executeWrite({to: stakingAddress, data, value: amount});
      const receipt = await publicClient.getTransactionReceipt({hash: result.transactionHash});

      // Parse ValidatorJoin event to get the deployed validator wallet address
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
          // Log from different contract or event, continue searching
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
        operator: options.operator || (client.account!.address as Address),
        amount: formatStakingAmount(amount),
        amountRaw: amount,
      };
    },

    validatorDeposit: async (options: ValidatorDepositOptions): Promise<StakingTransactionResult> => {
      const amount = parseStakingAmount(options.amount);
      const data = encodeFunctionData({
        abi: STAKING_ABI,
        functionName: "validatorDeposit",
      });
      return executeWrite({to: getStakingAddress(), data, value: amount});
    },

    validatorExit: async (options: ValidatorExitOptions): Promise<StakingTransactionResult> => {
      const shares = typeof options.shares === "string" ? BigInt(options.shares) : options.shares;
      const data = encodeFunctionData({
        abi: STAKING_ABI,
        functionName: "validatorExit",
        args: [shares],
      });
      return executeWrite({to: getStakingAddress(), data});
    },

    validatorClaim: async (options?: ValidatorClaimOptions): Promise<StakingTransactionResult & {claimedAmount: bigint}> => {
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

    validatorPrime: async (options: ValidatorPrimeOptions): Promise<StakingTransactionResult> => {
      const data = encodeFunctionData({
        abi: STAKING_ABI,
        functionName: "validatorPrime",
        args: [options.validator as ViemAddress],
      });
      return executeWrite({to: getStakingAddress(), data});
    },

    // === VALIDATOR WALLET OPERATIONS ===

    setOperator: async (options: SetOperatorOptions): Promise<StakingTransactionResult> => {
      const data = encodeFunctionData({
        abi: VALIDATOR_WALLET_ABI,
        functionName: "setOperator",
        args: [options.operator as ViemAddress],
      });
      return executeWrite({to: options.validator as ViemAddress, data});
    },

    setIdentity: async (options: SetIdentityOptions): Promise<StakingTransactionResult> => {
      // Convert extraCid to bytes - if it's already hex use as-is, otherwise encode string to hex
      let extraCidBytes: `0x${string}` = "0x";
      if (options.extraCid) {
        if (options.extraCid.startsWith("0x")) {
          extraCidBytes = options.extraCid as `0x${string}`;
        } else {
          // Convert string to hex bytes
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

    // === DELEGATOR OPERATIONS ===

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

    delegatorExit: async (options: DelegatorExitOptions): Promise<StakingTransactionResult> => {
      const shares = typeof options.shares === "string" ? BigInt(options.shares) : options.shares;
      const data = encodeFunctionData({
        abi: STAKING_ABI,
        functionName: "delegatorExit",
        args: [options.validator as ViemAddress, shares],
      });
      return executeWrite({to: getStakingAddress(), data});
    },

    delegatorClaim: async (options: DelegatorClaimOptions): Promise<StakingTransactionResult> => {
      const delegatorAddress = options.delegator || (client.account!.address as Address);
      const data = encodeFunctionData({
        abi: STAKING_ABI,
        functionName: "delegatorClaim",
        args: [delegatorAddress as ViemAddress, options.validator as ViemAddress],
      });
      return executeWrite({to: getStakingAddress(), data});
    },

    // === READ OPERATIONS ===

    isValidator: async (address: Address): Promise<boolean> => {
      const contract = getReadOnlyStakingContract();
      return contract.read.isValidator([address as ViemAddress]) as Promise<boolean>;
    },

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
      const [view, owner, operator, identityRaw, currentEpoch] = await Promise.all([
        contract.read.validatorView([validator as ViemAddress]) as Promise<any>,
        walletContract.read.owner() as Promise<Address>,
        walletContract.read.operator() as Promise<Address>,
        walletContract.read.getIdentity().catch(() => null) as Promise<any>,
        contract.read.epoch() as Promise<bigint>,
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
        const [epoch, commit] = (await contract.read.validatorDeposit([validator as ViemAddress, i])) as [
          bigint,
          {input: bigint; output: bigint; epoch: bigint; linkToNextCommit: bigint},
        ];
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
        const [epoch, commit] = (await contract.read.validatorWithdrawal([validator as ViemAddress, i])) as [
          bigint,
          {input: bigint; output: bigint; epoch: bigint; linkToNextCommit: bigint},
        ];
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
        banned: view.eBanned > 0n,
        bannedEpoch: view.eBanned > 0n ? view.eBanned : undefined,
        needsPriming,
        identity,
        pendingDeposits,
        pendingWithdrawals,
      };
    },

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
        const [claim, commit] = (await contract.read.delegatorDeposit([
          delegator as ViemAddress,
          validator as ViemAddress,
          i,
        ])) as [
          {quantity: bigint; commit: bigint},
          {input: bigint; output: bigint; epoch: bigint; linkToNextCommit: bigint},
        ];
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
        const [claim, commit] = (await contract.read.delegatorWithdrawal([
          delegator as ViemAddress,
          validator as ViemAddress,
          i,
        ])) as [
          {quantity: bigint; commit: bigint},
          {input: bigint; output: bigint; epoch: bigint; linkToNextCommit: bigint},
        ];
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

    getEpochInfo: async (): Promise<EpochInfo> => {
      const contract = getReadOnlyStakingContract();

      const [epoch, validatorMinStake, delegatorMinStake, activeCount, epochMinDuration, epochOdd, epochEven] =
        await Promise.all([
          contract.read.epoch() as Promise<bigint>,
          contract.read.validatorMinStake() as Promise<bigint>,
          contract.read.delegatorMinStake() as Promise<bigint>,
          contract.read.activeValidatorsCount() as Promise<bigint>,
          contract.read.epochMinDuration() as Promise<bigint>,
          contract.read.epochOdd() as Promise<any>,
          contract.read.epochEven() as Promise<any>,
        ]);

      // Current epoch data (even epochs use epochEven, odd use epochOdd)
      const currentEpochData = epoch % 2n === 0n ? epochEven : epochOdd;
      const currentEpochStart = new Date(Number(currentEpochData.start) * 1000);
      const currentEpochEnd = currentEpochData.end > 0n ? new Date(Number(currentEpochData.end) * 1000) : null;

      // Estimate next epoch: current start + min duration (if epoch hasn't ended)
      let nextEpochEstimate: Date | null = null;
      if (!currentEpochEnd) {
        const estimatedEndMs = Number(currentEpochData.start + epochMinDuration) * 1000;
        nextEpochEstimate = new Date(estimatedEndMs);
      }

      return {
        currentEpoch: epoch,
        validatorMinStake: formatStakingAmount(validatorMinStake),
        validatorMinStakeRaw: validatorMinStake,
        delegatorMinStake: formatStakingAmount(delegatorMinStake),
        delegatorMinStakeRaw: delegatorMinStake,
        activeValidatorsCount: activeCount,
        epochMinDuration,
        currentEpochStart,
        currentEpochEnd,
        nextEpochEstimate,
        // Inflation/rewards data
        inflation: formatStakingAmount(currentEpochData.inflation),
        inflationRaw: currentEpochData.inflation,
        totalWeight: currentEpochData.weight,
        totalClaimed: formatStakingAmount(currentEpochData.claimed),
        totalClaimedRaw: currentEpochData.claimed,
      };
    },

    getActiveValidators: async (): Promise<Address[]> => {
      const contract = getReadOnlyStakingContract();
      const validators = (await contract.read.activeValidators()) as Address[];
      // Filter out zero address (placeholder in contract array)
      return validators.filter(v => v !== "0x0000000000000000000000000000000000000000");
    },

    getActiveValidatorsCount: async (): Promise<bigint> => {
      const contract = getReadOnlyStakingContract();
      return contract.read.activeValidatorsCount() as Promise<bigint>;
    },

    getQuarantinedValidators: async (): Promise<Address[]> => {
      const contract = getReadOnlyStakingContract();
      return contract.read.getQuarantinedValidators() as Promise<Address[]>;
    },

    getBannedValidators: async (startIndex = 0n, size = 100n): Promise<BannedValidatorInfo[]> => {
      const contract = getReadOnlyStakingContract();
      const result = (await contract.read.getAllBannedValidators([startIndex, size])) as any[];
      return result.map((v: any) => ({
        validator: v.validator as Address,
        untilEpoch: v.untilEpochBanned,
        permanentlyBanned: v.permanentlyBanned,
      }));
    },

    getQuarantinedValidatorsDetailed: async (startIndex = 0n, size = 100n): Promise<BannedValidatorInfo[]> => {
      const contract = getReadOnlyStakingContract();
      const result = (await contract.read.getAllQuarantinedValidators([startIndex, size])) as any[];
      return result.map((v: any) => ({
        validator: v.validator as Address,
        untilEpoch: v.untilEpochBanned,
        permanentlyBanned: v.permanentlyBanned,
      }));
    },

    // === RAW CONTRACT ACCESS ===
    getStakingContract,

    // === HELPERS ===
    parseStakingAmount,
    formatStakingAmount,
  };
};
