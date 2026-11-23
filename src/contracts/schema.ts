import { hexToBytes } from 'viem';
import { CalldataAddress, type CalldataEncodable } from '@/types/calldata';
import type { ContractParamsSchema, ContractSchema } from '@/types/contracts';

export function buildGenVmPositionalArgs(options: {
  schema: ContractSchema;
  functionName: string;
  valuesByParamName: Record<string, unknown>;
  strictTypes?: boolean;
}): unknown[] {
  const { schema, functionName, valuesByParamName, strictTypes = true } =
    options;

  const method = schema.methods[functionName];
  if (!method) {
    throw new Error(`GenVM schema missing method: ${functionName}`);
  }

  return method.params.map(([name, type], index) => {
    if (!(name in valuesByParamName)) {
      throw new Error(
        `Missing argument "${name}" for ${functionName} (index ${index})`,
      );
    }

    const value = valuesByParamName[name];
    if (strictTypes && !validateValueAgainstType(value, type)) {
      throw new Error(
        `Invalid argument "${name}" for ${functionName} (index ${index})`,
      );
    }
    return value;
  });
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    !(value instanceof Map)
  );
}

function validateValueAgainstType(
  value: unknown,
  type: ContractParamsSchema,
): boolean {
  if (type === 'any') return true;
  if (type === 'null') return value === null;
  if (type === 'bool') return typeof value === 'boolean';
  if (type === 'string') return typeof value === 'string';
  if (type === 'bytes') {
    return typeof value === 'string' || value instanceof Uint8Array;
  }
  if (type === 'address') return typeof value === 'string';
  if (type === 'int') return typeof value === 'number' || typeof value === 'bigint';
  if (type === 'array') return Array.isArray(value);
  if (type === 'dict') return isPlainObject(value) || value instanceof Map;

  if (Array.isArray(type)) {
    if (!Array.isArray(value)) return false;

    // Repeated arrays are represented as: [{ "$rep": <schema> }]
    if (
      type.length === 1 &&
      typeof type[0] === 'object' &&
      type[0] !== null &&
      '$rep' in type[0]
    ) {
      const elementType = (type[0] as { $rep: ContractParamsSchema }).$rep;
      return value.every((v) => validateValueAgainstType(v, elementType));
    }

    // Tuple-like schemas exist, but we only validate repeated arrays strictly.
    return true;
  }

  if (isPlainObject(type)) {
    const orTypes = (type as { $or?: unknown }).$or;
    if (Array.isArray(orTypes)) {
      return orTypes.some((t) =>
        validateValueAgainstType(value, t as ContractParamsSchema),
      );
    }

    if ('$dict' in type) {
      const dictType = (type as { $dict: ContractParamsSchema }).$dict;

      if (value instanceof Map) {
        for (const v of value.values()) {
          if (!validateValueAgainstType(v, dictType)) return false;
        }
        return true;
      }

      if (!isPlainObject(value)) return false;
      return Object.values(value).every((v) =>
        validateValueAgainstType(v, dictType),
      );
    }

    // Struct-like dict schema: validate each provided key that exists in schema.
    if (isPlainObject(value)) {
      return Object.entries(type).every(([key, keyType]) => {
        if (!(key in value)) return true;
        return validateValueAgainstType(
          value[key],
          keyType as ContractParamsSchema,
        );
      });
    }
  }

  return true;
}

/** Interpret compatible wire values using the method's return type. */
export function decodeContractReturn(
  value: CalldataEncodable,
  schema: ContractParamsSchema | undefined,
): CalldataEncodable {
  const decoded = decodeReturnValue(value, schema, true);
  return decoded === undefined ? value : decoded;
}

function decodeReturnValue(
  value: CalldataEncodable,
  schema: ContractParamsSchema | { $rep: ContractParamsSchema } | undefined,
  coerce: boolean,
): CalldataEncodable | undefined {
  if (schema == null) return value;

  if (typeof schema === 'string') {
    if (schema === 'bytes' || schema === 'address') {
      if (schema === 'bytes' && value instanceof Uint8Array) return value;
      if (schema === 'address' && value instanceof CalldataAddress) return value;
      if (!coerce) return undefined;

      const bytes = value instanceof Uint8Array
        ? value
        : typeof value === 'string' && /^0x(?:[0-9a-fA-F]{2})*$/.test(value)
          ? hexToBytes(value as `0x${string}`)
          : undefined;
      if (schema === 'bytes') return bytes;
      return bytes?.length === 20 ? new CalldataAddress(bytes) : undefined;
    }
    if (schema === 'int' && coerce && typeof value === 'string' && /^-?\d+$/.test(value)) {
      return BigInt(value);
    }
    return validateValueAgainstType(value, schema) ? value : undefined;
  }

  if (Array.isArray(schema)) {
    if (!Array.isArray(value)) return undefined;
    const repeats = schema.flatMap((item, index) =>
      item && typeof item === 'object' && '$rep' in item ? [index] : [],
    );
    if (repeats.length > 1) return undefined;

    const repeatIndex = repeats[0];
    const repeatCount = value.length - schema.length + 1;
    if (repeatIndex !== undefined && repeatCount < 0) return undefined;

    const decoded = value.map((element, index) => {
      if (repeatIndex === undefined || index < repeatIndex) {
        return decodeReturnValue(element, schema[index], coerce);
      }
      if (index < repeatIndex + repeatCount) {
        const repeat = schema[repeatIndex] as { $rep: ContractParamsSchema };
        return decodeReturnValue(element, repeat.$rep, coerce);
      }
      return decodeReturnValue(element, schema[index - repeatCount + 1], coerce);
    });
    return decoded.every((element) => element !== undefined) ? decoded : undefined;
  }

  if (typeof schema !== 'object') return value;
  if ('$or' in schema && Array.isArray(schema.$or)) {
    const branches = schema.$or as ContractParamsSchema[];
    for (const branch of branches) {
      const decoded = decodeReturnValue(value, branch, false);
      if (decoded !== undefined) return decoded;
    }
    if (coerce) {
      for (const branch of branches) {
        const decoded = decodeReturnValue(value, branch, true);
        if (decoded !== undefined) return decoded;
      }
    }
    return undefined;
  }

  if (!(value instanceof Map)) return undefined;
  const fields = schema as Record<string, ContractParamsSchema>;
  const decoded = new Map<string, CalldataEncodable>();
  for (const [key, element] of value) {
    const field = '$dict' in fields
      ? fields.$dict
      : Object.prototype.hasOwnProperty.call(fields, key) ? fields[key] : undefined;
    const result = decodeReturnValue(element, field, coerce);
    if (result === undefined) return undefined;
    decoded.set(key, result);
  }
  return decoded;
}
