# v0.6 consumer migration

This v2 SDK update targets the JM/Claudio/Kiril consensus train, audited at
`genlayerlabs/genlayer-consensus@c4749a42095bcfb9de69bef4f4fd5e9a6a2f86f2`
(PR #1634, above #1628). The fixture in
`tests/fixtures/consensus-consumer-abi.json` contains unmodified ABI entries
from that revision's `abis/IGenLayerStaking.json` and `abis/ConsensusData.json`.
This is source compatibility evidence, not a deployment or full E2E result.

## Staking

Replace `ValidatorView.live` and `ValidatorInfo.live` with
`hasUnclaimedRewards`. There is no `live` alias. The flag reports rewards still
to be consumed at priming; it does not establish eligibility, readiness or ban
state. Continue to use `banned`, `needsPriming`, and selectable-validator APIs
for their independently defined purposes. Both boolean states are tested.

Claim `quantity`/`offset` and Commit `outstanding` now decode as `uint256`.
Their JavaScript type remains `bigint`. The producer-fixture regression uses
values above the old `uint120` boundary.

The shipped staking ABI subset also follows the producer's `delegatorClaim`
return, payable two-argument `inflationInit`, transaction-ID inputs on
idleness bans/quarantine, and `ValidatorBannedIdleness` event. Obsolete staking
selectors/events absent from this producer are removed. No administrative
wrapper or new governance journey is introduced.

## Lifecycle

`advanced.getTransactionLifecycle()` exposes optional `executionGeneration`
as an exact decimal string, independent of the retained decision's generation.
Older Studio RPCs without this field leave it absent; no generation is guessed.
A generation change invalidates cached attempt-specific receipts. Do not use
`decisionId` as a substitute for the execution generation.

An accepted, undetermined or timeout decision can still be appealed or
finalized. `waitUntil: "decided"` is appropriate for an early result; use
`waitUntil: "finalized"` to wait for stored parent finalization. Neither parent
finalization nor `getTriggeredTransactionIds()` proves all internal delivery,
refunds or payouts complete. The latter currently scans decision receipts and
needs separate adaptation for deferred terminal-delivery transactions before
being used as a complete child inventory on this producer.

## Package delivery and remaining qualification

Use an exact commit of PR #220 for pre-release consumers and regenerate their
lockfiles; v0/v1 semver ranges do not select this v2 train. Studio frontend and
explorer must select the same audited SDK build. Publishing a tagged npm
release remains a separate release action after qualification.

Select dev-env #145 (it includes #147 and merged #148), retaining Python #116
and E2E #781 in the consumer closure. Later qualification must compose the
implemented Node stack #1953–#1956 and its Consensus #1634 dependency, verify
one source per repository, and record the actual resolved manifest. Do not
add a reverse SDK-to-Node dependency that creates a cycle.

Outstanding integration work: full deployment/reset provenance, canonical
child enumeration across deferred delivery, authoritative delivery-completion
API, generation-aware UI receipt invalidation, and deploy/write/read/appeal/
recompute/governance journey coverage. Native ABI tests do not qualify those
journeys or the producer's native-GEN reserve allocation.
