const throwError = (error, transform = (message)=>new Error(message))=>{
    throw isString(error = unwrap(error)) ? transform(error) : error;
};
const required = (value, error)=>value != null ? value : throwError(error ?? "A required value is missing", (text)=>new TypeError(text.replace("...", " is required.")));
/** A value that is initialized lazily on-demand. */ const deferred = (expression)=>{
    let result;
    const getter = ()=>{
        if (getter.initialized || result) {
            // Result may either be the resolved value or a pending promise for the resolved value.
            return result;
        }
        result = unwrap(expression);
        if (result.then) {
            return result = result.then((resolvedValue)=>{
                getter.initialized = true;
                return getter.resolved = result = resolvedValue;
            });
        }
        getter.initialized = true;
        return getter.resolved = result;
    };
    return getter;
};
/**
 * A promise that is initialized lazily on-demand.
 * For promises this is more convenient than {@link deferred}, since it just returns a promise instead of a function.
 */ const deferredPromise = (expression)=>{
    let promise = {
        initialized: true,
        then: thenMethod(()=>(promise.initialized = true, unwrap(expression)))
    };
    return promise;
};
const thenMethod = (expression)=>{
    let result = deferred(expression);
    return (onfullfilled, onrejected)=>tryCatchAsync(result, [
            onfullfilled,
            onrejected
        ]);
};
const tryCatchAsync = async (expression, errorHandler = true, always)=>{
    try {
        const result = await unwrap(expression);
        return isArray(errorHandler) ? errorHandler[0]?.(result) : result;
    } catch (e) {
        if (!isBoolean(errorHandler)) {
            if (isArray(errorHandler)) {
                if (!errorHandler[1]) throw e;
                return errorHandler[1](e);
            }
            const error = await errorHandler?.(e);
            if (error instanceof Error) throw error;
            return error;
        } else if (errorHandler) {
            throw e;
        } else {
            // `false` means "ignore".
            console.error(e);
        }
    } finally{
        await always?.();
    }
    return undefined;
};
/** Minify friendly version of `false`. */ const undefined$1 = void 0;
/** Caching this value potentially speeds up tests rather than using `Number.MAX_SAFE_INTEGER`. */ const MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER;
/** Minify friendly version of `null`. */ const nil = null;
/** A function that filters out values != null. */ const FILTER_NULLISH = (item)=>item != nil;
/** Using this cached value speeds up testing if an object is iterable seemingly by an order of magnitude. */ const symbolIterator = Symbol.iterator;
const ifDefined = (value, resultOrProperty)=>isFunction(resultOrProperty) ? value !== undefined$1 ? resultOrProperty(value) : undefined$1 : value?.[resultOrProperty] !== undefined$1 ? value : undefined$1;
const isBoolean = (value)=>typeof value === "boolean";
const isInteger = Number.isSafeInteger;
const isNumber = (value)=>typeof value === "number";
const isString = (value)=>typeof value === "string";
const isArray = Array.isArray;
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
const mapToArray = (projected, map)=>map && !isArray(projected) ? [
        ...projected
    ] : projected;
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
const filter = (source, predicate = (item)=>item != null, map = isArray(source), start, end)=>mapToArray(createIterator(source, (item, index)=>predicate(item, index) ? item : undefined$1, start, end), map);
const entries = (target)=>!isArray(target) && isIterable(target) ? map(target, isMap(target) ? (value)=>value : isSet(target) ? (value)=>[
            value,
            true
        ] : (value, index)=>[
            index,
            value
        ]) : isObject(target) ? Object.entries(target) : undefined$1;
