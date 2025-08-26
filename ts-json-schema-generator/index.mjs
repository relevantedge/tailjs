import * as tsj from 'ts-json-schema-generator';
import { ObjectTypeFormatter, getAllOfDefinitionReducer, AnnotatedTypeFormatter } from 'ts-json-schema-generator';
import { parseSchemaDataUsageKeywords, DataPurposes, DataClassification } from '@tailjs/types';
import { isArray, forEach, isPlainObject } from '@tailjs/util';

function _define_property(obj, key, value) {
    if (key in obj) {
        Object.defineProperty(obj, key, {
            value: value,
            enumerable: true,
            configurable: true,
            writable: true
        });
    } else {
        obj[key] = value;
    }
    return obj;
}
/**
 * Overrides the default ObjectTypeFormatter.
 *
 * Actually, that one is more "advanced" in that it expands base types, but we want them included for code gen purposes.
 *
 * This is how it defines "inheritance" https://json-schema.org/understanding-json-schema/reference/object.html (unevaluatedProperties).
 */ class AllOfBaseTypeFormatter extends ObjectTypeFormatter {
    getDefinition(type) {
        const types = type.getBaseTypes();
        if (types.length === 0) {
            return this.getObjectDefinition(type);
        }
        // Split base types by those that are $reffed and those that are not.
        // Use standard behavior for non-reffable
        const baseTypes = types.map((baseType)=>[
                baseType,
                this.childTypeFormatter.getDefinition(baseType)
            ]);
        const reffedBaseTypes = baseTypes.filter(([, typeDefinition])=>typeDefinition.$ref && Object.keys(typeDefinition).length == 1);
        const otherBaseTypes = baseTypes.filter(([, typeDefinition])=>!typeDefinition.$ref || Object.keys(typeDefinition).length > 1);
        const mergedDefinition = otherBaseTypes.map(([type])=>type).reduce(getAllOfDefinitionReducer(this.childTypeFormatter), this.getObjectDefinition(type));
        return reffedBaseTypes.length ? {
            allOf: [
                ...reffedBaseTypes.map(([, typeDefinition])=>typeDefinition),
                mergedDefinition
            ]
        } : mergedDefinition;
    }
    constructor(schemaId, childTypeFormatter){
        super(childTypeFormatter), _define_property(this, "_schemaId", void 0);
        this._schemaId = schemaId !== null && schemaId !== void 0 ? schemaId : "";
    }
}

const TypeScriptAnnotations = {
    abstract: "abstract",
    access: "access",
    anchor: "anchor",
    privacy: "privacy",
    system_type: "system_type",
    version: "version",
    event: "tailjs_event",
    variables: "tailjs_variables"
};
const JsonSchemaAnnotations = {
    Abstract: "x-abstract",
    Access: "x-privacy-access",
    Classification: "x-privacy-class",
    Purposes: "x-privacy-purposes",
    SystemType: "x-system-type",
    Variables: "x-variables",
    Event: "x-event",
    /**
   * The version of an entity. When applied at schema level this will be the default, but can be used at type level.
   * ETL can use this for consistency and backwards compatibility.
   */ Version: "x-version"
};

class PrivacyAnnotatedTypeFormatter extends AnnotatedTypeFormatter {
    getDefinition(type) {
        const definition = super.getDefinition(type);
        const annotations = type.getAnnotations();
        if (!annotations) {
            return definition;
        }
        const { [TypeScriptAnnotations.privacy]: privacy, [TypeScriptAnnotations.abstract]: abstract, [TypeScriptAnnotations.access]: access, [TypeScriptAnnotations.system_type]: systemType, [TypeScriptAnnotations.variables]: variables, [TypeScriptAnnotations.event]: event, [TypeScriptAnnotations.version]: version } = annotations;
        if (privacy || access) {
            const usage = parseSchemaDataUsageKeywords([
                privacy,
                access
            ], true);
            usage.classification && (definition[JsonSchemaAnnotations.Classification] = usage.classification);
            usage.purposes && (definition[JsonSchemaAnnotations.Purposes] = DataPurposes.parse(usage.purposes, {
                names: true,
                includeDefault: false
            }));
            (usage.readonly || usage.visibility || usage.dynamic) && (definition[JsonSchemaAnnotations.Access] = [
                usage.readonly && "readonly",
                usage.dynamic && "dynamic",
                usage.visibility
            ].filter((item)=>item));
        }
        if (systemType) {
            definition[JsonSchemaAnnotations.SystemType] = systemType;
        }
        if (abstract) {
            definition.not = {}; // Means the type cannot be instantiated itself.
            definition[JsonSchemaAnnotations.Abstract] = true; // Easier to read.
        }
        if (version) {
            definition[JsonSchemaAnnotations.Version] = version;
        }
        if (event) {
            definition[JsonSchemaAnnotations.Event] = true;
        }
        if (variables) {
            definition[JsonSchemaAnnotations.Variables] = true;
        }
        for(const annotation in TypeScriptAnnotations){
            delete definition[TypeScriptAnnotations[annotation]];
        }
        return definition;
    }
}

