import { describe, it, expect, vi, beforeEach } from "vitest";
import { TransactionStatus, DECIDED_STATES, isDecidedState } from "../src/types/transactions";
import { receiptActions } from "../src/transactions/actions";
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
