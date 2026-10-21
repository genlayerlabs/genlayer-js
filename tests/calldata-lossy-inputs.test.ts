import {describe, expect, it} from "vitest";
import {calldata} from "@/abi";
import type {CalldataEncodable} from "@/types/calldata";

describe("calldata encoder lossless inputs", () => {
  it("rejects unsafe integer numbers and points callers to bigint", () => {
    expect(() => calldata.encode(Number.MAX_SAFE_INTEGER + 1)).toThrow(
      "numbers must be safe integers; use bigint for exact large integers",
    );
    expect(() => calldata.encode(Number.MIN_SAFE_INTEGER - 1)).toThrow(
      "numbers must be safe integers; use bigint for exact large integers",
    );
  });

  it("encodes the same large integer exactly when supplied as bigint", () => {
    const value = BigInt(Number.MAX_SAFE_INTEGER) + 2n;
    expect(calldata.decode(calldata.encode(value))).toBe(value);
  });

  it("rejects unpaired high and low UTF-16 surrogates in string values", () => {
    expect(() => calldata.encode("\ud800")).toThrow(
      "invalid calldata string: unpaired UTF-16 surrogate",
    );
    expect(() => calldata.encode("\udc00")).toThrow(
      "invalid calldata string: unpaired UTF-16 surrogate",
    );
  });

  it("rejects map keys that TextEncoder would silently replace", () => {
    const value = new Map<string, CalldataEncodable>([
      ["\ud800", null],
      ["\ufffd", true],
    ]);

    expect(() => calldata.encode(value)).toThrow(
      "invalid calldata string: unpaired UTF-16 surrogate",
    );
  });

  it("preserves valid surrogate pairs such as emoji", () => {
    const value = "before 😀 after";
    expect(calldata.decode(calldata.encode(value))).toBe(value);
  });
});
