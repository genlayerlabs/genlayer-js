// tests/genCall.test.ts
import {describe, it, expect, vi, beforeEach, afterEach, afterAll} from "vitest";
import {createClient} from "@/client/client";
import {localnet} from "@/chains/localnet";
import {Address} from "@/types/accounts";
import {createAccount, generatePrivateKey} from "@/accounts/account";
import {GenCallStatusCode} from "@/types/clients";
import {zeroAddress} from "viem";

// Setup fetch mock
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Store for gen_call parameters received by mockFetch
let lastGenCallParams: any = null;
let mockGenCallResponse: any = null;

describe("genCall", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    lastGenCallParams = null;
    mockGenCallResponse = {
      data: "abcd1234",
      status: {code: GenCallStatusCode.SUCCESS, message: "success"},
      stdout: "test stdout",
      stderr: "",
      logs: [],
      events: [{topics: ["0x123"], data: "0x456"}],
      messages: [],
    };

    mockFetch.mockImplementation(async (_url, options) => {
      const bodyString = typeof options?.body === "string" ? options.body : null;
      if (!bodyString) {
        return {ok: false, status: 400, json: async () => ({error: "No body"})};
      }

      const body = JSON.parse(bodyString);
      const method = body.method;

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
      } else if (method === "gen_call") {
        lastGenCallParams = body.params;
        return {
          ok: true,
          json: async () => ({result: mockGenCallResponse}),
        };
      }

      return {ok: false, status: 404, json: async () => ({error: "Unknown method"})};
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  it("should send basic genCall request with required parameters", async () => {
    const client = createClient({chain: localnet});
    const contractAddress = "0x1234567890123456789012345678901234567890" as Address;

    const result = await client.genCall({
      type: "read",
      to: contractAddress,
      data: "0xabcdef",
    });

    expect(lastGenCallParams).toEqual([
      {
        type: "read",
        to: contractAddress,
        from: zeroAddress,
        data: "0xabcdef",
      },
    ]);

    expect(result.data).toBe("0xabcd1234");
    expect(result.status.code).toBe(GenCallStatusCode.SUCCESS);
    expect(result.stdout).toBe("test stdout");
    expect(result.events).toHaveLength(1);
  });

  it("should use client account as sender when available", async () => {
    const account = createAccount(generatePrivateKey());
    const client = createClient({chain: localnet, account});
    const contractAddress = "0x1234567890123456789012345678901234567890" as Address;

    await client.genCall({
      type: "write",
      to: contractAddress,
      data: "0x1234",
    });

    expect(lastGenCallParams[0].from).toBe(account.address);
  });

  it("should use explicit from address over client account", async () => {
    const account = createAccount(generatePrivateKey());
    const client = createClient({chain: localnet, account});
    const contractAddress = "0x1234567890123456789012345678901234567890" as Address;
    const explicitFrom = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as Address;

    await client.genCall({
      type: "read",
      to: contractAddress,
      from: explicitFrom,
      data: "0x1234",
    });

    expect(lastGenCallParams[0].from).toBe(explicitFrom);
  });

  it("should include optional parameters when provided", async () => {
    const client = createClient({chain: localnet});
    const contractAddress = "0x1234567890123456789012345678901234567890" as Address;

    await client.genCall({
      type: "write",
      to: contractAddress,
      data: "0x1234",
      value: 1000n,
      gas: 50000n,
      blockNumber: "0x100",
      status: "finalized",
    });

    expect(lastGenCallParams[0]).toEqual({
      type: "write",
      to: contractAddress,
      from: zeroAddress,
      data: "0x1234",
      value: "0x3e8", // 1000 in hex
      gas: "0xc350", // 50000 in hex
      blockNumber: "0x100",
      status: "finalized",
    });
  });

  it("should pass leaderResults as leader_results for validator simulation", async () => {
    const client = createClient({chain: localnet});
    const contractAddress = "0x1234567890123456789012345678901234567890" as Address;

    const leaderResults = ["0010", "00d102"];

    await client.genCall({
      type: "write",
      to: contractAddress,
      data: "0x1234",
      leaderResults,
    });

    expect(lastGenCallParams[0].leader_results).toEqual(leaderResults);
  });

  it("should not include leader_results when leaderResults is null", async () => {
    const client = createClient({chain: localnet});
    const contractAddress = "0x1234567890123456789012345678901234567890" as Address;

    await client.genCall({
      type: "read",
      to: contractAddress,
      data: "0x1234",
      leaderResults: null,
    });

    expect(lastGenCallParams[0]).not.toHaveProperty("leader_results");
  });

  it("should handle response with 0x prefix in data", async () => {
    mockGenCallResponse = {
      data: "0xdeadbeef",
      status: {code: GenCallStatusCode.SUCCESS, message: "ok"},
    };

    const client = createClient({chain: localnet});
    const result = await client.genCall({
      type: "read",
      to: "0x1234567890123456789012345678901234567890" as Address,
      data: "0x00",
    });

    expect(result.data).toBe("0xdeadbeef");
  });

  it("should add 0x prefix to data when missing", async () => {
    mockGenCallResponse = {
      data: "deadbeef",
      status: {code: GenCallStatusCode.SUCCESS, message: "ok"},
    };

    const client = createClient({chain: localnet});
    const result = await client.genCall({
      type: "read",
      to: "0x1234567890123456789012345678901234567890" as Address,
      data: "0x00",
    });

    expect(result.data).toBe("0xdeadbeef");
  });

  it("should provide default values for missing response fields", async () => {
    mockGenCallResponse = {}; // Empty response

    const client = createClient({chain: localnet});
    const result = await client.genCall({
      type: "read",
      to: "0x1234567890123456789012345678901234567890" as Address,
      data: "0x00",
    });

    expect(result.data).toBe("0x");
    expect(result.status).toEqual({code: GenCallStatusCode.SUCCESS, message: "success"});
    expect(result.stdout).toBe("");
    expect(result.stderr).toBe("");
    expect(result.logs).toEqual([]);
    expect(result.events).toEqual([]);
    expect(result.messages).toEqual([]);
  });

  it("should handle error status codes", async () => {
    mockGenCallResponse = {
      data: "",
      status: {code: GenCallStatusCode.USER_ERROR, message: "Contract reverted"},
      stderr: "Error: revert",
    };

    const client = createClient({chain: localnet});
    const result = await client.genCall({
      type: "write",
      to: "0x1234567890123456789012345678901234567890" as Address,
      data: "0x00",
    });

    expect(result.status.code).toBe(GenCallStatusCode.USER_ERROR);
    expect(result.status.message).toBe("Contract reverted");
    expect(result.stderr).toBe("Error: revert");
  });

  it("should handle deploy type", async () => {
    const client = createClient({chain: localnet});

    await client.genCall({
      type: "deploy",
      to: zeroAddress as Address,
      data: "0x608060405234801561001057600080fd5b50",
    });

    expect(lastGenCallParams[0].type).toBe("deploy");
  });
});

describe("GenCallStatusCode enum", () => {
  it("should have correct values", () => {
    expect(GenCallStatusCode.SUCCESS).toBe(0);
    expect(GenCallStatusCode.USER_ERROR).toBe(1);
    expect(GenCallStatusCode.VM_ERROR).toBe(2);
    expect(GenCallStatusCode.INTERNAL_ERROR).toBe(3);
  });
});