const define = (target, ...args)=>{
    const add = (arg, defaults)=>{
        if (!arg) return;
        let properties;
        if (isArray(arg)) {
            if (isPlainObject(arg[0])) {
                // Tuple with the first item the defaults and the next the definitions with those defaults,
                // ([{enumerable: false, ...}, ...])
                arg.splice(1).forEach((items)=>add(items, arg[0]));
                return;
            }
            // ([[key1, value1], [key2, value2], ...])
            properties = arg;
        } else {
            // An object.
            properties = map(arg);
        }
        properties.forEach(([key, value])=>Object.defineProperty(target, key, {
                configurable: false,
                enumerable: true,
                writable: false,
                ...defaults,
                ...isPlainObject(value) && ("get" in value || "value" in value) ? value : isFunction(value) && !value.length ? {
                    get: value
                } : {
                    value
                }
            }));
    };
    args.forEach((arg)=>add(arg));
    return target;
};
const unwrap = (value)=>isFunction(value) ? value() : value;
/**
 * Creates a string enumerating a list of value given a separator, optionally using a different separator between the last two items.
 *
 * @param values - The list of items to enumerator.
 * @param separator - The separator to use (defaults to ", "). If given a tuple, the first item is the last separator without spaces.
 * The second item may optionally specify another separator than the default (", ").
 *
 *
 * Useful for enumerations like "item1, item2 and item 3" (`separate(["item1", "item2", "item3"], ["and"])`).
 */ const enumerate = (values, separator = [
    "and",
    ", "
])=>!values ? undefined$1 : (values = map(values)).length === 1 ? values[0] : isArray(separator) ? [
        values.slice(0, -1).join(separator[1] ?? ", "),
        " ",
        separator[0],
        " ",
        values[values.length - 1]
    ].join("") : values.join(separator ?? ", ");
const quote = (item, quoteChar = "'")=>item == null ? undefined$1 : quoteChar + item + quoteChar;
const isBit = (n)=>(n = Math.log2(n), n === (n | 0));
const createEnumAccessor = (sourceEnum, flags, enumName, pureFlags)=>{
    const names = Object.fromEntries(Object.entries(sourceEnum).filter(([key, value])=>isString(key) && isNumber(value)).map(([key, value])=>[
            key.toLowerCase(),
            value
        ]));
    const entries = Object.entries(names);
    const values = Object.values(names);
    const any = names["any"] ?? values.reduce((any, flag)=>any | flag, 0);
    const nameLookup = flags ? {
        ...names,
        any,
        none: 0
    } : names;
    const valueLookup = Object.fromEntries(Object.entries(nameLookup).map(([key, value])=>[
            value,
            key
        ]));
    const parseValue = (value, validateNumbers)=>isInteger(value) ? !flags && validateNumbers ? valueLookup[value] != null ? value : undefined$1 : Number.isSafeInteger(value) ? value : undefined$1 : isString(value) ? nameLookup[value] ?? nameLookup[value.toLowerCase()] ?? // Sometimes a number may have been stored as a string.
        // Let's see if that is the case.
        parseValue(parseInt(value), validateNumbers) : undefined$1;
    let invalid = false;
    let carry;
    let carry2;
    const [tryParse, lookup] = flags ? [
        (value, validateNumbers)=>Array.isArray(value) ? value.reduce((flags, flag)=>flag == null || invalid ? flags : (flag = parseValue(flag, validateNumbers)) == null ? (invalid = true, undefined$1) : (flags ?? 0) | flag, (invalid = false, undefined$1)) : parseValue(value),
        (value, format)=>(value = tryParse(value, false)) == null ? undefined$1 : format && (carry2 = valueLookup[value & any]) ? (carry = lookup(value & ~(value & any), false)).length ? [
                carry2,
                ...carry
            ] : carry2 : (value = entries.filter(([, flag])=>flag && value & flag && isBit(flag)).map(([name])=>name), format ? value.length ? value.length === 1 ? value[0] : value : "none" : value)
    ] : [
        parseValue,
        (value)=>(value = parseValue(value)) != null ? valueLookup[value] : undefined$1
    ];
    let originalValue;
    const parse = (value, validateNumbers)=>value == null ? undefined$1 : (value = tryParse(originalValue = value, validateNumbers)) == null ? throwError(new TypeError(`${JSON.stringify(originalValue)} is not a valid ${enumName} value.`)) : value;
    const pure = entries.filter(([, value])=>!pureFlags || (pureFlags & value) === value && isBit(value));
    return define((value)=>parse(value), [
        {
            configurable: false,
            enumerable: false
        },
        {
            parse,
            tryParse,
            entries,
            values,
            lookup,
            length: entries.length,
            format: (value)=>lookup(value, true),
            logFormat: (value, c = "or")=>(value = lookup(value, true), value === "any" ? "any " + enumName : `the ${enumName} ${enumerate(map(array(value), (value)=>quote(value)), [
                    c
                ])}`)
        },
        flags && {
            pure,
            map: (flags, map)=>(flags = parse(flags), pure.filter(([, flag])=>flag & flags).map(map ?? (([, flag])=>flag)))
        }
    ]);
};
/**
 * Creates a function that parses the specified enum properties to their numeric values on the object provided.
 * Note that it does the parsing directly on the provided object and does not create a copy.
 */ const createEnumPropertyParser = (...props)=>{
    const parsers = entries(obj(props, true));
    const parse = (source)=>(isObject(source) && (isArray(source) ? source.forEach((sourceItem, i)=>source[i] = parse(sourceItem)) : parsers.forEach(([prop, parsers])=>{
            let parsed = undefined$1;
            let value;
            if ((value = source[prop]) == null) return;
            parsers.length === 1 ? source[prop] = parsers[0].parse(value) : parsers.forEach((parser, i)=>!parsed && (parsed = i === parsers.length - 1 ? parser.parse(value) : parser.tryParse(value)) != null && (source[prop] = parsed));
        })), source);
    return parse;
};
let matchProjection;
let collected;
/**
 * Matches a regular expression against a string and projects the matched parts, if any.
 */ const match = (s, regex, selector, collect = false)=>(s ?? regex) == nil ? undefined$1 : selector ? (matchProjection = undefined$1, collect ? (collected = [], match(s, regex, (...args)=>(matchProjection = selector(...args)) != null && collected.push(matchProjection))) : s.replace(regex, (...args)=>matchProjection = selector(...args)), matchProjection) : s.match(regex);

