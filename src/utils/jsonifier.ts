import {calldata} from "@/abi";
import type {CalldataEncodable} from "@/types/calldata";
import {CalldataAddress} from "@/types/calldata";
import {toHex} from "viem";


export function b64ToArray(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64 as string), (c) => c.charCodeAt(0));
}

export function calldataToUserFriendlyJson(cd: Uint8Array): any {
  return {
    raw: Array.from(cd),
    readable: calldata.toString(calldata.decode(cd)),
  };
}

const RESULT_CODES = new Map([
  [0, 'return'],
  [1, 'rollback'],
  [2, 'contract_error'],
  [3, 'error'],
  [4, 'none'],
  [5, 'no_leaders'],
]);

export function resultToUserFriendlyJson(cd64: string): any {
  const raw = b64ToArray(cd64);

  const code = RESULT_CODES.get(raw[0]);
  let status: string;
  let payload: string | null = null;

  if (code === undefined) {
    status = '<unknown>';
  } else {
    status = code;
    if ([1, 2].includes(raw[0])) {
      payload = new TextDecoder('utf-8').decode(raw.slice(1));
    } else if (raw[0] == 0) {
      payload = calldataToUserFriendlyJson(raw.slice(1));
    }
  }

  return {
    raw: cd64,
    status,
    payload,
  };
}

// Deeply converts CalldataEncodable values into JSON-serializable structures.
// Rules:
// - bigint: to number if safe, otherwise to decimal string
// - Uint8Array: to 0x-prefixed hex string
// - CalldataAddress: to 0x-prefixed hex string
// - Map: to Array<[key, value]> preserving order
// - Arrays and plain objects: converted recursively
export function toJsonSafeDeep<T extends CalldataEncodable>(value: T): any {
  return _toJsonSafeDeep(value, new WeakSet());
}

function _toJsonSafeDeep(value: CalldataEncodable, seen: WeakSet<object>): any {
  if (value === null || value === undefined) {
    return null;
  }

  const primitiveType = typeof value;
  if (primitiveType === "string" || primitiveType === "boolean" || primitiveType === "number") {
    return value;
  }

  if (primitiveType === "bigint") {
    const big = value as bigint;
    const abs = big < 0n ? -big : big;
    const maxSafe = 9007199254740991n; // Number.MAX_SAFE_INTEGER
    return abs <= maxSafe ? Number(big) : big.toString();
  }

  // Objects and structured values
  if (typeof value === "object") {
    if (seen.has(value as object)) {
      // Prevent potential cycles; represent as null
      return null;
    }
    seen.add(value as object);

    if (value instanceof Uint8Array) {
      return toHex(value);
    }

    if (value instanceof Array) {
      return value.map((v) => _toJsonSafeDeep(v as CalldataEncodable, seen));
    }

    if (value instanceof Map) {
      const obj: Record<string, any> = {};
      for (const [k, v] of value.entries()) {
        obj[k] = _toJsonSafeDeep(v as CalldataEncodable, seen);
      }
      return obj;
    }

    if (value instanceof CalldataAddress) {
      return toHex(value.bytes);
    }

    if (Object.getPrototypeOf(value) === Object.prototype) {
      const obj: Record<string, any> = {};
      for (const [k, v] of Object.entries(value)) {
        obj[k] = _toJsonSafeDeep(v as CalldataEncodable, seen);
      }
      return obj;
    }
  }

  // Fallback: return as-is (shouldn't normally reach here)
  return value as any;
}