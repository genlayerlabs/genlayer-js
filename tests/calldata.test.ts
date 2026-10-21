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

describe("calldata decoder canonicality", () => {
  it("rejects a truncated ULEB128 instead of reading past the input", () => {
    expect(() => calldata.decode(new Uint8Array([0x80]))).toThrow(
      "unexpected end of calldata",
    );
  });

  it("rejects overlong ULEB128 encodings", () => {
    expect(() => calldata.decode(new Uint8Array([0x80, 0x00]))).toThrow(
      "most significant ULEB128 octet cannot be zero",
    );
  });

  it.each([
    ["address", new Uint8Array([0x18])],
    ["bytes", new Uint8Array([0x0b])],
    ["string", new Uint8Array([0x0c])],
    ["array element", new Uint8Array([0x0d])],
    ["map entry", new Uint8Array([0x0e])],
  ])("rejects truncated %s payloads immediately", (_name, encoded) => {
    expect(() => calldata.decode(encoded)).toThrow("unexpected end of calldata");
  });

  it("rejects invalid UTF-8 strings", () => {
    expect(() => calldata.decode(new Uint8Array([0x0c, 0xff]))).toThrow(
      "invalid UTF-8 in calldata",
    );
  });

  it("rejects invalid UTF-8 map keys", () => {
    expect(() =>
      calldata.decode(new Uint8Array([0x0e, 0x01, 0xff, 0x00])),
    ).toThrow("invalid UTF-8 in calldata");
  });

  it("rejects unordered map keys", () => {
    const encoded = new Uint8Array([
      0x16,
      0x01,
      0x62,
      0x00,
      0x01,
      0x61,
      0x00,
    ]);

    expect(() => calldata.decode(encoded)).toThrow(
      "unordered calldata keys: 'b' >= 'a'",
    );
  });

  it("rejects duplicate map keys", () => {
    const encoded = new Uint8Array([
      0x16,
      0x01,
      0x61,
      0x00,
      0x01,
      0x61,
      0x00,
    ]);

    expect(() => calldata.decode(encoded)).toThrow(
      "unordered calldata keys: 'a' >= 'a'",
    );
  });

  it("still round-trips canonical nested calldata", () => {
    const input = new Map<string, CalldataEncodable>([
      ["alpha", [1n, "hello", new Uint8Array([0x00, 0xff])]],
      ["emoji", "😀"],
    ]);

    expect(calldata.decode(calldata.encode(input))).toEqual(input);
  });
});
