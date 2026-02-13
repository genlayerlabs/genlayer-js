import {encodeFunctionData, decodeFunctionResult} from "viem";
import {GenLayerClient, GenLayerChain, Address} from "@/types";
import {testnetAsimov} from "./testnetAsimov";

const ADDRESS_MANAGER_ABI = [
  {
    inputs: [{internalType: "string", name: "name", type: "string"}],
    name: "getAddress",
    outputs: [{internalType: "address", name: "", type: "address"}],
    stateMutability: "view",
    type: "function",
  },
] as const;

async function resolveFromAddressManager(
  rpcUrl: string,
  addressManagerAddress: Address,
  name: string,
): Promise<Address> {
  const data = encodeFunctionData({
    abi: ADDRESS_MANAGER_ABI,
    functionName: "getAddress",
    args: [name],
  });

  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now(),
      method: "eth_call",
      params: [{to: addressManagerAddress, data}, "latest"],
    }),
  });

  const json = (await response.json()) as {result?: string; error?: {message: string}};
  if (json.error) {
    throw new Error(`AddressManager.getAddress("${name}") failed: ${json.error.message}`);
  }

  if (!json.result || json.result === "0x" || json.result === "0x0") {
    throw new Error(
      `AddressManager at ${addressManagerAddress} returned empty data for "${name}". ` +
        `The AddressManager contract may not be deployed at this address.`,
    );
  }

  const result = decodeFunctionResult({
    abi: ADDRESS_MANAGER_ABI,
    functionName: "getAddress",
    data: json.result as `0x${string}`,
  });

  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
  if (result === ZERO_ADDRESS) {
    throw new Error(
      `AddressManager at ${addressManagerAddress} returned zero address for "${name}". ` +
        `The contract name may not be registered.`,
    );
  }

  return result as Address;
}

export function chainActions(client: GenLayerClient<GenLayerChain>) {
  return {
    initializeConsensusSmartContract: async (forceReset: boolean = false): Promise<void> => {
      // Resolve addresses from AddressManager if configured
      if (client.chain.addressManagerAddress) {
        const rpcUrl = client.chain.rpcUrls.default.http[0];

        if (client.chain.consensusMainContract) {
          const mainAddress = await resolveFromAddressManager(
            rpcUrl,
            client.chain.addressManagerAddress,
            "ConsensusMain",
          );
          client.chain.consensusMainContract = {
            ...client.chain.consensusMainContract,
            address: mainAddress,
          };
        }

        if (client.chain.consensusDataContract) {
          const dataAddress = await resolveFromAddressManager(
            rpcUrl,
            client.chain.addressManagerAddress,
            "ConsensusData",
          );
          client.chain.consensusDataContract = {
            ...client.chain.consensusDataContract,
            address: dataAddress,
          };
        }

        return;
      }

      if (client.chain?.id === testnetAsimov.id) {
        return;
      }

      if (
        !forceReset &&
        client.chain.consensusMainContract?.address &&
        client.chain.consensusMainContract?.abi
      ) {
        return;
      }

      const contractsResponse = await fetch(client.chain.rpcUrls.default.http[0], {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: Date.now(),
          method: "sim_getConsensusContract",
          params: ["ConsensusMain"],
        }),
      });

      if (!contractsResponse.ok) {
        throw new Error("Failed to fetch ConsensusMain contract");
      }

      const consensusMainContract = await contractsResponse.json();
      client.chain.consensusMainContract = consensusMainContract.result;
    },
  };
}
