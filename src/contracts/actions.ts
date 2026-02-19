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
import {fromHex, toHex, zeroAddress, encodeFunctionData, PublicClient, parseEventLogs} from "viem";
import {toJsonSafeDeep, b64ToArray} from "@/utils/jsonifier";

export const contractActions = (client: GenLayerClient<GenLayerChain>, publicClient: PublicClient) => {
  return {
    getContractCode: async (address: Address): Promise<string> => {
      if (client.chain.id !== localnet.id) {
        throw new Error("Getting contract code is not supported on this network");
      }
      const result = (await client.request({
        method: "gen_getContractCode",
        params: [address],
      })) as string;
      const codeBytes = b64ToArray(result);
      return new TextDecoder().decode(codeBytes);
    },
    getContractSchema: async (address: Address): Promise<ContractSchema> => {
      if (client.chain.id !== localnet.id) {
        throw new Error("Contract schema is not supported on this network");
      }
      const schema = (await client.request({
        method: "gen_getContractSchema",
        params: [address],
      })) as string;
      return schema as unknown as ContractSchema;
    },
    getContractSchemaForCode: async (contractCode: string | Uint8Array): Promise<ContractSchema> => {
      if (client.chain.id !== localnet.id) {
        throw new Error("Contract schema is not supported on this network");
      }
      const schema = (await client.request({
        method: "gen_getContractSchemaForCode",
        params: [toHex(contractCode)],
      })) as string;
      return schema as unknown as ContractSchema;
    },
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
        jsonSafeReturn = false,
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
      const prefixedResult = `0x${result}` as `0x${string}`;

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
      const prefixedResult = `0x${result}` as `0x${string}`;

      if (args.rawReturn) {
        return prefixedResult;
      }
      const resultBinary = fromHex(prefixedResult, "bytes");
      return calldata.decode(resultBinary) as any;
    },
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

      await client.initializeConsensusSmartContract();

      const data = [calldata.encode(calldata.makeCalldataObject(functionName, callArgs, kwargs)), leaderOnly];
      const serializedData = serialize(data);
      const senderAccount = account || client.account;
      const encodedData = _encodeAddTransactionData({
        client,
        senderAccount,
        recipient: address,
        data: serializedData,
        consensusMaxRotations,
      });
      return _sendTransaction({
        client,
        publicClient,
        encodedData,
        senderAccount,
        value,
      });
    },
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

      await client.initializeConsensusSmartContract();

      const data = [
        code,
        calldata.encode(calldata.makeCalldataObject(undefined, constructorArgs, kwargs)),
        leaderOnly,
      ];
      const serializedData = serialize(data);
      const senderAccount = account || client.account;
      const encodedData = _encodeAddTransactionData({
        client,
        senderAccount,
        recipient: zeroAddress,
        data: serializedData,
        consensusMaxRotations,
      });
      return _sendTransaction({
        client,
        publicClient,
        encodedData,
        senderAccount,
      });
    },
    appealTransaction: async (args: {
      account?: Account;
      txId: `0x${string}`;
    }) => {
      const {account, txId} = args;
      const senderAccount = account || client.account;
      const encodedData = _encodeSubmitAppealData({client, txId});
      return _sendTransaction({
        client,
        publicClient,
        encodedData,
        senderAccount,
      });
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
}): `0x${string}` => {
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

  if (getAddTransactionInputCount(client.chain.consensusMainContract?.abi) >= 6) {
    return encodeFunctionData({
      abi: ADD_TRANSACTION_ABI_V6 as any,
      functionName: "addTransaction",
      args: [...addTransactionArgs, 0n],
    });
  }

  return encodeFunctionData({
    abi: ADD_TRANSACTION_ABI_V5 as any,
    functionName: "addTransaction",
    args: addTransactionArgs,
  });
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

const _sendTransaction = async ({
  client,
  publicClient,
  encodedData,
  senderAccount,
  value = 0n,
}: {
  client: GenLayerClient<GenLayerChain>;
  publicClient: PublicClient;
  encodedData: `0x${string}`;
  senderAccount?: Account;
  value?: bigint;
}) => {
  if (!client.chain.consensusMainContract?.address) {
    throw new Error("Consensus main contract not initialized. Please ensure client is properly initialized.");
  }

  const validatedSenderAccount = validateAccount(senderAccount);
  const nonce = await client.getCurrentNonce({address: validatedSenderAccount.address});

  let estimatedGas: bigint;
  try {
    estimatedGas = await client.estimateTransactionGas({
      from: validatedSenderAccount.address,
      to: client.chain.consensusMainContract?.address as Address,
      data: encodedData,
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
      throw new Error("Account does not support signTransaction");
    }

    const gasPriceHex = (await client.request({
      method: "eth_gasPrice",
    })) as string;

    const transactionRequest = {
      account: validatedSenderAccount,
      to: client.chain.consensusMainContract?.address as Address,
      data: encodedData,
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
      throw new Error("Transaction reverted");
    }

    const newTxEvents = parseEventLogs({
      abi: client.chain.consensusMainContract?.abi as any,
      eventName: "NewTransaction",
      logs: receipt.logs,
    }) as unknown as {args: {txId: `0x${string}`}}[];

    if (newTxEvents.length === 0) {
      throw new Error("Transaction not processed by consensus");
    }

    return newTxEvents[0].args["txId"];
  }

  // For external wallets (e.g., MetaMask via AppKit), use prepareTransactionRequest
  // which will route eth_* calls through the provider
  const transactionRequest = await client.prepareTransactionRequest({
    account: validatedSenderAccount,
    to: client.chain.consensusMainContract?.address as Address,
    data: encodedData,
    type: "legacy",
    nonce: Number(nonce),
    value: value,
    gas: estimatedGas,
  });

  const formattedRequest = {
    from: transactionRequest.from,
    to: transactionRequest.to,
    data: encodedData,
    value: transactionRequest.value ? `0x${transactionRequest.value.toString(16)}` : "0x0",
    gas: transactionRequest.gas ? `0x${transactionRequest.gas.toString(16)}` : "0x5208",
  };

  return await client.request({
    method: "eth_sendTransaction",
    params: [formattedRequest as any],
  });
};
