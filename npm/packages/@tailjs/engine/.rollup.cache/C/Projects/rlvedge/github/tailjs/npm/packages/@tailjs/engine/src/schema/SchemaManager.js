import { variableScope } from "@tailjs/types";
import { assignIfUndefined, first, forEach, invariant, isString, obj, required, throwError, toArray, unlock, validate, } from "@tailjs/util";
import addFormats from "ajv-formats";
import Ajv from "ajv/dist/2020";
import { SchemaVariableSet, VariableMap, systemTypes, } from "..";
import { censor, parseError, parseSchema, validationError } from "./parse";
export class SchemaManager {
    schema;
    subSchemas = new Map();
    types = new Map();
    constructor(schemas) {
        const combinedSchema = {
            $schema: "https://json-schema.org/draft/2020-12/schema",
            $id: "urn:tailjs:runtime",
            description: "The effective schema for this particular configuration of tail.js that bundles all included schemas.",
            $defs: obj(schemas, (schema) => [
                validate(schema.$id, schema.$id && schema.$schema, "A schema must have an $id and $schema property."),
                schema,
            ]),
        };
        const reset = () => {
            const ajv = new Ajv()
                .addKeyword("x-privacy-class")
                .addKeyword("x-privacy-purpose")
                .addKeyword("x-privacy-purposes")
                .addKeyword("x-tags")
                .addKeyword("$anchor")
                .addKeyword("x-privacy-censor");
            addFormats(ajv);
            return ajv;
        };
        let ajv = reset();
        ajv.addSchema(combinedSchema);
        const [parsedSchemas, parsedTypes] = parseSchema(combinedSchema, ajv);
        // A brand new instance is required since we have tampered with the schema while parsing (e.g. setting unevaluatedProperties true/false and added anchors).
        (ajv = reset()).compile(combinedSchema);
        parsedSchemas.forEach((parsed) => {
            const schema = {
                id: parsed.id,
                classification: parsed.classification,
                purposes: parsed.purposes,
                types: new Map(),
                subSchemas: new Map(),
            };
            this.subSchemas.set(schema.id, schema);
        });
        parsedSchemas.forEach((parsed) => {
            const schema = this.subSchemas.get(parsed.id);
            forEach(parsed.subSchemas, ([, parsedSubSchema]) => {
                const subSchema = required(this.subSchemas.get(parsedSubSchema.id));
                subSchema.parent = schema;
                (schema.subSchemas ??= new Map()).set(subSchema.id, subSchema);
            });
        });
        parsedTypes.forEach((parsed) => {
            const validate = required(ajv.getSchema(parsed.context.$ref), () => `INV <> The ref '${parsed.context.$ref}' does not address the type '${parsed.id}' in the schema.`);
            const type = {
                id: parsed.id,
                name: parsed.name,
                description: parsed.description,
                classification: parsed.classification,
                purposes: parsed.purposes,
                primitive: false,
                abstract: !!parsed.abstract,
                schema: invariant(this.subSchemas.get(parsed.context.schema.id), "Schemas are mapped."),
                censor: (value, classification) => censor(parsed, value, classification),
                tryValidate: (value) => (validate(value) ? value : undefined),
                validate: (value) => validate(value)
                    ? value
                    : throwError(validationError(type.id, validate.errors, value)),
            };
            unlock(type.schema.types).set(type.id, type);
            this.types.set(type.id, type);
        });
        var trackedEvent = first(parsedTypes, ([, type]) => type.schemaId === systemTypes.event)?.[1];
        parsedTypes.forEach((parsed) => {
            const type = this.types.get(parsed.id);
            const set = (target, item) => target.set(item.id, item);
            forEach(parsed.extends, (parsedBaseType) => set((type.subtypes ??= new Map()), invariant(this.types.get(parsedBaseType.id), `Extended type is mapped.`)));
            forEach(parsed.subtypes, (parsedBaseType) => set((type.subtypes ??= new Map()), invariant(this.types.get(parsedBaseType.id), "Extending type is mapped.")));
            forEach(parsed.properties, ([key, parsedProperty]) => {
                const property = {
                    id: type + "#" + key,
                    name: parsedProperty.name,
                    description: parsedProperty.description,
                    classification: parsedProperty.classification,
                    purposes: parsedProperty.purposes,
                    declaringType: type,
                    structure: parsedProperty.structure,
                    required: parsedProperty.required,
                    type: required(parsedProperty.objectType
                        ? this.types.get(parsedProperty.objectType.id)
                        : parsedProperty.primitiveType ?? {}, () => parseError(parsed.context, `Unknown property type. (${JSON.stringify(parsedProperty.typeContext.node)})`)),
                };
                unlock((type.properties ??= new Map())).set(property.name, property);
                if (trackedEvent &&
                    key === "type" &&
                    parsed.extends?.has(trackedEvent)) {
                    toArray(parsedProperty.typeContext?.node.const ??
                        parsedProperty.typeContext?.node.enum)?.forEach((alias) => assignIfUndefined(unlock((type.schema.events ??= new Map())), alias, type, (key, current) => `The event '${type.id}' cannot be defined for the type '${key}' since '${current.id}' is already registered.`));
                }
                // If $defs defines object types named of a variable scope ("Global", "Session", "Device",  "User" or"Entity"),
                // their properties will be added as variable definitions to the respective scopes.
                if (variableScope.tryParse(type.name)) {
                    const scopeId = variableScope.parse(type.name);
                    forEach(type.properties, ([, property]) => {
                        if (property.required) {
                            throw new Error(`The type '${type.id}' cannot have required properties since it defines scope variables.`);
                        }
                        property.censor = (value, consent) => property.type.censor({ [property.name]: value }, consent)?.[property.name];
                        property.validate = (value) => type.validate({ [property.name]: value })[property.name];
                        property.tryValidate = (value) => type.tryValidate({ [property.name]: value })?.[property.name];
                        property.scope = scopeId;
                        (type.schema.variables ??= new VariableMap()).set(scopeId, property.name, property);
                    });
                }
            });
        });
        // Push nested schema types and events to parent schema. At the same time validate that event type IDs are unique.
        //
        // Also, don't push variables since those are scoped to their schema IDs. It is not sensible to detect variable name clashes
        // at the global level since prefixed variable storages may only use a subset of the schema.
        // Hence, it is their responsibility to merge their respective schemas and check for name clashes.
        this.subSchemas.forEach((schema) => {
            let parent = schema.parent;
            while (parent) {
                schema.events?.forEach((event, key) => {
                    if (parent.events?.has(key)) {
                        throw new Error(`The events '${parent.events.get(key).id}' and '${event.id}' cannot both have the type name '${key}'.`);
                    }
                    unlock((parent.events ??= new Map())).set(key, event);
                });
                schema.types.forEach((type) => {
                    parent.types.set(type.id, type);
                });
                parent = parent.parent;
            }
        });
        parsedTypes.forEach((parsed) => {
            const type = this.types.get(parsed.id);
            forEach(type?.referencedBy, (parsedProperty) => (type.referencedBy ??= new Set()).add(invariant(this.types
                .get(parsedProperty.declaringType.id)
                ?.properties?.get(parsedProperty.name), "Referencing property is mapped.")));
        });
        this.schema = invariant(this.subSchemas.get("urn:tailjs:runtime"), "Runtime schema is registered.");
    }
    getSchema(schemaId, require) {
        return require
            ? required(this.getSchema(schemaId, false), () => `The schema '${schemaId}' has not been registered.`)
            : schemaId && this.subSchemas.get(schemaId);
    }
    getType(typeId, require, concreteOnly = true) {
        return require
            ? required(this.getType(typeId, false, concreteOnly), () => `The type '${typeId}' is not defined.`)
            : typeId &&
                validate(this.schema.events?.get(typeId) ?? this.types.get(typeId), (type) => !type || !concreteOnly || (type && !type.abstract), () => `The type '${typeId}' is abstract and cannot be used directly.`);
    }
    tryValidate(id, value) {
        return (id &&
            (this.schema.events?.get(id) ?? this.getType(id, false))?.tryValidate(value));
    }
    validate(id, value) {
        return (this.schema.events?.get(id) ?? this.getType(id, true)).validate(value);
    }
    censor(id, value, consent) {
        return (this.schema.events?.get(id) ?? this.getType(id, true)).censor(value, consent);
    }
    createVariableSet(schemas) {
        return new SchemaVariableSet(this, isString(schemas) ? [schemas] : schemas ?? this.subSchemas.values());
    }
}
//# sourceMappingURL=SchemaManager.js.map