var DataClassification;
(function(DataClassification) {
    /**
   * The data cannot reasonably be linked to a specific user after the user leaves the website or app, and their session ends.
   *
   * Tail.js will collect this kind of data in a way that does not use cookies or rely on other information persisted in the user's device.
   *
   * Identifying returning visitors will not be possible at this level.
   * In-session personalization will be possible based on the actions a user has taken such as adding or removing things to a shopping basket, or reading an article.
   *
   * As always, YOU (or client and/or employer) are responsible for the legality of the collection of data, its classification at any level of consent for any duration of time - not tail.js, even with its default settings, intended design or implementation.
   */ DataClassification[DataClassification["Anonymous"] = 0] = "Anonymous";
    /**
   * The data may possibly identify the user if put into context with other data, yet not specifically on its own.
   *
   * Examples of data you should classify as at least indirect personal data are IP addresses, detailed location data, and randomly generated device IDs persisted over time to track returning visitors.
   *
   * Identifying returning visitors will be possible at this level of consent, but not across devices.
   * Some level of personalization to returning visitors will be possible without knowing their specific preferences with certainty.
   *
   * This level is the default when a user has consented to necessary information being collected via a  cookie disclaimer or similar.
   *
   * As always, YOU (or client and/or employer) are responsible for the legality of the collection of data, its classification at any level of consent for any duration of time - not tail.js, even with its default settings, intended design or implementation.
   */ DataClassification[DataClassification["Indirect"] = 1] = "Indirect";
    /**
   * The data directly identifies the user on its own.
   *
   * Examples are name, username, street address and email address.
   *
   * Identifying returning visitors across devices will be possible at this level of consent.
   * Personalization based on past actions such as purchases will also be possible.
   *
   * This level is the default should be considered the default level if users are offered an option to create a user profile or link an existing user profile from an external identity provider (Google, GitHub, Microsoft etc.).
   *
   * Please note it is possible to access user data even when nothing is tracked beyond the bla... level
   *
   * As always, YOU (or client and/or employer) are responsible for the legality of the collection of data, its classification at any level of consent for any duration of time - not tail.js, even with default settings.
   */ DataClassification[DataClassification["Direct"] = 2] = "Direct";
    /**
   * Sensitive data about a user.
   *
   * Examples are data related to health, financial matters, race, political and religious views, and union membership.
   * If the user is given the option to consent at this level, it should be very clear, and you must make sure that all levels of your tail.js implementation and connected services meets the necessary levels of compliance for this in your infrastructure.
   *
   * Identifying returning visitors across devices will be possible at this level of consent.
   * and so will advanced personalization.
   *
   * As always, YOU (or client and/or employer) are responsible for the legality of the collection of data, its classification at any level of consent for any duration of time - not tail.js, even with default settings.
   */ DataClassification[DataClassification["Sensitive"] = 3] = "Sensitive";
})(DataClassification || (DataClassification = {}));
const dataClassification = createEnumAccessor(DataClassification, false, "data classification");
const dataUsageEquals = (lhs, rhs)=>dataClassification.parse(lhs?.classification ?? lhs?.level) === dataClassification.parse(rhs?.classification ?? rhs?.level) && dataPurposes.parse(lhs?.purposes ?? lhs?.purposes) === dataPurposes.parse(rhs?.purposes ?? rhs?.purposes);
const parseDataUsage = (classificationOrConsent, defaults)=>classificationOrConsent == null ? undefined : isNumber(classificationOrConsent.classification) && isNumber(classificationOrConsent.purposes) ? classificationOrConsent : {
        ...classificationOrConsent,
        level: undefined,
        purpose: undefined,
        classification: dataClassification.parse(classificationOrConsent.classification ?? classificationOrConsent.level ?? defaults?.classification ?? 0),
        purposes: dataPurposes.parse(classificationOrConsent.purposes ?? classificationOrConsent.purpose ?? defaults?.purposes ?? DataPurposeFlags.Necessary)
    };

