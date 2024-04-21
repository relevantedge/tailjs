const undefined$1 = void 0;
/** Caching this value potentially speeds up tests rather than using `Number.MAX_SAFE_INTEGER`. */ const MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER;
/** Using this cached value speeds up testing if an object is iterable seemingly by an order of magnitude. */ const symbolIterator = Symbol.iterator;
const isUndefined = (value)=>value === undefined$1;
const isDefined = (value)=>value !== undefined$1;
const ifDefined = (value, result)=>value !== undefined$1 ? result(value) : undefined$1;
const isNumber = (value)=>typeof value === "number";
const isString = (value)=>typeof value === "string";
const isArray = Array.isArray;
/**
 * Returns the value as an array following these rules:
 * - If the value is undefined (this does not include `null`), so is the return value.
 * - If the value is already an array its original value is returned unless `clone` is true. In that case a copy of the value is returned.
 * - If the value is iterable, an array containing its values is returned
 * - Otherwise, an array with the value as its single item is returned.
 */ const toArray = (value, clone = false)=>isUndefined(value) ? undefined$1 : !clone && isArray(value) ? value : isIterable(value) ? [
        ...value
    ] : // ? toArrayAsync(value)
    [
        value
    ];
const isObject = (value, acceptIterables = false)=>value != null && typeof value === "object" && (acceptIterables || !value[symbolIterator]);
const isFunction = (value)=>typeof value === "function";
const isIterable = (value, acceptStrings = false)=>!!(value?.[symbolIterator] && (typeof value === "object" || acceptStrings));
const isAwaitable = (value)=>!!value?.then;

const throwError = (error, transform = (message)=>new TypeError(message))=>{
    throw isString(error = unwrap(error)) ? transform(error) : error;
};
const required = (value, error)=>value != null ? value : throwError(error ?? "A required value is missing", (text)=>new TypeError(text.replace("...", " is required.")));

let stopInvoked = false;
function* createFilteringIterator(source, projection) {
    if (!source) return;
    let i = 0;
    for (let item of source){
        projection && (item = projection(item, i++));
        if (item !== undefined$1) {
            yield item;
        }
        if (stopInvoked) {
            stopInvoked = false;
            break;
        }
    }
}
function* createObjectIterator(source, action) {
    let i = 0;
    for(const key in source){
        let value = [
            key,
            source[key]
        ];
        action && (value = action(value, i++));
        if (value !== undefined$1) {
            yield value;
        }
        if (stopInvoked) {
            stopInvoked = false;
            break;
        }
    }
}
function* createRangeIterator(length = 0, offset = 0) {
    while(length--)yield offset++;
}
function* createNavigatingIterator(step, start, maxIterations = Number.MAX_SAFE_INTEGER) {
    if (isDefined(start)) yield start;
    while(maxIterations-- && isDefined(start = step(start))){
        yield start;
    }
}
const sliceAction = (action, start, end)=>(start ?? end) !== undefined$1 ? (start ??= 0, end ??= MAX_SAFE_INTEGER, (value, index)=>start-- ? undefined$1 : end-- ? action ? action(value, index) : value : end) : action;
const createIterator = (source, projection, start, end)=>source == null ? [] : source[symbolIterator] ? createFilteringIterator(source, start === undefined$1 ? projection : sliceAction(projection, start, end)) : typeof source === "object" ? createObjectIterator(source, sliceAction(projection, start, end)) : createIterator(isFunction(source) ? createNavigatingIterator(source, start, end) : createRangeIterator(source, start), projection);
const project = (source, projection, start, end)=>isNumber(projection) ? createIterator(source, undefined$1, projection, start) : createIterator(source, projection, start, end);
const map = (source, projection, start, end)=>{
    if (isArray(source)) {
        let i = 0;
        const mapped = [];
        isNumber(projection) && ([projection, start, end] = [
            undefined$1,
            projection,
            start
        ]);
        start = start < 0 ? source.length + start : start ?? 0;
        end = end < 0 ? source.length + end : end ?? source.length;
        for(; start < end && !stopInvoked; start++){
            let value = source[start];
            if (projection && value !== undefined$1) {
                value = projection(value, i++);
            }
            if (value !== undefined$1) {
                mapped.push(value);
            }
        }
        stopInvoked = false;
        return mapped;
    }
    return source !== undefined$1 ? toArray(project(source, projection, start, end)) : undefined$1;
};
const forEachArray = (source, action, start, end)=>{
    let returnValue;
    let i = 0;
    start = start < 0 ? source.length + start : start ?? 0;
    end = end < 0 ? source.length + end : end ?? source.length;
    for(; start < end; start++){
        if (source[start] !== undefined$1 && (returnValue = action(source[start], i++) ?? returnValue, stopInvoked)) {
            stopInvoked = false;
            break;
        }
    }
    return returnValue;
};
const forEachItereable = (source, action)=>{
    let returnValue;
    let i = 0;
    for (let value of source){
        if (value !== undefined$1 && (returnValue = action(value, i++) ?? returnValue, stopInvoked)) {
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
        if (source[symbolIterator]) return forEachItereable(source, action);
        if (typeof source === "object") return forEachObject(source, action);
    }
    let returnValue;
    for (const value of createIterator(source, action, start, end)){
        returnValue = value ?? returnValue;
    }
    return returnValue;
};
const last = (source, predicate, start, end)=>!source ? undefined$1 : isArray(source) ? source[source.length - 1] : forEachInternal(source, (item, i)=>!predicate || predicate(item, i) ? item : undefined$1, start, end);

const define = (target, ...args)=>{
    const add = (arg, defaults)=>{
        if (!arg) return;
        let properties;
        if (isArray(arg)) {
            if (isObject(arg[0])) {
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
                ...isObject(value) && ("get" in value || "value" in value) ? value : isFunction(value) && !value.length ? {
                    get: value
                } : {
                    value
                }
            }));
    };
    args.forEach((arg)=>add(arg));
    return target;
};
const unwrap = (value)=>isFunction(value) ? unwrap(value()) : isAwaitable(value) ? value.then((result)=>unwrap(result)) : value;

