import { describe, it, expect, vi, beforeEach } from "vitest";
import { TransactionStatus, DECIDED_STATES, isDecidedState } from "../src/types/transactions";
import { receiptActions, transactionActions } from "../src/transactions/actions";
import { simplifyTransactionReceipt } from "../src/transactions/decoders";
import { localnet } from "../src/chains/localnet";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("DECIDED_STATES constant", () => {
  it("should contain all expected decided states", () => {
    const expectedStates = [
      TransactionStatus.ACCEPTED,
      TransactionStatus.UNDETERMINED,
      TransactionStatus.LEADER_TIMEOUT,
      TransactionStatus.VALIDATORS_TIMEOUT,
      TransactionStatus.CANCELED,
      TransactionStatus.FINALIZED
    ];
    
    expect(DECIDED_STATES).toEqual(expectedStates);
  });
});

describe("isDecidedState utility function", () => {
  it("should return true for all decided states", () => {
    const decidedStatusNumbers = ["5", "6", "13", "12", "8", "7"]; // ACCEPTED, UNDETERMINED, LEADER_TIMEOUT, VALIDATORS_TIMEOUT, CANCELED, FINALIZED
    
    decidedStatusNumbers.forEach(statusNum => {
      expect(isDecidedState(statusNum)).toBe(true);
    });
  });

  it("should return false for non-decided states", () => {
    const nonDecidedStatusNumbers = ["0", "1", "2", "3", "4", "9", "10", "11"]; // UNINITIALIZED, PENDING, PROPOSING, COMMITTING, REVEALING, APPEAL_REVEALING, APPEAL_COMMITTING, READY_TO_FINALIZE
    
    nonDecidedStatusNumbers.forEach(statusNum => {
      expect(isDecidedState(statusNum)).toBe(false);
    });
  });

  it("should return false for invalid statuses", () => {
    const invalidStatuses = ["999", "invalid", ""];
    
    invalidStatuses.forEach(status => {
      expect(isDecidedState(status)).toBe(false);
    });
  });
});

describe("waitForTransactionReceipt with DECIDED_STATES", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("should accept all decided states when waiting for ACCEPTED", async () => {
    const decidedStatusNumbers = ["5", "6", "13", "12", "8", "7"]; // All decided states
    
    for (const statusNum of decidedStatusNumbers) {
      const mockTransaction = {
        hash: "0x4b8037744adab7ea8335b4f839979d20031d83a8ccdf706e0ae61312930335f6",
        status: statusNum,
        from_address: "0x123",
        to_address: "0x456",
        value: "0",
        gaslimit: "1000000",
        nonce: "1",
        created_at: "2023-01-01T00:00:00Z",
      };

      const mockClient = {
        chain: localnet,
        getTransaction: vi.fn().mockResolvedValue(mockTransaction)
      };

      const mockPublicClient = {} as any;

      const actions = receiptActions(mockClient as any, mockPublicClient);
      const result = await actions.waitForTransactionReceipt({
        hash: "0x4b8037744adab7ea8335b4f839979d20031d83a8ccdf706e0ae61312930335f6" as any,
        status: TransactionStatus.ACCEPTED,
      });

      expect(result).toEqual(mockTransaction);
    }
  });

  it("should not affect waiting for specific non-ACCEPTED statuses", async () => {
    const mockTransaction = {
      hash: "0x4b8037744adab7ea8335b4f839979d20031d83a8ccdf706e0ae61312930335f6",
      status: "7", // FINALIZED
      from_address: "0x123",
      to_address: "0x456",
      value: "0",
      gaslimit: "1000000",
      nonce: "1",
      created_at: "2023-01-01T00:00:00Z",
    };

    const mockClient = {
      chain: localnet,
      getTransaction: vi.fn().mockResolvedValue(mockTransaction)
    };

    const mockPublicClient = {} as any;

    const actions = receiptActions(mockClient as any, mockPublicClient);
    const result = await actions.waitForTransactionReceipt({
      hash: "0x4b8037744adab7ea8335b4f839979d20031d83a8ccdf706e0ae61312930335f6" as any,
      status: TransactionStatus.FINALIZED,
    });

    expect(result).toEqual(mockTransaction);
  });

  it("should maintain backward compatibility", async () => {
    const mockTransaction = {
      hash: "0x4b8037744adab7ea8335b4f839979d20031d83a8ccdf706e0ae61312930335f6",
      status: "5", // ACCEPTED
      from_address: "0x123",
      to_address: "0x456",
      value: "0",
      gaslimit: "1000000",
      nonce: "1",
      created_at: "2023-01-01T00:00:00Z",
    };

    const mockClient = {
      chain: localnet,
      getTransaction: vi.fn().mockResolvedValue(mockTransaction)
    };

    const mockPublicClient = {} as any;

    const actions = receiptActions(mockClient as any, mockPublicClient);
    const result = await actions.waitForTransactionReceipt({
      hash: "0x4b8037744adab7ea8335b4f839979d20031d83a8ccdf706e0ae61312930335f6" as any,
      status: TransactionStatus.ACCEPTED,
    });

    expect(result).toEqual(mockTransaction);
  });
});

