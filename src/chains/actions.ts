import {GenLayerClient, GenLayerChain} from "@/types";
import {localnet} from "./localnet";
import {studionet} from "./studionet";
import {testnetAsimov} from "./testnetAsimov";

export function chainActions(client: GenLayerClient<GenLayerChain>) {
  return {
    initializeConsensusSmartContract: async (forceReset: boolean = false): Promise<void> => {
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
