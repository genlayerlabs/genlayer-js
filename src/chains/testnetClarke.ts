import {Address, defineChain} from "viem";
import {GenLayerChain} from "@/types";
import {
  APPEALS_CONTRACT,
  CONSENSUS_DATA_CONTRACT,
  CONSENSUS_MAIN_CONTRACT,
  FEE_MANAGER_CONTRACT,
  ROUNDS_STORAGE_CONTRACT,
  STAKING_CONTRACT,
} from "./testnetBradbury";

// Clarke is a separate deployment of the Bradbury Phase 3 contracts on the same
// chain, so it shares their ABIs and the chain RPC and explorer
const TESTNET_JSON_RPC_URL = "https://rpc.testnet-chain.genlayer.com";
const EXPLORER_URL = "https://scan.testnet-chain.genlayer.com";

export const testnetClarke: GenLayerChain = defineChain({
  id: 0x107d,
  isStudio: false,
  name: "Genlayer Clarke Testnet",
  rpcUrls: {
    default: {
      http: [TESTNET_JSON_RPC_URL],
    },
  },
  nativeCurrency: {
    name: "GEN Token",
    symbol: "GEN",
    decimals: 18,
  },
  blockExplorers: {
    default: {
      name: "GenLayer Chain Explorer",
      url: EXPLORER_URL,
    },
  },
  testnet: true,
  consensusMainContract: {
    ...CONSENSUS_MAIN_CONTRACT,
    address: "0xa44222E0beDaB12329557499ae6E555b1c9D02ee" as Address,
  },
  consensusDataContract: {
    ...CONSENSUS_DATA_CONTRACT,
    address: "0x16Ef1E1EF400A7fE0e572445974b95DA17370de9" as Address,
  },
  stakingContract: {
    ...STAKING_CONTRACT,
    address: "0x711d111510Af2Bb35c3929b709677a1E9f8ffce2" as Address,
  },
  feeManagerContract: {
    ...FEE_MANAGER_CONTRACT,
    address: "0xd072dce2439d46C1F972810C6593D744c919b48a" as Address,
  },
  roundsStorageContract: {
    ...ROUNDS_STORAGE_CONTRACT,
    address: "0xefD3b249591a0fBe1cdf6d3b4e36e7D8Dee7d4C4" as Address,
  },
  appealsContract: {
    ...APPEALS_CONTRACT,
    address: "0xd6a836eb592Dd0b216f65bDc954Ca5bCff5DDaa2" as Address,
  },
  defaultNumberOfInitialValidators: 5,
  defaultConsensusMaxRotations: 3,
});