describe("cancelTransaction", () => {
  const exampleHash = "0x4b8037744adab7ea8335b4f839979d20031d83a8ccdf706e0ae61312930335f6" as any;

  it("should cancel a transaction with a private key account", async () => {
    const mockSignMessage = vi.fn().mockResolvedValue("0xmocksignature");
    const mockRequest = vi.fn().mockResolvedValue({ transaction_hash: exampleHash, status: "CANCELED" });

    const mockClient = {
      chain: { ...localnet, isStudio: true },
      account: { signMessage: mockSignMessage, address: "0x1234567890123456789012345678901234567890" },
      request: mockRequest,
    };

    const actions = transactionActions(mockClient as any, {} as any);
    const result = await actions.cancelTransaction({ hash: exampleHash });

    expect(result).toEqual({ transaction_hash: exampleHash, status: "CANCELED" });
    expect(mockSignMessage).toHaveBeenCalledOnce();
    expect(mockRequest).toHaveBeenCalledWith({
      method: "sim_cancelTransaction",
      params: [exampleHash, "0xmocksignature"],
    });
  });

  it("should throw on non-studio chains", async () => {
    const mockClient = {
      chain: { isStudio: false },
      account: { signMessage: vi.fn() },
    };

    const actions = transactionActions(mockClient as any, {} as any);
    await expect(actions.cancelTransaction({ hash: exampleHash })).rejects.toThrow(
      "cancelTransaction is only available on studio-based chains"
    );
  });

  it("should throw when no account is configured", async () => {
    const mockClient = {
      chain: { ...localnet, isStudio: true },
      account: undefined,
    };

    const actions = transactionActions(mockClient as any, {} as any);
    await expect(actions.cancelTransaction({ hash: exampleHash })).rejects.toThrow(
      "No account set"
    );
  });

  it("should use personal_sign for address-only accounts", async () => {
    const mockProviderRequest = vi.fn().mockResolvedValue("0xprovidersignature");
    vi.stubGlobal("window", { ethereum: { request: mockProviderRequest } });

    const mockRequest = vi.fn().mockResolvedValue({ transaction_hash: exampleHash, status: "CANCELED" });

    const mockClient = {
      chain: { ...localnet, isStudio: true },
      account: "0x1234567890123456789012345678901234567890",
      request: mockRequest,
    };

    const actions = transactionActions(mockClient as any, {} as any);
    const result = await actions.cancelTransaction({ hash: exampleHash });

    expect(result).toEqual({ transaction_hash: exampleHash, status: "CANCELED" });
    expect(mockProviderRequest).toHaveBeenCalledWith({
      method: "personal_sign",
      params: [expect.any(String), "0x1234567890123456789012345678901234567890"],
    });
    expect(mockRequest).toHaveBeenCalledWith({
      method: "sim_cancelTransaction",
      params: [exampleHash, "0xprovidersignature"],
    });

    vi.unstubAllGlobals();
    vi.stubGlobal("fetch", mockFetch);
  });
});

describe("simplifyTransactionReceipt", () => {
  it("should preserve string result in leader_receipt (base64 result bytes)", () => {
    const base64Result = "AVtUUkFOU0lFTlRdIHRlc3Q="; // \x01[TRANSIENT] test
    const tx = {
      consensus_data: {
        leader_receipt: [{
          execution_result: "ERROR",
          genvm_result: { stderr: "warnings.warn(...)" },
          result: base64Result,
        }],
      },
    } as any;

    const simplified = simplifyTransactionReceipt(tx);
    const leader = simplified.consensus_data?.leader_receipt?.[0] as any;

    expect(leader.result).toBe(base64Result);
    expect(typeof leader.result).toBe("string");
  });

  it("should preserve object result in leader_receipt", () => {
    const tx = {
      consensus_data: {
        leader_receipt: [{
          execution_result: "ERROR",
          result: { stderr: "ValueError: some error", exit_code: 1 },
        }],
      },
    } as any;

    const simplified = simplifyTransactionReceipt(tx);
    const leader = simplified.consensus_data?.leader_receipt?.[0] as any;

    expect(leader.result).toEqual({ stderr: "ValueError: some error", exit_code: 1 });
  });

  it("should not drop primitive values in nested objects", () => {
    const tx = {
      consensus_data: {
        leader_receipt: [{
          execution_result: "ERROR",
          genvm_result: { stderr: "some error", exit_code: 1 },
        }],
      },
    } as any;

    const simplified = simplifyTransactionReceipt(tx);
    const genvm = (simplified.consensus_data?.leader_receipt?.[0] as any)?.genvm_result;

    expect(genvm.stderr).toBe("some error");
    expect(genvm.exit_code).toBe(1);
  });
});
