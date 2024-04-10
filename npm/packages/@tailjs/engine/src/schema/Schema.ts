import {
  DataClassificationValue,
  DataPurposeValue,
  UserConsent,
  VariableScope,
} from "@tailjs/types";
import { VariableMap } from "..";
import {
  AllKeys,
  CommonTypeTemplate,
  ExpandTypes,
  PrettifyIntersection,
} from "@tailjs/util";

export interface SchemaClassification<NumericEnums extends boolean = boolean> {
  classification: DataClassificationValue<NumericEnums>;
  purposes: DataPurposeValue<NumericEnums>;
}

export type SchemaPropertyStructure = {
  map?: boolean;
  array?: boolean | SchemaPropertyStructure;
};

export interface SchemaEntity extends SchemaClassification<true> {
  id: string;
  description?: string;
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
  validate(source: T): T;
  tryValidate(source: T | undefined): T | undefined;
  censor: (
    value: T,
    consent: SchemaClassification | UserConsent
  ) => T | undefined;
}

export interface SchemaType<T = any> extends ValidatableSchemaEntity<T> {
  name: string;
  schema: Schema;
  primitive: boolean;
}

export interface SchemaObjectType<T = any> extends SchemaType<T> {
  primitive: false;
  abstract: boolean;
  properties?: ReadonlyMap<string, SchemaProperty>;
  extends?: ReadonlyMap<string, SchemaType>;
  subtypes?: ReadonlyMap<string, SchemaType>;
  referencedBy?: ReadonlySet<SchemaProperty>;
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
}

export interface SchemaVariable<T = any>
  extends SchemaProperty<T>,
    ValidatableSchemaEntity<T> {
  scope: VariableScope;
}
