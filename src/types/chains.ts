import {Chain} from "viem";
import {Address} from "./accounts";

export type GenLayerChain = Chain & {
  isStudio: boolean;
  /** Genesis identity for networks that reuse a chain ID. */
  genesisHash?: `0x${string}`;
  consensusMainContract: {
    address: Address;
    abi: readonly unknown[];
    bytecode: string;
  } | null;
  consensusDataContract: {
    address: Address;
    abi: readonly unknown[];
    bytecode: string;
  } | null;
  stakingContract: {
    address: Address;
    abi: readonly unknown[];
  } | null;
  feeManagerContract: {
    address: Address;
    abi: readonly unknown[];
  } | null;
  roundsStorageContract: {
    address: Address;
    abi: readonly unknown[];
  } | null;
  appealsContract: {
    address: Address;
    abi: readonly unknown[];
  } | null;
  defaultNumberOfInitialValidators: number;
  defaultConsensusMaxRotations: number;
};
