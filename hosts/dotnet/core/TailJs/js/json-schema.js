import { dataPurposes, dataClassification, DataClassification, DataPurposeFlags, variableScope, formatKey, validateConsent } from '@tailjs/types';

const SchemaSystemTypes = Object.freeze({
    Event: "urn:tailjs:core:event"
});
const SchemaAnnotations = Object.freeze({
    Tags: "x-tags",
    Purpose: "x-privacy-purpose",
    Purposes: "x-privacy-purposes",
    Classification: "x-privacy-class",
    Censor: "x-privacy-censor",
    /**
   * The version of an entity. When applied at schema level this will be the default, but can be used at type level.
   * ETL can use this for consistency and backwards compatibility.
   */ Version: "x-version"
});
const EntityMetadata = Object.freeze({
    TypeId: "@schema"
});

const throwError = (error, transform = (message)=>new Error(message))=>{
    throw isString(error = unwrap(error)) ? transform(error) : error;
};
const validate$1 = (value, validate, validationError, undefinedError)=>(isArray(validate) ? validate.every((test)=>test(value)) : isFunction(validate) ? validate(value) : validate) ? value : required$2(value, undefinedError ?? validationError) && throwError(validationError ?? "Validation failed.");
class InvariantViolatedError extends Error {
    constructor(invariant){
        super(invariant ? "INV: " + invariant : "An invariant was violated.");
    }
}
/**
 * States an invariant.
 */ const invariant = (test, description)=>{
    const valid = unwrap(test);
    return valid != null && valid !== false ? valid : throwError(new InvariantViolatedError(description));
};
const required$2 = (value, error)=>value != null ? value : throwError(error ?? "A required value is missing", (text)=>new TypeError(text.replace("...", " is required.")));
const tryCatch = (expression, errorHandler = true, always)=>{
    try {
        return expression();
    } catch (e) {
        return isFunction(errorHandler) ? isError(e = errorHandler(e)) ? throwError(e) : e : isBoolean(errorHandler) ? console.error(errorHandler ? throwError(e) : e) : errorHandler;
    } finally{
        always?.();
    }
};
/** Minify friendly version of `false`. */ const undefined$1 = void 0;
/** Caching this value potentially speeds up tests rather than using `Number.MAX_SAFE_INTEGER`. */ const MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER;
/** Minify friendly version of `null`. */ const nil = null;
/** A function that filters out values != null. */ const FILTER_NULLISH = (item)=>item != nil;
/** Using this cached value speeds up testing if an object is iterable seemingly by an order of magnitude. */ const symbolIterator = Symbol.iterator;
const ifDefined = (value, resultOrProperty)=>isFunction(resultOrProperty) ? value !== undefined$1 ? resultOrProperty(value) : undefined$1 : value?.[resultOrProperty] !== undefined$1 ? value : undefined$1;
const isBoolean = (value)=>typeof value === "boolean";
const isTruish = (value)=>!!value;
const isInteger = Number.isSafeInteger;
const isNumber = (value)=>typeof value === "number";
const isString = (value)=>typeof value === "string";
const isArray = Array.isArray;
const isError = (value)=>value instanceof Error;
/**
 * Returns the value as an array following these rules:
 * - If the value is undefined (this does not include `null`), so is the return value.
 * - If the value is already an array its original value is returned unless `clone` is true. In that case a copy of the value is returned.
 * - If the value is iterable, an array containing its values is returned
 * - Otherwise, an array with the value as its single item is returned.
 */ const array = (value, clone = false)=>value == null ? undefined$1 : !clone && isArray(value) ? value : isIterable(value) ? [
        ...value
    ] : [
        value
    ];
const isObject = (value)=>value !== null && typeof value === "object";
const objectPrototype = Object.prototype;
const getPrototypeOf = Object.getPrototypeOf;
const isPlainObject = (value)=>value != null && getPrototypeOf(value) === objectPrototype;
const isFunction = (value)=>typeof value === "function";
const isIterable = (value, acceptStrings = false)=>!!(value?.[symbolIterator] && (typeof value === "object" || acceptStrings));
const isMap = (value)=>value instanceof Map;
const isSet = (value)=>value instanceof Set;
let stopInvoked = false;
const stop = (yieldValue)=>(stopInvoked = true, yieldValue);
const wrapProjection = (projection)=>projection == null ? undefined$1 : isFunction(projection) ? projection : (item)=>item[projection];
function* createFilteringIterator(source, projection) {
    if (source == null) return;
    if (projection) {
        projection = wrapProjection(projection);
        let i = 0;
        for (let item of source){
            if ((item = projection(item, i++)) != null) {
                yield item;
            }
            if (stopInvoked) {
                stopInvoked = false;
                break;
            }
        }
    } else {
        for (let item of source){
            if (item != null) yield item;
        }
    }
}
function* createObjectIterator(source, action) {
    action = wrapProjection(action);
    let i = 0;
    for(const key in source){
        let value = [
            key,
            source[key]
        ];
        action && (value = action(value, i++));
        if (value != null) {
            yield value;
        }
        if (stopInvoked) {
            stopInvoked = false;
            break;
        }
    }
}
function* createRangeIterator(length = 0, offset) {
    if (length < 0) {
        offset ??= -length - 1;
        while(length++)yield offset--;
    } else {
        offset ??= 0;
        while(length--)yield offset++;
    }
}
function* createNavigatingIterator(step, start, maxIterations = Number.MAX_SAFE_INTEGER) {
    if (start != null) yield start;
    while(maxIterations-- && (start = step(start)) != null){
        yield start;
    }
}
const sliceAction = (action, start, end)=>(start ?? end) !== undefined$1 ? (action = wrapProjection(action), start ??= 0, end ??= MAX_SAFE_INTEGER, (value, index)=>start-- ? undefined$1 : end-- ? action ? action(value, index) : value : end) : action;
/** Faster way to exclude null'ish elements from an array than using {@link filter} or {@link map} */ const filterArray = (array)=>array?.filter(FILTER_NULLISH);
const createIterator = (source, projection, start, end)=>source == null ? [] : !projection && isArray(source) ? filterArray(source) : source[symbolIterator] ? createFilteringIterator(source, start === undefined$1 ? projection : sliceAction(projection, start, end)) : isObject(source) ? createObjectIterator(source, sliceAction(projection, start, end)) : createIterator(isFunction(source) ? createNavigatingIterator(source, start, end) : createRangeIterator(source, start), projection);
const project = (source, projection, start, end)=>createIterator(source, projection, start, end);
const map = (source, projection, start, end)=>{
    projection = wrapProjection(projection);
    if (isArray(source)) {
        let i = 0;
        const mapped = [];
        start = start < 0 ? source.length + start : start ?? 0;
        end = end < 0 ? source.length + end : end ?? source.length;
        for(; start < end && !stopInvoked; start++){
            let value = source[start];
            if ((projection ? value = projection(value, i++) : value) != null) {
                mapped.push(value);
            }
        }
        stopInvoked = false;
        return mapped;
    }
    return source != null ? array(project(source, projection, start, end)) : undefined$1;
};
const distinct = (source, projection, start, end)=>source != null ? new Set([
        ...project(source, projection, start, end)
    ]) : undefined$1;
const single = (source, projection, start, end)=>source == null ? undefined$1 : (source = mapDistinct(source, projection, start, end)).length > 1 ? undefined$1 : source[0];
const mapDistinct = (source, projection, start, end)=>source != null ? [
        ...distinct(source, projection, start, end)
    ] : source;
const traverseInternal = (root, selector, include, results, seen)=>{
    if (isArray(root)) {
        forEachInternal(root, (item)=>traverseInternal(item, selector, include, results, seen));
        return results;
    }
    if (!root || !add(seen, root)) {
        return undefined$1;
    }
    include && results.push(root);
    forEachInternal(selector(root), (item)=>traverseInternal(item, selector, true, results, seen));
    return results;
};
const concat = (...items)=>{
    let merged;
    forEach(items.length === 1 ? items[0] : items, (item)=>item != null && (merged ??= []).push(...array(item)));
    return merged;
};
const expand = (root, selector, includeSelf = true)=>traverseInternal(root, selector, includeSelf, [], new Set());
const forEachArray = (source, action, start, end)=>{
    let returnValue;
    let i = 0;
    start = start < 0 ? source.length + start : start ?? 0;
    end = end < 0 ? source.length + end : end ?? source.length;
    for(; start < end; start++){
        if (source[start] != null && (returnValue = action(source[start], i++) ?? returnValue, stopInvoked)) {
            stopInvoked = false;
            break;
        }
    }
    return returnValue;
};
const forEachIterable = (source, action)=>{
    let returnValue;
    let i = 0;
    for (let value of source){
        if (value != null && (returnValue = action(value, i++) ?? returnValue, stopInvoked)) {
            stopInvoked = false;
            break;
        }
    }
    return returnValue;
};
const forEachObject = (source, action)=>{
    let returnValue;
    let i = 0;
    for(let key in source){
        if (returnValue = action([
            key,
            source[key]
        ], i++) ?? returnValue, stopInvoked) {
            stopInvoked = false;
            break;
        }
    }
    return returnValue;
};
const forEachInternal = (source, action, start, end)=>{
    if (source == null) return;
    if (isArray(source)) return forEachArray(source, action, start, end);
    if (start === undefined$1) {
        if (source[symbolIterator]) return forEachIterable(source, action);
        if (typeof source === "object") return forEachObject(source, action);
    }
    let returnValue;
    for (const value of createIterator(source, action, start, end)){
        value != null && (returnValue = value);
    }
    return returnValue;
};
const forEach = forEachInternal;
const fromEntries = Object.fromEntries;
/**
 * Like Object.fromEntries, but accepts any iterable source and a projection instead of just key/value pairs.
 * Properties with undefined values are not included in the resulting object.
 */ const obj = (source, selector, merge)=>{
    if (source == null) return undefined$1;
    if (isBoolean(selector) || merge) {
        let result = {};
        forEach(source, merge ? (item, i)=>(item = selector(item, i)) != null && (item[1] = merge(result[item[0]], item[1])) != null && (result[item[0]] = item[1]) : (source)=>forEach(source, selector ? (item)=>item?.[1] != null && ((result[item[0]] ??= []).push(item[1]), result) : (item)=>item?.[1] != null && (result[item[0]] = item[1], result)));
        return result;
    }
    return fromEntries(map(source, selector ? (item, index)=>ifDefined(selector(item, index), 1) : (item)=>ifDefined(item, 1)));
};
const first = (source, predicate, start, end)=>source == null ? undefined$1 : forEachInternal(source, (value, i)=>!predicate || predicate(value, i) ? stop(value) : undefined$1, start, end);
const some = (source, predicate, start, end)=>source == null ? undefined$1 : isPlainObject(source) && !predicate ? Object.keys(source).length > 0 : source.some?.(predicate ?? isTruish) ?? forEachInternal(source, predicate ? (item, index)=>predicate(item, index) ? stop(true) : false : ()=>stop(true), start, end) ?? false;
// #endregion
// #region get
const updateSingle = (target, key, value)=>setSingle(target, key, isFunction(value) ? value(get(target, key)) : value);
const setSingle = (target, key, value)=>{
    if (target.constructor === Object || isArray(target)) {
        value === undefined ? delete target[key] : target[key] = value;
        return value;
    }
    value === undefined ? target.delete ? target.delete(key) : delete target[key] : target.set ? target.set(key, value) : target.add ? value ? target.add(key) : target.delete(key) : target[key] = value;
    return value;
};
const setSingleIfNotDefined = (target, key, value, error)=>{
    const currentValue = get(target, key);
    if (currentValue != null) {
        throwError(error(key, currentValue, value, target));
    }
    return setSingle(target, key, value);
};
const get = (target, key, init)=>{
    if (!target) return undefined;
    if (target.constructor === Object && init == null) return target[key];
    let value = target.get ? target.get(key) : target.has ? target.has(key) : target[key];
    if (value === undefined && init != null) {
        (value = isFunction(init) ? init() : init) != null && setSingle(target, key, value);
    }
    return value;
};
const merge = (target, ...values)=>(forEach(values, (values)=>forEach(values, ([key, value])=>{
            if (value != null) {
                if (isPlainObject(target[key]) && isPlainObject(value)) {
                    merge(target[key], value);
                } else {
                    target[key] = value;
                }
            }
        })), target);
const createSetOrUpdateFunction = (setter)=>(target, key, value, error)=>{
        if (!target) return undefined;
        if (value != undefined) {
            return setter(target, key, value, error);
        }
        forEach(key, (item)=>isArray(item) ? setter(target, item[0], item[1]) : forEach(item, ([key, value])=>setter(target, key, value)));
        return target;
    };
const assign = createSetOrUpdateFunction(setSingle);
const update = createSetOrUpdateFunction(updateSingle);
const assignIfUndefined = createSetOrUpdateFunction(setSingleIfNotDefined);
// #endregion
const add = (target, key)=>target instanceof Set || target instanceof WeakSet ? target.has(key) ? false : (target.add(key), true) : get(target, key) !== assign(target, key, true);
const unwrap = (value)=>isFunction(value) ? value() : value;
const unlock = (readonly)=>readonly;
/** Creates a clone of an object (including arrays, sets and maps) at the specified depth. -1 means "any depth". */ const clone = (value, depth = -1)=>isArray(value) ? depth ? value.map((value)=>clone(value, depth - 1)) : [
        ...value
    ] : isPlainObject(value) ? depth ? obj(value, ([k, v])=>[
            k,
            clone(v, depth - 1)
        ]) : {
        ...value
    } : isSet(value) ? new Set(depth ? map(value, (value)=>clone(value, depth - 1)) : value) : isMap(value) ? new Map(depth ? map(value, (value)=>[
            value[0],
            clone(value[1], depth - 1)
        ]) : value) : value;
const changeCase = (s, upper)=>s == null ? s : upper ? s.toUpperCase() : s.toLowerCase();
const changeIdentifierCaseStyle = (identifier, type)=>identifier.replace(/([_-]*)(\$*(?:[A-Z]+|[a-z]))([a-z0-9]*)/g, (_, underscores, initial, rest, index)=>(underscores && (!index || type === "kebab" || type === "snake") ? underscores.replace(/./g, type === "snake" ? "-" : "_") : "") + ((index && (type === "kebab" || type === "snake") && !underscores ? type === "snake" ? "-" : "_" : "") + changeCase(initial, type === "pascal" || type === "camel" && index) + changeCase(type === "kebab" || type === "snake" ? rest.replace(/(?<=\D)\d|(?<=\d)\D/g, type === "kebab" ? "_$&" : "-$&") : rest, false)));

const parsePrivacyTokens = (tokens, classification = {})=>{
    tokens.split(/[,\s]/).map((keyword)=>keyword.trim()).filter((item)=>item).forEach((keyword)=>{
        if (keyword === "censor-ignore" || keyword === "censor-include") {
            classification.censorIgnore ??= keyword === "censor-ignore";
            return;
        }
        let matched = false;
        let parsed = dataPurposes.tryParse(keyword) ?? dataPurposes.tryParse(keyword.replace(/\-purpose$/g, ""));
        if (parsed != null) {
            classification.purposes = (classification.purposes ?? 0) | parsed;
            matched = true;
        }
        parsed = dataClassification.tryParse(keyword) ?? dataClassification.tryParse(keyword.replace(/^personal-/g, ""));
        if (parsed != null) {
            if (classification.classification && parsed !== classification.classification) {
                throwError(`The data classification '${dataClassification.format(classification.classification)}' has already been specified and conflicts with the classification'${dataClassification.format(parsed)} inferred from the description.`);
            }
            classification.classification ??= parsed;
            matched = true;
        }
        !matched && throwError(`Unknown privacy keyword '${keyword}'.`);
    });
    return classification;
};
const getPrivacyAnnotations = (classification)=>{
    const attrs = {};
    classification.classification != null && (attrs[SchemaAnnotations.Classification] = dataClassification.format(classification.classification));
    let purposes = dataPurposes.format(classification.purposes);
    purposes != null && (attrs[isString(purposes) ? SchemaAnnotations.Purpose : SchemaAnnotations.Purposes] = purposes);
    classification.censorIgnore != null && (attrs[SchemaAnnotations.Censor] = classification.censorIgnore ? "ignore" : "include");
    return attrs;
};

const isObjectType = (type)=>!type.primitive;
const isPrimitiveType = (type)=>type.primitive;

const primitiveSchema = {
    id: "urn:tailjs:primitive",
    title: "Primitive types",
    classification: DataClassification.Anonymous,
    purposes: DataPurposeFlags.Any,
    types: new Map()
};
const primitiveShared = {
    classification: DataClassification.Anonymous,
    purposes: DataPurposeFlags.Any,
    primitive: true,
    schema: primitiveSchema,
    patch: (value)=>value,
    validate: (value)=>value
};
const primitives = {
    boolean: {
        id: primitiveSchema.id + "#boolean",
        name: "boolean",
        ...primitiveShared
    },
    integer: {
        id: primitiveSchema.id + "#integer",
        name: "integer",
        ...primitiveShared
    },
    float: {
        id: primitiveSchema.id + "#float",
        name: "float",
        ...primitiveShared
    },
    string: {
        id: primitiveSchema.id + "#string",
        name: "string",
        ...primitiveShared
    },
    date: {
        id: primitiveSchema.id + "#date",
        name: "datetime",
        ...primitiveShared
    },
    time: {
        id: primitiveSchema.id + "#time",
        name: "time",
        ...primitiveShared
    },
    duration: {
        id: primitiveSchema.id + "#duration",
        name: "duration",
        ...primitiveShared
    },
    datetime: {
        id: primitiveSchema.id + "#datetime",
        name: "datetime",
        ...primitiveShared
    },
    uuid: {
        id: primitiveSchema.id + "#uuid",
        name: "uuid",
        ...primitiveShared
    }
};
forEach(primitives, ([, type])=>unlock(primitiveSchema.types).set(type.id, type));
const inferPrimitiveFromValue = (value)=>isString(value) ? primitives.string : isInteger(value) ? primitives.integer : isNumber(value) ? primitives.float : undefined;
const tryParsePrimitiveType = (schemaProperty)=>{
    if (!schemaProperty) return undefined;
    switch(schemaProperty.type){
        case "integer":
            return primitives.integer;
        case "number":
            return primitives.float;
        case "string":
            switch(schemaProperty.format){
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
            if (schemaProperty.anyOf?.some((item)=>isNumber(item.const) || item.enum?.some(isNumber))) {
                // anyOf's with const numbers are interpreted as enums.
                // We do the fancy pants transformation where the string names are also included as valid enum values
                // so the criteria is that if any of the anyOf nodes have an `enum` property containing a number, it is also considered a number.
                return primitives.integer;
            }
            const allowedValues = schemaProperty.const != null ? [
                schemaProperty.const
            ] : schemaProperty.enum;
            const type = schemaProperty.const ? inferPrimitiveFromValue(schemaProperty.const) : single(schemaProperty.enum, inferPrimitiveFromValue);
            return type && {
                ...type,
                allowedValues
            };
    }
};

class SchemaVariableSet {
    _variables;
    schemas;
    /** @internal */ constructor(manager, schemas){
        this.schemas = map(array(schemas), (schema)=>isString(schema) ? manager.getSchema(schema, true) : schema);
        this._variables = new Map();
        this.schemas.forEach((schema)=>{
            forEach(schema.variables, ([scope, keys])=>forEach(keys, ([key, variable])=>{
                    update(get(this._variables, scope, ()=>new Map()), key, (current)=>current != null ? throwError(`The variable '${key}' in ${variableScope.lookup(scope)} scope from the schema '${variable.declaringType.schema.id}' is already defined in the other schema '${current.declaringType.schema.id}'.`) : variable);
                }));
        });
    }
    has(key) {
        return key == null ? false : this._variables.get(variableScope(key.scope))?.has(key.key) == true;
    }
    get(key) {
        return key == null ? undefined : this._variables.get(variableScope(key.scope))?.get(key.key);
    }
    tryValidate(key, value) {
        return this.get(key)?.tryValidate(value);
    }
    validate(key, value) {
        return tryCatch(()=>required$2(this.get(key), "Variable not found.").validate(value), (err)=>new Error(`${formatKey(key)}: ${err}`));
    }
    patch(key, value, consent, validate = true, write = false) {
        return ifDefined(this.get(key), (variable)=>(validate && variable.validate(value), consent && !validateConsent(variable, consent, undefined, write) ? undefined : variable.patch(value, consent, write)));
    }
}

var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

function getDefaultExportFromCjs (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

var dist = {exports: {}};

var formats = {};

(function (exports) {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.formatNames = exports.fastFormats = exports.fullFormats = void 0;
	function fmtDef(validate, compare) {
	    return { validate, compare };
	}
	exports.fullFormats = {
	    // date: http://tools.ietf.org/html/rfc3339#section-5.6
	    date: fmtDef(date, compareDate),
	    // date-time: http://tools.ietf.org/html/rfc3339#section-5.6
	    time: fmtDef(time, compareTime),
	    "date-time": fmtDef(date_time, compareDateTime),
	    // duration: https://tools.ietf.org/html/rfc3339#appendix-A
	    duration: /^P(?!$)((\d+Y)?(\d+M)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+S)?)?|(\d+W)?)$/,
	    uri,
	    "uri-reference": /^(?:[a-z][a-z0-9+\-.]*:)?(?:\/?\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:]|%[0-9a-f]{2})*@)?(?:\[(?:(?:(?:(?:[0-9a-f]{1,4}:){6}|::(?:[0-9a-f]{1,4}:){5}|(?:[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){4}|(?:(?:[0-9a-f]{1,4}:){0,1}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){3}|(?:(?:[0-9a-f]{1,4}:){0,2}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){2}|(?:(?:[0-9a-f]{1,4}:){0,3}[0-9a-f]{1,4})?::[0-9a-f]{1,4}:|(?:(?:[0-9a-f]{1,4}:){0,4}[0-9a-f]{1,4})?::)(?:[0-9a-f]{1,4}:[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?))|(?:(?:[0-9a-f]{1,4}:){0,5}[0-9a-f]{1,4})?::[0-9a-f]{1,4}|(?:(?:[0-9a-f]{1,4}:){0,6}[0-9a-f]{1,4})?::)|[Vv][0-9a-f]+\.[a-z0-9\-._~!$&'()*+,;=:]+)\]|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)|(?:[a-z0-9\-._~!$&'"()*+,;=]|%[0-9a-f]{2})*)(?::\d*)?(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*|\/(?:(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*)?|(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*)?(?:\?(?:[a-z0-9\-._~!$&'"()*+,;=:@/?]|%[0-9a-f]{2})*)?(?:#(?:[a-z0-9\-._~!$&'"()*+,;=:@/?]|%[0-9a-f]{2})*)?$/i,
	    // uri-template: https://tools.ietf.org/html/rfc6570
	    "uri-template": /^(?:(?:[^\x00-\x20"'<>%\\^`{|}]|%[0-9a-f]{2})|\{[+#./;?&=,!@|]?(?:[a-z0-9_]|%[0-9a-f]{2})+(?::[1-9][0-9]{0,3}|\*)?(?:,(?:[a-z0-9_]|%[0-9a-f]{2})+(?::[1-9][0-9]{0,3}|\*)?)*\})*$/i,
	    // For the source: https://gist.github.com/dperini/729294
	    // For test cases: https://mathiasbynens.be/demo/url-regex
	    url: /^(?:https?|ftp):\/\/(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z0-9\u{00a1}-\u{ffff}]+-)*[a-z0-9\u{00a1}-\u{ffff}]+)(?:\.(?:[a-z0-9\u{00a1}-\u{ffff}]+-)*[a-z0-9\u{00a1}-\u{ffff}]+)*(?:\.(?:[a-z\u{00a1}-\u{ffff}]{2,})))(?::\d{2,5})?(?:\/[^\s]*)?$/iu,
	    email: /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i,
	    hostname: /^(?=.{1,253}\.?$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[-0-9a-z]{0,61}[0-9a-z])?)*\.?$/i,
	    // optimized https://www.safaribooksonline.com/library/view/regular-expressions-cookbook/9780596802837/ch07s16.html
	    ipv4: /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$/,
	    ipv6: /^((([0-9a-f]{1,4}:){7}([0-9a-f]{1,4}|:))|(([0-9a-f]{1,4}:){6}(:[0-9a-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9a-f]{1,4}:){5}(((:[0-9a-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9a-f]{1,4}:){4}(((:[0-9a-f]{1,4}){1,3})|((:[0-9a-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){3}(((:[0-9a-f]{1,4}){1,4})|((:[0-9a-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){2}(((:[0-9a-f]{1,4}){1,5})|((:[0-9a-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){1}(((:[0-9a-f]{1,4}){1,6})|((:[0-9a-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9a-f]{1,4}){1,7})|((:[0-9a-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))$/i,
	    regex,
	    // uuid: http://tools.ietf.org/html/rfc4122
	    uuid: /^(?:urn:uuid:)?[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i,
	    // JSON-pointer: https://tools.ietf.org/html/rfc6901
	    // uri fragment: https://tools.ietf.org/html/rfc3986#appendix-A
	    "json-pointer": /^(?:\/(?:[^~/]|~0|~1)*)*$/,
	    "json-pointer-uri-fragment": /^#(?:\/(?:[a-z0-9_\-.!$&'()*+,;:=@]|%[0-9a-f]{2}|~0|~1)*)*$/i,
	    // relative JSON-pointer: http://tools.ietf.org/html/draft-luff-relative-json-pointer-00
	    "relative-json-pointer": /^(?:0|[1-9][0-9]*)(?:#|(?:\/(?:[^~/]|~0|~1)*)*)$/,
	    // the following formats are used by the openapi specification: https://spec.openapis.org/oas/v3.0.0#data-types
	    // byte: https://github.com/miguelmota/is-base64
	    byte,
	    // signed 32 bit integer
	    int32: { type: "number", validate: validateInt32 },
	    // signed 64 bit integer
	    int64: { type: "number", validate: validateInt64 },
	    // C-type float
	    float: { type: "number", validate: validateNumber },
	    // C-type double
	    double: { type: "number", validate: validateNumber },
	    // hint to the UI to hide input strings
	    password: true,
	    // unchecked string payload
	    binary: true,
	};
	exports.fastFormats = {
	    ...exports.fullFormats,
	    date: fmtDef(/^\d\d\d\d-[0-1]\d-[0-3]\d$/, compareDate),
	    time: fmtDef(/^(?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)?$/i, compareTime),
	    "date-time": fmtDef(/^\d\d\d\d-[0-1]\d-[0-3]\d[t\s](?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)$/i, compareDateTime),
	    // uri: https://github.com/mafintosh/is-my-json-valid/blob/master/formats.js
	    uri: /^(?:[a-z][a-z0-9+\-.]*:)(?:\/?\/)?[^\s]*$/i,
	    "uri-reference": /^(?:(?:[a-z][a-z0-9+\-.]*:)?\/?\/)?(?:[^\\\s#][^\s#]*)?(?:#[^\\\s]*)?$/i,
	    // email (sources from jsen validator):
	    // http://stackoverflow.com/questions/201323/using-a-regular-expression-to-validate-an-email-address#answer-8829363
	    // http://www.w3.org/TR/html5/forms.html#valid-e-mail-address (search for 'wilful violation')
	    email: /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/i,
	};
	exports.formatNames = Object.keys(exports.fullFormats);
	function isLeapYear(year) {
	    // https://tools.ietf.org/html/rfc3339#appendix-C
	    return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
	}
	const DATE = /^(\d\d\d\d)-(\d\d)-(\d\d)$/;
	const DAYS = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
	function date(str) {
	    // full-date from http://tools.ietf.org/html/rfc3339#section-5.6
	    const matches = DATE.exec(str);
	    if (!matches)
	        return false;
	    const year = +matches[1];
	    const month = +matches[2];
	    const day = +matches[3];
	    return (month >= 1 &&
	        month <= 12 &&
	        day >= 1 &&
	        day <= (month === 2 && isLeapYear(year) ? 29 : DAYS[month]));
	}
	function compareDate(d1, d2) {
	    if (!(d1 && d2))
	        return undefined;
	    if (d1 > d2)
	        return 1;
	    if (d1 < d2)
	        return -1;
	    return 0;
	}
	const TIME = /^(\d\d):(\d\d):(\d\d)(\.\d+)?(z|[+-]\d\d(?::?\d\d)?)?$/i;
	function time(str, withTimeZone) {
	    const matches = TIME.exec(str);
	    if (!matches)
	        return false;
	    const hour = +matches[1];
	    const minute = +matches[2];
	    const second = +matches[3];
	    const timeZone = matches[5];
	    return (((hour <= 23 && minute <= 59 && second <= 59) ||
	        (hour === 23 && minute === 59 && second === 60)) &&
	        (!withTimeZone || timeZone !== ""));
	}
	function compareTime(t1, t2) {
	    if (!(t1 && t2))
	        return undefined;
	    const a1 = TIME.exec(t1);
	    const a2 = TIME.exec(t2);
	    if (!(a1 && a2))
	        return undefined;
	    t1 = a1[1] + a1[2] + a1[3] + (a1[4] || "");
	    t2 = a2[1] + a2[2] + a2[3] + (a2[4] || "");
	    if (t1 > t2)
	        return 1;
	    if (t1 < t2)
	        return -1;
	    return 0;
	}
	const DATE_TIME_SEPARATOR = /t|\s/i;
	function date_time(str) {
	    // http://tools.ietf.org/html/rfc3339#section-5.6
	    const dateTime = str.split(DATE_TIME_SEPARATOR);
	    return dateTime.length === 2 && date(dateTime[0]) && time(dateTime[1], true);
	}
	function compareDateTime(dt1, dt2) {
	    if (!(dt1 && dt2))
	        return undefined;
	    const [d1, t1] = dt1.split(DATE_TIME_SEPARATOR);
	    const [d2, t2] = dt2.split(DATE_TIME_SEPARATOR);
	    const res = compareDate(d1, d2);
	    if (res === undefined)
	        return undefined;
	    return res || compareTime(t1, t2);
	}
	const NOT_URI_FRAGMENT = /\/|:/;
	const URI = /^(?:[a-z][a-z0-9+\-.]*:)(?:\/?\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:]|%[0-9a-f]{2})*@)?(?:\[(?:(?:(?:(?:[0-9a-f]{1,4}:){6}|::(?:[0-9a-f]{1,4}:){5}|(?:[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){4}|(?:(?:[0-9a-f]{1,4}:){0,1}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){3}|(?:(?:[0-9a-f]{1,4}:){0,2}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){2}|(?:(?:[0-9a-f]{1,4}:){0,3}[0-9a-f]{1,4})?::[0-9a-f]{1,4}:|(?:(?:[0-9a-f]{1,4}:){0,4}[0-9a-f]{1,4})?::)(?:[0-9a-f]{1,4}:[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?))|(?:(?:[0-9a-f]{1,4}:){0,5}[0-9a-f]{1,4})?::[0-9a-f]{1,4}|(?:(?:[0-9a-f]{1,4}:){0,6}[0-9a-f]{1,4})?::)|[Vv][0-9a-f]+\.[a-z0-9\-._~!$&'()*+,;=:]+)\]|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)|(?:[a-z0-9\-._~!$&'()*+,;=]|%[0-9a-f]{2})*)(?::\d*)?(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*|\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*)?|(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*)(?:\?(?:[a-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9a-f]{2})*)?(?:#(?:[a-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9a-f]{2})*)?$/i;
	function uri(str) {
	    // http://jmrware.com/articles/2009/uri_regexp/URI_regex.html + optional protocol + required "."
	    return NOT_URI_FRAGMENT.test(str) && URI.test(str);
	}
	const BYTE = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/gm;
	function byte(str) {
	    BYTE.lastIndex = 0;
	    return BYTE.test(str);
	}
	const MIN_INT32 = -(2 ** 31);
	const MAX_INT32 = 2 ** 31 - 1;
	function validateInt32(value) {
	    return Number.isInteger(value) && value <= MAX_INT32 && value >= MIN_INT32;
	}
	function validateInt64(value) {
	    // JSON and javascript max Int is 2**53, so any int that passes isInteger is valid for Int64
	    return Number.isInteger(value);
	}
	function validateNumber() {
	    return true;
	}
	const Z_ANCHOR = /[^\\]\\Z/;
	function regex(str) {
	    if (Z_ANCHOR.test(str))
	        return false;
	    try {
	        new RegExp(str);
	        return true;
	    }
	    catch (e) {
	        return false;
	    }
	}
	
} (formats));

var limit = {};

var ajv = {exports: {}};

var core$3 = {};

var validate = {};

var boolSchema = {};

var errors = {};

var codegen = {};

var code$1 = {};

(function (exports) {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.regexpCode = exports.getEsmExportName = exports.getProperty = exports.safeStringify = exports.stringify = exports.strConcat = exports.addCodeArg = exports.str = exports._ = exports.nil = exports._Code = exports.Name = exports.IDENTIFIER = exports._CodeOrName = void 0;
	class _CodeOrName {
	}
	exports._CodeOrName = _CodeOrName;
	exports.IDENTIFIER = /^[a-z$_][a-z$_0-9]*$/i;
	class Name extends _CodeOrName {
	    constructor(s) {
	        super();
	        if (!exports.IDENTIFIER.test(s))
	            throw new Error("CodeGen: name must be a valid identifier");
	        this.str = s;
	    }
	    toString() {
	        return this.str;
	    }
	    emptyStr() {
	        return false;
	    }
	    get names() {
	        return { [this.str]: 1 };
	    }
	}
	exports.Name = Name;
	class _Code extends _CodeOrName {
	    constructor(code) {
	        super();
	        this._items = typeof code === "string" ? [code] : code;
	    }
	    toString() {
	        return this.str;
	    }
	    emptyStr() {
	        if (this._items.length > 1)
	            return false;
	        const item = this._items[0];
	        return item === "" || item === '""';
	    }
	    get str() {
	        var _a;
	        return ((_a = this._str) !== null && _a !== void 0 ? _a : (this._str = this._items.reduce((s, c) => `${s}${c}`, "")));
	    }
	    get names() {
	        var _a;
	        return ((_a = this._names) !== null && _a !== void 0 ? _a : (this._names = this._items.reduce((names, c) => {
	            if (c instanceof Name)
	                names[c.str] = (names[c.str] || 0) + 1;
	            return names;
	        }, {})));
	    }
	}
	exports._Code = _Code;
	exports.nil = new _Code("");
	function _(strs, ...args) {
	    const code = [strs[0]];
	    let i = 0;
	    while (i < args.length) {
	        addCodeArg(code, args[i]);
	        code.push(strs[++i]);
	    }
	    return new _Code(code);
	}
	exports._ = _;
	const plus = new _Code("+");
	function str(strs, ...args) {
	    const expr = [safeStringify(strs[0])];
	    let i = 0;
	    while (i < args.length) {
	        expr.push(plus);
	        addCodeArg(expr, args[i]);
	        expr.push(plus, safeStringify(strs[++i]));
	    }
	    optimize(expr);
	    return new _Code(expr);
	}
	exports.str = str;
	function addCodeArg(code, arg) {
	    if (arg instanceof _Code)
	        code.push(...arg._items);
	    else if (arg instanceof Name)
	        code.push(arg);
	    else
	        code.push(interpolate(arg));
	}
	exports.addCodeArg = addCodeArg;
	function optimize(expr) {
	    let i = 1;
	    while (i < expr.length - 1) {
	        if (expr[i] === plus) {
	            const res = mergeExprItems(expr[i - 1], expr[i + 1]);
	            if (res !== undefined) {
	                expr.splice(i - 1, 3, res);
	                continue;
	            }
	            expr[i++] = "+";
	        }
	        i++;
	    }
	}
	function mergeExprItems(a, b) {
	    if (b === '""')
	        return a;
	    if (a === '""')
	        return b;
	    if (typeof a == "string") {
	        if (b instanceof Name || a[a.length - 1] !== '"')
	            return;
	        if (typeof b != "string")
	            return `${a.slice(0, -1)}${b}"`;
	        if (b[0] === '"')
	            return a.slice(0, -1) + b.slice(1);
	        return;
	    }
	    if (typeof b == "string" && b[0] === '"' && !(a instanceof Name))
	        return `"${a}${b.slice(1)}`;
	    return;
	}
	function strConcat(c1, c2) {
	    return c2.emptyStr() ? c1 : c1.emptyStr() ? c2 : str `${c1}${c2}`;
	}
	exports.strConcat = strConcat;
	// TODO do not allow arrays here
	function interpolate(x) {
	    return typeof x == "number" || typeof x == "boolean" || x === null
	        ? x
	        : safeStringify(Array.isArray(x) ? x.join(",") : x);
	}
	function stringify(x) {
	    return new _Code(safeStringify(x));
	}
	exports.stringify = stringify;
	function safeStringify(x) {
	    return JSON.stringify(x)
	        .replace(/\u2028/g, "\\u2028")
	        .replace(/\u2029/g, "\\u2029");
	}
	exports.safeStringify = safeStringify;
	function getProperty(key) {
	    return typeof key == "string" && exports.IDENTIFIER.test(key) ? new _Code(`.${key}`) : _ `[${key}]`;
	}
	exports.getProperty = getProperty;
	//Does best effort to format the name properly
	function getEsmExportName(key) {
	    if (typeof key == "string" && exports.IDENTIFIER.test(key)) {
	        return new _Code(`${key}`);
	    }
	    throw new Error(`CodeGen: invalid export name: ${key}, use explicit $id name mapping`);
	}
	exports.getEsmExportName = getEsmExportName;
	function regexpCode(rx) {
	    return new _Code(rx.toString());
	}
	exports.regexpCode = regexpCode;
	
} (code$1));

var scope = {};

(function (exports) {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.ValueScope = exports.ValueScopeName = exports.Scope = exports.varKinds = exports.UsedValueState = void 0;
	const code_1 = code$1;
	class ValueError extends Error {
	    constructor(name) {
	        super(`CodeGen: "code" for ${name} not defined`);
	        this.value = name.value;
	    }
	}
	var UsedValueState;
	(function (UsedValueState) {
	    UsedValueState[UsedValueState["Started"] = 0] = "Started";
	    UsedValueState[UsedValueState["Completed"] = 1] = "Completed";
	})(UsedValueState || (exports.UsedValueState = UsedValueState = {}));
	exports.varKinds = {
	    const: new code_1.Name("const"),
	    let: new code_1.Name("let"),
	    var: new code_1.Name("var"),
	};
	class Scope {
	    constructor({ prefixes, parent } = {}) {
	        this._names = {};
	        this._prefixes = prefixes;
	        this._parent = parent;
	    }
	    toName(nameOrPrefix) {
	        return nameOrPrefix instanceof code_1.Name ? nameOrPrefix : this.name(nameOrPrefix);
	    }
	    name(prefix) {
	        return new code_1.Name(this._newName(prefix));
	    }
	    _newName(prefix) {
	        const ng = this._names[prefix] || this._nameGroup(prefix);
	        return `${prefix}${ng.index++}`;
	    }
	    _nameGroup(prefix) {
	        var _a, _b;
	        if (((_b = (_a = this._parent) === null || _a === void 0 ? void 0 : _a._prefixes) === null || _b === void 0 ? void 0 : _b.has(prefix)) || (this._prefixes && !this._prefixes.has(prefix))) {
	            throw new Error(`CodeGen: prefix "${prefix}" is not allowed in this scope`);
	        }
	        return (this._names[prefix] = { prefix, index: 0 });
	    }
	}
	exports.Scope = Scope;
	class ValueScopeName extends code_1.Name {
	    constructor(prefix, nameStr) {
	        super(nameStr);
	        this.prefix = prefix;
	    }
	    setValue(value, { property, itemIndex }) {
	        this.value = value;
	        this.scopePath = (0, code_1._) `.${new code_1.Name(property)}[${itemIndex}]`;
	    }
	}
	exports.ValueScopeName = ValueScopeName;
	const line = (0, code_1._) `\n`;
	class ValueScope extends Scope {
	    constructor(opts) {
	        super(opts);
	        this._values = {};
	        this._scope = opts.scope;
	        this.opts = { ...opts, _n: opts.lines ? line : code_1.nil };
	    }
	    get() {
	        return this._scope;
	    }
	    name(prefix) {
	        return new ValueScopeName(prefix, this._newName(prefix));
	    }
	    value(nameOrPrefix, value) {
	        var _a;
	        if (value.ref === undefined)
	            throw new Error("CodeGen: ref must be passed in value");
	        const name = this.toName(nameOrPrefix);
	        const { prefix } = name;
	        const valueKey = (_a = value.key) !== null && _a !== void 0 ? _a : value.ref;
	        let vs = this._values[prefix];
	        if (vs) {
	            const _name = vs.get(valueKey);
	            if (_name)
	                return _name;
	        }
	        else {
	            vs = this._values[prefix] = new Map();
	        }
	        vs.set(valueKey, name);
	        const s = this._scope[prefix] || (this._scope[prefix] = []);
	        const itemIndex = s.length;
	        s[itemIndex] = value.ref;
	        name.setValue(value, { property: prefix, itemIndex });
	        return name;
	    }
	    getValue(prefix, keyOrRef) {
	        const vs = this._values[prefix];
	        if (!vs)
	            return;
	        return vs.get(keyOrRef);
	    }
	    scopeRefs(scopeName, values = this._values) {
	        return this._reduceValues(values, (name) => {
	            if (name.scopePath === undefined)
	                throw new Error(`CodeGen: name "${name}" has no value`);
	            return (0, code_1._) `${scopeName}${name.scopePath}`;
	        });
	    }
	    scopeCode(values = this._values, usedValues, getCode) {
	        return this._reduceValues(values, (name) => {
	            if (name.value === undefined)
	                throw new Error(`CodeGen: name "${name}" has no value`);
	            return name.value.code;
	        }, usedValues, getCode);
	    }
	    _reduceValues(values, valueCode, usedValues = {}, getCode) {
	        let code = code_1.nil;
	        for (const prefix in values) {
	            const vs = values[prefix];
	            if (!vs)
	                continue;
	            const nameSet = (usedValues[prefix] = usedValues[prefix] || new Map());
	            vs.forEach((name) => {
	                if (nameSet.has(name))
	                    return;
	                nameSet.set(name, UsedValueState.Started);
	                let c = valueCode(name);
	                if (c) {
	                    const def = this.opts.es5 ? exports.varKinds.var : exports.varKinds.const;
	                    code = (0, code_1._) `${code}${def} ${name} = ${c};${this.opts._n}`;
	                }
	                else if ((c = getCode === null || getCode === void 0 ? void 0 : getCode(name))) {
	                    code = (0, code_1._) `${code}${c}${this.opts._n}`;
	                }
	                else {
	                    throw new ValueError(name);
	                }
	                nameSet.set(name, UsedValueState.Completed);
	            });
	        }
	        return code;
	    }
	}
	exports.ValueScope = ValueScope;
	
} (scope));

(function (exports) {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.or = exports.and = exports.not = exports.CodeGen = exports.operators = exports.varKinds = exports.ValueScopeName = exports.ValueScope = exports.Scope = exports.Name = exports.regexpCode = exports.stringify = exports.getProperty = exports.nil = exports.strConcat = exports.str = exports._ = void 0;
	const code_1 = code$1;
	const scope_1 = scope;
	var code_2 = code$1;
	Object.defineProperty(exports, "_", { enumerable: true, get: function () { return code_2._; } });
	Object.defineProperty(exports, "str", { enumerable: true, get: function () { return code_2.str; } });
	Object.defineProperty(exports, "strConcat", { enumerable: true, get: function () { return code_2.strConcat; } });
	Object.defineProperty(exports, "nil", { enumerable: true, get: function () { return code_2.nil; } });
	Object.defineProperty(exports, "getProperty", { enumerable: true, get: function () { return code_2.getProperty; } });
	Object.defineProperty(exports, "stringify", { enumerable: true, get: function () { return code_2.stringify; } });
	Object.defineProperty(exports, "regexpCode", { enumerable: true, get: function () { return code_2.regexpCode; } });
	Object.defineProperty(exports, "Name", { enumerable: true, get: function () { return code_2.Name; } });
	var scope_2 = scope;
	Object.defineProperty(exports, "Scope", { enumerable: true, get: function () { return scope_2.Scope; } });
	Object.defineProperty(exports, "ValueScope", { enumerable: true, get: function () { return scope_2.ValueScope; } });
	Object.defineProperty(exports, "ValueScopeName", { enumerable: true, get: function () { return scope_2.ValueScopeName; } });
	Object.defineProperty(exports, "varKinds", { enumerable: true, get: function () { return scope_2.varKinds; } });
	exports.operators = {
	    GT: new code_1._Code(">"),
	    GTE: new code_1._Code(">="),
	    LT: new code_1._Code("<"),
	    LTE: new code_1._Code("<="),
	    EQ: new code_1._Code("==="),
	    NEQ: new code_1._Code("!=="),
	    NOT: new code_1._Code("!"),
	    OR: new code_1._Code("||"),
	    AND: new code_1._Code("&&"),
	    ADD: new code_1._Code("+"),
	};
	class Node {
	    optimizeNodes() {
	        return this;
	    }
	    optimizeNames(_names, _constants) {
	        return this;
	    }
	}
	class Def extends Node {
	    constructor(varKind, name, rhs) {
	        super();
	        this.varKind = varKind;
	        this.name = name;
	        this.rhs = rhs;
	    }
	    render({ es5, _n }) {
	        const varKind = es5 ? scope_1.varKinds.var : this.varKind;
	        const rhs = this.rhs === undefined ? "" : ` = ${this.rhs}`;
	        return `${varKind} ${this.name}${rhs};` + _n;
	    }
	    optimizeNames(names, constants) {
	        if (!names[this.name.str])
	            return;
	        if (this.rhs)
	            this.rhs = optimizeExpr(this.rhs, names, constants);
	        return this;
	    }
	    get names() {
	        return this.rhs instanceof code_1._CodeOrName ? this.rhs.names : {};
	    }
	}
	class Assign extends Node {
	    constructor(lhs, rhs, sideEffects) {
	        super();
	        this.lhs = lhs;
	        this.rhs = rhs;
	        this.sideEffects = sideEffects;
	    }
	    render({ _n }) {
	        return `${this.lhs} = ${this.rhs};` + _n;
	    }
	    optimizeNames(names, constants) {
	        if (this.lhs instanceof code_1.Name && !names[this.lhs.str] && !this.sideEffects)
	            return;
	        this.rhs = optimizeExpr(this.rhs, names, constants);
	        return this;
	    }
	    get names() {
	        const names = this.lhs instanceof code_1.Name ? {} : { ...this.lhs.names };
	        return addExprNames(names, this.rhs);
	    }
	}
	class AssignOp extends Assign {
	    constructor(lhs, op, rhs, sideEffects) {
	        super(lhs, rhs, sideEffects);
	        this.op = op;
	    }
	    render({ _n }) {
	        return `${this.lhs} ${this.op}= ${this.rhs};` + _n;
	    }
	}
	class Label extends Node {
	    constructor(label) {
	        super();
	        this.label = label;
	        this.names = {};
	    }
	    render({ _n }) {
	        return `${this.label}:` + _n;
	    }
	}
	class Break extends Node {
	    constructor(label) {
	        super();
	        this.label = label;
	        this.names = {};
	    }
	    render({ _n }) {
	        const label = this.label ? ` ${this.label}` : "";
	        return `break${label};` + _n;
	    }
	}
	class Throw extends Node {
	    constructor(error) {
	        super();
	        this.error = error;
	    }
	    render({ _n }) {
	        return `throw ${this.error};` + _n;
	    }
	    get names() {
	        return this.error.names;
	    }
	}
	class AnyCode extends Node {
	    constructor(code) {
	        super();
	        this.code = code;
	    }
	    render({ _n }) {
	        return `${this.code};` + _n;
	    }
	    optimizeNodes() {
	        return `${this.code}` ? this : undefined;
	    }
	    optimizeNames(names, constants) {
	        this.code = optimizeExpr(this.code, names, constants);
	        return this;
	    }
	    get names() {
	        return this.code instanceof code_1._CodeOrName ? this.code.names : {};
	    }
	}
	class ParentNode extends Node {
	    constructor(nodes = []) {
	        super();
	        this.nodes = nodes;
	    }
	    render(opts) {
	        return this.nodes.reduce((code, n) => code + n.render(opts), "");
	    }
	    optimizeNodes() {
	        const { nodes } = this;
	        let i = nodes.length;
	        while (i--) {
	            const n = nodes[i].optimizeNodes();
	            if (Array.isArray(n))
	                nodes.splice(i, 1, ...n);
	            else if (n)
	                nodes[i] = n;
	            else
	                nodes.splice(i, 1);
	        }
	        return nodes.length > 0 ? this : undefined;
	    }
	    optimizeNames(names, constants) {
	        const { nodes } = this;
	        let i = nodes.length;
	        while (i--) {
	            // iterating backwards improves 1-pass optimization
	            const n = nodes[i];
	            if (n.optimizeNames(names, constants))
	                continue;
	            subtractNames(names, n.names);
	            nodes.splice(i, 1);
	        }
	        return nodes.length > 0 ? this : undefined;
	    }
	    get names() {
	        return this.nodes.reduce((names, n) => addNames(names, n.names), {});
	    }
	}
	class BlockNode extends ParentNode {
	    render(opts) {
	        return "{" + opts._n + super.render(opts) + "}" + opts._n;
	    }
	}
	class Root extends ParentNode {
	}
	class Else extends BlockNode {
	}
	Else.kind = "else";
	class If extends BlockNode {
	    constructor(condition, nodes) {
	        super(nodes);
	        this.condition = condition;
	    }
	    render(opts) {
	        let code = `if(${this.condition})` + super.render(opts);
	        if (this.else)
	            code += "else " + this.else.render(opts);
	        return code;
	    }
	    optimizeNodes() {
	        super.optimizeNodes();
	        const cond = this.condition;
	        if (cond === true)
	            return this.nodes; // else is ignored here
	        let e = this.else;
	        if (e) {
	            const ns = e.optimizeNodes();
	            e = this.else = Array.isArray(ns) ? new Else(ns) : ns;
	        }
	        if (e) {
	            if (cond === false)
	                return e instanceof If ? e : e.nodes;
	            if (this.nodes.length)
	                return this;
	            return new If(not(cond), e instanceof If ? [e] : e.nodes);
	        }
	        if (cond === false || !this.nodes.length)
	            return undefined;
	        return this;
	    }
	    optimizeNames(names, constants) {
	        var _a;
	        this.else = (_a = this.else) === null || _a === void 0 ? void 0 : _a.optimizeNames(names, constants);
	        if (!(super.optimizeNames(names, constants) || this.else))
	            return;
	        this.condition = optimizeExpr(this.condition, names, constants);
	        return this;
	    }
	    get names() {
	        const names = super.names;
	        addExprNames(names, this.condition);
	        if (this.else)
	            addNames(names, this.else.names);
	        return names;
	    }
	}
	If.kind = "if";
	class For extends BlockNode {
	}
	For.kind = "for";
	class ForLoop extends For {
	    constructor(iteration) {
	        super();
	        this.iteration = iteration;
	    }
	    render(opts) {
	        return `for(${this.iteration})` + super.render(opts);
	    }
	    optimizeNames(names, constants) {
	        if (!super.optimizeNames(names, constants))
	            return;
	        this.iteration = optimizeExpr(this.iteration, names, constants);
	        return this;
	    }
	    get names() {
	        return addNames(super.names, this.iteration.names);
	    }
	}
	class ForRange extends For {
	    constructor(varKind, name, from, to) {
	        super();
	        this.varKind = varKind;
	        this.name = name;
	        this.from = from;
	        this.to = to;
	    }
	    render(opts) {
	        const varKind = opts.es5 ? scope_1.varKinds.var : this.varKind;
	        const { name, from, to } = this;
	        return `for(${varKind} ${name}=${from}; ${name}<${to}; ${name}++)` + super.render(opts);
	    }
	    get names() {
	        const names = addExprNames(super.names, this.from);
	        return addExprNames(names, this.to);
	    }
	}
	class ForIter extends For {
	    constructor(loop, varKind, name, iterable) {
	        super();
	        this.loop = loop;
	        this.varKind = varKind;
	        this.name = name;
	        this.iterable = iterable;
	    }
	    render(opts) {
	        return `for(${this.varKind} ${this.name} ${this.loop} ${this.iterable})` + super.render(opts);
	    }
	    optimizeNames(names, constants) {
	        if (!super.optimizeNames(names, constants))
	            return;
	        this.iterable = optimizeExpr(this.iterable, names, constants);
	        return this;
	    }
	    get names() {
	        return addNames(super.names, this.iterable.names);
	    }
	}
	class Func extends BlockNode {
	    constructor(name, args, async) {
	        super();
	        this.name = name;
	        this.args = args;
	        this.async = async;
	    }
	    render(opts) {
	        const _async = this.async ? "async " : "";
	        return `${_async}function ${this.name}(${this.args})` + super.render(opts);
	    }
	}
	Func.kind = "func";
	class Return extends ParentNode {
	    render(opts) {
	        return "return " + super.render(opts);
	    }
	}
	Return.kind = "return";
	class Try extends BlockNode {
	    render(opts) {
	        let code = "try" + super.render(opts);
	        if (this.catch)
	            code += this.catch.render(opts);
	        if (this.finally)
	            code += this.finally.render(opts);
	        return code;
	    }
	    optimizeNodes() {
	        var _a, _b;
	        super.optimizeNodes();
	        (_a = this.catch) === null || _a === void 0 ? void 0 : _a.optimizeNodes();
	        (_b = this.finally) === null || _b === void 0 ? void 0 : _b.optimizeNodes();
	        return this;
	    }
	    optimizeNames(names, constants) {
	        var _a, _b;
	        super.optimizeNames(names, constants);
	        (_a = this.catch) === null || _a === void 0 ? void 0 : _a.optimizeNames(names, constants);
	        (_b = this.finally) === null || _b === void 0 ? void 0 : _b.optimizeNames(names, constants);
	        return this;
	    }
	    get names() {
	        const names = super.names;
	        if (this.catch)
	            addNames(names, this.catch.names);
	        if (this.finally)
	            addNames(names, this.finally.names);
	        return names;
	    }
	}
	class Catch extends BlockNode {
	    constructor(error) {
	        super();
	        this.error = error;
	    }
	    render(opts) {
	        return `catch(${this.error})` + super.render(opts);
	    }
	}
	Catch.kind = "catch";
	class Finally extends BlockNode {
	    render(opts) {
	        return "finally" + super.render(opts);
	    }
	}
	Finally.kind = "finally";
	class CodeGen {
	    constructor(extScope, opts = {}) {
	        this._values = {};
	        this._blockStarts = [];
	        this._constants = {};
	        this.opts = { ...opts, _n: opts.lines ? "\n" : "" };
	        this._extScope = extScope;
	        this._scope = new scope_1.Scope({ parent: extScope });
	        this._nodes = [new Root()];
	    }
	    toString() {
	        return this._root.render(this.opts);
	    }
	    // returns unique name in the internal scope
	    name(prefix) {
	        return this._scope.name(prefix);
	    }
	    // reserves unique name in the external scope
	    scopeName(prefix) {
	        return this._extScope.name(prefix);
	    }
	    // reserves unique name in the external scope and assigns value to it
	    scopeValue(prefixOrName, value) {
	        const name = this._extScope.value(prefixOrName, value);
	        const vs = this._values[name.prefix] || (this._values[name.prefix] = new Set());
	        vs.add(name);
	        return name;
	    }
	    getScopeValue(prefix, keyOrRef) {
	        return this._extScope.getValue(prefix, keyOrRef);
	    }
	    // return code that assigns values in the external scope to the names that are used internally
	    // (same names that were returned by gen.scopeName or gen.scopeValue)
	    scopeRefs(scopeName) {
	        return this._extScope.scopeRefs(scopeName, this._values);
	    }
	    scopeCode() {
	        return this._extScope.scopeCode(this._values);
	    }
	    _def(varKind, nameOrPrefix, rhs, constant) {
	        const name = this._scope.toName(nameOrPrefix);
	        if (rhs !== undefined && constant)
	            this._constants[name.str] = rhs;
	        this._leafNode(new Def(varKind, name, rhs));
	        return name;
	    }
	    // `const` declaration (`var` in es5 mode)
	    const(nameOrPrefix, rhs, _constant) {
	        return this._def(scope_1.varKinds.const, nameOrPrefix, rhs, _constant);
	    }
	    // `let` declaration with optional assignment (`var` in es5 mode)
	    let(nameOrPrefix, rhs, _constant) {
	        return this._def(scope_1.varKinds.let, nameOrPrefix, rhs, _constant);
	    }
	    // `var` declaration with optional assignment
	    var(nameOrPrefix, rhs, _constant) {
	        return this._def(scope_1.varKinds.var, nameOrPrefix, rhs, _constant);
	    }
	    // assignment code
	    assign(lhs, rhs, sideEffects) {
	        return this._leafNode(new Assign(lhs, rhs, sideEffects));
	    }
	    // `+=` code
	    add(lhs, rhs) {
	        return this._leafNode(new AssignOp(lhs, exports.operators.ADD, rhs));
	    }
	    // appends passed SafeExpr to code or executes Block
	    code(c) {
	        if (typeof c == "function")
	            c();
	        else if (c !== code_1.nil)
	            this._leafNode(new AnyCode(c));
	        return this;
	    }
	    // returns code for object literal for the passed argument list of key-value pairs
	    object(...keyValues) {
	        const code = ["{"];
	        for (const [key, value] of keyValues) {
	            if (code.length > 1)
	                code.push(",");
	            code.push(key);
	            if (key !== value || this.opts.es5) {
	                code.push(":");
	                (0, code_1.addCodeArg)(code, value);
	            }
	        }
	        code.push("}");
	        return new code_1._Code(code);
	    }
	    // `if` clause (or statement if `thenBody` and, optionally, `elseBody` are passed)
	    if(condition, thenBody, elseBody) {
	        this._blockNode(new If(condition));
	        if (thenBody && elseBody) {
	            this.code(thenBody).else().code(elseBody).endIf();
	        }
	        else if (thenBody) {
	            this.code(thenBody).endIf();
	        }
	        else if (elseBody) {
	            throw new Error('CodeGen: "else" body without "then" body');
	        }
	        return this;
	    }
	    // `else if` clause - invalid without `if` or after `else` clauses
	    elseIf(condition) {
	        return this._elseNode(new If(condition));
	    }
	    // `else` clause - only valid after `if` or `else if` clauses
	    else() {
	        return this._elseNode(new Else());
	    }
	    // end `if` statement (needed if gen.if was used only with condition)
	    endIf() {
	        return this._endBlockNode(If, Else);
	    }
	    _for(node, forBody) {
	        this._blockNode(node);
	        if (forBody)
	            this.code(forBody).endFor();
	        return this;
	    }
	    // a generic `for` clause (or statement if `forBody` is passed)
	    for(iteration, forBody) {
	        return this._for(new ForLoop(iteration), forBody);
	    }
	    // `for` statement for a range of values
	    forRange(nameOrPrefix, from, to, forBody, varKind = this.opts.es5 ? scope_1.varKinds.var : scope_1.varKinds.let) {
	        const name = this._scope.toName(nameOrPrefix);
	        return this._for(new ForRange(varKind, name, from, to), () => forBody(name));
	    }
	    // `for-of` statement (in es5 mode replace with a normal for loop)
	    forOf(nameOrPrefix, iterable, forBody, varKind = scope_1.varKinds.const) {
	        const name = this._scope.toName(nameOrPrefix);
	        if (this.opts.es5) {
	            const arr = iterable instanceof code_1.Name ? iterable : this.var("_arr", iterable);
	            return this.forRange("_i", 0, (0, code_1._) `${arr}.length`, (i) => {
	                this.var(name, (0, code_1._) `${arr}[${i}]`);
	                forBody(name);
	            });
	        }
	        return this._for(new ForIter("of", varKind, name, iterable), () => forBody(name));
	    }
	    // `for-in` statement.
	    // With option `ownProperties` replaced with a `for-of` loop for object keys
	    forIn(nameOrPrefix, obj, forBody, varKind = this.opts.es5 ? scope_1.varKinds.var : scope_1.varKinds.const) {
	        if (this.opts.ownProperties) {
	            return this.forOf(nameOrPrefix, (0, code_1._) `Object.keys(${obj})`, forBody);
	        }
	        const name = this._scope.toName(nameOrPrefix);
	        return this._for(new ForIter("in", varKind, name, obj), () => forBody(name));
	    }
	    // end `for` loop
	    endFor() {
	        return this._endBlockNode(For);
	    }
	    // `label` statement
	    label(label) {
	        return this._leafNode(new Label(label));
	    }
	    // `break` statement
	    break(label) {
	        return this._leafNode(new Break(label));
	    }
	    // `return` statement
	    return(value) {
	        const node = new Return();
	        this._blockNode(node);
	        this.code(value);
	        if (node.nodes.length !== 1)
	            throw new Error('CodeGen: "return" should have one node');
	        return this._endBlockNode(Return);
	    }
	    // `try` statement
	    try(tryBody, catchCode, finallyCode) {
	        if (!catchCode && !finallyCode)
	            throw new Error('CodeGen: "try" without "catch" and "finally"');
	        const node = new Try();
	        this._blockNode(node);
	        this.code(tryBody);
	        if (catchCode) {
	            const error = this.name("e");
	            this._currNode = node.catch = new Catch(error);
	            catchCode(error);
	        }
	        if (finallyCode) {
	            this._currNode = node.finally = new Finally();
	            this.code(finallyCode);
	        }
	        return this._endBlockNode(Catch, Finally);
	    }
	    // `throw` statement
	    throw(error) {
	        return this._leafNode(new Throw(error));
	    }
	    // start self-balancing block
	    block(body, nodeCount) {
	        this._blockStarts.push(this._nodes.length);
	        if (body)
	            this.code(body).endBlock(nodeCount);
	        return this;
	    }
	    // end the current self-balancing block
	    endBlock(nodeCount) {
	        const len = this._blockStarts.pop();
	        if (len === undefined)
	            throw new Error("CodeGen: not in self-balancing block");
	        const toClose = this._nodes.length - len;
	        if (toClose < 0 || (nodeCount !== undefined && toClose !== nodeCount)) {
	            throw new Error(`CodeGen: wrong number of nodes: ${toClose} vs ${nodeCount} expected`);
	        }
	        this._nodes.length = len;
	        return this;
	    }
	    // `function` heading (or definition if funcBody is passed)
	    func(name, args = code_1.nil, async, funcBody) {
	        this._blockNode(new Func(name, args, async));
	        if (funcBody)
	            this.code(funcBody).endFunc();
	        return this;
	    }
	    // end function definition
	    endFunc() {
	        return this._endBlockNode(Func);
	    }
	    optimize(n = 1) {
	        while (n-- > 0) {
	            this._root.optimizeNodes();
	            this._root.optimizeNames(this._root.names, this._constants);
	        }
	    }
	    _leafNode(node) {
	        this._currNode.nodes.push(node);
	        return this;
	    }
	    _blockNode(node) {
	        this._currNode.nodes.push(node);
	        this._nodes.push(node);
	    }
	    _endBlockNode(N1, N2) {
	        const n = this._currNode;
	        if (n instanceof N1 || (N2 && n instanceof N2)) {
	            this._nodes.pop();
	            return this;
	        }
	        throw new Error(`CodeGen: not in block "${N2 ? `${N1.kind}/${N2.kind}` : N1.kind}"`);
	    }
	    _elseNode(node) {
	        const n = this._currNode;
	        if (!(n instanceof If)) {
	            throw new Error('CodeGen: "else" without "if"');
	        }
	        this._currNode = n.else = node;
	        return this;
	    }
	    get _root() {
	        return this._nodes[0];
	    }
	    get _currNode() {
	        const ns = this._nodes;
	        return ns[ns.length - 1];
	    }
	    set _currNode(node) {
	        const ns = this._nodes;
	        ns[ns.length - 1] = node;
	    }
	}
	exports.CodeGen = CodeGen;
	function addNames(names, from) {
	    for (const n in from)
	        names[n] = (names[n] || 0) + (from[n] || 0);
	    return names;
	}
	function addExprNames(names, from) {
	    return from instanceof code_1._CodeOrName ? addNames(names, from.names) : names;
	}
	function optimizeExpr(expr, names, constants) {
	    if (expr instanceof code_1.Name)
	        return replaceName(expr);
	    if (!canOptimize(expr))
	        return expr;
	    return new code_1._Code(expr._items.reduce((items, c) => {
	        if (c instanceof code_1.Name)
	            c = replaceName(c);
	        if (c instanceof code_1._Code)
	            items.push(...c._items);
	        else
	            items.push(c);
	        return items;
	    }, []));
	    function replaceName(n) {
	        const c = constants[n.str];
	        if (c === undefined || names[n.str] !== 1)
	            return n;
	        delete names[n.str];
	        return c;
	    }
	    function canOptimize(e) {
	        return (e instanceof code_1._Code &&
	            e._items.some((c) => c instanceof code_1.Name && names[c.str] === 1 && constants[c.str] !== undefined));
	    }
	}
	function subtractNames(names, from) {
	    for (const n in from)
	        names[n] = (names[n] || 0) - (from[n] || 0);
	}
	function not(x) {
	    return typeof x == "boolean" || typeof x == "number" || x === null ? !x : (0, code_1._) `!${par(x)}`;
	}
	exports.not = not;
	const andCode = mappend(exports.operators.AND);
	// boolean AND (&&) expression with the passed arguments
	function and(...args) {
	    return args.reduce(andCode);
	}
	exports.and = and;
	const orCode = mappend(exports.operators.OR);
	// boolean OR (||) expression with the passed arguments
	function or(...args) {
	    return args.reduce(orCode);
	}
	exports.or = or;
	function mappend(op) {
	    return (x, y) => (x === code_1.nil ? y : y === code_1.nil ? x : (0, code_1._) `${par(x)} ${op} ${par(y)}`);
	}
	function par(x) {
	    return x instanceof code_1.Name ? x : (0, code_1._) `(${x})`;
	}
	
} (codegen));

var util = {};

Object.defineProperty(util, "__esModule", { value: true });
util.checkStrictMode = util.getErrorPath = util.Type = util.useFunc = util.setEvaluated = util.evaluatedPropsToName = util.mergeEvaluated = util.eachItem = util.unescapeJsonPointer = util.escapeJsonPointer = util.escapeFragment = util.unescapeFragment = util.schemaRefOrVal = util.schemaHasRulesButRef = util.schemaHasRules = util.checkUnknownRules = util.alwaysValidSchema = util.toHash = void 0;
const codegen_1$z = codegen;
const code_1$a = code$1;
// TODO refactor to use Set
function toHash(arr) {
    const hash = {};
    for (const item of arr)
        hash[item] = true;
    return hash;
}
util.toHash = toHash;
function alwaysValidSchema(it, schema) {
    if (typeof schema == "boolean")
        return schema;
    if (Object.keys(schema).length === 0)
        return true;
    checkUnknownRules(it, schema);
    return !schemaHasRules(schema, it.self.RULES.all);
}
util.alwaysValidSchema = alwaysValidSchema;
function checkUnknownRules(it, schema = it.schema) {
    const { opts, self } = it;
    if (!opts.strictSchema)
        return;
    if (typeof schema === "boolean")
        return;
    const rules = self.RULES.keywords;
    for (const key in schema) {
        if (!rules[key])
            checkStrictMode(it, `unknown keyword: "${key}"`);
    }
}
util.checkUnknownRules = checkUnknownRules;
function schemaHasRules(schema, rules) {
    if (typeof schema == "boolean")
        return !schema;
    for (const key in schema)
        if (rules[key])
            return true;
    return false;
}
util.schemaHasRules = schemaHasRules;
function schemaHasRulesButRef(schema, RULES) {
    if (typeof schema == "boolean")
        return !schema;
    for (const key in schema)
        if (key !== "$ref" && RULES.all[key])
            return true;
    return false;
}
util.schemaHasRulesButRef = schemaHasRulesButRef;
function schemaRefOrVal({ topSchemaRef, schemaPath }, schema, keyword, $data) {
    if (!$data) {
        if (typeof schema == "number" || typeof schema == "boolean")
            return schema;
        if (typeof schema == "string")
            return (0, codegen_1$z._) `${schema}`;
    }
    return (0, codegen_1$z._) `${topSchemaRef}${schemaPath}${(0, codegen_1$z.getProperty)(keyword)}`;
}
util.schemaRefOrVal = schemaRefOrVal;
function unescapeFragment(str) {
    return unescapeJsonPointer(decodeURIComponent(str));
}
util.unescapeFragment = unescapeFragment;
function escapeFragment(str) {
    return encodeURIComponent(escapeJsonPointer(str));
}
util.escapeFragment = escapeFragment;
function escapeJsonPointer(str) {
    if (typeof str == "number")
        return `${str}`;
    return str.replace(/~/g, "~0").replace(/\//g, "~1");
}
util.escapeJsonPointer = escapeJsonPointer;
function unescapeJsonPointer(str) {
    return str.replace(/~1/g, "/").replace(/~0/g, "~");
}
util.unescapeJsonPointer = unescapeJsonPointer;
function eachItem(xs, f) {
    if (Array.isArray(xs)) {
        for (const x of xs)
            f(x);
    }
    else {
        f(xs);
    }
}
util.eachItem = eachItem;
function makeMergeEvaluated({ mergeNames, mergeToName, mergeValues, resultToName, }) {
    return (gen, from, to, toName) => {
        const res = to === undefined
            ? from
            : to instanceof codegen_1$z.Name
                ? (from instanceof codegen_1$z.Name ? mergeNames(gen, from, to) : mergeToName(gen, from, to), to)
                : from instanceof codegen_1$z.Name
                    ? (mergeToName(gen, to, from), from)
                    : mergeValues(from, to);
        return toName === codegen_1$z.Name && !(res instanceof codegen_1$z.Name) ? resultToName(gen, res) : res;
    };
}
util.mergeEvaluated = {
    props: makeMergeEvaluated({
        mergeNames: (gen, from, to) => gen.if((0, codegen_1$z._) `${to} !== true && ${from} !== undefined`, () => {
            gen.if((0, codegen_1$z._) `${from} === true`, () => gen.assign(to, true), () => gen.assign(to, (0, codegen_1$z._) `${to} || {}`).code((0, codegen_1$z._) `Object.assign(${to}, ${from})`));
        }),
        mergeToName: (gen, from, to) => gen.if((0, codegen_1$z._) `${to} !== true`, () => {
            if (from === true) {
                gen.assign(to, true);
            }
            else {
                gen.assign(to, (0, codegen_1$z._) `${to} || {}`);
                setEvaluated(gen, to, from);
            }
        }),
        mergeValues: (from, to) => (from === true ? true : { ...from, ...to }),
        resultToName: evaluatedPropsToName,
    }),
    items: makeMergeEvaluated({
        mergeNames: (gen, from, to) => gen.if((0, codegen_1$z._) `${to} !== true && ${from} !== undefined`, () => gen.assign(to, (0, codegen_1$z._) `${from} === true ? true : ${to} > ${from} ? ${to} : ${from}`)),
        mergeToName: (gen, from, to) => gen.if((0, codegen_1$z._) `${to} !== true`, () => gen.assign(to, from === true ? true : (0, codegen_1$z._) `${to} > ${from} ? ${to} : ${from}`)),
        mergeValues: (from, to) => (from === true ? true : Math.max(from, to)),
        resultToName: (gen, items) => gen.var("items", items),
    }),
};
function evaluatedPropsToName(gen, ps) {
    if (ps === true)
        return gen.var("props", true);
    const props = gen.var("props", (0, codegen_1$z._) `{}`);
    if (ps !== undefined)
        setEvaluated(gen, props, ps);
    return props;
}
util.evaluatedPropsToName = evaluatedPropsToName;
function setEvaluated(gen, props, ps) {
    Object.keys(ps).forEach((p) => gen.assign((0, codegen_1$z._) `${props}${(0, codegen_1$z.getProperty)(p)}`, true));
}
util.setEvaluated = setEvaluated;
const snippets = {};
function useFunc(gen, f) {
    return gen.scopeValue("func", {
        ref: f,
        code: snippets[f.code] || (snippets[f.code] = new code_1$a._Code(f.code)),
    });
}
util.useFunc = useFunc;
var Type;
(function (Type) {
    Type[Type["Num"] = 0] = "Num";
    Type[Type["Str"] = 1] = "Str";
})(Type || (util.Type = Type = {}));
function getErrorPath(dataProp, dataPropType, jsPropertySyntax) {
    // let path
    if (dataProp instanceof codegen_1$z.Name) {
        const isNumber = dataPropType === Type.Num;
        return jsPropertySyntax
            ? isNumber
                ? (0, codegen_1$z._) `"[" + ${dataProp} + "]"`
                : (0, codegen_1$z._) `"['" + ${dataProp} + "']"`
            : isNumber
                ? (0, codegen_1$z._) `"/" + ${dataProp}`
                : (0, codegen_1$z._) `"/" + ${dataProp}.replace(/~/g, "~0").replace(/\\//g, "~1")`; // TODO maybe use global escapePointer
    }
    return jsPropertySyntax ? (0, codegen_1$z.getProperty)(dataProp).toString() : "/" + escapeJsonPointer(dataProp);
}
util.getErrorPath = getErrorPath;
function checkStrictMode(it, msg, mode = it.opts.strictSchema) {
    if (!mode)
        return;
    msg = `strict mode: ${msg}`;
    if (mode === true)
        throw new Error(msg);
    it.self.logger.warn(msg);
}
util.checkStrictMode = checkStrictMode;

var names$1 = {};

Object.defineProperty(names$1, "__esModule", { value: true });
const codegen_1$y = codegen;
const names = {
    // validation function arguments
    data: new codegen_1$y.Name("data"), // data passed to validation function
    // args passed from referencing schema
    valCxt: new codegen_1$y.Name("valCxt"), // validation/data context - should not be used directly, it is destructured to the names below
    instancePath: new codegen_1$y.Name("instancePath"),
    parentData: new codegen_1$y.Name("parentData"),
    parentDataProperty: new codegen_1$y.Name("parentDataProperty"),
    rootData: new codegen_1$y.Name("rootData"), // root data - same as the data passed to the first/top validation function
    dynamicAnchors: new codegen_1$y.Name("dynamicAnchors"), // used to support recursiveRef and dynamicRef
    // function scoped variables
    vErrors: new codegen_1$y.Name("vErrors"), // null or array of validation errors
    errors: new codegen_1$y.Name("errors"), // counter of validation errors
    this: new codegen_1$y.Name("this"),
    // "globals"
    self: new codegen_1$y.Name("self"),
    scope: new codegen_1$y.Name("scope"),
    // JTD serialize/parse name for JSON string and position
    json: new codegen_1$y.Name("json"),
    jsonPos: new codegen_1$y.Name("jsonPos"),
    jsonLen: new codegen_1$y.Name("jsonLen"),
    jsonPart: new codegen_1$y.Name("jsonPart"),
};
names$1.default = names;

(function (exports) {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.extendErrors = exports.resetErrorsCount = exports.reportExtraError = exports.reportError = exports.keyword$DataError = exports.keywordError = void 0;
	const codegen_1 = codegen;
	const util_1 = util;
	const names_1 = names$1;
	exports.keywordError = {
	    message: ({ keyword }) => (0, codegen_1.str) `must pass "${keyword}" keyword validation`,
	};
	exports.keyword$DataError = {
	    message: ({ keyword, schemaType }) => schemaType
	        ? (0, codegen_1.str) `"${keyword}" keyword must be ${schemaType} ($data)`
	        : (0, codegen_1.str) `"${keyword}" keyword is invalid ($data)`,
	};
	function reportError(cxt, error = exports.keywordError, errorPaths, overrideAllErrors) {
	    const { it } = cxt;
	    const { gen, compositeRule, allErrors } = it;
	    const errObj = errorObjectCode(cxt, error, errorPaths);
	    if (overrideAllErrors !== null && overrideAllErrors !== void 0 ? overrideAllErrors : (compositeRule || allErrors)) {
	        addError(gen, errObj);
	    }
	    else {
	        returnErrors(it, (0, codegen_1._) `[${errObj}]`);
	    }
	}
	exports.reportError = reportError;
	function reportExtraError(cxt, error = exports.keywordError, errorPaths) {
	    const { it } = cxt;
	    const { gen, compositeRule, allErrors } = it;
	    const errObj = errorObjectCode(cxt, error, errorPaths);
	    addError(gen, errObj);
	    if (!(compositeRule || allErrors)) {
	        returnErrors(it, names_1.default.vErrors);
	    }
	}
	exports.reportExtraError = reportExtraError;
	function resetErrorsCount(gen, errsCount) {
	    gen.assign(names_1.default.errors, errsCount);
	    gen.if((0, codegen_1._) `${names_1.default.vErrors} !== null`, () => gen.if(errsCount, () => gen.assign((0, codegen_1._) `${names_1.default.vErrors}.length`, errsCount), () => gen.assign(names_1.default.vErrors, null)));
	}
	exports.resetErrorsCount = resetErrorsCount;
	function extendErrors({ gen, keyword, schemaValue, data, errsCount, it, }) {
	    /* istanbul ignore if */
	    if (errsCount === undefined)
	        throw new Error("ajv implementation error");
	    const err = gen.name("err");
	    gen.forRange("i", errsCount, names_1.default.errors, (i) => {
	        gen.const(err, (0, codegen_1._) `${names_1.default.vErrors}[${i}]`);
	        gen.if((0, codegen_1._) `${err}.instancePath === undefined`, () => gen.assign((0, codegen_1._) `${err}.instancePath`, (0, codegen_1.strConcat)(names_1.default.instancePath, it.errorPath)));
	        gen.assign((0, codegen_1._) `${err}.schemaPath`, (0, codegen_1.str) `${it.errSchemaPath}/${keyword}`);
	        if (it.opts.verbose) {
	            gen.assign((0, codegen_1._) `${err}.schema`, schemaValue);
	            gen.assign((0, codegen_1._) `${err}.data`, data);
	        }
	    });
	}
	exports.extendErrors = extendErrors;
	function addError(gen, errObj) {
	    const err = gen.const("err", errObj);
	    gen.if((0, codegen_1._) `${names_1.default.vErrors} === null`, () => gen.assign(names_1.default.vErrors, (0, codegen_1._) `[${err}]`), (0, codegen_1._) `${names_1.default.vErrors}.push(${err})`);
	    gen.code((0, codegen_1._) `${names_1.default.errors}++`);
	}
	function returnErrors(it, errs) {
	    const { gen, validateName, schemaEnv } = it;
	    if (schemaEnv.$async) {
	        gen.throw((0, codegen_1._) `new ${it.ValidationError}(${errs})`);
	    }
	    else {
	        gen.assign((0, codegen_1._) `${validateName}.errors`, errs);
	        gen.return(false);
	    }
	}
	const E = {
	    keyword: new codegen_1.Name("keyword"),
	    schemaPath: new codegen_1.Name("schemaPath"), // also used in JTD errors
	    params: new codegen_1.Name("params"),
	    propertyName: new codegen_1.Name("propertyName"),
	    message: new codegen_1.Name("message"),
	    schema: new codegen_1.Name("schema"),
	    parentSchema: new codegen_1.Name("parentSchema"),
	};
	function errorObjectCode(cxt, error, errorPaths) {
	    const { createErrors } = cxt.it;
	    if (createErrors === false)
	        return (0, codegen_1._) `{}`;
	    return errorObject(cxt, error, errorPaths);
	}
	function errorObject(cxt, error, errorPaths = {}) {
	    const { gen, it } = cxt;
	    const keyValues = [
	        errorInstancePath(it, errorPaths),
	        errorSchemaPath(cxt, errorPaths),
	    ];
	    extraErrorProps(cxt, error, keyValues);
	    return gen.object(...keyValues);
	}
	function errorInstancePath({ errorPath }, { instancePath }) {
	    const instPath = instancePath
	        ? (0, codegen_1.str) `${errorPath}${(0, util_1.getErrorPath)(instancePath, util_1.Type.Str)}`
	        : errorPath;
	    return [names_1.default.instancePath, (0, codegen_1.strConcat)(names_1.default.instancePath, instPath)];
	}
	function errorSchemaPath({ keyword, it: { errSchemaPath } }, { schemaPath, parentSchema }) {
	    let schPath = parentSchema ? errSchemaPath : (0, codegen_1.str) `${errSchemaPath}/${keyword}`;
	    if (schemaPath) {
	        schPath = (0, codegen_1.str) `${schPath}${(0, util_1.getErrorPath)(schemaPath, util_1.Type.Str)}`;
	    }
	    return [E.schemaPath, schPath];
	}
	function extraErrorProps(cxt, { params, message }, keyValues) {
	    const { keyword, data, schemaValue, it } = cxt;
	    const { opts, propertyName, topSchemaRef, schemaPath } = it;
	    keyValues.push([E.keyword, keyword], [E.params, typeof params == "function" ? params(cxt) : params || (0, codegen_1._) `{}`]);
	    if (opts.messages) {
	        keyValues.push([E.message, typeof message == "function" ? message(cxt) : message]);
	    }
	    if (opts.verbose) {
	        keyValues.push([E.schema, schemaValue], [E.parentSchema, (0, codegen_1._) `${topSchemaRef}${schemaPath}`], [names_1.default.data, data]);
	    }
	    if (propertyName)
	        keyValues.push([E.propertyName, propertyName]);
	}
	
} (errors));

Object.defineProperty(boolSchema, "__esModule", { value: true });
boolSchema.boolOrEmptySchema = boolSchema.topBoolOrEmptySchema = void 0;
const errors_1$3 = errors;
const codegen_1$x = codegen;
const names_1$9 = names$1;
const boolError = {
    message: "boolean schema is false",
};
function topBoolOrEmptySchema(it) {
    const { gen, schema, validateName } = it;
    if (schema === false) {
        falseSchemaError(it, false);
    }
    else if (typeof schema == "object" && schema.$async === true) {
        gen.return(names_1$9.default.data);
    }
    else {
        gen.assign((0, codegen_1$x._) `${validateName}.errors`, null);
        gen.return(true);
    }
}
boolSchema.topBoolOrEmptySchema = topBoolOrEmptySchema;
function boolOrEmptySchema(it, valid) {
    const { gen, schema } = it;
    if (schema === false) {
        gen.var(valid, false); // TODO var
        falseSchemaError(it);
    }
    else {
        gen.var(valid, true); // TODO var
    }
}
boolSchema.boolOrEmptySchema = boolOrEmptySchema;
function falseSchemaError(it, overrideAllErrors) {
    const { gen, data } = it;
    // TODO maybe some other interface should be used for non-keyword validation errors...
    const cxt = {
        gen,
        keyword: "false schema",
        data,
        schema: false,
        schemaCode: false,
        schemaValue: false,
        params: {},
        it,
    };
    (0, errors_1$3.reportError)(cxt, boolError, undefined, overrideAllErrors);
}

var dataType = {};

var rules = {};

Object.defineProperty(rules, "__esModule", { value: true });
rules.getRules = rules.isJSONType = void 0;
const _jsonTypes = ["string", "number", "integer", "boolean", "null", "object", "array"];
const jsonTypes = new Set(_jsonTypes);
function isJSONType(x) {
    return typeof x == "string" && jsonTypes.has(x);
}
rules.isJSONType = isJSONType;
function getRules() {
    const groups = {
        number: { type: "number", rules: [] },
        string: { type: "string", rules: [] },
        array: { type: "array", rules: [] },
        object: { type: "object", rules: [] },
    };
    return {
        types: { ...groups, integer: true, boolean: true, null: true },
        rules: [{ rules: [] }, groups.number, groups.string, groups.array, groups.object],
        post: { rules: [] },
        all: {},
        keywords: {},
    };
}
rules.getRules = getRules;

var applicability = {};

Object.defineProperty(applicability, "__esModule", { value: true });
applicability.shouldUseRule = applicability.shouldUseGroup = applicability.schemaHasRulesForType = void 0;
function schemaHasRulesForType({ schema, self }, type) {
    const group = self.RULES.types[type];
    return group && group !== true && shouldUseGroup(schema, group);
}
applicability.schemaHasRulesForType = schemaHasRulesForType;
function shouldUseGroup(schema, group) {
    return group.rules.some((rule) => shouldUseRule(schema, rule));
}
applicability.shouldUseGroup = shouldUseGroup;
function shouldUseRule(schema, rule) {
    var _a;
    return (schema[rule.keyword] !== undefined ||
        ((_a = rule.definition.implements) === null || _a === void 0 ? void 0 : _a.some((kwd) => schema[kwd] !== undefined)));
}
applicability.shouldUseRule = shouldUseRule;

Object.defineProperty(dataType, "__esModule", { value: true });
dataType.reportTypeError = dataType.checkDataTypes = dataType.checkDataType = dataType.coerceAndCheckDataType = dataType.getJSONTypes = dataType.getSchemaTypes = dataType.DataType = void 0;
const rules_1 = rules;
const applicability_1$1 = applicability;
const errors_1$2 = errors;
const codegen_1$w = codegen;
const util_1$u = util;
var DataType;
(function (DataType) {
    DataType[DataType["Correct"] = 0] = "Correct";
    DataType[DataType["Wrong"] = 1] = "Wrong";
})(DataType || (dataType.DataType = DataType = {}));
function getSchemaTypes(schema) {
    const types = getJSONTypes(schema.type);
    const hasNull = types.includes("null");
    if (hasNull) {
        if (schema.nullable === false)
            throw new Error("type: null contradicts nullable: false");
    }
    else {
        if (!types.length && schema.nullable !== undefined) {
            throw new Error('"nullable" cannot be used without "type"');
        }
        if (schema.nullable === true)
            types.push("null");
    }
    return types;
}
dataType.getSchemaTypes = getSchemaTypes;
// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
function getJSONTypes(ts) {
    const types = Array.isArray(ts) ? ts : ts ? [ts] : [];
    if (types.every(rules_1.isJSONType))
        return types;
    throw new Error("type must be JSONType or JSONType[]: " + types.join(","));
}
dataType.getJSONTypes = getJSONTypes;
function coerceAndCheckDataType(it, types) {
    const { gen, data, opts } = it;
    const coerceTo = coerceToTypes(types, opts.coerceTypes);
    const checkTypes = types.length > 0 &&
        !(coerceTo.length === 0 && types.length === 1 && (0, applicability_1$1.schemaHasRulesForType)(it, types[0]));
    if (checkTypes) {
        const wrongType = checkDataTypes(types, data, opts.strictNumbers, DataType.Wrong);
        gen.if(wrongType, () => {
            if (coerceTo.length)
                coerceData(it, types, coerceTo);
            else
                reportTypeError(it);
        });
    }
    return checkTypes;
}
dataType.coerceAndCheckDataType = coerceAndCheckDataType;
const COERCIBLE = new Set(["string", "number", "integer", "boolean", "null"]);
function coerceToTypes(types, coerceTypes) {
    return coerceTypes
        ? types.filter((t) => COERCIBLE.has(t) || (coerceTypes === "array" && t === "array"))
        : [];
}
function coerceData(it, types, coerceTo) {
    const { gen, data, opts } = it;
    const dataType = gen.let("dataType", (0, codegen_1$w._) `typeof ${data}`);
    const coerced = gen.let("coerced", (0, codegen_1$w._) `undefined`);
    if (opts.coerceTypes === "array") {
        gen.if((0, codegen_1$w._) `${dataType} == 'object' && Array.isArray(${data}) && ${data}.length == 1`, () => gen
            .assign(data, (0, codegen_1$w._) `${data}[0]`)
            .assign(dataType, (0, codegen_1$w._) `typeof ${data}`)
            .if(checkDataTypes(types, data, opts.strictNumbers), () => gen.assign(coerced, data)));
    }
    gen.if((0, codegen_1$w._) `${coerced} !== undefined`);
    for (const t of coerceTo) {
        if (COERCIBLE.has(t) || (t === "array" && opts.coerceTypes === "array")) {
            coerceSpecificType(t);
        }
    }
    gen.else();
    reportTypeError(it);
    gen.endIf();
    gen.if((0, codegen_1$w._) `${coerced} !== undefined`, () => {
        gen.assign(data, coerced);
        assignParentData(it, coerced);
    });
    function coerceSpecificType(t) {
        switch (t) {
            case "string":
                gen
                    .elseIf((0, codegen_1$w._) `${dataType} == "number" || ${dataType} == "boolean"`)
                    .assign(coerced, (0, codegen_1$w._) `"" + ${data}`)
                    .elseIf((0, codegen_1$w._) `${data} === null`)
                    .assign(coerced, (0, codegen_1$w._) `""`);
                return;
            case "number":
                gen
                    .elseIf((0, codegen_1$w._) `${dataType} == "boolean" || ${data} === null
              || (${dataType} == "string" && ${data} && ${data} == +${data})`)
                    .assign(coerced, (0, codegen_1$w._) `+${data}`);
                return;
            case "integer":
                gen
                    .elseIf((0, codegen_1$w._) `${dataType} === "boolean" || ${data} === null
              || (${dataType} === "string" && ${data} && ${data} == +${data} && !(${data} % 1))`)
                    .assign(coerced, (0, codegen_1$w._) `+${data}`);
                return;
            case "boolean":
                gen
                    .elseIf((0, codegen_1$w._) `${data} === "false" || ${data} === 0 || ${data} === null`)
                    .assign(coerced, false)
                    .elseIf((0, codegen_1$w._) `${data} === "true" || ${data} === 1`)
                    .assign(coerced, true);
                return;
            case "null":
                gen.elseIf((0, codegen_1$w._) `${data} === "" || ${data} === 0 || ${data} === false`);
                gen.assign(coerced, null);
                return;
            case "array":
                gen
                    .elseIf((0, codegen_1$w._) `${dataType} === "string" || ${dataType} === "number"
              || ${dataType} === "boolean" || ${data} === null`)
                    .assign(coerced, (0, codegen_1$w._) `[${data}]`);
        }
    }
}
function assignParentData({ gen, parentData, parentDataProperty }, expr) {
    // TODO use gen.property
    gen.if((0, codegen_1$w._) `${parentData} !== undefined`, () => gen.assign((0, codegen_1$w._) `${parentData}[${parentDataProperty}]`, expr));
}
function checkDataType(dataType, data, strictNums, correct = DataType.Correct) {
    const EQ = correct === DataType.Correct ? codegen_1$w.operators.EQ : codegen_1$w.operators.NEQ;
    let cond;
    switch (dataType) {
        case "null":
            return (0, codegen_1$w._) `${data} ${EQ} null`;
        case "array":
            cond = (0, codegen_1$w._) `Array.isArray(${data})`;
            break;
        case "object":
            cond = (0, codegen_1$w._) `${data} && typeof ${data} == "object" && !Array.isArray(${data})`;
            break;
        case "integer":
            cond = numCond((0, codegen_1$w._) `!(${data} % 1) && !isNaN(${data})`);
            break;
        case "number":
            cond = numCond();
            break;
        default:
            return (0, codegen_1$w._) `typeof ${data} ${EQ} ${dataType}`;
    }
    return correct === DataType.Correct ? cond : (0, codegen_1$w.not)(cond);
    function numCond(_cond = codegen_1$w.nil) {
        return (0, codegen_1$w.and)((0, codegen_1$w._) `typeof ${data} == "number"`, _cond, strictNums ? (0, codegen_1$w._) `isFinite(${data})` : codegen_1$w.nil);
    }
}
dataType.checkDataType = checkDataType;
function checkDataTypes(dataTypes, data, strictNums, correct) {
    if (dataTypes.length === 1) {
        return checkDataType(dataTypes[0], data, strictNums, correct);
    }
    let cond;
    const types = (0, util_1$u.toHash)(dataTypes);
    if (types.array && types.object) {
        const notObj = (0, codegen_1$w._) `typeof ${data} != "object"`;
        cond = types.null ? notObj : (0, codegen_1$w._) `!${data} || ${notObj}`;
        delete types.null;
        delete types.array;
        delete types.object;
    }
    else {
        cond = codegen_1$w.nil;
    }
    if (types.number)
        delete types.integer;
    for (const t in types)
        cond = (0, codegen_1$w.and)(cond, checkDataType(t, data, strictNums, correct));
    return cond;
}
dataType.checkDataTypes = checkDataTypes;
const typeError = {
    message: ({ schema }) => `must be ${schema}`,
    params: ({ schema, schemaValue }) => typeof schema == "string" ? (0, codegen_1$w._) `{type: ${schema}}` : (0, codegen_1$w._) `{type: ${schemaValue}}`,
};
function reportTypeError(it) {
    const cxt = getTypeErrorContext(it);
    (0, errors_1$2.reportError)(cxt, typeError);
}
dataType.reportTypeError = reportTypeError;
function getTypeErrorContext(it) {
    const { gen, data, schema } = it;
    const schemaCode = (0, util_1$u.schemaRefOrVal)(it, schema, "type");
    return {
        gen,
        keyword: "type",
        data,
        schema: schema.type,
        schemaCode,
        schemaValue: schemaCode,
        parentSchema: schema,
        params: {},
        it,
    };
}

var defaults = {};

Object.defineProperty(defaults, "__esModule", { value: true });
defaults.assignDefaults = void 0;
const codegen_1$v = codegen;
const util_1$t = util;
function assignDefaults(it, ty) {
    const { properties, items } = it.schema;
    if (ty === "object" && properties) {
        for (const key in properties) {
            assignDefault(it, key, properties[key].default);
        }
    }
    else if (ty === "array" && Array.isArray(items)) {
        items.forEach((sch, i) => assignDefault(it, i, sch.default));
    }
}
defaults.assignDefaults = assignDefaults;
function assignDefault(it, prop, defaultValue) {
    const { gen, compositeRule, data, opts } = it;
    if (defaultValue === undefined)
        return;
    const childData = (0, codegen_1$v._) `${data}${(0, codegen_1$v.getProperty)(prop)}`;
    if (compositeRule) {
        (0, util_1$t.checkStrictMode)(it, `default is ignored for: ${childData}`);
        return;
    }
    let condition = (0, codegen_1$v._) `${childData} === undefined`;
    if (opts.useDefaults === "empty") {
        condition = (0, codegen_1$v._) `${condition} || ${childData} === null || ${childData} === ""`;
    }
    // `${childData} === undefined` +
    // (opts.useDefaults === "empty" ? ` || ${childData} === null || ${childData} === ""` : "")
    gen.if(condition, (0, codegen_1$v._) `${childData} = ${(0, codegen_1$v.stringify)(defaultValue)}`);
}

var keyword = {};

var code = {};

Object.defineProperty(code, "__esModule", { value: true });
code.validateUnion = code.validateArray = code.usePattern = code.callValidateCode = code.schemaProperties = code.allSchemaProperties = code.noPropertyInData = code.propertyInData = code.isOwnProperty = code.hasPropFunc = code.reportMissingProp = code.checkMissingProp = code.checkReportMissingProp = void 0;
const codegen_1$u = codegen;
const util_1$s = util;
const names_1$8 = names$1;
const util_2$1 = util;
function checkReportMissingProp(cxt, prop) {
    const { gen, data, it } = cxt;
    gen.if(noPropertyInData(gen, data, prop, it.opts.ownProperties), () => {
        cxt.setParams({ missingProperty: (0, codegen_1$u._) `${prop}` }, true);
        cxt.error();
    });
}
code.checkReportMissingProp = checkReportMissingProp;
function checkMissingProp({ gen, data, it: { opts } }, properties, missing) {
    return (0, codegen_1$u.or)(...properties.map((prop) => (0, codegen_1$u.and)(noPropertyInData(gen, data, prop, opts.ownProperties), (0, codegen_1$u._) `${missing} = ${prop}`)));
}
code.checkMissingProp = checkMissingProp;
function reportMissingProp(cxt, missing) {
    cxt.setParams({ missingProperty: missing }, true);
    cxt.error();
}
code.reportMissingProp = reportMissingProp;
function hasPropFunc(gen) {
    return gen.scopeValue("func", {
        // eslint-disable-next-line @typescript-eslint/unbound-method
        ref: Object.prototype.hasOwnProperty,
        code: (0, codegen_1$u._) `Object.prototype.hasOwnProperty`,
    });
}
code.hasPropFunc = hasPropFunc;
function isOwnProperty(gen, data, property) {
    return (0, codegen_1$u._) `${hasPropFunc(gen)}.call(${data}, ${property})`;
}
code.isOwnProperty = isOwnProperty;
function propertyInData(gen, data, property, ownProperties) {
    const cond = (0, codegen_1$u._) `${data}${(0, codegen_1$u.getProperty)(property)} !== undefined`;
    return ownProperties ? (0, codegen_1$u._) `${cond} && ${isOwnProperty(gen, data, property)}` : cond;
}
code.propertyInData = propertyInData;
function noPropertyInData(gen, data, property, ownProperties) {
    const cond = (0, codegen_1$u._) `${data}${(0, codegen_1$u.getProperty)(property)} === undefined`;
    return ownProperties ? (0, codegen_1$u.or)(cond, (0, codegen_1$u.not)(isOwnProperty(gen, data, property))) : cond;
}
code.noPropertyInData = noPropertyInData;
function allSchemaProperties(schemaMap) {
    return schemaMap ? Object.keys(schemaMap).filter((p) => p !== "__proto__") : [];
}
code.allSchemaProperties = allSchemaProperties;
function schemaProperties(it, schemaMap) {
    return allSchemaProperties(schemaMap).filter((p) => !(0, util_1$s.alwaysValidSchema)(it, schemaMap[p]));
}
code.schemaProperties = schemaProperties;
function callValidateCode({ schemaCode, data, it: { gen, topSchemaRef, schemaPath, errorPath }, it }, func, context, passSchema) {
    const dataAndSchema = passSchema ? (0, codegen_1$u._) `${schemaCode}, ${data}, ${topSchemaRef}${schemaPath}` : data;
    const valCxt = [
        [names_1$8.default.instancePath, (0, codegen_1$u.strConcat)(names_1$8.default.instancePath, errorPath)],
        [names_1$8.default.parentData, it.parentData],
        [names_1$8.default.parentDataProperty, it.parentDataProperty],
        [names_1$8.default.rootData, names_1$8.default.rootData],
    ];
    if (it.opts.dynamicRef)
        valCxt.push([names_1$8.default.dynamicAnchors, names_1$8.default.dynamicAnchors]);
    const args = (0, codegen_1$u._) `${dataAndSchema}, ${gen.object(...valCxt)}`;
    return context !== codegen_1$u.nil ? (0, codegen_1$u._) `${func}.call(${context}, ${args})` : (0, codegen_1$u._) `${func}(${args})`;
}
code.callValidateCode = callValidateCode;
const newRegExp = (0, codegen_1$u._) `new RegExp`;
function usePattern({ gen, it: { opts } }, pattern) {
    const u = opts.unicodeRegExp ? "u" : "";
    const { regExp } = opts.code;
    const rx = regExp(pattern, u);
    return gen.scopeValue("pattern", {
        key: rx.toString(),
        ref: rx,
        code: (0, codegen_1$u._) `${regExp.code === "new RegExp" ? newRegExp : (0, util_2$1.useFunc)(gen, regExp)}(${pattern}, ${u})`,
    });
}
code.usePattern = usePattern;
function validateArray(cxt) {
    const { gen, data, keyword, it } = cxt;
    const valid = gen.name("valid");
    if (it.allErrors) {
        const validArr = gen.let("valid", true);
        validateItems(() => gen.assign(validArr, false));
        return validArr;
    }
    gen.var(valid, true);
    validateItems(() => gen.break());
    return valid;
    function validateItems(notValid) {
        const len = gen.const("len", (0, codegen_1$u._) `${data}.length`);
        gen.forRange("i", 0, len, (i) => {
            cxt.subschema({
                keyword,
                dataProp: i,
                dataPropType: util_1$s.Type.Num,
            }, valid);
            gen.if((0, codegen_1$u.not)(valid), notValid);
        });
    }
}
code.validateArray = validateArray;
function validateUnion(cxt) {
    const { gen, schema, keyword, it } = cxt;
    /* istanbul ignore if */
    if (!Array.isArray(schema))
        throw new Error("ajv implementation error");
    const alwaysValid = schema.some((sch) => (0, util_1$s.alwaysValidSchema)(it, sch));
    if (alwaysValid && !it.opts.unevaluated)
        return;
    const valid = gen.let("valid", false);
    const schValid = gen.name("_valid");
    gen.block(() => schema.forEach((_sch, i) => {
        const schCxt = cxt.subschema({
            keyword,
            schemaProp: i,
            compositeRule: true,
        }, schValid);
        gen.assign(valid, (0, codegen_1$u._) `${valid} || ${schValid}`);
        const merged = cxt.mergeValidEvaluated(schCxt, schValid);
        // can short-circuit if `unevaluatedProperties/Items` not supported (opts.unevaluated !== true)
        // or if all properties and items were evaluated (it.props === true && it.items === true)
        if (!merged)
            gen.if((0, codegen_1$u.not)(valid));
    }));
    cxt.result(valid, () => cxt.reset(), () => cxt.error(true));
}
code.validateUnion = validateUnion;

Object.defineProperty(keyword, "__esModule", { value: true });
keyword.validateKeywordUsage = keyword.validSchemaType = keyword.funcKeywordCode = keyword.macroKeywordCode = void 0;
const codegen_1$t = codegen;
const names_1$7 = names$1;
const code_1$9 = code;
const errors_1$1 = errors;
function macroKeywordCode(cxt, def) {
    const { gen, keyword, schema, parentSchema, it } = cxt;
    const macroSchema = def.macro.call(it.self, schema, parentSchema, it);
    const schemaRef = useKeyword(gen, keyword, macroSchema);
    if (it.opts.validateSchema !== false)
        it.self.validateSchema(macroSchema, true);
    const valid = gen.name("valid");
    cxt.subschema({
        schema: macroSchema,
        schemaPath: codegen_1$t.nil,
        errSchemaPath: `${it.errSchemaPath}/${keyword}`,
        topSchemaRef: schemaRef,
        compositeRule: true,
    }, valid);
    cxt.pass(valid, () => cxt.error(true));
}
keyword.macroKeywordCode = macroKeywordCode;
function funcKeywordCode(cxt, def) {
    var _a;
    const { gen, keyword, schema, parentSchema, $data, it } = cxt;
    checkAsyncKeyword(it, def);
    const validate = !$data && def.compile ? def.compile.call(it.self, schema, parentSchema, it) : def.validate;
    const validateRef = useKeyword(gen, keyword, validate);
    const valid = gen.let("valid");
    cxt.block$data(valid, validateKeyword);
    cxt.ok((_a = def.valid) !== null && _a !== void 0 ? _a : valid);
    function validateKeyword() {
        if (def.errors === false) {
            assignValid();
            if (def.modifying)
                modifyData(cxt);
            reportErrs(() => cxt.error());
        }
        else {
            const ruleErrs = def.async ? validateAsync() : validateSync();
            if (def.modifying)
                modifyData(cxt);
            reportErrs(() => addErrs(cxt, ruleErrs));
        }
    }
    function validateAsync() {
        const ruleErrs = gen.let("ruleErrs", null);
        gen.try(() => assignValid((0, codegen_1$t._) `await `), (e) => gen.assign(valid, false).if((0, codegen_1$t._) `${e} instanceof ${it.ValidationError}`, () => gen.assign(ruleErrs, (0, codegen_1$t._) `${e}.errors`), () => gen.throw(e)));
        return ruleErrs;
    }
    function validateSync() {
        const validateErrs = (0, codegen_1$t._) `${validateRef}.errors`;
        gen.assign(validateErrs, null);
        assignValid(codegen_1$t.nil);
        return validateErrs;
    }
    function assignValid(_await = def.async ? (0, codegen_1$t._) `await ` : codegen_1$t.nil) {
        const passCxt = it.opts.passContext ? names_1$7.default.this : names_1$7.default.self;
        const passSchema = !(("compile" in def && !$data) || def.schema === false);
        gen.assign(valid, (0, codegen_1$t._) `${_await}${(0, code_1$9.callValidateCode)(cxt, validateRef, passCxt, passSchema)}`, def.modifying);
    }
    function reportErrs(errors) {
        var _a;
        gen.if((0, codegen_1$t.not)((_a = def.valid) !== null && _a !== void 0 ? _a : valid), errors);
    }
}
keyword.funcKeywordCode = funcKeywordCode;
function modifyData(cxt) {
    const { gen, data, it } = cxt;
    gen.if(it.parentData, () => gen.assign(data, (0, codegen_1$t._) `${it.parentData}[${it.parentDataProperty}]`));
}
function addErrs(cxt, errs) {
    const { gen } = cxt;
    gen.if((0, codegen_1$t._) `Array.isArray(${errs})`, () => {
        gen
            .assign(names_1$7.default.vErrors, (0, codegen_1$t._) `${names_1$7.default.vErrors} === null ? ${errs} : ${names_1$7.default.vErrors}.concat(${errs})`)
            .assign(names_1$7.default.errors, (0, codegen_1$t._) `${names_1$7.default.vErrors}.length`);
        (0, errors_1$1.extendErrors)(cxt);
    }, () => cxt.error());
}
function checkAsyncKeyword({ schemaEnv }, def) {
    if (def.async && !schemaEnv.$async)
        throw new Error("async keyword in sync schema");
}
function useKeyword(gen, keyword, result) {
    if (result === undefined)
        throw new Error(`keyword "${keyword}" failed to compile`);
    return gen.scopeValue("keyword", typeof result == "function" ? { ref: result } : { ref: result, code: (0, codegen_1$t.stringify)(result) });
}
function validSchemaType(schema, schemaType, allowUndefined = false) {
    // TODO add tests
    return (!schemaType.length ||
        schemaType.some((st) => st === "array"
            ? Array.isArray(schema)
            : st === "object"
                ? schema && typeof schema == "object" && !Array.isArray(schema)
                : typeof schema == st || (allowUndefined && typeof schema == "undefined")));
}
keyword.validSchemaType = validSchemaType;
function validateKeywordUsage({ schema, opts, self, errSchemaPath }, def, keyword) {
    /* istanbul ignore if */
    if (Array.isArray(def.keyword) ? !def.keyword.includes(keyword) : def.keyword !== keyword) {
        throw new Error("ajv implementation error");
    }
    const deps = def.dependencies;
    if (deps === null || deps === void 0 ? void 0 : deps.some((kwd) => !Object.prototype.hasOwnProperty.call(schema, kwd))) {
        throw new Error(`parent schema must have dependencies of ${keyword}: ${deps.join(",")}`);
    }
    if (def.validateSchema) {
        const valid = def.validateSchema(schema[keyword]);
        if (!valid) {
            const msg = `keyword "${keyword}" value is invalid at path "${errSchemaPath}": ` +
                self.errorsText(def.validateSchema.errors);
            if (opts.validateSchema === "log")
                self.logger.error(msg);
            else
                throw new Error(msg);
        }
    }
}
keyword.validateKeywordUsage = validateKeywordUsage;

var subschema = {};

Object.defineProperty(subschema, "__esModule", { value: true });
subschema.extendSubschemaMode = subschema.extendSubschemaData = subschema.getSubschema = void 0;
const codegen_1$s = codegen;
const util_1$r = util;
function getSubschema(it, { keyword, schemaProp, schema, schemaPath, errSchemaPath, topSchemaRef }) {
    if (keyword !== undefined && schema !== undefined) {
        throw new Error('both "keyword" and "schema" passed, only one allowed');
    }
    if (keyword !== undefined) {
        const sch = it.schema[keyword];
        return schemaProp === undefined
            ? {
                schema: sch,
                schemaPath: (0, codegen_1$s._) `${it.schemaPath}${(0, codegen_1$s.getProperty)(keyword)}`,
                errSchemaPath: `${it.errSchemaPath}/${keyword}`,
            }
            : {
                schema: sch[schemaProp],
                schemaPath: (0, codegen_1$s._) `${it.schemaPath}${(0, codegen_1$s.getProperty)(keyword)}${(0, codegen_1$s.getProperty)(schemaProp)}`,
                errSchemaPath: `${it.errSchemaPath}/${keyword}/${(0, util_1$r.escapeFragment)(schemaProp)}`,
            };
    }
    if (schema !== undefined) {
        if (schemaPath === undefined || errSchemaPath === undefined || topSchemaRef === undefined) {
            throw new Error('"schemaPath", "errSchemaPath" and "topSchemaRef" are required with "schema"');
        }
        return {
            schema,
            schemaPath,
            topSchemaRef,
            errSchemaPath,
        };
    }
    throw new Error('either "keyword" or "schema" must be passed');
}
subschema.getSubschema = getSubschema;
function extendSubschemaData(subschema, it, { dataProp, dataPropType: dpType, data, dataTypes, propertyName }) {
    if (data !== undefined && dataProp !== undefined) {
        throw new Error('both "data" and "dataProp" passed, only one allowed');
    }
    const { gen } = it;
    if (dataProp !== undefined) {
        const { errorPath, dataPathArr, opts } = it;
        const nextData = gen.let("data", (0, codegen_1$s._) `${it.data}${(0, codegen_1$s.getProperty)(dataProp)}`, true);
        dataContextProps(nextData);
        subschema.errorPath = (0, codegen_1$s.str) `${errorPath}${(0, util_1$r.getErrorPath)(dataProp, dpType, opts.jsPropertySyntax)}`;
        subschema.parentDataProperty = (0, codegen_1$s._) `${dataProp}`;
        subschema.dataPathArr = [...dataPathArr, subschema.parentDataProperty];
    }
    if (data !== undefined) {
        const nextData = data instanceof codegen_1$s.Name ? data : gen.let("data", data, true); // replaceable if used once?
        dataContextProps(nextData);
        if (propertyName !== undefined)
            subschema.propertyName = propertyName;
        // TODO something is possibly wrong here with not changing parentDataProperty and not appending dataPathArr
    }
    if (dataTypes)
        subschema.dataTypes = dataTypes;
    function dataContextProps(_nextData) {
        subschema.data = _nextData;
        subschema.dataLevel = it.dataLevel + 1;
        subschema.dataTypes = [];
        it.definedProperties = new Set();
        subschema.parentData = it.data;
        subschema.dataNames = [...it.dataNames, _nextData];
    }
}
subschema.extendSubschemaData = extendSubschemaData;
function extendSubschemaMode(subschema, { jtdDiscriminator, jtdMetadata, compositeRule, createErrors, allErrors }) {
    if (compositeRule !== undefined)
        subschema.compositeRule = compositeRule;
    if (createErrors !== undefined)
        subschema.createErrors = createErrors;
    if (allErrors !== undefined)
        subschema.allErrors = allErrors;
    subschema.jtdDiscriminator = jtdDiscriminator; // not inherited
    subschema.jtdMetadata = jtdMetadata; // not inherited
}
subschema.extendSubschemaMode = extendSubschemaMode;

var resolve$1 = {};

// do not edit .js files directly - edit src/index.jst



var fastDeepEqual = function equal(a, b) {
  if (a === b) return true;

  if (a && b && typeof a == 'object' && typeof b == 'object') {
    if (a.constructor !== b.constructor) return false;

    var length, i, keys;
    if (Array.isArray(a)) {
      length = a.length;
      if (length != b.length) return false;
      for (i = length; i-- !== 0;)
        if (!equal(a[i], b[i])) return false;
      return true;
    }



    if (a.constructor === RegExp) return a.source === b.source && a.flags === b.flags;
    if (a.valueOf !== Object.prototype.valueOf) return a.valueOf() === b.valueOf();
    if (a.toString !== Object.prototype.toString) return a.toString() === b.toString();

    keys = Object.keys(a);
    length = keys.length;
    if (length !== Object.keys(b).length) return false;

    for (i = length; i-- !== 0;)
      if (!Object.prototype.hasOwnProperty.call(b, keys[i])) return false;

    for (i = length; i-- !== 0;) {
      var key = keys[i];

      if (!equal(a[key], b[key])) return false;
    }

    return true;
  }

  // true if both NaN, false otherwise
  return a!==a && b!==b;
};

var jsonSchemaTraverse = {exports: {}};

var traverse$1 = jsonSchemaTraverse.exports = function (schema, opts, cb) {
  // Legacy support for v0.3.1 and earlier.
  if (typeof opts == 'function') {
    cb = opts;
    opts = {};
  }

  cb = opts.cb || cb;
  var pre = (typeof cb == 'function') ? cb : cb.pre || function() {};
  var post = cb.post || function() {};

  _traverse(opts, pre, post, schema, '', schema);
};


traverse$1.keywords = {
  additionalItems: true,
  items: true,
  contains: true,
  additionalProperties: true,
  propertyNames: true,
  not: true,
  if: true,
  then: true,
  else: true
};

traverse$1.arrayKeywords = {
  items: true,
  allOf: true,
  anyOf: true,
  oneOf: true
};

traverse$1.propsKeywords = {
  $defs: true,
  definitions: true,
  properties: true,
  patternProperties: true,
  dependencies: true
};

traverse$1.skipKeywords = {
  default: true,
  enum: true,
  const: true,
  required: true,
  maximum: true,
  minimum: true,
  exclusiveMaximum: true,
  exclusiveMinimum: true,
  multipleOf: true,
  maxLength: true,
  minLength: true,
  pattern: true,
  format: true,
  maxItems: true,
  minItems: true,
  uniqueItems: true,
  maxProperties: true,
  minProperties: true
};


function _traverse(opts, pre, post, schema, jsonPtr, rootSchema, parentJsonPtr, parentKeyword, parentSchema, keyIndex) {
  if (schema && typeof schema == 'object' && !Array.isArray(schema)) {
    pre(schema, jsonPtr, rootSchema, parentJsonPtr, parentKeyword, parentSchema, keyIndex);
    for (var key in schema) {
      var sch = schema[key];
      if (Array.isArray(sch)) {
        if (key in traverse$1.arrayKeywords) {
          for (var i=0; i<sch.length; i++)
            _traverse(opts, pre, post, sch[i], jsonPtr + '/' + key + '/' + i, rootSchema, jsonPtr, key, schema, i);
        }
      } else if (key in traverse$1.propsKeywords) {
        if (sch && typeof sch == 'object') {
          for (var prop in sch)
            _traverse(opts, pre, post, sch[prop], jsonPtr + '/' + key + '/' + escapeJsonPtr(prop), rootSchema, jsonPtr, key, schema, prop);
        }
      } else if (key in traverse$1.keywords || (opts.allKeys && !(key in traverse$1.skipKeywords))) {
        _traverse(opts, pre, post, sch, jsonPtr + '/' + key, rootSchema, jsonPtr, key, schema);
      }
    }
    post(schema, jsonPtr, rootSchema, parentJsonPtr, parentKeyword, parentSchema, keyIndex);
  }
}


function escapeJsonPtr(str) {
  return str.replace(/~/g, '~0').replace(/\//g, '~1');
}

var jsonSchemaTraverseExports = jsonSchemaTraverse.exports;

Object.defineProperty(resolve$1, "__esModule", { value: true });
resolve$1.getSchemaRefs = resolve$1.resolveUrl = resolve$1.normalizeId = resolve$1._getFullPath = resolve$1.getFullPath = resolve$1.inlineRef = void 0;
const util_1$q = util;
const equal$2 = fastDeepEqual;
const traverse = jsonSchemaTraverseExports;
// TODO refactor to use keyword definitions
const SIMPLE_INLINED = new Set([
    "type",
    "format",
    "pattern",
    "maxLength",
    "minLength",
    "maxProperties",
    "minProperties",
    "maxItems",
    "minItems",
    "maximum",
    "minimum",
    "uniqueItems",
    "multipleOf",
    "required",
    "enum",
    "const",
]);
function inlineRef(schema, limit = true) {
    if (typeof schema == "boolean")
        return true;
    if (limit === true)
        return !hasRef(schema);
    if (!limit)
        return false;
    return countKeys(schema) <= limit;
}
resolve$1.inlineRef = inlineRef;
const REF_KEYWORDS = new Set([
    "$ref",
    "$recursiveRef",
    "$recursiveAnchor",
    "$dynamicRef",
    "$dynamicAnchor",
]);
function hasRef(schema) {
    for (const key in schema) {
        if (REF_KEYWORDS.has(key))
            return true;
        const sch = schema[key];
        if (Array.isArray(sch) && sch.some(hasRef))
            return true;
        if (typeof sch == "object" && hasRef(sch))
            return true;
    }
    return false;
}
function countKeys(schema) {
    let count = 0;
    for (const key in schema) {
        if (key === "$ref")
            return Infinity;
        count++;
        if (SIMPLE_INLINED.has(key))
            continue;
        if (typeof schema[key] == "object") {
            (0, util_1$q.eachItem)(schema[key], (sch) => (count += countKeys(sch)));
        }
        if (count === Infinity)
            return Infinity;
    }
    return count;
}
function getFullPath(resolver, id = "", normalize) {
    if (normalize !== false)
        id = normalizeId(id);
    const p = resolver.parse(id);
    return _getFullPath(resolver, p);
}
resolve$1.getFullPath = getFullPath;
function _getFullPath(resolver, p) {
    const serialized = resolver.serialize(p);
    return serialized.split("#")[0] + "#";
}
resolve$1._getFullPath = _getFullPath;
const TRAILING_SLASH_HASH = /#\/?$/;
function normalizeId(id) {
    return id ? id.replace(TRAILING_SLASH_HASH, "") : "";
}
resolve$1.normalizeId = normalizeId;
function resolveUrl(resolver, baseId, id) {
    id = normalizeId(id);
    return resolver.resolve(baseId, id);
}
resolve$1.resolveUrl = resolveUrl;
const ANCHOR = /^[a-z_][-a-z0-9._]*$/i;
function getSchemaRefs(schema, baseId) {
    if (typeof schema == "boolean")
        return {};
    const { schemaId, uriResolver } = this.opts;
    const schId = normalizeId(schema[schemaId] || baseId);
    const baseIds = { "": schId };
    const pathPrefix = getFullPath(uriResolver, schId, false);
    const localRefs = {};
    const schemaRefs = new Set();
    traverse(schema, { allKeys: true }, (sch, jsonPtr, _, parentJsonPtr) => {
        if (parentJsonPtr === undefined)
            return;
        const fullPath = pathPrefix + jsonPtr;
        let innerBaseId = baseIds[parentJsonPtr];
        if (typeof sch[schemaId] == "string")
            innerBaseId = addRef.call(this, sch[schemaId]);
        addAnchor.call(this, sch.$anchor);
        addAnchor.call(this, sch.$dynamicAnchor);
        baseIds[jsonPtr] = innerBaseId;
        function addRef(ref) {
            // eslint-disable-next-line @typescript-eslint/unbound-method
            const _resolve = this.opts.uriResolver.resolve;
            ref = normalizeId(innerBaseId ? _resolve(innerBaseId, ref) : ref);
            if (schemaRefs.has(ref))
                throw ambiguos(ref);
            schemaRefs.add(ref);
            let schOrRef = this.refs[ref];
            if (typeof schOrRef == "string")
                schOrRef = this.refs[schOrRef];
            if (typeof schOrRef == "object") {
                checkAmbiguosRef(sch, schOrRef.schema, ref);
            }
            else if (ref !== normalizeId(fullPath)) {
                if (ref[0] === "#") {
                    checkAmbiguosRef(sch, localRefs[ref], ref);
                    localRefs[ref] = sch;
                }
                else {
                    this.refs[ref] = fullPath;
                }
            }
            return ref;
        }
        function addAnchor(anchor) {
            if (typeof anchor == "string") {
                if (!ANCHOR.test(anchor))
                    throw new Error(`invalid anchor "${anchor}"`);
                addRef.call(this, `#${anchor}`);
            }
        }
    });
    return localRefs;
    function checkAmbiguosRef(sch1, sch2, ref) {
        if (sch2 !== undefined && !equal$2(sch1, sch2))
            throw ambiguos(ref);
    }
    function ambiguos(ref) {
        return new Error(`reference "${ref}" resolves to more than one schema`);
    }
}
resolve$1.getSchemaRefs = getSchemaRefs;

Object.defineProperty(validate, "__esModule", { value: true });
validate.getData = validate.KeywordCxt = validate.validateFunctionCode = void 0;
const boolSchema_1 = boolSchema;
const dataType_1$1 = dataType;
const applicability_1 = applicability;
const dataType_2 = dataType;
const defaults_1 = defaults;
const keyword_1 = keyword;
const subschema_1 = subschema;
const codegen_1$r = codegen;
const names_1$6 = names$1;
const resolve_1$2 = resolve$1;
const util_1$p = util;
const errors_1 = errors;
// schema compilation - generates validation function, subschemaCode (below) is used for subschemas
function validateFunctionCode(it) {
    if (isSchemaObj(it)) {
        checkKeywords(it);
        if (schemaCxtHasRules(it)) {
            topSchemaObjCode(it);
            return;
        }
    }
    validateFunction(it, () => (0, boolSchema_1.topBoolOrEmptySchema)(it));
}
validate.validateFunctionCode = validateFunctionCode;
function validateFunction({ gen, validateName, schema, schemaEnv, opts }, body) {
    if (opts.code.es5) {
        gen.func(validateName, (0, codegen_1$r._) `${names_1$6.default.data}, ${names_1$6.default.valCxt}`, schemaEnv.$async, () => {
            gen.code((0, codegen_1$r._) `"use strict"; ${funcSourceUrl(schema, opts)}`);
            destructureValCxtES5(gen, opts);
            gen.code(body);
        });
    }
    else {
        gen.func(validateName, (0, codegen_1$r._) `${names_1$6.default.data}, ${destructureValCxt(opts)}`, schemaEnv.$async, () => gen.code(funcSourceUrl(schema, opts)).code(body));
    }
}
function destructureValCxt(opts) {
    return (0, codegen_1$r._) `{${names_1$6.default.instancePath}="", ${names_1$6.default.parentData}, ${names_1$6.default.parentDataProperty}, ${names_1$6.default.rootData}=${names_1$6.default.data}${opts.dynamicRef ? (0, codegen_1$r._) `, ${names_1$6.default.dynamicAnchors}={}` : codegen_1$r.nil}}={}`;
}
function destructureValCxtES5(gen, opts) {
    gen.if(names_1$6.default.valCxt, () => {
        gen.var(names_1$6.default.instancePath, (0, codegen_1$r._) `${names_1$6.default.valCxt}.${names_1$6.default.instancePath}`);
        gen.var(names_1$6.default.parentData, (0, codegen_1$r._) `${names_1$6.default.valCxt}.${names_1$6.default.parentData}`);
        gen.var(names_1$6.default.parentDataProperty, (0, codegen_1$r._) `${names_1$6.default.valCxt}.${names_1$6.default.parentDataProperty}`);
        gen.var(names_1$6.default.rootData, (0, codegen_1$r._) `${names_1$6.default.valCxt}.${names_1$6.default.rootData}`);
        if (opts.dynamicRef)
            gen.var(names_1$6.default.dynamicAnchors, (0, codegen_1$r._) `${names_1$6.default.valCxt}.${names_1$6.default.dynamicAnchors}`);
    }, () => {
        gen.var(names_1$6.default.instancePath, (0, codegen_1$r._) `""`);
        gen.var(names_1$6.default.parentData, (0, codegen_1$r._) `undefined`);
        gen.var(names_1$6.default.parentDataProperty, (0, codegen_1$r._) `undefined`);
        gen.var(names_1$6.default.rootData, names_1$6.default.data);
        if (opts.dynamicRef)
            gen.var(names_1$6.default.dynamicAnchors, (0, codegen_1$r._) `{}`);
    });
}
function topSchemaObjCode(it) {
    const { schema, opts, gen } = it;
    validateFunction(it, () => {
        if (opts.$comment && schema.$comment)
            commentKeyword(it);
        checkNoDefault(it);
        gen.let(names_1$6.default.vErrors, null);
        gen.let(names_1$6.default.errors, 0);
        if (opts.unevaluated)
            resetEvaluated(it);
        typeAndKeywords(it);
        returnResults(it);
    });
    return;
}
function resetEvaluated(it) {
    // TODO maybe some hook to execute it in the end to check whether props/items are Name, as in assignEvaluated
    const { gen, validateName } = it;
    it.evaluated = gen.const("evaluated", (0, codegen_1$r._) `${validateName}.evaluated`);
    gen.if((0, codegen_1$r._) `${it.evaluated}.dynamicProps`, () => gen.assign((0, codegen_1$r._) `${it.evaluated}.props`, (0, codegen_1$r._) `undefined`));
    gen.if((0, codegen_1$r._) `${it.evaluated}.dynamicItems`, () => gen.assign((0, codegen_1$r._) `${it.evaluated}.items`, (0, codegen_1$r._) `undefined`));
}
function funcSourceUrl(schema, opts) {
    const schId = typeof schema == "object" && schema[opts.schemaId];
    return schId && (opts.code.source || opts.code.process) ? (0, codegen_1$r._) `/*# sourceURL=${schId} */` : codegen_1$r.nil;
}
// schema compilation - this function is used recursively to generate code for sub-schemas
function subschemaCode(it, valid) {
    if (isSchemaObj(it)) {
        checkKeywords(it);
        if (schemaCxtHasRules(it)) {
            subSchemaObjCode(it, valid);
            return;
        }
    }
    (0, boolSchema_1.boolOrEmptySchema)(it, valid);
}
function schemaCxtHasRules({ schema, self }) {
    if (typeof schema == "boolean")
        return !schema;
    for (const key in schema)
        if (self.RULES.all[key])
            return true;
    return false;
}
function isSchemaObj(it) {
    return typeof it.schema != "boolean";
}
function subSchemaObjCode(it, valid) {
    const { schema, gen, opts } = it;
    if (opts.$comment && schema.$comment)
        commentKeyword(it);
    updateContext$1(it);
    checkAsyncSchema(it);
    const errsCount = gen.const("_errs", names_1$6.default.errors);
    typeAndKeywords(it, errsCount);
    // TODO var
    gen.var(valid, (0, codegen_1$r._) `${errsCount} === ${names_1$6.default.errors}`);
}
function checkKeywords(it) {
    (0, util_1$p.checkUnknownRules)(it);
    checkRefsAndKeywords(it);
}
function typeAndKeywords(it, errsCount) {
    if (it.opts.jtd)
        return schemaKeywords(it, [], false, errsCount);
    const types = (0, dataType_1$1.getSchemaTypes)(it.schema);
    const checkedTypes = (0, dataType_1$1.coerceAndCheckDataType)(it, types);
    schemaKeywords(it, types, !checkedTypes, errsCount);
}
function checkRefsAndKeywords(it) {
    const { schema, errSchemaPath, opts, self } = it;
    if (schema.$ref && opts.ignoreKeywordsWithRef && (0, util_1$p.schemaHasRulesButRef)(schema, self.RULES)) {
        self.logger.warn(`$ref: keywords ignored in schema at path "${errSchemaPath}"`);
    }
}
function checkNoDefault(it) {
    const { schema, opts } = it;
    if (schema.default !== undefined && opts.useDefaults && opts.strictSchema) {
        (0, util_1$p.checkStrictMode)(it, "default is ignored in the schema root");
    }
}
function updateContext$1(it) {
    const schId = it.schema[it.opts.schemaId];
    if (schId)
        it.baseId = (0, resolve_1$2.resolveUrl)(it.opts.uriResolver, it.baseId, schId);
}
function checkAsyncSchema(it) {
    if (it.schema.$async && !it.schemaEnv.$async)
        throw new Error("async schema in sync schema");
}
function commentKeyword({ gen, schemaEnv, schema, errSchemaPath, opts }) {
    const msg = schema.$comment;
    if (opts.$comment === true) {
        gen.code((0, codegen_1$r._) `${names_1$6.default.self}.logger.log(${msg})`);
    }
    else if (typeof opts.$comment == "function") {
        const schemaPath = (0, codegen_1$r.str) `${errSchemaPath}/$comment`;
        const rootName = gen.scopeValue("root", { ref: schemaEnv.root });
        gen.code((0, codegen_1$r._) `${names_1$6.default.self}.opts.$comment(${msg}, ${schemaPath}, ${rootName}.schema)`);
    }
}
function returnResults(it) {
    const { gen, schemaEnv, validateName, ValidationError, opts } = it;
    if (schemaEnv.$async) {
        // TODO assign unevaluated
        gen.if((0, codegen_1$r._) `${names_1$6.default.errors} === 0`, () => gen.return(names_1$6.default.data), () => gen.throw((0, codegen_1$r._) `new ${ValidationError}(${names_1$6.default.vErrors})`));
    }
    else {
        gen.assign((0, codegen_1$r._) `${validateName}.errors`, names_1$6.default.vErrors);
        if (opts.unevaluated)
            assignEvaluated(it);
        gen.return((0, codegen_1$r._) `${names_1$6.default.errors} === 0`);
    }
}
function assignEvaluated({ gen, evaluated, props, items }) {
    if (props instanceof codegen_1$r.Name)
        gen.assign((0, codegen_1$r._) `${evaluated}.props`, props);
    if (items instanceof codegen_1$r.Name)
        gen.assign((0, codegen_1$r._) `${evaluated}.items`, items);
}
function schemaKeywords(it, types, typeErrors, errsCount) {
    const { gen, schema, data, allErrors, opts, self } = it;
    const { RULES } = self;
    if (schema.$ref && (opts.ignoreKeywordsWithRef || !(0, util_1$p.schemaHasRulesButRef)(schema, RULES))) {
        gen.block(() => keywordCode(it, "$ref", RULES.all.$ref.definition)); // TODO typecast
        return;
    }
    if (!opts.jtd)
        checkStrictTypes(it, types);
    gen.block(() => {
        for (const group of RULES.rules)
            groupKeywords(group);
        groupKeywords(RULES.post);
    });
    function groupKeywords(group) {
        if (!(0, applicability_1.shouldUseGroup)(schema, group))
            return;
        if (group.type) {
            gen.if((0, dataType_2.checkDataType)(group.type, data, opts.strictNumbers));
            iterateKeywords(it, group);
            if (types.length === 1 && types[0] === group.type && typeErrors) {
                gen.else();
                (0, dataType_2.reportTypeError)(it);
            }
            gen.endIf();
        }
        else {
            iterateKeywords(it, group);
        }
        // TODO make it "ok" call?
        if (!allErrors)
            gen.if((0, codegen_1$r._) `${names_1$6.default.errors} === ${errsCount || 0}`);
    }
}
function iterateKeywords(it, group) {
    const { gen, schema, opts: { useDefaults }, } = it;
    if (useDefaults)
        (0, defaults_1.assignDefaults)(it, group.type);
    gen.block(() => {
        for (const rule of group.rules) {
            if ((0, applicability_1.shouldUseRule)(schema, rule)) {
                keywordCode(it, rule.keyword, rule.definition, group.type);
            }
        }
    });
}
function checkStrictTypes(it, types) {
    if (it.schemaEnv.meta || !it.opts.strictTypes)
        return;
    checkContextTypes(it, types);
    if (!it.opts.allowUnionTypes)
        checkMultipleTypes(it, types);
    checkKeywordTypes(it, it.dataTypes);
}
function checkContextTypes(it, types) {
    if (!types.length)
        return;
    if (!it.dataTypes.length) {
        it.dataTypes = types;
        return;
    }
    types.forEach((t) => {
        if (!includesType(it.dataTypes, t)) {
            strictTypesError(it, `type "${t}" not allowed by context "${it.dataTypes.join(",")}"`);
        }
    });
    narrowSchemaTypes(it, types);
}
function checkMultipleTypes(it, ts) {
    if (ts.length > 1 && !(ts.length === 2 && ts.includes("null"))) {
        strictTypesError(it, "use allowUnionTypes to allow union type keyword");
    }
}
function checkKeywordTypes(it, ts) {
    const rules = it.self.RULES.all;
    for (const keyword in rules) {
        const rule = rules[keyword];
        if (typeof rule == "object" && (0, applicability_1.shouldUseRule)(it.schema, rule)) {
            const { type } = rule.definition;
            if (type.length && !type.some((t) => hasApplicableType(ts, t))) {
                strictTypesError(it, `missing type "${type.join(",")}" for keyword "${keyword}"`);
            }
        }
    }
}
function hasApplicableType(schTs, kwdT) {
    return schTs.includes(kwdT) || (kwdT === "number" && schTs.includes("integer"));
}
function includesType(ts, t) {
    return ts.includes(t) || (t === "integer" && ts.includes("number"));
}
function narrowSchemaTypes(it, withTypes) {
    const ts = [];
    for (const t of it.dataTypes) {
        if (includesType(withTypes, t))
            ts.push(t);
        else if (withTypes.includes("integer") && t === "number")
            ts.push("integer");
    }
    it.dataTypes = ts;
}
function strictTypesError(it, msg) {
    const schemaPath = it.schemaEnv.baseId + it.errSchemaPath;
    msg += ` at "${schemaPath}" (strictTypes)`;
    (0, util_1$p.checkStrictMode)(it, msg, it.opts.strictTypes);
}
class KeywordCxt {
    constructor(it, def, keyword) {
        (0, keyword_1.validateKeywordUsage)(it, def, keyword);
        this.gen = it.gen;
        this.allErrors = it.allErrors;
        this.keyword = keyword;
        this.data = it.data;
        this.schema = it.schema[keyword];
        this.$data = def.$data && it.opts.$data && this.schema && this.schema.$data;
        this.schemaValue = (0, util_1$p.schemaRefOrVal)(it, this.schema, keyword, this.$data);
        this.schemaType = def.schemaType;
        this.parentSchema = it.schema;
        this.params = {};
        this.it = it;
        this.def = def;
        if (this.$data) {
            this.schemaCode = it.gen.const("vSchema", getData(this.$data, it));
        }
        else {
            this.schemaCode = this.schemaValue;
            if (!(0, keyword_1.validSchemaType)(this.schema, def.schemaType, def.allowUndefined)) {
                throw new Error(`${keyword} value must be ${JSON.stringify(def.schemaType)}`);
            }
        }
        if ("code" in def ? def.trackErrors : def.errors !== false) {
            this.errsCount = it.gen.const("_errs", names_1$6.default.errors);
        }
    }
    result(condition, successAction, failAction) {
        this.failResult((0, codegen_1$r.not)(condition), successAction, failAction);
    }
    failResult(condition, successAction, failAction) {
        this.gen.if(condition);
        if (failAction)
            failAction();
        else
            this.error();
        if (successAction) {
            this.gen.else();
            successAction();
            if (this.allErrors)
                this.gen.endIf();
        }
        else {
            if (this.allErrors)
                this.gen.endIf();
            else
                this.gen.else();
        }
    }
    pass(condition, failAction) {
        this.failResult((0, codegen_1$r.not)(condition), undefined, failAction);
    }
    fail(condition) {
        if (condition === undefined) {
            this.error();
            if (!this.allErrors)
                this.gen.if(false); // this branch will be removed by gen.optimize
            return;
        }
        this.gen.if(condition);
        this.error();
        if (this.allErrors)
            this.gen.endIf();
        else
            this.gen.else();
    }
    fail$data(condition) {
        if (!this.$data)
            return this.fail(condition);
        const { schemaCode } = this;
        this.fail((0, codegen_1$r._) `${schemaCode} !== undefined && (${(0, codegen_1$r.or)(this.invalid$data(), condition)})`);
    }
    error(append, errorParams, errorPaths) {
        if (errorParams) {
            this.setParams(errorParams);
            this._error(append, errorPaths);
            this.setParams({});
            return;
        }
        this._error(append, errorPaths);
    }
    _error(append, errorPaths) {
        (append ? errors_1.reportExtraError : errors_1.reportError)(this, this.def.error, errorPaths);
    }
    $dataError() {
        (0, errors_1.reportError)(this, this.def.$dataError || errors_1.keyword$DataError);
    }
    reset() {
        if (this.errsCount === undefined)
            throw new Error('add "trackErrors" to keyword definition');
        (0, errors_1.resetErrorsCount)(this.gen, this.errsCount);
    }
    ok(cond) {
        if (!this.allErrors)
            this.gen.if(cond);
    }
    setParams(obj, assign) {
        if (assign)
            Object.assign(this.params, obj);
        else
            this.params = obj;
    }
    block$data(valid, codeBlock, $dataValid = codegen_1$r.nil) {
        this.gen.block(() => {
            this.check$data(valid, $dataValid);
            codeBlock();
        });
    }
    check$data(valid = codegen_1$r.nil, $dataValid = codegen_1$r.nil) {
        if (!this.$data)
            return;
        const { gen, schemaCode, schemaType, def } = this;
        gen.if((0, codegen_1$r.or)((0, codegen_1$r._) `${schemaCode} === undefined`, $dataValid));
        if (valid !== codegen_1$r.nil)
            gen.assign(valid, true);
        if (schemaType.length || def.validateSchema) {
            gen.elseIf(this.invalid$data());
            this.$dataError();
            if (valid !== codegen_1$r.nil)
                gen.assign(valid, false);
        }
        gen.else();
    }
    invalid$data() {
        const { gen, schemaCode, schemaType, def, it } = this;
        return (0, codegen_1$r.or)(wrong$DataType(), invalid$DataSchema());
        function wrong$DataType() {
            if (schemaType.length) {
                /* istanbul ignore if */
                if (!(schemaCode instanceof codegen_1$r.Name))
                    throw new Error("ajv implementation error");
                const st = Array.isArray(schemaType) ? schemaType : [schemaType];
                return (0, codegen_1$r._) `${(0, dataType_2.checkDataTypes)(st, schemaCode, it.opts.strictNumbers, dataType_2.DataType.Wrong)}`;
            }
            return codegen_1$r.nil;
        }
        function invalid$DataSchema() {
            if (def.validateSchema) {
                const validateSchemaRef = gen.scopeValue("validate$data", { ref: def.validateSchema }); // TODO value.code for standalone
                return (0, codegen_1$r._) `!${validateSchemaRef}(${schemaCode})`;
            }
            return codegen_1$r.nil;
        }
    }
    subschema(appl, valid) {
        const subschema = (0, subschema_1.getSubschema)(this.it, appl);
        (0, subschema_1.extendSubschemaData)(subschema, this.it, appl);
        (0, subschema_1.extendSubschemaMode)(subschema, appl);
        const nextContext = { ...this.it, ...subschema, items: undefined, props: undefined };
        subschemaCode(nextContext, valid);
        return nextContext;
    }
    mergeEvaluated(schemaCxt, toName) {
        const { it, gen } = this;
        if (!it.opts.unevaluated)
            return;
        if (it.props !== true && schemaCxt.props !== undefined) {
            it.props = util_1$p.mergeEvaluated.props(gen, schemaCxt.props, it.props, toName);
        }
        if (it.items !== true && schemaCxt.items !== undefined) {
            it.items = util_1$p.mergeEvaluated.items(gen, schemaCxt.items, it.items, toName);
        }
    }
    mergeValidEvaluated(schemaCxt, valid) {
        const { it, gen } = this;
        if (it.opts.unevaluated && (it.props !== true || it.items !== true)) {
            gen.if(valid, () => this.mergeEvaluated(schemaCxt, codegen_1$r.Name));
            return true;
        }
    }
}
validate.KeywordCxt = KeywordCxt;
function keywordCode(it, keyword, def, ruleType) {
    const cxt = new KeywordCxt(it, def, keyword);
    if ("code" in def) {
        def.code(cxt, ruleType);
    }
    else if (cxt.$data && def.validate) {
        (0, keyword_1.funcKeywordCode)(cxt, def);
    }
    else if ("macro" in def) {
        (0, keyword_1.macroKeywordCode)(cxt, def);
    }
    else if (def.compile || def.validate) {
        (0, keyword_1.funcKeywordCode)(cxt, def);
    }
}
const JSON_POINTER = /^\/(?:[^~]|~0|~1)*$/;
const RELATIVE_JSON_POINTER = /^([0-9]+)(#|\/(?:[^~]|~0|~1)*)?$/;
function getData($data, { dataLevel, dataNames, dataPathArr }) {
    let jsonPointer;
    let data;
    if ($data === "")
        return names_1$6.default.rootData;
    if ($data[0] === "/") {
        if (!JSON_POINTER.test($data))
            throw new Error(`Invalid JSON-pointer: ${$data}`);
        jsonPointer = $data;
        data = names_1$6.default.rootData;
    }
    else {
        const matches = RELATIVE_JSON_POINTER.exec($data);
        if (!matches)
            throw new Error(`Invalid JSON-pointer: ${$data}`);
        const up = +matches[1];
        jsonPointer = matches[2];
        if (jsonPointer === "#") {
            if (up >= dataLevel)
                throw new Error(errorMsg("property/index", up));
            return dataPathArr[dataLevel - up];
        }
        if (up > dataLevel)
            throw new Error(errorMsg("data", up));
        data = dataNames[dataLevel - up];
        if (!jsonPointer)
            return data;
    }
    let expr = data;
    const segments = jsonPointer.split("/");
    for (const segment of segments) {
        if (segment) {
            data = (0, codegen_1$r._) `${data}${(0, codegen_1$r.getProperty)((0, util_1$p.unescapeJsonPointer)(segment))}`;
            expr = (0, codegen_1$r._) `${expr} && ${data}`;
        }
    }
    return expr;
    function errorMsg(pointerType, up) {
        return `Cannot access ${pointerType} ${up} levels up, current level is ${dataLevel}`;
    }
}
validate.getData = getData;

var validation_error = {};

Object.defineProperty(validation_error, "__esModule", { value: true });
class ValidationError extends Error {
    constructor(errors) {
        super("validation failed");
        this.errors = errors;
        this.ajv = this.validation = true;
    }
}
validation_error.default = ValidationError;

var ref_error = {};

Object.defineProperty(ref_error, "__esModule", { value: true });
const resolve_1$1 = resolve$1;
class MissingRefError extends Error {
    constructor(resolver, baseId, ref, msg) {
        super(msg || `can't resolve reference ${ref} from id ${baseId}`);
        this.missingRef = (0, resolve_1$1.resolveUrl)(resolver, baseId, ref);
        this.missingSchema = (0, resolve_1$1.normalizeId)((0, resolve_1$1.getFullPath)(resolver, this.missingRef));
    }
}
ref_error.default = MissingRefError;

var compile = {};

Object.defineProperty(compile, "__esModule", { value: true });
compile.resolveSchema = compile.getCompilingSchema = compile.resolveRef = compile.compileSchema = compile.SchemaEnv = void 0;
const codegen_1$q = codegen;
const validation_error_1 = validation_error;
const names_1$5 = names$1;
const resolve_1 = resolve$1;
const util_1$o = util;
const validate_1$1 = validate;
class SchemaEnv {
    constructor(env) {
        var _a;
        this.refs = {};
        this.dynamicAnchors = {};
        let schema;
        if (typeof env.schema == "object")
            schema = env.schema;
        this.schema = env.schema;
        this.schemaId = env.schemaId;
        this.root = env.root || this;
        this.baseId = (_a = env.baseId) !== null && _a !== void 0 ? _a : (0, resolve_1.normalizeId)(schema === null || schema === void 0 ? void 0 : schema[env.schemaId || "$id"]);
        this.schemaPath = env.schemaPath;
        this.localRefs = env.localRefs;
        this.meta = env.meta;
        this.$async = schema === null || schema === void 0 ? void 0 : schema.$async;
        this.refs = {};
    }
}
compile.SchemaEnv = SchemaEnv;
// let codeSize = 0
// let nodeCount = 0
// Compiles schema in SchemaEnv
function compileSchema(sch) {
    // TODO refactor - remove compilations
    const _sch = getCompilingSchema.call(this, sch);
    if (_sch)
        return _sch;
    const rootId = (0, resolve_1.getFullPath)(this.opts.uriResolver, sch.root.baseId); // TODO if getFullPath removed 1 tests fails
    const { es5, lines } = this.opts.code;
    const { ownProperties } = this.opts;
    const gen = new codegen_1$q.CodeGen(this.scope, { es5, lines, ownProperties });
    let _ValidationError;
    if (sch.$async) {
        _ValidationError = gen.scopeValue("Error", {
            ref: validation_error_1.default,
            code: (0, codegen_1$q._) `require("ajv/dist/runtime/validation_error").default`,
        });
    }
    const validateName = gen.scopeName("validate");
    sch.validateName = validateName;
    const schemaCxt = {
        gen,
        allErrors: this.opts.allErrors,
        data: names_1$5.default.data,
        parentData: names_1$5.default.parentData,
        parentDataProperty: names_1$5.default.parentDataProperty,
        dataNames: [names_1$5.default.data],
        dataPathArr: [codegen_1$q.nil], // TODO can its length be used as dataLevel if nil is removed?
        dataLevel: 0,
        dataTypes: [],
        definedProperties: new Set(),
        topSchemaRef: gen.scopeValue("schema", this.opts.code.source === true
            ? { ref: sch.schema, code: (0, codegen_1$q.stringify)(sch.schema) }
            : { ref: sch.schema }),
        validateName,
        ValidationError: _ValidationError,
        schema: sch.schema,
        schemaEnv: sch,
        rootId,
        baseId: sch.baseId || rootId,
        schemaPath: codegen_1$q.nil,
        errSchemaPath: sch.schemaPath || (this.opts.jtd ? "" : "#"),
        errorPath: (0, codegen_1$q._) `""`,
        opts: this.opts,
        self: this,
    };
    let sourceCode;
    try {
        this._compilations.add(sch);
        (0, validate_1$1.validateFunctionCode)(schemaCxt);
        gen.optimize(this.opts.code.optimize);
        // gen.optimize(1)
        const validateCode = gen.toString();
        sourceCode = `${gen.scopeRefs(names_1$5.default.scope)}return ${validateCode}`;
        // console.log((codeSize += sourceCode.length), (nodeCount += gen.nodeCount))
        if (this.opts.code.process)
            sourceCode = this.opts.code.process(sourceCode, sch);
        // console.log("\n\n\n *** \n", sourceCode)
        const makeValidate = new Function(`${names_1$5.default.self}`, `${names_1$5.default.scope}`, sourceCode);
        const validate = makeValidate(this, this.scope.get());
        this.scope.value(validateName, { ref: validate });
        validate.errors = null;
        validate.schema = sch.schema;
        validate.schemaEnv = sch;
        if (sch.$async)
            validate.$async = true;
        if (this.opts.code.source === true) {
            validate.source = { validateName, validateCode, scopeValues: gen._values };
        }
        if (this.opts.unevaluated) {
            const { props, items } = schemaCxt;
            validate.evaluated = {
                props: props instanceof codegen_1$q.Name ? undefined : props,
                items: items instanceof codegen_1$q.Name ? undefined : items,
                dynamicProps: props instanceof codegen_1$q.Name,
                dynamicItems: items instanceof codegen_1$q.Name,
            };
            if (validate.source)
                validate.source.evaluated = (0, codegen_1$q.stringify)(validate.evaluated);
        }
        sch.validate = validate;
        return sch;
    }
    catch (e) {
        delete sch.validate;
        delete sch.validateName;
        if (sourceCode)
            this.logger.error("Error compiling schema, function code:", sourceCode);
        // console.log("\n\n\n *** \n", sourceCode, this.opts)
        throw e;
    }
    finally {
        this._compilations.delete(sch);
    }
}
compile.compileSchema = compileSchema;
function resolveRef(root, baseId, ref) {
    var _a;
    ref = (0, resolve_1.resolveUrl)(this.opts.uriResolver, baseId, ref);
    const schOrFunc = root.refs[ref];
    if (schOrFunc)
        return schOrFunc;
    let _sch = resolve.call(this, root, ref);
    if (_sch === undefined) {
        const schema = (_a = root.localRefs) === null || _a === void 0 ? void 0 : _a[ref]; // TODO maybe localRefs should hold SchemaEnv
        const { schemaId } = this.opts;
        if (schema)
            _sch = new SchemaEnv({ schema, schemaId, root, baseId });
    }
    if (_sch === undefined)
        return;
    return (root.refs[ref] = inlineOrCompile.call(this, _sch));
}
compile.resolveRef = resolveRef;
function inlineOrCompile(sch) {
    if ((0, resolve_1.inlineRef)(sch.schema, this.opts.inlineRefs))
        return sch.schema;
    return sch.validate ? sch : compileSchema.call(this, sch);
}
// Index of schema compilation in the currently compiled list
function getCompilingSchema(schEnv) {
    for (const sch of this._compilations) {
        if (sameSchemaEnv(sch, schEnv))
            return sch;
    }
}
compile.getCompilingSchema = getCompilingSchema;
function sameSchemaEnv(s1, s2) {
    return s1.schema === s2.schema && s1.root === s2.root && s1.baseId === s2.baseId;
}
// resolve and compile the references ($ref)
// TODO returns AnySchemaObject (if the schema can be inlined) or validation function
function resolve(root, // information about the root schema for the current schema
ref // reference to resolve
) {
    let sch;
    while (typeof (sch = this.refs[ref]) == "string")
        ref = sch;
    return sch || this.schemas[ref] || resolveSchema.call(this, root, ref);
}
// Resolve schema, its root and baseId
function resolveSchema(root, // root object with properties schema, refs TODO below SchemaEnv is assigned to it
ref // reference to resolve
) {
    const p = this.opts.uriResolver.parse(ref);
    const refPath = (0, resolve_1._getFullPath)(this.opts.uriResolver, p);
    let baseId = (0, resolve_1.getFullPath)(this.opts.uriResolver, root.baseId, undefined);
    // TODO `Object.keys(root.schema).length > 0` should not be needed - but removing breaks 2 tests
    if (Object.keys(root.schema).length > 0 && refPath === baseId) {
        return getJsonPointer.call(this, p, root);
    }
    const id = (0, resolve_1.normalizeId)(refPath);
    const schOrRef = this.refs[id] || this.schemas[id];
    if (typeof schOrRef == "string") {
        const sch = resolveSchema.call(this, root, schOrRef);
        if (typeof (sch === null || sch === void 0 ? void 0 : sch.schema) !== "object")
            return;
        return getJsonPointer.call(this, p, sch);
    }
    if (typeof (schOrRef === null || schOrRef === void 0 ? void 0 : schOrRef.schema) !== "object")
        return;
    if (!schOrRef.validate)
        compileSchema.call(this, schOrRef);
    if (id === (0, resolve_1.normalizeId)(ref)) {
        const { schema } = schOrRef;
        const { schemaId } = this.opts;
        const schId = schema[schemaId];
        if (schId)
            baseId = (0, resolve_1.resolveUrl)(this.opts.uriResolver, baseId, schId);
        return new SchemaEnv({ schema, schemaId, root, baseId });
    }
    return getJsonPointer.call(this, p, schOrRef);
}
compile.resolveSchema = resolveSchema;
const PREVENT_SCOPE_CHANGE = new Set([
    "properties",
    "patternProperties",
    "enum",
    "dependencies",
    "definitions",
]);
function getJsonPointer(parsedRef, { baseId, schema, root }) {
    var _a;
    if (((_a = parsedRef.fragment) === null || _a === void 0 ? void 0 : _a[0]) !== "/")
        return;
    for (const part of parsedRef.fragment.slice(1).split("/")) {
        if (typeof schema === "boolean")
            return;
        const partSchema = schema[(0, util_1$o.unescapeFragment)(part)];
        if (partSchema === undefined)
            return;
        schema = partSchema;
        // TODO PREVENT_SCOPE_CHANGE could be defined in keyword def?
        const schId = typeof schema === "object" && schema[this.opts.schemaId];
        if (!PREVENT_SCOPE_CHANGE.has(part) && schId) {
            baseId = (0, resolve_1.resolveUrl)(this.opts.uriResolver, baseId, schId);
        }
    }
    let env;
    if (typeof schema != "boolean" && schema.$ref && !(0, util_1$o.schemaHasRulesButRef)(schema, this.RULES)) {
        const $ref = (0, resolve_1.resolveUrl)(this.opts.uriResolver, baseId, schema.$ref);
        env = resolveSchema.call(this, root, $ref);
    }
    // even though resolution failed we need to return SchemaEnv to throw exception
    // so that compileAsync loads missing schema.
    const { schemaId } = this.opts;
    env = env || new SchemaEnv({ schema, schemaId, root, baseId });
    if (env.schema !== env.root.schema)
        return env;
    return undefined;
}

var $id$9 = "https://raw.githubusercontent.com/ajv-validator/ajv/master/lib/refs/data.json#";
var description = "Meta-schema for $data reference (JSON AnySchema extension proposal)";
var type$9 = "object";
var required$1 = [
	"$data"
];
var properties$a = {
	$data: {
		type: "string",
		anyOf: [
			{
				format: "relative-json-pointer"
			},
			{
				format: "json-pointer"
			}
		]
	}
};
var additionalProperties$1 = false;
var require$$9 = {
	$id: $id$9,
	description: description,
	type: type$9,
	required: required$1,
	properties: properties$a,
	additionalProperties: additionalProperties$1
};

var uri$1 = {};

var uri_all = {exports: {}};

/** @license URI.js v4.4.1 (c) 2011 Gary Court. License: http://github.com/garycourt/uri-js */

(function (module, exports) {
	(function (global, factory) {
		factory(exports) ;
	}(commonjsGlobal, (function (exports) {
	function merge() {
	    for (var _len = arguments.length, sets = Array(_len), _key = 0; _key < _len; _key++) {
	        sets[_key] = arguments[_key];
	    }

	    if (sets.length > 1) {
	        sets[0] = sets[0].slice(0, -1);
	        var xl = sets.length - 1;
	        for (var x = 1; x < xl; ++x) {
	            sets[x] = sets[x].slice(1, -1);
	        }
	        sets[xl] = sets[xl].slice(1);
	        return sets.join('');
	    } else {
	        return sets[0];
	    }
	}
	function subexp(str) {
	    return "(?:" + str + ")";
	}
	function typeOf(o) {
	    return o === undefined ? "undefined" : o === null ? "null" : Object.prototype.toString.call(o).split(" ").pop().split("]").shift().toLowerCase();
	}
	function toUpperCase(str) {
	    return str.toUpperCase();
	}
	function toArray(obj) {
	    return obj !== undefined && obj !== null ? obj instanceof Array ? obj : typeof obj.length !== "number" || obj.split || obj.setInterval || obj.call ? [obj] : Array.prototype.slice.call(obj) : [];
	}
	function assign(target, source) {
	    var obj = target;
	    if (source) {
	        for (var key in source) {
	            obj[key] = source[key];
	        }
	    }
	    return obj;
	}

	function buildExps(isIRI) {
	    var ALPHA$$ = "[A-Za-z]",
	        DIGIT$$ = "[0-9]",
	        HEXDIG$$ = merge(DIGIT$$, "[A-Fa-f]"),
	        PCT_ENCODED$ = subexp(subexp("%[EFef]" + HEXDIG$$ + "%" + HEXDIG$$ + HEXDIG$$ + "%" + HEXDIG$$ + HEXDIG$$) + "|" + subexp("%[89A-Fa-f]" + HEXDIG$$ + "%" + HEXDIG$$ + HEXDIG$$) + "|" + subexp("%" + HEXDIG$$ + HEXDIG$$)),
	        //expanded
	    GEN_DELIMS$$ = "[\\:\\/\\?\\#\\[\\]\\@]",
	        SUB_DELIMS$$ = "[\\!\\$\\&\\'\\(\\)\\*\\+\\,\\;\\=]",
	        RESERVED$$ = merge(GEN_DELIMS$$, SUB_DELIMS$$),
	        UCSCHAR$$ = isIRI ? "[\\xA0-\\u200D\\u2010-\\u2029\\u202F-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFEF]" : "[]",
	        //subset, excludes bidi control characters
	    IPRIVATE$$ = isIRI ? "[\\uE000-\\uF8FF]" : "[]",
	        //subset
	    UNRESERVED$$ = merge(ALPHA$$, DIGIT$$, "[\\-\\.\\_\\~]", UCSCHAR$$);
	        subexp(ALPHA$$ + merge(ALPHA$$, DIGIT$$, "[\\+\\-\\.]") + "*");
	        subexp(subexp(PCT_ENCODED$ + "|" + merge(UNRESERVED$$, SUB_DELIMS$$, "[\\:]")) + "*");
	        var DEC_OCTET_RELAXED$ = subexp(subexp("25[0-5]") + "|" + subexp("2[0-4]" + DIGIT$$) + "|" + subexp("1" + DIGIT$$ + DIGIT$$) + "|" + subexp("0?[1-9]" + DIGIT$$) + "|0?0?" + DIGIT$$),
	        //relaxed parsing rules
	    IPV4ADDRESS$ = subexp(DEC_OCTET_RELAXED$ + "\\." + DEC_OCTET_RELAXED$ + "\\." + DEC_OCTET_RELAXED$ + "\\." + DEC_OCTET_RELAXED$),
	        H16$ = subexp(HEXDIG$$ + "{1,4}"),
	        LS32$ = subexp(subexp(H16$ + "\\:" + H16$) + "|" + IPV4ADDRESS$),
	        IPV6ADDRESS1$ = subexp(subexp(H16$ + "\\:") + "{6}" + LS32$),
	        //                           6( h16 ":" ) ls32
	    IPV6ADDRESS2$ = subexp("\\:\\:" + subexp(H16$ + "\\:") + "{5}" + LS32$),
	        //                      "::" 5( h16 ":" ) ls32
	    IPV6ADDRESS3$ = subexp(subexp(H16$) + "?\\:\\:" + subexp(H16$ + "\\:") + "{4}" + LS32$),
	        //[               h16 ] "::" 4( h16 ":" ) ls32
	    IPV6ADDRESS4$ = subexp(subexp(subexp(H16$ + "\\:") + "{0,1}" + H16$) + "?\\:\\:" + subexp(H16$ + "\\:") + "{3}" + LS32$),
	        //[ *1( h16 ":" ) h16 ] "::" 3( h16 ":" ) ls32
	    IPV6ADDRESS5$ = subexp(subexp(subexp(H16$ + "\\:") + "{0,2}" + H16$) + "?\\:\\:" + subexp(H16$ + "\\:") + "{2}" + LS32$),
	        //[ *2( h16 ":" ) h16 ] "::" 2( h16 ":" ) ls32
	    IPV6ADDRESS6$ = subexp(subexp(subexp(H16$ + "\\:") + "{0,3}" + H16$) + "?\\:\\:" + H16$ + "\\:" + LS32$),
	        //[ *3( h16 ":" ) h16 ] "::"    h16 ":"   ls32
	    IPV6ADDRESS7$ = subexp(subexp(subexp(H16$ + "\\:") + "{0,4}" + H16$) + "?\\:\\:" + LS32$),
	        //[ *4( h16 ":" ) h16 ] "::"              ls32
	    IPV6ADDRESS8$ = subexp(subexp(subexp(H16$ + "\\:") + "{0,5}" + H16$) + "?\\:\\:" + H16$),
	        //[ *5( h16 ":" ) h16 ] "::"              h16
	    IPV6ADDRESS9$ = subexp(subexp(subexp(H16$ + "\\:") + "{0,6}" + H16$) + "?\\:\\:"),
	        //[ *6( h16 ":" ) h16 ] "::"
	    IPV6ADDRESS$ = subexp([IPV6ADDRESS1$, IPV6ADDRESS2$, IPV6ADDRESS3$, IPV6ADDRESS4$, IPV6ADDRESS5$, IPV6ADDRESS6$, IPV6ADDRESS7$, IPV6ADDRESS8$, IPV6ADDRESS9$].join("|")),
	        ZONEID$ = subexp(subexp(UNRESERVED$$ + "|" + PCT_ENCODED$) + "+");
	        //RFC 6874, with relaxed parsing rules
	    subexp("[vV]" + HEXDIG$$ + "+\\." + merge(UNRESERVED$$, SUB_DELIMS$$, "[\\:]") + "+");
	        //RFC 6874
	    subexp(subexp(PCT_ENCODED$ + "|" + merge(UNRESERVED$$, SUB_DELIMS$$)) + "*");
	        var PCHAR$ = subexp(PCT_ENCODED$ + "|" + merge(UNRESERVED$$, SUB_DELIMS$$, "[\\:\\@]"));
	        subexp(subexp(PCT_ENCODED$ + "|" + merge(UNRESERVED$$, SUB_DELIMS$$, "[\\@]")) + "+");
	        subexp(subexp(PCHAR$ + "|" + merge("[\\/\\?]", IPRIVATE$$)) + "*");
	    return {
	        NOT_SCHEME: new RegExp(merge("[^]", ALPHA$$, DIGIT$$, "[\\+\\-\\.]"), "g"),
	        NOT_USERINFO: new RegExp(merge("[^\\%\\:]", UNRESERVED$$, SUB_DELIMS$$), "g"),
	        NOT_HOST: new RegExp(merge("[^\\%\\[\\]\\:]", UNRESERVED$$, SUB_DELIMS$$), "g"),
	        NOT_PATH: new RegExp(merge("[^\\%\\/\\:\\@]", UNRESERVED$$, SUB_DELIMS$$), "g"),
	        NOT_PATH_NOSCHEME: new RegExp(merge("[^\\%\\/\\@]", UNRESERVED$$, SUB_DELIMS$$), "g"),
	        NOT_QUERY: new RegExp(merge("[^\\%]", UNRESERVED$$, SUB_DELIMS$$, "[\\:\\@\\/\\?]", IPRIVATE$$), "g"),
	        NOT_FRAGMENT: new RegExp(merge("[^\\%]", UNRESERVED$$, SUB_DELIMS$$, "[\\:\\@\\/\\?]"), "g"),
	        ESCAPE: new RegExp(merge("[^]", UNRESERVED$$, SUB_DELIMS$$), "g"),
	        UNRESERVED: new RegExp(UNRESERVED$$, "g"),
	        OTHER_CHARS: new RegExp(merge("[^\\%]", UNRESERVED$$, RESERVED$$), "g"),
	        PCT_ENCODED: new RegExp(PCT_ENCODED$, "g"),
	        IPV4ADDRESS: new RegExp("^(" + IPV4ADDRESS$ + ")$"),
	        IPV6ADDRESS: new RegExp("^\\[?(" + IPV6ADDRESS$ + ")" + subexp(subexp("\\%25|\\%(?!" + HEXDIG$$ + "{2})") + "(" + ZONEID$ + ")") + "?\\]?$") //RFC 6874, with relaxed parsing rules
	    };
	}
	var URI_PROTOCOL = buildExps(false);

	var IRI_PROTOCOL = buildExps(true);

	var slicedToArray = function () {
	  function sliceIterator(arr, i) {
	    var _arr = [];
	    var _n = true;
	    var _d = false;
	    var _e = undefined;

	    try {
	      for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {
	        _arr.push(_s.value);

	        if (i && _arr.length === i) break;
	      }
	    } catch (err) {
	      _d = true;
	      _e = err;
	    } finally {
	      try {
	        if (!_n && _i["return"]) _i["return"]();
	      } finally {
	        if (_d) throw _e;
	      }
	    }

	    return _arr;
	  }

	  return function (arr, i) {
	    if (Array.isArray(arr)) {
	      return arr;
	    } else if (Symbol.iterator in Object(arr)) {
	      return sliceIterator(arr, i);
	    } else {
	      throw new TypeError("Invalid attempt to destructure non-iterable instance");
	    }
	  };
	}();













	var toConsumableArray = function (arr) {
	  if (Array.isArray(arr)) {
	    for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i];

	    return arr2;
	  } else {
	    return Array.from(arr);
	  }
	};

	/** Highest positive signed 32-bit float value */

	var maxInt = 2147483647; // aka. 0x7FFFFFFF or 2^31-1

	/** Bootstring parameters */
	var base = 36;
	var tMin = 1;
	var tMax = 26;
	var skew = 38;
	var damp = 700;
	var initialBias = 72;
	var initialN = 128; // 0x80
	var delimiter = '-'; // '\x2D'

	/** Regular expressions */
	var regexPunycode = /^xn--/;
	var regexNonASCII = /[^\0-\x7E]/; // non-ASCII chars
	var regexSeparators = /[\x2E\u3002\uFF0E\uFF61]/g; // RFC 3490 separators

	/** Error messages */
	var errors = {
		'overflow': 'Overflow: input needs wider integers to process',
		'not-basic': 'Illegal input >= 0x80 (not a basic code point)',
		'invalid-input': 'Invalid input'
	};

	/** Convenience shortcuts */
	var baseMinusTMin = base - tMin;
	var floor = Math.floor;
	var stringFromCharCode = String.fromCharCode;

	/*--------------------------------------------------------------------------*/

	/**
	 * A generic error utility function.
	 * @private
	 * @param {String} type The error type.
	 * @returns {Error} Throws a `RangeError` with the applicable error message.
	 */
	function error$1(type) {
		throw new RangeError(errors[type]);
	}

	/**
	 * A generic `Array#map` utility function.
	 * @private
	 * @param {Array} array The array to iterate over.
	 * @param {Function} callback The function that gets called for every array
	 * item.
	 * @returns {Array} A new array of values returned by the callback function.
	 */
	function map(array, fn) {
		var result = [];
		var length = array.length;
		while (length--) {
			result[length] = fn(array[length]);
		}
		return result;
	}

	/**
	 * A simple `Array#map`-like wrapper to work with domain name strings or email
	 * addresses.
	 * @private
	 * @param {String} domain The domain name or email address.
	 * @param {Function} callback The function that gets called for every
	 * character.
	 * @returns {Array} A new string of characters returned by the callback
	 * function.
	 */
	function mapDomain(string, fn) {
		var parts = string.split('@');
		var result = '';
		if (parts.length > 1) {
			// In email addresses, only the domain name should be punycoded. Leave
			// the local part (i.e. everything up to `@`) intact.
			result = parts[0] + '@';
			string = parts[1];
		}
		// Avoid `split(regex)` for IE8 compatibility. See #17.
		string = string.replace(regexSeparators, '\x2E');
		var labels = string.split('.');
		var encoded = map(labels, fn).join('.');
		return result + encoded;
	}

	/**
	 * Creates an array containing the numeric code points of each Unicode
	 * character in the string. While JavaScript uses UCS-2 internally,
	 * this function will convert a pair of surrogate halves (each of which
	 * UCS-2 exposes as separate characters) into a single code point,
	 * matching UTF-16.
	 * @see `punycode.ucs2.encode`
	 * @see <https://mathiasbynens.be/notes/javascript-encoding>
	 * @memberOf punycode.ucs2
	 * @name decode
	 * @param {String} string The Unicode input string (UCS-2).
	 * @returns {Array} The new array of code points.
	 */
	function ucs2decode(string) {
		var output = [];
		var counter = 0;
		var length = string.length;
		while (counter < length) {
			var value = string.charCodeAt(counter++);
			if (value >= 0xD800 && value <= 0xDBFF && counter < length) {
				// It's a high surrogate, and there is a next character.
				var extra = string.charCodeAt(counter++);
				if ((extra & 0xFC00) == 0xDC00) {
					// Low surrogate.
					output.push(((value & 0x3FF) << 10) + (extra & 0x3FF) + 0x10000);
				} else {
					// It's an unmatched surrogate; only append this code unit, in case the
					// next code unit is the high surrogate of a surrogate pair.
					output.push(value);
					counter--;
				}
			} else {
				output.push(value);
			}
		}
		return output;
	}

	/**
	 * Creates a string based on an array of numeric code points.
	 * @see `punycode.ucs2.decode`
	 * @memberOf punycode.ucs2
	 * @name encode
	 * @param {Array} codePoints The array of numeric code points.
	 * @returns {String} The new Unicode string (UCS-2).
	 */
	var ucs2encode = function ucs2encode(array) {
		return String.fromCodePoint.apply(String, toConsumableArray(array));
	};

	/**
	 * Converts a basic code point into a digit/integer.
	 * @see `digitToBasic()`
	 * @private
	 * @param {Number} codePoint The basic numeric code point value.
	 * @returns {Number} The numeric value of a basic code point (for use in
	 * representing integers) in the range `0` to `base - 1`, or `base` if
	 * the code point does not represent a value.
	 */
	var basicToDigit = function basicToDigit(codePoint) {
		if (codePoint - 0x30 < 0x0A) {
			return codePoint - 0x16;
		}
		if (codePoint - 0x41 < 0x1A) {
			return codePoint - 0x41;
		}
		if (codePoint - 0x61 < 0x1A) {
			return codePoint - 0x61;
		}
		return base;
	};

	/**
	 * Converts a digit/integer into a basic code point.
	 * @see `basicToDigit()`
	 * @private
	 * @param {Number} digit The numeric value of a basic code point.
	 * @returns {Number} The basic code point whose value (when used for
	 * representing integers) is `digit`, which needs to be in the range
	 * `0` to `base - 1`. If `flag` is non-zero, the uppercase form is
	 * used; else, the lowercase form is used. The behavior is undefined
	 * if `flag` is non-zero and `digit` has no uppercase form.
	 */
	var digitToBasic = function digitToBasic(digit, flag) {
		//  0..25 map to ASCII a..z or A..Z
		// 26..35 map to ASCII 0..9
		return digit + 22 + 75 * (digit < 26) - ((flag != 0) << 5);
	};

	/**
	 * Bias adaptation function as per section 3.4 of RFC 3492.
	 * https://tools.ietf.org/html/rfc3492#section-3.4
	 * @private
	 */
	var adapt = function adapt(delta, numPoints, firstTime) {
		var k = 0;
		delta = firstTime ? floor(delta / damp) : delta >> 1;
		delta += floor(delta / numPoints);
		for (; /* no initialization */delta > baseMinusTMin * tMax >> 1; k += base) {
			delta = floor(delta / baseMinusTMin);
		}
		return floor(k + (baseMinusTMin + 1) * delta / (delta + skew));
	};

	/**
	 * Converts a Punycode string of ASCII-only symbols to a string of Unicode
	 * symbols.
	 * @memberOf punycode
	 * @param {String} input The Punycode string of ASCII-only symbols.
	 * @returns {String} The resulting string of Unicode symbols.
	 */
	var decode = function decode(input) {
		// Don't use UCS-2.
		var output = [];
		var inputLength = input.length;
		var i = 0;
		var n = initialN;
		var bias = initialBias;

		// Handle the basic code points: let `basic` be the number of input code
		// points before the last delimiter, or `0` if there is none, then copy
		// the first basic code points to the output.

		var basic = input.lastIndexOf(delimiter);
		if (basic < 0) {
			basic = 0;
		}

		for (var j = 0; j < basic; ++j) {
			// if it's not a basic code point
			if (input.charCodeAt(j) >= 0x80) {
				error$1('not-basic');
			}
			output.push(input.charCodeAt(j));
		}

		// Main decoding loop: start just after the last delimiter if any basic code
		// points were copied; start at the beginning otherwise.

		for (var index = basic > 0 ? basic + 1 : 0; index < inputLength;) /* no final expression */{

			// `index` is the index of the next character to be consumed.
			// Decode a generalized variable-length integer into `delta`,
			// which gets added to `i`. The overflow checking is easier
			// if we increase `i` as we go, then subtract off its starting
			// value at the end to obtain `delta`.
			var oldi = i;
			for (var w = 1, k = base;; /* no condition */k += base) {

				if (index >= inputLength) {
					error$1('invalid-input');
				}

				var digit = basicToDigit(input.charCodeAt(index++));

				if (digit >= base || digit > floor((maxInt - i) / w)) {
					error$1('overflow');
				}

				i += digit * w;
				var t = k <= bias ? tMin : k >= bias + tMax ? tMax : k - bias;

				if (digit < t) {
					break;
				}

				var baseMinusT = base - t;
				if (w > floor(maxInt / baseMinusT)) {
					error$1('overflow');
				}

				w *= baseMinusT;
			}

			var out = output.length + 1;
			bias = adapt(i - oldi, out, oldi == 0);

			// `i` was supposed to wrap around from `out` to `0`,
			// incrementing `n` each time, so we'll fix that now:
			if (floor(i / out) > maxInt - n) {
				error$1('overflow');
			}

			n += floor(i / out);
			i %= out;

			// Insert `n` at position `i` of the output.
			output.splice(i++, 0, n);
		}

		return String.fromCodePoint.apply(String, output);
	};

	/**
	 * Converts a string of Unicode symbols (e.g. a domain name label) to a
	 * Punycode string of ASCII-only symbols.
	 * @memberOf punycode
	 * @param {String} input The string of Unicode symbols.
	 * @returns {String} The resulting Punycode string of ASCII-only symbols.
	 */
	var encode = function encode(input) {
		var output = [];

		// Convert the input in UCS-2 to an array of Unicode code points.
		input = ucs2decode(input);

		// Cache the length.
		var inputLength = input.length;

		// Initialize the state.
		var n = initialN;
		var delta = 0;
		var bias = initialBias;

		// Handle the basic code points.
		var _iteratorNormalCompletion = true;
		var _didIteratorError = false;
		var _iteratorError = undefined;

		try {
			for (var _iterator = input[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
				var _currentValue2 = _step.value;

				if (_currentValue2 < 0x80) {
					output.push(stringFromCharCode(_currentValue2));
				}
			}
		} catch (err) {
			_didIteratorError = true;
			_iteratorError = err;
		} finally {
			try {
				if (!_iteratorNormalCompletion && _iterator.return) {
					_iterator.return();
				}
			} finally {
				if (_didIteratorError) {
					throw _iteratorError;
				}
			}
		}

		var basicLength = output.length;
		var handledCPCount = basicLength;

		// `handledCPCount` is the number of code points that have been handled;
		// `basicLength` is the number of basic code points.

		// Finish the basic string with a delimiter unless it's empty.
		if (basicLength) {
			output.push(delimiter);
		}

		// Main encoding loop:
		while (handledCPCount < inputLength) {

			// All non-basic code points < n have been handled already. Find the next
			// larger one:
			var m = maxInt;
			var _iteratorNormalCompletion2 = true;
			var _didIteratorError2 = false;
			var _iteratorError2 = undefined;

			try {
				for (var _iterator2 = input[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
					var currentValue = _step2.value;

					if (currentValue >= n && currentValue < m) {
						m = currentValue;
					}
				}

				// Increase `delta` enough to advance the decoder's <n,i> state to <m,0>,
				// but guard against overflow.
			} catch (err) {
				_didIteratorError2 = true;
				_iteratorError2 = err;
			} finally {
				try {
					if (!_iteratorNormalCompletion2 && _iterator2.return) {
						_iterator2.return();
					}
				} finally {
					if (_didIteratorError2) {
						throw _iteratorError2;
					}
				}
			}

			var handledCPCountPlusOne = handledCPCount + 1;
			if (m - n > floor((maxInt - delta) / handledCPCountPlusOne)) {
				error$1('overflow');
			}

			delta += (m - n) * handledCPCountPlusOne;
			n = m;

			var _iteratorNormalCompletion3 = true;
			var _didIteratorError3 = false;
			var _iteratorError3 = undefined;

			try {
				for (var _iterator3 = input[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
					var _currentValue = _step3.value;

					if (_currentValue < n && ++delta > maxInt) {
						error$1('overflow');
					}
					if (_currentValue == n) {
						// Represent delta as a generalized variable-length integer.
						var q = delta;
						for (var k = base;; /* no condition */k += base) {
							var t = k <= bias ? tMin : k >= bias + tMax ? tMax : k - bias;
							if (q < t) {
								break;
							}
							var qMinusT = q - t;
							var baseMinusT = base - t;
							output.push(stringFromCharCode(digitToBasic(t + qMinusT % baseMinusT, 0)));
							q = floor(qMinusT / baseMinusT);
						}

						output.push(stringFromCharCode(digitToBasic(q, 0)));
						bias = adapt(delta, handledCPCountPlusOne, handledCPCount == basicLength);
						delta = 0;
						++handledCPCount;
					}
				}
			} catch (err) {
				_didIteratorError3 = true;
				_iteratorError3 = err;
			} finally {
				try {
					if (!_iteratorNormalCompletion3 && _iterator3.return) {
						_iterator3.return();
					}
				} finally {
					if (_didIteratorError3) {
						throw _iteratorError3;
					}
				}
			}

			++delta;
			++n;
		}
		return output.join('');
	};

	/**
	 * Converts a Punycode string representing a domain name or an email address
	 * to Unicode. Only the Punycoded parts of the input will be converted, i.e.
	 * it doesn't matter if you call it on a string that has already been
	 * converted to Unicode.
	 * @memberOf punycode
	 * @param {String} input The Punycoded domain name or email address to
	 * convert to Unicode.
	 * @returns {String} The Unicode representation of the given Punycode
	 * string.
	 */
	var toUnicode = function toUnicode(input) {
		return mapDomain(input, function (string) {
			return regexPunycode.test(string) ? decode(string.slice(4).toLowerCase()) : string;
		});
	};

	/**
	 * Converts a Unicode string representing a domain name or an email address to
	 * Punycode. Only the non-ASCII parts of the domain name will be converted,
	 * i.e. it doesn't matter if you call it with a domain that's already in
	 * ASCII.
	 * @memberOf punycode
	 * @param {String} input The domain name or email address to convert, as a
	 * Unicode string.
	 * @returns {String} The Punycode representation of the given domain name or
	 * email address.
	 */
	var toASCII = function toASCII(input) {
		return mapDomain(input, function (string) {
			return regexNonASCII.test(string) ? 'xn--' + encode(string) : string;
		});
	};

	/*--------------------------------------------------------------------------*/

	/** Define the public API */
	var punycode = {
		/**
	  * A string representing the current Punycode.js version number.
	  * @memberOf punycode
	  * @type String
	  */
		'version': '2.1.0',
		/**
	  * An object of methods to convert from JavaScript's internal character
	  * representation (UCS-2) to Unicode code points, and back.
	  * @see <https://mathiasbynens.be/notes/javascript-encoding>
	  * @memberOf punycode
	  * @type Object
	  */
		'ucs2': {
			'decode': ucs2decode,
			'encode': ucs2encode
		},
		'decode': decode,
		'encode': encode,
		'toASCII': toASCII,
		'toUnicode': toUnicode
	};

	/**
	 * URI.js
	 *
	 * @fileoverview An RFC 3986 compliant, scheme extendable URI parsing/validating/resolving library for JavaScript.
	 * @author <a href="mailto:gary.court@gmail.com">Gary Court</a>
	 * @see http://github.com/garycourt/uri-js
	 */
	/**
	 * Copyright 2011 Gary Court. All rights reserved.
	 *
	 * Redistribution and use in source and binary forms, with or without modification, are
	 * permitted provided that the following conditions are met:
	 *
	 *    1. Redistributions of source code must retain the above copyright notice, this list of
	 *       conditions and the following disclaimer.
	 *
	 *    2. Redistributions in binary form must reproduce the above copyright notice, this list
	 *       of conditions and the following disclaimer in the documentation and/or other materials
	 *       provided with the distribution.
	 *
	 * THIS SOFTWARE IS PROVIDED BY GARY COURT ``AS IS'' AND ANY EXPRESS OR IMPLIED
	 * WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND
	 * FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL GARY COURT OR
	 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
	 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
	 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
	 * ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
	 * NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF
	 * ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
	 *
	 * The views and conclusions contained in the software and documentation are those of the
	 * authors and should not be interpreted as representing official policies, either expressed
	 * or implied, of Gary Court.
	 */
	var SCHEMES = {};
	function pctEncChar(chr) {
	    var c = chr.charCodeAt(0);
	    var e = void 0;
	    if (c < 16) e = "%0" + c.toString(16).toUpperCase();else if (c < 128) e = "%" + c.toString(16).toUpperCase();else if (c < 2048) e = "%" + (c >> 6 | 192).toString(16).toUpperCase() + "%" + (c & 63 | 128).toString(16).toUpperCase();else e = "%" + (c >> 12 | 224).toString(16).toUpperCase() + "%" + (c >> 6 & 63 | 128).toString(16).toUpperCase() + "%" + (c & 63 | 128).toString(16).toUpperCase();
	    return e;
	}
	function pctDecChars(str) {
	    var newStr = "";
	    var i = 0;
	    var il = str.length;
	    while (i < il) {
	        var c = parseInt(str.substr(i + 1, 2), 16);
	        if (c < 128) {
	            newStr += String.fromCharCode(c);
	            i += 3;
	        } else if (c >= 194 && c < 224) {
	            if (il - i >= 6) {
	                var c2 = parseInt(str.substr(i + 4, 2), 16);
	                newStr += String.fromCharCode((c & 31) << 6 | c2 & 63);
	            } else {
	                newStr += str.substr(i, 6);
	            }
	            i += 6;
	        } else if (c >= 224) {
	            if (il - i >= 9) {
	                var _c = parseInt(str.substr(i + 4, 2), 16);
	                var c3 = parseInt(str.substr(i + 7, 2), 16);
	                newStr += String.fromCharCode((c & 15) << 12 | (_c & 63) << 6 | c3 & 63);
	            } else {
	                newStr += str.substr(i, 9);
	            }
	            i += 9;
	        } else {
	            newStr += str.substr(i, 3);
	            i += 3;
	        }
	    }
	    return newStr;
	}
	function _normalizeComponentEncoding(components, protocol) {
	    function decodeUnreserved(str) {
	        var decStr = pctDecChars(str);
	        return !decStr.match(protocol.UNRESERVED) ? str : decStr;
	    }
	    if (components.scheme) components.scheme = String(components.scheme).replace(protocol.PCT_ENCODED, decodeUnreserved).toLowerCase().replace(protocol.NOT_SCHEME, "");
	    if (components.userinfo !== undefined) components.userinfo = String(components.userinfo).replace(protocol.PCT_ENCODED, decodeUnreserved).replace(protocol.NOT_USERINFO, pctEncChar).replace(protocol.PCT_ENCODED, toUpperCase);
	    if (components.host !== undefined) components.host = String(components.host).replace(protocol.PCT_ENCODED, decodeUnreserved).toLowerCase().replace(protocol.NOT_HOST, pctEncChar).replace(protocol.PCT_ENCODED, toUpperCase);
	    if (components.path !== undefined) components.path = String(components.path).replace(protocol.PCT_ENCODED, decodeUnreserved).replace(components.scheme ? protocol.NOT_PATH : protocol.NOT_PATH_NOSCHEME, pctEncChar).replace(protocol.PCT_ENCODED, toUpperCase);
	    if (components.query !== undefined) components.query = String(components.query).replace(protocol.PCT_ENCODED, decodeUnreserved).replace(protocol.NOT_QUERY, pctEncChar).replace(protocol.PCT_ENCODED, toUpperCase);
	    if (components.fragment !== undefined) components.fragment = String(components.fragment).replace(protocol.PCT_ENCODED, decodeUnreserved).replace(protocol.NOT_FRAGMENT, pctEncChar).replace(protocol.PCT_ENCODED, toUpperCase);
	    return components;
	}

	function _stripLeadingZeros(str) {
	    return str.replace(/^0*(.*)/, "$1") || "0";
	}
	function _normalizeIPv4(host, protocol) {
	    var matches = host.match(protocol.IPV4ADDRESS) || [];

	    var _matches = slicedToArray(matches, 2),
	        address = _matches[1];

	    if (address) {
	        return address.split(".").map(_stripLeadingZeros).join(".");
	    } else {
	        return host;
	    }
	}
	function _normalizeIPv6(host, protocol) {
	    var matches = host.match(protocol.IPV6ADDRESS) || [];

	    var _matches2 = slicedToArray(matches, 3),
	        address = _matches2[1],
	        zone = _matches2[2];

	    if (address) {
	        var _address$toLowerCase$ = address.toLowerCase().split('::').reverse(),
	            _address$toLowerCase$2 = slicedToArray(_address$toLowerCase$, 2),
	            last = _address$toLowerCase$2[0],
	            first = _address$toLowerCase$2[1];

	        var firstFields = first ? first.split(":").map(_stripLeadingZeros) : [];
	        var lastFields = last.split(":").map(_stripLeadingZeros);
	        var isLastFieldIPv4Address = protocol.IPV4ADDRESS.test(lastFields[lastFields.length - 1]);
	        var fieldCount = isLastFieldIPv4Address ? 7 : 8;
	        var lastFieldsStart = lastFields.length - fieldCount;
	        var fields = Array(fieldCount);
	        for (var x = 0; x < fieldCount; ++x) {
	            fields[x] = firstFields[x] || lastFields[lastFieldsStart + x] || '';
	        }
	        if (isLastFieldIPv4Address) {
	            fields[fieldCount - 1] = _normalizeIPv4(fields[fieldCount - 1], protocol);
	        }
	        var allZeroFields = fields.reduce(function (acc, field, index) {
	            if (!field || field === "0") {
	                var lastLongest = acc[acc.length - 1];
	                if (lastLongest && lastLongest.index + lastLongest.length === index) {
	                    lastLongest.length++;
	                } else {
	                    acc.push({ index: index, length: 1 });
	                }
	            }
	            return acc;
	        }, []);
	        var longestZeroFields = allZeroFields.sort(function (a, b) {
	            return b.length - a.length;
	        })[0];
	        var newHost = void 0;
	        if (longestZeroFields && longestZeroFields.length > 1) {
	            var newFirst = fields.slice(0, longestZeroFields.index);
	            var newLast = fields.slice(longestZeroFields.index + longestZeroFields.length);
	            newHost = newFirst.join(":") + "::" + newLast.join(":");
	        } else {
	            newHost = fields.join(":");
	        }
	        if (zone) {
	            newHost += "%" + zone;
	        }
	        return newHost;
	    } else {
	        return host;
	    }
	}
	var URI_PARSE = /^(?:([^:\/?#]+):)?(?:\/\/((?:([^\/?#@]*)@)?(\[[^\/?#\]]+\]|[^\/?#:]*)(?:\:(\d*))?))?([^?#]*)(?:\?([^#]*))?(?:#((?:.|\n|\r)*))?/i;
	var NO_MATCH_IS_UNDEFINED = "".match(/(){0}/)[1] === undefined;
	function parse(uriString) {
	    var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

	    var components = {};
	    var protocol = options.iri !== false ? IRI_PROTOCOL : URI_PROTOCOL;
	    if (options.reference === "suffix") uriString = (options.scheme ? options.scheme + ":" : "") + "//" + uriString;
	    var matches = uriString.match(URI_PARSE);
	    if (matches) {
	        if (NO_MATCH_IS_UNDEFINED) {
	            //store each component
	            components.scheme = matches[1];
	            components.userinfo = matches[3];
	            components.host = matches[4];
	            components.port = parseInt(matches[5], 10);
	            components.path = matches[6] || "";
	            components.query = matches[7];
	            components.fragment = matches[8];
	            //fix port number
	            if (isNaN(components.port)) {
	                components.port = matches[5];
	            }
	        } else {
	            //IE FIX for improper RegExp matching
	            //store each component
	            components.scheme = matches[1] || undefined;
	            components.userinfo = uriString.indexOf("@") !== -1 ? matches[3] : undefined;
	            components.host = uriString.indexOf("//") !== -1 ? matches[4] : undefined;
	            components.port = parseInt(matches[5], 10);
	            components.path = matches[6] || "";
	            components.query = uriString.indexOf("?") !== -1 ? matches[7] : undefined;
	            components.fragment = uriString.indexOf("#") !== -1 ? matches[8] : undefined;
	            //fix port number
	            if (isNaN(components.port)) {
	                components.port = uriString.match(/\/\/(?:.|\n)*\:(?:\/|\?|\#|$)/) ? matches[4] : undefined;
	            }
	        }
	        if (components.host) {
	            //normalize IP hosts
	            components.host = _normalizeIPv6(_normalizeIPv4(components.host, protocol), protocol);
	        }
	        //determine reference type
	        if (components.scheme === undefined && components.userinfo === undefined && components.host === undefined && components.port === undefined && !components.path && components.query === undefined) {
	            components.reference = "same-document";
	        } else if (components.scheme === undefined) {
	            components.reference = "relative";
	        } else if (components.fragment === undefined) {
	            components.reference = "absolute";
	        } else {
	            components.reference = "uri";
	        }
	        //check for reference errors
	        if (options.reference && options.reference !== "suffix" && options.reference !== components.reference) {
	            components.error = components.error || "URI is not a " + options.reference + " reference.";
	        }
	        //find scheme handler
	        var schemeHandler = SCHEMES[(options.scheme || components.scheme || "").toLowerCase()];
	        //check if scheme can't handle IRIs
	        if (!options.unicodeSupport && (!schemeHandler || !schemeHandler.unicodeSupport)) {
	            //if host component is a domain name
	            if (components.host && (options.domainHost || schemeHandler && schemeHandler.domainHost)) {
	                //convert Unicode IDN -> ASCII IDN
	                try {
	                    components.host = punycode.toASCII(components.host.replace(protocol.PCT_ENCODED, pctDecChars).toLowerCase());
	                } catch (e) {
	                    components.error = components.error || "Host's domain name can not be converted to ASCII via punycode: " + e;
	                }
	            }
	            //convert IRI -> URI
	            _normalizeComponentEncoding(components, URI_PROTOCOL);
	        } else {
	            //normalize encodings
	            _normalizeComponentEncoding(components, protocol);
	        }
	        //perform scheme specific parsing
	        if (schemeHandler && schemeHandler.parse) {
	            schemeHandler.parse(components, options);
	        }
	    } else {
	        components.error = components.error || "URI can not be parsed.";
	    }
	    return components;
	}

	function _recomposeAuthority(components, options) {
	    var protocol = options.iri !== false ? IRI_PROTOCOL : URI_PROTOCOL;
	    var uriTokens = [];
	    if (components.userinfo !== undefined) {
	        uriTokens.push(components.userinfo);
	        uriTokens.push("@");
	    }
	    if (components.host !== undefined) {
	        //normalize IP hosts, add brackets and escape zone separator for IPv6
	        uriTokens.push(_normalizeIPv6(_normalizeIPv4(String(components.host), protocol), protocol).replace(protocol.IPV6ADDRESS, function (_, $1, $2) {
	            return "[" + $1 + ($2 ? "%25" + $2 : "") + "]";
	        }));
	    }
	    if (typeof components.port === "number" || typeof components.port === "string") {
	        uriTokens.push(":");
	        uriTokens.push(String(components.port));
	    }
	    return uriTokens.length ? uriTokens.join("") : undefined;
	}

	var RDS1 = /^\.\.?\//;
	var RDS2 = /^\/\.(\/|$)/;
	var RDS3 = /^\/\.\.(\/|$)/;
	var RDS5 = /^\/?(?:.|\n)*?(?=\/|$)/;
	function removeDotSegments(input) {
	    var output = [];
	    while (input.length) {
	        if (input.match(RDS1)) {
	            input = input.replace(RDS1, "");
	        } else if (input.match(RDS2)) {
	            input = input.replace(RDS2, "/");
	        } else if (input.match(RDS3)) {
	            input = input.replace(RDS3, "/");
	            output.pop();
	        } else if (input === "." || input === "..") {
	            input = "";
	        } else {
	            var im = input.match(RDS5);
	            if (im) {
	                var s = im[0];
	                input = input.slice(s.length);
	                output.push(s);
	            } else {
	                throw new Error("Unexpected dot segment condition");
	            }
	        }
	    }
	    return output.join("");
	}

	function serialize(components) {
	    var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

	    var protocol = options.iri ? IRI_PROTOCOL : URI_PROTOCOL;
	    var uriTokens = [];
	    //find scheme handler
	    var schemeHandler = SCHEMES[(options.scheme || components.scheme || "").toLowerCase()];
	    //perform scheme specific serialization
	    if (schemeHandler && schemeHandler.serialize) schemeHandler.serialize(components, options);
	    if (components.host) {
	        //if host component is an IPv6 address
	        if (protocol.IPV6ADDRESS.test(components.host)) ;
	        //TODO: normalize IPv6 address as per RFC 5952

	        //if host component is a domain name
	        else if (options.domainHost || schemeHandler && schemeHandler.domainHost) {
	                //convert IDN via punycode
	                try {
	                    components.host = !options.iri ? punycode.toASCII(components.host.replace(protocol.PCT_ENCODED, pctDecChars).toLowerCase()) : punycode.toUnicode(components.host);
	                } catch (e) {
	                    components.error = components.error || "Host's domain name can not be converted to " + (!options.iri ? "ASCII" : "Unicode") + " via punycode: " + e;
	                }
	            }
	    }
	    //normalize encoding
	    _normalizeComponentEncoding(components, protocol);
	    if (options.reference !== "suffix" && components.scheme) {
	        uriTokens.push(components.scheme);
	        uriTokens.push(":");
	    }
	    var authority = _recomposeAuthority(components, options);
	    if (authority !== undefined) {
	        if (options.reference !== "suffix") {
	            uriTokens.push("//");
	        }
	        uriTokens.push(authority);
	        if (components.path && components.path.charAt(0) !== "/") {
	            uriTokens.push("/");
	        }
	    }
	    if (components.path !== undefined) {
	        var s = components.path;
	        if (!options.absolutePath && (!schemeHandler || !schemeHandler.absolutePath)) {
	            s = removeDotSegments(s);
	        }
	        if (authority === undefined) {
	            s = s.replace(/^\/\//, "/%2F"); //don't allow the path to start with "//"
	        }
	        uriTokens.push(s);
	    }
	    if (components.query !== undefined) {
	        uriTokens.push("?");
	        uriTokens.push(components.query);
	    }
	    if (components.fragment !== undefined) {
	        uriTokens.push("#");
	        uriTokens.push(components.fragment);
	    }
	    return uriTokens.join(""); //merge tokens into a string
	}

	function resolveComponents(base, relative) {
	    var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
	    var skipNormalization = arguments[3];

	    var target = {};
	    if (!skipNormalization) {
	        base = parse(serialize(base, options), options); //normalize base components
	        relative = parse(serialize(relative, options), options); //normalize relative components
	    }
	    options = options || {};
	    if (!options.tolerant && relative.scheme) {
	        target.scheme = relative.scheme;
	        //target.authority = relative.authority;
	        target.userinfo = relative.userinfo;
	        target.host = relative.host;
	        target.port = relative.port;
	        target.path = removeDotSegments(relative.path || "");
	        target.query = relative.query;
	    } else {
	        if (relative.userinfo !== undefined || relative.host !== undefined || relative.port !== undefined) {
	            //target.authority = relative.authority;
	            target.userinfo = relative.userinfo;
	            target.host = relative.host;
	            target.port = relative.port;
	            target.path = removeDotSegments(relative.path || "");
	            target.query = relative.query;
	        } else {
	            if (!relative.path) {
	                target.path = base.path;
	                if (relative.query !== undefined) {
	                    target.query = relative.query;
	                } else {
	                    target.query = base.query;
	                }
	            } else {
	                if (relative.path.charAt(0) === "/") {
	                    target.path = removeDotSegments(relative.path);
	                } else {
	                    if ((base.userinfo !== undefined || base.host !== undefined || base.port !== undefined) && !base.path) {
	                        target.path = "/" + relative.path;
	                    } else if (!base.path) {
	                        target.path = relative.path;
	                    } else {
	                        target.path = base.path.slice(0, base.path.lastIndexOf("/") + 1) + relative.path;
	                    }
	                    target.path = removeDotSegments(target.path);
	                }
	                target.query = relative.query;
	            }
	            //target.authority = base.authority;
	            target.userinfo = base.userinfo;
	            target.host = base.host;
	            target.port = base.port;
	        }
	        target.scheme = base.scheme;
	    }
	    target.fragment = relative.fragment;
	    return target;
	}

	function resolve(baseURI, relativeURI, options) {
	    var schemelessOptions = assign({ scheme: 'null' }, options);
	    return serialize(resolveComponents(parse(baseURI, schemelessOptions), parse(relativeURI, schemelessOptions), schemelessOptions, true), schemelessOptions);
	}

	function normalize(uri, options) {
	    if (typeof uri === "string") {
	        uri = serialize(parse(uri, options), options);
	    } else if (typeOf(uri) === "object") {
	        uri = parse(serialize(uri, options), options);
	    }
	    return uri;
	}

	function equal(uriA, uriB, options) {
	    if (typeof uriA === "string") {
	        uriA = serialize(parse(uriA, options), options);
	    } else if (typeOf(uriA) === "object") {
	        uriA = serialize(uriA, options);
	    }
	    if (typeof uriB === "string") {
	        uriB = serialize(parse(uriB, options), options);
	    } else if (typeOf(uriB) === "object") {
	        uriB = serialize(uriB, options);
	    }
	    return uriA === uriB;
	}

	function escapeComponent(str, options) {
	    return str && str.toString().replace(!options || !options.iri ? URI_PROTOCOL.ESCAPE : IRI_PROTOCOL.ESCAPE, pctEncChar);
	}

	function unescapeComponent(str, options) {
	    return str && str.toString().replace(!options || !options.iri ? URI_PROTOCOL.PCT_ENCODED : IRI_PROTOCOL.PCT_ENCODED, pctDecChars);
	}

	var handler = {
	    scheme: "http",
	    domainHost: true,
	    parse: function parse(components, options) {
	        //report missing host
	        if (!components.host) {
	            components.error = components.error || "HTTP URIs must have a host.";
	        }
	        return components;
	    },
	    serialize: function serialize(components, options) {
	        var secure = String(components.scheme).toLowerCase() === "https";
	        //normalize the default port
	        if (components.port === (secure ? 443 : 80) || components.port === "") {
	            components.port = undefined;
	        }
	        //normalize the empty path
	        if (!components.path) {
	            components.path = "/";
	        }
	        //NOTE: We do not parse query strings for HTTP URIs
	        //as WWW Form Url Encoded query strings are part of the HTML4+ spec,
	        //and not the HTTP spec.
	        return components;
	    }
	};

	var handler$1 = {
	    scheme: "https",
	    domainHost: handler.domainHost,
	    parse: handler.parse,
	    serialize: handler.serialize
	};

	function isSecure(wsComponents) {
	    return typeof wsComponents.secure === 'boolean' ? wsComponents.secure : String(wsComponents.scheme).toLowerCase() === "wss";
	}
	//RFC 6455
	var handler$2 = {
	    scheme: "ws",
	    domainHost: true,
	    parse: function parse(components, options) {
	        var wsComponents = components;
	        //indicate if the secure flag is set
	        wsComponents.secure = isSecure(wsComponents);
	        //construct resouce name
	        wsComponents.resourceName = (wsComponents.path || '/') + (wsComponents.query ? '?' + wsComponents.query : '');
	        wsComponents.path = undefined;
	        wsComponents.query = undefined;
	        return wsComponents;
	    },
	    serialize: function serialize(wsComponents, options) {
	        //normalize the default port
	        if (wsComponents.port === (isSecure(wsComponents) ? 443 : 80) || wsComponents.port === "") {
	            wsComponents.port = undefined;
	        }
	        //ensure scheme matches secure flag
	        if (typeof wsComponents.secure === 'boolean') {
	            wsComponents.scheme = wsComponents.secure ? 'wss' : 'ws';
	            wsComponents.secure = undefined;
	        }
	        //reconstruct path from resource name
	        if (wsComponents.resourceName) {
	            var _wsComponents$resourc = wsComponents.resourceName.split('?'),
	                _wsComponents$resourc2 = slicedToArray(_wsComponents$resourc, 2),
	                path = _wsComponents$resourc2[0],
	                query = _wsComponents$resourc2[1];

	            wsComponents.path = path && path !== '/' ? path : undefined;
	            wsComponents.query = query;
	            wsComponents.resourceName = undefined;
	        }
	        //forbid fragment component
	        wsComponents.fragment = undefined;
	        return wsComponents;
	    }
	};

	var handler$3 = {
	    scheme: "wss",
	    domainHost: handler$2.domainHost,
	    parse: handler$2.parse,
	    serialize: handler$2.serialize
	};

	var O = {};
	//RFC 3986
	var UNRESERVED$$ = "[A-Za-z0-9\\-\\.\\_\\~" + ("\\xA0-\\u200D\\u2010-\\u2029\\u202F-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFEF" ) + "]";
	var HEXDIG$$ = "[0-9A-Fa-f]"; //case-insensitive
	var PCT_ENCODED$ = subexp(subexp("%[EFef]" + HEXDIG$$ + "%" + HEXDIG$$ + HEXDIG$$ + "%" + HEXDIG$$ + HEXDIG$$) + "|" + subexp("%[89A-Fa-f]" + HEXDIG$$ + "%" + HEXDIG$$ + HEXDIG$$) + "|" + subexp("%" + HEXDIG$$ + HEXDIG$$)); //expanded
	//RFC 5322, except these symbols as per RFC 6068: @ : / ? # [ ] & ; =
	//const ATEXT$$ = "[A-Za-z0-9\\!\\#\\$\\%\\&\\'\\*\\+\\-\\/\\=\\?\\^\\_\\`\\{\\|\\}\\~]";
	//const WSP$$ = "[\\x20\\x09]";
	//const OBS_QTEXT$$ = "[\\x01-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F]";  //(%d1-8 / %d11-12 / %d14-31 / %d127)
	//const QTEXT$$ = merge("[\\x21\\x23-\\x5B\\x5D-\\x7E]", OBS_QTEXT$$);  //%d33 / %d35-91 / %d93-126 / obs-qtext
	//const VCHAR$$ = "[\\x21-\\x7E]";
	//const WSP$$ = "[\\x20\\x09]";
	//const OBS_QP$ = subexp("\\\\" + merge("[\\x00\\x0D\\x0A]", OBS_QTEXT$$));  //%d0 / CR / LF / obs-qtext
	//const FWS$ = subexp(subexp(WSP$$ + "*" + "\\x0D\\x0A") + "?" + WSP$$ + "+");
	//const QUOTED_PAIR$ = subexp(subexp("\\\\" + subexp(VCHAR$$ + "|" + WSP$$)) + "|" + OBS_QP$);
	//const QUOTED_STRING$ = subexp('\\"' + subexp(FWS$ + "?" + QCONTENT$) + "*" + FWS$ + "?" + '\\"');
	var ATEXT$$ = "[A-Za-z0-9\\!\\$\\%\\'\\*\\+\\-\\^\\_\\`\\{\\|\\}\\~]";
	var QTEXT$$ = "[\\!\\$\\%\\'\\(\\)\\*\\+\\,\\-\\.0-9\\<\\>A-Z\\x5E-\\x7E]";
	var VCHAR$$ = merge(QTEXT$$, "[\\\"\\\\]");
	var SOME_DELIMS$$ = "[\\!\\$\\'\\(\\)\\*\\+\\,\\;\\:\\@]";
	var UNRESERVED = new RegExp(UNRESERVED$$, "g");
	var PCT_ENCODED = new RegExp(PCT_ENCODED$, "g");
	var NOT_LOCAL_PART = new RegExp(merge("[^]", ATEXT$$, "[\\.]", '[\\"]', VCHAR$$), "g");
	var NOT_HFNAME = new RegExp(merge("[^]", UNRESERVED$$, SOME_DELIMS$$), "g");
	var NOT_HFVALUE = NOT_HFNAME;
	function decodeUnreserved(str) {
	    var decStr = pctDecChars(str);
	    return !decStr.match(UNRESERVED) ? str : decStr;
	}
	var handler$4 = {
	    scheme: "mailto",
	    parse: function parse$$1(components, options) {
	        var mailtoComponents = components;
	        var to = mailtoComponents.to = mailtoComponents.path ? mailtoComponents.path.split(",") : [];
	        mailtoComponents.path = undefined;
	        if (mailtoComponents.query) {
	            var unknownHeaders = false;
	            var headers = {};
	            var hfields = mailtoComponents.query.split("&");
	            for (var x = 0, xl = hfields.length; x < xl; ++x) {
	                var hfield = hfields[x].split("=");
	                switch (hfield[0]) {
	                    case "to":
	                        var toAddrs = hfield[1].split(",");
	                        for (var _x = 0, _xl = toAddrs.length; _x < _xl; ++_x) {
	                            to.push(toAddrs[_x]);
	                        }
	                        break;
	                    case "subject":
	                        mailtoComponents.subject = unescapeComponent(hfield[1], options);
	                        break;
	                    case "body":
	                        mailtoComponents.body = unescapeComponent(hfield[1], options);
	                        break;
	                    default:
	                        unknownHeaders = true;
	                        headers[unescapeComponent(hfield[0], options)] = unescapeComponent(hfield[1], options);
	                        break;
	                }
	            }
	            if (unknownHeaders) mailtoComponents.headers = headers;
	        }
	        mailtoComponents.query = undefined;
	        for (var _x2 = 0, _xl2 = to.length; _x2 < _xl2; ++_x2) {
	            var addr = to[_x2].split("@");
	            addr[0] = unescapeComponent(addr[0]);
	            if (!options.unicodeSupport) {
	                //convert Unicode IDN -> ASCII IDN
	                try {
	                    addr[1] = punycode.toASCII(unescapeComponent(addr[1], options).toLowerCase());
	                } catch (e) {
	                    mailtoComponents.error = mailtoComponents.error || "Email address's domain name can not be converted to ASCII via punycode: " + e;
	                }
	            } else {
	                addr[1] = unescapeComponent(addr[1], options).toLowerCase();
	            }
	            to[_x2] = addr.join("@");
	        }
	        return mailtoComponents;
	    },
	    serialize: function serialize$$1(mailtoComponents, options) {
	        var components = mailtoComponents;
	        var to = toArray(mailtoComponents.to);
	        if (to) {
	            for (var x = 0, xl = to.length; x < xl; ++x) {
	                var toAddr = String(to[x]);
	                var atIdx = toAddr.lastIndexOf("@");
	                var localPart = toAddr.slice(0, atIdx).replace(PCT_ENCODED, decodeUnreserved).replace(PCT_ENCODED, toUpperCase).replace(NOT_LOCAL_PART, pctEncChar);
	                var domain = toAddr.slice(atIdx + 1);
	                //convert IDN via punycode
	                try {
	                    domain = !options.iri ? punycode.toASCII(unescapeComponent(domain, options).toLowerCase()) : punycode.toUnicode(domain);
	                } catch (e) {
	                    components.error = components.error || "Email address's domain name can not be converted to " + (!options.iri ? "ASCII" : "Unicode") + " via punycode: " + e;
	                }
	                to[x] = localPart + "@" + domain;
	            }
	            components.path = to.join(",");
	        }
	        var headers = mailtoComponents.headers = mailtoComponents.headers || {};
	        if (mailtoComponents.subject) headers["subject"] = mailtoComponents.subject;
	        if (mailtoComponents.body) headers["body"] = mailtoComponents.body;
	        var fields = [];
	        for (var name in headers) {
	            if (headers[name] !== O[name]) {
	                fields.push(name.replace(PCT_ENCODED, decodeUnreserved).replace(PCT_ENCODED, toUpperCase).replace(NOT_HFNAME, pctEncChar) + "=" + headers[name].replace(PCT_ENCODED, decodeUnreserved).replace(PCT_ENCODED, toUpperCase).replace(NOT_HFVALUE, pctEncChar));
	            }
	        }
	        if (fields.length) {
	            components.query = fields.join("&");
	        }
	        return components;
	    }
	};

	var URN_PARSE = /^([^\:]+)\:(.*)/;
	//RFC 2141
	var handler$5 = {
	    scheme: "urn",
	    parse: function parse$$1(components, options) {
	        var matches = components.path && components.path.match(URN_PARSE);
	        var urnComponents = components;
	        if (matches) {
	            var scheme = options.scheme || urnComponents.scheme || "urn";
	            var nid = matches[1].toLowerCase();
	            var nss = matches[2];
	            var urnScheme = scheme + ":" + (options.nid || nid);
	            var schemeHandler = SCHEMES[urnScheme];
	            urnComponents.nid = nid;
	            urnComponents.nss = nss;
	            urnComponents.path = undefined;
	            if (schemeHandler) {
	                urnComponents = schemeHandler.parse(urnComponents, options);
	            }
	        } else {
	            urnComponents.error = urnComponents.error || "URN can not be parsed.";
	        }
	        return urnComponents;
	    },
	    serialize: function serialize$$1(urnComponents, options) {
	        var scheme = options.scheme || urnComponents.scheme || "urn";
	        var nid = urnComponents.nid;
	        var urnScheme = scheme + ":" + (options.nid || nid);
	        var schemeHandler = SCHEMES[urnScheme];
	        if (schemeHandler) {
	            urnComponents = schemeHandler.serialize(urnComponents, options);
	        }
	        var uriComponents = urnComponents;
	        var nss = urnComponents.nss;
	        uriComponents.path = (nid || options.nid) + ":" + nss;
	        return uriComponents;
	    }
	};

	var UUID = /^[0-9A-Fa-f]{8}(?:\-[0-9A-Fa-f]{4}){3}\-[0-9A-Fa-f]{12}$/;
	//RFC 4122
	var handler$6 = {
	    scheme: "urn:uuid",
	    parse: function parse(urnComponents, options) {
	        var uuidComponents = urnComponents;
	        uuidComponents.uuid = uuidComponents.nss;
	        uuidComponents.nss = undefined;
	        if (!options.tolerant && (!uuidComponents.uuid || !uuidComponents.uuid.match(UUID))) {
	            uuidComponents.error = uuidComponents.error || "UUID is not valid.";
	        }
	        return uuidComponents;
	    },
	    serialize: function serialize(uuidComponents, options) {
	        var urnComponents = uuidComponents;
	        //normalize UUID
	        urnComponents.nss = (uuidComponents.uuid || "").toLowerCase();
	        return urnComponents;
	    }
	};

	SCHEMES[handler.scheme] = handler;
	SCHEMES[handler$1.scheme] = handler$1;
	SCHEMES[handler$2.scheme] = handler$2;
	SCHEMES[handler$3.scheme] = handler$3;
	SCHEMES[handler$4.scheme] = handler$4;
	SCHEMES[handler$5.scheme] = handler$5;
	SCHEMES[handler$6.scheme] = handler$6;

	exports.SCHEMES = SCHEMES;
	exports.pctEncChar = pctEncChar;
	exports.pctDecChars = pctDecChars;
	exports.parse = parse;
	exports.removeDotSegments = removeDotSegments;
	exports.serialize = serialize;
	exports.resolveComponents = resolveComponents;
	exports.resolve = resolve;
	exports.normalize = normalize;
	exports.equal = equal;
	exports.escapeComponent = escapeComponent;
	exports.unescapeComponent = unescapeComponent;

	Object.defineProperty(exports, '__esModule', { value: true });

	})));
	
} (uri_all, uri_all.exports));

var uri_allExports = uri_all.exports;

Object.defineProperty(uri$1, "__esModule", { value: true });
const uri = uri_allExports;
uri.code = 'require("ajv/dist/runtime/uri").default';
uri$1.default = uri;

(function (exports) {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.CodeGen = exports.Name = exports.nil = exports.stringify = exports.str = exports._ = exports.KeywordCxt = void 0;
	var validate_1 = validate;
	Object.defineProperty(exports, "KeywordCxt", { enumerable: true, get: function () { return validate_1.KeywordCxt; } });
	var codegen_1 = codegen;
	Object.defineProperty(exports, "_", { enumerable: true, get: function () { return codegen_1._; } });
	Object.defineProperty(exports, "str", { enumerable: true, get: function () { return codegen_1.str; } });
	Object.defineProperty(exports, "stringify", { enumerable: true, get: function () { return codegen_1.stringify; } });
	Object.defineProperty(exports, "nil", { enumerable: true, get: function () { return codegen_1.nil; } });
	Object.defineProperty(exports, "Name", { enumerable: true, get: function () { return codegen_1.Name; } });
	Object.defineProperty(exports, "CodeGen", { enumerable: true, get: function () { return codegen_1.CodeGen; } });
	const validation_error_1 = validation_error;
	const ref_error_1 = ref_error;
	const rules_1 = rules;
	const compile_1 = compile;
	const codegen_2 = codegen;
	const resolve_1 = resolve$1;
	const dataType_1 = dataType;
	const util_1 = util;
	const $dataRefSchema = require$$9;
	const uri_1 = uri$1;
	const defaultRegExp = (str, flags) => new RegExp(str, flags);
	defaultRegExp.code = "new RegExp";
	const META_IGNORE_OPTIONS = ["removeAdditional", "useDefaults", "coerceTypes"];
	const EXT_SCOPE_NAMES = new Set([
	    "validate",
	    "serialize",
	    "parse",
	    "wrapper",
	    "root",
	    "schema",
	    "keyword",
	    "pattern",
	    "formats",
	    "validate$data",
	    "func",
	    "obj",
	    "Error",
	]);
	const removedOptions = {
	    errorDataPath: "",
	    format: "`validateFormats: false` can be used instead.",
	    nullable: '"nullable" keyword is supported by default.',
	    jsonPointers: "Deprecated jsPropertySyntax can be used instead.",
	    extendRefs: "Deprecated ignoreKeywordsWithRef can be used instead.",
	    missingRefs: "Pass empty schema with $id that should be ignored to ajv.addSchema.",
	    processCode: "Use option `code: {process: (code, schemaEnv: object) => string}`",
	    sourceCode: "Use option `code: {source: true}`",
	    strictDefaults: "It is default now, see option `strict`.",
	    strictKeywords: "It is default now, see option `strict`.",
	    uniqueItems: '"uniqueItems" keyword is always validated.',
	    unknownFormats: "Disable strict mode or pass `true` to `ajv.addFormat` (or `formats` option).",
	    cache: "Map is used as cache, schema object as key.",
	    serialize: "Map is used as cache, schema object as key.",
	    ajvErrors: "It is default now.",
	};
	const deprecatedOptions = {
	    ignoreKeywordsWithRef: "",
	    jsPropertySyntax: "",
	    unicode: '"minLength"/"maxLength" account for unicode characters by default.',
	};
	const MAX_EXPRESSION = 200;
	// eslint-disable-next-line complexity
	function requiredOptions(o) {
	    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0;
	    const s = o.strict;
	    const _optz = (_a = o.code) === null || _a === void 0 ? void 0 : _a.optimize;
	    const optimize = _optz === true || _optz === undefined ? 1 : _optz || 0;
	    const regExp = (_c = (_b = o.code) === null || _b === void 0 ? void 0 : _b.regExp) !== null && _c !== void 0 ? _c : defaultRegExp;
	    const uriResolver = (_d = o.uriResolver) !== null && _d !== void 0 ? _d : uri_1.default;
	    return {
	        strictSchema: (_f = (_e = o.strictSchema) !== null && _e !== void 0 ? _e : s) !== null && _f !== void 0 ? _f : true,
	        strictNumbers: (_h = (_g = o.strictNumbers) !== null && _g !== void 0 ? _g : s) !== null && _h !== void 0 ? _h : true,
	        strictTypes: (_k = (_j = o.strictTypes) !== null && _j !== void 0 ? _j : s) !== null && _k !== void 0 ? _k : "log",
	        strictTuples: (_m = (_l = o.strictTuples) !== null && _l !== void 0 ? _l : s) !== null && _m !== void 0 ? _m : "log",
	        strictRequired: (_p = (_o = o.strictRequired) !== null && _o !== void 0 ? _o : s) !== null && _p !== void 0 ? _p : false,
	        code: o.code ? { ...o.code, optimize, regExp } : { optimize, regExp },
	        loopRequired: (_q = o.loopRequired) !== null && _q !== void 0 ? _q : MAX_EXPRESSION,
	        loopEnum: (_r = o.loopEnum) !== null && _r !== void 0 ? _r : MAX_EXPRESSION,
	        meta: (_s = o.meta) !== null && _s !== void 0 ? _s : true,
	        messages: (_t = o.messages) !== null && _t !== void 0 ? _t : true,
	        inlineRefs: (_u = o.inlineRefs) !== null && _u !== void 0 ? _u : true,
	        schemaId: (_v = o.schemaId) !== null && _v !== void 0 ? _v : "$id",
	        addUsedSchema: (_w = o.addUsedSchema) !== null && _w !== void 0 ? _w : true,
	        validateSchema: (_x = o.validateSchema) !== null && _x !== void 0 ? _x : true,
	        validateFormats: (_y = o.validateFormats) !== null && _y !== void 0 ? _y : true,
	        unicodeRegExp: (_z = o.unicodeRegExp) !== null && _z !== void 0 ? _z : true,
	        int32range: (_0 = o.int32range) !== null && _0 !== void 0 ? _0 : true,
	        uriResolver: uriResolver,
	    };
	}
	class Ajv {
	    constructor(opts = {}) {
	        this.schemas = {};
	        this.refs = {};
	        this.formats = {};
	        this._compilations = new Set();
	        this._loading = {};
	        this._cache = new Map();
	        opts = this.opts = { ...opts, ...requiredOptions(opts) };
	        const { es5, lines } = this.opts.code;
	        this.scope = new codegen_2.ValueScope({ scope: {}, prefixes: EXT_SCOPE_NAMES, es5, lines });
	        this.logger = getLogger(opts.logger);
	        const formatOpt = opts.validateFormats;
	        opts.validateFormats = false;
	        this.RULES = (0, rules_1.getRules)();
	        checkOptions.call(this, removedOptions, opts, "NOT SUPPORTED");
	        checkOptions.call(this, deprecatedOptions, opts, "DEPRECATED", "warn");
	        this._metaOpts = getMetaSchemaOptions.call(this);
	        if (opts.formats)
	            addInitialFormats.call(this);
	        this._addVocabularies();
	        this._addDefaultMetaSchema();
	        if (opts.keywords)
	            addInitialKeywords.call(this, opts.keywords);
	        if (typeof opts.meta == "object")
	            this.addMetaSchema(opts.meta);
	        addInitialSchemas.call(this);
	        opts.validateFormats = formatOpt;
	    }
	    _addVocabularies() {
	        this.addKeyword("$async");
	    }
	    _addDefaultMetaSchema() {
	        const { $data, meta, schemaId } = this.opts;
	        let _dataRefSchema = $dataRefSchema;
	        if (schemaId === "id") {
	            _dataRefSchema = { ...$dataRefSchema };
	            _dataRefSchema.id = _dataRefSchema.$id;
	            delete _dataRefSchema.$id;
	        }
	        if (meta && $data)
	            this.addMetaSchema(_dataRefSchema, _dataRefSchema[schemaId], false);
	    }
	    defaultMeta() {
	        const { meta, schemaId } = this.opts;
	        return (this.opts.defaultMeta = typeof meta == "object" ? meta[schemaId] || meta : undefined);
	    }
	    validate(schemaKeyRef, // key, ref or schema object
	    // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
	    data // to be validated
	    ) {
	        let v;
	        if (typeof schemaKeyRef == "string") {
	            v = this.getSchema(schemaKeyRef);
	            if (!v)
	                throw new Error(`no schema with key or ref "${schemaKeyRef}"`);
	        }
	        else {
	            v = this.compile(schemaKeyRef);
	        }
	        const valid = v(data);
	        if (!("$async" in v))
	            this.errors = v.errors;
	        return valid;
	    }
	    compile(schema, _meta) {
	        const sch = this._addSchema(schema, _meta);
	        return (sch.validate || this._compileSchemaEnv(sch));
	    }
	    compileAsync(schema, meta) {
	        if (typeof this.opts.loadSchema != "function") {
	            throw new Error("options.loadSchema should be a function");
	        }
	        const { loadSchema } = this.opts;
	        return runCompileAsync.call(this, schema, meta);
	        async function runCompileAsync(_schema, _meta) {
	            await loadMetaSchema.call(this, _schema.$schema);
	            const sch = this._addSchema(_schema, _meta);
	            return sch.validate || _compileAsync.call(this, sch);
	        }
	        async function loadMetaSchema($ref) {
	            if ($ref && !this.getSchema($ref)) {
	                await runCompileAsync.call(this, { $ref }, true);
	            }
	        }
	        async function _compileAsync(sch) {
	            try {
	                return this._compileSchemaEnv(sch);
	            }
	            catch (e) {
	                if (!(e instanceof ref_error_1.default))
	                    throw e;
	                checkLoaded.call(this, e);
	                await loadMissingSchema.call(this, e.missingSchema);
	                return _compileAsync.call(this, sch);
	            }
	        }
	        function checkLoaded({ missingSchema: ref, missingRef }) {
	            if (this.refs[ref]) {
	                throw new Error(`AnySchema ${ref} is loaded but ${missingRef} cannot be resolved`);
	            }
	        }
	        async function loadMissingSchema(ref) {
	            const _schema = await _loadSchema.call(this, ref);
	            if (!this.refs[ref])
	                await loadMetaSchema.call(this, _schema.$schema);
	            if (!this.refs[ref])
	                this.addSchema(_schema, ref, meta);
	        }
	        async function _loadSchema(ref) {
	            const p = this._loading[ref];
	            if (p)
	                return p;
	            try {
	                return await (this._loading[ref] = loadSchema(ref));
	            }
	            finally {
	                delete this._loading[ref];
	            }
	        }
	    }
	    // Adds schema to the instance
	    addSchema(schema, // If array is passed, `key` will be ignored
	    key, // Optional schema key. Can be passed to `validate` method instead of schema object or id/ref. One schema per instance can have empty `id` and `key`.
	    _meta, // true if schema is a meta-schema. Used internally, addMetaSchema should be used instead.
	    _validateSchema = this.opts.validateSchema // false to skip schema validation. Used internally, option validateSchema should be used instead.
	    ) {
	        if (Array.isArray(schema)) {
	            for (const sch of schema)
	                this.addSchema(sch, undefined, _meta, _validateSchema);
	            return this;
	        }
	        let id;
	        if (typeof schema === "object") {
	            const { schemaId } = this.opts;
	            id = schema[schemaId];
	            if (id !== undefined && typeof id != "string") {
	                throw new Error(`schema ${schemaId} must be string`);
	            }
	        }
	        key = (0, resolve_1.normalizeId)(key || id);
	        this._checkUnique(key);
	        this.schemas[key] = this._addSchema(schema, _meta, key, _validateSchema, true);
	        return this;
	    }
	    // Add schema that will be used to validate other schemas
	    // options in META_IGNORE_OPTIONS are alway set to false
	    addMetaSchema(schema, key, // schema key
	    _validateSchema = this.opts.validateSchema // false to skip schema validation, can be used to override validateSchema option for meta-schema
	    ) {
	        this.addSchema(schema, key, true, _validateSchema);
	        return this;
	    }
	    //  Validate schema against its meta-schema
	    validateSchema(schema, throwOrLogError) {
	        if (typeof schema == "boolean")
	            return true;
	        let $schema;
	        $schema = schema.$schema;
	        if ($schema !== undefined && typeof $schema != "string") {
	            throw new Error("$schema must be a string");
	        }
	        $schema = $schema || this.opts.defaultMeta || this.defaultMeta();
	        if (!$schema) {
	            this.logger.warn("meta-schema not available");
	            this.errors = null;
	            return true;
	        }
	        const valid = this.validate($schema, schema);
	        if (!valid && throwOrLogError) {
	            const message = "schema is invalid: " + this.errorsText();
	            if (this.opts.validateSchema === "log")
	                this.logger.error(message);
	            else
	                throw new Error(message);
	        }
	        return valid;
	    }
	    // Get compiled schema by `key` or `ref`.
	    // (`key` that was passed to `addSchema` or full schema reference - `schema.$id` or resolved id)
	    getSchema(keyRef) {
	        let sch;
	        while (typeof (sch = getSchEnv.call(this, keyRef)) == "string")
	            keyRef = sch;
	        if (sch === undefined) {
	            const { schemaId } = this.opts;
	            const root = new compile_1.SchemaEnv({ schema: {}, schemaId });
	            sch = compile_1.resolveSchema.call(this, root, keyRef);
	            if (!sch)
	                return;
	            this.refs[keyRef] = sch;
	        }
	        return (sch.validate || this._compileSchemaEnv(sch));
	    }
	    // Remove cached schema(s).
	    // If no parameter is passed all schemas but meta-schemas are removed.
	    // If RegExp is passed all schemas with key/id matching pattern but meta-schemas are removed.
	    // Even if schema is referenced by other schemas it still can be removed as other schemas have local references.
	    removeSchema(schemaKeyRef) {
	        if (schemaKeyRef instanceof RegExp) {
	            this._removeAllSchemas(this.schemas, schemaKeyRef);
	            this._removeAllSchemas(this.refs, schemaKeyRef);
	            return this;
	        }
	        switch (typeof schemaKeyRef) {
	            case "undefined":
	                this._removeAllSchemas(this.schemas);
	                this._removeAllSchemas(this.refs);
	                this._cache.clear();
	                return this;
	            case "string": {
	                const sch = getSchEnv.call(this, schemaKeyRef);
	                if (typeof sch == "object")
	                    this._cache.delete(sch.schema);
	                delete this.schemas[schemaKeyRef];
	                delete this.refs[schemaKeyRef];
	                return this;
	            }
	            case "object": {
	                const cacheKey = schemaKeyRef;
	                this._cache.delete(cacheKey);
	                let id = schemaKeyRef[this.opts.schemaId];
	                if (id) {
	                    id = (0, resolve_1.normalizeId)(id);
	                    delete this.schemas[id];
	                    delete this.refs[id];
	                }
	                return this;
	            }
	            default:
	                throw new Error("ajv.removeSchema: invalid parameter");
	        }
	    }
	    // add "vocabulary" - a collection of keywords
	    addVocabulary(definitions) {
	        for (const def of definitions)
	            this.addKeyword(def);
	        return this;
	    }
	    addKeyword(kwdOrDef, def // deprecated
	    ) {
	        let keyword;
	        if (typeof kwdOrDef == "string") {
	            keyword = kwdOrDef;
	            if (typeof def == "object") {
	                this.logger.warn("these parameters are deprecated, see docs for addKeyword");
	                def.keyword = keyword;
	            }
	        }
	        else if (typeof kwdOrDef == "object" && def === undefined) {
	            def = kwdOrDef;
	            keyword = def.keyword;
	            if (Array.isArray(keyword) && !keyword.length) {
	                throw new Error("addKeywords: keyword must be string or non-empty array");
	            }
	        }
	        else {
	            throw new Error("invalid addKeywords parameters");
	        }
	        checkKeyword.call(this, keyword, def);
	        if (!def) {
	            (0, util_1.eachItem)(keyword, (kwd) => addRule.call(this, kwd));
	            return this;
	        }
	        keywordMetaschema.call(this, def);
	        const definition = {
	            ...def,
	            type: (0, dataType_1.getJSONTypes)(def.type),
	            schemaType: (0, dataType_1.getJSONTypes)(def.schemaType),
	        };
	        (0, util_1.eachItem)(keyword, definition.type.length === 0
	            ? (k) => addRule.call(this, k, definition)
	            : (k) => definition.type.forEach((t) => addRule.call(this, k, definition, t)));
	        return this;
	    }
	    getKeyword(keyword) {
	        const rule = this.RULES.all[keyword];
	        return typeof rule == "object" ? rule.definition : !!rule;
	    }
	    // Remove keyword
	    removeKeyword(keyword) {
	        // TODO return type should be Ajv
	        const { RULES } = this;
	        delete RULES.keywords[keyword];
	        delete RULES.all[keyword];
	        for (const group of RULES.rules) {
	            const i = group.rules.findIndex((rule) => rule.keyword === keyword);
	            if (i >= 0)
	                group.rules.splice(i, 1);
	        }
	        return this;
	    }
	    // Add format
	    addFormat(name, format) {
	        if (typeof format == "string")
	            format = new RegExp(format);
	        this.formats[name] = format;
	        return this;
	    }
	    errorsText(errors = this.errors, // optional array of validation errors
	    { separator = ", ", dataVar = "data" } = {} // optional options with properties `separator` and `dataVar`
	    ) {
	        if (!errors || errors.length === 0)
	            return "No errors";
	        return errors
	            .map((e) => `${dataVar}${e.instancePath} ${e.message}`)
	            .reduce((text, msg) => text + separator + msg);
	    }
	    $dataMetaSchema(metaSchema, keywordsJsonPointers) {
	        const rules = this.RULES.all;
	        metaSchema = JSON.parse(JSON.stringify(metaSchema));
	        for (const jsonPointer of keywordsJsonPointers) {
	            const segments = jsonPointer.split("/").slice(1); // first segment is an empty string
	            let keywords = metaSchema;
	            for (const seg of segments)
	                keywords = keywords[seg];
	            for (const key in rules) {
	                const rule = rules[key];
	                if (typeof rule != "object")
	                    continue;
	                const { $data } = rule.definition;
	                const schema = keywords[key];
	                if ($data && schema)
	                    keywords[key] = schemaOrData(schema);
	            }
	        }
	        return metaSchema;
	    }
	    _removeAllSchemas(schemas, regex) {
	        for (const keyRef in schemas) {
	            const sch = schemas[keyRef];
	            if (!regex || regex.test(keyRef)) {
	                if (typeof sch == "string") {
	                    delete schemas[keyRef];
	                }
	                else if (sch && !sch.meta) {
	                    this._cache.delete(sch.schema);
	                    delete schemas[keyRef];
	                }
	            }
	        }
	    }
	    _addSchema(schema, meta, baseId, validateSchema = this.opts.validateSchema, addSchema = this.opts.addUsedSchema) {
	        let id;
	        const { schemaId } = this.opts;
	        if (typeof schema == "object") {
	            id = schema[schemaId];
	        }
	        else {
	            if (this.opts.jtd)
	                throw new Error("schema must be object");
	            else if (typeof schema != "boolean")
	                throw new Error("schema must be object or boolean");
	        }
	        let sch = this._cache.get(schema);
	        if (sch !== undefined)
	            return sch;
	        baseId = (0, resolve_1.normalizeId)(id || baseId);
	        const localRefs = resolve_1.getSchemaRefs.call(this, schema, baseId);
	        sch = new compile_1.SchemaEnv({ schema, schemaId, meta, baseId, localRefs });
	        this._cache.set(sch.schema, sch);
	        if (addSchema && !baseId.startsWith("#")) {
	            // TODO atm it is allowed to overwrite schemas without id (instead of not adding them)
	            if (baseId)
	                this._checkUnique(baseId);
	            this.refs[baseId] = sch;
	        }
	        if (validateSchema)
	            this.validateSchema(schema, true);
	        return sch;
	    }
	    _checkUnique(id) {
	        if (this.schemas[id] || this.refs[id]) {
	            throw new Error(`schema with key or id "${id}" already exists`);
	        }
	    }
	    _compileSchemaEnv(sch) {
	        if (sch.meta)
	            this._compileMetaSchema(sch);
	        else
	            compile_1.compileSchema.call(this, sch);
	        /* istanbul ignore if */
	        if (!sch.validate)
	            throw new Error("ajv implementation error");
	        return sch.validate;
	    }
	    _compileMetaSchema(sch) {
	        const currentOpts = this.opts;
	        this.opts = this._metaOpts;
	        try {
	            compile_1.compileSchema.call(this, sch);
	        }
	        finally {
	            this.opts = currentOpts;
	        }
	    }
	}
	Ajv.ValidationError = validation_error_1.default;
	Ajv.MissingRefError = ref_error_1.default;
	exports.default = Ajv;
	function checkOptions(checkOpts, options, msg, log = "error") {
	    for (const key in checkOpts) {
	        const opt = key;
	        if (opt in options)
	            this.logger[log](`${msg}: option ${key}. ${checkOpts[opt]}`);
	    }
	}
	function getSchEnv(keyRef) {
	    keyRef = (0, resolve_1.normalizeId)(keyRef); // TODO tests fail without this line
	    return this.schemas[keyRef] || this.refs[keyRef];
	}
	function addInitialSchemas() {
	    const optsSchemas = this.opts.schemas;
	    if (!optsSchemas)
	        return;
	    if (Array.isArray(optsSchemas))
	        this.addSchema(optsSchemas);
	    else
	        for (const key in optsSchemas)
	            this.addSchema(optsSchemas[key], key);
	}
	function addInitialFormats() {
	    for (const name in this.opts.formats) {
	        const format = this.opts.formats[name];
	        if (format)
	            this.addFormat(name, format);
	    }
	}
	function addInitialKeywords(defs) {
	    if (Array.isArray(defs)) {
	        this.addVocabulary(defs);
	        return;
	    }
	    this.logger.warn("keywords option as map is deprecated, pass array");
	    for (const keyword in defs) {
	        const def = defs[keyword];
	        if (!def.keyword)
	            def.keyword = keyword;
	        this.addKeyword(def);
	    }
	}
	function getMetaSchemaOptions() {
	    const metaOpts = { ...this.opts };
	    for (const opt of META_IGNORE_OPTIONS)
	        delete metaOpts[opt];
	    return metaOpts;
	}
	const noLogs = { log() { }, warn() { }, error() { } };
	function getLogger(logger) {
	    if (logger === false)
	        return noLogs;
	    if (logger === undefined)
	        return console;
	    if (logger.log && logger.warn && logger.error)
	        return logger;
	    throw new Error("logger must implement log, warn and error methods");
	}
	const KEYWORD_NAME = /^[a-z_$][a-z0-9_$:-]*$/i;
	function checkKeyword(keyword, def) {
	    const { RULES } = this;
	    (0, util_1.eachItem)(keyword, (kwd) => {
	        if (RULES.keywords[kwd])
	            throw new Error(`Keyword ${kwd} is already defined`);
	        if (!KEYWORD_NAME.test(kwd))
	            throw new Error(`Keyword ${kwd} has invalid name`);
	    });
	    if (!def)
	        return;
	    if (def.$data && !("code" in def || "validate" in def)) {
	        throw new Error('$data keyword must have "code" or "validate" function');
	    }
	}
	function addRule(keyword, definition, dataType) {
	    var _a;
	    const post = definition === null || definition === void 0 ? void 0 : definition.post;
	    if (dataType && post)
	        throw new Error('keyword with "post" flag cannot have "type"');
	    const { RULES } = this;
	    let ruleGroup = post ? RULES.post : RULES.rules.find(({ type: t }) => t === dataType);
	    if (!ruleGroup) {
	        ruleGroup = { type: dataType, rules: [] };
	        RULES.rules.push(ruleGroup);
	    }
	    RULES.keywords[keyword] = true;
	    if (!definition)
	        return;
	    const rule = {
	        keyword,
	        definition: {
	            ...definition,
	            type: (0, dataType_1.getJSONTypes)(definition.type),
	            schemaType: (0, dataType_1.getJSONTypes)(definition.schemaType),
	        },
	    };
	    if (definition.before)
	        addBeforeRule.call(this, ruleGroup, rule, definition.before);
	    else
	        ruleGroup.rules.push(rule);
	    RULES.all[keyword] = rule;
	    (_a = definition.implements) === null || _a === void 0 ? void 0 : _a.forEach((kwd) => this.addKeyword(kwd));
	}
	function addBeforeRule(ruleGroup, rule, before) {
	    const i = ruleGroup.rules.findIndex((_rule) => _rule.keyword === before);
	    if (i >= 0) {
	        ruleGroup.rules.splice(i, 0, rule);
	    }
	    else {
	        ruleGroup.rules.push(rule);
	        this.logger.warn(`rule ${before} is not defined`);
	    }
	}
	function keywordMetaschema(def) {
	    let { metaSchema } = def;
	    if (metaSchema === undefined)
	        return;
	    if (def.$data && this.opts.$data)
	        metaSchema = schemaOrData(metaSchema);
	    def.validateSchema = this.compile(metaSchema, true);
	}
	const $dataRef = {
	    $ref: "https://raw.githubusercontent.com/ajv-validator/ajv/master/lib/refs/data.json#",
	};
	function schemaOrData(schema) {
	    return { anyOf: [schema, $dataRef] };
	}
	
} (core$3));

var draft7 = {};

var core$2 = {};

var id = {};

Object.defineProperty(id, "__esModule", { value: true });
const def$B = {
    keyword: "id",
    code() {
        throw new Error('NOT SUPPORTED: keyword "id", use "$id" for schema ID');
    },
};
id.default = def$B;

var ref = {};

Object.defineProperty(ref, "__esModule", { value: true });
ref.callRef = ref.getValidate = void 0;
const ref_error_1$1 = ref_error;
const code_1$8 = code;
const codegen_1$p = codegen;
const names_1$4 = names$1;
const compile_1$2 = compile;
const util_1$n = util;
const def$A = {
    keyword: "$ref",
    schemaType: "string",
    code(cxt) {
        const { gen, schema: $ref, it } = cxt;
        const { baseId, schemaEnv: env, validateName, opts, self } = it;
        const { root } = env;
        if (($ref === "#" || $ref === "#/") && baseId === root.baseId)
            return callRootRef();
        const schOrEnv = compile_1$2.resolveRef.call(self, root, baseId, $ref);
        if (schOrEnv === undefined)
            throw new ref_error_1$1.default(it.opts.uriResolver, baseId, $ref);
        if (schOrEnv instanceof compile_1$2.SchemaEnv)
            return callValidate(schOrEnv);
        return inlineRefSchema(schOrEnv);
        function callRootRef() {
            if (env === root)
                return callRef(cxt, validateName, env, env.$async);
            const rootName = gen.scopeValue("root", { ref: root });
            return callRef(cxt, (0, codegen_1$p._) `${rootName}.validate`, root, root.$async);
        }
        function callValidate(sch) {
            const v = getValidate(cxt, sch);
            callRef(cxt, v, sch, sch.$async);
        }
        function inlineRefSchema(sch) {
            const schName = gen.scopeValue("schema", opts.code.source === true ? { ref: sch, code: (0, codegen_1$p.stringify)(sch) } : { ref: sch });
            const valid = gen.name("valid");
            const schCxt = cxt.subschema({
                schema: sch,
                dataTypes: [],
                schemaPath: codegen_1$p.nil,
                topSchemaRef: schName,
                errSchemaPath: $ref,
            }, valid);
            cxt.mergeEvaluated(schCxt);
            cxt.ok(valid);
        }
    },
};
function getValidate(cxt, sch) {
    const { gen } = cxt;
    return sch.validate
        ? gen.scopeValue("validate", { ref: sch.validate })
        : (0, codegen_1$p._) `${gen.scopeValue("wrapper", { ref: sch })}.validate`;
}
ref.getValidate = getValidate;
function callRef(cxt, v, sch, $async) {
    const { gen, it } = cxt;
    const { allErrors, schemaEnv: env, opts } = it;
    const passCxt = opts.passContext ? names_1$4.default.this : codegen_1$p.nil;
    if ($async)
        callAsyncRef();
    else
        callSyncRef();
    function callAsyncRef() {
        if (!env.$async)
            throw new Error("async schema referenced by sync schema");
        const valid = gen.let("valid");
        gen.try(() => {
            gen.code((0, codegen_1$p._) `await ${(0, code_1$8.callValidateCode)(cxt, v, passCxt)}`);
            addEvaluatedFrom(v); // TODO will not work with async, it has to be returned with the result
            if (!allErrors)
                gen.assign(valid, true);
        }, (e) => {
            gen.if((0, codegen_1$p._) `!(${e} instanceof ${it.ValidationError})`, () => gen.throw(e));
            addErrorsFrom(e);
            if (!allErrors)
                gen.assign(valid, false);
        });
        cxt.ok(valid);
    }
    function callSyncRef() {
        cxt.result((0, code_1$8.callValidateCode)(cxt, v, passCxt), () => addEvaluatedFrom(v), () => addErrorsFrom(v));
    }
    function addErrorsFrom(source) {
        const errs = (0, codegen_1$p._) `${source}.errors`;
        gen.assign(names_1$4.default.vErrors, (0, codegen_1$p._) `${names_1$4.default.vErrors} === null ? ${errs} : ${names_1$4.default.vErrors}.concat(${errs})`); // TODO tagged
        gen.assign(names_1$4.default.errors, (0, codegen_1$p._) `${names_1$4.default.vErrors}.length`);
    }
    function addEvaluatedFrom(source) {
        var _a;
        if (!it.opts.unevaluated)
            return;
        const schEvaluated = (_a = sch === null || sch === void 0 ? void 0 : sch.validate) === null || _a === void 0 ? void 0 : _a.evaluated;
        // TODO refactor
        if (it.props !== true) {
            if (schEvaluated && !schEvaluated.dynamicProps) {
                if (schEvaluated.props !== undefined) {
                    it.props = util_1$n.mergeEvaluated.props(gen, schEvaluated.props, it.props);
                }
            }
            else {
                const props = gen.var("props", (0, codegen_1$p._) `${source}.evaluated.props`);
                it.props = util_1$n.mergeEvaluated.props(gen, props, it.props, codegen_1$p.Name);
            }
        }
        if (it.items !== true) {
            if (schEvaluated && !schEvaluated.dynamicItems) {
                if (schEvaluated.items !== undefined) {
                    it.items = util_1$n.mergeEvaluated.items(gen, schEvaluated.items, it.items);
                }
            }
            else {
                const items = gen.var("items", (0, codegen_1$p._) `${source}.evaluated.items`);
                it.items = util_1$n.mergeEvaluated.items(gen, items, it.items, codegen_1$p.Name);
            }
        }
    }
}
ref.callRef = callRef;
ref.default = def$A;

Object.defineProperty(core$2, "__esModule", { value: true });
const id_1 = id;
const ref_1$2 = ref;
const core$1 = [
    "$schema",
    "$id",
    "$defs",
    "$vocabulary",
    { keyword: "$comment" },
    "definitions",
    id_1.default,
    ref_1$2.default,
];
core$2.default = core$1;

var validation$2 = {};

var limitNumber = {};

Object.defineProperty(limitNumber, "__esModule", { value: true });
const codegen_1$o = codegen;
const ops = codegen_1$o.operators;
const KWDs = {
    maximum: { okStr: "<=", ok: ops.LTE, fail: ops.GT },
    minimum: { okStr: ">=", ok: ops.GTE, fail: ops.LT },
    exclusiveMaximum: { okStr: "<", ok: ops.LT, fail: ops.GTE },
    exclusiveMinimum: { okStr: ">", ok: ops.GT, fail: ops.LTE },
};
const error$k = {
    message: ({ keyword, schemaCode }) => (0, codegen_1$o.str) `must be ${KWDs[keyword].okStr} ${schemaCode}`,
    params: ({ keyword, schemaCode }) => (0, codegen_1$o._) `{comparison: ${KWDs[keyword].okStr}, limit: ${schemaCode}}`,
};
const def$z = {
    keyword: Object.keys(KWDs),
    type: "number",
    schemaType: "number",
    $data: true,
    error: error$k,
    code(cxt) {
        const { keyword, data, schemaCode } = cxt;
        cxt.fail$data((0, codegen_1$o._) `${data} ${KWDs[keyword].fail} ${schemaCode} || isNaN(${data})`);
    },
};
limitNumber.default = def$z;

var multipleOf = {};

Object.defineProperty(multipleOf, "__esModule", { value: true });
const codegen_1$n = codegen;
const error$j = {
    message: ({ schemaCode }) => (0, codegen_1$n.str) `must be multiple of ${schemaCode}`,
    params: ({ schemaCode }) => (0, codegen_1$n._) `{multipleOf: ${schemaCode}}`,
};
const def$y = {
    keyword: "multipleOf",
    type: "number",
    schemaType: "number",
    $data: true,
    error: error$j,
    code(cxt) {
        const { gen, data, schemaCode, it } = cxt;
        // const bdt = bad$DataType(schemaCode, <string>def.schemaType, $data)
        const prec = it.opts.multipleOfPrecision;
        const res = gen.let("res");
        const invalid = prec
            ? (0, codegen_1$n._) `Math.abs(Math.round(${res}) - ${res}) > 1e-${prec}`
            : (0, codegen_1$n._) `${res} !== parseInt(${res})`;
        cxt.fail$data((0, codegen_1$n._) `(${schemaCode} === 0 || (${res} = ${data}/${schemaCode}, ${invalid}))`);
    },
};
multipleOf.default = def$y;

var limitLength = {};

var ucs2length$1 = {};

Object.defineProperty(ucs2length$1, "__esModule", { value: true });
// https://mathiasbynens.be/notes/javascript-encoding
// https://github.com/bestiejs/punycode.js - punycode.ucs2.decode
function ucs2length(str) {
    const len = str.length;
    let length = 0;
    let pos = 0;
    let value;
    while (pos < len) {
        length++;
        value = str.charCodeAt(pos++);
        if (value >= 0xd800 && value <= 0xdbff && pos < len) {
            // high surrogate, and there is a next character
            value = str.charCodeAt(pos);
            if ((value & 0xfc00) === 0xdc00)
                pos++; // low surrogate
        }
    }
    return length;
}
ucs2length$1.default = ucs2length;
ucs2length.code = 'require("ajv/dist/runtime/ucs2length").default';

Object.defineProperty(limitLength, "__esModule", { value: true });
const codegen_1$m = codegen;
const util_1$m = util;
const ucs2length_1 = ucs2length$1;
const error$i = {
    message({ keyword, schemaCode }) {
        const comp = keyword === "maxLength" ? "more" : "fewer";
        return (0, codegen_1$m.str) `must NOT have ${comp} than ${schemaCode} characters`;
    },
    params: ({ schemaCode }) => (0, codegen_1$m._) `{limit: ${schemaCode}}`,
};
const def$x = {
    keyword: ["maxLength", "minLength"],
    type: "string",
    schemaType: "number",
    $data: true,
    error: error$i,
    code(cxt) {
        const { keyword, data, schemaCode, it } = cxt;
        const op = keyword === "maxLength" ? codegen_1$m.operators.GT : codegen_1$m.operators.LT;
        const len = it.opts.unicode === false ? (0, codegen_1$m._) `${data}.length` : (0, codegen_1$m._) `${(0, util_1$m.useFunc)(cxt.gen, ucs2length_1.default)}(${data})`;
        cxt.fail$data((0, codegen_1$m._) `${len} ${op} ${schemaCode}`);
    },
};
limitLength.default = def$x;

var pattern = {};

Object.defineProperty(pattern, "__esModule", { value: true });
const code_1$7 = code;
const codegen_1$l = codegen;
const error$h = {
    message: ({ schemaCode }) => (0, codegen_1$l.str) `must match pattern "${schemaCode}"`,
    params: ({ schemaCode }) => (0, codegen_1$l._) `{pattern: ${schemaCode}}`,
};
const def$w = {
    keyword: "pattern",
    type: "string",
    schemaType: "string",
    $data: true,
    error: error$h,
    code(cxt) {
        const { data, $data, schema, schemaCode, it } = cxt;
        // TODO regexp should be wrapped in try/catchs
        const u = it.opts.unicodeRegExp ? "u" : "";
        const regExp = $data ? (0, codegen_1$l._) `(new RegExp(${schemaCode}, ${u}))` : (0, code_1$7.usePattern)(cxt, schema);
        cxt.fail$data((0, codegen_1$l._) `!${regExp}.test(${data})`);
    },
};
pattern.default = def$w;

var limitProperties = {};

Object.defineProperty(limitProperties, "__esModule", { value: true });
const codegen_1$k = codegen;
const error$g = {
    message({ keyword, schemaCode }) {
        const comp = keyword === "maxProperties" ? "more" : "fewer";
        return (0, codegen_1$k.str) `must NOT have ${comp} than ${schemaCode} properties`;
    },
    params: ({ schemaCode }) => (0, codegen_1$k._) `{limit: ${schemaCode}}`,
};
const def$v = {
    keyword: ["maxProperties", "minProperties"],
    type: "object",
    schemaType: "number",
    $data: true,
    error: error$g,
    code(cxt) {
        const { keyword, data, schemaCode } = cxt;
        const op = keyword === "maxProperties" ? codegen_1$k.operators.GT : codegen_1$k.operators.LT;
        cxt.fail$data((0, codegen_1$k._) `Object.keys(${data}).length ${op} ${schemaCode}`);
    },
};
limitProperties.default = def$v;

var required = {};

Object.defineProperty(required, "__esModule", { value: true });
const code_1$6 = code;
const codegen_1$j = codegen;
const util_1$l = util;
const error$f = {
    message: ({ params: { missingProperty } }) => (0, codegen_1$j.str) `must have required property '${missingProperty}'`,
    params: ({ params: { missingProperty } }) => (0, codegen_1$j._) `{missingProperty: ${missingProperty}}`,
};
const def$u = {
    keyword: "required",
    type: "object",
    schemaType: "array",
    $data: true,
    error: error$f,
    code(cxt) {
        const { gen, schema, schemaCode, data, $data, it } = cxt;
        const { opts } = it;
        if (!$data && schema.length === 0)
            return;
        const useLoop = schema.length >= opts.loopRequired;
        if (it.allErrors)
            allErrorsMode();
        else
            exitOnErrorMode();
        if (opts.strictRequired) {
            const props = cxt.parentSchema.properties;
            const { definedProperties } = cxt.it;
            for (const requiredKey of schema) {
                if ((props === null || props === void 0 ? void 0 : props[requiredKey]) === undefined && !definedProperties.has(requiredKey)) {
                    const schemaPath = it.schemaEnv.baseId + it.errSchemaPath;
                    const msg = `required property "${requiredKey}" is not defined at "${schemaPath}" (strictRequired)`;
                    (0, util_1$l.checkStrictMode)(it, msg, it.opts.strictRequired);
                }
            }
        }
        function allErrorsMode() {
            if (useLoop || $data) {
                cxt.block$data(codegen_1$j.nil, loopAllRequired);
            }
            else {
                for (const prop of schema) {
                    (0, code_1$6.checkReportMissingProp)(cxt, prop);
                }
            }
        }
        function exitOnErrorMode() {
            const missing = gen.let("missing");
            if (useLoop || $data) {
                const valid = gen.let("valid", true);
                cxt.block$data(valid, () => loopUntilMissing(missing, valid));
                cxt.ok(valid);
            }
            else {
                gen.if((0, code_1$6.checkMissingProp)(cxt, schema, missing));
                (0, code_1$6.reportMissingProp)(cxt, missing);
                gen.else();
            }
        }
        function loopAllRequired() {
            gen.forOf("prop", schemaCode, (prop) => {
                cxt.setParams({ missingProperty: prop });
                gen.if((0, code_1$6.noPropertyInData)(gen, data, prop, opts.ownProperties), () => cxt.error());
            });
        }
        function loopUntilMissing(missing, valid) {
            cxt.setParams({ missingProperty: missing });
            gen.forOf(missing, schemaCode, () => {
                gen.assign(valid, (0, code_1$6.propertyInData)(gen, data, missing, opts.ownProperties));
                gen.if((0, codegen_1$j.not)(valid), () => {
                    cxt.error();
                    gen.break();
                });
            }, codegen_1$j.nil);
        }
    },
};
required.default = def$u;

var limitItems = {};

Object.defineProperty(limitItems, "__esModule", { value: true });
const codegen_1$i = codegen;
const error$e = {
    message({ keyword, schemaCode }) {
        const comp = keyword === "maxItems" ? "more" : "fewer";
        return (0, codegen_1$i.str) `must NOT have ${comp} than ${schemaCode} items`;
    },
    params: ({ schemaCode }) => (0, codegen_1$i._) `{limit: ${schemaCode}}`,
};
const def$t = {
    keyword: ["maxItems", "minItems"],
    type: "array",
    schemaType: "number",
    $data: true,
    error: error$e,
    code(cxt) {
        const { keyword, data, schemaCode } = cxt;
        const op = keyword === "maxItems" ? codegen_1$i.operators.GT : codegen_1$i.operators.LT;
        cxt.fail$data((0, codegen_1$i._) `${data}.length ${op} ${schemaCode}`);
    },
};
limitItems.default = def$t;

var uniqueItems = {};

var equal$1 = {};

Object.defineProperty(equal$1, "__esModule", { value: true });
// https://github.com/ajv-validator/ajv/issues/889
const equal = fastDeepEqual;
equal.code = 'require("ajv/dist/runtime/equal").default';
equal$1.default = equal;

Object.defineProperty(uniqueItems, "__esModule", { value: true });
const dataType_1 = dataType;
const codegen_1$h = codegen;
const util_1$k = util;
const equal_1$2 = equal$1;
const error$d = {
    message: ({ params: { i, j } }) => (0, codegen_1$h.str) `must NOT have duplicate items (items ## ${j} and ${i} are identical)`,
    params: ({ params: { i, j } }) => (0, codegen_1$h._) `{i: ${i}, j: ${j}}`,
};
const def$s = {
    keyword: "uniqueItems",
    type: "array",
    schemaType: "boolean",
    $data: true,
    error: error$d,
    code(cxt) {
        const { gen, data, $data, schema, parentSchema, schemaCode, it } = cxt;
        if (!$data && !schema)
            return;
        const valid = gen.let("valid");
        const itemTypes = parentSchema.items ? (0, dataType_1.getSchemaTypes)(parentSchema.items) : [];
        cxt.block$data(valid, validateUniqueItems, (0, codegen_1$h._) `${schemaCode} === false`);
        cxt.ok(valid);
        function validateUniqueItems() {
            const i = gen.let("i", (0, codegen_1$h._) `${data}.length`);
            const j = gen.let("j");
            cxt.setParams({ i, j });
            gen.assign(valid, true);
            gen.if((0, codegen_1$h._) `${i} > 1`, () => (canOptimize() ? loopN : loopN2)(i, j));
        }
        function canOptimize() {
            return itemTypes.length > 0 && !itemTypes.some((t) => t === "object" || t === "array");
        }
        function loopN(i, j) {
            const item = gen.name("item");
            const wrongType = (0, dataType_1.checkDataTypes)(itemTypes, item, it.opts.strictNumbers, dataType_1.DataType.Wrong);
            const indices = gen.const("indices", (0, codegen_1$h._) `{}`);
            gen.for((0, codegen_1$h._) `;${i}--;`, () => {
                gen.let(item, (0, codegen_1$h._) `${data}[${i}]`);
                gen.if(wrongType, (0, codegen_1$h._) `continue`);
                if (itemTypes.length > 1)
                    gen.if((0, codegen_1$h._) `typeof ${item} == "string"`, (0, codegen_1$h._) `${item} += "_"`);
                gen
                    .if((0, codegen_1$h._) `typeof ${indices}[${item}] == "number"`, () => {
                    gen.assign(j, (0, codegen_1$h._) `${indices}[${item}]`);
                    cxt.error();
                    gen.assign(valid, false).break();
                })
                    .code((0, codegen_1$h._) `${indices}[${item}] = ${i}`);
            });
        }
        function loopN2(i, j) {
            const eql = (0, util_1$k.useFunc)(gen, equal_1$2.default);
            const outer = gen.name("outer");
            gen.label(outer).for((0, codegen_1$h._) `;${i}--;`, () => gen.for((0, codegen_1$h._) `${j} = ${i}; ${j}--;`, () => gen.if((0, codegen_1$h._) `${eql}(${data}[${i}], ${data}[${j}])`, () => {
                cxt.error();
                gen.assign(valid, false).break(outer);
            })));
        }
    },
};
uniqueItems.default = def$s;

var _const = {};

Object.defineProperty(_const, "__esModule", { value: true });
const codegen_1$g = codegen;
const util_1$j = util;
const equal_1$1 = equal$1;
const error$c = {
    message: "must be equal to constant",
    params: ({ schemaCode }) => (0, codegen_1$g._) `{allowedValue: ${schemaCode}}`,
};
const def$r = {
    keyword: "const",
    $data: true,
    error: error$c,
    code(cxt) {
        const { gen, data, $data, schemaCode, schema } = cxt;
        if ($data || (schema && typeof schema == "object")) {
            cxt.fail$data((0, codegen_1$g._) `!${(0, util_1$j.useFunc)(gen, equal_1$1.default)}(${data}, ${schemaCode})`);
        }
        else {
            cxt.fail((0, codegen_1$g._) `${schema} !== ${data}`);
        }
    },
};
_const.default = def$r;

var _enum = {};

Object.defineProperty(_enum, "__esModule", { value: true });
const codegen_1$f = codegen;
const util_1$i = util;
const equal_1 = equal$1;
const error$b = {
    message: "must be equal to one of the allowed values",
    params: ({ schemaCode }) => (0, codegen_1$f._) `{allowedValues: ${schemaCode}}`,
};
const def$q = {
    keyword: "enum",
    schemaType: "array",
    $data: true,
    error: error$b,
    code(cxt) {
        const { gen, data, $data, schema, schemaCode, it } = cxt;
        if (!$data && schema.length === 0)
            throw new Error("enum must have non-empty array");
        const useLoop = schema.length >= it.opts.loopEnum;
        let eql;
        const getEql = () => (eql !== null && eql !== void 0 ? eql : (eql = (0, util_1$i.useFunc)(gen, equal_1.default)));
        let valid;
        if (useLoop || $data) {
            valid = gen.let("valid");
            cxt.block$data(valid, loopEnum);
        }
        else {
            /* istanbul ignore if */
            if (!Array.isArray(schema))
                throw new Error("ajv implementation error");
            const vSchema = gen.const("vSchema", schemaCode);
            valid = (0, codegen_1$f.or)(...schema.map((_x, i) => equalCode(vSchema, i)));
        }
        cxt.pass(valid);
        function loopEnum() {
            gen.assign(valid, false);
            gen.forOf("v", schemaCode, (v) => gen.if((0, codegen_1$f._) `${getEql()}(${data}, ${v})`, () => gen.assign(valid, true).break()));
        }
        function equalCode(vSchema, i) {
            const sch = schema[i];
            return typeof sch === "object" && sch !== null
                ? (0, codegen_1$f._) `${getEql()}(${data}, ${vSchema}[${i}])`
                : (0, codegen_1$f._) `${data} === ${sch}`;
        }
    },
};
_enum.default = def$q;

Object.defineProperty(validation$2, "__esModule", { value: true });
const limitNumber_1 = limitNumber;
const multipleOf_1 = multipleOf;
const limitLength_1 = limitLength;
const pattern_1 = pattern;
const limitProperties_1 = limitProperties;
const required_1 = required;
const limitItems_1 = limitItems;
const uniqueItems_1 = uniqueItems;
const const_1 = _const;
const enum_1 = _enum;
const validation$1 = [
    // number
    limitNumber_1.default,
    multipleOf_1.default,
    // string
    limitLength_1.default,
    pattern_1.default,
    // object
    limitProperties_1.default,
    required_1.default,
    // array
    limitItems_1.default,
    uniqueItems_1.default,
    // any
    { keyword: "type", schemaType: ["string", "array"] },
    { keyword: "nullable", schemaType: "boolean" },
    const_1.default,
    enum_1.default,
];
validation$2.default = validation$1;

var applicator$1 = {};

var additionalItems = {};

Object.defineProperty(additionalItems, "__esModule", { value: true });
additionalItems.validateAdditionalItems = void 0;
const codegen_1$e = codegen;
const util_1$h = util;
const error$a = {
    message: ({ params: { len } }) => (0, codegen_1$e.str) `must NOT have more than ${len} items`,
    params: ({ params: { len } }) => (0, codegen_1$e._) `{limit: ${len}}`,
};
const def$p = {
    keyword: "additionalItems",
    type: "array",
    schemaType: ["boolean", "object"],
    before: "uniqueItems",
    error: error$a,
    code(cxt) {
        const { parentSchema, it } = cxt;
        const { items } = parentSchema;
        if (!Array.isArray(items)) {
            (0, util_1$h.checkStrictMode)(it, '"additionalItems" is ignored when "items" is not an array of schemas');
            return;
        }
        validateAdditionalItems(cxt, items);
    },
};
function validateAdditionalItems(cxt, items) {
    const { gen, schema, data, keyword, it } = cxt;
    it.items = true;
    const len = gen.const("len", (0, codegen_1$e._) `${data}.length`);
    if (schema === false) {
        cxt.setParams({ len: items.length });
        cxt.pass((0, codegen_1$e._) `${len} <= ${items.length}`);
    }
    else if (typeof schema == "object" && !(0, util_1$h.alwaysValidSchema)(it, schema)) {
        const valid = gen.var("valid", (0, codegen_1$e._) `${len} <= ${items.length}`); // TODO var
        gen.if((0, codegen_1$e.not)(valid), () => validateItems(valid));
        cxt.ok(valid);
    }
    function validateItems(valid) {
        gen.forRange("i", items.length, len, (i) => {
            cxt.subschema({ keyword, dataProp: i, dataPropType: util_1$h.Type.Num }, valid);
            if (!it.allErrors)
                gen.if((0, codegen_1$e.not)(valid), () => gen.break());
        });
    }
}
additionalItems.validateAdditionalItems = validateAdditionalItems;
additionalItems.default = def$p;

var prefixItems = {};

var items = {};

Object.defineProperty(items, "__esModule", { value: true });
items.validateTuple = void 0;
const codegen_1$d = codegen;
const util_1$g = util;
const code_1$5 = code;
const def$o = {
    keyword: "items",
    type: "array",
    schemaType: ["object", "array", "boolean"],
    before: "uniqueItems",
    code(cxt) {
        const { schema, it } = cxt;
        if (Array.isArray(schema))
            return validateTuple(cxt, "additionalItems", schema);
        it.items = true;
        if ((0, util_1$g.alwaysValidSchema)(it, schema))
            return;
        cxt.ok((0, code_1$5.validateArray)(cxt));
    },
};
function validateTuple(cxt, extraItems, schArr = cxt.schema) {
    const { gen, parentSchema, data, keyword, it } = cxt;
    checkStrictTuple(parentSchema);
    if (it.opts.unevaluated && schArr.length && it.items !== true) {
        it.items = util_1$g.mergeEvaluated.items(gen, schArr.length, it.items);
    }
    const valid = gen.name("valid");
    const len = gen.const("len", (0, codegen_1$d._) `${data}.length`);
    schArr.forEach((sch, i) => {
        if ((0, util_1$g.alwaysValidSchema)(it, sch))
            return;
        gen.if((0, codegen_1$d._) `${len} > ${i}`, () => cxt.subschema({
            keyword,
            schemaProp: i,
            dataProp: i,
        }, valid));
        cxt.ok(valid);
    });
    function checkStrictTuple(sch) {
        const { opts, errSchemaPath } = it;
        const l = schArr.length;
        const fullTuple = l === sch.minItems && (l === sch.maxItems || sch[extraItems] === false);
        if (opts.strictTuples && !fullTuple) {
            const msg = `"${keyword}" is ${l}-tuple, but minItems or maxItems/${extraItems} are not specified or different at path "${errSchemaPath}"`;
            (0, util_1$g.checkStrictMode)(it, msg, opts.strictTuples);
        }
    }
}
items.validateTuple = validateTuple;
items.default = def$o;

Object.defineProperty(prefixItems, "__esModule", { value: true });
const items_1$1 = items;
const def$n = {
    keyword: "prefixItems",
    type: "array",
    schemaType: ["array"],
    before: "uniqueItems",
    code: (cxt) => (0, items_1$1.validateTuple)(cxt, "items"),
};
prefixItems.default = def$n;

var items2020 = {};

Object.defineProperty(items2020, "__esModule", { value: true });
const codegen_1$c = codegen;
const util_1$f = util;
const code_1$4 = code;
const additionalItems_1$1 = additionalItems;
const error$9 = {
    message: ({ params: { len } }) => (0, codegen_1$c.str) `must NOT have more than ${len} items`,
    params: ({ params: { len } }) => (0, codegen_1$c._) `{limit: ${len}}`,
};
const def$m = {
    keyword: "items",
    type: "array",
    schemaType: ["object", "boolean"],
    before: "uniqueItems",
    error: error$9,
    code(cxt) {
        const { schema, parentSchema, it } = cxt;
        const { prefixItems } = parentSchema;
        it.items = true;
        if ((0, util_1$f.alwaysValidSchema)(it, schema))
            return;
        if (prefixItems)
            (0, additionalItems_1$1.validateAdditionalItems)(cxt, prefixItems);
        else
            cxt.ok((0, code_1$4.validateArray)(cxt));
    },
};
items2020.default = def$m;

var contains = {};

Object.defineProperty(contains, "__esModule", { value: true });
const codegen_1$b = codegen;
const util_1$e = util;
const error$8 = {
    message: ({ params: { min, max } }) => max === undefined
        ? (0, codegen_1$b.str) `must contain at least ${min} valid item(s)`
        : (0, codegen_1$b.str) `must contain at least ${min} and no more than ${max} valid item(s)`,
    params: ({ params: { min, max } }) => max === undefined ? (0, codegen_1$b._) `{minContains: ${min}}` : (0, codegen_1$b._) `{minContains: ${min}, maxContains: ${max}}`,
};
const def$l = {
    keyword: "contains",
    type: "array",
    schemaType: ["object", "boolean"],
    before: "uniqueItems",
    trackErrors: true,
    error: error$8,
    code(cxt) {
        const { gen, schema, parentSchema, data, it } = cxt;
        let min;
        let max;
        const { minContains, maxContains } = parentSchema;
        if (it.opts.next) {
            min = minContains === undefined ? 1 : minContains;
            max = maxContains;
        }
        else {
            min = 1;
        }
        const len = gen.const("len", (0, codegen_1$b._) `${data}.length`);
        cxt.setParams({ min, max });
        if (max === undefined && min === 0) {
            (0, util_1$e.checkStrictMode)(it, `"minContains" == 0 without "maxContains": "contains" keyword ignored`);
            return;
        }
        if (max !== undefined && min > max) {
            (0, util_1$e.checkStrictMode)(it, `"minContains" > "maxContains" is always invalid`);
            cxt.fail();
            return;
        }
        if ((0, util_1$e.alwaysValidSchema)(it, schema)) {
            let cond = (0, codegen_1$b._) `${len} >= ${min}`;
            if (max !== undefined)
                cond = (0, codegen_1$b._) `${cond} && ${len} <= ${max}`;
            cxt.pass(cond);
            return;
        }
        it.items = true;
        const valid = gen.name("valid");
        if (max === undefined && min === 1) {
            validateItems(valid, () => gen.if(valid, () => gen.break()));
        }
        else if (min === 0) {
            gen.let(valid, true);
            if (max !== undefined)
                gen.if((0, codegen_1$b._) `${data}.length > 0`, validateItemsWithCount);
        }
        else {
            gen.let(valid, false);
            validateItemsWithCount();
        }
        cxt.result(valid, () => cxt.reset());
        function validateItemsWithCount() {
            const schValid = gen.name("_valid");
            const count = gen.let("count", 0);
            validateItems(schValid, () => gen.if(schValid, () => checkLimits(count)));
        }
        function validateItems(_valid, block) {
            gen.forRange("i", 0, len, (i) => {
                cxt.subschema({
                    keyword: "contains",
                    dataProp: i,
                    dataPropType: util_1$e.Type.Num,
                    compositeRule: true,
                }, _valid);
                block();
            });
        }
        function checkLimits(count) {
            gen.code((0, codegen_1$b._) `${count}++`);
            if (max === undefined) {
                gen.if((0, codegen_1$b._) `${count} >= ${min}`, () => gen.assign(valid, true).break());
            }
            else {
                gen.if((0, codegen_1$b._) `${count} > ${max}`, () => gen.assign(valid, false).break());
                if (min === 1)
                    gen.assign(valid, true);
                else
                    gen.if((0, codegen_1$b._) `${count} >= ${min}`, () => gen.assign(valid, true));
            }
        }
    },
};
contains.default = def$l;

var dependencies = {};

(function (exports) {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.validateSchemaDeps = exports.validatePropertyDeps = exports.error = void 0;
	const codegen_1 = codegen;
	const util_1 = util;
	const code_1 = code;
	exports.error = {
	    message: ({ params: { property, depsCount, deps } }) => {
	        const property_ies = depsCount === 1 ? "property" : "properties";
	        return (0, codegen_1.str) `must have ${property_ies} ${deps} when property ${property} is present`;
	    },
	    params: ({ params: { property, depsCount, deps, missingProperty } }) => (0, codegen_1._) `{property: ${property},
    missingProperty: ${missingProperty},
    depsCount: ${depsCount},
    deps: ${deps}}`, // TODO change to reference
	};
	const def = {
	    keyword: "dependencies",
	    type: "object",
	    schemaType: "object",
	    error: exports.error,
	    code(cxt) {
	        const [propDeps, schDeps] = splitDependencies(cxt);
	        validatePropertyDeps(cxt, propDeps);
	        validateSchemaDeps(cxt, schDeps);
	    },
	};
	function splitDependencies({ schema }) {
	    const propertyDeps = {};
	    const schemaDeps = {};
	    for (const key in schema) {
	        if (key === "__proto__")
	            continue;
	        const deps = Array.isArray(schema[key]) ? propertyDeps : schemaDeps;
	        deps[key] = schema[key];
	    }
	    return [propertyDeps, schemaDeps];
	}
	function validatePropertyDeps(cxt, propertyDeps = cxt.schema) {
	    const { gen, data, it } = cxt;
	    if (Object.keys(propertyDeps).length === 0)
	        return;
	    const missing = gen.let("missing");
	    for (const prop in propertyDeps) {
	        const deps = propertyDeps[prop];
	        if (deps.length === 0)
	            continue;
	        const hasProperty = (0, code_1.propertyInData)(gen, data, prop, it.opts.ownProperties);
	        cxt.setParams({
	            property: prop,
	            depsCount: deps.length,
	            deps: deps.join(", "),
	        });
	        if (it.allErrors) {
	            gen.if(hasProperty, () => {
	                for (const depProp of deps) {
	                    (0, code_1.checkReportMissingProp)(cxt, depProp);
	                }
	            });
	        }
	        else {
	            gen.if((0, codegen_1._) `${hasProperty} && (${(0, code_1.checkMissingProp)(cxt, deps, missing)})`);
	            (0, code_1.reportMissingProp)(cxt, missing);
	            gen.else();
	        }
	    }
	}
	exports.validatePropertyDeps = validatePropertyDeps;
	function validateSchemaDeps(cxt, schemaDeps = cxt.schema) {
	    const { gen, data, keyword, it } = cxt;
	    const valid = gen.name("valid");
	    for (const prop in schemaDeps) {
	        if ((0, util_1.alwaysValidSchema)(it, schemaDeps[prop]))
	            continue;
	        gen.if((0, code_1.propertyInData)(gen, data, prop, it.opts.ownProperties), () => {
	            const schCxt = cxt.subschema({ keyword, schemaProp: prop }, valid);
	            cxt.mergeValidEvaluated(schCxt, valid);
	        }, () => gen.var(valid, true) // TODO var
	        );
	        cxt.ok(valid);
	    }
	}
	exports.validateSchemaDeps = validateSchemaDeps;
	exports.default = def;
	
} (dependencies));

var propertyNames = {};

Object.defineProperty(propertyNames, "__esModule", { value: true });
const codegen_1$a = codegen;
const util_1$d = util;
const error$7 = {
    message: "property name must be valid",
    params: ({ params }) => (0, codegen_1$a._) `{propertyName: ${params.propertyName}}`,
};
const def$k = {
    keyword: "propertyNames",
    type: "object",
    schemaType: ["object", "boolean"],
    error: error$7,
    code(cxt) {
        const { gen, schema, data, it } = cxt;
        if ((0, util_1$d.alwaysValidSchema)(it, schema))
            return;
        const valid = gen.name("valid");
        gen.forIn("key", data, (key) => {
            cxt.setParams({ propertyName: key });
            cxt.subschema({
                keyword: "propertyNames",
                data: key,
                dataTypes: ["string"],
                propertyName: key,
                compositeRule: true,
            }, valid);
            gen.if((0, codegen_1$a.not)(valid), () => {
                cxt.error(true);
                if (!it.allErrors)
                    gen.break();
            });
        });
        cxt.ok(valid);
    },
};
propertyNames.default = def$k;

var additionalProperties = {};

Object.defineProperty(additionalProperties, "__esModule", { value: true });
const code_1$3 = code;
const codegen_1$9 = codegen;
const names_1$3 = names$1;
const util_1$c = util;
const error$6 = {
    message: "must NOT have additional properties",
    params: ({ params }) => (0, codegen_1$9._) `{additionalProperty: ${params.additionalProperty}}`,
};
const def$j = {
    keyword: "additionalProperties",
    type: ["object"],
    schemaType: ["boolean", "object"],
    allowUndefined: true,
    trackErrors: true,
    error: error$6,
    code(cxt) {
        const { gen, schema, parentSchema, data, errsCount, it } = cxt;
        /* istanbul ignore if */
        if (!errsCount)
            throw new Error("ajv implementation error");
        const { allErrors, opts } = it;
        it.props = true;
        if (opts.removeAdditional !== "all" && (0, util_1$c.alwaysValidSchema)(it, schema))
            return;
        const props = (0, code_1$3.allSchemaProperties)(parentSchema.properties);
        const patProps = (0, code_1$3.allSchemaProperties)(parentSchema.patternProperties);
        checkAdditionalProperties();
        cxt.ok((0, codegen_1$9._) `${errsCount} === ${names_1$3.default.errors}`);
        function checkAdditionalProperties() {
            gen.forIn("key", data, (key) => {
                if (!props.length && !patProps.length)
                    additionalPropertyCode(key);
                else
                    gen.if(isAdditional(key), () => additionalPropertyCode(key));
            });
        }
        function isAdditional(key) {
            let definedProp;
            if (props.length > 8) {
                // TODO maybe an option instead of hard-coded 8?
                const propsSchema = (0, util_1$c.schemaRefOrVal)(it, parentSchema.properties, "properties");
                definedProp = (0, code_1$3.isOwnProperty)(gen, propsSchema, key);
            }
            else if (props.length) {
                definedProp = (0, codegen_1$9.or)(...props.map((p) => (0, codegen_1$9._) `${key} === ${p}`));
            }
            else {
                definedProp = codegen_1$9.nil;
            }
            if (patProps.length) {
                definedProp = (0, codegen_1$9.or)(definedProp, ...patProps.map((p) => (0, codegen_1$9._) `${(0, code_1$3.usePattern)(cxt, p)}.test(${key})`));
            }
            return (0, codegen_1$9.not)(definedProp);
        }
        function deleteAdditional(key) {
            gen.code((0, codegen_1$9._) `delete ${data}[${key}]`);
        }
        function additionalPropertyCode(key) {
            if (opts.removeAdditional === "all" || (opts.removeAdditional && schema === false)) {
                deleteAdditional(key);
                return;
            }
            if (schema === false) {
                cxt.setParams({ additionalProperty: key });
                cxt.error();
                if (!allErrors)
                    gen.break();
                return;
            }
            if (typeof schema == "object" && !(0, util_1$c.alwaysValidSchema)(it, schema)) {
                const valid = gen.name("valid");
                if (opts.removeAdditional === "failing") {
                    applyAdditionalSchema(key, valid, false);
                    gen.if((0, codegen_1$9.not)(valid), () => {
                        cxt.reset();
                        deleteAdditional(key);
                    });
                }
                else {
                    applyAdditionalSchema(key, valid);
                    if (!allErrors)
                        gen.if((0, codegen_1$9.not)(valid), () => gen.break());
                }
            }
        }
        function applyAdditionalSchema(key, valid, errors) {
            const subschema = {
                keyword: "additionalProperties",
                dataProp: key,
                dataPropType: util_1$c.Type.Str,
            };
            if (errors === false) {
                Object.assign(subschema, {
                    compositeRule: true,
                    createErrors: false,
                    allErrors: false,
                });
            }
            cxt.subschema(subschema, valid);
        }
    },
};
additionalProperties.default = def$j;

var properties$9 = {};

Object.defineProperty(properties$9, "__esModule", { value: true });
const validate_1 = validate;
const code_1$2 = code;
const util_1$b = util;
const additionalProperties_1$1 = additionalProperties;
const def$i = {
    keyword: "properties",
    type: "object",
    schemaType: "object",
    code(cxt) {
        const { gen, schema, parentSchema, data, it } = cxt;
        if (it.opts.removeAdditional === "all" && parentSchema.additionalProperties === undefined) {
            additionalProperties_1$1.default.code(new validate_1.KeywordCxt(it, additionalProperties_1$1.default, "additionalProperties"));
        }
        const allProps = (0, code_1$2.allSchemaProperties)(schema);
        for (const prop of allProps) {
            it.definedProperties.add(prop);
        }
        if (it.opts.unevaluated && allProps.length && it.props !== true) {
            it.props = util_1$b.mergeEvaluated.props(gen, (0, util_1$b.toHash)(allProps), it.props);
        }
        const properties = allProps.filter((p) => !(0, util_1$b.alwaysValidSchema)(it, schema[p]));
        if (properties.length === 0)
            return;
        const valid = gen.name("valid");
        for (const prop of properties) {
            if (hasDefault(prop)) {
                applyPropertySchema(prop);
            }
            else {
                gen.if((0, code_1$2.propertyInData)(gen, data, prop, it.opts.ownProperties));
                applyPropertySchema(prop);
                if (!it.allErrors)
                    gen.else().var(valid, true);
                gen.endIf();
            }
            cxt.it.definedProperties.add(prop);
            cxt.ok(valid);
        }
        function hasDefault(prop) {
            return it.opts.useDefaults && !it.compositeRule && schema[prop].default !== undefined;
        }
        function applyPropertySchema(prop) {
            cxt.subschema({
                keyword: "properties",
                schemaProp: prop,
                dataProp: prop,
            }, valid);
        }
    },
};
properties$9.default = def$i;

var patternProperties = {};

Object.defineProperty(patternProperties, "__esModule", { value: true });
const code_1$1 = code;
const codegen_1$8 = codegen;
const util_1$a = util;
const util_2 = util;
const def$h = {
    keyword: "patternProperties",
    type: "object",
    schemaType: "object",
    code(cxt) {
        const { gen, schema, data, parentSchema, it } = cxt;
        const { opts } = it;
        const patterns = (0, code_1$1.allSchemaProperties)(schema);
        const alwaysValidPatterns = patterns.filter((p) => (0, util_1$a.alwaysValidSchema)(it, schema[p]));
        if (patterns.length === 0 ||
            (alwaysValidPatterns.length === patterns.length &&
                (!it.opts.unevaluated || it.props === true))) {
            return;
        }
        const checkProperties = opts.strictSchema && !opts.allowMatchingProperties && parentSchema.properties;
        const valid = gen.name("valid");
        if (it.props !== true && !(it.props instanceof codegen_1$8.Name)) {
            it.props = (0, util_2.evaluatedPropsToName)(gen, it.props);
        }
        const { props } = it;
        validatePatternProperties();
        function validatePatternProperties() {
            for (const pat of patterns) {
                if (checkProperties)
                    checkMatchingProperties(pat);
                if (it.allErrors) {
                    validateProperties(pat);
                }
                else {
                    gen.var(valid, true); // TODO var
                    validateProperties(pat);
                    gen.if(valid);
                }
            }
        }
        function checkMatchingProperties(pat) {
            for (const prop in checkProperties) {
                if (new RegExp(pat).test(prop)) {
                    (0, util_1$a.checkStrictMode)(it, `property ${prop} matches pattern ${pat} (use allowMatchingProperties)`);
                }
            }
        }
        function validateProperties(pat) {
            gen.forIn("key", data, (key) => {
                gen.if((0, codegen_1$8._) `${(0, code_1$1.usePattern)(cxt, pat)}.test(${key})`, () => {
                    const alwaysValid = alwaysValidPatterns.includes(pat);
                    if (!alwaysValid) {
                        cxt.subschema({
                            keyword: "patternProperties",
                            schemaProp: pat,
                            dataProp: key,
                            dataPropType: util_2.Type.Str,
                        }, valid);
                    }
                    if (it.opts.unevaluated && props !== true) {
                        gen.assign((0, codegen_1$8._) `${props}[${key}]`, true);
                    }
                    else if (!alwaysValid && !it.allErrors) {
                        // can short-circuit if `unevaluatedProperties` is not supported (opts.next === false)
                        // or if all properties were evaluated (props === true)
                        gen.if((0, codegen_1$8.not)(valid), () => gen.break());
                    }
                });
            });
        }
    },
};
patternProperties.default = def$h;

var not = {};

Object.defineProperty(not, "__esModule", { value: true });
const util_1$9 = util;
const def$g = {
    keyword: "not",
    schemaType: ["object", "boolean"],
    trackErrors: true,
    code(cxt) {
        const { gen, schema, it } = cxt;
        if ((0, util_1$9.alwaysValidSchema)(it, schema)) {
            cxt.fail();
            return;
        }
        const valid = gen.name("valid");
        cxt.subschema({
            keyword: "not",
            compositeRule: true,
            createErrors: false,
            allErrors: false,
        }, valid);
        cxt.failResult(valid, () => cxt.reset(), () => cxt.error());
    },
    error: { message: "must NOT be valid" },
};
not.default = def$g;

var anyOf = {};

Object.defineProperty(anyOf, "__esModule", { value: true });
const code_1 = code;
const def$f = {
    keyword: "anyOf",
    schemaType: "array",
    trackErrors: true,
    code: code_1.validateUnion,
    error: { message: "must match a schema in anyOf" },
};
anyOf.default = def$f;

var oneOf = {};

Object.defineProperty(oneOf, "__esModule", { value: true });
const codegen_1$7 = codegen;
const util_1$8 = util;
const error$5 = {
    message: "must match exactly one schema in oneOf",
    params: ({ params }) => (0, codegen_1$7._) `{passingSchemas: ${params.passing}}`,
};
const def$e = {
    keyword: "oneOf",
    schemaType: "array",
    trackErrors: true,
    error: error$5,
    code(cxt) {
        const { gen, schema, parentSchema, it } = cxt;
        /* istanbul ignore if */
        if (!Array.isArray(schema))
            throw new Error("ajv implementation error");
        if (it.opts.discriminator && parentSchema.discriminator)
            return;
        const schArr = schema;
        const valid = gen.let("valid", false);
        const passing = gen.let("passing", null);
        const schValid = gen.name("_valid");
        cxt.setParams({ passing });
        // TODO possibly fail straight away (with warning or exception) if there are two empty always valid schemas
        gen.block(validateOneOf);
        cxt.result(valid, () => cxt.reset(), () => cxt.error(true));
        function validateOneOf() {
            schArr.forEach((sch, i) => {
                let schCxt;
                if ((0, util_1$8.alwaysValidSchema)(it, sch)) {
                    gen.var(schValid, true);
                }
                else {
                    schCxt = cxt.subschema({
                        keyword: "oneOf",
                        schemaProp: i,
                        compositeRule: true,
                    }, schValid);
                }
                if (i > 0) {
                    gen
                        .if((0, codegen_1$7._) `${schValid} && ${valid}`)
                        .assign(valid, false)
                        .assign(passing, (0, codegen_1$7._) `[${passing}, ${i}]`)
                        .else();
                }
                gen.if(schValid, () => {
                    gen.assign(valid, true);
                    gen.assign(passing, i);
                    if (schCxt)
                        cxt.mergeEvaluated(schCxt, codegen_1$7.Name);
                });
            });
        }
    },
};
oneOf.default = def$e;

var allOf$1 = {};

Object.defineProperty(allOf$1, "__esModule", { value: true });
const util_1$7 = util;
const def$d = {
    keyword: "allOf",
    schemaType: "array",
    code(cxt) {
        const { gen, schema, it } = cxt;
        /* istanbul ignore if */
        if (!Array.isArray(schema))
            throw new Error("ajv implementation error");
        const valid = gen.name("valid");
        schema.forEach((sch, i) => {
            if ((0, util_1$7.alwaysValidSchema)(it, sch))
                return;
            const schCxt = cxt.subschema({ keyword: "allOf", schemaProp: i }, valid);
            cxt.ok(valid);
            cxt.mergeEvaluated(schCxt);
        });
    },
};
allOf$1.default = def$d;

var _if = {};

Object.defineProperty(_if, "__esModule", { value: true });
const codegen_1$6 = codegen;
const util_1$6 = util;
const error$4 = {
    message: ({ params }) => (0, codegen_1$6.str) `must match "${params.ifClause}" schema`,
    params: ({ params }) => (0, codegen_1$6._) `{failingKeyword: ${params.ifClause}}`,
};
const def$c = {
    keyword: "if",
    schemaType: ["object", "boolean"],
    trackErrors: true,
    error: error$4,
    code(cxt) {
        const { gen, parentSchema, it } = cxt;
        if (parentSchema.then === undefined && parentSchema.else === undefined) {
            (0, util_1$6.checkStrictMode)(it, '"if" without "then" and "else" is ignored');
        }
        const hasThen = hasSchema(it, "then");
        const hasElse = hasSchema(it, "else");
        if (!hasThen && !hasElse)
            return;
        const valid = gen.let("valid", true);
        const schValid = gen.name("_valid");
        validateIf();
        cxt.reset();
        if (hasThen && hasElse) {
            const ifClause = gen.let("ifClause");
            cxt.setParams({ ifClause });
            gen.if(schValid, validateClause("then", ifClause), validateClause("else", ifClause));
        }
        else if (hasThen) {
            gen.if(schValid, validateClause("then"));
        }
        else {
            gen.if((0, codegen_1$6.not)(schValid), validateClause("else"));
        }
        cxt.pass(valid, () => cxt.error(true));
        function validateIf() {
            const schCxt = cxt.subschema({
                keyword: "if",
                compositeRule: true,
                createErrors: false,
                allErrors: false,
            }, schValid);
            cxt.mergeEvaluated(schCxt);
        }
        function validateClause(keyword, ifClause) {
            return () => {
                const schCxt = cxt.subschema({ keyword }, schValid);
                gen.assign(valid, schValid);
                cxt.mergeValidEvaluated(schCxt, valid);
                if (ifClause)
                    gen.assign(ifClause, (0, codegen_1$6._) `${keyword}`);
                else
                    cxt.setParams({ ifClause: keyword });
            };
        }
    },
};
function hasSchema(it, keyword) {
    const schema = it.schema[keyword];
    return schema !== undefined && !(0, util_1$6.alwaysValidSchema)(it, schema);
}
_if.default = def$c;

var thenElse = {};

Object.defineProperty(thenElse, "__esModule", { value: true });
const util_1$5 = util;
const def$b = {
    keyword: ["then", "else"],
    schemaType: ["object", "boolean"],
    code({ keyword, parentSchema, it }) {
        if (parentSchema.if === undefined)
            (0, util_1$5.checkStrictMode)(it, `"${keyword}" without "if" is ignored`);
    },
};
thenElse.default = def$b;

Object.defineProperty(applicator$1, "__esModule", { value: true });
const additionalItems_1 = additionalItems;
const prefixItems_1 = prefixItems;
const items_1 = items;
const items2020_1 = items2020;
const contains_1 = contains;
const dependencies_1$2 = dependencies;
const propertyNames_1 = propertyNames;
const additionalProperties_1 = additionalProperties;
const properties_1 = properties$9;
const patternProperties_1 = patternProperties;
const not_1 = not;
const anyOf_1 = anyOf;
const oneOf_1 = oneOf;
const allOf_1 = allOf$1;
const if_1 = _if;
const thenElse_1 = thenElse;
function getApplicator(draft2020 = false) {
    const applicator = [
        // any
        not_1.default,
        anyOf_1.default,
        oneOf_1.default,
        allOf_1.default,
        if_1.default,
        thenElse_1.default,
        // object
        propertyNames_1.default,
        additionalProperties_1.default,
        dependencies_1$2.default,
        properties_1.default,
        patternProperties_1.default,
    ];
    // array
    if (draft2020)
        applicator.push(prefixItems_1.default, items2020_1.default);
    else
        applicator.push(additionalItems_1.default, items_1.default);
    applicator.push(contains_1.default);
    return applicator;
}
applicator$1.default = getApplicator;

var format$3 = {};

var format$2 = {};

Object.defineProperty(format$2, "__esModule", { value: true });
const codegen_1$5 = codegen;
const error$3 = {
    message: ({ schemaCode }) => (0, codegen_1$5.str) `must match format "${schemaCode}"`,
    params: ({ schemaCode }) => (0, codegen_1$5._) `{format: ${schemaCode}}`,
};
const def$a = {
    keyword: "format",
    type: ["number", "string"],
    schemaType: "string",
    $data: true,
    error: error$3,
    code(cxt, ruleType) {
        const { gen, data, $data, schema, schemaCode, it } = cxt;
        const { opts, errSchemaPath, schemaEnv, self } = it;
        if (!opts.validateFormats)
            return;
        if ($data)
            validate$DataFormat();
        else
            validateFormat();
        function validate$DataFormat() {
            const fmts = gen.scopeValue("formats", {
                ref: self.formats,
                code: opts.code.formats,
            });
            const fDef = gen.const("fDef", (0, codegen_1$5._) `${fmts}[${schemaCode}]`);
            const fType = gen.let("fType");
            const format = gen.let("format");
            // TODO simplify
            gen.if((0, codegen_1$5._) `typeof ${fDef} == "object" && !(${fDef} instanceof RegExp)`, () => gen.assign(fType, (0, codegen_1$5._) `${fDef}.type || "string"`).assign(format, (0, codegen_1$5._) `${fDef}.validate`), () => gen.assign(fType, (0, codegen_1$5._) `"string"`).assign(format, fDef));
            cxt.fail$data((0, codegen_1$5.or)(unknownFmt(), invalidFmt()));
            function unknownFmt() {
                if (opts.strictSchema === false)
                    return codegen_1$5.nil;
                return (0, codegen_1$5._) `${schemaCode} && !${format}`;
            }
            function invalidFmt() {
                const callFormat = schemaEnv.$async
                    ? (0, codegen_1$5._) `(${fDef}.async ? await ${format}(${data}) : ${format}(${data}))`
                    : (0, codegen_1$5._) `${format}(${data})`;
                const validData = (0, codegen_1$5._) `(typeof ${format} == "function" ? ${callFormat} : ${format}.test(${data}))`;
                return (0, codegen_1$5._) `${format} && ${format} !== true && ${fType} === ${ruleType} && !${validData}`;
            }
        }
        function validateFormat() {
            const formatDef = self.formats[schema];
            if (!formatDef) {
                unknownFormat();
                return;
            }
            if (formatDef === true)
                return;
            const [fmtType, format, fmtRef] = getFormat(formatDef);
            if (fmtType === ruleType)
                cxt.pass(validCondition());
            function unknownFormat() {
                if (opts.strictSchema === false) {
                    self.logger.warn(unknownMsg());
                    return;
                }
                throw new Error(unknownMsg());
                function unknownMsg() {
                    return `unknown format "${schema}" ignored in schema at path "${errSchemaPath}"`;
                }
            }
            function getFormat(fmtDef) {
                const code = fmtDef instanceof RegExp
                    ? (0, codegen_1$5.regexpCode)(fmtDef)
                    : opts.code.formats
                        ? (0, codegen_1$5._) `${opts.code.formats}${(0, codegen_1$5.getProperty)(schema)}`
                        : undefined;
                const fmt = gen.scopeValue("formats", { key: schema, ref: fmtDef, code });
                if (typeof fmtDef == "object" && !(fmtDef instanceof RegExp)) {
                    return [fmtDef.type || "string", fmtDef.validate, (0, codegen_1$5._) `${fmt}.validate`];
                }
                return ["string", fmtDef, fmt];
            }
            function validCondition() {
                if (typeof formatDef == "object" && !(formatDef instanceof RegExp) && formatDef.async) {
                    if (!schemaEnv.$async)
                        throw new Error("async format in sync schema");
                    return (0, codegen_1$5._) `await ${fmtRef}(${data})`;
                }
                return typeof format == "function" ? (0, codegen_1$5._) `${fmtRef}(${data})` : (0, codegen_1$5._) `${fmtRef}.test(${data})`;
            }
        }
    },
};
format$2.default = def$a;

Object.defineProperty(format$3, "__esModule", { value: true });
const format_1$2 = format$2;
const format$1 = [format_1$2.default];
format$3.default = format$1;

var metadata$1 = {};

Object.defineProperty(metadata$1, "__esModule", { value: true });
metadata$1.contentVocabulary = metadata$1.metadataVocabulary = void 0;
metadata$1.metadataVocabulary = [
    "title",
    "description",
    "default",
    "deprecated",
    "readOnly",
    "writeOnly",
    "examples",
];
metadata$1.contentVocabulary = [
    "contentMediaType",
    "contentEncoding",
    "contentSchema",
];

Object.defineProperty(draft7, "__esModule", { value: true });
const core_1$1 = core$2;
const validation_1$1 = validation$2;
const applicator_1$1 = applicator$1;
const format_1$1 = format$3;
const metadata_1$1 = metadata$1;
const draft7Vocabularies = [
    core_1$1.default,
    validation_1$1.default,
    (0, applicator_1$1.default)(),
    format_1$1.default,
    metadata_1$1.metadataVocabulary,
    metadata_1$1.contentVocabulary,
];
draft7.default = draft7Vocabularies;

var discriminator = {};

var types = {};

Object.defineProperty(types, "__esModule", { value: true });
types.DiscrError = void 0;
var DiscrError;
(function (DiscrError) {
    DiscrError["Tag"] = "tag";
    DiscrError["Mapping"] = "mapping";
})(DiscrError || (types.DiscrError = DiscrError = {}));

Object.defineProperty(discriminator, "__esModule", { value: true });
const codegen_1$4 = codegen;
const types_1 = types;
const compile_1$1 = compile;
const ref_error_1 = ref_error;
const util_1$4 = util;
const error$2 = {
    message: ({ params: { discrError, tagName } }) => discrError === types_1.DiscrError.Tag
        ? `tag "${tagName}" must be string`
        : `value of tag "${tagName}" must be in oneOf`,
    params: ({ params: { discrError, tag, tagName } }) => (0, codegen_1$4._) `{error: ${discrError}, tag: ${tagName}, tagValue: ${tag}}`,
};
const def$9 = {
    keyword: "discriminator",
    type: "object",
    schemaType: "object",
    error: error$2,
    code(cxt) {
        const { gen, data, schema, parentSchema, it } = cxt;
        const { oneOf } = parentSchema;
        if (!it.opts.discriminator) {
            throw new Error("discriminator: requires discriminator option");
        }
        const tagName = schema.propertyName;
        if (typeof tagName != "string")
            throw new Error("discriminator: requires propertyName");
        if (schema.mapping)
            throw new Error("discriminator: mapping is not supported");
        if (!oneOf)
            throw new Error("discriminator: requires oneOf keyword");
        const valid = gen.let("valid", false);
        const tag = gen.const("tag", (0, codegen_1$4._) `${data}${(0, codegen_1$4.getProperty)(tagName)}`);
        gen.if((0, codegen_1$4._) `typeof ${tag} == "string"`, () => validateMapping(), () => cxt.error(false, { discrError: types_1.DiscrError.Tag, tag, tagName }));
        cxt.ok(valid);
        function validateMapping() {
            const mapping = getMapping();
            gen.if(false);
            for (const tagValue in mapping) {
                gen.elseIf((0, codegen_1$4._) `${tag} === ${tagValue}`);
                gen.assign(valid, applyTagSchema(mapping[tagValue]));
            }
            gen.else();
            cxt.error(false, { discrError: types_1.DiscrError.Mapping, tag, tagName });
            gen.endIf();
        }
        function applyTagSchema(schemaProp) {
            const _valid = gen.name("valid");
            const schCxt = cxt.subschema({ keyword: "oneOf", schemaProp }, _valid);
            cxt.mergeEvaluated(schCxt, codegen_1$4.Name);
            return _valid;
        }
        function getMapping() {
            var _a;
            const oneOfMapping = {};
            const topRequired = hasRequired(parentSchema);
            let tagRequired = true;
            for (let i = 0; i < oneOf.length; i++) {
                let sch = oneOf[i];
                if ((sch === null || sch === void 0 ? void 0 : sch.$ref) && !(0, util_1$4.schemaHasRulesButRef)(sch, it.self.RULES)) {
                    const ref = sch.$ref;
                    sch = compile_1$1.resolveRef.call(it.self, it.schemaEnv.root, it.baseId, ref);
                    if (sch instanceof compile_1$1.SchemaEnv)
                        sch = sch.schema;
                    if (sch === undefined)
                        throw new ref_error_1.default(it.opts.uriResolver, it.baseId, ref);
                }
                const propSch = (_a = sch === null || sch === void 0 ? void 0 : sch.properties) === null || _a === void 0 ? void 0 : _a[tagName];
                if (typeof propSch != "object") {
                    throw new Error(`discriminator: oneOf subschemas (or referenced schemas) must have "properties/${tagName}"`);
                }
                tagRequired = tagRequired && (topRequired || hasRequired(sch));
                addMappings(propSch, i);
            }
            if (!tagRequired)
                throw new Error(`discriminator: "${tagName}" must be required`);
            return oneOfMapping;
            function hasRequired({ required }) {
                return Array.isArray(required) && required.includes(tagName);
            }
            function addMappings(sch, i) {
                if (sch.const) {
                    addMapping(sch.const, i);
                }
                else if (sch.enum) {
                    for (const tagValue of sch.enum) {
                        addMapping(tagValue, i);
                    }
                }
                else {
                    throw new Error(`discriminator: "properties/${tagName}" must have "const" or "enum"`);
                }
            }
            function addMapping(tagValue, i) {
                if (typeof tagValue != "string" || tagValue in oneOfMapping) {
                    throw new Error(`discriminator: "${tagName}" values must be unique strings`);
                }
                oneOfMapping[tagValue] = i;
            }
        }
    },
};
discriminator.default = def$9;

var $schema$8 = "http://json-schema.org/draft-07/schema#";
var $id$8 = "http://json-schema.org/draft-07/schema#";
var title$8 = "Core schema meta-schema";
var definitions = {
	schemaArray: {
		type: "array",
		minItems: 1,
		items: {
			$ref: "#"
		}
	},
	nonNegativeInteger: {
		type: "integer",
		minimum: 0
	},
	nonNegativeIntegerDefault0: {
		allOf: [
			{
				$ref: "#/definitions/nonNegativeInteger"
			},
			{
				"default": 0
			}
		]
	},
	simpleTypes: {
		"enum": [
			"array",
			"boolean",
			"integer",
			"null",
			"number",
			"object",
			"string"
		]
	},
	stringArray: {
		type: "array",
		items: {
			type: "string"
		},
		uniqueItems: true,
		"default": [
		]
	}
};
var type$8 = [
	"object",
	"boolean"
];
var properties$8 = {
	$id: {
		type: "string",
		format: "uri-reference"
	},
	$schema: {
		type: "string",
		format: "uri"
	},
	$ref: {
		type: "string",
		format: "uri-reference"
	},
	$comment: {
		type: "string"
	},
	title: {
		type: "string"
	},
	description: {
		type: "string"
	},
	"default": true,
	readOnly: {
		type: "boolean",
		"default": false
	},
	examples: {
		type: "array",
		items: true
	},
	multipleOf: {
		type: "number",
		exclusiveMinimum: 0
	},
	maximum: {
		type: "number"
	},
	exclusiveMaximum: {
		type: "number"
	},
	minimum: {
		type: "number"
	},
	exclusiveMinimum: {
		type: "number"
	},
	maxLength: {
		$ref: "#/definitions/nonNegativeInteger"
	},
	minLength: {
		$ref: "#/definitions/nonNegativeIntegerDefault0"
	},
	pattern: {
		type: "string",
		format: "regex"
	},
	additionalItems: {
		$ref: "#"
	},
	items: {
		anyOf: [
			{
				$ref: "#"
			},
			{
				$ref: "#/definitions/schemaArray"
			}
		],
		"default": true
	},
	maxItems: {
		$ref: "#/definitions/nonNegativeInteger"
	},
	minItems: {
		$ref: "#/definitions/nonNegativeIntegerDefault0"
	},
	uniqueItems: {
		type: "boolean",
		"default": false
	},
	contains: {
		$ref: "#"
	},
	maxProperties: {
		$ref: "#/definitions/nonNegativeInteger"
	},
	minProperties: {
		$ref: "#/definitions/nonNegativeIntegerDefault0"
	},
	required: {
		$ref: "#/definitions/stringArray"
	},
	additionalProperties: {
		$ref: "#"
	},
	definitions: {
		type: "object",
		additionalProperties: {
			$ref: "#"
		},
		"default": {
		}
	},
	properties: {
		type: "object",
		additionalProperties: {
			$ref: "#"
		},
		"default": {
		}
	},
	patternProperties: {
		type: "object",
		additionalProperties: {
			$ref: "#"
		},
		propertyNames: {
			format: "regex"
		},
		"default": {
		}
	},
	dependencies: {
		type: "object",
		additionalProperties: {
			anyOf: [
				{
					$ref: "#"
				},
				{
					$ref: "#/definitions/stringArray"
				}
			]
		}
	},
	propertyNames: {
		$ref: "#"
	},
	"const": true,
	"enum": {
		type: "array",
		items: true,
		minItems: 1,
		uniqueItems: true
	},
	type: {
		anyOf: [
			{
				$ref: "#/definitions/simpleTypes"
			},
			{
				type: "array",
				items: {
					$ref: "#/definitions/simpleTypes"
				},
				minItems: 1,
				uniqueItems: true
			}
		]
	},
	format: {
		type: "string"
	},
	contentMediaType: {
		type: "string"
	},
	contentEncoding: {
		type: "string"
	},
	"if": {
		$ref: "#"
	},
	then: {
		$ref: "#"
	},
	"else": {
		$ref: "#"
	},
	allOf: {
		$ref: "#/definitions/schemaArray"
	},
	anyOf: {
		$ref: "#/definitions/schemaArray"
	},
	oneOf: {
		$ref: "#/definitions/schemaArray"
	},
	not: {
		$ref: "#"
	}
};
var require$$3$1 = {
	$schema: $schema$8,
	$id: $id$8,
	title: title$8,
	definitions: definitions,
	type: type$8,
	properties: properties$8,
	"default": true
};

(function (module, exports) {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.MissingRefError = exports.ValidationError = exports.CodeGen = exports.Name = exports.nil = exports.stringify = exports.str = exports._ = exports.KeywordCxt = exports.Ajv = void 0;
	const core_1 = core$3;
	const draft7_1 = draft7;
	const discriminator_1 = discriminator;
	const draft7MetaSchema = require$$3$1;
	const META_SUPPORT_DATA = ["/properties"];
	const META_SCHEMA_ID = "http://json-schema.org/draft-07/schema";
	class Ajv extends core_1.default {
	    _addVocabularies() {
	        super._addVocabularies();
	        draft7_1.default.forEach((v) => this.addVocabulary(v));
	        if (this.opts.discriminator)
	            this.addKeyword(discriminator_1.default);
	    }
	    _addDefaultMetaSchema() {
	        super._addDefaultMetaSchema();
	        if (!this.opts.meta)
	            return;
	        const metaSchema = this.opts.$data
	            ? this.$dataMetaSchema(draft7MetaSchema, META_SUPPORT_DATA)
	            : draft7MetaSchema;
	        this.addMetaSchema(metaSchema, META_SCHEMA_ID, false);
	        this.refs["http://json-schema.org/schema"] = META_SCHEMA_ID;
	    }
	    defaultMeta() {
	        return (this.opts.defaultMeta =
	            super.defaultMeta() || (this.getSchema(META_SCHEMA_ID) ? META_SCHEMA_ID : undefined));
	    }
	}
	exports.Ajv = Ajv;
	module.exports = exports = Ajv;
	module.exports.Ajv = Ajv;
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = Ajv;
	var validate_1 = validate;
	Object.defineProperty(exports, "KeywordCxt", { enumerable: true, get: function () { return validate_1.KeywordCxt; } });
	var codegen_1 = codegen;
	Object.defineProperty(exports, "_", { enumerable: true, get: function () { return codegen_1._; } });
	Object.defineProperty(exports, "str", { enumerable: true, get: function () { return codegen_1.str; } });
	Object.defineProperty(exports, "stringify", { enumerable: true, get: function () { return codegen_1.stringify; } });
	Object.defineProperty(exports, "nil", { enumerable: true, get: function () { return codegen_1.nil; } });
	Object.defineProperty(exports, "Name", { enumerable: true, get: function () { return codegen_1.Name; } });
	Object.defineProperty(exports, "CodeGen", { enumerable: true, get: function () { return codegen_1.CodeGen; } });
	var validation_error_1 = validation_error;
	Object.defineProperty(exports, "ValidationError", { enumerable: true, get: function () { return validation_error_1.default; } });
	var ref_error_1 = ref_error;
	Object.defineProperty(exports, "MissingRefError", { enumerable: true, get: function () { return ref_error_1.default; } });
	
} (ajv, ajv.exports));

var ajvExports = ajv.exports;

(function (exports) {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.formatLimitDefinition = void 0;
	const ajv_1 = ajvExports;
	const codegen_1 = codegen;
	const ops = codegen_1.operators;
	const KWDs = {
	    formatMaximum: { okStr: "<=", ok: ops.LTE, fail: ops.GT },
	    formatMinimum: { okStr: ">=", ok: ops.GTE, fail: ops.LT },
	    formatExclusiveMaximum: { okStr: "<", ok: ops.LT, fail: ops.GTE },
	    formatExclusiveMinimum: { okStr: ">", ok: ops.GT, fail: ops.LTE },
	};
	const error = {
	    message: ({ keyword, schemaCode }) => codegen_1.str `should be ${KWDs[keyword].okStr} ${schemaCode}`,
	    params: ({ keyword, schemaCode }) => codegen_1._ `{comparison: ${KWDs[keyword].okStr}, limit: ${schemaCode}}`,
	};
	exports.formatLimitDefinition = {
	    keyword: Object.keys(KWDs),
	    type: "string",
	    schemaType: "string",
	    $data: true,
	    error,
	    code(cxt) {
	        const { gen, data, schemaCode, keyword, it } = cxt;
	        const { opts, self } = it;
	        if (!opts.validateFormats)
	            return;
	        const fCxt = new ajv_1.KeywordCxt(it, self.RULES.all.format.definition, "format");
	        if (fCxt.$data)
	            validate$DataFormat();
	        else
	            validateFormat();
	        function validate$DataFormat() {
	            const fmts = gen.scopeValue("formats", {
	                ref: self.formats,
	                code: opts.code.formats,
	            });
	            const fmt = gen.const("fmt", codegen_1._ `${fmts}[${fCxt.schemaCode}]`);
	            cxt.fail$data(codegen_1.or(codegen_1._ `typeof ${fmt} != "object"`, codegen_1._ `${fmt} instanceof RegExp`, codegen_1._ `typeof ${fmt}.compare != "function"`, compareCode(fmt)));
	        }
	        function validateFormat() {
	            const format = fCxt.schema;
	            const fmtDef = self.formats[format];
	            if (!fmtDef || fmtDef === true)
	                return;
	            if (typeof fmtDef != "object" ||
	                fmtDef instanceof RegExp ||
	                typeof fmtDef.compare != "function") {
	                throw new Error(`"${keyword}": format "${format}" does not define "compare" function`);
	            }
	            const fmt = gen.scopeValue("formats", {
	                key: format,
	                ref: fmtDef,
	                code: opts.code.formats ? codegen_1._ `${opts.code.formats}${codegen_1.getProperty(format)}` : undefined,
	            });
	            cxt.fail$data(compareCode(fmt));
	        }
	        function compareCode(fmt) {
	            return codegen_1._ `${fmt}.compare(${data}, ${schemaCode}) ${KWDs[keyword].fail} 0`;
	        }
	    },
	    dependencies: ["format"],
	};
	const formatLimitPlugin = (ajv) => {
	    ajv.addKeyword(exports.formatLimitDefinition);
	    return ajv;
	};
	exports.default = formatLimitPlugin;
	
} (limit));

(function (module, exports) {
	Object.defineProperty(exports, "__esModule", { value: true });
	const formats_1 = formats;
	const limit_1 = limit;
	const codegen_1 = codegen;
	const fullName = new codegen_1.Name("fullFormats");
	const fastName = new codegen_1.Name("fastFormats");
	const formatsPlugin = (ajv, opts = { keywords: true }) => {
	    if (Array.isArray(opts)) {
	        addFormats(ajv, opts, formats_1.fullFormats, fullName);
	        return ajv;
	    }
	    const [formats, exportName] = opts.mode === "fast" ? [formats_1.fastFormats, fastName] : [formats_1.fullFormats, fullName];
	    const list = opts.formats || formats_1.formatNames;
	    addFormats(ajv, list, formats, exportName);
	    if (opts.keywords)
	        limit_1.default(ajv);
	    return ajv;
	};
	formatsPlugin.get = (name, mode = "full") => {
	    const formats = mode === "fast" ? formats_1.fastFormats : formats_1.fullFormats;
	    const f = formats[name];
	    if (!f)
	        throw new Error(`Unknown format "${name}"`);
	    return f;
	};
	function addFormats(ajv, list, fs, exportName) {
	    var _a;
	    var _b;
	    (_a = (_b = ajv.opts.code).formats) !== null && _a !== void 0 ? _a : (_b.formats = codegen_1._ `require("ajv-formats/dist/formats").${exportName}`);
	    for (const f of list)
	        ajv.addFormat(f, fs[f]);
	}
	module.exports = exports = formatsPlugin;
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = formatsPlugin;
	
} (dist, dist.exports));

var distExports = dist.exports;
var addFormats = /*@__PURE__*/getDefaultExportFromCjs(distExports);

var _2020 = {exports: {}};

var draft2020 = {};

var dynamic$1 = {};

var dynamicAnchor$1 = {};

Object.defineProperty(dynamicAnchor$1, "__esModule", { value: true });
dynamicAnchor$1.dynamicAnchor = void 0;
const codegen_1$3 = codegen;
const names_1$2 = names$1;
const compile_1 = compile;
const ref_1$1 = ref;
const def$8 = {
    keyword: "$dynamicAnchor",
    schemaType: "string",
    code: (cxt) => dynamicAnchor(cxt, cxt.schema),
};
function dynamicAnchor(cxt, anchor) {
    const { gen, it } = cxt;
    it.schemaEnv.root.dynamicAnchors[anchor] = true;
    const v = (0, codegen_1$3._) `${names_1$2.default.dynamicAnchors}${(0, codegen_1$3.getProperty)(anchor)}`;
    const validate = it.errSchemaPath === "#" ? it.validateName : _getValidate(cxt);
    gen.if((0, codegen_1$3._) `!${v}`, () => gen.assign(v, validate));
}
dynamicAnchor$1.dynamicAnchor = dynamicAnchor;
function _getValidate(cxt) {
    const { schemaEnv, schema, self } = cxt.it;
    const { root, baseId, localRefs, meta } = schemaEnv.root;
    const { schemaId } = self.opts;
    const sch = new compile_1.SchemaEnv({ schema, schemaId, root, baseId, localRefs, meta });
    compile_1.compileSchema.call(self, sch);
    return (0, ref_1$1.getValidate)(cxt, sch);
}
dynamicAnchor$1.default = def$8;

var dynamicRef$1 = {};

Object.defineProperty(dynamicRef$1, "__esModule", { value: true });
dynamicRef$1.dynamicRef = void 0;
const codegen_1$2 = codegen;
const names_1$1 = names$1;
const ref_1 = ref;
const def$7 = {
    keyword: "$dynamicRef",
    schemaType: "string",
    code: (cxt) => dynamicRef(cxt, cxt.schema),
};
function dynamicRef(cxt, ref) {
    const { gen, keyword, it } = cxt;
    if (ref[0] !== "#")
        throw new Error(`"${keyword}" only supports hash fragment reference`);
    const anchor = ref.slice(1);
    if (it.allErrors) {
        _dynamicRef();
    }
    else {
        const valid = gen.let("valid", false);
        _dynamicRef(valid);
        cxt.ok(valid);
    }
    function _dynamicRef(valid) {
        // TODO the assumption here is that `recursiveRef: #` always points to the root
        // of the schema object, which is not correct, because there may be $id that
        // makes # point to it, and the target schema may not contain dynamic/recursiveAnchor.
        // Because of that 2 tests in recursiveRef.json fail.
        // This is a similar problem to #815 (`$id` doesn't alter resolution scope for `{ "$ref": "#" }`).
        // (This problem is not tested in JSON-Schema-Test-Suite)
        if (it.schemaEnv.root.dynamicAnchors[anchor]) {
            const v = gen.let("_v", (0, codegen_1$2._) `${names_1$1.default.dynamicAnchors}${(0, codegen_1$2.getProperty)(anchor)}`);
            gen.if(v, _callRef(v, valid), _callRef(it.validateName, valid));
        }
        else {
            _callRef(it.validateName, valid)();
        }
    }
    function _callRef(validate, valid) {
        return valid
            ? () => gen.block(() => {
                (0, ref_1.callRef)(cxt, validate);
                gen.let(valid, true);
            })
            : () => (0, ref_1.callRef)(cxt, validate);
    }
}
dynamicRef$1.dynamicRef = dynamicRef;
dynamicRef$1.default = def$7;

var recursiveAnchor = {};

Object.defineProperty(recursiveAnchor, "__esModule", { value: true });
const dynamicAnchor_1$1 = dynamicAnchor$1;
const util_1$3 = util;
const def$6 = {
    keyword: "$recursiveAnchor",
    schemaType: "boolean",
    code(cxt) {
        if (cxt.schema)
            (0, dynamicAnchor_1$1.dynamicAnchor)(cxt, "");
        else
            (0, util_1$3.checkStrictMode)(cxt.it, "$recursiveAnchor: false is ignored");
    },
};
recursiveAnchor.default = def$6;

var recursiveRef = {};

Object.defineProperty(recursiveRef, "__esModule", { value: true });
const dynamicRef_1$1 = dynamicRef$1;
const def$5 = {
    keyword: "$recursiveRef",
    schemaType: "string",
    code: (cxt) => (0, dynamicRef_1$1.dynamicRef)(cxt, cxt.schema),
};
recursiveRef.default = def$5;

Object.defineProperty(dynamic$1, "__esModule", { value: true });
const dynamicAnchor_1 = dynamicAnchor$1;
const dynamicRef_1 = dynamicRef$1;
const recursiveAnchor_1 = recursiveAnchor;
const recursiveRef_1 = recursiveRef;
const dynamic = [dynamicAnchor_1.default, dynamicRef_1.default, recursiveAnchor_1.default, recursiveRef_1.default];
dynamic$1.default = dynamic;

var next$1 = {};

var dependentRequired = {};

Object.defineProperty(dependentRequired, "__esModule", { value: true });
const dependencies_1$1 = dependencies;
const def$4 = {
    keyword: "dependentRequired",
    type: "object",
    schemaType: "object",
    error: dependencies_1$1.error,
    code: (cxt) => (0, dependencies_1$1.validatePropertyDeps)(cxt),
};
dependentRequired.default = def$4;

var dependentSchemas = {};

Object.defineProperty(dependentSchemas, "__esModule", { value: true });
const dependencies_1 = dependencies;
const def$3 = {
    keyword: "dependentSchemas",
    type: "object",
    schemaType: "object",
    code: (cxt) => (0, dependencies_1.validateSchemaDeps)(cxt),
};
dependentSchemas.default = def$3;

var limitContains = {};

Object.defineProperty(limitContains, "__esModule", { value: true });
const util_1$2 = util;
const def$2 = {
    keyword: ["maxContains", "minContains"],
    type: "array",
    schemaType: "number",
    code({ keyword, parentSchema, it }) {
        if (parentSchema.contains === undefined) {
            (0, util_1$2.checkStrictMode)(it, `"${keyword}" without "contains" is ignored`);
        }
    },
};
limitContains.default = def$2;

Object.defineProperty(next$1, "__esModule", { value: true });
const dependentRequired_1 = dependentRequired;
const dependentSchemas_1 = dependentSchemas;
const limitContains_1 = limitContains;
const next = [dependentRequired_1.default, dependentSchemas_1.default, limitContains_1.default];
next$1.default = next;

var unevaluated$2 = {};

var unevaluatedProperties = {};

Object.defineProperty(unevaluatedProperties, "__esModule", { value: true });
const codegen_1$1 = codegen;
const util_1$1 = util;
const names_1 = names$1;
const error$1 = {
    message: "must NOT have unevaluated properties",
    params: ({ params }) => (0, codegen_1$1._) `{unevaluatedProperty: ${params.unevaluatedProperty}}`,
};
const def$1 = {
    keyword: "unevaluatedProperties",
    type: "object",
    schemaType: ["boolean", "object"],
    trackErrors: true,
    error: error$1,
    code(cxt) {
        const { gen, schema, data, errsCount, it } = cxt;
        /* istanbul ignore if */
        if (!errsCount)
            throw new Error("ajv implementation error");
        const { allErrors, props } = it;
        if (props instanceof codegen_1$1.Name) {
            gen.if((0, codegen_1$1._) `${props} !== true`, () => gen.forIn("key", data, (key) => gen.if(unevaluatedDynamic(props, key), () => unevaluatedPropCode(key))));
        }
        else if (props !== true) {
            gen.forIn("key", data, (key) => props === undefined
                ? unevaluatedPropCode(key)
                : gen.if(unevaluatedStatic(props, key), () => unevaluatedPropCode(key)));
        }
        it.props = true;
        cxt.ok((0, codegen_1$1._) `${errsCount} === ${names_1.default.errors}`);
        function unevaluatedPropCode(key) {
            if (schema === false) {
                cxt.setParams({ unevaluatedProperty: key });
                cxt.error();
                if (!allErrors)
                    gen.break();
                return;
            }
            if (!(0, util_1$1.alwaysValidSchema)(it, schema)) {
                const valid = gen.name("valid");
                cxt.subschema({
                    keyword: "unevaluatedProperties",
                    dataProp: key,
                    dataPropType: util_1$1.Type.Str,
                }, valid);
                if (!allErrors)
                    gen.if((0, codegen_1$1.not)(valid), () => gen.break());
            }
        }
        function unevaluatedDynamic(evaluatedProps, key) {
            return (0, codegen_1$1._) `!${evaluatedProps} || !${evaluatedProps}[${key}]`;
        }
        function unevaluatedStatic(evaluatedProps, key) {
            const ps = [];
            for (const p in evaluatedProps) {
                if (evaluatedProps[p] === true)
                    ps.push((0, codegen_1$1._) `${key} !== ${p}`);
            }
            return (0, codegen_1$1.and)(...ps);
        }
    },
};
unevaluatedProperties.default = def$1;

var unevaluatedItems = {};

Object.defineProperty(unevaluatedItems, "__esModule", { value: true });
const codegen_1 = codegen;
const util_1 = util;
const error = {
    message: ({ params: { len } }) => (0, codegen_1.str) `must NOT have more than ${len} items`,
    params: ({ params: { len } }) => (0, codegen_1._) `{limit: ${len}}`,
};
const def = {
    keyword: "unevaluatedItems",
    type: "array",
    schemaType: ["boolean", "object"],
    error,
    code(cxt) {
        const { gen, schema, data, it } = cxt;
        const items = it.items || 0;
        if (items === true)
            return;
        const len = gen.const("len", (0, codegen_1._) `${data}.length`);
        if (schema === false) {
            cxt.setParams({ len: items });
            cxt.fail((0, codegen_1._) `${len} > ${items}`);
        }
        else if (typeof schema == "object" && !(0, util_1.alwaysValidSchema)(it, schema)) {
            const valid = gen.var("valid", (0, codegen_1._) `${len} <= ${items}`);
            gen.if((0, codegen_1.not)(valid), () => validateItems(valid, items));
            cxt.ok(valid);
        }
        it.items = true;
        function validateItems(valid, from) {
            gen.forRange("i", from, len, (i) => {
                cxt.subschema({ keyword: "unevaluatedItems", dataProp: i, dataPropType: util_1.Type.Num }, valid);
                if (!it.allErrors)
                    gen.if((0, codegen_1.not)(valid), () => gen.break());
            });
        }
    },
};
unevaluatedItems.default = def;

Object.defineProperty(unevaluated$2, "__esModule", { value: true });
const unevaluatedProperties_1 = unevaluatedProperties;
const unevaluatedItems_1 = unevaluatedItems;
const unevaluated$1 = [unevaluatedProperties_1.default, unevaluatedItems_1.default];
unevaluated$2.default = unevaluated$1;

Object.defineProperty(draft2020, "__esModule", { value: true });
const core_1 = core$2;
const validation_1 = validation$2;
const applicator_1 = applicator$1;
const dynamic_1 = dynamic$1;
const next_1 = next$1;
const unevaluated_1 = unevaluated$2;
const format_1 = format$3;
const metadata_1 = metadata$1;
const draft2020Vocabularies = [
    dynamic_1.default,
    core_1.default,
    validation_1.default,
    (0, applicator_1.default)(true),
    format_1.default,
    metadata_1.metadataVocabulary,
    metadata_1.contentVocabulary,
    next_1.default,
    unevaluated_1.default,
];
draft2020.default = draft2020Vocabularies;

var jsonSchema202012 = {};

var $schema$7 = "https://json-schema.org/draft/2020-12/schema";
var $id$7 = "https://json-schema.org/draft/2020-12/schema";
var $vocabulary$7 = {
	"https://json-schema.org/draft/2020-12/vocab/core": true,
	"https://json-schema.org/draft/2020-12/vocab/applicator": true,
	"https://json-schema.org/draft/2020-12/vocab/unevaluated": true,
	"https://json-schema.org/draft/2020-12/vocab/validation": true,
	"https://json-schema.org/draft/2020-12/vocab/meta-data": true,
	"https://json-schema.org/draft/2020-12/vocab/format-annotation": true,
	"https://json-schema.org/draft/2020-12/vocab/content": true
};
var $dynamicAnchor$7 = "meta";
var title$7 = "Core and Validation specifications meta-schema";
var allOf = [
	{
		$ref: "meta/core"
	},
	{
		$ref: "meta/applicator"
	},
	{
		$ref: "meta/unevaluated"
	},
	{
		$ref: "meta/validation"
	},
	{
		$ref: "meta/meta-data"
	},
	{
		$ref: "meta/format-annotation"
	},
	{
		$ref: "meta/content"
	}
];
var type$7 = [
	"object",
	"boolean"
];
var $comment = "This meta-schema also defines keywords that have appeared in previous drafts in order to prevent incompatible extensions as they remain in common use.";
var properties$7 = {
	definitions: {
		$comment: "\"definitions\" has been replaced by \"$defs\".",
		type: "object",
		additionalProperties: {
			$dynamicRef: "#meta"
		},
		deprecated: true,
		"default": {
		}
	},
	dependencies: {
		$comment: "\"dependencies\" has been split and replaced by \"dependentSchemas\" and \"dependentRequired\" in order to serve their differing semantics.",
		type: "object",
		additionalProperties: {
			anyOf: [
				{
					$dynamicRef: "#meta"
				},
				{
					$ref: "meta/validation#/$defs/stringArray"
				}
			]
		},
		deprecated: true,
		"default": {
		}
	},
	$recursiveAnchor: {
		$comment: "\"$recursiveAnchor\" has been replaced by \"$dynamicAnchor\".",
		$ref: "meta/core#/$defs/anchorString",
		deprecated: true
	},
	$recursiveRef: {
		$comment: "\"$recursiveRef\" has been replaced by \"$dynamicRef\".",
		$ref: "meta/core#/$defs/uriReferenceString",
		deprecated: true
	}
};
var require$$0 = {
	$schema: $schema$7,
	$id: $id$7,
	$vocabulary: $vocabulary$7,
	$dynamicAnchor: $dynamicAnchor$7,
	title: title$7,
	allOf: allOf,
	type: type$7,
	$comment: $comment,
	properties: properties$7
};

var $schema$6 = "https://json-schema.org/draft/2020-12/schema";
var $id$6 = "https://json-schema.org/draft/2020-12/meta/applicator";
var $vocabulary$6 = {
	"https://json-schema.org/draft/2020-12/vocab/applicator": true
};
var $dynamicAnchor$6 = "meta";
var title$6 = "Applicator vocabulary meta-schema";
var type$6 = [
	"object",
	"boolean"
];
var properties$6 = {
	prefixItems: {
		$ref: "#/$defs/schemaArray"
	},
	items: {
		$dynamicRef: "#meta"
	},
	contains: {
		$dynamicRef: "#meta"
	},
	additionalProperties: {
		$dynamicRef: "#meta"
	},
	properties: {
		type: "object",
		additionalProperties: {
			$dynamicRef: "#meta"
		},
		"default": {
		}
	},
	patternProperties: {
		type: "object",
		additionalProperties: {
			$dynamicRef: "#meta"
		},
		propertyNames: {
			format: "regex"
		},
		"default": {
		}
	},
	dependentSchemas: {
		type: "object",
		additionalProperties: {
			$dynamicRef: "#meta"
		},
		"default": {
		}
	},
	propertyNames: {
		$dynamicRef: "#meta"
	},
	"if": {
		$dynamicRef: "#meta"
	},
	then: {
		$dynamicRef: "#meta"
	},
	"else": {
		$dynamicRef: "#meta"
	},
	allOf: {
		$ref: "#/$defs/schemaArray"
	},
	anyOf: {
		$ref: "#/$defs/schemaArray"
	},
	oneOf: {
		$ref: "#/$defs/schemaArray"
	},
	not: {
		$dynamicRef: "#meta"
	}
};
var $defs$2 = {
	schemaArray: {
		type: "array",
		minItems: 1,
		items: {
			$dynamicRef: "#meta"
		}
	}
};
var require$$1 = {
	$schema: $schema$6,
	$id: $id$6,
	$vocabulary: $vocabulary$6,
	$dynamicAnchor: $dynamicAnchor$6,
	title: title$6,
	type: type$6,
	properties: properties$6,
	$defs: $defs$2
};

var $schema$5 = "https://json-schema.org/draft/2020-12/schema";
var $id$5 = "https://json-schema.org/draft/2020-12/meta/unevaluated";
var $vocabulary$5 = {
	"https://json-schema.org/draft/2020-12/vocab/unevaluated": true
};
var $dynamicAnchor$5 = "meta";
var title$5 = "Unevaluated applicator vocabulary meta-schema";
var type$5 = [
	"object",
	"boolean"
];
var properties$5 = {
	unevaluatedItems: {
		$dynamicRef: "#meta"
	},
	unevaluatedProperties: {
		$dynamicRef: "#meta"
	}
};
var require$$2 = {
	$schema: $schema$5,
	$id: $id$5,
	$vocabulary: $vocabulary$5,
	$dynamicAnchor: $dynamicAnchor$5,
	title: title$5,
	type: type$5,
	properties: properties$5
};

var $schema$4 = "https://json-schema.org/draft/2020-12/schema";
var $id$4 = "https://json-schema.org/draft/2020-12/meta/content";
var $vocabulary$4 = {
	"https://json-schema.org/draft/2020-12/vocab/content": true
};
var $dynamicAnchor$4 = "meta";
var title$4 = "Content vocabulary meta-schema";
var type$4 = [
	"object",
	"boolean"
];
var properties$4 = {
	contentEncoding: {
		type: "string"
	},
	contentMediaType: {
		type: "string"
	},
	contentSchema: {
		$dynamicRef: "#meta"
	}
};
var require$$3 = {
	$schema: $schema$4,
	$id: $id$4,
	$vocabulary: $vocabulary$4,
	$dynamicAnchor: $dynamicAnchor$4,
	title: title$4,
	type: type$4,
	properties: properties$4
};

var $schema$3 = "https://json-schema.org/draft/2020-12/schema";
var $id$3 = "https://json-schema.org/draft/2020-12/meta/core";
var $vocabulary$3 = {
	"https://json-schema.org/draft/2020-12/vocab/core": true
};
var $dynamicAnchor$3 = "meta";
var title$3 = "Core vocabulary meta-schema";
var type$3 = [
	"object",
	"boolean"
];
var properties$3 = {
	$id: {
		$ref: "#/$defs/uriReferenceString",
		$comment: "Non-empty fragments not allowed.",
		pattern: "^[^#]*#?$"
	},
	$schema: {
		$ref: "#/$defs/uriString"
	},
	$ref: {
		$ref: "#/$defs/uriReferenceString"
	},
	$anchor: {
		$ref: "#/$defs/anchorString"
	},
	$dynamicRef: {
		$ref: "#/$defs/uriReferenceString"
	},
	$dynamicAnchor: {
		$ref: "#/$defs/anchorString"
	},
	$vocabulary: {
		type: "object",
		propertyNames: {
			$ref: "#/$defs/uriString"
		},
		additionalProperties: {
			type: "boolean"
		}
	},
	$comment: {
		type: "string"
	},
	$defs: {
		type: "object",
		additionalProperties: {
			$dynamicRef: "#meta"
		}
	}
};
var $defs$1 = {
	anchorString: {
		type: "string",
		pattern: "^[A-Za-z_][-A-Za-z0-9._]*$"
	},
	uriString: {
		type: "string",
		format: "uri"
	},
	uriReferenceString: {
		type: "string",
		format: "uri-reference"
	}
};
var require$$4 = {
	$schema: $schema$3,
	$id: $id$3,
	$vocabulary: $vocabulary$3,
	$dynamicAnchor: $dynamicAnchor$3,
	title: title$3,
	type: type$3,
	properties: properties$3,
	$defs: $defs$1
};

var $schema$2 = "https://json-schema.org/draft/2020-12/schema";
var $id$2 = "https://json-schema.org/draft/2020-12/meta/format-annotation";
var $vocabulary$2 = {
	"https://json-schema.org/draft/2020-12/vocab/format-annotation": true
};
var $dynamicAnchor$2 = "meta";
var title$2 = "Format vocabulary meta-schema for annotation results";
var type$2 = [
	"object",
	"boolean"
];
var properties$2 = {
	format: {
		type: "string"
	}
};
var require$$5 = {
	$schema: $schema$2,
	$id: $id$2,
	$vocabulary: $vocabulary$2,
	$dynamicAnchor: $dynamicAnchor$2,
	title: title$2,
	type: type$2,
	properties: properties$2
};

var $schema$1 = "https://json-schema.org/draft/2020-12/schema";
var $id$1 = "https://json-schema.org/draft/2020-12/meta/meta-data";
var $vocabulary$1 = {
	"https://json-schema.org/draft/2020-12/vocab/meta-data": true
};
var $dynamicAnchor$1 = "meta";
var title$1 = "Meta-data vocabulary meta-schema";
var type$1 = [
	"object",
	"boolean"
];
var properties$1 = {
	title: {
		type: "string"
	},
	description: {
		type: "string"
	},
	"default": true,
	deprecated: {
		type: "boolean",
		"default": false
	},
	readOnly: {
		type: "boolean",
		"default": false
	},
	writeOnly: {
		type: "boolean",
		"default": false
	},
	examples: {
		type: "array",
		items: true
	}
};
var require$$6 = {
	$schema: $schema$1,
	$id: $id$1,
	$vocabulary: $vocabulary$1,
	$dynamicAnchor: $dynamicAnchor$1,
	title: title$1,
	type: type$1,
	properties: properties$1
};

var $schema = "https://json-schema.org/draft/2020-12/schema";
var $id = "https://json-schema.org/draft/2020-12/meta/validation";
var $vocabulary = {
	"https://json-schema.org/draft/2020-12/vocab/validation": true
};
var $dynamicAnchor = "meta";
var title = "Validation vocabulary meta-schema";
var type = [
	"object",
	"boolean"
];
var properties = {
	type: {
		anyOf: [
			{
				$ref: "#/$defs/simpleTypes"
			},
			{
				type: "array",
				items: {
					$ref: "#/$defs/simpleTypes"
				},
				minItems: 1,
				uniqueItems: true
			}
		]
	},
	"const": true,
	"enum": {
		type: "array",
		items: true
	},
	multipleOf: {
		type: "number",
		exclusiveMinimum: 0
	},
	maximum: {
		type: "number"
	},
	exclusiveMaximum: {
		type: "number"
	},
	minimum: {
		type: "number"
	},
	exclusiveMinimum: {
		type: "number"
	},
	maxLength: {
		$ref: "#/$defs/nonNegativeInteger"
	},
	minLength: {
		$ref: "#/$defs/nonNegativeIntegerDefault0"
	},
	pattern: {
		type: "string",
		format: "regex"
	},
	maxItems: {
		$ref: "#/$defs/nonNegativeInteger"
	},
	minItems: {
		$ref: "#/$defs/nonNegativeIntegerDefault0"
	},
	uniqueItems: {
		type: "boolean",
		"default": false
	},
	maxContains: {
		$ref: "#/$defs/nonNegativeInteger"
	},
	minContains: {
		$ref: "#/$defs/nonNegativeInteger",
		"default": 1
	},
	maxProperties: {
		$ref: "#/$defs/nonNegativeInteger"
	},
	minProperties: {
		$ref: "#/$defs/nonNegativeIntegerDefault0"
	},
	required: {
		$ref: "#/$defs/stringArray"
	},
	dependentRequired: {
		type: "object",
		additionalProperties: {
			$ref: "#/$defs/stringArray"
		}
	}
};
var $defs = {
	nonNegativeInteger: {
		type: "integer",
		minimum: 0
	},
	nonNegativeIntegerDefault0: {
		$ref: "#/$defs/nonNegativeInteger",
		"default": 0
	},
	simpleTypes: {
		"enum": [
			"array",
			"boolean",
			"integer",
			"null",
			"number",
			"object",
			"string"
		]
	},
	stringArray: {
		type: "array",
		items: {
			type: "string"
		},
		uniqueItems: true,
		"default": [
		]
	}
};
var require$$7 = {
	$schema: $schema,
	$id: $id,
	$vocabulary: $vocabulary,
	$dynamicAnchor: $dynamicAnchor,
	title: title,
	type: type,
	properties: properties,
	$defs: $defs
};

Object.defineProperty(jsonSchema202012, "__esModule", { value: true });
const metaSchema = require$$0;
const applicator = require$$1;
const unevaluated = require$$2;
const content = require$$3;
const core = require$$4;
const format = require$$5;
const metadata = require$$6;
const validation = require$$7;
const META_SUPPORT_DATA = ["/properties"];
function addMetaSchema2020($data) {
    [
        metaSchema,
        applicator,
        unevaluated,
        content,
        core,
        with$data(this, format),
        metadata,
        with$data(this, validation),
    ].forEach((sch) => this.addMetaSchema(sch, undefined, false));
    return this;
    function with$data(ajv, sch) {
        return $data ? ajv.$dataMetaSchema(sch, META_SUPPORT_DATA) : sch;
    }
}
jsonSchema202012.default = addMetaSchema2020;

(function (module, exports) {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.MissingRefError = exports.ValidationError = exports.CodeGen = exports.Name = exports.nil = exports.stringify = exports.str = exports._ = exports.KeywordCxt = exports.Ajv2020 = void 0;
	const core_1 = core$3;
	const draft2020_1 = draft2020;
	const discriminator_1 = discriminator;
	const json_schema_2020_12_1 = jsonSchema202012;
	const META_SCHEMA_ID = "https://json-schema.org/draft/2020-12/schema";
	class Ajv2020 extends core_1.default {
	    constructor(opts = {}) {
	        super({
	            ...opts,
	            dynamicRef: true,
	            next: true,
	            unevaluated: true,
	        });
	    }
	    _addVocabularies() {
	        super._addVocabularies();
	        draft2020_1.default.forEach((v) => this.addVocabulary(v));
	        if (this.opts.discriminator)
	            this.addKeyword(discriminator_1.default);
	    }
	    _addDefaultMetaSchema() {
	        super._addDefaultMetaSchema();
	        const { $data, meta } = this.opts;
	        if (!meta)
	            return;
	        json_schema_2020_12_1.default.call(this, $data);
	        this.refs["http://json-schema.org/schema"] = META_SCHEMA_ID;
	    }
	    defaultMeta() {
	        return (this.opts.defaultMeta =
	            super.defaultMeta() || (this.getSchema(META_SCHEMA_ID) ? META_SCHEMA_ID : undefined));
	    }
	}
	exports.Ajv2020 = Ajv2020;
	module.exports = exports = Ajv2020;
	module.exports.Ajv2020 = Ajv2020;
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = Ajv2020;
	var validate_1 = validate;
	Object.defineProperty(exports, "KeywordCxt", { enumerable: true, get: function () { return validate_1.KeywordCxt; } });
	var codegen_1 = codegen;
	Object.defineProperty(exports, "_", { enumerable: true, get: function () { return codegen_1._; } });
	Object.defineProperty(exports, "str", { enumerable: true, get: function () { return codegen_1.str; } });
	Object.defineProperty(exports, "stringify", { enumerable: true, get: function () { return codegen_1.stringify; } });
	Object.defineProperty(exports, "nil", { enumerable: true, get: function () { return codegen_1.nil; } });
	Object.defineProperty(exports, "Name", { enumerable: true, get: function () { return codegen_1.Name; } });
	Object.defineProperty(exports, "CodeGen", { enumerable: true, get: function () { return codegen_1.CodeGen; } });
	var validation_error_1 = validation_error;
	Object.defineProperty(exports, "ValidationError", { enumerable: true, get: function () { return validation_error_1.default; } });
	var ref_error_1 = ref_error;
	Object.defineProperty(exports, "MissingRefError", { enumerable: true, get: function () { return ref_error_1.default; } });
	
} (_2020, _2020.exports));

var _2020Exports = _2020.exports;
var Ajv = /*@__PURE__*/getDefaultExportFromCjs(_2020Exports);

const PATCH_EVENT_POSTFIX = "_patch";

const addProperties = (type, composition)=>{
    const node = composition.node;
    const required = new Set(node.required ?? []);
    if (composition.context && node.properties) {
        const propertiesContext = updateContext(composition.context, "properties", true);
        forEach(node.properties, ([key, definition])=>{
            if (type.properties?.has(key)) {
                // Already parsed.
                return;
            }
            normalizeBaseTypes(definition);
            const context = updateContext(propertiesContext, key, true);
            const [typeContext, structure] = parseStructure(context);
            const ownClassification = parseClassifications(context);
            // TODO: Handle obsolete properties (renames).
            // Should be in the form "oldName": {$ref: "#new-property", deprecated: true}.
            const property = {
                id: type.id + "." + key,
                name: key,
                ...parseDescription(definition),
                context,
                declaringType: type,
                required: required.has(key),
                structure,
                // Allow classifications to be undefined for now. We will try to derive them from context later.
                censorIgnore: ownClassification.censorIgnore,
                classification: ownClassification.classification,
                purposes: ownClassification.purposes,
                explicit: ownClassification.explicit,
                typeContext
            };
            let objectType;
            if (typeContext.node.$ref) {
                const reffed = getRefSchema(typeContext, typeContext.node.$ref);
                const primitive = tryParsePrimitiveType(reffed);
                if (primitive) {
                    property.primitiveType = primitive;
                } else {
                    objectType = getRefType(context, typeContext.node.$ref);
                }
            } else if (tryParseObjectComposition(typeContext.node, typeContext)) {
                objectType = parseType(typeContext.node, typeContext, property);
            }
            if (property.objectType = objectType) {
                (objectType.referencedBy ??= new Set()).add(property);
            } else {
                property.primitiveType = tryParsePrimitiveType(context.node);
            }
            property.polymorphic = property.objectType?.composition.compositions?.some((composition)=>composition.type === "oneOf");
            if (update(type.properties, key, (current)=>current != null && (current.objectType ?? current.primitiveType)?.id !== (property.objectType ?? property.primitiveType)?.id ? throwError("Properties in composed types must all have the same time.") : property)) ;
        });
    }
    forEach(composition.compositions, (composition)=>addProperties(type, composition));
};

const updateBaseTypes = (context)=>{
    const baseTypes = new Set();
    const properties = new Set();
    const typeNodes = context.parseContext.typeNodes;
    typeNodes.forEach((type)=>{
        const addBaseTypes = (composition)=>{
            if (composition.context) {
                const baseType = getRefType(composition.context, composition.ref?.id);
                if (baseType) {
                    (type.extends ??= new Set()).add(baseType);
                }
                concat(composition.compositions, composition.ref?.composition)?.forEach(addBaseTypes);
                if (type.extends) {
                    type.extendsAll = new Set(expand(type, (type)=>type.extends));
                }
            }
        };
        type.composition?.compositions?.forEach((composition)=>addBaseTypes(composition));
        maybeMakeEventType(type);
    });
    typeNodes.forEach((type)=>{
        mergeBaseProperties(type, baseTypes);
        updateTypeClassifications(type, properties);
    });
    // Restrict all type not to have unknown properties by adding `unevaluatedProperties: false`.
    // Adding this property to types that are used in compositions by other types (e.g. allOf) will break validation,
    // so the property can only be added directly to leaf types.
    //
    // If non-leaf types are used directly as property types their references must be turned into anonymous object types
    // where the `unevaluatedProperties` is added.
    typeNodes.forEach((type)=>{
        // Remove property restrictions from the source schemas added by whatever tool that was used to generate them.
        // The same restriction will still be enforced, yet it need to be rewritten to support dependencies between schemas.
        delete type.context.node.additionalProperties;
        delete type.context.node.unevaluatedProperties;
        type.context.node.type = "object";
        // Allow the system `$schema` property:
        Object.assign(type.context.node.properties ??= {}, {
            [EntityMetadata.TypeId]: {
                type: "string",
                description: "System property that contains the type's ID and version."
            }
        });
        if (type.subtypes?.size) {
            if (!type.referencedBy?.size) {
                // The type is abstract. It is used in compositions and not used directly.
                type.abstract = true;
            } else {
                type.referencedBy?.forEach((property)=>{
                    merge(property.typeContext?.node ?? property.context.node, {
                        type: "object",
                        unevaluatedProperties: false
                    });
                });
            }
        } else {
            // unevaluatedProperties does not have an effect if there are no allOfs
            type.context.node.unevaluatedProperties = false;
        }
    });
};

const traverseValue = (type, structure, value, action)=>{
    if (structure?.map) {
        if (!isPlainObject(value)) return undefined;
        return Object.fromEntries(Object.entries(value).map(([key, value])=>[
                key,
                traverseValue(type, {
                    array: structure.array
                }, value, action)
            ]));
    }
    if (structure?.array) {
        if (!isArray(value)) return undefined;
        structure = isPlainObject(structure.array) ? structure.array : undefined;
        value = value.map((value)=>traverseValue(type, structure, value, action)).filter((item)=>item);
        return value.length ? value : undefined;
    }
    return action(type, value);
};
/**
 * Adds type metadata and removes all values belonging to properties that does not match the given consent.
 *
 * The schema depth is how "deep" we are compared to the patched value.
 * Only the top level gets metadata added, so when patching a variable we start at -1 since
 * we are passing an object with variable as a property.
 *
 */ const patchValue = (type, value, consent, defaultClassification, write = false, schemaDepth = 0)=>{
    if (!isPlainObject(value)) return value;
    if (consent && !validateConsent(type, consent, defaultClassification, write)) return undefined;
    let any = false;
    const patched = consent ? {} : value;
    if (consent) {
        for(const key in value){
            const property = type.properties.get(key);
            if (!property || !validateConsent(property, consent, defaultClassification)) {
                continue;
            }
            const propertyValue = property.objectType ? traverseValue(property.objectType, property.structure, value[key], (type, value)=>patchValue(type, value, consent, undefined, write, schemaDepth + 1)) : value[key];
            if (propertyValue == null) {
                continue;
            }
            patched[key] = propertyValue;
            if (!property.censorIgnore) {
                any = true;
            }
        }
        if (!any) return undefined;
    }
    if (schemaDepth === 0) {
        // Only add the type identifier to the main entity.
        patched[EntityMetadata.TypeId] = type.id + (type.version ? "@" + type.version : "");
    }
    return patched;
};

const getRefSchema = (context, ref)=>{
    if (ref == null) return undefined;
    if (ref.startsWith("#")) {
        ref = context.schema?.id + ref;
    }
    return context.parseContext.navigator(context, ref); // context.ajv.getSchema(ref!)?.schema as any;
};
const getRefType = (context, ref, require = false)=>{
    if (ref == null || context == null) return undefined;
    const def = getRefSchema(context, ref);
    const resolved = def && context.parseContext.typeNodes.get(def);
    return require ? required$2(resolved, ()=>`Referenced type '${ref}' is not defined`) : resolved;
};
const createSchemaNavigator = (node)=>{
    const ids = new Map();
    const parseIds = (node)=>{
        if (isArray(node)) {
            forEach(node, (node)=>parseIds(node));
            return;
        } else if (!isPlainObject(node)) {
            return;
        }
        if (node.$id) {
            ids.set(node.$id, node);
        }
        forEach(node, ([, value])=>parseIds(value));
    };
    parseIds(node);
    return (context, ref)=>{
        const parts = ref.split("#");
        let node = ids.get(parts[0] ?? context.schema?.id);
        if (!node) {
            throw parseError(context, `Unabled to resolve navigation root node for the ref '${ref}'`);
        }
        const segments = (parts[1] ?? "").split("/").filter((item)=>item);
        for (const segment of segments){
            node = node[segment];
            if (!node) return undefined;
        }
        return node;
    };
};

const mergeBaseProperties = (type, seen)=>{
    if (!add(seen, type)) return type;
    type.extends?.forEach((baseType)=>forEach(mergeBaseProperties(baseType, seen).properties, ([name, property])=>update(type.properties, name, (current)=>({
                    ...property,
                    ...current,
                    ...!current?.explicit && property.explicit ? {
                        classification: property.classification,
                        purposes: property.purposes,
                        censorIgnore: property.censorIgnore,
                        // Propagate
                        explicit: true
                    } : {}
                }))));
    type.extends?.forEach((baseType)=>{
        (baseType.subtypes ??= new Set()).add(type);
    });
    return type;
};

const mergeBasePropertyClassifications = (declaringType, name, target, seen)=>{
    if (target.classification != null && target.purposes != null && target.censorIgnore != null || !add(seen ??= new Set(), declaringType)) {
        return;
    }
    declaringType.extends?.forEach((baseType)=>{
        const baseProperty = baseType.properties.get(name);
        if (baseProperty) {
            target.classification ??= baseProperty.classification;
            target.purposes ??= baseProperty.purposes;
            target.censorIgnore ??= baseProperty.censorIgnore;
        }
        mergeBasePropertyClassifications(baseType, name, target, seen);
    });
};

const parseClassifications = (context)=>{
    const node = context.node;
    const classification = {};
    if (node[SchemaAnnotations.Censor] != null) {
        classification.censorIgnore = node[SchemaAnnotations.Censor] === "ignore";
    }
    if ((node[SchemaAnnotations.Purpose] ?? node[SchemaAnnotations.Purposes]) != null) {
        parseError(context, "x-privacy-purpose and x-privacy-purposes cannot be specified at the same time.");
    }
    classification.classification = dataClassification.parse(node[SchemaAnnotations.Classification]);
    classification.purposes = dataPurposes.parse(node[SchemaAnnotations.Purpose] ?? node[SchemaAnnotations.Purposes]);
    if (node.description) {
        const parsed = node.description.replace(/@privacy (.+)/g, (_, keywords)=>{
            tryCatch(()=>parsePrivacyTokens(keywords, classification), (err)=>parseError(context, err));
            return "";
        }).trim();
        if (!parsed.length) {
            delete node.description;
        }
        Object.assign(node, getPrivacyAnnotations(classification));
    }
    if (classification.censorIgnore ??= context.censorIgnore) {
        classification.classification ??= DataClassification.Anonymous;
        classification.purposes ??= DataPurposeFlags.Any;
    }
    return {
        classification: classification.classification ?? context.classification,
        purposes: classification.purposes ?? context.purposes,
        censorIgnore: classification.censorIgnore ?? context.censorIgnore,
        explicit: (classification.classification ?? classification.purposes) != null
    };
};

const normalizeBaseTypes = (node)=>{
    if (node.$ref && node.properties) {
        (node.allOf ??= []).push({
            $ref: node.$ref
        });
        delete node.$ref;
    }
};
const parseCompositions = (node, context, seen = new Map(), childContext = context)=>{
    const cached = seen.get(node);
    if (cached) {
        return cached;
    }
    const expandRef = (ref)=>{
        if (!ref) return undefined;
        if (ref[0] === "#") {
            ref = context.schema?.id + ref;
        }
        const node = required$2(context.ajv.getSchema(ref)?.schema, ()=>parseError(context, `Ref '${ref}' not found`));
        return {
            id: ref,
            composition: parseCompositions(node, context, seen, null)
        };
    };
    const composition = {
        node,
        type: "schema",
        ref: expandRef(node.$ref),
        context: childContext
    };
    forEach([
        "allOf",
        "oneOf",
        "anyOf"
    ], (type, _, compositionContext = childContext && childContext.node[type] && updateContext(childContext, type, true))=>forEach(node[type], (node, i)=>(composition.compositions ??= []).push({
                ...parseCompositions(node, context, seen, compositionContext && updateContext(compositionContext, i + "", true)),
                type
            })));
    return composition;
};

const parseDescription = (node)=>({
        title: node.title,
        description: node.description,
        tags: array(node[SchemaAnnotations.Tags])
    });

/**
 * Makes a type an event type if it should be but is currently not.
 */ const maybeMakeEventType = (type)=>{
    if (type.name.endsWith("Event")) {
        const systemEventType = getRefType(type.composition.context, SchemaSystemTypes.Event);
        if (systemEventType && type !== systemEventType && !type.extendsAll?.has(systemEventType)) {
            const eventSchema = type.context.node;
            (eventSchema.allOf ??= []).unshift({
                $ref: SchemaSystemTypes.Event
            });
            (eventSchema.properties ??= {}).type ??= {
                const: changeIdentifierCaseStyle(type.name.replace(/Event$/, ""), "kebab")
            };
            (type.extends ??= new Set()).add(systemEventType);
            (type.extendsAll ??= new Set()).add(systemEventType);
            addProperties(type, type.composition = parseCompositions(eventSchema, type.context));
            return true;
        }
    }
    return false;
};

const parseSchema = (schema, ajv)=>{
    const rootContext = updateContext({
        ajv,
        path: [],
        node: schema,
        parseContext: {
            typeNodes: new Map(),
            schemas: new Map(),
            types: new Map(),
            navigator: createSchemaNavigator(schema)
        }
    }, "#");
    parseType(schema, rootContext);
    rootContext.parseContext.typeNodes.forEach((type)=>addProperties(type, type.composition));
    updateBaseTypes(rootContext);
    rootContext.parseContext.typeNodes.forEach((type)=>{
        maybeMakeEventType(type);
        type.properties.forEach((property)=>{
            property.context.node[SchemaAnnotations.Classification] = dataClassification.format(property.classification);
            property.context.node[SchemaAnnotations.Purposes] = dataPurposes.format(property.purposes);
        });
    });
    return [
        rootContext.parseContext.schemas,
        rootContext.parseContext.types
    ];
};
const parseError = (context, error)=>new Error(`${context.path?.join("/")}: ${unwrap(error)}`);
const navigate = (value, path)=>path?.split("/").filter((item)=>item).reduce((current, key)=>current?.[key], value);
const validationError = (sourceId, errors, sourceValue)=>new Error(`Validation for '${sourceId}' failed${errors?.length ? ":\n" + errors.map((error)=>` - ${error.instancePath} ${error.message} (${map({
            value: JSON.stringify(navigate(sourceValue, error.instancePath)).slice(0, 100),
            ...error.params
        }, ([key, value])=>key !== "type" ? `${key}: ${value}` : undefined).join(", ")}).`).join("\n") : "."}`);

const parseStructure = (context)=>{
    let structure = undefined;
    let typeContext = context;
    if (context.node.additionalProperties) {
        structure = {
            map: true
        };
        typeContext = updateContext(typeContext, "additionalProperties", true);
    }
    if (typeContext.node.type === "array") {
        typeContext = updateContext(typeContext, "items", true);
        [typeContext, (structure ??= {}).array] = parseStructure(typeContext);
        structure.array ??= true;
    }
    return [
        typeContext,
        structure
    ];
};

const parseType = (node, context, declaringProperty)=>{
    [
        "$defs",
        "definitions"
    ].forEach((defPath)=>{
        let defs = node[defPath];
        if (defs) {
            defs = node[defPath] = obj(map(defs, ([key, def])=>{
                if (key.startsWith("NamedParameters") || def.properties?.namedArgs) {
                    // This is a TypeScript function that has sneaked into the schema. Remove.
                    return undefined;
                }
                const defContext = updateContext(context, defPath, true);
                const type = parseType(def, updateContext(defContext, key));
                if (type) {
                    defContext.schema?.types.set(type.name, type);
                }
                return [
                    key,
                    def
                ];
            }));
        }
    });
    const objectComposition = tryParseObjectComposition(node, context);
    if (objectComposition) {
        if (node.node === context.schema?.context.node) {
            throw parseError(context, "A schema definition cannot declare a root type.");
        }
        let name = context.key;
        let property = declaringProperty;
        while(property){
            name = property.declaringType.name + "_" + property.name + (name !== context.key ? "_" + name : "");
            property = property.declaringType.declaringProperty;
        }
        const type = {
            id: context.schema?.id + "#" + name,
            schemaId: node.$id,
            name,
            ...parseDescription(node),
            context,
            declaringProperty,
            topLevel: !declaringProperty,
            properties: new Map(),
            composition: objectComposition
        };
        context.node.$anchor ??= encodeURIComponent(type.name);
        context.node.type ??= "object";
        context.parseContext.typeNodes.set(node, type);
        context.parseContext.types.set(type.id, type);
        return type;
    }
};

const tryParseObjectComposition = (node, context)=>{
    const composition = parseCompositions(node, context);
    let isObjectType = false;
    forEach(expand(composition, (composition)=>concat(composition.compositions, composition.ref?.composition)), (item)=>item.node.type === "object" ? isObjectType = true : item.node.type != null && isObjectType && throwError(parseError(context, "If an object type is a composition, all included types must be objects.")));
    if (isObjectType) {
        return composition;
    }
};

const updateContext = (context, key, // Whether to ignore the x-version property which must be the case below type level (e.g. properties).
ignoreVersion = false)=>{
    const node = key === "#" ? context.node : required$2(context.node?.[key], ()=>`Cannot navigate to '${key}'.`);
    const childContext = {
        ...context,
        parent: context,
        key,
        ...parseClassifications(context),
        version: context.version,
        node
    };
    !ignoreVersion && (childContext.version = node?.[SchemaAnnotations.Version] ?? context.version);
    if (node.$id) {
        childContext.$ref = node.$id;
    } else if (key) {
        childContext.$ref = context.$ref + (childContext.$ref?.includes("/") ? "/" : "#/") + key;
    }
    childContext.path = [
        ...context.path,
        key
    ];
    if (node.$schema != null) {
        const schema = childContext.schema = {
            id: node.$id,
            ...parseDescription(node),
            context: childContext,
            types: new Map(),
            definition: node
        };
        if (context.schema) {
            (context.schema.subSchemas ??= new Map()).set(schema.id, schema);
        }
        context.parseContext.schemas.set(schema.id, schema);
    //parseEventTypes(childContext);
    }
    return childContext;
};

const updateMinClassifications = (type, classifications)=>{
    if (classifications.classification != null) {
        type.classification = Math.min(type.classification ?? classifications.classification, classifications.classification);
    }
    if (classifications.purposes != null) {
        type.purposes = (type.purposes ?? 0) | // Flags higher than "Any" are reserved for special purposes, and does not participate here.
        classifications.purposes & DataPurposeFlags.Any;
    }
// Censor ignore can only go from type to property and not the other way around.
// Hence is specifically not updated here.
// type.censorIgnore ??= classifications.censorIgnore;
};

const updateTypeClassifications = (type, seen)=>{
    if (!add(seen, type)) return type;
    // Make sure base types have classifications before their implementors.
    // This is needed to infer property classifications from base types, if properties have been overridden.
    type.extends?.forEach((type)=>updateTypeClassifications(type, seen));
    const objectTypeProperties = [];
    const typeClassifications = parseClassifications(type.context);
    [
        DataPurposeFlags.Server,
        DataPurposeFlags.Server_Write
    ].forEach((serverPurpose)=>{
        if (typeClassifications.purposes & serverPurpose) {
            type.purposes = (type.purposes ?? 0) | serverPurpose;
        }
        // Inherit server and client read flags from base types.
        // (These are special since they also apply type-wide and not just for properties.)
        if (some(type.extends, (baseType)=>baseType.purposes & serverPurpose)) {
            type.purposes = (type.purposes ?? 0) | serverPurpose;
        }
    });
    forEach(type.properties, ([, property])=>{
        // Before looking for classifications in the surrounding context, start by seeing if a base type has aproperty with the same name.
        // If so inherit those settings.
        mergeBasePropertyClassifications(property.declaringType, property.name, property);
        if (property.objectType && (property.classification == null || property.purposes == null)) {
            // We do not resolve this from context, rather we look at the referenced object type.
            // (If classification is not explicitly set, we might as well use the minimum classification from the type that will not censor it away).
            objectTypeProperties.push(property);
        } else {
            // Normal properties without explicit classifications get them from the defaults at the place they are in the schema tree.
            property.classification ??= property.context.classification;
            property.purposes ??= property.context.purposes;
        }
        updateMinClassifications(type, property);
    });
    forEach(objectTypeProperties, (property)=>{
        const type = updateTypeClassifications(property.objectType, seen);
        property.classification ??= type.classification;
        property.purposes ??= type.purposes;
        updateMinClassifications(type, property);
    });
    forEach(type.properties, ([, property])=>{
        if (property.classification == null) throw parseError(property.context, "The property's classification is not explicitly specified and cannot be inferred from scope.");
        if (property.purposes == null) throw parseError(property.context, "The property's purposes are not explicitly specified and cannot be inferred from scope.");
        if (property.required && !validateConsent(type, property)) {
            throw parseError(property.context, "A required property cannot have a more restrictive classification than any other property in its type since a censored value without it would be invalid.");
        }
        updateMinClassifications(type.context.schema, property);
    });
    return type;
};

const extractDescription = (entity)=>({
        title: entity.title,
        description: entity.description,
        tags: entity.tags
    });
/** The name of the {@link TrackedEvent.patchTargetId} property. */ const PATCH_TARGET_ID = "patchTargetId";
const parsedSource = Symbol();
class SchemaManager {
    schema;
    subSchemas = new Map();
    types = new Map();
    /**
   * A manager that contains all the same types as this one, but without required properties.
   * These types are used for validating event patches.
   */ _patchSchema;
    /**
   *
   * Creates a {@link SchemaManager} for validating, parsing and censoring event and variable types.
   *
   * @param schemas The individual source JSON Schemas that composes the runtime schema.
   */ static create(schemas) {
        return new SchemaManager(schemas, false);
    }
    /**
   *
   * @param schemas The individual source JSON Schemas that composes the runtime schema.
   * @param patches Flag that indicates whether the schema is for patch events.
   * @param reparse This is the second parse for the patch schema.
   *
   * Per convention, patch events type names are postfixed with `_patch` and only the {@link TrackedEvent.type} and
   *  {@link TrackedEvent.patchTargetId} properties are required.
   */ constructor(schemas, patches = false, reparse = false){
        schemas = array(schemas);
        let combinedSchema = {
            $schema: "https://json-schema.org/draft/2020-12/schema",
            $id: "urn:tailjs:runtime",
            description: "The effective schema for this particular configuration of tail.js that bundles all included schemas." + "\n" + "Please note that the shadow types for patching events are not represented in this schema. Per convention any event type " + "postfixed with `_patch` will be validated against its source event, but without required properties apart from " + "`" + PATCH_TARGET_ID + "` and `type`.",
            $defs: obj(schemas, (schema)=>[
                    validate$1(schema.$id, schema.$id && schema.$schema, "A schema must have an $id and $schema property."),
                    clone(schema)
                ])
        };
        const reset = ()=>{
            const ajv = new Ajv({
                allowUnionTypes: true,
                strictTypes: false
            }).addKeyword("$anchor");
            forEach(SchemaAnnotations, ([, keyword])=>ajv.addKeyword(keyword));
            addFormats(ajv);
            return ajv;
        };
        let ajv = reset();
        ajv.addSchema(combinedSchema);
        let [parsedSchemas, parsedTypes] = parseSchema(combinedSchema, ajv);
        // A brand new instance is required since we have tampered with the schema while parsing (e.g. setting unevaluatedProperties true/false and added anchors).
        (ajv = reset()).compile(combinedSchema);
        parsedSchemas.forEach((parsed)=>{
            const schema = {
                id: parsed.id,
                ...extractDescription(parsed),
                classification: parsed.classification,
                purposes: parsed.purposes,
                types: new Map(),
                subSchemas: new Map(),
                definition: parsed.definition
            };
            this.subSchemas.set(schema.id, schema);
        });
        parsedSchemas.forEach((parsed)=>{
            const schema = this.subSchemas.get(parsed.id);
            forEach(parsed.subSchemas, ([, parsedSubSchema])=>{
                const subSchema = required$2(this.subSchemas.get(parsedSubSchema.id));
                subSchema.parent = schema;
                (schema.subSchemas ??= new Map()).set(subSchema.id, subSchema);
            });
        });
        parsedTypes.forEach((parsedType)=>{
            const validate = required$2(ajv.getSchema(parsedType.context.$ref), ()=>`INV <> The ref '${parsedType.context.$ref}' does not address the type '${parsedType.id}' in the schema.`);
            const type = {
                id: parsedType.id,
                name: parsedType.name,
                ...extractDescription(parsedType),
                classification: parsedType.classification,
                purposes: parsedType.purposes,
                primitive: false,
                abstract: !!parsedType.abstract,
                schema: invariant(this.subSchemas.get(parsedType.context.schema.id), "Schemas are mapped."),
                definition: parsedType.composition.node,
                patch: (value, classification, write, addMetadata)=>patchValue(parsedType, value, classification, undefined, write, // Using a number is not supported through the public API.
                    // This is to support property validation in a more or less hacky way.
                    isNumber(addMetadata) ? addMetadata : addMetadata ? 0 : 1),
                tryValidate: (value)=>validate(value) ? value : undefined,
                validate: (value)=>validate(value) ? value : throwError(validationError(type.id, validate.errors, value))
            };
            type[parsedSource] = parsedType;
            unlock(type.schema.types).set(type.id, type);
            this.types.set(type.id, type);
        });
        var trackedEvent = first(parsedTypes, ([, type])=>type.schemaId === SchemaSystemTypes.Event)?.[1];
        parsedTypes.forEach((parsed)=>{
            const type = this.types.get(parsed.id);
            const set = (target, item)=>target.set(item.id, item);
            forEach(parsed.extends, (parsedBaseType)=>set(type.subtypes ??= new Map(), invariant(this.types.get(parsedBaseType.id), `Extended type is mapped.`)));
            forEach(parsed.subtypes, (parsedBaseType)=>set(type.subtypes ??= new Map(), invariant(this.types.get(parsedBaseType.id), "Extending type is mapped.")));
            forEach(parsed.properties, ([key, parsedProperty])=>{
                const propertyType = required$2(parsedProperty.objectType ? this.types.get(parsedProperty.objectType.id) : parsedProperty.primitiveType ?? {}, ()=>parseError(parsed.context, `Unknown property type. (${JSON.stringify(parsedProperty.typeContext.node)})`));
                const property = {
                    id: parsedProperty.id,
                    name: parsedProperty.name,
                    ...extractDescription(parsed),
                    classification: parsedProperty.classification,
                    purposes: parsedProperty.purposes,
                    declaringType: type,
                    structure: parsedProperty.structure,
                    required: parsedProperty.required,
                    definition: parsedProperty.typeContext?.node,
                    polymorphic: !!parsedProperty.polymorphic,
                    type: propertyType,
                    validate: (value)=>type.validate({
                            [property.name]: value
                        })?.[property.name],
                    tryValidate: (value)=>type.tryValidate({
                            [property.name]: value
                        })?.[property.name],
                    patch: (value, consent, write, addMetadata)=>type.patch({
                            [property.name]: value
                        }, consent, write, addMetadata ? -1 : false)?.[property.name]
                };
                property["parsed"] = parsedProperty;
                unlock(type.properties ??= new Map()).set(property.name, property);
                if (trackedEvent && key === "type" && parsed.extendsAll?.has(trackedEvent)) {
                    array(parsedProperty.typeContext?.node.const ?? parsedProperty.typeContext?.node.enum)?.forEach((alias, i)=>{
                        i === 0 && (type.eventTypeName = alias);
                        assignIfUndefined(unlock(type.schema.events ??= new Map()), alias, type, (key, current)=>`The event '${type.id}' cannot be defined for the type '${key}' since '${current.id}' is already registered.`);
                    });
                }
                // If $defs defines object types named of a variable scope + "Variables" ("GlobalVariables", "SessionVariables", "DeviceVariables",  "UserVariables" or"EntityVariables"),
                // their properties will be added as variable definitions to the respective scopes.
                let variableScopeTarget;
                if (type.name.endsWith("Variables") && (variableScopeTarget = variableScope.tryParse(type.name.replace(/Variables$/, ""))) != null) {
                    forEach(type.properties, ([, property])=>{
                        if (property.required) {
                            throw new Error(`The type '${type.id}' cannot have required properties since it defines scope variables.`);
                        }
                        property.scope = variableScopeTarget;
                        get(type.schema.variables ??= new Map(), variableScopeTarget, ()=>new Map()).set(property.name, property);
                    });
                }
            });
        });
        // Push nested schema types and events to parent schema. At the same time validate that event type IDs are unique.
        //
        // Also, don't push variables since those are scoped to their schema IDs. It is not sensible to detect variable name clashes
        // at the global level since prefixed variable storages may only use a subset of the schema.
        // Hence, it is their responsibility to merge their respective schemas and check for name clashes.
        this.subSchemas.forEach((schema)=>{
            let parent = schema.parent;
            while(parent){
                schema.events?.forEach((event, key)=>{
                    if (parent.events?.has(key)) {
                        throw new Error(`The events '${parent.events.get(key).id}' and '${event.id}' cannot both have the type name '${key}'.`);
                    }
                    unlock(parent.events ??= new Map()).set(key, event);
                });
                schema.types.forEach((type)=>{
                    parent.types.set(type.id, type);
                });
                parent = parent.parent;
            }
        });
        parsedTypes.forEach((parsed)=>{
            const type = this.types.get(parsed.id);
            forEach(type?.referencedBy, (parsedProperty)=>(type.referencedBy ??= new Set()).add(invariant(this.types.get(parsedProperty.declaringType.id)?.properties?.get(parsedProperty.name), "Referencing property is mapped.")));
        });
        this.schema = invariant(this.subSchemas.get("urn:tailjs:runtime"), "Runtime schema is registered.");
        if (patches) {
            if (reparse) {
                this._patchSchema = this;
            } else {
                // Postfix "_patch" to all event types, and make all properties optional except events' `type` and `patchTargetId`.
                this.subSchemas.forEach((schema)=>{
                    schema.types.forEach((type)=>{
                        if (type.schema !== schema) return;
                        const parsed = type[parsedSource];
                        if (isObjectType(type) && parsed) {
                            const removeRequired = (cmp)=>{
                                if (type.eventTypeName && cmp.node.required?.includes("type")) {
                                    cmp.node.required = [
                                        "type",
                                        PATCH_TARGET_ID
                                    ];
                                } else {
                                    delete cmp.node.required;
                                }
                                cmp.compositions?.forEach(removeRequired);
                            };
                            removeRequired(parsed.composition);
                            if (type.eventTypeName) {
                                type.eventTypeName += PATCH_EVENT_POSTFIX;
                                const context = parsed.properties.get("type")?.typeContext;
                                if (context) {
                                    context.node.const && (context.node.const = context.node.const + PATCH_EVENT_POSTFIX);
                                    context.node.enum && (context.node.enum = context.node.enum.map((name)=>name + PATCH_EVENT_POSTFIX));
                                }
                            }
                        }
                    });
                });
                // Re-parse modified patch schema.
                this._patchSchema = new SchemaManager(Object.values(combinedSchema.$defs), true, true);
            }
        } else {
            this._patchSchema = new SchemaManager(schemas, true)._patchSchema;
        }
    }
    getSchema(schemaId, require) {
        return require ? required$2(this.getSchema(schemaId, false), ()=>`The schema '${schemaId}' has not been registered.`) : schemaId && this.subSchemas.get(schemaId);
    }
    isPatchType(eventTypeOrTypeId) {
        return eventTypeOrTypeId?.endsWith(PATCH_EVENT_POSTFIX) === true;
    }
    getType(eventTypeOrTypeId, require, concreteOnly = true) {
        return this.isPatchType(eventTypeOrTypeId) && this._patchSchema !== this ? this._patchSchema.getType(eventTypeOrTypeId, require, concreteOnly) : require ? required$2(this.getType(eventTypeOrTypeId, false, concreteOnly), ()=>`The type or event type '${eventTypeOrTypeId}' is not defined.`) : ifDefined(eventTypeOrTypeId, ()=>validate$1(this.schema.events?.get(eventTypeOrTypeId) ?? this.types.get(eventTypeOrTypeId), (type)=>!type || !concreteOnly || type && !type.abstract, ()=>`The type '${eventTypeOrTypeId}' is abstract and cannot be used directly.`));
    }
    tryValidate(id, value) {
        return id && this.getType(id, false)?.tryValidate(value);
    }
    validate(id, value) {
        return this.getType(id, true).validate(value);
    }
    patch(id, value, consent, validate = true, write = false, addMetadata = true) {
        return ifDefined(this.getType(id, true), (target)=>(validate && target.validate(value), target.patch(value, consent, write, addMetadata)));
    }
    compileVariableSet(schemas) {
        schemas = array(schemas);
        return new SchemaVariableSet(this, schemas == null || schemas.includes("*") ? this.subSchemas.values() : schemas);
    }
}

export { EntityMetadata, SchemaAnnotations, SchemaManager, SchemaSystemTypes, SchemaVariableSet, getPrivacyAnnotations, inferPrimitiveFromValue, isObjectType, isPrimitiveType, parsePrivacyTokens, primitives, tryParsePrimitiveType };
