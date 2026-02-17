export type ContractParamsArraySchemaElement = ContractParamsSchema | {$rep: ContractParamsSchema};

export type ContractParamsSchema =
  | "null"
  | "bool"
  | "int"
  | "address"
  | "string"
  | "bytes"
  | "any"
  | "array"
  | "dict"
  | {$or: ContractParamsSchema[]}
  | {$dict: ContractParamsSchema}
  | {[key: string]: ContractParamsSchema}
  | ContractParamsArraySchemaElement[];

export interface ContractMethodBase {
  params: [string, ContractParamsSchema][];
  kwparams: {[key: string]: ContractParamsSchema};
}

export interface ContractMethod extends ContractMethodBase {
  ret: ContractParamsSchema;
  readonly: boolean;
  payable?: boolean;
}

export type ContractSchema = {
  ctor: ContractMethodBase;
  methods: Record<string, ContractMethod>;
};
