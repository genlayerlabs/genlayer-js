import {encodeFunctionData, decodeFunctionResult} from "viem";
import {GenLayerClient, GenLayerChain, Address} from "@/types";
import {localnet} from "./localnet";
import {studionet} from "./studionet";
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

  const result = decodeFunctionResult({
    abi: ADDRESS_MANAGER_ABI,
    functionName: "getAddress",
    data: json.result as `0x${string}`,
  });

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

      const hasStaticConsensusContract =
        !!client.chain.consensusMainContract?.address &&
        !!client.chain.consensusMainContract?.abi;
      const isLocalOrStudioChain =
        client.chain?.id === localnet.id || client.chain?.id === studionet.id;

      if (
        !forceReset &&
        hasStaticConsensusContract &&
        !isLocalOrStudioChain
      ) {
        return;
      }

      try {
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

        if (
          consensusMainContract?.error ||
          !consensusMainContract?.result?.address ||
          !consensusMainContract?.result?.abi
        ) {
          throw new Error("ConsensusMain response did not include a valid contract");
        }

        client.chain.consensusMainContract = consensusMainContract.result;
        (client.chain as any).__consensusAbiFetchedFromRpc = true;
      } catch (error) {
        // Some local simulators don't expose sim_getConsensusContract.
        // If we already have a chain-baked consensus ABI, keep using it.
        if (hasStaticConsensusContract) {
          (client.chain as any).__consensusAbiFetchedFromRpc = false;
          return;
        }
        throw error;
      }
    },
  };
}