const conjunct = (values, conjunction = "and")=>ifDefined(values, (values)=>(values = isIterable(values) ? map(values, (value)=>value + "") : [
            values + ""
        ], values.length === 0 ? "" : values.length === 1 ? values[0] : `${values.slice(0, -1).join(", ")} ${conjunction} ${last(values)}`));
const quote = (item)=>ifDefined(item, (item)=>isIterable(item) ? map(item, (item)=>"'" + item + "'") : "'" + item + "'");

const createEnumAccessor = (sourceEnum, flags, enumName, pureFlags)=>{
    const names = Object.fromEntries(Object.entries(sourceEnum).filter(([key, value])=>isString(key) && isNumber(value)).map(([key, value])=>[
            key.toLowerCase(),
            value
        ]));
    const entries = Object.entries(names);
    const values = Object.values(names);
    const any = values.reduce((any, flag)=>any | flag, 0);
    const nameLookup = flags ? {
        ...names,
        any,
        none: 0
    } : names;
    const valueLookup = Object.fromEntries(entries.map(([key, value])=>[
            value,
            key
        ]));
    const parseValue = (value, validateNumbers)=>isString(value) ? nameLookup[value] ?? nameLookup[value.toLowerCase()] : isNumber(value) ? !flags && validateNumbers ? isDefined(valueLookup[value]) ? value : undefined$1 : value : undefined$1;
    const [tryParse, lookup] = flags ? [
        (value, validateNumbers)=>Array.isArray(value) ? value.reduce((flags, flag)=>(flag = parseValue(flag, validateNumbers)) == null ? flags : (flags ?? 0) | flag, undefined$1) : parseValue(value),
        (value, format)=>(value = tryParse(value, false)) == null ? undefined$1 : format && (value & any) === any ? "any" : (value = entries.filter(([, flag])=>value & flag).map(([name])=>name), format ? value.length ? value.length === 1 ? value[0] : value : "none" : value)
    ] : [
        parseValue,
        (value)=>(value = parseValue(value)) != null ? valueLookup[value] : undefined$1
    ];
    let originalValue;
    const parse = (value, validateNumbers)=>value == null ? undefined$1 : (value = tryParse(originalValue = value, validateNumbers)) == null ? throwError(new TypeError(`${JSON.stringify(originalValue)} is not a valid ${enumName} value.`)) : value;
    const pure = entries.filter(([, value])=>!pureFlags || pureFlags & value);
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
            logFormat: (value, c = "or")=>(value = lookup(value, true), value === "any" ? "any " + enumName : `the ${enumName} ${conjunct(quote(value), c)}`)
        },
        flags && {
            pure,
            map: (flags, map)=>(flags = parse(flags), pure.filter(([, flag])=>flag & flags).map(map ?? (([, flag])=>flag)))
        }
    ]);
};

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
   * This level is the default when a user has consented to necessary infomration being collected via a  cookie discalimer or similar.
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
 //const x: DataClassificationValue = "anonymous"

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
   * This would be the case if a user is able to use an app and website interchangably for the same service. Different areas of a brand may
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
   * This would be the case if a user is able to use an app and website interchangably for the same service. Different areas of a brand may
   * also be distributed across multiple domain names.
   *
   */ DataPurposeFlags[DataPurposeFlags["Performance"] = 4] = "Performance";
    /**
   * Data stored for this purpose may be similar to both functionality and performance data, however it may be shared with third parties
   * or otherwise used to perform marketing outside the scope of the specific website or app.
   *
   * If the data is only used for different website and apps that relate to the same product or service, it might not be necessary
   * to use this category.
   * This would be the case if a user is able to use an app and website interchangably for the same service. Different areas of a brand may
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
   * All purposes that are permissable for anonymous users.
   */ DataPurposeFlags[DataPurposeFlags["Anonymous"] = 49] = "Anonymous";
    /**
   * Data can be used for any purpose.
   */ DataPurposeFlags[DataPurposeFlags["Any"] = 63] = "Any";
})(DataPurposeFlags || (DataPurposeFlags = {}));
const purePurposes = 1 | 2 | 4 | 8 | 16 | 32;
const dataPurposes = createEnumAccessor(DataPurposeFlags, true, "data purpose", purePurposes);
const singleDataPurpose = createEnumAccessor(DataPurposeFlags, false, "data purpose");

