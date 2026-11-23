import {describe, expect, it, vi} from "vitest";
import {toHex, type PublicClient} from "viem";
import {encode} from "@/abi/calldata";
import {contractActions} from "@/contracts/actions";
import {CalldataAddress, type CalldataEncodable, type ContractParamsSchema, type GenLayerChain, type GenLayerClient} from "@/types";

const address = "0xa000000000000000000000000000000000000001";

function setup(value: CalldataEncodable, ret: ContractParamsSchema, isStudio = true) {
  const hex = toHex(encode(value));
  const schema = {
    ctor: {params: [], kwparams: {}},
    methods: {read: {params: [], kwparams: {}, readonly: true, ret}},
  };
  const request = vi.fn(async ({method}: {method: string}): Promise<unknown> => {
    switch (method) {
      case "gen_call": return {data: hex};
      case "gen_getContractCode": return "Y29kZQ==";
      case "gen_getContractSchema": return schema;
      default: throw new Error(`Unexpected method ${method}`);
    }
  });
  const client = {request, chain: {isStudio}} as unknown as GenLayerClient<GenLayerChain>;
  const {readContract} = contractActions(client, {} as PublicClient);
  return {readContract, request, hex, schema, args: {address, functionName: "read"} as const};
}

describe("readContract with a return schema", () => {
  it("uses the deployed schema automatically to convert nested results", async () => {
    const accountBytes = Uint8Array.from({length: 20}, (_, i) => i);
    const result = {
      account: accountBytes,
      counts: ["1", "9007199254740993", null],
      payloads: {item: "0xAB"},
    };
    const {readContract, args, request} = setup(result, {
      account: "address",
      counts: ["int", {$rep: {$or: ["int", "null"]}}],
      payloads: {$dict: "bytes"},
    });

    await expect(readContract(args)).resolves.toEqual({
      account: toHex(accountBytes),
      counts: [1, "9007199254740993", null],
      payloads: {item: "0xab"},
    });
    await expect(readContract({...args, jsonSafeReturn: false})).resolves.toEqual(new Map<string, CalldataEncodable>([
      ["account", new CalldataAddress(accountBytes)],
      ["counts", [1n, 9007199254740993n, null]],
      ["payloads", new Map([["item", new Uint8Array([0xab])]])],
    ]));
    expect(request).toHaveBeenCalledWith({method: "gen_getContractSchema", params: [address]});
  });

  it("looks up the schema by code on non-Studio nodes", async () => {
    const {readContract, args, request} = setup("-42", "int", false);
    await expect(readContract(args)).resolves.toBe(-42);
    expect(request).toHaveBeenNthCalledWith(2, {method: "gen_getContractCode", params: [{address}]});
    expect(request).toHaveBeenNthCalledWith(3, {method: "gen_getContractSchema", params: [{code: "Y29kZQ=="}]});
  });

  it("supports an explicit schema, wire decoding and raw hex without another RPC", async () => {
    const {readContract, args, schema, hex, request} = setup("42", "int");
    await expect(readContract({...args, schema})).resolves.toBe(42);
    await expect(readContract({...args, schema: false})).resolves.toBe("42");
    await expect(readContract({...args, rawReturn: true})).resolves.toBe(hex);
    expect(request.mock.calls.map(([call]) => call.method)).toEqual(["gen_call", "gen_call", "gen_call"]);
  });

  it("shares pending and completed lookups across reads of the same address", async () => {
    const {readContract, args, request, hex, schema} = setup("42", "int");
    let resolveSchema!: (result: typeof schema) => void;
    const pendingSchema = new Promise<typeof schema>((resolve) => { resolveSchema = resolve; });
    request.mockImplementation(async ({method}) => method === "gen_call" ? {data: hex} : pendingSchema);
    const schemaCalls = () => request.mock.calls.filter(([call]) => call.method === "gen_getContractSchema");

    const reads = Promise.all([
      readContract(args),
      readContract({...args, address: "0xA000000000000000000000000000000000000001"}),
    ]);
    await vi.waitFor(() => expect(request).toHaveBeenCalledTimes(3));
    expect(schemaCalls()).toHaveLength(1);
    resolveSchema(schema);
    await expect(reads).resolves.toEqual([42, 42]);

    await expect(readContract(args)).resolves.toBe(42);
    expect(schemaCalls()).toHaveLength(1);
    await expect(readContract({...args, address: "0xa000000000000000000000000000000000000002"})).resolves.toBe(42);
    expect(schemaCalls()).toHaveLength(2);
  });

  it("retries after a rejected or unusable lookup", async () => {
    const {readContract, args, request, hex} = setup("42", "int");
    request.mockResolvedValueOnce({data: hex}).mockRejectedValueOnce(new Error("Schema RPC unavailable"));
    await expect(readContract(args)).resolves.toBe("42");
    request.mockResolvedValueOnce({data: hex}).mockResolvedValueOnce("invalid schema");
    await expect(readContract(args)).resolves.toBe("42");
    await expect(readContract(args)).resolves.toBe(42);
  });

  it("keeps the entire wire result when a nested field is incompatible or the method is missing", async () => {
    const wireResult = {count: "42", payload: "invalid hex"};
    const {readContract, args} = setup(wireResult, {count: "int", payload: "bytes"});
    await expect(readContract(args)).resolves.toEqual(wireResult);
    await expect(readContract({...args, functionName: "constructor"})).resolves.toEqual(wireResult);
  });

  it("preserves extra fields, tolerates missing fields and handles repeated tuple items before a suffix", async () => {
    const {readContract, args} = setup({items: ["12", "34", true], extra: "keep"}, {
      missing: "address",
      items: [{$rep: "int"}, "bool"],
    });
    await expect(readContract(args)).resolves.toEqual({items: [12, 34, true], extra: "keep"});
  });

  it("prefers an existing wire type when multiple union branches apply", async () => {
    const {readContract, args} = setup(["12", null], [{$or: ["int", "string"]}, {$or: ["bytes", "null"]}]);
    await expect(readContract(args)).resolves.toEqual(["12", null]);
  });
});
