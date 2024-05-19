import {
  DataClassificationValue,
  DataPurposeValue,
  ParsableConsent,
  VariableScope,
  TrackedEvent,
} from "@tailjs/types";
import { ExpandTypes } from "@tailjs/util";
import { VariableMap } from "..";

export type ClassificationOrConsent =
  | SchemaClassification
  | { level: DataClassificationValue; purposes: DataPurposeValue };

export interface SchemaClassification<NumericEnums extends boolean = boolean> {
  classification: DataClassificationValue<NumericEnums>;
  purposes: DataPurposeValue<NumericEnums>;
}

export interface SchemaPropertyStructure {
  map?: boolean;
  array?: boolean | SchemaPropertyStructure;
}

export interface SchemaEntity extends SchemaClassification<true> {
  id: string;
  title?: string;
  description?: string;

  /**
   * Can be used to categorize types in documentation and limit variable queries.
   */
  tags?: string[];
}

export interface Schema extends SchemaEntity {
  parent?: Schema;
  events?: ReadonlyMap<string, SchemaObjectType>;
  variables?: VariableMap<SchemaVariable>;

  types: ReadonlyMap<string, SchemaType>;

  subSchemas?: ReadonlyMap<string, Schema>;

  definition?: any;
}

export interface ValidatableSchemaEntity<T = any> extends SchemaEntity {
  validate(value: T): T;
  tryValidate(value: T | undefined): T | undefined;
  censor: (value: T, consent: ParsableConsent, write: boolean) => T | undefined;
}

export interface SchemaType<T = any> extends ValidatableSchemaEntity<T> {
  name: string;
  schema: Schema;
  primitive: boolean;
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

export interface SchemaProperty<T = any> extends SchemaEntity {
  name: string;
  declaringType: SchemaType;
  type: SchemaType;
  structure?: SchemaPropertyStructure;
  required: boolean;
  definition?: any;
}

export interface SchemaVariable<T = any>
  extends SchemaProperty<T>,
    ValidatableSchemaEntity<T> {
  scope: VariableScope;
}
