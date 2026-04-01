import * as calldata from "@/abi/calldata";
import {serialize} from "@/abi/transactions";
import {localnet} from "@/chains/localnet";
import {
  Account,
  ContractSchema,
  GenLayerChain,
  GenLayerClient,
  CalldataEncodable,
  Address,
  TransactionHashVariant,
} from "@/types";
import {fromHex, toHex, zeroAddress, encodeFunctionData, PublicClient, parseEventLogs, type Abi} from "viem";
import {TransactionHash} from "@/types/transactions";
import {toJsonSafeDeep, b64ToArray} from "@/utils/jsonifier";

/**
 * Extract hex data from a gen_call result.
 * Some RPCs return a bare hex string, others return an object like
 * { data: "hex...", status: { code, message }, ... }.
 */
function extractGenCallResult(result: unknown): `0x${string}` {
  if (typeof result === "string") {
    return `0x${result}` as `0x${string}`;
  }
  if (result && typeof result === "object" && "data" in result) {
    const obj = result as {data: string; status?: {code: number; message: string}};
    if (obj.status && obj.status.code !== 0) {
      throw new Error(`gen_call failed: ${obj.status.message}`);
    }
    return `0x${obj.data}` as `0x${string}`;
  }
  throw new Error(`Unexpected gen_call response: ${JSON.stringify(result)}`);
}

