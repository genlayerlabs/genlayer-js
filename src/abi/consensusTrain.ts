import {Abi, parseAbi} from "viem";

// Keep these ABIs runtime-validated without asking TypeScript to expand the very
// large lifecycle tuple into a recursive inferred type.
const parseTrainAbi = parseAbi as (signatures: readonly string[]) => Abi;

/** Minimal train ABIs used by the high-level transaction reader. */
export const CONSENSUS_DATA_TRAIN_ABI = parseTrainAbi([
  "function addressManager() view returns (address)",
  "function getTransactionLifecycle(bytes32 _txId, uint256 _timestamp) view returns ((uint8 storedStatus, (bytes32 txId, uint8 storedStatus, uint8 projectedStatus, uint8 action, uint8 result, bytes32 resultHash, uint8 source, uint256 sourceRound, uint256 sourceGeneration, bytes32 sourceRoundContextHash, bytes32 roundPlanHash, uint256 resultRound, uint256 resultGeneration, uint256 basisDecisionId, uint8 context, bytes32 attemptId, uint256 boundaryAt, uint256 evaluatedAt, uint256 snapshotBlock, uint256 decisionWindow, uint256 appealDeadline, bool materializesDecision, bool actionOutcomeDeterministic, bool nonCurrentEvaluation) resolution, (bool exists, uint256 decisionId, uint256 basisDecisionId, uint8 context, uint8 source, bytes32 sourceAttemptId, uint8 sourceStatus, uint8 status, uint256 sourceRound, uint256 sourceGeneration, bytes32 sourceRoundContextHash, bytes32 roundPlanHash, uint256 resultRound, uint256 resultGeneration, uint8 result, bytes32 resultHash, uint256 effectiveAt, uint256 materializedAt, uint256 appealDeadline) latestDecision, bool decisionActive) lifecycle)",
  "function estimateLatestAppealCharge(bytes32 _txId) view returns (uint256 decisionId, uint256 bond, uint256 funding, uint256 appealDeadline)",
]);

export const ADDRESS_MANAGER_TRAIN_ABI = parseTrainAbi([
  "function getAddress(string _name) view returns (address)",
]);

export const CONSENSUS_DATA_BIG_ROUNDS_TRAIN_ABI = parseTrainAbi([
  "function getStoredTransactionDataLight(bytes32 _txId) view returns ((uint256 observedAt, address sender, address recipient, uint256 initialRotations, uint256 txSlot, uint256 createdTimestamp, uint256 lastVoteTimestamp, bytes32 randomSeed, uint8 result, bytes32 txExecutionHash, bytes txCalldata, bytes eqBlocksOutputs, (uint8 messageType, address recipient, uint256 value, bytes data, bool onAcceptance, uint256 saltNonce, bytes feeParams, uint256 declaredBudget, bytes allocationSubtree, bytes32 callKey, bool useBalance)[] messages, uint8 queueType, uint256 queuePosition, address activator, address lastLeader, uint8 status, bytes32 txId, (uint256 activationBlock, uint256 processingBlock, uint256 proposalBlock) readStateBlockRange, uint256 numOfRounds, (uint256 round, uint256 leaderIndex, uint256 votesCommitted, uint256 votesRevealed, uint256 appealBond, uint256 rotationsLeft, uint8 result, uint256 validatorsCount) lastRound, uint256 consumedValidatorsCount) transaction)",
  "function getRoundValidatorsPaged(bytes32 _txId, uint256 _round, uint256 _offset, uint256 _limit) view returns (address[] page, uint256 total)",
  "function getConsumedValidatorsPaged(bytes32 _txId, uint256 _offset, uint256 _limit) view returns (address[] page, uint256 total)",
]);

export const ROUNDS_STORAGE_TRAIN_READ_ABI = parseTrainAbi([
  "function getRoundNumber(bytes32 txId) view returns (uint256)",
  "function getLeaderIndex(bytes32 txId, uint256 round) view returns (uint256)",
  "function getVotesCommitted(bytes32 txId, uint256 round) view returns (uint256)",
  "function getVotesRevealed(bytes32 txId, uint256 round) view returns (uint256)",
  "function getAppealBond(bytes32 txId, uint256 round) view returns (uint256)",
  "function getRotationsLeft(bytes32 txId, uint256 round) view returns (uint256)",
  "function getResult(bytes32 txId, uint256 round) view returns (uint8)",
  "function getRoundValidatorsPage(bytes32 txId, uint256 round, uint256 offset, uint256 pageSize) view returns (address[] validators, uint256 total)",
  "function getValidatorVotes(bytes32 txId, uint256 round) view returns (uint8[] votes)",
  "function getValidatorVotesHash(bytes32 txId, uint256 round) view returns (bytes32[] hashes)",
  "function getValidatorResultHash(bytes32 txId, uint256 round) view returns (bytes32[] hashes)",
]);

export const TRANSACTION_MANAGER_TRAIN_READ_ABI = parseTrainAbi([
  "function getTxExecutionResult(bytes32 txId) view returns (uint8)",
  "function getNumOfInitialValidators(bytes32 txId) view returns (uint256)",
]);
