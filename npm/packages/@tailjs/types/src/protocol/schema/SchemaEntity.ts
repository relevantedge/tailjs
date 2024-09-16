import { SchemaDataUsage } from "../..";

export interface SchemaEntity {
  name: string;

  description?: string;

  /**
   * The data usage for this type or property.
   * If only partially specified, missing attributes will be inherited in this way:
   * - A type declared directly in a schema inherits from types it extends in the order they are specified.
   *   That is, if the type does not have an attribute, the attribute will be inherited from the first extended type that has a value.
   * - A property inherits from its _originally_ declaring type. That means if a type overrides a property, the
   *   property will inherit the usage from the extended type, and not the current type.
   * - An embedded type inherits from its declaring property (the one that embeds it).
   *
   * If attributes are still missing they will be set from the schema that declares the type. Again, mind that
   * for properties this schema will be the schema of the _declaring_ type in case a type overrides a property from
   * another schema.
   */
  usage?: Partial<SchemaDataUsage>;
}

export interface VersionedSchemaEntity extends SchemaEntity {
  /**
   * The version of a schema or type following SemVer 2.0 conventions.
   *
   * If specified, data will be associated with this version when stored which makes it possible to handle
   * schema changes in user code. The platform does not provide any features for this by itself.
   */
  version?: string;
}
