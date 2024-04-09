import { forEach, isDefined, isInteger, isNumber, isString, single, unlock, } from "@tailjs/util";
const primitiveSchema = {
    id: "urn:tailjs:primitive",
    classification: 0 /* DataClassification.Anonymous */,
    purposes: -1 /* DataPurposes.Any */,
    types: new Map(),
};
const primitiveShared = {
    classification: 0 /* DataClassification.Anonymous */,
    purposes: -1 /* DataPurposes.Any */,
    primitive: true,
    schema: primitiveSchema,
    censor: (value) => value,
    validate: (value) => value,
};
export const primitives = {
    boolean: {
        id: primitiveSchema + "#boolean",
        name: "boolean",
        ...primitiveShared,
    },
    integer: {
        id: primitiveSchema + "#integer",
        name: "integer",
        ...primitiveShared,
    },
    float: {
        id: primitiveSchema + "#float",
        name: "float",
        ...primitiveShared,
    },
    string: {
        id: primitiveSchema + "#string",
        name: "string",
        ...primitiveShared,
    },
    date: {
        id: primitiveSchema + "#date",
        name: "datetime",
        ...primitiveShared,
    },
    time: {
        id: primitiveSchema + "#time",
        name: "time",
        ...primitiveShared,
    },
    duration: {
        id: primitiveSchema + "#duration",
        name: "duration",
        ...primitiveShared,
    },
    datetime: {
        id: primitiveSchema + "#datetime",
        name: "datetime",
        ...primitiveShared,
    },
    uuid: {
        id: primitiveSchema + "#uuid",
        name: "uuid",
        ...primitiveShared,
    },
};
forEach(primitives, ([, type]) => unlock(primitiveSchema.types).set(type.id, type));
export const inferPrimitiveFromValue = (value) => isString(value)
    ? primitives.string
    : isInteger(value)
        ? primitives.integer
        : isNumber(value)
            ? primitives.float
            : undefined;
export const tryParsePrimitiveType = (schemaProperty) => {
    switch (schemaProperty?.type) {
        case "integer":
            return primitives.integer;
        case "number":
            return primitives.float;
        case "string":
            switch (schemaProperty.format) {
                case "date":
                    return primitives.date;
                case "date-time":
                    return primitives.datetime;
                case "time":
                    return primitives.time;
                case "duration":
                    return primitives.duration;
                case "uuid":
                    return primitives.uuid;
                default:
                    return primitives.string;
            }
        default:
            const allowedValues = isDefined(schemaProperty.const)
                ? [schemaProperty.const]
                : schemaProperty.enum;
            const type = schemaProperty.const
                ? inferPrimitiveFromValue(schemaProperty.const)
                : single(schemaProperty.enum, inferPrimitiveFromValue);
            return type && { ...type, allowedValues };
    }
};
//# sourceMappingURL=primitives.js.map