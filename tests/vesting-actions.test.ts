import {describe, expect, it, vi} from "vitest";
import {decodeFunctionData, parseEther, zeroAddress} from "viem";
import {VESTING_ABI} from "../src/abi/vesting";
import {vestingActions} from "../src/vesting/actions";

const ACCOUNT_ADDRESS = "0x0000000000000000000000000000000000000011";
const BENEFICIARY_ADDRESS = ACCOUNT_ADDRESS;
const VESTING_ADDRESS = "0x0000000000000000000000000000000000000022";
const VALIDATOR_ADDRESS = "0x0000000000000000000000000000000000000033";
const CONSENSUS_MAIN_ADDRESS = "0x0000000000000000000000000000000000000044";
const ADDRESS_MANAGER_ADDRESS = "0x0000000000000000000000000000000000000055";
const FACTORY_ADDRESS = "0x0000000000000000000000000000000000000066";
const MOCK_TX_HASH = "0x1234000000000000000000000000000000000000000000000000000000001234";

const makeReceipt = () => ({
  status: "success" as const,
  transactionHash: MOCK_TX_HASH as `0x${string}`,
  blockNumber: 12n,
  gasUsed: 345n,
  logs: [],
});

const makeHarness = () => {
  const signTransaction = vi.fn().mockResolvedValue("0xsigned");
  const client = {
    account: {
      address: ACCOUNT_ADDRESS,
      type: "local",
      signTransaction,
    },
    chain: {
      id: 1,
      name: "test",
      nativeCurrency: {name: "GEN", symbol: "GEN", decimals: 18},
      rpcUrls: {default: {http: ["http://127.0.0.1"]}},
      isStudio: false,
      consensusMainContract: {address: CONSENSUS_MAIN_ADDRESS, abi: [], bytecode: "0x"},
      consensusDataContract: null,
      stakingContract: null,
      feeManagerContract: null,
      roundsStorageContract: null,
      appealsContract: null,
      defaultNumberOfInitialValidators: 5,
      defaultConsensusMaxRotations: 3,
    },
  };
  const publicClient = {
    call: vi.fn().mockResolvedValue("0x"),
    estimateGas: vi.fn().mockResolvedValue(21000n),
    getTransactionCount: vi.fn().mockResolvedValue(7),
    prepareTransactionRequest: vi.fn().mockImplementation(async request => request),
    sendRawTransaction: vi.fn().mockResolvedValue(MOCK_TX_HASH),
    waitForTransactionReceipt: vi.fn().mockResolvedValue(makeReceipt()),
    readContract: vi.fn(),
  };

  return {
    actions: vestingActions(client as any, publicClient as any),
    client,
    publicClient,
    signTransaction,
  };
};

const decodedWrite = (publicClient: ReturnType<typeof makeHarness>["publicClient"]) => {
  const data = publicClient.call.mock.calls[0][0].data;
  return decodeFunctionData({abi: VESTING_ABI, data});
};

