import { SchemaDataUsage } from "../..";

export interface SchemaDefinitionEntity extends Partial<SchemaDataUsage> {
  description?: string;
}

export interface VersionedSchemaEntity extends SchemaDefinitionEntity {
  /**
   * The version of a schema or type following SemVer 2.0 conventions.
   *
   * If specified, data will be associated with this version when stored which makes it possible to handle
   * schema changes in user code. The platform does not provide any features for this by itself.
   */
  version?: string;
}
