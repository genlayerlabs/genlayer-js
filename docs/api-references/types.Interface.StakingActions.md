# Interface: StakingActions

Defined in: [types/staking.ts:206](https://github.com/genlayerlabs/genlayer-js/blob/eaba6adec6803bdd0b4968e3f0763cf22107acd1/src/types/staking.ts#L206)

## Properties

### delegatorClaim

> **delegatorClaim**: (`options`) => `Promise`\<[`StakingTransactionResult`](types.Interface.StakingTransactionResult.md)\>

Defined in: [types/staking.ts:213](https://github.com/genlayerlabs/genlayer-js/blob/eaba6adec6803bdd0b4968e3f0763cf22107acd1/src/types/staking.ts#L213)

#### Parameters

##### options

[`DelegatorClaimOptions`](types.Interface.DelegatorClaimOptions.md)

#### Returns

`Promise`\<[`StakingTransactionResult`](types.Interface.StakingTransactionResult.md)\>

***

### delegatorExit

> **delegatorExit**: (`options`) => `Promise`\<[`StakingTransactionResult`](types.Interface.StakingTransactionResult.md)\>

Defined in: [types/staking.ts:212](https://github.com/genlayerlabs/genlayer-js/blob/eaba6adec6803bdd0b4968e3f0763cf22107acd1/src/types/staking.ts#L212)

#### Parameters

##### options

[`DelegatorExitOptions`](types.Interface.DelegatorExitOptions.md)

#### Returns

`Promise`\<[`StakingTransactionResult`](types.Interface.StakingTransactionResult.md)\>

***

### delegatorJoin

> **delegatorJoin**: (`options`) => `Promise`\<[`DelegatorJoinResult`](types.Interface.DelegatorJoinResult.md)\>

Defined in: [types/staking.ts:211](https://github.com/genlayerlabs/genlayer-js/blob/eaba6adec6803bdd0b4968e3f0763cf22107acd1/src/types/staking.ts#L211)

#### Parameters

##### options

[`DelegatorJoinOptions`](types.Interface.DelegatorJoinOptions.md)

#### Returns

`Promise`\<[`DelegatorJoinResult`](types.Interface.DelegatorJoinResult.md)\>

***

### formatStakingAmount

> **formatStakingAmount**: (`amount`) => `string`

Defined in: [types/staking.ts:223](https://github.com/genlayerlabs/genlayer-js/blob/eaba6adec6803bdd0b4968e3f0763cf22107acd1/src/types/staking.ts#L223)

#### Parameters

##### amount

`bigint`

#### Returns

`string`

***

### getActiveValidators

> **getActiveValidators**: () => `Promise`\<`` `0x${string}` ``[]\>

Defined in: [types/staking.ts:219](https://github.com/genlayerlabs/genlayer-js/blob/eaba6adec6803bdd0b4968e3f0763cf22107acd1/src/types/staking.ts#L219)

#### Returns

`Promise`\<`` `0x${string}` ``[]\>

***

### getActiveValidatorsCount

> **getActiveValidatorsCount**: () => `Promise`\<`bigint`\>

Defined in: [types/staking.ts:220](https://github.com/genlayerlabs/genlayer-js/blob/eaba6adec6803bdd0b4968e3f0763cf22107acd1/src/types/staking.ts#L220)

#### Returns

`Promise`\<`bigint`\>

***

### getEpochData

> **getEpochData**: (`epochNumber`) => `Promise`\<[`EpochData`](types.Interface.EpochData.md)\>

Defined in: [types/staking.ts:218](https://github.com/genlayerlabs/genlayer-js/blob/eaba6adec6803bdd0b4968e3f0763cf22107acd1/src/types/staking.ts#L218)

#### Parameters

##### epochNumber

`bigint`

#### Returns

`Promise`\<[`EpochData`](types.Interface.EpochData.md)\>

***

### getEpochInfo

> **getEpochInfo**: () => `Promise`\<[`EpochInfo`](types.Interface.EpochInfo.md)\>

Defined in: [types/staking.ts:217](https://github.com/genlayerlabs/genlayer-js/blob/eaba6adec6803bdd0b4968e3f0763cf22107acd1/src/types/staking.ts#L217)

#### Returns

`Promise`\<[`EpochInfo`](types.Interface.EpochInfo.md)\>

***

### getStakeInfo

> **getStakeInfo**: (`delegator`, `validator`) => `Promise`\<[`StakeInfo`](types.Interface.StakeInfo.md)\>

Defined in: [types/staking.ts:216](https://github.com/genlayerlabs/genlayer-js/blob/eaba6adec6803bdd0b4968e3f0763cf22107acd1/src/types/staking.ts#L216)

#### Parameters

##### delegator

`` `0x${string}` ``

##### validator

`` `0x${string}` ``

#### Returns

`Promise`\<[`StakeInfo`](types.Interface.StakeInfo.md)\>

***

### getStakingContract

> **getStakingContract**: () => `object`

Defined in: [types/staking.ts:221](https://github.com/genlayerlabs/genlayer-js/blob/eaba6adec6803bdd0b4968e3f0763cf22107acd1/src/types/staking.ts#L221)

#### Returns

`object`

***

### getValidatorInfo

> **getValidatorInfo**: (`validator`) => `Promise`\<[`ValidatorInfo`](types.Interface.ValidatorInfo.md)\>

Defined in: [types/staking.ts:215](https://github.com/genlayerlabs/genlayer-js/blob/eaba6adec6803bdd0b4968e3f0763cf22107acd1/src/types/staking.ts#L215)

#### Parameters

##### validator

`` `0x${string}` ``

#### Returns

`Promise`\<[`ValidatorInfo`](types.Interface.ValidatorInfo.md)\>

***

### isValidator

> **isValidator**: (`address`) => `Promise`\<`boolean`\>

Defined in: [types/staking.ts:214](https://github.com/genlayerlabs/genlayer-js/blob/eaba6adec6803bdd0b4968e3f0763cf22107acd1/src/types/staking.ts#L214)

#### Parameters

##### address

`` `0x${string}` ``

#### Returns

`Promise`\<`boolean`\>

***

### parseStakingAmount

> **parseStakingAmount**: (`amount`) => `bigint`

Defined in: [types/staking.ts:222](https://github.com/genlayerlabs/genlayer-js/blob/eaba6adec6803bdd0b4968e3f0763cf22107acd1/src/types/staking.ts#L222)

#### Parameters

##### amount

`string` \| `bigint`

#### Returns

`bigint`

***

### validatorClaim

> **validatorClaim**: (`options?`) => `Promise`\<[`StakingTransactionResult`](types.Interface.StakingTransactionResult.md) & `object`\>

Defined in: [types/staking.ts:210](https://github.com/genlayerlabs/genlayer-js/blob/eaba6adec6803bdd0b4968e3f0763cf22107acd1/src/types/staking.ts#L210)

#### Parameters

##### options?

[`ValidatorClaimOptions`](types.Interface.ValidatorClaimOptions.md)

#### Returns

`Promise`\<[`StakingTransactionResult`](types.Interface.StakingTransactionResult.md) & `object`\>

***

### validatorDeposit

> **validatorDeposit**: (`options`) => `Promise`\<[`StakingTransactionResult`](types.Interface.StakingTransactionResult.md)\>

Defined in: [types/staking.ts:208](https://github.com/genlayerlabs/genlayer-js/blob/eaba6adec6803bdd0b4968e3f0763cf22107acd1/src/types/staking.ts#L208)

#### Parameters

##### options

[`ValidatorDepositOptions`](types.Interface.ValidatorDepositOptions.md)

#### Returns

`Promise`\<[`StakingTransactionResult`](types.Interface.StakingTransactionResult.md)\>

***

### validatorExit

> **validatorExit**: (`options`) => `Promise`\<[`StakingTransactionResult`](types.Interface.StakingTransactionResult.md)\>

Defined in: [types/staking.ts:209](https://github.com/genlayerlabs/genlayer-js/blob/eaba6adec6803bdd0b4968e3f0763cf22107acd1/src/types/staking.ts#L209)

#### Parameters

##### options

[`ValidatorExitOptions`](types.Interface.ValidatorExitOptions.md)

#### Returns

`Promise`\<[`StakingTransactionResult`](types.Interface.StakingTransactionResult.md)\>

***

### validatorJoin

> **validatorJoin**: (`options`) => `Promise`\<[`ValidatorJoinResult`](types.Interface.ValidatorJoinResult.md)\>

Defined in: [types/staking.ts:207](https://github.com/genlayerlabs/genlayer-js/blob/eaba6adec6803bdd0b4968e3f0763cf22107acd1/src/types/staking.ts#L207)

#### Parameters

##### options

[`ValidatorJoinOptions`](types.Interface.ValidatorJoinOptions.md)

#### Returns

`Promise`\<[`ValidatorJoinResult`](types.Interface.ValidatorJoinResult.md)\>
