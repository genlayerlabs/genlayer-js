import { describe, it, expect, vi, beforeEach } from "vitest";
import { TransactionStatus, DECIDED_STATES, isDecidedState } from "../src/types/transactions";
import { receiptActions } from "../src/transactions/actions";
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
