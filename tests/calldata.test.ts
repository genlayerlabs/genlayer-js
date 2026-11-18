import {describe, expect, it} from "vitest";
import {calldata} from "@/abi";
import type {CalldataEncodable} from "@/types/calldata";

function decodeMap(data: Uint8Array): Map<string, CalldataEncodable> {
  const decoded = calldata.decode(data);
  expect(decoded).toBeInstanceOf(Map);
  return decoded as Map<string, CalldataEncodable>;
}

describe("calldata method-call encoding", () => {
  it("encodes method calls with the empty-string method key", () => {
    const encoded = calldata.encode(calldata.makeCalldataObject("my_method", [1n, 2n], undefined));
    const decoded = decodeMap(encoded);

    expect(decoded.has("")).toBe(true);
    expect(decoded.get("")).toBe("my_method");
    expect(decoded.has("method")).toBe(false);
  });

  it("orders the empty method key before args in the encoded map body", () => {
    const encoded = calldata.encode(calldata.makeCalldataObject("my_method", [1n, 2n], undefined));
    const decoded = decodeMap(encoded);

    expect(Array.from(decoded.entries())[0]).toEqual(["", "my_method"]);
  });

  it("orders the empty method key before kwargs in the encoded map body", () => {
    const encoded = calldata.encode(calldata.makeCalldataObject("my_method", undefined, {count: 1n}));
    const decoded = decodeMap(encoded);

    expect(Array.from(decoded.entries())[0]).toEqual(["", "my_method"]);
    expect(decoded.has("kwargs")).toBe(true);
  });
});
