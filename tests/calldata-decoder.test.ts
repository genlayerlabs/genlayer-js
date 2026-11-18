import {describe, it, expect} from "vitest";
import {decode} from "../src/abi/calldata/decoder";

describe("calldata decoder", () => {
  describe("ULEB128 validation", () => {
    it("rejects overlong ULEB128 encoding", () => {
      expect(() => decode(new Uint8Array([0x80, 0x00]))).toThrow();
    });

    it("rejects truncated ULEB128", () => {
      expect(() => decode(new Uint8Array([0x80]))).toThrow();
    });

    it("rejects empty input", () => {
      expect(() => decode(new Uint8Array([]))).toThrow();
    });
  });

  describe("map key ordering", () => {
    it("rejects unordered map keys", () => {
      expect(() =>
        decode(new Uint8Array([0x16, 0x01, 0x62, 0x00, 0x01, 0x61, 0x00])),
      ).toThrow();
    });

    it("rejects duplicate map keys", () => {
      expect(() =>
        decode(new Uint8Array([0x16, 0x01, 0x61, 0x00, 0x01, 0x61, 0x00])),
      ).toThrow();
    });
  });

  describe("UTF-8 validation", () => {
    it("rejects invalid UTF-8 in strings", () => {
      expect(() => decode(new Uint8Array([0x0c, 0xff]))).toThrow();
    });

    it("rejects invalid UTF-8 in map keys", () => {
      expect(() =>
        decode(new Uint8Array([0x16, 0x01, 0xff, 0x00, 0x01, 0x61, 0x00])),
      ).toThrow();
    });
  });

  describe("bounds checking", () => {
    it("rejects string extending past end of input", () => {
      expect(() => decode(new Uint8Array([0x0c, 0xff, 0xff, 0xff]))).toThrow();
    });

    it("rejects map key extending past end of input", () => {
      expect(() =>
        decode(new Uint8Array([0x16, 0x01, 0xff, 0xff, 0xff, 0x00])),
      ).toThrow();
    });
  });
});