var DataPurposeFlags;
(function(DataPurposeFlags) {
    /** Data without a purpose will not get stored and cannot be used for any reason. This can be used to disable parts of a schema. */ DataPurposeFlags[DataPurposeFlags["None"] = 0] = "None";
    /**
   * Data stored for this purpose is vital for the system, website or app to function.
   */ DataPurposeFlags[DataPurposeFlags["Necessary"] = 1] = "Necessary";
    /**
   * Data stored for this purpose is used for personalization or otherwise adjust the appearance of a website or app
   * according to a user's preferences.
   *
   * DO NOT use this category if the data may be shared with third parties or otherwise used for targeted marketing outside the scope
   * of the website or app. Use {@link DataPurposeFlags.Targeting} instead.
   *
   * It may be okay if the data is only used for different website and apps that relate to the same product or service.
   * This would be the case if a user is able to use an app and website interchangeably for the same service. Different areas of a brand may
   * also be distributed across multiple domain names.
   *
   */ DataPurposeFlags[DataPurposeFlags["Functionality"] = 2] = "Functionality";
    /**
   * Data stored for this purpose is used to gain insights on how users interact with a website or app optionally including
   * demographics and similar traits with the purpose of optimizing the website or app.
   *
   * DO NOT use this category if the data may be shared with third parties or otherwise used for targeted marketing outside the scope
   * of the website or app. Use {@link DataPurposeFlags.Targeting} instead.
   *
   * It may be okay if the data is only used for different website and apps that relate to the same product or service.
   * This would be the case if a user is able to use an app and website interchangeably for the same service. Different areas of a brand may
   * also be distributed across multiple domain names.
   *
   */ DataPurposeFlags[DataPurposeFlags["Performance"] = 4] = "Performance";
    /**
   * Data stored for this purpose may be similar to both functionality and performance data, however it may be shared with third parties
   * or otherwise used to perform marketing outside the scope of the specific website or app.
   *
   * If the data is only used for different website and apps that relate to the same product or service, it might not be necessary
   * to use this category.
   * This would be the case if a user is able to use an app and website interchangeably for the same service. Different areas of a brand may
   * also be distributed across multiple domain names.
   */ DataPurposeFlags[DataPurposeFlags["Targeting"] = 8] = "Targeting";
    /**
   * Data stored for this purpose is used for security purposes. As examples, this can both be data related to securing an authenticated user's session,
   * or for a website to guard itself against various kinds of attacks.
   *
   * This is implicitly also `Necessary`.
   */ DataPurposeFlags[DataPurposeFlags["Security"] = 16] = "Security";
    /**
   * Data stored for this purpose may be similar to the performance category, however it is specifically
   * only used for things such as health monitoring, system performance and error logging and unrelated to user behavior.
   *
   * This is implicitly also `Necessary`.
   */ DataPurposeFlags[DataPurposeFlags["Infrastructure"] = 32] = "Infrastructure";
    /**
   * Any purposes that is permissable for anonymous users.
   */ DataPurposeFlags[DataPurposeFlags["Any_Anonymous"] = 49] = "Any_Anonymous";
    /**
   * Data can be used for any purpose.
   *
   * Flags with a higher value than this are used for restrictions on who can access the data rather what it is used for.
   */ DataPurposeFlags[DataPurposeFlags["Any"] = 63] = "Any";
    /**
   * The data is not available client-side.
   * Note that this is a special flag that is not included in "Any"
   */ DataPurposeFlags[DataPurposeFlags["Server"] = 2048] = "Server";
    /**
   * The data can only be updated server-side and is read-only client-side.
   *
   * Note that this is a special flag that is not included in "Any".
   */ DataPurposeFlags[DataPurposeFlags["Server_Write"] = 4096] = "Server_Write";
})(DataPurposeFlags || (DataPurposeFlags = {}));
const purePurposes = 1 | 2 | 4 | 8 | 16 | 32 | 2048;
const dataPurposes = createEnumAccessor(DataPurposeFlags, true, "data purpose", purePurposes);
const singleDataPurpose = createEnumAccessor(DataPurposeFlags, false, "data purpose", 0);

