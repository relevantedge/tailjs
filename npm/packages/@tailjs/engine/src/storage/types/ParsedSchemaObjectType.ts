import { SchemaObjectType, SchemaTypeDefinition } from "@tailjs/types";
import { ValidatableSchemaEntity } from "./validation";
import { ParsedSchemaEntity, ParsedSchemaPropertyDefinition } from "../..";

export interface ParsedSchemaObjectType
  extends ParsedSchemaEntity,
    ValidatableSchemaEntity {
  version?: string;

  extends: ParsedSchemaObjectType[];

  properties: {
    [P in string]: ParsedSchemaPropertyDefinition;
  };

  allProperties: {
    [P in string]: ParsedSchemaPropertyDefinition;
  };

  embedded: boolean;

  abstract: boolean;

  referencedBy: ParsedSchemaPropertyDefinition[];

  extendedBy: ParsedSchemaObjectType[];

  /**
   * The values of an event's `type` property that maps to this schema type.
   * An empty array means that the type is a base type for events that cannot be used directly.
   *
   * `null` means "unrelated to events".
   */
  eventNames: string[] | null;

  source: SchemaObjectType | SchemaTypeDefinition;
}
