import {
  DataClassification,
  DataPurposes,
  UserConsent,
  VariableScope,
  VariableScopeValue,
} from "@tailjs/types";

export interface SchemaClassification {
  classification: DataClassification;
  purposes: DataPurposes;
}

export type SchemaPropertyStructure = {
  map?: boolean;
  array?: boolean | SchemaPropertyStructure;
};

export interface SchemaEntity extends SchemaClassification {
  id: string;
  description?: string;
}

export interface Schema extends SchemaEntity {
  parent?: Schema;
  events?: ReadonlyMap<string, SchemaType>;
  variables?: {
    [P in VariableScopeValue<false>]?: ReadonlyMap<string, SchemaVariable>;
  };
  types: ReadonlyMap<string, SchemaType>;

  subSchemas?: ReadonlyMap<string, Schema>;
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
  primitive?: boolean;
  abstract?: boolean;
  properties?: ReadonlyMap<string, SchemaProperty>;
  extends?: ReadonlyMap<string, SchemaType>;
  extenders?: ReadonlyMap<string, SchemaType>;
  referencedBy?: ReadonlySet<SchemaProperty>;
}

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
