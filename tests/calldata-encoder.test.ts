import {describe, it, expect} from "vitest";
import {encode} from "../src/abi/calldata/encoder";

describe("calldata encoder", () => {
  describe("unsafe integers", () => {
    it("rejects numbers outside safe integer range", () => {
      expect(() => encode(Number.MAX_SAFE_INTEGER + 1)).toThrow();
      expect(() => encode(Number.MIN_SAFE_INTEGER - 1)).toThrow();
    });

    it("accepts safe integers", () => {
      expect(() => encode(Number.MAX_SAFE_INTEGER)).not.toThrow();
      expect(() => encode(Number.MIN_SAFE_INTEGER)).not.toThrow();
      expect(() => encode(0)).not.toThrow();
      expect(() => encode(-1)).not.toThrow();
    });

    it("accepts bigint for large values", () => {
      expect(() => encode(BigInt(Number.MAX_SAFE_INTEGER) + 1n)).not.toThrow();
    });
  });

  describe("unpaired surrogates", () => {
    it("rejects lone high surrogate in string", () => {
      expect(() => encode("\uD800")).toThrow();
    });

    it("rejects lone low surrogate in string", () => {
      expect(() => encode("\uDC00")).toThrow();
    });

    it("rejects high surrogate at end of string", () => {
      expect(() => encode("hello\uD800")).toThrow();
    });

    it("rejects unpaired surrogate in map key", () => {
      expect(() => encode(new Map([["\uD800", null]]))).toThrow();
    });

    it("accepts valid surrogate pairs (emoji)", () => {
      expect(() => encode("hello 🌍")).not.toThrow();
    });

    it("accepts normal unicode strings", () => {
      expect(() => encode("hello world")).not.toThrow();
      expect(() => encode("")).not.toThrow();
    });
  });
});
