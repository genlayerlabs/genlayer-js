// tests/client.test.ts
import {createClient} from "../src/client/client";
import {localnet} from "@/chains/localnet";
import {Address} from "../src/types/accounts";
import {createAccount, generatePrivateKey} from "../src/accounts/account";
import {vi} from "vitest";
import {TransactionHashVariant} from "../src/types/transactions";

// Setup fetch mock
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Store for gen_call parameters received by mockFetch
let lastGenCallParams: any = null;

describe("Client Creation", () => {
  it("should create a client for the localnet", () => {
    const client = createClient({chain: localnet});
    expect(client).toBeDefined();
    expect(client.chain).toBe(localnet);
  });
});

describe("Client Overrides", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    lastGenCallParams = null; // Reset for each test

    mockFetch.mockImplementation(async (url, options) => {
      let body = {};
      const bodyString = typeof options?.body === "string" ? options.body : null;

      if (bodyString) {
        try {
          body = JSON.parse(bodyString);
        } catch (e) {
          console.error("[TESTS] mockFetch: Failed to parse bodyString:", bodyString, "Error:", e);
          // Return a generic error if body parsing fails
          return {
            ok: false,
            status: 500,
            json: async () => ({error: {message: "mockFetch body parse error"}}),
          };
        }
      }

      const method = (body as any).method;
      // console.log(`[TESTS] mockFetch called: URL=${url}, Method=${method}, Body=`, body); // Optional: keep for debugging

      if (method === "sim_getConsensusContract") {
        // console.log("[TESTS] mockFetch: Handling sim_getConsensusContract");
        return {
          ok: true,
          json: async () => ({
            result: {
              address: "0x0000000000000000000000000000000000000001",
              abi: [],
            },
          }),
        };
      } else if (method === "gen_call") {
        // console.log("[TESTS] mockFetch: Handling gen_call");
        lastGenCallParams = (body as any).params; // Store the params for gen_call
        return {
          ok: true,
          json: async () => ({result: "0"}),
        };
      } else if (method === "eth_call") {
        return {
          ok: true,
          json: async () => ({result: "0x0000000000000000000000000000000000000000000000000000000000000005"}), // BigInt 5 as hex
        };
      }

      console.warn(`[TESTS] mockFetch: Unhandled method - URL=${url}, Method=${method}, Body=`, body);
      return {
        ok: false,
        status: 404, // Not Found for unhandled methods
        json: async () => ({error: {message: `Unexpected fetch mock call to method: ${method}`}}),
      };
    });
  });

  afterEach(() => {
    // Restore any spies if they weren't restored in tests
    vi.restoreAllMocks();
  });

  it("should default to client account if no account is provided", async () => {
    const account = createAccount(generatePrivateKey());
    const client = createClient({
      chain: localnet,
      account: account,
    });

    // const requestSpy = vi.spyOn(client, "request"); // Removed spy

    const contractAddress = "0x1234567890123456789012345678901234567890";
    await client.readContract({
      address: contractAddress as Address,
      functionName: "testFunction",
      args: ["arg1", "arg2"],
      transactionHashVariant: TransactionHashVariant.LATEST_NONFINAL,
    });

    expect(lastGenCallParams).toEqual([
      {
        type: "read",
        to: contractAddress,
        from: account.address,
        data: expect.any(String), // The data is complex, checking type is often sufficient
        transaction_hash_variant: TransactionHashVariant.LATEST_NONFINAL,
      },
    ]);
  });

  it("should override client account if account is provided", async () => {
    const clientInternalAccount = createAccount(generatePrivateKey()); // Renamed for clarity
    const client = createClient({
      chain: localnet,
      account: clientInternalAccount,
    });

    const overrideAccount = createAccount(generatePrivateKey());

    // const requestSpy = vi.spyOn(client, "request"); // Removed spy

    const contractAddress = "0x1234567890123456789012345678901234567890";
    await client.readContract({
      account: overrideAccount,
      address: contractAddress as Address,
      functionName: "testFunction",
      args: ["arg1", "arg2"],
      transactionHashVariant: TransactionHashVariant.LATEST_FINAL,
    });

    expect(lastGenCallParams).toEqual([
      {
        type: "read",
        to: contractAddress,
        from: overrideAccount.address,
        data: expect.any(String),
        transaction_hash_variant: TransactionHashVariant.LATEST_FINAL,
      },
    ]);
  });

  it("should use client account if account is an address string and no override", async () => {
    // Clarified title
    const accountAddressString = "0x65e03a3e916CF1dC92d3C8E8186a89CfAB0D2bc2";
    const client = createClient({
      chain: localnet,
      account: accountAddressString, // Client's account is an address string
    });

    // const requestSpy = vi.spyOn(client, "request"); // Removed spy

    const contractAddress = "0x1234567890123456789012345678901234567890";
    await client.readContract({
      address: contractAddress as Address,
      functionName: "testFunction",
      args: ["arg1", "arg2"],
      // No stateStatus, no account override in this specific call to readContract
    });

    expect(lastGenCallParams).toEqual([
      {
        type: "read",
        to: contractAddress,
        from: accountAddressString, // Expecting the address string directly
        data: expect.any(String),
        transaction_hash_variant: TransactionHashVariant.LATEST_NONFINAL,
      },
    ]);
  });
});

describe("getContractPendingQueue", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    lastGenCallParams = null;

    mockFetch.mockImplementation(async (url, options) => {
      let body = {};
      const bodyString = typeof options?.body === "string" ? options.body : null;

      if (bodyString) {
        try {
          body = JSON.parse(bodyString);
        } catch {
          return {
            ok: false,
            status: 500,
            json: async () => ({error: {message: "mockFetch body parse error"}}),
          };
        }
      }

      const method = (body as any).method;

      if (method === "sim_getConsensusContract") {
        return {
          ok: true,
          json: async () => ({
            result: {
              address: "0x0000000000000000000000000000000000000001",
              abi: [],
            },
          }),
        };
      } else if (method === "eth_call") {
        return {
          ok: true,
          json: async () => ({result: "0x0000000000000000000000000000000000000000000000000000000000000005"}), // BigInt 5 as hex
        };
      }

      return {
        ok: false,
        status: 404,
        json: async () => ({error: {message: `Unexpected fetch mock call to method: ${method}`}}),
      };
    });
  });

  it("should return pending queue count as a number", async () => {
    const account = createAccount(generatePrivateKey());
    const client = createClient({
      chain: localnet,
      account: account,
    });
    const contractAddress = "0x1234567890123456789012345678901234567890";

    const result = await client.getContractPendingQueue({
      address: contractAddress as Address,
    });

    expect(result).toBe(5);
    expect(typeof result).toBe("number");
  });

  it("should call consensus data contract with correct parameters", async () => {
    const account = createAccount(generatePrivateKey());
    const client = createClient({
      chain: localnet,
      account: account,
    });
    const contractAddress = "0x1234567890123456789012345678901234567890";

    await client.getContractPendingQueue({
      address: contractAddress as Address,
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"method":"eth_call"'),
      })
    );
  });

  it("should throw error for failed contract call", async () => {
    mockFetch.mockImplementation(async () => ({
      ok: false,
      status: 500,
      json: async () => ({error: {message: "Contract call failed"}}),
    }));

    const account = createAccount(generatePrivateKey());
    const client = createClient({
      chain: localnet,
      account: account,
    });
    const contractAddress = "0x1234567890123456789012345678901234567890";

    await expect(
      client.getContractPendingQueue({
        address: contractAddress as Address,
      })
    ).rejects.toThrow("Failed to get pending queue for contract");
  });
});
