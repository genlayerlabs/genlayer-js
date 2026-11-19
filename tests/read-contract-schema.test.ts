import {describe, expect, it, vi} from "vitest";
import {toHex, type PublicClient} from "viem";
import {encode} from "@/abi/calldata";
import {contractActions} from "@/contracts/actions";
import {CalldataAddress, type CalldataEncodable, type ContractParamsSchema, type GenLayerChain, type GenLayerClient} from "@/types";

const address = "0x0000000000000000000000000000000000000001";

function setup(value: CalldataEncodable, ret: ContractParamsSchema) {
  const hex = toHex(encode(value));
  const request = vi.fn().mockResolvedValue({data: hex});
  const client = {request, chain: {isStudio: true}} as unknown as GenLayerClient<GenLayerChain>;
  const {readContract} = contractActions(client, {} as PublicClient);
  const schema = {
    ctor: {params: [], kwparams: {}},
    methods: {read: {params: [], kwparams: {}, readonly: true, ret}},
  };
  return {readContract, request, hex, args: {address, functionName: "read", schema} as const};
}

describe("readContract with a return schema", () => {
  it("accepts nested structs, tuples, repeated values, dictionaries, and unions in both decoded modes", async () => {
    const account = new CalldataAddress(Uint8Array.from({length: 20}, (_, i) => i));
    const data = new Uint8Array([7]);
    const result = new Map<string, CalldataEncodable>([
      ["account", account],
      ["counts", [1n, 9007199254740993n, null]],
      ["payloads", new Map([["item", data]])],
    ]);
    const {readContract, args, request} = setup(result, {
      account: "address",
      counts: ["int", {$rep: {$or: ["int", "null"]}}],
      payloads: {$dict: "bytes"},
    });

    await expect(readContract(args)).resolves.toEqual({
      account: toHex(account.bytes),
      counts: [1, "9007199254740993", null],
      payloads: {item: "0x07"},
    });
    await expect(readContract({...args, jsonSafeReturn: false})).resolves.toEqual(result);
    expect(request.mock.calls.map(([call]) => call.method)).toEqual(["gen_call", "gen_call"]);
  });

  it("rejects different wire types even when JSON-safe conversion looks the same", async () => {
    const {readContract, args, hex} = setup({values: [new Uint8Array(20)]}, {values: ["address"]});
    await expect(readContract(args)).rejects.toThrow('Return value of "read" does not match the contract schema');
    await expect(readContract({...args, rawReturn: true})).resolves.toBe(hex);
    await expect(readContract({...args, schema: undefined})).resolves.toEqual({
      values: [`0x${"00".repeat(20)}`],
    });
  });

  it("rejects missing schema methods, missing fields, and extra tuple items", async () => {
    const wrongMethod = setup(null, "null");
    await expect(wrongMethod.readContract({...wrongMethod.args, functionName: "constructor"}))
      .rejects.toThrow('Contract schema is missing read method "constructor"');

    const missingField = setup({}, {value: "any"});
    await expect(missingField.readContract(missingField.args)).rejects.toThrow("does not match");

    const extraItem = setup([true, false], ["bool"]);
    await expect(extraItem.readContract(extraItem.args)).rejects.toThrow("does not match");
  });
});
