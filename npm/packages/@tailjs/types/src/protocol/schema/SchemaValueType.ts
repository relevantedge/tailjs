export type SchemaValueType =
  | {
      primitive:
        | "boolean"
        | "uuid"
        | "date"
        | "datetime"
        | "duration"
        | "timestamp";
    }
  | {
      primitive: "integer" | "number";
      min?: number | null;
      max?: number | null;
    }
  | {
      primitive: "string";
      format?: "url" | "uri" | "email";
      maxLength?: number | null;
    };
