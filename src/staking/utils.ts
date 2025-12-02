import {parseEther, formatEther} from "viem";

/**
 * Parse staking amount that supports "gen" suffix.
 * Examples: "42000gen", "42000", 42000n
 */
export function parseStakingAmount(amount: string | bigint): bigint {
  if (typeof amount === "bigint") return amount;
  const lower = amount.toLowerCase().trim();
  if (lower.endsWith("gen")) {
    return parseEther(lower.slice(0, -3).trim());
  }
  // Assume it's wei if no suffix
  return BigInt(amount);
}

/**
 * Format bigint amount to human-readable GEN string.
 */
export function formatStakingAmount(amount: bigint): string {
  return `${formatEther(amount)} GEN`;
}
