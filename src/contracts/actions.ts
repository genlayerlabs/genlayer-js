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

export const contractActions = (client: GenLayerClient<GenLayerChain>, publicClient: PublicClient) => {
  return {
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

      const senderAddress = account?.address ?? client.account?.address;

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
    getContractPendingTransactionsCount: async (args: {
      address: Address;
    }): Promise<number> => {
      try {
        const result = await publicClient.readContract({
          address: client.chain.consensusDataContract?.address as Address,
          abi: client.chain.consensusDataContract?.abi as any,
          functionName: "getLatestPendingTxCount",
          args: [args.address],
        });
        return Number(result);
      } catch (error) {
        throw new Error(`Failed to get pending transactions count for contract ${args.address}: ${(error as Error).message}`);
      }
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
  return encodeFunctionData({
    abi: client.chain.consensusMainContract?.abi as any,
    functionName: "addTransaction",
    args: [
      validatedSenderAccount.address,
      recipient,
      client.chain.defaultNumberOfInitialValidators,
      consensusMaxRotations,
      data,
    ],
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
  const transactionRequest = await client.prepareTransactionRequest({
    account: validatedSenderAccount,
    to: client.chain.consensusMainContract?.address as Address,
    data: encodedData,
    type: "legacy",
    nonce: Number(nonce),
    value: value,
    gas: 21000n,
  });

  if (validatedSenderAccount?.type !== "local") {
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
  }

  if (!validatedSenderAccount?.signTransaction) {
    throw new Error("Account does not support signTransaction");
  }

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
};