const NoConsent = Object.freeze({
    level: DataClassification.Anonymous,
    purposes: DataPurposeFlags.Anonymous
});
const FullConsent = Object.freeze({
    level: DataClassification.Sensitive,
    purposes: DataPurposeFlags.Any
});
const isUserConsent = (value)=>!!value?.["level"];
const validateConsent = (source, consent, defaultClassification)=>{
    if (!source) return undefined;
    const classification = dataClassification.parse(source.classification, false) ?? required(dataClassification(defaultClassification?.classification), "The source has not defined a data classification and no default was provided.");
    let purposes = dataPurposes.parse(source.purposes, false) ?? required(dataPurposes.parse(defaultClassification?.purposes, false), "The source has not defined data purposes and no default was provided.");
    return source && classification <= dataClassification.parse(consent["classification"] ?? consent["level"], false) && (purposes & // No matter what is defined in the consent, it will always include the "anonymous" purposes.
    (dataPurposes.parse(consent.purposes, false) | DataPurposeFlags.Anonymous)) > 0;
};

var VariableScope;
(function(VariableScope) {
    /** Global variables. */ VariableScope[VariableScope["Global"] = 0] = "Global";
    /** Variables related to sessions. */ VariableScope[VariableScope["Session"] = 1] = "Session";
    /** Variables related to a device (browser or app). */ VariableScope[VariableScope["Device"] = 2] = "Device";
    /** Variables related to an identified user. */ VariableScope[VariableScope["User"] = 3] = "User";
    /**
   * Variables related to an external identity.
   * One use case could be used to augment data a CMS with real-time data related to personalization or testing.
   */ VariableScope[VariableScope["Entity"] = 4] = "Entity";
})(VariableScope || (VariableScope = {}));
const variableScope = createEnumAccessor(VariableScope, false, "variable scope");
/** Returns a description of a key that can be used for logging and error messages.  */ const formatKey = (key)=>`'${key.key}' in ${variableScope.format(key.scope)} scope`;
const stripPrefix = (key)=>key && {
        ...key,
        key: parseKey(key.key).key
    };
