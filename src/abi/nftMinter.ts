export const ADDRESS_MANAGER_ABI = [
  {
    inputs: [{internalType: "string", name: "key", type: "string"}],
    name: "getAddressNonZero",
    outputs: [{internalType: "address", name: "addr", type: "address"}],
    stateMutability: "view",
    type: "function",
  },
] as const;

export const NFT_MINTER_ABI = [
  {
    inputs: [{internalType: "uint256", name: "nftId", type: "uint256"}],
    name: "claim",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {internalType: "uint256", name: "nftId", type: "uint256"},
      {internalType: "uint256", name: "numberOfEpochsToClaim", type: "uint256"},
    ],
    name: "claimEpochs",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{internalType: "address", name: "developer", type: "address"}],
    name: "developerToNFT",
    outputs: [{internalType: "uint256", name: "nftId", type: "uint256"}],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{internalType: "uint256", name: "nftId", type: "uint256"}],
    name: "getClaimableRewardsFromFees",
    outputs: [{internalType: "uint256", name: "", type: "uint256"}],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {internalType: "uint256", name: "nftId", type: "uint256"},
      {internalType: "uint256", name: "numberOfEpochsToClaim", type: "uint256"},
    ],
    name: "getClaimableRewardsFromInflation",
    outputs: [{internalType: "uint256", name: "amount", type: "uint256"}],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{internalType: "uint256", name: "nftId", type: "uint256"}],
    name: "getGhostsForNFT",
    outputs: [{internalType: "address[]", name: "", type: "address[]"}],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{internalType: "uint256", name: "nftId", type: "uint256"}],
    name: "getLastClaimedEpoch",
    outputs: [{internalType: "uint256", name: "", type: "uint256"}],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{internalType: "uint256", name: "nftId", type: "uint256"}],
    name: "getNumberOfEpochsToClaim",
    outputs: [{internalType: "uint256", name: "", type: "uint256"}],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{internalType: "address", name: "developer", type: "address"}],
    name: "hasNFT",
    outputs: [{internalType: "bool", name: "", type: "bool"}],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{internalType: "uint256", name: "nftId", type: "uint256"}],
    name: "nfts",
    outputs: [
      {internalType: "address", name: "developer", type: "address"},
      {internalType: "uint256", name: "claimableRewards", type: "uint256"},
      {internalType: "uint256", name: "lastClaimedEpoch", type: "uint256"},
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;
