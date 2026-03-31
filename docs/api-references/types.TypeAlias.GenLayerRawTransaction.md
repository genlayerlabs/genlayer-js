# Type Alias: GenLayerRawTransaction

> **GenLayerRawTransaction** = `object`

Defined in: [types/transactions.ts:304](https://github.com/genlayerlabs/genlayer-js/blob/eaba6adec6803bdd0b4968e3f0763cf22107acd1/src/types/transactions.ts#L304)

## Properties

### activator

> **activator**: `Address`

Defined in: [types/transactions.ts:321](https://github.com/genlayerlabs/genlayer-js/blob/eaba6adec6803bdd0b4968e3f0763cf22107acd1/src/types/transactions.ts#L321)

***

### createdTimestamp

> **createdTimestamp**: `bigint`

Defined in: [types/transactions.ts:311](https://github.com/genlayerlabs/genlayer-js/blob/eaba6adec6803bdd0b4968e3f0763cf22107acd1/src/types/transactions.ts#L311)

***

### currentTimestamp

> **currentTimestamp**: `bigint`

Defined in: [types/transactions.ts:305](https://github.com/genlayerlabs/genlayer-js/blob/eaba6adec6803bdd0b4968e3f0763cf22107acd1/src/types/transactions.ts#L305)

***

### initialRotations?

> `optional` **initialRotations?**: `bigint`

Defined in: [types/transactions.ts:309](https://github.com/genlayerlabs/genlayer-js/blob/eaba6adec6803bdd0b4968e3f0763cf22107acd1/src/types/transactions.ts#L309)

***

### lastLeader

> **lastLeader**: `Address`

Defined in: [types/transactions.ts:322](https://github.com/genlayerlabs/genlayer-js/blob/eaba6adec6803bdd0b4968e3f0763cf22107acd1/src/types/transactions.ts#L322)

***

### lastRound

> **lastRound**: `object`

Defined in: [types/transactions.ts:331](https://github.com/genlayerlabs/genlayer-js/blob/eaba6adec6803bdd0b4968e3f0763cf22107acd1/src/types/transactions.ts#L331)

#### appealBond

> **appealBond**: `bigint`

#### leaderIndex

> **leaderIndex**: `bigint`

#### result

> **result**: `number`

#### rotationsLeft

> **rotationsLeft**: `bigint`

#### round

> **round**: `bigint`

#### roundValidators

> **roundValidators**: `Address`[]

#### validatorVotes

> **validatorVotes**: `number`[]

#### validatorVotesHash

> **validatorVotesHash**: [`Hash`](types.TypeAlias.Hash.md)[]

#### votesCommitted

> **votesCommitted**: `bigint`

#### votesRevealed

> **votesRevealed**: `bigint`

***

### lastVoteTimestamp

> **lastVoteTimestamp**: `bigint`

Defined in: [types/transactions.ts:312](https://github.com/genlayerlabs/genlayer-js/blob/eaba6adec6803bdd0b4968e3f0763cf22107acd1/src/types/transactions.ts#L312)

***

### messages

> **messages**: `unknown`[]

Defined in: [types/transactions.ts:318](https://github.com/genlayerlabs/genlayer-js/blob/eaba6adec6803bdd0b4968e3f0763cf22107acd1/src/types/transactions.ts#L318)

***

### numOfInitialValidators?

> `optional` **numOfInitialValidators?**: `bigint`

Defined in: [types/transactions.ts:308](https://github.com/genlayerlabs/genlayer-js/blob/eaba6adec6803bdd0b4968e3f0763cf22107acd1/src/types/transactions.ts#L308)

***

### numOfRounds

> **numOfRounds**: `bigint`

Defined in: [types/transactions.ts:330](https://github.com/genlayerlabs/genlayer-js/blob/eaba6adec6803bdd0b4968e3f0763cf22107acd1/src/types/transactions.ts#L330)

***

### queuePosition

> **queuePosition**: `bigint`

Defined in: [types/transactions.ts:320](https://github.com/genlayerlabs/genlayer-js/blob/eaba6adec6803bdd0b4968e3f0763cf22107acd1/src/types/transactions.ts#L320)

***

### queueType

> **queueType**: `number`

Defined in: [types/transactions.ts:319](https://github.com/genlayerlabs/genlayer-js/blob/eaba6adec6803bdd0b4968e3f0763cf22107acd1/src/types/transactions.ts#L319)

***

### randomSeed

> **randomSeed**: [`Hash`](types.TypeAlias.Hash.md)

Defined in: [types/transactions.ts:313](https://github.com/genlayerlabs/genlayer-js/blob/eaba6adec6803bdd0b4968e3f0763cf22107acd1/src/types/transactions.ts#L313)

***

### readStateBlockRange

> **readStateBlockRange**: `object`

Defined in: [types/transactions.ts:325](https://github.com/genlayerlabs/genlayer-js/blob/eaba6adec6803bdd0b4968e3f0763cf22107acd1/src/types/transactions.ts#L325)

#### activationBlock

> **activationBlock**: `bigint`

#### processingBlock

> **processingBlock**: `bigint`

#### proposalBlock

> **proposalBlock**: `bigint`

***

### recipient

> **recipient**: `Address`

Defined in: [types/transactions.ts:307](https://github.com/genlayerlabs/genlayer-js/blob/eaba6adec6803bdd0b4968e3f0763cf22107acd1/src/types/transactions.ts#L307)

***

### result

> **result**: `number`

Defined in: [types/transactions.ts:314](https://github.com/genlayerlabs/genlayer-js/blob/eaba6adec6803bdd0b4968e3f0763cf22107acd1/src/types/transactions.ts#L314)

***

### sender

> **sender**: `Address`

Defined in: [types/transactions.ts:306](https://github.com/genlayerlabs/genlayer-js/blob/eaba6adec6803bdd0b4968e3f0763cf22107acd1/src/types/transactions.ts#L306)

***

### status

> **status**: `number`

Defined in: [types/transactions.ts:323](https://github.com/genlayerlabs/genlayer-js/blob/eaba6adec6803bdd0b4968e3f0763cf22107acd1/src/types/transactions.ts#L323)

***

### txData

> **txData**: `Hex` \| `undefined` \| `null`

Defined in: [types/transactions.ts:316](https://github.com/genlayerlabs/genlayer-js/blob/eaba6adec6803bdd0b4968e3f0763cf22107acd1/src/types/transactions.ts#L316)

***

### txExecutionResult?

> `optional` **txExecutionResult?**: `number`

Defined in: [types/transactions.ts:315](https://github.com/genlayerlabs/genlayer-js/blob/eaba6adec6803bdd0b4968e3f0763cf22107acd1/src/types/transactions.ts#L315)

***

### txId

> **txId**: [`Hash`](types.TypeAlias.Hash.md)

Defined in: [types/transactions.ts:324](https://github.com/genlayerlabs/genlayer-js/blob/eaba6adec6803bdd0b4968e3f0763cf22107acd1/src/types/transactions.ts#L324)

***

### txReceipt

> **txReceipt**: [`Hash`](types.TypeAlias.Hash.md)

Defined in: [types/transactions.ts:317](https://github.com/genlayerlabs/genlayer-js/blob/eaba6adec6803bdd0b4968e3f0763cf22107acd1/src/types/transactions.ts#L317)

***

### txSlot

> **txSlot**: `bigint`

Defined in: [types/transactions.ts:310](https://github.com/genlayerlabs/genlayer-js/blob/eaba6adec6803bdd0b4968e3f0763cf22107acd1/src/types/transactions.ts#L310)