/** Returns the individual parts of a key specified as a string.  */ const parseKey = (sourceKey)=>{
    if (isUndefined(sourceKey)) return undefined;
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
const enumProperties = [
    [
        "scope",
        variableScope
    ],
    [
        "purpose",
        singleDataPurpose
    ],
    [
        "purposes",
        dataPurposes
    ],
    [
        "classification",
        dataClassification
    ]
];
const toNumericVariable = (value)=>{
    if (!value) return value;
    enumProperties.forEach(([prop, helper])=>value[prop] = helper.parse(value[prop]));
    return value;
};

const getResultVariable = (result)=>result?.status < 400 ? result.current ?? result : undefined;

var VariableResultStatus;
(function(VariableResultStatus) {
    VariableResultStatus[VariableResultStatus["Success"] = 200] = "Success";
    VariableResultStatus[VariableResultStatus["Created"] = 201] = "Created";
    VariableResultStatus[VariableResultStatus["Unchanged"] = 304] = "Unchanged";
    VariableResultStatus[VariableResultStatus["Conflict"] = 409] = "Conflict";
    VariableResultStatus[VariableResultStatus["Unsupported"] = 501] = "Unsupported";
    VariableResultStatus[VariableResultStatus["Denied"] = 403] = "Denied";
    VariableResultStatus[VariableResultStatus["ReadOnly"] = 405] = "ReadOnly";
    VariableResultStatus[VariableResultStatus["NotFound"] = 404] = "NotFound";
    VariableResultStatus[VariableResultStatus["Invalid"] = 400] = "Invalid";
    VariableResultStatus[VariableResultStatus["Error"] = 500] = "Error";
})(VariableResultStatus || (VariableResultStatus = {}));
const resultStatus = createEnumAccessor(VariableResultStatus, false, "variable set status");
var VariablePatchType;
(function(VariablePatchType) {
    VariablePatchType[VariablePatchType["Add"] = 0] = "Add";
    VariablePatchType[VariablePatchType["Min"] = 1] = "Min";
    VariablePatchType[VariablePatchType["Max"] = 2] = "Max";
    VariablePatchType[VariablePatchType["IfMatch"] = 3] = "IfMatch";
    VariablePatchType[VariablePatchType["IfNoneMatch"] = 4] = "IfNoneMatch";
})(VariablePatchType || (VariablePatchType = {}));
const patchType = createEnumAccessor(VariablePatchType, false, "variable patch type");
const isVariablePatch = (setter)=>!!setter?.["patch"];
const isVariablePatchAction = (setter)=>isFunction(setter["patch"]);
const isScoped = (value)=>isDefined(value?.scope);
const handleResultErrors = (result, throwErrors)=>{
    if ((throwErrors?.throw ?? throwErrors) === false) {
        return result;
    }
    if (isArray(result)) {
        result.forEach(handleResultErrors);
        return result;
    }
    return result.status < 400 || result.status === 404 // Not found can only occur for get requests, and those are all right.
     ? result : throwError(`${formatKey(result.source ?? result)} could not be ${result.source || result.status !== 500 ? "set" : "read"} because ${result.status === 409 ? `of a conflict. The expected version '${result.source.version}' did not match the current version '${result.current?.version}'.` : result.status === 403 ? result.error ?? "the operation was denied." : result.status === 400 ? result.error ?? "the value does not conform to the schema" : result.status === 405 ? "it is read only." : result.status === 500 ? `of an unexpected error: ${result.error}` : "of an unknown reason."}`);
};

const typeTest = (...types)=>(ev)=>ev?.type && types.some((type)=>type === ev?.type);

const isFormEvent = typeTest("FORM");

const isComponentClickEvent = typeTest("COMPONENT_CLICK");

const isComponentViewEent = typeTest("COMPONENT_VIEW");

const isNavigationEvent = typeTest("NAVIGATION");

const isScrollEvent = typeTest("SCROLL");

const isSearchEvent = typeTest("SEARCH");

const isSessionStartedEvent = typeTest("SESSION_STARTED");

const isTrackedEvent = (ev)=>ev && typeof ev.type === "string";

const isUserAgentEvent = typeTest("USER_AGENT");

const isViewEvent = typeTest("VIEW");

const isViewEndedEvent = typeTest("VIEW_ENDED");

const isClientLocationEvent = typeTest("SESSION_LOCATION");

const isAnchorEvent = typeTest("ANCHOR_NAVIGATION");

const isConsentEvent = typeTest("CONSENT");

const isCartEvent = typeTest("CART_UPDATED");

const isOrderEvent = typeTest("ORDER");

const isCartAbandonedEvent = typeTest("CART_ABANDONED");

const isOrderCancelledEvent = typeTest("ORDER_CANCELLED");
const isOrderCompletedEvent = typeTest("ORDER_COMPLETED");

const isPaymentAcceptedEvent = typeTest("PAYMENT_ACCEPTED");
const isPaymentRejectedEvent = typeTest("PAYMENT_REJECTED");

const isSignOutEvent = typeTest("SIGN_OUT");
const isSignInEvent = typeTest("SIGN_IN");

const isHeartBeatEvent = typeTest("HEARTBEAT");

const isImpressionEvent = typeTest("IMPRESSION");

const isResetEvent = typeTest("RESET");

function transformLocalIds(ev, transform) {
    ev = {
        ...ev
    };
    assign(ev, "id");
    assign(ev, "view");
    assign(ev, "related");
    return ev;
    function assign(target, property) {
        if (target?.[property]) {
            target[property] = transform(target[property]) || target[property];
        }
    }
}

const splitRanks = (ranks)=>ranks?.toLowerCase().replace(/[^a-zA-Z0-9:.-]/g, "_").split(":").filter((rank)=>rank) ?? [];
/**
 * Parses the tags out of a string
 */ const parseTagString = (input, baseRank, target)=>{
    if (!input) return [];
    if (Array.isArray(input)) input = input.join(",");
    // We have an unescaped percentage sign followed by an uppercase two-digit hexadecimal number. Smells like URI encoding!
    if (/(?<!(?<!\\)\\)%[A-Z0-9]{2}/.test(input)) {
        try {
            input = decodeURIComponent(input.replace(// Change ampersands to commas (as they are value separators), and quote all values just to be sure nothing gets out of control.
            // That is, `tag=test&tag2&tag3=Encoded%3A%20%22%F0%9F%A5%B3%22` becomes `tag="test",tag2,tag3="Encoded: \"🥳\""
            /([^=&]+)(?:\=([^&]+))?(&|$)/g, (_, name, value, sep)=>[
                    name,
                    value && `="${value.replace(/(?<!(?<!\\)\\)("|%22)/g, '\\"')}"`,
                    sep && ","
                ].join("")));
        // Need to catch exceptions. `decodeURIComponent` will fail on invalid surrogate code points. `%80` is one of those.
        } catch  {}
    }
    let tags = [], parsedTag, baseRanks = splitRanks(baseRank);
    input.replace(// Explained:
    // 1. Tag (group 1): (\s*(?=\=)|(?:\\.|[^,=\r\n])+). It means "skip leading white-space", then either"
    //   1.1. \s*(?=\=) is "nothing but a `=`": a blank tag name causing the expression to skip to the actual value. ("=80,=43" are techincally supported but will get omitted unless the are base ranks (*))
    //   2.1. (?:\\.|[^,=\r\n])+ is "something not a linebreak including escaped characters such as \=":
    // 2. Value: (?:\=\s*(?:"((?:\\.|[^"])*)"|'((?:\\.|[^'])*)'|((?:\\.|\s*[^,\s])*)))?. Anything that starts with a `=` until we find a (non-escaped) comma
    //  2.1: (group 2) "((?:\\.|[^"])*)" is any double-quoted ()`"`) value, can contain commas, anything escaped, or whatever. Goes well with JSON.
    //  2.2: (group 3) is same as 2.1 just with a single quote (`'`).
    //  2.3: (group 4) is anything but a non-escaped comma (`,`)
    // 3. The end. (?:[,\s]+|$). This is the tag separator or end of string.
    //        Since tags cannot have line-breaks in them, this technically allows tags to be separated by line-breaks instead of comma.
    //        This should not be documented as values can very much have line-breaks, and that syntax will then bite you in the money-maker at some point.
    //        In the scary example below we get "tag1", "tag21:tag22" and then "tag3" with the value "value\tag4=value"(!).
    //        `tag1
    //        tag21:tag22
    //        tag3=value
    //        tag4=value`
    /\s*(\s*(?=\=)|(?:\\.|[^,=\r\n])+)\s*(?:\=\s*(?:"((?:\\.|[^"])*)"|'((?:\\.|[^'])*)'|((?:\\.|[^,])*)))?\s*(?:[,\s]+|$)/g, (_0, tag, quote1, quote2, unquoted)=>{
        let value = quote1 || quote2 || unquoted;
        let ranks = splitRanks(tag);
        baseRanks.length && // If we have base ranks (that, is a "prefix"), a single tag value is interpreted as a value. E.g. `<a data-name="foo"...` becomes `data:name=foo`.
        // We have this situation if there is exactly one rank, and no value.
        // Other examples: `<a data-employee="foo:test" ...` gives `data:employee:foo:test`. `data-employee="=test"` gives us `data:employee=test`, and
        //    `data-employee="id=80"` gives us `data:employee:id=80`.
        (ranks.length === 1 && !value && (value = ranks.pop()), ranks = baseRanks.concat(ranks)), // If we don't have any ranks (only a value), we don't have a tag.
        ranks.length && // * cf. expression explanition 1.1
        (tags.push(parsedTag = {
            ranks,
            value: value || undefined
        }), target?.add(encodeTag(parsedTag)));
        return ""; // This is a trick. We are not really replacing anything, we are instead using replace as a for loop.
    });
    return tags;
};
const encodeTag = (tag)=>tag == null ? tag : `${tag.ranks.join(":")}${tag.value ? `=${tag.value.replace(/,/g, "\\,")}` : ""}`;

