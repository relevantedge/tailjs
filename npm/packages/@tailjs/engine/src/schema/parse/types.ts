import type Ajv from "ajv";
import type {
  SchemaClassification,
  SchemaPrimitiveType,
  SchemaPropertyStructure,
} from "../..";
import type { DataClassification, DataPurposes } from "@tailjs/types";

export interface ParseContext {
  typeNodes: Map<any, ParsedType>;
  schemas: Map<string, ParsedSchema>;
  types: Map<String, ParsedType>;
}

export interface TraverseContext extends Partial<ParsedSchemaClassification> {
  ajv: Ajv;
  id?: string;
  parseContext: ParseContext;
  path: string[];
  key: string;
  $ref?: string;
  schema?: ParsedSchema;
  classification?: DataClassification;
  purposes?: DataPurposes;
  node: any;
}

export interface ParsedComposition {
  node: any;
  type: "allOf" | "anyOf" | "oneOf" | "schema";
  ref?: { id: string; composition: ParsedComposition };
  compositions?: ParsedComposition[];
  context: TraverseContext | null;
}

export interface ParsedSchemaEntity {
  id: string;
  description?: string;
  context: TraverseContext;
  /**
   * Can be used to categorize types in documentation. Are not used for anything else.
   */
  tags?: string[];
}
export interface ParsedSchema
  extends ParsedSchemaEntity,
    Partial<SchemaClassification<true>> {
  types: Map<string, ParsedType>;
  subSchemas?: Map<string, ParsedSchema>;
}

export interface ParsedType
  extends ParsedSchemaEntity,
    Partial<SchemaClassification<true>> {
  schemaId?: string;
  name: string;
  declaringProperty?: ParsedProperty;
  extends?: Set<ParsedType>;
  subtypes?: Set<ParsedType>;
  topLevel?: boolean;
  referencedBy?: Set<ParsedProperty>;
  properties: Map<string, ParsedProperty>;
  abstract?: boolean;
  composition: ParsedComposition;
}

export interface ParsedProperty
  extends ParsedSchemaEntity,
    ParsedSchemaClassification {
  name: string;
  declaringType: ParsedType;
  objectType?: ParsedType;
  primitiveType?: SchemaPrimitiveType;
  structure?: SchemaPropertyStructure;
  required: boolean;

  /**
   * The JSON object in the schema that defines the actual type of the property (takes maps and array definitions into account).
   */
  typeContext?: TraverseContext;
}

export interface ParsedSchemaClassification extends SchemaClassification<true> {
  /**
   * Ignore when censoring and calculating type classifictions.
   * If only ignored properties are left after censoring an object, it is not returned.
   *
   * The use case is common event properties such as type or session that will be in all events,
   * but it is not sensible to track an event where all its specific properties are censored.
   */

  censorIgnore?: boolean;
}
