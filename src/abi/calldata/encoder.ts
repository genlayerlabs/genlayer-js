import type {CalldataEncodable} from "../../types/calldata";
import {CalldataAddress} from "../../types/calldata";
import * as consts from "./consts";

function reportError(msg: string, data: CalldataEncodable): never {
  throw new Error(`invalid calldata input '${data}'`);
}

function writeNum(to: number[], data: bigint) {
  if (data === 0n) {
    to.push(0);
    return;
  }
  while (data > 0) {
    let cur = Number(data & 0x7fn);
    data >>= 7n;
    if (data > 0) {
      cur |= 0x80;
    }
    to.push(cur);
  }
}

function encodeNumWithType(to: number[], data: bigint, type: number) {
  const res = (data << BigInt(consts.BITS_IN_TYPE)) | BigInt(type);
  writeNum(to, res);
}

function encodeNum(to: number[], data: bigint) {
  if (data >= 0n) {
    encodeNumWithType(to, data, consts.TYPE_PINT);
  } else {
    encodeNumWithType(to, -data - 1n, consts.TYPE_NINT);
  }
}

function compareString(l: number[], r: number[]): number {
  for (let index = 0; index < l.length && index < r.length; index++) {
    const cur = l[index] - r[index];
    if (cur !== 0) {
      return cur;
    }
  }
  return l.length - r.length;
}

function encodeMap(to: number[], arr: Iterable<[string, CalldataEncodable]>) {
  // unicode code points array, utf8 encoded array, item
  const newEntries: [number[], Uint8Array, CalldataEncodable][] = Array.from(
    arr,
    ([k, v]): [number[], Uint8Array, CalldataEncodable] => [
      Array.from(k, x => x.codePointAt(0)!),
      new TextEncoder().encode(k),
      v,
    ],
  );
  newEntries.sort((v1, v2) => compareString(v1[0], v2[0]));
  for (let i = 1; i < newEntries.length; i++) {
    if (compareString(newEntries[i - 1][0], newEntries[i][0]) === 0) {
      throw new Error(`duplicate key '${new TextDecoder().decode(newEntries[i][1])}'`);
    }
  }

  encodeNumWithType(to, BigInt(newEntries.length), consts.TYPE_MAP);
  for (const [, k, v] of newEntries) {
    writeNum(to, BigInt(k.length));
    for (const c of k) {
      to.push(c);
    }
    encodeImpl(to, v);
  }
}

function encodeImpl(to: number[], data: CalldataEncodable) {
  if (data === null || data === undefined) {
    to.push(consts.SPECIAL_NULL);
    return;
  }
  if (data === true) {
    to.push(consts.SPECIAL_TRUE);
    return;
  }
  if (data === false) {
    to.push(consts.SPECIAL_FALSE);
    return;
  }
  switch (typeof data) {
    case "number": {
      if (!Number.isInteger(data)) {
        reportError("floats are not supported", data);
      }
      encodeNum(to, BigInt(data));
      return;
    }
    case "bigint": {
      encodeNum(to, data);
      return;
    }
    case "string": {
      const str = new TextEncoder().encode(data);
      encodeNumWithType(to, BigInt(str.length), consts.TYPE_STR);
      for (const c of str) {
        to.push(c);
      }
      return;
    }
    case "object": {
      if (data instanceof Uint8Array) {
        encodeNumWithType(to, BigInt(data.length), consts.TYPE_BYTES);
        for (const c of data) {
          to.push(c);
        }
      } else if (data instanceof Array) {
        encodeNumWithType(to, BigInt(data.length), consts.TYPE_ARR);
        for (const c of data) {
          encodeImpl(to, c);
        }
      } else if (data instanceof Map) {
        encodeMap(to, data);
      } else if (data instanceof CalldataAddress) {
        to.push(consts.SPECIAL_ADDR);
        for (const c of data.bytes) {
          to.push(c);
        }
      } else if (Object.getPrototypeOf(data) === Object.prototype) {
        encodeMap(to, Object.entries(data));
      } else {
        reportError("unknown object type", data);
      }
      return;
    }
    default:
      reportError("unknown base type", data);
  }
}

export function encode(data: CalldataEncodable): Uint8Array {
  // FIXME: find a better growable type
  const arr: number[] = [];
  encodeImpl(arr, data);
  return new Uint8Array(arr);
}

// Constructs a calldata object for contract calls, omitting empty args/kwargs for compactness.
export function makeCalldataObject(
  method: string | undefined,
  args: CalldataEncodable[] | undefined,
  kwargs: {[key: string]: CalldataEncodable} | Map<string, CalldataEncodable> | undefined,
): CalldataEncodable {
  let ret: {[key: string]: CalldataEncodable} = {};

  if (method) {
    ret["method"] = method;
  }

  if (args && args.length > 0) {
    ret["args"] = args;
  }

  if (kwargs) {
    if (kwargs instanceof Map) {
      if (kwargs.size > 0) {
        ret["kwargs"] = kwargs;
      }
    } else {
      let hasVal = false;
      for (const _k in kwargs) {
        hasVal = true;
        break;
      }
      if (hasVal) {
        ret["kwargs"] = kwargs;
      }
    }
  }

  return ret;
}
