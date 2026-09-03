import {Address as ViemAddress, PublicClient, TransactionReceipt} from "viem";
import {GenLayerClient, TransactionHash, GenLayerChain, Address} from "../types";
import {localnet} from "../chains";

export function accountActions(client: GenLayerClient<GenLayerChain>, publicClient: PublicClient) {
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
      const count = await client.request({
        method: "eth_getTransactionCount",
        params: [addressToUse, block],
      });
      // The RPC returns a hex quantity string; callers (and the declared return
      // type) expect a number. Passing the raw string into viem's transaction
      // serializer encodes the ASCII characters as the nonce bytes.
      return Number(count);
    },
    /**
     * Sends a native GEN transfer from the connected account.
     *
     * Local-key only: mirrors the staking/vesting executeWrite local lane 1:1
     * (estimateGas → pending nonce → legacy prepareTransactionRequest → sign →
     * sendRawTransaction → wait for receipt). Address-only / injected-provider
     * accounts are intentionally rejected — provider-signed transfers are the
     * wallet's own responsibility.
     */
    transfer: async ({to, value}: {to: Address; value: bigint}): Promise<TransactionReceipt> => {
      const account = client.account;
      if (!account || account.type !== "local" || !account.signTransaction) {
        throw new Error(
          "transfer requires a local-key account. Initialize the client with a private-key account created via createAccount().",
        );
      }

      let gasLimit: bigint;
      try {
        gasLimit = await publicClient.estimateGas({
          account,
          to: to as ViemAddress,
          value,
        });
      } catch {
        gasLimit = 21000n;
      }

      const nonce = await publicClient.getTransactionCount({
        address: account.address as ViemAddress,
        blockTag: "pending",
      });

      const txRequest = await publicClient.prepareTransactionRequest({
        account,
        to: to as ViemAddress,
        value,
        type: "legacy",
        nonce,
        gas: gasLimit,
        chain: client.chain,
      });

      const signTransaction = account.signTransaction;
      const serializedTx = await signTransaction(txRequest as Parameters<typeof signTransaction>[0]);
      const hash = await publicClient.sendRawTransaction({serializedTransaction: serializedTx});
      const receipt = await publicClient.waitForTransactionReceipt({hash});

      if (receipt.status === "reverted") {
        throw new Error(`Transfer reverted (tx: ${hash})`);
      }

      return receipt;
    },
  };
}