export const contractActions = (client: GenLayerClient<GenLayerChain>, publicClient: PublicClient) => {
  return {
    /** Retrieves the source code of a deployed contract. Localnet only. */
    getContractCode: async (address: Address): Promise<string> => {
      if (client.chain.id !== localnet.id) {
        throw new Error(`getContractCode is only available on localnet (current chain: ${client.chain.name})`);
      }
      const result = (await client.request({
        method: "gen_getContractCode",
        params: [address],
      })) as string;
      const codeBytes = b64ToArray(result);
      return new TextDecoder().decode(codeBytes);
    },
    /** Gets the schema (methods and constructor) of a deployed contract. Localnet only. */
    getContractSchema: async (address: Address): Promise<ContractSchema> => {
      if (client.chain.id !== localnet.id) {
        throw new Error(`getContractSchema is only available on localnet (current chain: ${client.chain.name})`);
      }
      const schema = (await client.request({
        method: "gen_getContractSchema",
        params: [address],
      })) as string;
      return schema as unknown as ContractSchema;
    },
    /** Generates a schema for contract code without deploying it. Localnet only. */
    getContractSchemaForCode: async (contractCode: string | Uint8Array): Promise<ContractSchema> => {
      if (client.chain.id !== localnet.id) {
        throw new Error(`getContractSchema is only available on localnet (current chain: ${client.chain.name})`);
      }
      const schema = (await client.request({
        method: "gen_getContractSchemaForCode",
        params: [toHex(contractCode)],
      })) as string;
      return schema as unknown as ContractSchema;
    },
    /** Executes a read-only contract call without modifying state. */
    readContract: async <RawReturn extends boolean | undefined>(args: {
      account?: Account;
      address: Address;
      functionName: string;
      args?: CalldataEncodable[];
      kwargs?: Map<string, CalldataEncodable> | {[key: string]: CalldataEncodable};
      rawReturn?: RawReturn;
      jsonSafeReturn?: boolean;
      leaderOnly?: boolean;
      transactionHashVariant?: TransactionHashVariant;
    }): Promise<RawReturn extends true ? `0x${string}` : CalldataEncodable> => {
      const {
        account,
        address,
        functionName,
        args: callArgs,
        kwargs,
        jsonSafeReturn = true,
        leaderOnly = false,
        transactionHashVariant = TransactionHashVariant.LATEST_NONFINAL,
      } = args;

      const encodedData = [calldata.encode(calldata.makeCalldataObject(functionName, callArgs, kwargs)), leaderOnly];
      const serializedData = serialize(encodedData);

      const senderAddress = account?.address ?? client.account?.address ?? zeroAddress;

      const requestParams = {
        type: "read",
        to: address,
        from: senderAddress,
        data: serializedData,
        transaction_hash_variant: transactionHashVariant,
      };
      const result = await client.request({
        method: "gen_call",
        params: [requestParams],
      });
      const prefixedResult = extractGenCallResult(result);

      if (args.rawReturn) {
        return prefixedResult;
      }
      const resultBinary = fromHex(prefixedResult, "bytes");
      const decoded = calldata.decode(resultBinary) as any;
      if (!jsonSafeReturn) {
        return decoded;
      }
      // If jsonSafeReturn is requested, convert to JSON-safe recursively
      return toJsonSafeDeep(decoded) as any;
    },
    /** Simulates a state-modifying contract call without executing on-chain. */
    simulateWriteContract: async <RawReturn extends boolean | undefined>(args: {
      account?: Account;
      address: Address;
      functionName: string;
      args?: CalldataEncodable[];
      kwargs?: Map<string, CalldataEncodable> | {[key: string]: CalldataEncodable};
      rawReturn?: RawReturn;
      leaderOnly?: boolean;
      transactionHashVariant?: TransactionHashVariant;
    }): Promise<RawReturn extends true ? `0x${string}` : CalldataEncodable> => {
      const {
        account,
        address,
        functionName,
        args: callArgs,
        kwargs,
        leaderOnly = false,
        transactionHashVariant = TransactionHashVariant.LATEST_NONFINAL,
      } = args;

      const encodedData = [calldata.encode(calldata.makeCalldataObject(functionName, callArgs, kwargs)), leaderOnly];
      const serializedData = serialize(encodedData);

      const senderAddress = account?.address ?? client.account?.address ?? zeroAddress;

      const requestParams = {
        type: "write",
        to: address,
        from: senderAddress,
        data: serializedData,
        transaction_hash_variant: transactionHashVariant,
      };
      const result = await client.request({
        method: "gen_call",
        params: [requestParams],
      });
      const prefixedResult = extractGenCallResult(result);

      if (args.rawReturn) {
        return prefixedResult;
      }
      const resultBinary = fromHex(prefixedResult, "bytes");
      return calldata.decode(resultBinary) as any;
    },
    /** Executes a state-modifying function on a contract through consensus. Returns the transaction hash. */
    writeContract: async (args: {
      account?: Account;
      address: Address;
      functionName: string;
      args?: CalldataEncodable[];
      kwargs?: Map<string, CalldataEncodable> | {[key: string]: CalldataEncodable};
      value: bigint;
      leaderOnly?: boolean;
      consensusMaxRotations?: number;
    }): Promise<`0x${string}`> => {
      const {
        account,
        address,
        functionName,
        args: callArgs,
        kwargs,
        value = 0n,
        leaderOnly = false,
        consensusMaxRotations = client.chain.defaultConsensusMaxRotations,
      } = args;

      const data = [calldata.encode(calldata.makeCalldataObject(functionName, callArgs, kwargs)), leaderOnly];
      const serializedData = serialize(data);
      const senderAccount = account || client.account;
      const {primaryEncodedData, fallbackEncodedData} = _encodeAddTransactionData({
        client,
        senderAccount,
        recipient: address,
        data: serializedData,
        consensusMaxRotations,
      });
      return _sendTransaction({
        client,
        publicClient,
        encodedData: primaryEncodedData,
        fallbackEncodedData,
        senderAccount,
        value,
      });
    },
    /** Deploys a new intelligent contract to GenLayer. Returns the transaction hash. */
    deployContract: async (args: {
      account?: Account;
      code: string | Uint8Array;
      args?: CalldataEncodable[];
      kwargs?: Map<string, CalldataEncodable> | {[key: string]: CalldataEncodable};
      leaderOnly?: boolean;
      consensusMaxRotations?: number;
    }) => {
      const {
        account,
        code,
        args: constructorArgs,
        kwargs,
        leaderOnly = false,
        consensusMaxRotations = client.chain.defaultConsensusMaxRotations,
      } = args;

      const data = [
        code,
        calldata.encode(calldata.makeCalldataObject(undefined, constructorArgs, kwargs)),
        leaderOnly,
      ];
      const serializedData = serialize(data);
      const senderAccount = account || client.account;
      const {primaryEncodedData, fallbackEncodedData} = _encodeAddTransactionData({
        client,
        senderAccount,
        recipient: zeroAddress,
        data: serializedData,
        consensusMaxRotations,
      });
      return _sendTransaction({
        client,
        publicClient,
        encodedData: primaryEncodedData,
        fallbackEncodedData,
        senderAccount,
      });
    },
    /** Calculates the minimum bond required to appeal a transaction. */
    getMinAppealBond: async (args: {txId: `0x${string}`}): Promise<bigint> => {
      const {txId} = args;

      if (!client.chain.feeManagerContract?.address || !client.chain.roundsStorageContract?.address) {
        throw new Error("Appeal bond calculation not supported on this chain (missing feeManagerContract/roundsStorageContract)");
      }

      const roundNumber = await publicClient.readContract({
        address: client.chain.roundsStorageContract.address as `0x${string}`,
        abi: client.chain.roundsStorageContract.abi as Abi,
        functionName: "getRoundNumber",
        args: [txId],
      }) as bigint;

      const transaction = await client.getTransaction({hash: txId as TransactionHash});
      const txStatus = Number(transaction.status);

      const minBond = await publicClient.readContract({
        address: client.chain.feeManagerContract.address as `0x${string}`,
        abi: client.chain.feeManagerContract.abi as Abi,
        functionName: "calculateMinAppealBond",
        args: [txId, roundNumber, txStatus],
      }) as bigint;

      return minBond;
    },
    /** Returns the current consensus round number for a transaction. */
    getRoundNumber: async (args: {txId: `0x${string}`}): Promise<bigint> => {
      if (!client.chain.roundsStorageContract?.address) {
        throw new Error("getRoundNumber not supported on this chain (missing roundsStorageContract)");
      }
      return publicClient.readContract({
        address: client.chain.roundsStorageContract.address as `0x${string}`,
        abi: client.chain.roundsStorageContract.abi as Abi,
        functionName: "getRoundNumber",
        args: [args.txId],
      }) as Promise<bigint>;
    },
    /** Returns detailed data for a specific consensus round. */
    getRoundData: async (args: {txId: `0x${string}`; round: bigint}) => {
      if (!client.chain.roundsStorageContract?.address) {
        throw new Error("getRoundData not supported on this chain (missing roundsStorageContract)");
      }
      return publicClient.readContract({
        address: client.chain.roundsStorageContract.address as `0x${string}`,
        abi: client.chain.roundsStorageContract.abi as Abi,
        functionName: "getRoundData",
        args: [args.txId, args.round],
      });
    },
    /** Returns the current round number and its data for a transaction. */
    getLastRoundData: async (args: {txId: `0x${string}`}) => {
      if (!client.chain.roundsStorageContract?.address) {
        throw new Error("getLastRoundData not supported on this chain (missing roundsStorageContract)");
      }
      return publicClient.readContract({
        address: client.chain.roundsStorageContract.address as `0x${string}`,
        abi: client.chain.roundsStorageContract.abi as Abi,
        functionName: "getLastRoundData",
        args: [args.txId],
      });
    },
    /** Checks if a transaction can be appealed. */
    canAppeal: async (args: {txId: `0x${string}`}): Promise<boolean> => {
      if (!client.chain.appealsContract?.address) {
        throw new Error("canAppeal not supported on this chain (missing appealsContract)");
      }
      return publicClient.readContract({
        address: client.chain.appealsContract.address as `0x${string}`,
        abi: client.chain.appealsContract.abi as Abi,
        functionName: "canAppeal",
        args: [args.txId],
      }) as Promise<boolean>;
    },
    /** Appeals a consensus transaction to trigger a new round of validation. */
    appealTransaction: async (args: {
      account?: Account;
      txId: `0x${string}`;
      value?: bigint;
    }) => {
      const {account, txId} = args;
      let {value} = args;

      if (value === undefined) {
        if (client.chain.feeManagerContract?.address && client.chain.roundsStorageContract?.address) {
          const roundNumber = await publicClient.readContract({
            address: client.chain.roundsStorageContract.address as `0x${string}`,
            abi: client.chain.roundsStorageContract.abi as Abi,
            functionName: "getRoundNumber",
            args: [txId],
          }) as bigint;

          const transaction = await client.getTransaction({hash: txId as TransactionHash});
          const txStatus = Number(transaction.status);

          value = await publicClient.readContract({
            address: client.chain.feeManagerContract.address as `0x${string}`,
            abi: client.chain.feeManagerContract.abi as Abi,
            functionName: "calculateMinAppealBond",
            args: [txId, roundNumber, txStatus],
          }) as bigint;
        } else {
          value = 0n;
        }
      }

      const senderAccount = account || client.account;
      const encodedData = _encodeSubmitAppealData({client, txId});
      const validatedAccount = validateAccount(senderAccount);

      // Appeals don't go through _sendTransaction because submitAppeal emits
      // AppealStarted/TransactionActivated events, not NewTransaction/CreatedTransaction.
      // The appeal operates on the same GenLayer txId, so we return it directly.
      if (!client.chain.consensusMainContract?.address) {
        throw new Error("Consensus main contract not initialized.");
      }

      const nonce = await client.getCurrentNonce({address: validatedAccount.address});

      let estimatedGas: bigint;
      try {
        estimatedGas = await client.estimateTransactionGas({
          to: client.chain.consensusMainContract.address,
          data: encodedData,
          value,
          nonce,
        });
      } catch (err) {
        console.error("Gas estimation failed, using default 200_000:", err);
        estimatedGas = 200_000n;
      }

      const gasPriceHex = (await client.request({method: "eth_gasPrice"})) as string;

      const txRequest = {
        account: validatedAccount,
        to: client.chain.consensusMainContract.address as `0x${string}`,
        data: encodedData,
        value,
        gas: estimatedGas,
        gasPrice: BigInt(gasPriceHex),
        nonce,
        chainId: client.chain.id,
      };

      if (validatedAccount.type === "local") {
        if (!validatedAccount.signTransaction) {
          throw new Error("Local account does not support signTransaction.");
        }
        const serializedTransaction = await validatedAccount.signTransaction(txRequest);
        const evmHash = await client.sendRawTransaction({serializedTransaction});
        const receipt = await publicClient.waitForTransactionReceipt({hash: evmHash});
        if (receipt.status === "reverted") {
          throw new Error(`Appeal reverted: EVM tx ${evmHash}`);
        }
      } else {
        const evmHash = (await client.request({
          method: "eth_sendTransaction",
          params: [{
            from: validatedAccount.address,
            to: client.chain.consensusMainContract.address,
            data: encodedData,
            value: value ? (`0x${value.toString(16)}` as `0x${string}`) : undefined,
            gas: `0x${estimatedGas.toString(16)}` as `0x${string}`,
          }],
        })) as `0x${string}`;
        const receipt = await publicClient.waitForTransactionReceipt({hash: evmHash});
        if (receipt.status === "reverted") {
          throw new Error(`Appeal reverted: EVM tx ${evmHash}`);
        }
      }

      return txId;
    },
  };
};

