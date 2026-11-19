import type {
  Account,
  Address,
  BigNumberish,
  CalldataEncodable,
  GenLayerChain,
  GenLayerClient,
  TransactionFeeOptions,
  TransactionHashVariant,
} from "@/types";

/** Shape of one method entry in the `<Name>Methods` type emitted by `generateContractTypes`. */
export type ContractMethodTypes = {
  args: readonly unknown[];
  kwargs: object;
  returns: unknown;
  readonly: boolean;
  payable?: boolean;
};

/** Constraint satisfied by any `<Name>Methods` type emitted by `generateContractTypes`. */
export type ContractMethodsTypes<TMethods> = {[K in keyof TMethods]: ContractMethodTypes};

export type TypedReadOptions<TKwargs> = {
  account?: Account;
  kwargs?: TKwargs;
  leaderOnly?: boolean;
  transactionHashVariant?: TransactionHashVariant;
};

export type TypedWriteOptions<TKwargs> = {
  account?: Account;
  kwargs?: TKwargs;
  value?: bigint;
  leaderOnly?: boolean;
  consensusMaxRotations?: number;
  validUntil?: BigNumberish;
  fees?: TransactionFeeOptions;
};

type ReadKeys<TMethods> = {
  [K in keyof TMethods]: TMethods[K] extends {readonly: true} ? K : never;
}[keyof TMethods];

type WriteKeys<TMethods> = {
  [K in keyof TMethods]: TMethods[K] extends {readonly: true} ? never : K;
}[keyof TMethods];

type MethodArgs<M> = M extends {args: infer A} ? A : never;
type MethodKwargs<M> = M extends {kwargs: infer K} ? K : never;
type MethodReturns<M> = M extends {returns: infer R} ? R : never;

/** True when the kwargs type has at least one required key (generated kwargs are always required). */
type HasRequiredKwargs<TKwargs> = Record<string, never> extends TKwargs ? false : true;

/**
 * Methods with required keyword arguments must receive an options object carrying them.
 * Otherwise, methods without positional parameters may be called with no arguments at all.
 */
type CallParams<M, TOptions extends {kwargs?: unknown}> =
  HasRequiredKwargs<MethodKwargs<M>> extends true
    ? [args: MethodArgs<M>, options: Omit<TOptions, "kwargs"> & {kwargs: MethodKwargs<M>}]
    : MethodArgs<M> extends readonly [] | []
      ? [args?: MethodArgs<M>, options?: TOptions]
      : [args: MethodArgs<M>, options?: TOptions];

type ReadMethod<M> = (...params: CallParams<M, TypedReadOptions<MethodKwargs<M>>>) => Promise<MethodReturns<M>>;
/** `value` is only accepted by methods the schema marks as payable. */
type WriteOptionsFor<M> = M extends {payable: true}
  ? TypedWriteOptions<MethodKwargs<M>>
  : Omit<TypedWriteOptions<MethodKwargs<M>>, "value">;

type WriteMethod<M> = (
  ...params: CallParams<M, WriteOptionsFor<M>>
) => ReturnType<GenLayerClient<GenLayerChain>["writeContract"]>;

/**
 * Property names that runtimes, serialisers, loggers and devtools probe on arbitrary objects
 * (`await`, `JSON.stringify`, string coercion, `util.inspect`, …). The `read` / `write` proxies return
 * `undefined` for them so that merely inspecting a contract never sends a call or a transaction.
 * Contract methods with these names stay callable through `readMethod(name)` / `writeMethod(name)`.
 */
const RESERVED_PROXY_KEYS = [
  "then",
  "toJSON",
  "toString",
  "toLocaleString",
  "valueOf",
  "inspect",
  "constructor",
] as const;
type ReservedProxyKey = (typeof RESERVED_PROXY_KEYS)[number];
const RESERVED_PROXY_KEY_SET: ReadonlySet<string> = new Set(RESERVED_PROXY_KEYS);

type ProxyKey<K> = Exclude<K & string, ReservedProxyKey>;

export type TypedContract<TMethods extends ContractMethodsTypes<TMethods>> = {
  address: Address;
  /** Read-only (view) methods. Results are the JSON-safe values `readContract` returns by default. */
  read: {[K in ProxyKey<ReadKeys<TMethods>>]: ReadMethod<TMethods[K]>};
  /** State-changing methods. Resolves to whatever `writeContract` resolves to (the transaction hash). */
  write: {[K in ProxyKey<WriteKeys<TMethods>>]: WriteMethod<TMethods[K]>};
  /** Typed accessor for any read-only method by name, including ones the proxy cannot expose (`RESERVED_PROXY_KEYS`). */
  readMethod: <K extends ReadKeys<TMethods> & string>(functionName: K) => ReadMethod<TMethods[K]>;
  /** Typed accessor for any state-changing method by name, including ones the proxy cannot expose (`RESERVED_PROXY_KEYS`). */
  writeMethod: <K extends WriteKeys<TMethods> & string>(functionName: K) => WriteMethod<TMethods[K]>;
};

/**
 * Returns a typed view of a deployed contract, using the `<Name>Methods` type produced by
 * `generateContractTypes`. Reads and writes go through `client.readContract` / `client.writeContract`.
 *
 * @example
 * const storage = getContract<StorageMethods>({client, address});
 * const value = await storage.read.get_storage(); // typed as the schema's return type
 * const hash = await storage.write.update_storage(["new value"]);
 */
export function getContract<TMethods extends ContractMethodsTypes<TMethods>>(params: {
  client: GenLayerClient<GenLayerChain>;
  address: Address;
}): TypedContract<TMethods> {
  const {client, address} = params;

  type Call = (functionName: string, args: unknown[] | undefined, options: Record<string, unknown>) => unknown;
  const bind = (call: Call, functionName: string) =>
    (args?: unknown[], options: Record<string, unknown> = {}) => call(functionName, args, options);
  const methodProxy = (call: Call) =>
    new Proxy({}, {
      get: (_target, functionName) =>
        typeof functionName !== "string" || RESERVED_PROXY_KEY_SET.has(functionName)
          ? undefined
          : bind(call, functionName),
    });

  const read: Call = (functionName, args, options) =>
    client.readContract({
      ...options,
      address,
      functionName,
      args: (args ?? []) as CalldataEncodable[],
      kwargs: options.kwargs as {[key: string]: CalldataEncodable} | undefined,
      jsonSafeReturn: true,
    });
  const write: Call = (functionName, args, options) =>
    client.writeContract({
      ...options,
      address,
      functionName,
      args: (args ?? []) as CalldataEncodable[],
      kwargs: options.kwargs as {[key: string]: CalldataEncodable} | undefined,
    });

  return {
    address,
    read: methodProxy(read) as TypedContract<TMethods>["read"],
    write: methodProxy(write) as TypedContract<TMethods>["write"],
    readMethod: ((functionName: string) => bind(read, functionName)) as TypedContract<TMethods>["readMethod"],
    writeMethod: ((functionName: string) => bind(write, functionName)) as TypedContract<TMethods>["writeMethod"],
  };
}
