import {TransactionHash, GenLayerChain, Address, BaseActionsClient} from "../types";
import {localnet} from "../chains";

export function accountActions<TChain extends GenLayerChain>(client: BaseActionsClient<TChain>) {
  return {
    fundAccount: async ({address, amount}: {address: Address; amount: number}): Promise<TransactionHash> => {
      if (client.chain?.id !== localnet.id) {
        throw new Error("Client is not connected to the localnet");
      }

      return client.request({
        method: "sim_fundAccount",
        params: [address, amount],
      }) as Promise<TransactionHash>;
    },
    getCurrentNonce: async ({
      address,
      block = "latest",
    }: {
      address: Address;
      block?: string;
    }): Promise<number> => {
      const addressToUse = address || client.account?.address;

      if (!addressToUse) {
        throw new Error("No address provided and no account is connected");
      }
      return client.request({
        method: "eth_getTransactionCount",
        params: [addressToUse, block],
      }) as Promise<number>;
    },
  };
}