const validateAccount = (Account?: Account): Account => {
  if (!Account) {
    throw new Error(
      "No account set. Configure the client with an account or pass an account to this function.",
    );
  }
  return Account;
};

const CREATED_TRANSACTION_EVENT_ABI = [
  {
    anonymous: false,
    inputs: [
      {indexed: true, internalType: "bytes32", name: "txId", type: "bytes32"},
      {indexed: false, internalType: "uint256", name: "txSlot", type: "uint256"},
    ],
    name: "CreatedTransaction",
    type: "event",
  },
] as const;

const ADD_TRANSACTION_ABI_V5 = [
  {
    type: "function",
    name: "addTransaction",
    stateMutability: "nonpayable",
    inputs: [
      {name: "_sender", type: "address"},
      {name: "_recipient", type: "address"},
      {name: "_numOfInitialValidators", type: "uint256"},
      {name: "_maxRotations", type: "uint256"},
      {name: "_txData", type: "bytes"},
    ],
    outputs: [],
  },
] as const;

const ADD_TRANSACTION_ABI_V6 = [
  {
    type: "function",
    name: "addTransaction",
    stateMutability: "nonpayable",
    inputs: [
      {name: "_sender", type: "address"},
      {name: "_recipient", type: "address"},
      {name: "_numOfInitialValidators", type: "uint256"},
      {name: "_maxRotations", type: "uint256"},
      {name: "_txData", type: "bytes"},
      {name: "_validUntil", type: "uint256"},
    ],
    outputs: [],
  },
] as const;

