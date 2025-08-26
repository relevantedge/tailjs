import { ObjectTypeFormatter, TypeFormatter, ObjectType, AnnotatedTypeFormatter, AnnotatedType, Definition } from 'ts-json-schema-generator';
import { DataUsage } from '@tailjs/types';

/**
 * Overrides the default ObjectTypeFormatter.
 *
 * Actually, that one is more "advanced" in that it expands base types, but we want them included for code gen purposes.
 *
 * This is how it defines "inheritance" https://json-schema.org/understanding-json-schema/reference/object.html (unevaluatedProperties).
 */
declare class AllOfBaseTypeFormatter extends ObjectTypeFormatter {
    private readonly _schemaId;
    constructor(schemaId: string | undefined, childTypeFormatter: TypeFormatter);
    getDefinition(type: ObjectType): any;
}

declare class PrivacyAnnotatedTypeFormatter extends AnnotatedTypeFormatter {
    getDefinition(type: AnnotatedType): Definition;
}

/**
 * If a type has an ID (via the @ id annotation), relatively referenced types under it are resolved against the type's node,
 * and not the schema as the generated schema assumes.
 *
 * This function fixes it.
 *
 * Example: `{ $schema: "...", $id: "schema", $defs: {Type1: {$id: "type1", properties: {test: {$ref: "#/$defs/Type2"}}, {Type2: {...}}}}}`
 */
declare const fixReferences: (schema: any, schemaId?: string) => void;

interface GenerateSchemaConfig {
    path: string;
    type: string;
    schemaId: string;
    tsconfig?: string;
    usage?: Partial<DataUsage>;
    version?: string;
}
declare const generateSchema: (config: GenerateSchemaConfig) => JSONSchema7;

export { AllOfBaseTypeFormatter, type GenerateSchemaConfig, PrivacyAnnotatedTypeFormatter, fixReferences, generateSchema };
