# Type Alias: GenLayerTransaction

> **GenLayerTransaction** = `object`

Defined in: [types/transactions.ts:197](https://github.com/genlayerlabs/genlayer-js/blob/eaba6adec6803bdd0b4968e3f0763cf22107acd1/src/types/transactions.ts#L197)

## Properties

### activator?

> `optional` **activator?**: `Address`

Defined in: [types/transactions.ts:249](https://github.com/genlayerlabs/genlayer-js/blob/eaba6adec6803bdd0b4968e3f0763cf22107acd1/src/types/transactions.ts#L249)

***

### consensus\_data?

> `optional` **consensus\_data?**: `object`

Defined in: [types/transactions.ts:288](https://github.com/genlayerlabs/genlayer-js/blob/eaba6adec6803bdd0b4968e3f0763cf22107acd1/src/types/transactions.ts#L288)

#### final

> **final**: `boolean`

#### leader\_receipt?

> `optional` **leader\_receipt?**: [`LeaderReceipt`](types.Interface.LeaderReceipt.md)[]

#### validators?

> `optional` **validators?**: `Record`\<`string`, `unknown`\>[]

#### votes?

> `optional` **votes?**: `Record`\<`string`, `string`\>

***

### created\_at?

> `optional` **created\_at?**: `Date`

Defined in: [types/transactions.ts:298](https://github.com/genlayerlabs/genlayer-js/blob/eaba6adec6803bdd0b4968e3f0763cf22107acd1/src/types/transactions.ts#L298)

***

### createdTimestamp?

> `optional` **createdTimestamp?**: `string`

Defined in: [types/transactions.ts:216](https://github.com/genlayerlabs/genlayer-js/blob/eaba6adec6803bdd0b4968e3f0763cf22107acd1/src/types/transactions.ts#L216)

***

### currentTimestamp?

> `optional` **currentTimestamp?**: `string`

Defined in: [types/transactions.ts:199](https://github.com/genlayerlabs/genlayer-js/blob/eaba6adec6803bdd0b4968e3f0763cf22107acd1/src/types/transactions.ts#L199)

***

### data?

> `optional` **data?**: `Record`\<`string`, `unknown`\>

Defined in: [types/transactions.ts:233](https://github.com/genlayerlabs/genlayer-js/blob/eaba6adec6803bdd0b4968e3f0763cf22107acd1/src/types/transactions.ts#L233)

***

### from\_address?

> `optional` **from\_address?**: `Address`

Defined in: [types/transactions.ts:202](https://github.com/genlayerlabs/genlayer-js/blob/eaba6adec6803bdd0b4968e3f0763cf22107acd1/src/types/transactions.ts#L202)

***

### gaslimit?

> `optional` **gaslimit?**: `bigint`

Defined in: [types/transactions.ts:297](https://github.com/genlayerlabs/genlayer-js/blob/eaba6adec6803bdd0b4968e3f0763cf22107acd1/src/types/transactions.ts#L297)

***

### hash?

> `optional` **hash?**: [`TransactionHash`](types.TypeAlias.TransactionHash.md)

Defined in: [types/transactions.ts:259](https://github.com/genlayerlabs/genlayer-js/blob/eaba6adec6803bdd0b4968e3f0763cf22107acd1/src/types/transactions.ts#L259)

***

### lastLeader?

> `optional` **lastLeader?**: `Address`

Defined in: [types/transactions.ts:252](https://github.com/genlayerlabs/genlayer-js/blob/eaba6adec6803bdd0b4968e3f0763cf22107acd1/src/types/transactions.ts#L252)

***

### lastRound?

> `optional` **lastRound?**: `object`

Defined in: [types/transactions.ts:273](https://github.com/genlayerlabs/genlayer-js/blob/eaba6adec6803bdd0b4968e3f0763cf22107acd1/src/types/transactions.ts#L273)

#### appealBond

> **appealBond**: `string`

#### leaderIndex

> **leaderIndex**: `string`

#### result

> **result**: `number`

#### rotationsLeft

> **rotationsLeft**: `string`

#### round

> **round**: `string`

#### roundValidators

> **roundValidators**: `Address`[]

#### validatorVotes

> **validatorVotes**: `number`[]

#### validatorVotesHash

> **validatorVotesHash**: [`Hash`](types.TypeAlias.Hash.md)[]

#### validatorVotesName

> **validatorVotesName**: [`VoteType`](types.Enumeration.VoteType.md)[]

#### votesCommitted

> **votesCommitted**: `string`

#### votesRevealed

> **votesRevealed**: `string`

***

### lastVoteTimestamp?

> `optional` **lastVoteTimestamp?**: `string`

Defined in: [types/transactions.ts:219](https://github.com/genlayerlabs/genlayer-js/blob/eaba6adec6803bdd0b4968e3f0763cf22107acd1/src/types/transactions.ts#L219)

***

### messages?

> `optional` **messages?**: `unknown`[]

Defined in: [types/transactions.ts:240](https://github.com/genlayerlabs/genlayer-js/blob/eaba6adec6803bdd0b4968e3f0763cf22107acd1/src/types/transactions.ts#L240)

***

### nonce?

> `optional` **nonce?**: `number`

Defined in: [types/transactions.ts:294](https://github.com/genlayerlabs/genlayer-js/blob/eaba6adec6803bdd0b4968e3f0763cf22107acd1/src/types/transactions.ts#L294)

***

### numOfInitialValidators?

> `optional` **numOfInitialValidators?**: `string`

Defined in: [types/transactions.ts:210](https://github.com/genlayerlabs/genlayer-js/blob/eaba6adec6803bdd0b4968e3f0763cf22107acd1/src/types/transactions.ts#L210)

***

### numOfRounds?

> `optional` **numOfRounds?**: `string`

Defined in: [types/transactions.ts:270](https://github.com/genlayerlabs/genlayer-js/blob/eaba6adec6803bdd0b4968e3f0763cf22107acd1/src/types/transactions.ts#L270)

***

### queuePosition?

> `optional` **queuePosition?**: `string`

Defined in: [types/transactions.ts:246](https://github.com/genlayerlabs/genlayer-js/blob/eaba6adec6803bdd0b4968e3f0763cf22107acd1/src/types/transactions.ts#L246)

***

### queueType?

> `optional` **queueType?**: `number`

Defined in: [types/transactions.ts:243](https://github.com/genlayerlabs/genlayer-js/blob/eaba6adec6803bdd0b4968e3f0763cf22107acd1/src/types/transactions.ts#L243)

***

### r?

> `optional` **r?**: `number`

Defined in: [types/transactions.ts:299](https://github.com/genlayerlabs/genlayer-js/blob/eaba6adec6803bdd0b4968e3f0763cf22107acd1/src/types/transactions.ts#L299)

***

### randomSeed?

> `optional` **randomSeed?**: [`Hash`](types.TypeAlias.Hash.md)

Defined in: [types/transactions.ts:222](https://github.com/genlayerlabs/genlayer-js/blob/eaba6adec6803bdd0b4968e3f0763cf22107acd1/src/types/transactions.ts#L222)

***

### readStateBlockRange?

> `optional` **readStateBlockRange?**: `object`

Defined in: [types/transactions.ts:263](https://github.com/genlayerlabs/genlayer-js/blob/eaba6adec6803bdd0b4968e3f0763cf22107acd1/src/types/transactions.ts#L263)

#### activationBlock

> **activationBlock**: `string`

#### processingBlock

> **processingBlock**: `string`

#### proposalBlock

> **proposalBlock**: `string`

***

### recipient?

> `optional` **recipient?**: `Address`

Defined in: [types/transactions.ts:207](https://github.com/genlayerlabs/genlayer-js/blob/eaba6adec6803bdd0b4968e3f0763cf22107acd1/src/types/transactions.ts#L207)

***

### result?

> `optional` **result?**: `number`

Defined in: [types/transactions.ts:225](https://github.com/genlayerlabs/genlayer-js/blob/eaba6adec6803bdd0b4968e3f0763cf22107acd1/src/types/transactions.ts#L225)

***

### resultName?

> `optional` **resultName?**: [`TransactionResult`](types.Enumeration.TransactionResult.md)

Defined in: [types/transactions.ts:226](https://github.com/genlayerlabs/genlayer-js/blob/eaba6adec6803bdd0b4968e3f0763cf22107acd1/src/types/transactions.ts#L226)

***

### s?

> `optional` **s?**: `number`

Defined in: [types/transactions.ts:300](https://github.com/genlayerlabs/genlayer-js/blob/eaba6adec6803bdd0b4968e3f0763cf22107acd1/src/types/transactions.ts#L300)

***

### sender?

> `optional` **sender?**: `Address`

Defined in: [types/transactions.ts:203](https://github.com/genlayerlabs/genlayer-js/blob/eaba6adec6803bdd0b4968e3f0763cf22107acd1/src/types/transactions.ts#L203)

***

### status?

> `optional` **status?**: [`TransactionStatus`](types.Enumeration.TransactionStatus.md) \| `number`

Defined in: [types/transactions.ts:255](https://github.com/genlayerlabs/genlayer-js/blob/eaba6adec6803bdd0b4968e3f0763cf22107acd1/src/types/transactions.ts#L255)

***

### statusName?

> `optional` **statusName?**: [`TransactionStatus`](types.Enumeration.TransactionStatus.md)

Defined in: [types/transactions.ts:256](https://github.com/genlayerlabs/genlayer-js/blob/eaba6adec6803bdd0b4968e3f0763cf22107acd1/src/types/transactions.ts#L256)

***

### to\_address?

> `optional` **to\_address?**: `Address`

Defined in: [types/transactions.ts:206](https://github.com/genlayerlabs/genlayer-js/blob/eaba6adec6803bdd0b4968e3f0763cf22107acd1/src/types/transactions.ts#L206)

***

### txData?

> `optional` **txData?**: `Hex`

Defined in: [types/transactions.ts:234](https://github.com/genlayerlabs/genlayer-js/blob/eaba6adec6803bdd0b4968e3f0763cf22107acd1/src/types/transactions.ts#L234)

***

### txDataDecoded?

> `optional` **txDataDecoded?**: [`DecodedDeployData`](types.TypeAlias.DecodedDeployData.md) \| [`DecodedCallData`](types.TypeAlias.DecodedCallData.md)

Defined in: [types/transactions.ts:235](https://github.com/genlayerlabs/genlayer-js/blob/eaba6adec6803bdd0b4968e3f0763cf22107acd1/src/types/transactions.ts#L235)

***

### txExecutionResult?

> `optional` **txExecutionResult?**: `number`

Defined in: [types/transactions.ts:229](https://github.com/genlayerlabs/genlayer-js/blob/eaba6adec6803bdd0b4968e3f0763cf22107acd1/src/types/transactions.ts#L229)

***

### txExecutionResultName?

> `optional` **txExecutionResultName?**: [`ExecutionResult`](types.Enumeration.ExecutionResult.md)

Defined in: [types/transactions.ts:230](https://github.com/genlayerlabs/genlayer-js/blob/eaba6adec6803bdd0b4968e3f0763cf22107acd1/src/types/transactions.ts#L230)

***

### txId?

> `optional` **txId?**: [`TransactionHash`](types.TypeAlias.TransactionHash.md)

Defined in: [types/transactions.ts:260](https://github.com/genlayerlabs/genlayer-js/blob/eaba6adec6803bdd0b4968e3f0763cf22107acd1/src/types/transactions.ts#L260)

***

### txReceipt?

> `optional` **txReceipt?**: [`Hash`](types.TypeAlias.Hash.md)

Defined in: [types/transactions.ts:237](https://github.com/genlayerlabs/genlayer-js/blob/eaba6adec6803bdd0b4968e3f0763cf22107acd1/src/types/transactions.ts#L237)

***

### txSlot?

> `optional` **txSlot?**: `string`

Defined in: [types/transactions.ts:213](https://github.com/genlayerlabs/genlayer-js/blob/eaba6adec6803bdd0b4968e3f0763cf22107acd1/src/types/transactions.ts#L213)

***

### type?

> `optional` **type?**: `number`

Defined in: [types/transactions.ts:296](https://github.com/genlayerlabs/genlayer-js/blob/eaba6adec6803bdd0b4968e3f0763cf22107acd1/src/types/transactions.ts#L296)

***

### v?

> `optional` **v?**: `number`

Defined in: [types/transactions.ts:301](https://github.com/genlayerlabs/genlayer-js/blob/eaba6adec6803bdd0b4968e3f0763cf22107acd1/src/types/transactions.ts#L301)

***

### value?

> `optional` **value?**: `number`

Defined in: [types/transactions.ts:295](https://github.com/genlayerlabs/genlayer-js/blob/eaba6adec6803bdd0b4968e3f0763cf22107acd1/src/types/transactions.ts#L295)