describe("vestingActions", () => {
  it("encodes vestingDelegatorJoin against the beneficiary vesting contract", async () => {
    const {actions, publicClient, signTransaction} = makeHarness();

    const result = await actions.vestingDelegatorJoin({
      vesting: VESTING_ADDRESS,
      validator: VALIDATOR_ADDRESS,
      amount: "2gen",
    });

    expect(publicClient.call.mock.calls[0][0].to).toBe(VESTING_ADDRESS);
    expect(publicClient.call.mock.calls[0][0].value).toBeUndefined();
    expect(decodedWrite(publicClient)).toEqual({
      functionName: "vestingDelegatorJoin",
      args: [VALIDATOR_ADDRESS, parseEther("2")],
    });
    expect(signTransaction).toHaveBeenCalledTimes(1);
    expect(publicClient.sendRawTransaction).toHaveBeenCalledWith({serializedTransaction: "0xsigned"});
    expect(result).toMatchObject({
      transactionHash: MOCK_TX_HASH,
      blockNumber: 12n,
      gasUsed: 345n,
      vesting: VESTING_ADDRESS,
      validator: VALIDATOR_ADDRESS,
      beneficiary: ACCOUNT_ADDRESS,
      amount: "2 GEN",
      amountRaw: parseEther("2"),
    });
  });

  it("encodes vesting exit, claim, and withdraw calls with contract signatures", async () => {
    const {actions, publicClient} = makeHarness();

    await actions.vestingDelegatorExit({vesting: VESTING_ADDRESS, validator: VALIDATOR_ADDRESS, shares: "42"});
    expect(decodedWrite(publicClient)).toEqual({
      functionName: "vestingDelegatorExit",
      args: [VALIDATOR_ADDRESS, 42n],
    });

    publicClient.call.mockClear();
    await actions.vestingDelegatorClaim({vesting: VESTING_ADDRESS, validator: VALIDATOR_ADDRESS});
    expect(decodedWrite(publicClient)).toEqual({
      functionName: "vestingDelegatorClaim",
      args: [VALIDATOR_ADDRESS],
    });

    publicClient.call.mockClear();
    const result = await actions.vestingWithdraw({vesting: VESTING_ADDRESS, amount: "1gen"});
    expect(decodedWrite(publicClient)).toEqual({
      functionName: "vestingWithdraw",
      args: [parseEther("1")],
    });
    expect(result).toMatchObject({
      vesting: VESTING_ADDRESS,
      beneficiary: ACCOUNT_ADDRESS,
      amount: "1 GEN",
      amountRaw: parseEther("1"),
    });
  });

  it("discovers a beneficiary vesting contract through AddressManager and VestingFactory", async () => {
    const {actions, publicClient} = makeHarness();
    publicClient.readContract.mockImplementation(async ({functionName, args}: any) => {
      if (functionName === "getAddressManager") return ADDRESS_MANAGER_ADDRESS;
      if (functionName === "getAddress") {
        expect(args).toEqual(["VestingFactory"]);
        return FACTORY_ADDRESS;
      }
      if (functionName === "getVesting") {
        expect(args).toEqual([BENEFICIARY_ADDRESS]);
        return VESTING_ADDRESS;
      }
      throw new Error(`Unexpected read: ${functionName}`);
    });

    await expect(actions.getVestingFactoryAddress()).resolves.toBe(FACTORY_ADDRESS);
    await expect(actions.getVestingForBeneficiary(BENEFICIARY_ADDRESS)).resolves.toBe(VESTING_ADDRESS);
    await expect(actions.getBeneficiaryVestings(BENEFICIARY_ADDRESS)).resolves.toEqual([VESTING_ADDRESS]);
  });

  it("supports explicit factory lookup and returns empty beneficiary vestings for zero address", async () => {
    const {actions, publicClient} = makeHarness();
    publicClient.readContract.mockImplementation(async ({address, functionName}: any) => {
      expect(address).toBe(FACTORY_ADDRESS);
      if (functionName === "getVesting") return zeroAddress;
      if (functionName === "isVestingAddress") return true;
      throw new Error(`Unexpected read: ${functionName}`);
    });

    await expect(actions.getVestingForBeneficiary(BENEFICIARY_ADDRESS, {factory: FACTORY_ADDRESS})).resolves.toBeNull();
    await expect(actions.getBeneficiaryVestings(BENEFICIARY_ADDRESS, {factory: FACTORY_ADDRESS})).resolves.toEqual([]);
    await expect(actions.isVestingAddress(VESTING_ADDRESS, {factory: FACTORY_ADDRESS})).resolves.toBe(true);
  });

  it("reads vesting schedule and state getters", async () => {
    const {actions, publicClient} = makeHarness();
    const values: Record<string, unknown> = {
      name: "Team Vesting",
      category: 0,
      beneficiary: BENEFICIARY_ADDRESS,
      creator: "0x0000000000000000000000000000000000000077",
      revoker: "0x0000000000000000000000000000000000000088",
      factory: FACTORY_ADDRESS,
      addressManager: ADDRESS_MANAGER_ADDRESS,
      totalAmount: parseEther("100"),
      startDate: 1000n,
      cliffDuration: 200n,
      periodDuration: 30n,
      numberOfPeriods: 12n,
      cliffUnlockBps: 1000n,
      needsManualUnlock: true,
      manualUnlocked: false,
      revoked: false,
      vestingStopped: false,
      totalWithdrawn: parseEther("1"),
      vestedAtRevocation: 0n,
      totalAmountAtRevocation: 0n,
      revokedAt: 0n,
      vestingStoppedAt: 0n,
      vestedAtStop: 0n,
      postRevocationBeneficiaryRewards: 0n,
      postRevocationBeneficiaryLosses: 0n,
      accumulatedRewards: parseEther("3"),
      accumulatedLosses: parseEther("2"),
      vestedAmount: parseEther("10"),
      unvestedAmount: parseEther("90"),
      withdrawableAmount: parseEther("9"),
      depositedPerValidator: parseEther("25"),
      pendingExitDeposited: parseEther("5"),
    };
    publicClient.readContract.mockImplementation(async ({functionName}: any) => values[functionName]);

    await expect(actions.vestedAmount(VESTING_ADDRESS)).resolves.toBe(parseEther("10"));
    await expect(actions.vestingDepositedPerValidator(VESTING_ADDRESS, VALIDATOR_ADDRESS)).resolves.toBe(parseEther("25"));
    await expect(actions.vestingPendingExitDeposited(VESTING_ADDRESS, VALIDATOR_ADDRESS)).resolves.toBe(parseEther("5"));
    await expect(actions.getVestingSchedule(VESTING_ADDRESS)).resolves.toEqual({
      startDate: 1000n,
      cliffDuration: 200n,
      periodDuration: 30n,
      numberOfPeriods: 12n,
      cliffUnlockBps: 1000n,
      needsManualUnlock: true,
    });

    await expect(actions.getVestingState(VESTING_ADDRESS)).resolves.toMatchObject({
      name: "Team Vesting",
      beneficiary: BENEFICIARY_ADDRESS,
      totalAmount: "100 GEN",
      totalAmountRaw: parseEther("100"),
      accumulatedRewards: "3 GEN",
      accumulatedRewardsRaw: parseEther("3"),
      vestedAmount: "10 GEN",
      vestedAmountRaw: parseEther("10"),
      withdrawableAmount: "9 GEN",
      withdrawableAmountRaw: parseEther("9"),
    });
  });
});
