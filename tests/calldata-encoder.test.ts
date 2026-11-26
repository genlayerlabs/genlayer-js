import { describe, it, expect } from "vitest";
import { encode } from "../src/abi/calldata/encoder";
import { decode } from "../src/abi/calldata/decoder";

describe("calldata encoder - float handling", () => {
  it("should encode integer numbers correctly", () => {
    const encoded = encode(42);
    const decoded = decode(encoded);
    expect(decoded).toBe(42n);
  });

  it("should encode float with no fractional part as integer (e.g. 1.0)", () => {
    const encoded = encode(1.0);
    const decoded = decode(encoded);
    expect(decoded).toBe(1n);
  });

  it("should throw descriptive error for true float values", () => {
    expect(() => encode(1.5)).toThrow(
      "calldata encoding error: float value '1.5' is not supported"
    );
  });

  it("should throw descriptive error for NaN", () => {
    expect(() => encode(NaN)).toThrow();
  });
});
