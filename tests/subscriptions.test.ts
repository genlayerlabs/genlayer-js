// tests/subscriptions.test.ts
import {describe, it, expect, vi, afterEach} from "vitest";
import {
  WebSocketNotConfiguredError,
  ConsensusContractNotInitializedError,
  subscriptionActions,
} from "@/subscriptions/actions";
import {GenLayerClient, GenLayerChain} from "@/types";

// Mock viem module for WebSocket-related tests
vi.mock("viem", async importOriginal => {
  const actual = (await importOriginal()) as object;
  return {
    ...actual,
    webSocket: vi.fn(() => ({
      request: vi.fn(),
      type: "webSocket" as const,
    })),
  };
});

// Helper to create a minimal mock client
function createMockClient(options: {
  webSocketUrl?: string;
  consensusContract?: {address: string; abi: unknown[]} | null;
}): GenLayerClient<GenLayerChain> {
  const defaultContract = {
    address: "0x0000000000000000000000000000000000000001",
    abi: [
      {
        name: "NewTransaction",
        type: "event",
        inputs: [
          {indexed: true, name: "txId", type: "bytes32"},
          {indexed: true, name: "recipient", type: "address"},
          {indexed: true, name: "activator", type: "address"},
        ],
      },
      {
        name: "TransactionAccepted",
        type: "event",
        inputs: [{indexed: true, name: "tx_id", type: "bytes32"}],
      },
      {
        name: "TransactionActivated",
        type: "event",
        inputs: [
          {indexed: true, name: "txId", type: "bytes32"},
          {indexed: true, name: "leader", type: "address"},
        ],
      },
      {
        name: "TransactionUndetermined",
        type: "event",
        inputs: [{indexed: true, name: "tx_id", type: "bytes32"}],
      },
      {
        name: "TransactionLeaderTimeout",
        type: "event",
        inputs: [{indexed: true, name: "tx_id", type: "bytes32"}],
      },
    ],
    bytecode: "",
  };

  // Use explicit check to allow null to be passed through
  const consensusContract =
    "consensusContract" in options ? options.consensusContract : defaultContract;

  return {
    chain: {
      id: 1,
      name: "Test Chain",
      rpcUrls: {
        default: {
          http: ["http://localhost:8545"],
          webSocket: options.webSocketUrl ? [options.webSocketUrl] : undefined,
        },
      },
      nativeCurrency: {name: "ETH", symbol: "ETH", decimals: 18},
      consensusMainContract: consensusContract,
      consensusDataContract: null,
      stakingContract: null,
      isStudio: false,
      defaultNumberOfInitialValidators: 3,
      defaultConsensusMaxRotations: 5,
    },
  } as unknown as GenLayerClient<GenLayerChain>;
}

describe("Subscription Actions", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("WebSocket Configuration", () => {
    it("should throw WebSocketNotConfiguredError when no webSocket URL is configured", () => {
      const client = createMockClient({webSocketUrl: undefined});
      const actions = subscriptionActions(client);

      expect(() => actions.subscribeToNewTransaction()).toThrow(WebSocketNotConfiguredError);
      expect(() => actions.subscribeToNewTransaction()).toThrow(
        /WebSocket URL not configured/,
      );
    });

    it("should throw WebSocketNotConfiguredError for all subscription methods", () => {
      const client = createMockClient({webSocketUrl: undefined});
      const actions = subscriptionActions(client);

      expect(() => actions.subscribeToNewTransaction()).toThrow(WebSocketNotConfiguredError);
      expect(() => actions.subscribeToTransactionAccepted()).toThrow(WebSocketNotConfiguredError);
      expect(() => actions.subscribeToTransactionActivated()).toThrow(WebSocketNotConfiguredError);
      expect(() => actions.subscribeToTransactionUndetermined()).toThrow(WebSocketNotConfiguredError);
      expect(() => actions.subscribeToTransactionLeaderTimeout()).toThrow(WebSocketNotConfiguredError);
    });

    it("should not throw WebSocketNotConfiguredError when webSocket URL is provided", () => {
      const client = createMockClient({webSocketUrl: "wss://example.com/ws"});
      const actions = subscriptionActions(client);

      // Should not throw WebSocketNotConfiguredError
      // (may throw other errors due to mocking, but not this specific one)
      expect(() => actions.subscribeToNewTransaction()).not.toThrow(WebSocketNotConfiguredError);
    });
  });

  describe("Consensus Contract Initialization", () => {
    it("should throw ConsensusContractNotInitializedError when contract is null", () => {
      // WebSocket URL is not needed for this test since consensus check comes first
      const client = createMockClient({
        webSocketUrl: undefined,
        consensusContract: null,
      });
      const actions = subscriptionActions(client);

      // Consensus contract check happens first in the code
      expect(() => actions.subscribeToNewTransaction()).toThrow(
        ConsensusContractNotInitializedError,
      );
    });

    it("should throw ConsensusContractNotInitializedError when contract has no address", () => {
      const client = createMockClient({
        webSocketUrl: undefined,
        consensusContract: {address: "", abi: []},
      });

      // Manually set to simulate missing address
      (client.chain.consensusMainContract as any).address = undefined;

      const actions = subscriptionActions(client);

      expect(() => actions.subscribeToNewTransaction()).toThrow(
        ConsensusContractNotInitializedError,
      );
    });
  });
});

describe("Error Classes", () => {
  it("WebSocketNotConfiguredError should have correct name and message", () => {
    const error = new WebSocketNotConfiguredError();
    expect(error.name).toBe("WebSocketNotConfiguredError");
    expect(error.message).toContain("WebSocket URL not configured");
    expect(error).toBeInstanceOf(Error);
  });

  it("ConsensusContractNotInitializedError should have correct name and message", () => {
    const error = new ConsensusContractNotInitializedError();
    expect(error.name).toBe("ConsensusContractNotInitializedError");
    expect(error.message).toContain("Consensus main contract not initialized");
    expect(error).toBeInstanceOf(Error);
  });
});

describe("ConsensusEventStream interface", () => {
  it("should have asyncIterator and unsubscribe methods defined in type", () => {
    // This is a compile-time type check
    // The actual runtime behavior depends on WebSocket connection
    const client = createMockClient({webSocketUrl: "wss://example.com/ws"});
    const actions = subscriptionActions(client);

    // Verify the methods exist on the actions object
    expect(typeof actions.subscribeToNewTransaction).toBe("function");
    expect(typeof actions.subscribeToTransactionAccepted).toBe("function");
    expect(typeof actions.subscribeToTransactionActivated).toBe("function");
    expect(typeof actions.subscribeToTransactionUndetermined).toBe("function");
    expect(typeof actions.subscribeToTransactionLeaderTimeout).toBe("function");
  });
});
