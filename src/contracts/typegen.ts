import type {ContractParamsSchema, ContractSchema} from "@/types/contracts";

export type GenerateContractTypesOptions = {
  /** Base name for the generated types. Defaults to "Contract". Non-identifier characters are stripped. */
  contractName?: string;
  /** Module the generated file imports SDK types from. Defaults to "genlayer-js/types". */
  importSource?: string;
};

const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

const propertyKey = (key: string): string => (IDENTIFIER.test(key) ? key : JSON.stringify(key));

const tupleLabel = (name: string, index: number): string => {
  const cleaned = name.replace(/[^A-Za-z0-9_$]/g, "_");
  if (cleaned === "") return `arg${index}`;
  return IDENTIFIER.test(cleaned) ? cleaned : `_${cleaned}`;
};

const toTypeName = (name: string): string => {
  const pascal = name
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join("");
  if (pascal === "") return "Contract";
  return /^[0-9]/.test(pascal) ? `_${pascal}` : pascal;
};

const union = (types: string[]): string => {
  const unique = Array.from(new Set(types));
  if (unique.length === 0) return "never";
  return unique.join(" | ");
};

const isRep = (value: unknown): value is {$rep: ContractParamsSchema} =>
  typeof value === "object" && value !== null && !Array.isArray(value) && "$rep" in value;

const parenthesizeForArray = (type: string): string => (type.includes(" | ") ? `(${type})` : type);

/** "returns" mirrors the JSON-safe values produced by `readContract` (its default `jsonSafeReturn: true`); "input" mirrors what the calldata encoder accepts. */
type TypeMode = "input" | "returns";

function schemaToTs(schema: ContractParamsSchema, mode: TypeMode, usesAddress: {value: boolean}): string {
  if (typeof schema === "string") {
    switch (schema) {
      case "null":
        return "null";
      case "bool":
        return "boolean";
      case "int":
        // readContract (jsonSafeReturn) returns safe integers as numbers and larger ones as decimal strings.
        return mode === "input" ? "number | bigint" : "number | string";
      case "string":
        return "string";
      case "address":
        if (mode === "input") {
          usesAddress.value = true;
          return "CalldataAddress";
        }
        return "`0x${string}`";
      case "bytes":
        return mode === "input" ? "Uint8Array" : "`0x${string}`";
      case "array":
        return "unknown[]";
      case "dict":
        return "Record<string, unknown>";
      default:
        // "any" and type names this SDK version does not know yet.
        return "unknown";
    }
  }

  if (Array.isArray(schema)) {
    // Repeated arrays are `[{$rep: T}]`; fixed tuples are `[A, B]`; `[A, {$rep: B}]` is a tuple with a rest element.
    const items = schema.map((element) =>
      isRep(element)
        ? {rest: true, type: schemaToTs(element.$rep, mode, usesAddress)}
        : {rest: false, type: schemaToTs(element, mode, usesAddress)},
    );
    if (items.length === 1 && items[0].rest) {
      return `${parenthesizeForArray(items[0].type)}[]`;
    }
    return `[${items.map((item) => (item.rest ? `...${parenthesizeForArray(item.type)}[]` : item.type)).join(", ")}]`;
  }

  if (typeof schema === "object" && schema !== null) {
    if ("$or" in schema && Array.isArray((schema as {$or: unknown}).$or)) {
      return union((schema as {$or: ContractParamsSchema[]}).$or.map((t) => schemaToTs(t, mode, usesAddress)));
    }
    if ("$dict" in schema) {
      const valueType = schemaToTs((schema as {$dict: ContractParamsSchema}).$dict, mode, usesAddress);
      return `Record<string, ${valueType}>`;
    }
    const entries = Object.entries(schema as Record<string, ContractParamsSchema>);
    if (entries.length === 0) return "Record<string, never>";
    return `{ ${entries.map(([key, value]) => `${propertyKey(key)}: ${schemaToTs(value, mode, usesAddress)};`).join(" ")} }`;
  }

  return "unknown";
}

function argsTuple(params: [string, ContractParamsSchema][], usesAddress: {value: boolean}): string {
  return `[${params.map(([name, type], index) => `${tupleLabel(name, index)}: ${schemaToTs(type, "input", usesAddress)}`).join(", ")}]`;
}

function kwargsObject(kwparams: Record<string, ContractParamsSchema>, usesAddress: {value: boolean}): string {
  const entries = Object.entries(kwparams ?? {});
  if (entries.length === 0) return "{}";
  return `{ ${entries.map(([key, type]) => `${propertyKey(key)}?: ${schemaToTs(type, "input", usesAddress)};`).join(" ")} }`;
}

/**
 * Generates TypeScript declarations for a GenLayer contract from its schema
 * (as returned by `client.getContractSchema` / `client.getContractSchemaForCode`).
 *
 * The output declares `<Name>Methods`, a map from method name to its argument tuple,
 * keyword arguments, return type and flags, plus `<Name>ConstructorArgs` /
 * `<Name>ConstructorKwargs`. Pass `<Name>Methods` to `getContract` for typed reads and writes.
 */
export function generateContractTypes(schema: ContractSchema, options: GenerateContractTypesOptions = {}): string {
  if (!schema || typeof schema !== "object" || typeof schema.methods !== "object" || schema.methods === null) {
    throw new Error("Invalid contract schema: expected an object with a `methods` map");
  }
  const name = toTypeName(options.contractName ?? "Contract");
  const importSource = options.importSource ?? "genlayer-js/types";
  const usesAddress = {value: false};

  const ctor = schema.ctor ?? {params: [], kwparams: {}};
  const ctorArgs = argsTuple(ctor.params ?? [], usesAddress);
  const ctorKwargs = kwargsObject(ctor.kwparams ?? {}, usesAddress);

  const methodBlocks = Object.keys(schema.methods)
    .sort()
    .map((methodName) => {
      const method = schema.methods[methodName];
      const lines = [
        `  ${propertyKey(methodName)}: {`,
        `    args: ${argsTuple(method.params ?? [], usesAddress)};`,
        `    kwargs: ${kwargsObject(method.kwparams ?? {}, usesAddress)};`,
        `    returns: ${schemaToTs(method.ret ?? "null", "returns", usesAddress)};`,
        `    readonly: ${method.readonly ? "true" : "false"};`,
        `    payable: ${method.payable ? "true" : "false"};`,
        `  };`,
      ];
      return lines.join("\n");
    });

  const out: string[] = [
    "// This file was generated by genlayer-js `generateContractTypes`. Do not edit it by hand;",
    "// regenerate it when the contract schema changes.",
    "/* eslint-disable */",
  ];
  if (usesAddress.value) {
    out.push(`import type {CalldataAddress} from ${JSON.stringify(importSource)};`);
  }
  out.push(
    "",
    `export type ${name}ConstructorArgs = ${ctorArgs};`,
    "",
    `export type ${name}ConstructorKwargs = ${ctorKwargs};`,
    "",
    `export type ${name}Methods = {`,
    ...methodBlocks,
    "};",
    "",
  );
  return out.join("\n");
}