const getAddTransactionInputCount = (abi: readonly unknown[] | undefined): number => {
  if (!abi || !Array.isArray(abi)) {
    return 0;
  }

  const addTransactionFunction = abi.find(item => {
    if (!item || typeof item !== "object") {
      return false;
    }

    const candidate = item as {type?: string; name?: string};
    return candidate.type === "function" && candidate.name === "addTransaction";
  }) as {inputs?: readonly unknown[]} | undefined;

  return Array.isArray(addTransactionFunction?.inputs) ? addTransactionFunction.inputs.length : 0;
};

const _encodeAddTransactionData = ({
  client,
  senderAccount,
  recipient,
  data,
  consensusMaxRotations = client.chain.defaultConsensusMaxRotations,
}: {
  client: GenLayerClient<GenLayerChain>;
  senderAccount?: Account;
  recipient?: `0x${string}`;
  data?: `0x${string}`;
  consensusMaxRotations?: number;
}): {primaryEncodedData: `0x${string}`; fallbackEncodedData: `0x${string}`} => {
  const validatedSenderAccount = validateAccount(senderAccount);

  const addTransactionArgs: [
    Address,
    `0x${string}` | undefined,
    number,
    number | undefined,
    `0x${string}` | undefined,
  ] = [
    validatedSenderAccount.address,
    recipient,
    client.chain.defaultNumberOfInitialValidators,
    consensusMaxRotations,
    data,
  ];

  const encodedDataV5 = encodeFunctionData({
    abi: ADD_TRANSACTION_ABI_V5 as any,
    functionName: "addTransaction",
    args: addTransactionArgs,
  });

  const encodedDataV6 = encodeFunctionData({
    abi: ADD_TRANSACTION_ABI_V6 as any,
    functionName: "addTransaction",
    args: [...addTransactionArgs, 0n],
  });

  if (getAddTransactionInputCount(client.chain.consensusMainContract?.abi) >= 6) {
    return {
      primaryEncodedData: encodedDataV6,
      fallbackEncodedData: encodedDataV5,
    };
  }

  return {
    primaryEncodedData: encodedDataV5,
    fallbackEncodedData: encodedDataV6,
  };
};

