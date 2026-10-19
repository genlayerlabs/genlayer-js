import {GenLayerChain} from "@/types";
import {decodeFunctionResult, encodeFunctionData, parseAbi} from "viem";

type Request = (args: {method: string; params?: any[]}) => Promise<any>;
export const ADDRESS_MANAGER_ABI = parseAbi(["function getAddress(string key) view returns (address)"]);

/** Validate deployment identity separately from the SDK's qualified contract/ABI snapshot. */
export async function assertNetworkIdentity(request: Request, chain: GenLayerChain): Promise<void> {
  if (!chain.genesisHash) return;
  const id = await request({method: "eth_chainId"});
  const block = await request({method: "eth_getBlockByNumber", params: ["0x0", false]});
  if (BigInt(id) !== BigInt(chain.id) || block?.hash?.toLowerCase() !== chain.genesisHash.toLowerCase()) {
    throw new Error(
      "RPC network identity does not match Bradbury Phase 2; chain ID 4221 alone is insufficient.",
    );
  }
  const requireCode = async (address: string) => {
    const code = await request({method: "eth_getCode", params: [address, "latest"]});
    if (typeof code !== "string" || !/^0x[0-9a-f]+$/i.test(code) || code.length <= 2) {
      throw new Error("Bradbury Phase 2 contract code is missing from the configured RPC.");
    }
  };
  if (!chain.addressManager) return;
  await requireCode(chain.addressManager);
  const contracts = {
    ConsensusMain: chain.consensusMainContract,
    ConsensusData: chain.consensusDataContract,
    Staking: chain.stakingContract,
    FeeManager: chain.feeManagerContract,
    RoundsStorage: chain.roundsStorageContract,
    Appeals: chain.appealsContract,
  };
  for (const [name, contract] of Object.entries(contracts)) {
    if (!contract) continue;
    const data = await request({
      method: "eth_call",
      params: [
        {
          to: chain.addressManager,
          data: encodeFunctionData({abi: ADDRESS_MANAGER_ABI, functionName: "getAddress", args: [name]}),
        },
        "latest",
      ],
    });
    const address = decodeFunctionResult({abi: ADDRESS_MANAGER_ABI, functionName: "getAddress", data});
    if (/^0x0{40}$/i.test(address)) throw new Error(`AddressManager has no ${name} entry.`);
    await requireCode(address);
    if (address.toLowerCase() !== contract.address.toLowerCase()) {
      throw new Error(
        `AddressManager ${name} differs from this SDK contract configuration. The network identity matches; use an SDK/chain configuration with the current addresses and compatible ABIs before sending transactions.`,
      );
    }
  }
}
