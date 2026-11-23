import {defineChain} from "viem";
import {GenLayerChain} from "@/types";
import {studionet} from "./studionet";

const STUDIO_DEV_JSON_RPC_URL = "https://studio-dev.genlayer.com/api";

/**
 * Preview Studio deployment used to qualify the next Studio and SDK releases.
 *
 * Keep this separate from `studionet`: preview releases must not silently move
 * the stable Studio endpoint or chain id for existing SDK consumers.
 */
export const studioDevnet: GenLayerChain = defineChain({
  ...studionet,
  id: 61_997,
  name: "GenLayer Studio Devnet",
  rpcUrls: {
    default: {
      http: [STUDIO_DEV_JSON_RPC_URL],
    },
  },
  // The stable Studio explorer does not index this preview deployment.
  blockExplorers: undefined,
});
