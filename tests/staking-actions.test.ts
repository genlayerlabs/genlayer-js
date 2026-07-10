import {describe, expect, it, vi} from "vitest";
import {decodeFunctionData, encodeAbiParameters, encodeEventTopics, getAbiItem, parseEther} from "viem";
import {STAKING_ABI, VALIDATOR_WALLET_ABI} from "../src/abi/staking";
import {stakingActions} from "../src/staking/actions";

const ACCOUNT_ADDRESS = "0x0000000000000000000000000000000000000011";
const STAKING_ADDRESS = "0x0000000000000000000000000000000000000044";
const VALIDATOR_WALLET_ADDRESS = "0x0000000000000000000000000000000000000099";
const OPERATOR_ADDRESS = "0x00000000000000000000000000000000000000AA";
const GAS_PRICE_HEX = "0x3b9aca00";
const MOCK_TX_HASH = "0x1234000000000000000000000000000000000000000000000000000000001234";

// Build a real ValidatorJoin event log so decodeEventLog resolves it exactly as
// the SDK does on-chain (operator, validator, amount — all non-indexed).
const validatorJoinLog = () => {
  const topics = encodeEventTopics({abi: STAKING_ABI, eventName: "ValidatorJoin"});
  const event = getAbiItem({abi: STAKING_ABI, name: "ValidatorJoin"}) as any;
  const data = encodeAbiParameters(event.inputs, [OPERATOR_ADDRESS, VALIDATOR_WALLET_ADDRESS, parseEther("2")]);
  return {data, topics, address: STAKING_ADDRESS};
};

const makeReceipt = (overrides: Record<string, unknown> = {}) => ({
  status: "success" as const,
  transactionHash: MOCK_TX_HASH as `0x${string}`,
  blockNumber: 12n,
  gasUsed: 345n,
  logs: [validatorJoinLog()],
  ...overrides,
});

const baseChain = {
  id: 1,
  name: "test",
  nativeCurrency: {name: "GEN", symbol: "GEN", decimals: 18},
  rpcUrls: {default: {http: ["http://127.0.0.1"]}},
  isStudio: false,
  stakingContract: {address: STAKING_ADDRESS},
};

// Local-key harness (byte-for-byte regression anchor for the sign+sendRaw lane).
const makeLocalHarness = () => {
  const signTransaction = vi.fn().mockResolvedValue("0xsigned");
  const client = {
    account: {address: ACCOUNT_ADDRESS, type: "local", signTransaction},
    chain: baseChain,
  };
  const publicClient = {
    call: vi.fn().mockResolvedValue("0x"),
    estimateGas: vi.fn().mockResolvedValue(21000n),
    getTransactionCount: vi.fn().mockResolvedValue(7),
    prepareTransactionRequest: vi.fn().mockImplementation(async (r: any) => r),
    sendRawTransaction: vi.fn().mockResolvedValue(MOCK_TX_HASH),
    waitForTransactionReceipt: vi.fn().mockResolvedValue(makeReceipt()),
    getTransactionReceipt: vi.fn().mockResolvedValue(makeReceipt()),
    readContract: vi.fn(),
  };
  return {actions: stakingActions(client as any, publicClient as any), client, publicClient, signTransaction};
};

// Provider harness: Address-only account (type: "json-rpc"). signTransaction is
// attached deliberately to prove the discriminator is account.type, not its presence.
const makeProviderHarness = () => {
  const signTransaction = vi.fn().mockResolvedValue("0xsigned");
  const request = vi.fn().mockImplementation(async ({method}: any) => {
    if (method === "eth_gasPrice") return GAS_PRICE_HEX;
    if (method === "eth_sendTransaction") return MOCK_TX_HASH;
    throw new Error(`Unexpected request: ${method}`);
  });
  const client = {
    account: {address: ACCOUNT_ADDRESS, type: "json-rpc", signTransaction},
    chain: baseChain,
    request,
  };
  const publicClient = {
    call: vi.fn().mockResolvedValue("0x"),
    estimateGas: vi.fn().mockResolvedValue(21000n),
    getTransactionCount: vi.fn().mockResolvedValue(7),
    prepareTransactionRequest: vi.fn().mockImplementation(async (r: any) => r),
    sendRawTransaction: vi.fn().mockResolvedValue(MOCK_TX_HASH),
    waitForTransactionReceipt: vi.fn().mockResolvedValue(makeReceipt()),
    getTransactionReceipt: vi.fn().mockResolvedValue(makeReceipt()),
    readContract: vi.fn(),
  };
  return {actions: stakingActions(client as any, publicClient as any), client, publicClient, request, signTransaction};
};

const sentTxParams = (request: ReturnType<typeof makeProviderHarness>["request"]) => {
  const call = request.mock.calls.find(([args]: any) => args.method === "eth_sendTransaction");
  return call![0].params[0];
};

