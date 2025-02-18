export type SchemaPrimitiveTypeDefinition =
  | {
      primitive: "boolean" | "uuid" | "duration" | "date" | "timestamp";
    }
  | {
      primitive: "datetime";
      format?: "iso" | "unix";
    }
  | {
      primitive: "integer" | "number";
      format?: "percentage" | "decimal";
      min?: number | null;
      max?: number | null;
    }
  | {
      primitive: "string";
      format?: "url" | "uri" | "urn" | "email";
      maxLength?: number | null;
    };
