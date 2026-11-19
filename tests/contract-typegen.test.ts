import {describe, it, expect, vi} from "vitest";
import {readFileSync} from "fs";
import path from "path";
import ts from "typescript";
import {generateContractTypes} from "../src/contracts/typegen";
import {getContract} from "../src/contracts/getContract";
import {CalldataAddress} from "../src/types/calldata";
import type {ContractSchema, GenLayerChain, GenLayerClient} from "../src/types";
import type {StorageMethods} from "./fixtures/storage-contract.types";

const fixture = (name: string) => readFileSync(path.join(__dirname, "fixtures", name), "utf8");
const storageSchema = JSON.parse(fixture("storage-contract.schema.json")) as ContractSchema;

const syntaxErrors = (source: string) =>
  (ts.transpileModule(source, {reportDiagnostics: true, compilerOptions: {module: ts.ModuleKind.ESNext}}).diagnostics ?? []).map(
    (d) => ts.flattenDiagnosticMessageText(d.messageText, "\n"),
  );

describe("generateContractTypes", () => {
  it("matches the committed fixture (regenerate it if the generator output changes on purpose)", () => {
    expect(generateContractTypes(storageSchema, {contractName: "storage", importSource: "../../src/types"})).toBe(
      fixture("storage-contract.types.ts"),
    );
  });

  it("maps primitive return types to the values readContract returns by default", () => {
    const out = generateContractTypes({
      ctor: {params: [], kwparams: {}},
      methods: {
        m_null: {params: [], kwparams: {}, ret: "null", readonly: true},
        m_bool: {params: [], kwparams: {}, ret: "bool", readonly: true},
        m_int: {params: [], kwparams: {}, ret: "int", readonly: true},
        m_str: {params: [], kwparams: {}, ret: "string", readonly: true},
        m_addr: {params: [], kwparams: {}, ret: "address", readonly: true},
        m_bytes: {params: [], kwparams: {}, ret: "bytes", readonly: true},
        m_any: {params: [], kwparams: {}, ret: "any", readonly: true},
        m_arr: {params: [], kwparams: {}, ret: "array", readonly: true},
        m_dict: {params: [], kwparams: {}, ret: "dict", readonly: true},
      },
    });
    expect(out).toContain("m_null: {\n    args: [];\n    kwargs: {};\n    returns: null;");
    expect(out).toContain("m_bool: {\n    args: [];\n    kwargs: {};\n    returns: boolean;");
    expect(out).toContain("returns: number | string;");
    expect(out).toContain("m_str: {\n    args: [];\n    kwargs: {};\n    returns: string;");
    expect(out).toContain("m_addr: {\n    args: [];\n    kwargs: {};\n    returns: `0x${string}`;");
    expect(out).toContain("m_bytes: {\n    args: [];\n    kwargs: {};\n    returns: `0x${string}`;");
    expect(out).toContain("returns: unknown;");
    expect(out).toContain("returns: unknown[];");
    expect(out).toContain("returns: Record<string, unknown>;");
    expect(out).toContain("export type ContractMethods = {");
    expect(out).not.toContain("import type");
    expect(syntaxErrors(out)).toEqual([]);
  });

  it("maps argument types to what the calldata encoder accepts and imports CalldataAddress only when needed", () => {
    const out = generateContractTypes(
      {
        ctor: {params: [["owner", "address"]], kwparams: {}},
        methods: {
          send: {params: [["amount", "int"], ["data", "bytes"]], kwparams: {}, ret: "null", readonly: false},
        },
      },
      {contractName: "token"},
    );
    expect(out).toContain('import type {CalldataAddress} from "genlayer-js/types";');
    expect(out).toContain("export type TokenConstructorArgs = [owner: CalldataAddress];");
    expect(out).toContain("args: [amount: number | bigint, data: Uint8Array];");
    expect(syntaxErrors(out)).toEqual([]);
  });

  it("quotes non-identifier names, sanitizes tuple labels and tolerates unknown or missing schema parts", () => {
    const out = generateContractTypes(
      {
        methods: {
          "weird-name": {
            params: [["1st", "string"], ["", "int"]],
            kwparams: {"opt-in": "bool"},
            ret: {"a b": "string", ok: "u256" as never, empty: {}},
            readonly: true,
          },
          no_ret: {params: [], kwparams: {}, readonly: false} as never,
        },
      } as unknown as ContractSchema,
      {contractName: "my contract-v2"},
    );
    expect(out).toContain('"weird-name": {');
    expect(out).toContain("args: [_1st: string, arg1: number | bigint];");
    expect(out).toContain('kwargs: { "opt-in"?: boolean; };');
    expect(out).toContain('returns: { "a b": string; ok: unknown; empty: Record<string, never>; };');
    expect(out).toContain("no_ret: {\n    args: [];\n    kwargs: {};\n    returns: null;");
    expect(out).toContain("export type MyContractV2ConstructorArgs = [];");
    expect(syntaxErrors(out)).toEqual([]);
  });

  it("rejects input that is not a contract schema", () => {
    expect(() => generateContractTypes({} as ContractSchema)).toThrow(/Invalid contract schema/);
    expect(() => generateContractTypes(null as unknown as ContractSchema)).toThrow(/Invalid contract schema/);
  });
});

describe("getContract", () => {
  const address = "0x0000000000000000000000000000000000000001" as const;
  const makeClient = () => {
    const readContract = vi.fn().mockResolvedValue("stored");
    const writeContract = vi.fn().mockResolvedValue("0xhash");
    return {client: {readContract, writeContract} as unknown as GenLayerClient<GenLayerChain>, readContract, writeContract};
  };

  it("routes read methods through readContract with JSON-safe results", async () => {
    const {client, readContract} = makeClient();
    const storage = getContract<StorageMethods>({client, address});
    const user = new CalldataAddress(new Uint8Array(20));

    await expect(storage.read.get_storage()).resolves.toBe("stored");
    await storage.read.get_profile([user], {kwargs: {include_history: true}, leaderOnly: true});

    expect(readContract).toHaveBeenNthCalledWith(1, {address, functionName: "get_storage", args: [], kwargs: undefined, jsonSafeReturn: true});
    expect(readContract).toHaveBeenNthCalledWith(2, {
      address,
      functionName: "get_profile",
      args: [user],
      kwargs: {include_history: true},
      leaderOnly: true,
      jsonSafeReturn: true,
    });
  });

  it("routes write methods through writeContract with their options", async () => {
    const {client, writeContract} = makeClient();
    const storage = getContract<StorageMethods>({client, address});

    await expect(storage.write.deposit([[1, 2n], null], {value: 5n})).resolves.toBe("0xhash");
    expect(writeContract).toHaveBeenCalledWith({
      address,
      functionName: "deposit",
      args: [[1, 2n], null],
      kwargs: undefined,
      value: 5n,
    });
  });

  it("is not mistaken for a thenable", async () => {
    const {client} = makeClient();
    const storage = getContract<StorageMethods>({client, address});
    expect((storage.read as Record<string, unknown>).then).toBeUndefined();
    await expect(Promise.resolve(storage.read)).resolves.toBe(storage.read);
  });
});
