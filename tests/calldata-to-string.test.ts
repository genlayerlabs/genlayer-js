import {describe, it, expect} from "vitest";
import * as calldata from "@/abi/calldata";
import {CalldataAddress} from "@/types/calldata";

// Expected output matches the reference implementation in the genvm repo
// (runners/genlayer-py-std/src/genlayer/calldata/__init__.py :: to_str)

describe("calldata.toString", () => {
  it("encodes bytes as zero-padded hex", () => {
    expect(calldata.toString(new Uint8Array([0xab, 0xcd]))).toBe("b#abcd");
    expect(calldata.toString(new Uint8Array([0x01, 0x02]))).toBe("b#0102");
    expect(calldata.toString(new Uint8Array([0xff]))).toBe("b#ff");
  });

  it("does not collapse distinct byte arrays into the same string", () => {
    const a = calldata.toString(new Uint8Array([0x01, 0x02]));
    const b = calldata.toString(new Uint8Array([0x12]));
    expect(a).not.toBe(b);
  });

  it("encodes an address as 40 hex characters", () => {
    const addr = new CalldataAddress(new Uint8Array(20).fill(0x01));
    expect(calldata.toString(addr)).toBe("addr#" + "01".repeat(20));
  });

  it("separates map entries with commas", () => {
    expect(calldata.toString({a: 1})).toBe('{"a":1}');
    expect(calldata.toString({x: true, y: null})).toBe('{"x":true,"y":null}');
    expect(calldata.toString({})).toBe("{}");
  });

  it("separates array items with commas and emits no trailing comma", () => {
    expect(calldata.toString([1, 2, 3])).toBe("[1,2,3]");
    expect(calldata.toString([])).toBe("[]");
    expect(calldata.toString([[1], [2, 3]])).toBe("[[1],[2,3]]");
  });

  it("handles nesting", () => {
    expect(calldata.toString({items: [1, "two", null]})).toBe('{"items":[1,"two",null]}');
  });
});