const NoConsent = Object.freeze({
    level: "anonymous",
    purposes: "any_anonymous"
});
const FullConsent = Object.freeze({
    level: "sensitive",
    purposes: "any"
});
const isUserConsent = (value)=>!!value?.["level"];
const validateConsent = (source, consent, defaultClassification, write = false)=>{
    if (!source) return undefined;
    const classification = dataClassification.parse(source?.classification ?? source?.level, false) ?? required(dataClassification(defaultClassification?.classification), "The source has not defined a data classification and no default was provided.");
    let purposes = dataPurposes.parse(source.purposes, false) ?? required(dataPurposes.parse(defaultClassification?.purposes, false), "The source has not defined data purposes and no default was provided.");
    const consentClassification = dataClassification.parse(consent["classification"] ?? consent["level"], false);
    const consentPurposes = dataPurposes.parse(consent.purposes, false);
    // If we are writing, also check that the type is not client-side read-only.
    // The context will only be given the `Server` flag. `ClientRead` is only for annotations.
    for (const serverFlag of [
        DataPurposeFlags.Server,
        write ? DataPurposeFlags.Server_Write : 0
    ]){
        if (purposes & serverFlag && !(consentPurposes & DataPurposeFlags.Server)) {
            return false;
        }
    }
    return source && classification <= consentClassification && (purposes & // No matter what is defined in the consent, it will always include the "anonymous" purposes.
    (consentPurposes | DataPurposeFlags.Any_Anonymous)) > 0;
};

let metadata;
const clearMetadata = (event, client)=>((metadata = event?.metadata) && (client ? (delete metadata.posted, delete metadata.queued, !Object.entries(metadata).length && delete event.metadata) : delete event.metadata), event);

const isEventPatch = (value)=>!!value?.patchTargetId;

var VariableScope;
(function(VariableScope) {
    /** Global variables. */ VariableScope[VariableScope["Global"] = 0] = "Global";
    /**
   * Variables related to an external identity.
   * One use case could be used to augment data a CMS with real-time data related to personalization or testing.
   */ VariableScope[VariableScope["Entity"] = 1] = "Entity";
    /** Variables related to sessions. */ VariableScope[VariableScope["Session"] = 2] = "Session";
    /** Variables related to a device (browser or app). */ VariableScope[VariableScope["Device"] = 3] = "Device";
    /** Variables related to an identified user. */ VariableScope[VariableScope["User"] = 4] = "User";
})(VariableScope || (VariableScope = {}));
const variableScope = createEnumAccessor(VariableScope, false, "variable scope");
const isTrackerScoped = (value)=>variableScope(value?.scope) >= 2;
/** Removes target ID from tracker scoped variables and variable results. */ const restrictTargets = (value)=>(isArray(value) ? value.map(restrictTargets) : isTrackerScoped(value) && delete value.targetId, value?.current && restrictTargets(value.current), value);
const Necessary = {
    classification: DataClassification.Anonymous,
    purposes: DataPurposeFlags.Necessary
};
/** Returns a description of a key that can be used for logging and error messages.  */ const formatKey = (key)=>`'${key.key}' in ${variableScope.format(key.scope)} scope`;
const stripPrefix = (key)=>key && {
        ...key,
        key: parseKey(key.key).key
    };
