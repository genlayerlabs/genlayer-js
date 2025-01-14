import type {CalldataEncodable} from "../../types/calldata";
import {CalldataAddress} from "../../types/calldata";

function reportError(msg: string, data: CalldataEncodable): never {
    throw new Error(`invalid calldata input '${data}'`);
}

function toStringImplMap(data: Iterable<[string, CalldataEncodable]>, to: string[]) {
    to.push("{");
    for (const [k, v] of data) {
      to.push(JSON.stringify(k));
      to.push(":");
      toStringImpl(v, to);
    }
    to.push("}");
  }

  function toStringImpl(data: CalldataEncodable, to: string[]) {
    if (data === null || data === undefined) {
      to.push("null");
      return;
    }
    if (data === true) {
      to.push("true");
      return;
    }
    if (data === false) {
      to.push("false");
      return;
    }
    switch (typeof data) {
      case "number": {
        if (!Number.isInteger(data)) {
          reportError("floats are not supported", data);
        }
        to.push(data.toString());
        return;
      }
      case "bigint": {
        to.push(data.toString());
        return;
      }
      case "string": {
        to.push(JSON.stringify(data));
        return;
      }
      case "object": {
        if (data instanceof Uint8Array) {
          to.push("b#");
          for (const b of data) {
            to.push(b.toString(16));
          }
        } else if (data instanceof Array) {
          to.push("[");
          for (const c of data) {
            toStringImpl(c, to);
            to.push(",");
          }
          to.push("]");
        } else if (data instanceof Map) {
          toStringImplMap(data.entries(), to);
        } else if (data instanceof CalldataAddress) {
          to.push("addr#");
          for (const c of data.bytes) {
            to.push(c.toString(16));
          }
        } else if (Object.getPrototypeOf(data) === Object.prototype) {
          toStringImplMap(Object.entries(data), to);
        } else {
          reportError("unknown object type", data);
        }
        return;
      }
      default:
        reportError("unknown base type", data);
    }
  }

  export function toString(data: CalldataEncodable): string {
    const to: string[] = [];
    toStringImpl(data, to);
    return to.join("");
  }
