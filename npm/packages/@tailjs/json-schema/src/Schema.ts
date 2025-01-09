import {
  ConsentEvaluationContext,
  TrackedEvent,
  ServerVariableScope,
} from "@tailjs/types";
import { ExpandTypes } from "@tailjs/util";
import { SchemaDataUsage } from "./usage";
import { UserConsent } from "packages/@tailjs/types/dist";

export interface SchemaPropertyStructure {
  map?: boolean;
  array?: boolean | SchemaPropertyStructure;
}

export interface SchemaEntity {
  id: string;
  title?: string;
  description?: string;
  usage?: SchemaDataUsage;

  /**
   * Can be used to categorize types in documentation and limit variable queries.
   */
  tags?: string[];
}

export interface Schema extends SchemaEntity {
  parent?: Schema;
  events?: ReadonlyMap<string, SchemaObjectType>;
  variables?: Map<ServerVariableScope, Map<string, SchemaVariable>>;

  types: ReadonlyMap<string, SchemaType>;

  subSchemas?: ReadonlyMap<string, Schema>;

  definition?: any;
}

export interface ValidatableSchemaEntity<T = any> extends SchemaEntity {
  validate(value: T): T;
  tryValidate(value: T | undefined): T | undefined;
  /** Patches the data with the type ID, version and censors properties that would violate the consent. */
  patch: (
    value: T,
    consent: UserConsent | undefined,
    context: ConsentEvaluationContext | undefined,
    addMetadata?: boolean
  ) => T | undefined;
}

export interface SchemaType<T = any> extends ValidatableSchemaEntity<T> {
  name: string;
  schema: Schema;
  primitive: boolean;

  /** The SemVer version of the type if available. ETL can use this for consistency and backwards compatibility. */
  version?: string;
}

export interface SchemaObjectType<T = any> extends SchemaType<T> {
  primitive: false;
  abstract: boolean;

  /** If the type represent a concrete {@link TrackedEvent}, this is the identifier in its {@link TrackedEvent.type} property. */
  eventTypeName?: string;

  properties?: ReadonlyMap<string, SchemaProperty>;
  extends?: ReadonlyMap<string, SchemaType>;
  subtypes?: ReadonlyMap<string, SchemaType>;
  referencedBy?: ReadonlySet<SchemaProperty>;
  definition?: any;
}
export const isObjectType = <T>(
  type: SchemaType<T>
): type is SchemaObjectType<T> => !type.primitive;

export interface SchemaPrimitiveType<T = any> extends SchemaType<T> {
  primitive: true;
  allowedValues?: any[];
}
export const isPrimitiveType = <T>(
  type: SchemaType<T>
): type is SchemaPrimitiveType<T> => type.primitive;

export type AnySchemaType = ExpandTypes<SchemaObjectType | SchemaPrimitiveType>;

export interface SchemaProperty<T = any> extends ValidatableSchemaEntity {
  name: string;
  declaringType: SchemaType;
  type: SchemaType;
  structure?: SchemaPropertyStructure;
  required: boolean;
  definition?: any;
  /** The property allows multiple object types for its value. */
  polymorphic?: boolean;
}

export interface SchemaVariable<T = any> extends SchemaProperty<T> {
  scope: ServerVariableScope;
}
