import type {CalldataEncodable} from "../../types/calldata";
import {CalldataAddress} from "../../types/calldata";
import * as consts from "./consts";

function readULeb128(data: Uint8Array, index: {i: number}): bigint {
  let res: bigint = 0n;
  let accum = 0n;
  let shouldContinue = true;
  while (shouldContinue) {
    if (index.i >= data.length) {
      throw new Error("unexpected end of calldata while reading length");
    }
    const byte = data[index.i];
    index.i++;
    const rest = byte & 0x7f;
    res += BigInt(rest) * (1n << accum);
    accum += 7n;
    shouldContinue = byte >= 128;
  }
  return res;
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
      if (data.length - index.i < 20) {
        throw new Error("unexpected end of calldata while reading address");
      }
      const res = data.slice(index.i, index.i + 20);
      index.i += 20;
      return new CalldataAddress(res);
    }
  }
  const type = Number(cur & 0xffn) & ((1 << consts.BITS_IN_TYPE) - 1);
  const rest = cur >> BigInt(consts.BITS_IN_TYPE);
  switch (type) {
    case consts.TYPE_BYTES: {
      const length = checkedRemainingLength(rest, data, index, "bytes");
      const ret = data.slice(index.i, index.i + length);
      index.i += length;
      return ret;
    }
    case consts.TYPE_PINT:
      return rest;
    case consts.TYPE_NINT:
      return -1n - rest;
    case consts.TYPE_STR: {
      const length = checkedRemainingLength(rest, data, index, "string");
      const ret = data.slice(index.i, index.i + length);
      index.i += length;
      return new TextDecoder("utf-8").decode(ret);
    }
    case consts.TYPE_ARR: {
      ensureContainerCountFits(rest, data, index, "array");
      const ret = [] as CalldataEncodable[];
      let elems = rest;
      while (elems > 0) {
        elems--;
        ret.push(decodeImpl(data, index));
      }
      return ret;
    }
    case consts.TYPE_MAP: {
      ensureContainerCountFits(rest, data, index, "map");
      const ret = new Map<string, CalldataEncodable>();
      let elems = rest;
      while (elems > 0) {
        elems--;
        const strLen = checkedRemainingLength(readULeb128(data, index), data, index, "map key");
        const key = data.slice(index.i, index.i + strLen);
        index.i += strLen;
        const keyStr = new TextDecoder("utf-8").decode(key);
        ret.set(keyStr, decodeImpl(data, index));
      }
      return ret;
    }
    default:
      throw new Error(`can't decode type from ${type} rest is ${rest} at pos ${index.i}`);
  }
}

function checkedRemainingLength(
  length: bigint,
  data: Uint8Array,
  index: {i: number},
  label: string,
): number {
  const remaining = data.length - index.i;
  if (length > BigInt(remaining)) {
    throw new Error(`${label} length ${length} exceeds ${remaining} remaining calldata bytes`);
  }
  return Number(length);
}

function ensureContainerCountFits(
  count: bigint,
  data: Uint8Array,
  index: {i: number},
  label: string,
): void {
  // Every encoded element consumes at least one byte. Reject impossible counts
  // before allocating or iterating based on untrusted wire data.
  const remaining = data.length - index.i;
  if (count > BigInt(remaining)) {
    throw new Error(`${label} element count ${count} exceeds ${remaining} remaining calldata bytes`);
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
