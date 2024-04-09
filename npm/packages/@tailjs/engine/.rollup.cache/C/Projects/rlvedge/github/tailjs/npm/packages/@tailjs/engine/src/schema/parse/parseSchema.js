import { map, unwrap } from "@tailjs/util";
import { addProperties, parseType, updateBaseTypes, updateContext, } from ".";
export const parseSchema = (schema, ajv) => {
    const rootContext = updateContext({
        ajv,
        path: [],
        node: schema,
        parseContext: {
            typeNodes: new Map(),
            schemas: new Map(),
            types: new Map(),
        },
    }, "#");
    parseType(schema, rootContext);
    rootContext.parseContext.typeNodes.forEach((type) => addProperties(type, type.composition));
    updateBaseTypes(rootContext);
    return [
        rootContext.parseContext.schemas,
        rootContext.parseContext.types,
    ];
};
export const parseError = (context, error) => `${context.path.join("/")}: ${unwrap(error)}`;
const navigate = (value, path) => path
    ?.split("/")
    .filter((item) => item)
    .reduce((current, key) => current?.[key], value);
export const validationError = (sourceId, errors, sourceValue) => new Error(`Validation for '${sourceId}' failed${errors?.length
    ? ":\n" +
        errors
            .map((error) => ` - ${error.instancePath} ${error.message} (${map({
            value: JSON.stringify(navigate(sourceValue, error.instancePath)).slice(0, 100),
            ...error.params,
        }, ([key, value]) => key !== "type" ? `${key}: ${value}` : undefined).join(", ")}).`)
            .join("\n")
    : "."}`);
//# sourceMappingURL=parseSchema.js.map