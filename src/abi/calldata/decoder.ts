import type {CalldataEncodable} from "../../types/calldata";
import {CalldataAddress} from "../../types/calldata";
import * as consts from "./consts";

const fatalUtf8Decoder = new TextDecoder("utf-8", {fatal: true});

function readByte(data: Uint8Array, index: {i: number}): number {
  if (index.i >= data.length) {
    throw new Error("unexpected end of calldata");
  }
  return data[index.i++];
}

function readBytes(
  data: Uint8Array,
  index: {i: number},
  length: bigint | number,
): Uint8Array {
  const lengthBigInt = typeof length === "bigint" ? length : BigInt(length);
  const remaining = BigInt(data.length - index.i);
  if (lengthBigInt > remaining) {
    throw new Error("unexpected end of calldata");
  }

  const lengthNumber = Number(lengthBigInt);
  const ret = data.slice(index.i, index.i + lengthNumber);
  index.i += lengthNumber;
  return ret;
}

function readULeb128(data: Uint8Array, index: {i: number}): bigint {
  let res = 0n;
  let accum = 0n;

  while (true) {
    const byte = readByte(data, index);
    const rest = byte & 0x7f;
    res += BigInt(rest) * (1n << accum);

    if ((byte & 0x80) === 0) {
      if (byte === 0 && accum !== 0n) {
        throw new Error("most significant ULEB128 octet cannot be zero");
      }
      return res;
    }

    accum += 7n;
  }
}

function compareCodePoints(left: string, right: string): number {
  const leftPoints = Array.from(left, (char) => char.codePointAt(0)!);
  const rightPoints = Array.from(right, (char) => char.codePointAt(0)!);

  for (let i = 0; i < leftPoints.length && i < rightPoints.length; i++) {
    const diff = leftPoints[i] - rightPoints[i];
    if (diff !== 0) {
      return diff;
    }
  }

  return leftPoints.length - rightPoints.length;
}

function decodeUtf8(data: Uint8Array): string {
  try {
    return fatalUtf8Decoder.decode(data);
  } catch {
    throw new Error("invalid UTF-8 in calldata");
  }
}

function decodeImpl(data: Uint8Array, index: {i: number}): CalldataEncodable {
  const cur = readULeb128(data, index);
  switch (cur) {
    case BigInt(consts.SPECIAL_NULL):
      return null;
    case BigInt(consts.SPECIAL_TRUE):
      return true;
    case BigInt(consts.SPECIAL_FALSE):
      return false;
    case BigInt(consts.SPECIAL_ADDR): {
      return new CalldataAddress(readBytes(data, index, 20));
    }
  }

  const type = Number(cur & 0xffn) & ((1 << consts.BITS_IN_TYPE) - 1);
  const rest = cur >> BigInt(consts.BITS_IN_TYPE);

  switch (type) {
    case consts.TYPE_BYTES:
      return readBytes(data, index, rest);
    case consts.TYPE_PINT:
      return rest;
    case consts.TYPE_NINT:
      return -1n - rest;
    case consts.TYPE_STR:
      return decodeUtf8(readBytes(data, index, rest));
    case consts.TYPE_ARR: {
      const ret = [] as CalldataEncodable[];
      let elems = rest;
      while (elems > 0) {
        elems--;
        ret.push(decodeImpl(data, index));
      }
      return ret;
    }
    case consts.TYPE_MAP: {
      const ret = new Map<string, CalldataEncodable>();
      let elems = rest;
      let previousKey: string | undefined;

      while (elems > 0) {
        elems--;
        const strLen = readULeb128(data, index);
        const keyStr = decodeUtf8(readBytes(data, index, strLen));

        if (
          previousKey !== undefined &&
          compareCodePoints(previousKey, keyStr) >= 0
        ) {
          throw new Error(
            `unordered calldata keys: '${previousKey}' >= '${keyStr}'`,
          );
        }

        previousKey = keyStr;
        ret.set(keyStr, decodeImpl(data, index));
      }
      return ret;
    }
    default:
      throw new Error(
        `can't decode type from ${type} rest is ${rest} at pos ${index.i}`,
      );
  }
}

export function decode(data: Uint8Array): CalldataEncodable {
  const index = {i: 0};
  const res = decodeImpl(data, index);
  if (index.i !== data.length) {
    throw new Error("some data left");
  }
  return res;
}
