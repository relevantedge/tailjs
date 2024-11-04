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
  /** The type cannot be used directly for data. */
  abstract: boolean;

  /** The type is defined in a property. */
  embedded: boolean;

  /** Other types the inherits properties from directly. */
  extends: ParsedSchemaObjectType[];

  /** Other types the inherits properties, both directly and indirectly. */
  extendsAll: Set<ParsedSchemaObjectType>;

  /** All types extending this type either directly or indirectly. */
  extendedBy: ParsedSchemaObjectType[];

  /** All types extending this type either directly or indirectly. */
  extendedByAll: Set<ParsedSchemaObjectType>;

  /** The properties the type declares itself. */
  ownProperties: {
    [P in string]: ParsedSchemaPropertyDefinition;
  };

  /** All the type's properties including properties from the types it extends. */
  properties: {
    [P in string]: ParsedSchemaPropertyDefinition;
  };

  /** The properties where this type is used */
  referencedBy: Set<ParsedSchemaPropertyDefinition>;

  /**
   * The keys of the variables the type can be used for (scope / key).
   */
  variables?: Map<string, Set<string>>;

  /** The source definition. */
  source: SchemaObjectType | SchemaTypeDefinition;

  toString(): string;
}