/** Returns the individual parts of a key specified as a string.  */ const parseKey = (sourceKey)=>{
    if (sourceKey == null) return undefined;
    const not = sourceKey[0] === "!";
    if (not) {
        sourceKey = sourceKey.slice(1);
    }
    const prefixIndex = sourceKey.indexOf(":");
    const prefix = prefixIndex < 0 ? "" : sourceKey.substring(0, prefixIndex);
    const key = prefixIndex > -1 ? sourceKey.slice(prefixIndex + 1) : sourceKey;
    return {
        prefix,
        key,
        sourceKey,
        not
    };
};
const VariableEnumProperties = {
    scope: variableScope,
    purpose: singleDataPurpose,
    purposes: dataPurposes,
    classification: dataClassification
};
const toNumericVariableEnums = createEnumPropertyParser(VariableEnumProperties);
const extractKey = (variable, classificationSource)=>variable ? {
        scope: variableScope(variable.scope),
        targetId: variable.targetId,
        key: variable.key,
        ...classificationSource && {
            classification: dataClassification(classificationSource.classification),
            purposes: dataPurposes(classificationSource.purposes)
        }
    } : undefined;
const sortVariables = (variables)=>variables?.filter(FILTER_NULLISH).sort((x, y)=>x.scope === y.scope ? x.key.localeCompare(y.key, "en") : x.scope - y.scope);

var VariablePatchType;
(function(VariablePatchType) {
    VariablePatchType[VariablePatchType["Add"] = 0] = "Add";
    VariablePatchType[VariablePatchType["Min"] = 1] = "Min";
    VariablePatchType[VariablePatchType["Max"] = 2] = "Max";
    VariablePatchType[VariablePatchType["IfMatch"] = 3] = "IfMatch";
    VariablePatchType[VariablePatchType["IfNoneMatch"] = 4] = "IfNoneMatch";
})(VariablePatchType || (VariablePatchType = {}));
const patchType = createEnumAccessor(VariablePatchType, false, "variable patch type");
const isVariablePatchAction = (setter)=>isFunction(setter?.["patch"]);

const isPostResponse = (response)=>!!response?.variables;

var VariableResultStatus;
(function(VariableResultStatus) {
    VariableResultStatus[VariableResultStatus["Success"] = 200] = "Success";
    VariableResultStatus[VariableResultStatus["Created"] = 201] = "Created";
    VariableResultStatus[VariableResultStatus["Unchanged"] = 304] = "Unchanged";
    VariableResultStatus[VariableResultStatus["Denied"] = 403] = "Denied";
    VariableResultStatus[VariableResultStatus["NotFound"] = 404] = "NotFound";
    VariableResultStatus[VariableResultStatus["ReadOnly"] = 405] = "ReadOnly";
    VariableResultStatus[VariableResultStatus["Conflict"] = 409] = "Conflict";
    VariableResultStatus[VariableResultStatus["Unsupported"] = 501] = "Unsupported";
    VariableResultStatus[VariableResultStatus["Invalid"] = 400] = "Invalid";
    VariableResultStatus[VariableResultStatus["Error"] = 500] = "Error";
})(VariableResultStatus || (VariableResultStatus = {}));
const resultStatus = createEnumAccessor(VariableResultStatus, false, "variable set status");
const toVariableResultPromise = (getResults, errorHandlers, push)=>{
    const results = getResults();
    let mapResults = (results)=>results;
    let unwrappedResults;
    const property = (map, errorHandler = handleResultErrors)=>deferredPromise(async ()=>(unwrappedResults = mapResults(errorHandler(await results, errorHandlers))) && map(unwrappedResults));
    const promise = {
        then: property((items)=>items).then,
        all: property((items)=>items, (items)=>items),
        changed: property((items)=>filter(items, (item)=>item.status < 300)),
        variables: property((items)=>map(items, getResultVariable)),
        values: property((items)=>map(items, (item)=>getResultVariable(item)?.value)),
        push: ()=>(mapResults = (results)=>(push?.(map(getSuccessResults(results))), results), promise),
        value: property((items)=>getResultVariable(items[0])?.value),
        variable: property((items)=>getResultVariable(items[0])),
        result: property((items)=>items[0])
    };
    return promise;
};
const getSuccessResults = (results)=>results?.map((result)=>result?.status < 400 ? result : undefined$1);
const getResultKey = (result)=>result?.source?.key != null ? result.source : result?.key != null ? result : undefined$1;
const getResultVariable = (result)=>isSuccessResult(result) ? result.current ?? result : undefined$1;
const isSuccessResult = (result, requireValue = false)=>requireValue ? result?.status < 300 : result?.status < 400 || result?.status === 404;
const handleResultErrors = (results, errorHandlers, requireValue)=>{
    const errors = [];
    let errorHandler;
    let errorMessage;
    const successResults = map(array(results), (result, i)=>result && (result.status < 400 || !requireValue && result.status === 404 // Not found can only occur for get requests, and those are all right.
         ? result : (errorMessage = `${formatKey(result.source ?? result)} could not be ${result.status === 404 ? "found." : `${result.source || result.status !== 500 ? "set" : "read"} because ${result.status === 409 ? `of a conflict. The expected version '${result.source?.version}' did not match the current version '${result.current?.version}'.` : result.status === 403 ? result.error ?? "the operation was denied." : result.status === 400 ? result.error ?? "the value does not conform to the schema" : result.status === 405 ? "it is read only." : result.status === 500 ? `of an unexpected error: ${result.error}` : "of an unknown reason."}`}`, ((errorHandler = errorHandlers?.[i]) == null || errorHandler(result, errorMessage) !== false) && errors.push(errorMessage), undefined$1)));
    if (errors.length) return throwError(errors.join("\n"));
    return isArray(results) ? successResults : successResults?.[0];
};
const requireFound = (variable)=>handleResultErrors(variable, undefined$1, true);

