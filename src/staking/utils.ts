import {parseEther, formatEther} from "viem";

/**
 * Parse staking amount. Use "gen" suffix for GEN tokens (e.g. "42gen"),
 * otherwise value is treated as wei (e.g. "42000000000000000000" = 42 GEN).
 */
export function parseStakingAmount(amount: string | bigint): bigint {
  if (typeof amount === "bigint") return amount;
  const trimmed = amount.trim();
  const lower = trimmed.toLowerCase();
  if (lower.endsWith("gen")) {
    return parseEther(lower.slice(0, -3).trim());
  }
  return BigInt(trimmed);
}

/**
 * Format bigint amount to human-readable GEN string.
 */
export function formatStakingAmount(amount: bigint): string {
  return `${formatEther(amount)} GEN`;
}
