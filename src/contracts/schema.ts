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

/** Checks decoded calldata before JSON-safe conversion erases wire type distinctions. */
export function matchesReturnSchema(
  value: CalldataEncodable,
  schema: ContractParamsSchema,
): boolean {
  if (typeof schema === 'string') {
    switch (schema) {
      case 'null': return value === null;
      case 'bool': return typeof value === 'boolean';
      case 'int': return typeof value === 'bigint';
      case 'string': return typeof value === 'string';
      case 'address': return value instanceof CalldataAddress;
      case 'bytes': return value instanceof Uint8Array;
      case 'array': return Array.isArray(value);
      case 'dict': return value instanceof Map;
      default: return true;
    }
  }

  if (Array.isArray(schema)) {
    if (!Array.isArray(value)) return false;

    for (const [index, item] of schema.entries()) {
      if (typeof item === 'object' && !Array.isArray(item) && '$rep' in item) {
        return index === schema.length - 1 &&
          value.slice(index).every((element) => matchesReturnSchema(element, item.$rep));
      }
      if (index >= value.length || !matchesReturnSchema(value[index], item)) return false;
    }
    return value.length === schema.length;
  }

  if ('$or' in schema && Array.isArray(schema.$or)) {
    return (schema.$or as ContractParamsSchema[]).some((branch) => matchesReturnSchema(value, branch));
  }
  if (!(value instanceof Map)) return false;
  if ('$dict' in schema) {
    return Array.from(value.values()).every((element) => matchesReturnSchema(element, schema.$dict));
  }
  return Object.entries(schema).every(([key, field]) =>
    value.has(key) && matchesReturnSchema(value.get(key)!, field),
  );
}