const isTrackedEvent = (ev)=>ev && typeof ev.type === "string";

const isPassiveEvent = (value)=>!!(value?.metadata?.passive || value?.patchTargetId);

const typeTest = (...types)=>(ev)=>ev?.type && types.some((type)=>type === ev?.type);

const isFormEvent = typeTest("form");

const isComponentClickEvent = typeTest("component_click");

const isComponentClickIntentEvent = typeTest("component_click_intent");

const isComponentViewEvent = typeTest("component_view");

const isNavigationEvent = typeTest("navigation");

const isScrollEvent = typeTest("scroll");

const isSearchEvent = typeTest("search");

const isSessionStartedEvent = typeTest("session_started");

const isUserAgentEvent = typeTest("user_agent");

const isViewEvent = typeTest("view");

const isClientLocationEvent = typeTest("session_location");

const isAnchorEvent = typeTest("anchor_navigation");

const isConsentEvent = typeTest("consent");

const isCartEvent = typeTest("cart_updated");

const isOrderEvent = typeTest("order");

const isCartAbandonedEvent = typeTest("cart_abandoned");

const isOrderCancelledEvent = typeTest("order_cancelled");
const isOrderCompletedEvent = typeTest("order_completed");

const isPaymentAcceptedEvent = typeTest("payment_accepted");
const isPaymentRejectedEvent = typeTest("payment_rejected");

const isSignOutEvent = typeTest("sign_out");
const isSignInEvent = typeTest("sign_in");

const isImpressionEvent = typeTest("impression");

const isResetEvent = typeTest("reset");

const maybeDecode = (s)=>// It qualifies:
    s && /^(%[A-F0-9]{2}|[^%])*$/gi.test(s) && // It needs it:
    /[A-F0-9]{2}/gi.test(s) ? decodeURIComponent(s) : s;
