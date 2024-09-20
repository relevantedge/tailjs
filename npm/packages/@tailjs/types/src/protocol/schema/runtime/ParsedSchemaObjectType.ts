import {
  SchemaObjectType,
  SchemaTypeDefinition,
  VariableKey,
} from "@tailjs/types";
import { ParsedSchemaEntity, ParsedSchemaPropertyDefinition } from "../..";
import { ValidatableSchemaEntity } from "./validation";

export type SchemaVariableKey = Pick<VariableKey, "scope" | "key">;

export interface ParsedSchemaObjectType
  extends ParsedSchemaEntity,
    ValidatableSchemaEntity {
  /** Other types the inherits properties from. */
  extends: ParsedSchemaObjectType[];

  /** The properties the type declares itself. */
  ownProperties: {
    [P in string]: ParsedSchemaPropertyDefinition;
  };

  /** All the type's properties including properties from the types it extends. */
  properties: {
    [P in string]: ParsedSchemaPropertyDefinition;
  };

  /** The type is defined in a property. */
  embedded: boolean;

  /** The type cannot be used directly for data. */
  abstract: boolean;

  /** The properties where this type is used */
  referencedBy: Set<ParsedSchemaPropertyDefinition>;

  /** All types extending this type either directly or indirectly. */
  extendedBy: Set<ParsedSchemaObjectType>;

  /** An object of this type can be tracked as an event. */
  eventNames?: string[];

  /**
   * The keys of the variables the type can be used for (scope / key).
   */
  variables?: Map<string, Set<string>>;

  /** The source definition. */
  source: SchemaObjectType | SchemaTypeDefinition;

  toString(): string;
}