const _encodeSubmitAppealData = ({
  client,
  txId,
}: {
  client: GenLayerClient<GenLayerChain>;
  txId: `0x${string}`;
}): `0x${string}` => {
  return encodeFunctionData({
    abi: client.chain.consensusMainContract?.abi as any,
    functionName: "submitAppeal",
    args: [txId],
  });
};

const isAddTransactionAbiMismatchError = (error: unknown): boolean => {
  const seen = new WeakSet<object>();
  const serializedError =
    typeof error === "object" && error !== null
      ? JSON.stringify(error, (_key, value) => {
        if (typeof value === "bigint") {
          return value.toString();
        }

        if (typeof value === "object" && value !== null) {
          if (seen.has(value as object)) {
            return "[Circular]";
          }
          seen.add(value as object);
        }

        return value;
      })
      : "";
  const errorObject = error as {shortMessage?: string; details?: string; message?: string};
  const errorMessage = [
    errorObject?.shortMessage,
    errorObject?.details,
    errorObject?.message,
    serializedError,
    String(error ?? ""),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return (
    errorMessage.includes("invalid pointer in tuple") ||
    errorMessage.includes("invalid pointer") ||
    errorMessage.includes("could not decode") ||
    errorMessage.includes("invalid arrayify value") ||
    errorMessage.includes("types/value length mismatch")
  );
};

/**
 * Extracts the GenLayer txId from receipt logs by checking for either
 * NewTransaction (immediately activated) or CreatedTransaction (queued) events.
 */
const extractTxIdFromLogs = (
  client: GenLayerClient<GenLayerChain>,
  logs: any[],
): `0x${string}` | null => {
  const newTxEvents = parseEventLogs({
    abi: client.chain.consensusMainContract?.abi as any,
    eventName: "NewTransaction",
    logs,
  }) as unknown as {args: {txId: `0x${string}`}}[];

  if (newTxEvents.length > 0) {
    return newTxEvents[0].args["txId"];
  }

  const createdTxEvents = parseEventLogs({
    abi: CREATED_TRANSACTION_EVENT_ABI as any,
    eventName: "CreatedTransaction",
    logs,
  }) as unknown as {args: {txId: `0x${string}`}}[];

  if (createdTxEvents.length > 0) {
    return createdTxEvents[0].args["txId"];
  }

  return null;
};

const _sendTransaction = async ({
  client,
  publicClient,
  encodedData,
  fallbackEncodedData,
  senderAccount,
  value = 0n,
}: {
  client: GenLayerClient<GenLayerChain>;
  publicClient: PublicClient;
  encodedData: `0x${string}`;
  fallbackEncodedData?: `0x${string}`;
  senderAccount?: Account;
  value?: bigint;
}) => {
  if (!client.chain.consensusMainContract?.address) {
    throw new Error(`Consensus main contract address not found in chain config for "${client.chain.name}".`);
  }

  const validatedSenderAccount = validateAccount(senderAccount);
  const nonce = await client.getCurrentNonce({address: validatedSenderAccount.address});

  const sendWithEncodedData = async (encodedDataForSend: `0x${string}`) => {
    let estimatedGas: bigint;
    try {
      estimatedGas = await client.estimateTransactionGas({
        from: validatedSenderAccount.address,
        to: client.chain.consensusMainContract?.address as Address,
        data: encodedDataForSend,
        value: value,
      });
    } catch (err) {
      console.error("Gas estimation failed, using default 200_000:", err);
      estimatedGas = 200_000n;
    }

    // For local accounts, build transaction request directly to avoid viem's
    // prepareTransactionRequest which calls eth_fillTransaction (unsupported by GenLayer RPC)
    if (validatedSenderAccount?.type === "local") {
      if (!validatedSenderAccount?.signTransaction) {
        throw new Error("Local account does not support signTransaction. Use a private key account created via privateKeyToAccount().");
      }

      const gasPriceHex = (await client.request({
        method: "eth_gasPrice",
      })) as string;

      const transactionRequest = {
        account: validatedSenderAccount,
        to: client.chain.consensusMainContract?.address as Address,
        data: encodedDataForSend,
        type: "legacy" as const,
        nonce: Number(nonce),
        value: value,
        gas: estimatedGas,
        gasPrice: BigInt(gasPriceHex),
        chainId: client.chain.id,
      };

      const serializedTransaction = await validatedSenderAccount.signTransaction(transactionRequest);
      const txHash = await client.sendRawTransaction({serializedTransaction: serializedTransaction});
      const receipt = await publicClient.waitForTransactionReceipt({hash: txHash});

      if (receipt.status === "reverted") {
        throw new Error(`Transaction reverted: EVM tx ${txHash} to consensus contract ${client.chain.consensusMainContract?.address} was reverted.`);
      }

      const txId = extractTxIdFromLogs(client, receipt.logs);
      if (!txId) {
        throw new Error(
          `Transaction not processed by consensus: EVM tx ${txHash} succeeded but no NewTransaction or CreatedTransaction event was found in the receipt logs.`,
        );
      }

      return txId;
    }

    // For injected/external wallets (e.g. MetaMask), avoid viem's
    // prepareTransactionRequest() because it may call eth_fillTransaction and
    // eth_getBlockByNumber, which are not available on all GenLayer-compatible RPCs.
    let gasPriceHex: `0x${string}` | undefined;
    try {
      const gasPriceResult = await client.request({
        method: "eth_gasPrice",
      });
      if (typeof gasPriceResult === "string") {
        gasPriceHex = gasPriceResult as `0x${string}`;
      }
    } catch (error) {
      console.warn("Failed to fetch gas price, delegating gas price selection to wallet:", error);
    }

    const nonceBigInt =
      typeof nonce === "bigint"
        ? nonce
        : typeof nonce === "string"
          ? BigInt(nonce)
          : BigInt(Number(nonce));

    const formattedRequest = {
      from: validatedSenderAccount.address,
      to: client.chain.consensusMainContract?.address as Address,
      data: encodedDataForSend,
      value: `0x${value.toString(16)}`,
      gas: `0x${estimatedGas.toString(16)}`,
      nonce: `0x${nonceBigInt.toString(16)}`,
      type: "0x0", // legacy tx
      chainId: `0x${client.chain.id.toString(16)}`,
      ...(gasPriceHex ? {gasPrice: gasPriceHex} : {}),
    };

    const evmTxHash = (await client.request({
      method: "eth_sendTransaction",
      params: [formattedRequest as any],
    })) as `0x${string}`;

    // Extract GenLayer txId from the NewTransaction event, same as local account path.
    // On studio RPCs this may already be the GenLayer txId, but on testnets
    // eth_sendTransaction returns the EVM tx hash which is not the GenLayer tx ID.
    const externalReceipt = await publicClient.waitForTransactionReceipt({hash: evmTxHash});

    if (externalReceipt.status === "reverted") {
      throw new Error(`Transaction reverted: EVM tx ${evmTxHash} to consensus contract ${client.chain.consensusMainContract?.address} was reverted.`);
    }

    const externalTxId = extractTxIdFromLogs(client, externalReceipt.logs);
    if (!externalTxId) {
      throw new Error(
        `Transaction not processed by consensus: EVM tx ${evmTxHash} succeeded but no NewTransaction or CreatedTransaction event was found in the receipt logs.`,
      );
    }

    return externalTxId;
  };

  try {
    return await sendWithEncodedData(encodedData);
  } catch (error) {
    if (!fallbackEncodedData || !isAddTransactionAbiMismatchError(error)) {
      throw error;
    }
    return await sendWithEncodedData(fallbackEncodedData);
  }
};