describe("stakingActions local lane", () => {
  it("validatorJoin encodes the call, decodes the ValidatorJoin event, and returns the full shape", async () => {
    const {actions, publicClient, signTransaction} = makeLocalHarness();

    const result = await actions.validatorJoin({amount: "2gen", operator: OPERATOR_ADDRESS});

    // Encoding routed to the staking contract with msg.value = stake amount.
    expect(publicClient.call.mock.calls[0][0].to).toBe(STAKING_ADDRESS);
    expect(publicClient.call.mock.calls[0][0].value).toBe(parseEther("2"));
    expect(decodeFunctionData({abi: STAKING_ABI, data: publicClient.call.mock.calls[0][0].data})).toEqual({
      functionName: "validatorJoin",
      args: [OPERATOR_ADDRESS],
    });

    // Local sign+sendRaw path.
    expect(signTransaction).toHaveBeenCalledTimes(1);
    expect(publicClient.sendRawTransaction).toHaveBeenCalledWith({serializedTransaction: "0xsigned"});

    expect(result).toEqual({
      transactionHash: MOCK_TX_HASH,
      blockNumber: 12n,
      gasUsed: 345n,
      validatorWallet: VALIDATOR_WALLET_ADDRESS,
      operator: OPERATOR_ADDRESS,
      amount: "2 GEN",
      amountRaw: parseEther("2"),
    });
  });
});

describe("stakingActions provider lane (Address-only)", () => {
  it("validatorDeposit (payable) routes through eth_sendTransaction with msg.value", async () => {
    const {actions, request, publicClient, signTransaction} = makeProviderHarness();

    const result = await actions.validatorDeposit({validator: VALIDATOR_WALLET_ADDRESS, amount: "5gen"});

    const params = sentTxParams(request);
    expect(params.from).toBe(ACCOUNT_ADDRESS);
    expect(params.to).toBe(VALIDATOR_WALLET_ADDRESS);
    expect(decodeFunctionData({abi: VALIDATOR_WALLET_ABI, data: params.data})).toEqual({
      functionName: "validatorDeposit",
      args: undefined,
    });
    expect(params.type).toBe("0x0");
    expect(params.gas).toBe(`0x${(42000).toString(16)}`);
    expect(params.gasPrice).toBe(GAS_PRICE_HEX);
    // Payable: value is present as a hex quantity.
    expect(params.value).toBe(`0x${parseEther("5").toString(16)}`);

    // Local-lane primitives untouched.
    expect(signTransaction).not.toHaveBeenCalled();
    expect(publicClient.sendRawTransaction).not.toHaveBeenCalled();
    expect(publicClient.getTransactionCount).not.toHaveBeenCalled();
    expect(publicClient.prepareTransactionRequest).not.toHaveBeenCalled();

    expect(result).toEqual({
      transactionHash: MOCK_TX_HASH,
      blockNumber: 12n,
      gasUsed: 345n,
    });
  });

  it("delegatorExit (non-payable) routes through eth_sendTransaction with value omitted", async () => {
    const {actions, request} = makeProviderHarness();

    await actions.delegatorExit({validator: VALIDATOR_WALLET_ADDRESS, shares: "42"});

    const params = sentTxParams(request);
    expect(params.to).toBe(STAKING_ADDRESS);
    expect(decodeFunctionData({abi: STAKING_ABI, data: params.data})).toEqual({
      functionName: "delegatorExit",
      args: [VALIDATOR_WALLET_ADDRESS, 42n],
    });
    expect(params.value).toBeUndefined();
  });

  it("validatorJoin decodes the ValidatorJoin event off the provider-returned hash", async () => {
    const {actions, request, signTransaction} = makeProviderHarness();

    const result = await actions.validatorJoin({amount: "2gen", operator: OPERATOR_ADDRESS});

    // Sent via the provider lane, not signed locally.
    expect(sentTxParams(request).to).toBe(STAKING_ADDRESS);
    expect(signTransaction).not.toHaveBeenCalled();

    // Event decode still works because the follow-up getTransactionReceipt uses
    // the same hash the provider returned.
    expect(result).toEqual({
      transactionHash: MOCK_TX_HASH,
      blockNumber: 12n,
      gasUsed: 345n,
      validatorWallet: VALIDATOR_WALLET_ADDRESS,
      operator: OPERATOR_ADDRESS,
      amount: "2 GEN",
      amountRaw: parseEther("2"),
    });
  });

  it("still runs the preflight and throws before sending on a would-revert", async () => {
    const {actions, publicClient, request} = makeProviderHarness();
    publicClient.call.mockRejectedValueOnce(new Error("boom"));

    await expect(actions.delegatorExit({validator: VALIDATOR_WALLET_ADDRESS, shares: "1"})).rejects.toThrow(
      /Transaction would revert/,
    );
    expect(request).not.toHaveBeenCalledWith(expect.objectContaining({method: "eth_sendTransaction"}));
  });

  it("throws when the mined receipt is reverted", async () => {
    const {actions, publicClient} = makeProviderHarness();
    publicClient.waitForTransactionReceipt.mockResolvedValueOnce(makeReceipt({status: "reverted"}));

    await expect(actions.delegatorExit({validator: VALIDATOR_WALLET_ADDRESS, shares: "1"})).rejects.toThrow(
      /Transaction reverted/,
    );
  });

  it("sends without gasPrice when eth_gasPrice rejects", async () => {
    const {actions, request} = makeProviderHarness();
    request.mockImplementation(async ({method}: any) => {
      if (method === "eth_gasPrice") throw new Error("no gas price");
      if (method === "eth_sendTransaction") return MOCK_TX_HASH;
      throw new Error(`Unexpected request: ${method}`);
    });

    await actions.delegatorExit({validator: VALIDATOR_WALLET_ADDRESS, shares: "1"});

    expect(sentTxParams(request).gasPrice).toBeUndefined();
  });
});
