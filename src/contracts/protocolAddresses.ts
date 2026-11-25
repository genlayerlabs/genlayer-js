import {PublicClient, zeroAddress, type Abi} from "viem";

import {ADDRESS_MANAGER_ABI} from "@/abi/nftMinter";
import {Address, GenLayerChain, GenLayerClient} from "@/types";

export const hasAbiFunction = (abi: readonly unknown[] | undefined, functionName: string): boolean => {
  if (!Array.isArray(abi)) {
    return false;
  }
  return abi.some(item => {
    if (!item || typeof item !== "object") {
      return false;
    }
    const candidate = item as {type?: string; name?: string};
    return candidate.type === "function" && candidate.name === functionName;
  });
};

/** Resolves a protocol contract (e.g. "NFTMinter", "Queues") through the ConsensusMain AddressManager. */
export const resolveProtocolAddress = async ({
  client,
  publicClient,
  key,
}: {
  client: GenLayerClient<GenLayerChain>;
  publicClient: PublicClient;
  key: string;
}): Promise<Address> => {
  const consensusMainContract = client.chain.consensusMainContract;
  if (!consensusMainContract?.address) {
    throw new Error(`${key} address resolution not supported on this chain (missing consensusMainContract).`);
  }

  const functionName = hasAbiFunction(consensusMainContract.abi, "getAddressManager")
    ? "getAddressManager"
    : hasAbiFunction(consensusMainContract.abi, "addressManager")
      ? "addressManager"
      : undefined;

  if (!functionName) {
    throw new Error(`${key} address resolution not supported on this chain (missing AddressManager getter).`);
  }

  const addressManagerAddress = await publicClient.readContract({
    address: consensusMainContract.address as Address,
    abi: consensusMainContract.abi as Abi,
    functionName,
    args: [],
  }) as Address;

  if (addressManagerAddress.toLowerCase() === zeroAddress) {
    throw new Error(`${key} address resolution failed: AddressManager is zero.`);
  }

  const address = await publicClient.readContract({
    address: addressManagerAddress,
    abi: ADDRESS_MANAGER_ABI,
    functionName: "getAddressNonZero",
    args: [key],
  }) as Address;

  if (address.toLowerCase() === zeroAddress) {
    throw new Error(`${key} address resolution failed: AddressManager returned zero.`);
  }

  return address;
};
