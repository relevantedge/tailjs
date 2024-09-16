export type SchemaEnumType =
  | {
      primitive: "string";
      enum: string[];
    }
  | {
      primitive: "number";
      enum: number[];
    };
