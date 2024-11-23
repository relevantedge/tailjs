export type SchemaEnumTypeDefinition =
  | {
      primitive?: "string";
      enum: string[];
    }
  | {
      primitive?: "number";
      enum: number[];
    };