/**
 *  No-op function to validate event types in TypeScript. Because function parameters are contravariant, passing an event that does not match on all properties will get red wiggly lines)
 *
 */ const cast = (item)=>item;

const SchemaSystemTypes = Object.freeze({
    Event: "urn:tailjs:core:event"
});
const SchemaAnnotations = Object.freeze({
    Tags: "x-tags",
    Purpose: "x-privacy-purpose",
    Purposes: "x-privacy-purposes",
    Classification: "x-privacy-class",
    Censor: "x-privacy-censor"
});

const parsePrivacyTokens = (tokens, classification = {})=>{
    tokens.split(/[,\s]/).map((keyword)=>keyword.trim()).filter((item)=>item).forEach((keyword)=>{
        if (keyword === "censor-ignore" || keyword === "censor-include") {
            classification.censorIgnore ??= keyword === "censor-ignore";
            return;
        }
        let parsed = dataPurposes.tryParse(keyword) ?? dataPurposes.tryParse(keyword.replace(/\-purpose$/g, ""));
        if (isDefined(parsed)) {
            classification.purposes = (classification.purposes ?? 0) | parsed;
            return;
        }
        parsed = dataClassification.tryParse(keyword) ?? dataClassification.tryParse(keyword.replace(/^personal-/g, ""));
        if (isDefined(parsed)) {
            if (classification.classification && parsed !== classification.classification) {
                throwError(`The data classification '${dataClassification.format(classification.classification)}' has already been specified and conflicts with the classification'${dataClassification.format(parsed)} inferred from the description.`);
            }
            classification.classification ??= parsed;
            return;
        }
        throwError(`Unknown privacy keyword '${keyword}'.`);
    });
    return classification;
};
const getPrivacyAnnotations = (classification)=>{
    const attrs = {};
    isDefined(classification.classification) && (attrs[SchemaAnnotations.Classification] = dataClassification.format(classification.classification));
    let purposes = dataPurposes.format(classification.purposes);
    isDefined(purposes) && (attrs[isString(purposes) ? SchemaAnnotations.Purpose : SchemaAnnotations.Purposes] = purposes);
    isDefined(classification.censorIgnore) && (attrs[SchemaAnnotations.Censor] = classification.censorIgnore ? "ignore" : "include");
    return attrs;
};

export { DataClassification, DataPurposeFlags, FullConsent, NoConsent, SchemaAnnotations, SchemaSystemTypes, VariablePatchType, VariableResultStatus, VariableScope, cast, dataClassification, dataPurposes, encodeTag, formatKey, getPrivacyAnnotations, getResultVariable, handleResultErrors, isAnchorEvent, isCartAbandonedEvent, isCartEvent, isClientLocationEvent, isComponentClickEvent, isComponentViewEent, isConsentEvent, isFormEvent, isHeartBeatEvent, isImpressionEvent, isNavigationEvent, isOrderCancelledEvent, isOrderCompletedEvent, isOrderEvent, isPaymentAcceptedEvent, isPaymentRejectedEvent, isResetEvent, isScoped, isScrollEvent, isSearchEvent, isSessionStartedEvent, isSignInEvent, isSignOutEvent, isTrackedEvent, isUserAgentEvent, isUserConsent, isVariablePatch, isVariablePatchAction, isViewEndedEvent, isViewEvent, parseKey, parsePrivacyTokens, parseTagString, patchType, resultStatus, singleDataPurpose, stripPrefix, toNumericVariable, transformLocalIds, validateConsent, variableScope };
