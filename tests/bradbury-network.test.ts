import {afterEach, describe, expect, it, vi} from "vitest";
import {assertNetworkIdentity} from "../src/client/networkIdentity";
import {createClient} from "../src/client/client";
import {testnetBradbury} from "../src/chains/testnetBradbury";

const GENESIS = "0x17d89764d4f4f963158fc4c5e8f2cb670c2837740b35f37081c12860c3df97e4";
const request = () => vi.fn(async ({method}: {method: string}) => {
  if (method === "eth_chainId") return "0x107d";
  if (method === "eth_getBlockByNumber") return {hash: GENESIS};
  if (method === "eth_getCode") return "0x6001";
  throw new Error(`Unexpected method ${method}`);
});
afterEach(() => vi.restoreAllMocks());

describe("Bradbury Phase 2 network identity", () => {
  it("accepts the deployed genesis and requires contract code", async () => {
    const rpc = request();
    await expect(assertNetworkIdentity(rpc, testnetBradbury)).resolves.toBeUndefined();
    expect(rpc).toHaveBeenCalledWith({method: "eth_getCode", params: ["0xD8fBa96C0dBB0257028dBc0107060b958e5c7113", "latest"]});
  });
  it("rejects the legacy network even though its chain ID matches", async () => {
    const rpc = request();
    rpc.mockImplementationOnce(async () => "0x107d");
    rpc.mockImplementationOnce(async () => ({hash: "0xef97917ce9bd9fa7d12ad6a8d81ea26c80ac1d727acc37cbb9799ae199788dc5"}));
    await expect(assertNetworkIdentity(rpc, testnetBradbury)).rejects.toThrow("identity");
  });
  it("rejects an endpoint without the deployed staking contract", async () => {
    const valid = request();
    await expect(assertNetworkIdentity(async args => args.method === "eth_getCode" ? "0x" : valid(args), testnetBradbury)).rejects.toThrow("code is missing");
  });
  it("does not add calls to chains without a genesis pin", async () => {
    const rpc = request();
    await assertNetworkIdentity(rpc, {...testnetBradbury, genesisHash: undefined});
    expect(rpc).not.toHaveBeenCalled();
  });
  it("does not mutate exported defaults when a client overrides its endpoint", () => {
    const first = createClient({chain: testnetBradbury, endpoint: "https://first.example"});
    const second = createClient({chain: testnetBradbury, endpoint: "https://second.example"});
    expect(first.chain.rpcUrls.default.http).toEqual(["https://first.example"]);
    expect(second.chain.rpcUrls.default.http).toEqual(["https://second.example"]);
    expect(testnetBradbury.rpcUrls.default.http).toEqual(["https://rpc.testnet-chain.genlayer.com"]);
  });
  it("blocks a locally signed broadcast before contacting a wrong network", async () => {
    const methods: string[] = [];
    vi.spyOn(globalThis, "fetch").mockImplementation(async (_url, init) => {
      const {method} = JSON.parse(init!.body as string); methods.push(method);
      return new Response(JSON.stringify({jsonrpc: "2.0", id: 1, result: method === "eth_chainId" ? "0x107d" : {hash: "0xdead"}}));
    });
    const client = createClient({chain: testnetBradbury});
    await expect(client.request({method: "eth_sendRawTransaction", params: ["0x01"]})).rejects.toThrow("identity");
    expect(methods).not.toContain("eth_sendRawTransaction");
  });
});
