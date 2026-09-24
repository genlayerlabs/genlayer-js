import { describe, it, expect } from "vitest";
import { toString } from "../src/abi/calldata/string";
import { CalldataAddress } from "../src/types/calldata";

describe("calldata toString", () => {
  it("zero-pads bytes hex", () => {
    expect(toString(new Uint8Array([0x01, 0x02]))).toBe("b#0102");
  });

  it("does not confuse [0x01, 0x02] with [0x12]", () => {
    expect(toString(new Uint8Array([0x01, 0x02]))).not.toBe(toString(new Uint8Array([0x12])));
  });

  it("zero-pads address bytes to 40 hex chars", () => {
    const bytes = new Uint8Array(20).fill(0x01);
    expect(toString(new CalldataAddress(bytes))).toBe("addr#" + "01".repeat(20));
  });

  it("no trailing comma in arrays", () => {
    expect(toString([1, 2, 3])).toBe("[1,2,3]");
  });

  it("comma separates map entries", () => {
    expect(toString({ x: true, y: null })).toBe('{"x":true,"y":null}');
  });
});
