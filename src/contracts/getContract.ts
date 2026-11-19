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

/** Methods without positional parameters may be called with no arguments at all. */
type CallParams<M, TOptions> = MethodArgs<M> extends readonly [] | []
  ? [args?: MethodArgs<M>, options?: TOptions]
  : [args: MethodArgs<M>, options?: TOptions];

export type TypedContract<TMethods extends ContractMethodsTypes<TMethods>> = {
  address: Address;
  /** Read-only (view) methods. Results are the JSON-safe values `readContract` returns by default. */
  read: {
    [K in ReadKeys<TMethods> & string]: (
      ...params: CallParams<TMethods[K], TypedReadOptions<MethodKwargs<TMethods[K]>>>
    ) => Promise<MethodReturns<TMethods[K]>>;
  };
  /** State-changing methods. Resolves to whatever `writeContract` resolves to (the transaction hash). */
  write: {
    [K in WriteKeys<TMethods> & string]: (
      ...params: CallParams<TMethods[K], TypedWriteOptions<MethodKwargs<TMethods[K]>>>
    ) => ReturnType<GenLayerClient<GenLayerChain>["writeContract"]>;
  };
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

  const methodProxy = (call: (functionName: string, args: unknown[] | undefined, options: Record<string, unknown>) => unknown) =>
    new Proxy({}, {
      get: (_target, functionName) => {
        if (typeof functionName !== "string" || functionName === "then") return undefined;
        return (args?: unknown[], options: Record<string, unknown> = {}) => call(functionName, args, options);
      },
    });

  return {
    address,
    read: methodProxy((functionName, args, options) =>
      client.readContract({
        ...options,
        address,
        functionName,
        args: (args ?? []) as CalldataEncodable[],
        kwargs: options.kwargs as {[key: string]: CalldataEncodable} | undefined,
        jsonSafeReturn: true,
      }),
    ) as TypedContract<TMethods>["read"],
    write: methodProxy((functionName, args, options) =>
      client.writeContract({
        ...options,
        address,
        functionName,
        args: (args ?? []) as CalldataEncodable[],
        kwargs: options.kwargs as {[key: string]: CalldataEncodable} | undefined,
      }),
    ) as TypedContract<TMethods>["write"],
  };
}
