import {describe, it, expect} from "vitest";
import {toString} from "../src/abi/calldata/string";
import {CalldataAddress} from "../src/types/calldata";

describe("calldata toString", () => {
  it("zero-pads byte strings", () => {
    expect(toString(new Uint8Array([0x01, 0x02]))).toBe("b#0102");
    expect(toString(new Uint8Array([0x0a, 0x00, 0xff]))).toBe("b#0a00ff");
  });

  it("zero-pads addresses to 40 hex chars", () => {
    const addr = new CalldataAddress(new Uint8Array(20).fill(0x01));
    expect(toString(addr)).toBe("addr#" + "01".repeat(20));
  });

  it("separates object entries with commas", () => {
    expect(toString({x: true, y: null})).toBe('{"x":true,"y":null}');
  });

  it("does not leave a trailing comma in arrays", () => {
    expect(toString([1, 2, 3])).toBe("[1,2,3]");
  });
});