const parseTags = (tagString, prefix)=>map(collectTags(tagString, prefix)?.values());
const parseTagValue = (value, tagName = "tag")=>parseTags(tagName + value)?.[0];
let key;
let current;
const collect = (collected, tag)=>tag && (!(current = collected.get(key = tag.tag + (tag.value ?? ""))) || (current.score ?? 1) < (tag.score ?? 1)) && collected.set(key, tag);
/**
 * Parses tags from a string or array of strings and collects them in a map to avoid duplicates.
 * In case of ties between tags with the same names and values but with different scores, the highest wins.
 */ const collectTags = (tagString, prefix = "", collected = new Map())=>{
    if (!tagString) return undefined;
    if (isIterable(tagString)) {
        forEach(tagString, (input)=>collectTags(input, prefix, collected));
        return collected;
    }
    /**
   * [namespace::]name[ws*][(:|=)[ws*]value][`~`score] [( |,|;|&|#) more tags]
   *
   * The parts of a tail.j tag are:
   * 1. Optional namespace (utm, ai, cms).
   *   - Anything not whitespace, colon (`:`) or tilde (`~`) followed by double colon `::`.
   * 2. Tag name:
   *   - Anything not whitespace, colon (`:`), tilde `~` or equality (`=`).
   * 3. Optional value.
   *   - Anything not a separator a other whitespace than space (` `).
   *   - If the value is supposed to contain one of these characters it must be quoted in either single (`\`) or double quotes (`"`).
   *   - The tag name and value are separated by either:
   *     - `:` - Follows normal writing convention in many languages (`country: Denmark, name: Glottal sound`), or
   *     - `=` - Is what you typically write in programming.
   *   - Escaping values within quotes is not required. The last quote followed by a terminator or score ends the value. (`tag1: "This "value" contains" quotes" tag2=...`)
   * 4. Optional score. How much the tag applies to the target (for example audience:investors~9 audience:consumers~3 - very relevant for investors, a little bit for consumers).
   *   - You can use decimals in the score (e.g. 5.343).
   *   - The parsed score gets divided by 10, so you should generally aim for values between 0 and 10 since that corresponds to a percentage between 0 and 100%.
   *     This also means that if you output machine generated scores (could be from an algorithm) they tend to already be between 0 and 1, so here you must multiply them with 10 when encoding the tag to get the intended result.
   *   - The default is 10 (100 %).
   *
   *  Tags are separated by either:
   *     - Space (` `) (input friendly)
   *     - Hash tag (`#`) - Some people might do that without thinking about it since that is how they normally write tags
   *     - Comma (`,`) - How most would intuitively join strings in code),
   *     - Semicolon (`;`) - CSS style
   *     - Ampersand - URL query string style.
   *     - Repeated separators gets ignored so don't worry about empty entries if you write something like `tag1,,,,tag2`.
   *
   *   Both namespace, name and value will be URI decoded if they contain %xx anywhere in them.
   */ isString(tagString) ? match(tagString, /(?:([^\s:~]+)::(?![ :=]))?([^\s~]+?)(?:\s*[:=]\s*(?:"((?:"[^"]*|.)*?)(?:"|$)|'((?:'[^'~]*|.)*?)(?:'|$)|((?: *(?:(?:[^,&;#\s~])))*))\s*)?(?: *~ *(\d*(?:\.\d*)?))?(?:[\s,&;#~]+|$)/g, (_, ns, localName, quoted1, quoted2, unquoted, score)=>{
        const name = (ns ? maybeDecode(ns) + "::" : "") + prefix + maybeDecode(localName);
        let tag = {
            tag: name,
            value: maybeDecode(quoted1 ?? quoted2 ?? unquoted)
        };
        score && parseFloat(score) !== 10 && (tag.score = parseFloat(score) / 10);
        collect(collected, tag);
    }) : collect(collected, tagString);
    return collected;
};
const encodeTag = (tag)=>tag == null ? tag : tag.tag + (tag.value ? ":" + (/[,&;#~]/.test(tag.value) ? '"' + tag.value + '"' : tag.value) : "") + (tag.score && tag.score !== 1 ? "~" + tag.score * 10 : "");

export { DataClassification, DataPurposeFlags, FullConsent, Necessary, NoConsent, VariableEnumProperties, VariablePatchType, VariableResultStatus, VariableScope, clearMetadata, collectTags, dataClassification, dataPurposes, dataUsageEquals, encodeTag, extractKey, formatKey, getResultKey, getResultVariable, getSuccessResults, handleResultErrors, isAnchorEvent, isCartAbandonedEvent, isCartEvent, isClientLocationEvent, isComponentClickEvent, isComponentClickIntentEvent, isComponentViewEvent, isConsentEvent, isEventPatch, isFormEvent, isImpressionEvent, isNavigationEvent, isOrderCancelledEvent, isOrderCompletedEvent, isOrderEvent, isPassiveEvent, isPaymentAcceptedEvent, isPaymentRejectedEvent, isPostResponse, isResetEvent, isScrollEvent, isSearchEvent, isSessionStartedEvent, isSignInEvent, isSignOutEvent, isSuccessResult, isTrackedEvent, isTrackerScoped, isUserAgentEvent, isUserConsent, isVariablePatchAction, isViewEvent, parseDataUsage, parseKey, parseTagValue, parseTags, patchType, requireFound, restrictTargets, resultStatus, singleDataPurpose, sortVariables, stripPrefix, toNumericVariableEnums, toVariableResultPromise, validateConsent, variableScope };