var _schema_$id;
/**
 * If a type has an ID (via the @ id annotation), relatively referenced types under it are resolved against the type's node,
 * and not the schema as the generated schema assumes.
 *
 * This function fixes it.
 *
 * Example: `{ $schema: "...", $id: "schema", $defs: {Type1: {$id: "type1", properties: {test: {$ref: "#/$defs/Type2"}}, {Type2: {...}}}}}`
 */ const fixReferences = (schema, schemaId = (_schema_$id = schema.$id) !== null && _schema_$id !== void 0 ? _schema_$id : "")=>{
    var _schema_$ref;
    if (isArray(schema)) {
        forEach(schema, (value)=>fixReferences(value, schemaId));
        return;
    } else if (!isPlainObject(schema)) {
        return;
    }
    if ((_schema_$ref = schema.$ref) === null || _schema_$ref === void 0 ? void 0 : _schema_$ref.startsWith("#")) {
        schema.$ref = schemaId + schema.$ref;
    }
    forEach(schema, ([, value])=>fixReferences(value, schemaId));
};

const generateSchema = (config)=>{
    var _config_usage, _config_usage1;
    const tsjConfig = {
        ...tsj.DEFAULT_CONFIG,
        ...config,
        skipTypeCheck: true,
        topRef: true,
        additionalProperties: true,
        extraTags: Object.values(TypeScriptAnnotations)
    };
    const formatter = tsj.createFormatter(tsjConfig, (fmt)=>{
        fmt.addTypeFormatter(new PrivacyAnnotatedTypeFormatter(fmt));
        fmt.addTypeFormatter(new AllOfBaseTypeFormatter(tsjConfig.schemaId, fmt));
    });
    const program = tsj.createProgram(tsjConfig);
    const wrapped = program.getRootFileNames();
    // Windows paths are not supported.
    // SchemaGenerator.ts compares the program's getRootFileNames()  to its .getSourceFiles()
    // by matching rootFileNames.includes(sourceFile.fileName). This does not work on Windows
    // since getRootFileNames() are using backslashes, and sourceFile.fileName is not.
    //
    // Monkey patching to the rescue... 🤞
    program.getRootFileNames = ()=>wrapped.map((name)=>name.replaceAll("\\", "/"));
    const parser = tsj.createParser(program, tsjConfig);
    const generator = new tsj.SchemaGenerator(program, parser, formatter, tsjConfig);
    const schema = generator.createSchema(tsjConfig.type);
    fixReferences(schema);
    schema[JsonSchemaAnnotations.Version] = config.version;
    var _config_usage_classification;
    schema[JsonSchemaAnnotations.Classification] = DataClassification.parse((_config_usage_classification = (_config_usage = config.usage) === null || _config_usage === void 0 ? void 0 : _config_usage.classification) !== null && _config_usage_classification !== void 0 ? _config_usage_classification : DataClassification.anonymous);
    var _config_usage_purposes;
    schema[JsonSchemaAnnotations.Purposes] = DataPurposes.parse((_config_usage_purposes = (_config_usage1 = config.usage) === null || _config_usage1 === void 0 ? void 0 : _config_usage1.purposes) !== null && _config_usage_purposes !== void 0 ? _config_usage_purposes : {}, {
        names: true,
        includeDefault: true
    });
    return schema;
};

export { AllOfBaseTypeFormatter, PrivacyAnnotatedTypeFormatter, fixReferences, generateSchema };
