import {
  SchemaDataUsage,
  SchemaEntity,
  SchemaObjectTypeDefinition,
  SchemaProperty,
  SchemaTypeDefinition,
  VariableKey,
} from "../../..";
import { ValidatableSchemaEntity } from "./validation";

export type SchemaVariableKey = Pick<VariableKey, "scope" | "key">;

export interface SchemaObjectType
  extends SchemaEntity,
    ValidatableSchemaEntity {
  /** The type cannot be used directly for data. */
  abstract: boolean;

  /** The type is defined in a property. */
  embedded: boolean;

  /** Other types the inherits properties from directly. */
  extends: SchemaObjectType[];

  /** Other types the inherits properties, both directly and indirectly. */
  extendsAll: Set<SchemaObjectType>;

  /** All types extending this type either directly or indirectly. */
  extendedBy: SchemaObjectType[];

  /** All types extending this type either directly or indirectly. */
  extendedByAll: Set<SchemaObjectType>;

  /** The properties the type declares itself. */
  ownProperties: {
    [P in string]: SchemaProperty;
  };

  /** All the type's properties including properties from the types it extends. */
  properties: {
    [P in string]: SchemaProperty;
  };

  /** The properties where this type is used */
  referencedBy: Set<SchemaProperty>;

  /**
   * The keys of the variables the type can be used for (scope / key).
   */
  variables?: Map<string, Set<string>>;

  /** The source definition. */
  source: SchemaObjectTypeDefinition | SchemaTypeDefinition;

  /** The minimum required usage for any data from this type to appear. */
  usage: SchemaDataUsage;

  toString(): string;
}
