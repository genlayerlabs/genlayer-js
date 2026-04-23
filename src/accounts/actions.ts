import {GenLayerClient, TransactionHash, GenLayerChain, Address} from "../types";
import {localnet} from "../chains";

export function accountActions(client: GenLayerClient<GenLayerChain>) {
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
    /**
     * Returns the transaction count (next nonce) for an address.
     *
     * Defaults to `"pending"` so that rapid sequential submissions from the
     * same account receive distinct nonces. Two submissions issued before the
     * first confirms would otherwise both see the same `"latest"` count and
     * collide with an "already known" or "replacement underpriced" error.
     *
     * Pass `block: "latest"` explicitly for confirmed-only state
     * (e.g. reconciliation tooling comparing against on-chain finality).
     */
    getCurrentNonce: async ({
      address,
      block = "pending",
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
