import {
  Schema,
  SchemaDataUsage,
  SchemaEntity,
  SchemaObjectTypeDefinition,
  SchemaProperty,
  SchemaPropertyType,
  SchemaTypeDefinition,
  ValidatableSchemaEntity,
  VariableKey,
} from "../../..";

export type SchemaVariableKey = Pick<VariableKey, "scope" | "key">;

export interface SchemaObjectType
  extends SchemaEntity,
    ValidatableSchemaEntity {
  /** The schema that defines the type. */
  schema: Schema;

  /** The type cannot be used directly for data. */
  abstract: boolean;

  /** The type is defined in a property. */
  embedded: boolean;

  /** Base types this type extends directly. */
  extends: SchemaObjectType[];

  /** All types this type extends directly and indirectly through base types. */
  extendsAll: Set<SchemaObjectType>;

  /** Subtypes extending this type directly. */
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

export const isSchemaObjectType = (
  value: SchemaPropertyType
): value is SchemaObjectType => "properties" in value;
