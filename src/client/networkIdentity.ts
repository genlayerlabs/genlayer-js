import {GenLayerChain} from "@/types";

type Request = (args: {method: string; params?: any[]}) => Promise<any>;

/** Chain IDs are reused across Bradbury deployments; validate genesis and contract code. */
export async function assertNetworkIdentity(request: Request, chain: GenLayerChain): Promise<void> {
  if (!chain.genesisHash) return;
  const id = await request({method: "eth_chainId"});
  const block = await request({method: "eth_getBlockByNumber", params: ["0x0", false]});
  if (BigInt(id) !== BigInt(chain.id) || block?.hash?.toLowerCase() !== chain.genesisHash.toLowerCase()) {
    throw new Error("RPC network identity does not match Bradbury Phase 2; chain ID 4221 alone is insufficient.");
  }
  for (const contract of [chain.consensusMainContract, chain.stakingContract]) {
    if (!contract) continue;
    const code = await request({method: "eth_getCode", params: [contract.address, "latest"]});
    if (typeof code !== "string" || !/^0x[0-9a-f]+$/i.test(code) || code.length <= 2) {
      throw new Error("Bradbury Phase 2 contract code is missing from the configured RPC.");
    }
  }
}
