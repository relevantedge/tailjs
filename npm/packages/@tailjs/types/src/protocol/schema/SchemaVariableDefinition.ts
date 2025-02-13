import { AnySchemaTypeDefinition, SchemaDefinitionEntity } from "../..";

export type SchemaVariableDefinition =
  | SchemaDefinitionEntity &
      AnySchemaTypeDefinition & {
        /** The value of the variable is calculated and cannot be set. */
        dynamic?: boolean;
      };
