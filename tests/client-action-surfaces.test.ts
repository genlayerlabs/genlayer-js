import {describe, expect, it} from "vitest";
import {createClient} from "@/client/client";
import {localnet} from "@/chains/localnet";
import {
  ClientRequester,
  ContractWriter,
  TransactionActionInput,
  TransactionReader,
  ChainSwitcher,
} from "@/types/clients";

/**
 * The action factories used to be declared against the full `GenLayerClient`,
 * which forced `createClient` to cast every intermediate step through
 * `as unknown as GenLayerClient<GenLayerChain>`. These tests pin the narrowed
 * surfaces so the cast chain cannot silently come back, and so a factory that
 * starts reading a member it never declared is caught here rather than by a
 * cast that swallows the error.
 */

const request = (async () => "0x") as unknown as ClientRequester["request"];
const account = undefined;

const requester: ClientRequester = {request, account, chain: localnet};

const transactionReader: TransactionReader = {
  ...requester,
  getTransaction: async () => ({}) as never,
};

const transactionActionInput: TransactionActionInput = {
  ...requester,
  getTransaction: async () => ({}),
};

const contractWriter: ContractWriter = {
  ...requester,
  estimateTransactionGas: async () => 0n,
  getCurrentNonce: async () => 0,
  sendRawTransaction: async () => "0x" as never,
};

const chainSwitcher: ChainSwitcher = {chain: localnet};

describe("narrowed action-factory client surfaces", () => {
  it("accepts a requester with no custom methods", () => {
    expect(requester.chain.id).toBe(localnet.id);
  });

  it("keeps the transaction surfaces structurally distinct", () => {
    // `transactionActions` must NOT require the GenLayer-typed `getTransaction`
    // it installs as a returned method, or the composition cannot be ordered.
    const onlyRaw: TransactionActionInput = {request, chain: localnet, getTransaction: async () => ({})};
    expect(onlyRaw.getTransaction).toBeTypeOf("function");
    expect(transactionActionInput.getTransaction).toBeTypeOf("function");
  });

  it("requires the write helpers the contract actions actually call", () => {
    expect(contractWriter.getCurrentNonce).toBeTypeOf("function");
    expect(contractWriter.estimateTransactionGas).toBeTypeOf("function");
    expect(contractWriter.sendRawTransaction).toBeTypeOf("function");
    expect(transactionReader.getTransaction).toBeTypeOf("function");
  });

  it("allows the chain to be reassigned for connect()", () => {
    const switcher: ChainSwitcher = {chain: localnet};
    switcher.chain = localnet;
    expect(chainSwitcher.chain).toBe(localnet);
  });
});

describe("createClient composition", () => {
  it("builds a client exposing every action surface without a cast", () => {
    const client = createClient({chain: localnet});

    // One representative method per factory in the composition chain.
    for (const method of [
      "fundAccount", // accountActions
      "getCurrentNonce", // accountActions
      "transfer", // accountActions
      "getTransaction", // transactionActions
      "waitForTransactionReceipt", // receiptActions
      "readContract", // contractActions
      "writeContract", // contractActions
      "deployContract", // walletActions / viem
      "connect", // genlayerWalletActions
      "initializeConsensusSmartContract", // chainActions
      "validatorDeposit", // stakingActions
      "vestingValidatorDeposit", // vestingActions
    ]) {
      expect(client, `createClient() is missing ${method}`).toHaveProperty(method);
      expect(typeof (client as unknown as Record<string, unknown>)[method], method).toBe("function");
    }
  });

  it("keeps the chain and account readable off the built client", () => {
    const client = createClient({chain: localnet});
    expect(client.chain.id).toBe(localnet.id);
  });

  it("lets connect() swap the chain on the live client", () => {
    const client = createClient({chain: localnet});
    // `connect` assigns `client.chain = selectedNetwork`, so `chain` must be a
    // writable property rather than a readonly viem client field.
    expect(() => {
      client.chain = localnet;
    }).not.toThrow();
  });
});
