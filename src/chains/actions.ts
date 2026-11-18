import {ChainSwitcher} from "@/types";

export function chainActions(_client: ChainSwitcher) {
  return {
    /**
     * @deprecated This method is deprecated and will be removed in a future release.
     * The consensus contract is now resolved from the static chain definition.
     */
    initializeConsensusSmartContract: async (_forceReset: boolean = false): Promise<void> => {
      console.warn(
        "[genlayer-js] initializeConsensusSmartContract() is deprecated and will be removed in a future release. " +
          "The consensus contract is now resolved from the static chain definition.",
      );
    },
  };
}
