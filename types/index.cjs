'use strict';

var util = require('@tailjs/util');

const levels$1 = {
    /** Data can be read and written from anywhere. */ public: "public",
    /** Data can be read from anywhere but can only be written in trusted context. */ "trusted-write": "trusted-write",
    /** Data is only available in trusted context. */ "trusted-only": "trusted-only"
};
const DataVisibility = util.createEnumParser("data restriction", levels$1);

/**
 * Defines to which extend a piece of information relates to a natural individual which is typically someone visiting your app or website.
 *
 * Tail.js requires all data that can be collected to be classified to prevent any data from being stored or otherwise used beyond
 * an individual's consent.
 *
 * Be aware that de default settings in the tail.js schema *do not* guarantee legal compliance, and you are responsible
 * for not using the collected data for other purposes than those intended.
 *
 */ const levels = {
    /**
   * A "consent" for this data classification means that no data will be stored for any reason.
   *
   * Likewise, if used in a schema all data with this classification will not be stored.
   */ never: "never",
    /**
   * The data cannot be linked to a specific individual after they leave the website or app, and their session ends.
   *
   * This does _not_ include seemingly anonymous data such as the hash of an IP address, since that may still be linked back
   * to an individual using "additional information". As an example, if you want to test if a specific person visited a website at a given time
   * and you know their IP address at that time by some other means, you can generate a hash with the same algorithm and see if it is
   * in the data.
   *
   * Tail.js will collect this kind of data in a way that does not use cookies or other information persisted in the individual's device. */ anonymous: "anonymous",
    /**
   * The data is unlikely to identify an individual by itself, but may link to a specific individual if combined with other data.
   *
   * Examples are IP addresses, detailed location data, and randomly generated device IDs persisted over time to track returning visitors.
   */ indirect: "indirect",
    /**
   * The data directly identifies a specific individual.
   *
   * Examples are names, email addresses, user names, customer IDs from a CRM system or order numbers that can be linked
   * to another system where the persons details are available.
   */ direct: "direct",
    /**
   * Not only does the data identify a specific individual but may also reveal sensitive information about the user
   * such as health data, financial matters, race, political and religious views, or union membership.
   *
   * tail.js's default schema does not have any data with this classification. If you intend to capture sensitive data in your events
   * you may consider pseudonomizing it by hashing it or obfuscating it by some other mechanism.
   * Whether the data will then classify as "indirect" or still be "sensitive" depends on context, but it will arguably then be
   * "less sensitive".
   */ sensitive: "sensitive"
};
const DataClassification = util.createEnumParser("data classification", levels);

const DATA_PURPOSES = [
    "necessary",
    "performance",
    "functionality",
    "marketing",
    "personalization",
    "security"
];
const VALID_PURPOSE_NAMES = util.obj(DATA_PURPOSES, (purpose)=>[
        purpose,
        purpose
    ]);
const DATA_PURPOSES_ALL = Object.freeze(util.obj(DATA_PURPOSES, (purpose)=>[
        purpose,
        true
    ]));
const mapOptionalPurpose = (purpose, optionalPurposes)=>purpose === "personalization" && (optionalPurposes === null || optionalPurposes === void 0 ? void 0 : optionalPurposes.personalization) !== true ? "functionality" : purpose === "security" && (optionalPurposes === null || optionalPurposes === void 0 ? void 0 : optionalPurposes.security) !== true ? "necessary" : purpose;
const mapOptionalPurposes = (purposes, optionalPurposes)=>{
    let mappedPurposes = purposes;
    if ((optionalPurposes === null || optionalPurposes === void 0 ? void 0 : optionalPurposes.personalization) !== true && mappedPurposes.personalization != null) {
        mappedPurposes === purposes && (mappedPurposes = {
            ...purposes
        });
        if (mappedPurposes.functionality != null) {
            mappedPurposes.personalization = mappedPurposes.functionality;
        } else {
            mappedPurposes.functionality = mappedPurposes.personalization;
        }
        delete mappedPurposes.personalization;
    }
    if ((optionalPurposes === null || optionalPurposes === void 0 ? void 0 : optionalPurposes.security) !== true && mappedPurposes.security != null) {
        mappedPurposes === purposes && (mappedPurposes = {
            ...purposes
        });
        delete mappedPurposes.security;
    }
    return mappedPurposes;
};
const DataPurposes = {
    names: DATA_PURPOSES,
    specificNames: DATA_PURPOSES.filter((purpose)=>purpose !== "necessary"),
    parse: (value, { names = false, includeDefault = true, validate = true } = {})=>{
        if (value == null) return value;
        if (value.purposes) {
            // From DataUsage
            value = value.purposes;
        }
        if (util.isString(value)) {
            value = value.split(",");
        }
        if (util.isArray(value)) {
            const purposes = {};
            for (const name of value){
                if (name === SCHEMA_TYPE_PROPERTY) continue;
                if (!VALID_PURPOSE_NAMES[name]) {
                    validate && util.throwError(`The purpose name '${name}' is not defined.`);
                    continue;
                } else if (name !== "necessary") {
                    purposes[name] = true;
                }
            }
            value = purposes;
        }
        if (names) {
            const result = util.map(value, ([key, value])=>VALID_PURPOSE_NAMES[key] && value ? key : util.skip);
            return result.length || !includeDefault ? result : [
                "necessary"
            ];
        }
        return value;
    },
    get all () {
        return {
            functionality: true,
            marketing: true,
            performance: true,
            personalization: true,
            security: true
        };
    },
    test (target, test, { intersect, optionalPurposes, targetPurpose }) {
        if (typeof optionalPurposes === "boolean") {
            optionalPurposes = {
                personalization: optionalPurposes,
                security: optionalPurposes
            };
        }
        if (targetPurpose && (targetPurpose = mapOptionalPurpose(targetPurpose, optionalPurposes)) !== "necessary" && !test[mapOptionalPurpose(targetPurpose, optionalPurposes)]) {
            return false;
        }
        target = mapOptionalPurposes(target, optionalPurposes);
        test = mapOptionalPurposes(test, optionalPurposes);
        if (intersect) {
            for(let purpose in test){
                if (!VALID_PURPOSE_NAMES[purpose]) continue;
                if (test[purpose] && !target[purpose]) {
                    // At least one purpose in the consent is not present in the target.
                    return false;
                }
            }
            if (intersect === "all") {
                for(let purpose in target){
                    if (!VALID_PURPOSE_NAMES[purpose]) continue;
                    if (target[purpose] && !test[purpose]) {
                        // The target has a purpose that is not included in the consent.
                        return false;
                    }
                }
            }
            return true;
        }
        let hasAny = false;
        for(let purpose in target){
            if (!VALID_PURPOSE_NAMES[purpose]) continue;
            if (target[purpose]) {
                if (test[purpose]) {
                    // Just one of the purposes is good enough.
                    return true;
                }
                hasAny = true;
            }
        }
        // The target has at least one required purpose, and the consent does not include any.
        return !hasAny;
    }
};

const formatDataUsage = (usage)=>{
    var _usage_classification;
    return `${(_usage_classification = usage === null || usage === void 0 ? void 0 : usage.classification) !== null && _usage_classification !== void 0 ? _usage_classification : "anonymous"} data for ${util.itemize(DataPurposes.parse(usage === null || usage === void 0 ? void 0 : usage.purposes, {
        names: true
    }))} purposes.`;
};
const validateConsent = (target, consent, options)=>{
    if (target.classification === "never" || consent.classification === "never") {
        return false;
    }
    if (target.classification === "anonymous") {
        // Anonymous data does not require consent (it is not "_personal_ data" - just _data_).
        return true;
    }
    if (DataClassification.ranks[target.classification] > DataClassification.ranks[consent.classification]) {
        // Too personal.
        return false;
    }
    return DataPurposes.test(target.purposes, consent.purposes, options);
};
const DataUsage = {
    anonymous: {
        classification: "anonymous",
        purposes: {}
    },
    clone: (usage)=>usage && {
            classification: usage.classification,
            purposes: {
                ...usage.purposes
            },
            source: usage.source
        },
    equals: (usage1, usage2)=>usage1 === usage2 || usage1 && usage2 && usage1.classification === usage2.classification && DataPurposes.test(usage1.purposes, usage2.purposes, {
            intersect: "all",
            optionalPurposes: true
        }),
    applyOptional: (usage, optional = {})=>{
        if (!usage) {
            return usage;
        }
        if (!optional.security) {
            usage.purposes.security = true;
        }
        if (!optional.personalization) {
            usage.purposes.personalization = usage.purposes.functionality;
        }
        return usage;
    },
    serialize: (usage, optional)=>{
        if (!(optional === null || optional === void 0 ? void 0 : optional.security)) {
            usage = {
                ...usage,
                purposes: {
                    ...usage.purposes
                }
            };
            delete usage.purposes.security;
        }
        const purposes = DataPurposes.parse(usage.purposes, {
            names: true,
            includeDefault: false
        });
        return (!usage.classification || usage.classification === "anonymous") && !(purposes === null || purposes === void 0 ? void 0 : purposes.length) ? null : `${usage.classification}:${purposes}${usage.source ? ` (${usage.source})` : ""}`;
    },
    deserialize: (usageString, defaultUsage)=>{
        if (!usageString) return defaultUsage ? DataUsage.clone(defaultUsage) : {
            classification: "anonymous",
            purposes: {}
        };
        var _usageString_match;
        const match = (_usageString_match = usageString.match(/^\s*([^:]+):((?:\s+[^(]|[^\s])*)(?:\s+\((.+)\)\s*$)?/)) !== null && _usageString_match !== void 0 ? _usageString_match : [];
        var _DataClassification_parse, _DataPurposes_parse;
        return {
            classification: (_DataClassification_parse = DataClassification.parse(match[1], false)) !== null && _DataClassification_parse !== void 0 ? _DataClassification_parse : "anonymous",
            purposes: (_DataPurposes_parse = DataPurposes.parse(match[2], {
                validate: false
            })) !== null && _DataPurposes_parse !== void 0 ? _DataPurposes_parse : {},
            source: match[3]
        };
    }
};

let metadata;
const clearMetadata = (event, client)=>((metadata = event === null || event === void 0 ? void 0 : event.metadata) && (client ? (delete metadata.posted, delete metadata.queued, !Object.entries(metadata).length && delete event.metadata) : delete event.metadata), event);

const isEventPatch = (value)=>!!(value === null || value === void 0 ? void 0 : value.patchTargetId);

const getExternalReferenceKey = (reference)=>{
    var _reference_dataSource;
    return reference && `${reference.id}\0${((_reference_dataSource = reference.dataSource) === null || _reference_dataSource === void 0 ? void 0 : _reference_dataSource.id) || ""}\0${reference.source || ""}\0${reference.name || ""}`;
};
const externalReferencesEqual = (reference, other)=>{
    var _reference_dataSource, _other_dataSource;
    return reference && other && reference.id === other.id && reference.source === other.source && ((_reference_dataSource = reference.dataSource) === null || _reference_dataSource === void 0 ? void 0 : _reference_dataSource.id) === (other === null || other === void 0 ? void 0 : (_other_dataSource = other.dataSource) === null || _other_dataSource === void 0 ? void 0 : _other_dataSource.id) && reference.name === other.name;
};

const isEmpty = (value)=>{
    if (value) {
        for(const p in value){
            if (value[p] != null) {
                return false;
            }
        }
    }
    return true;
};
const hasComponentOrContent = (data)=>data ? !isEmpty(data.components) || !isEmpty(data.content) : false;
const uniqueReferences = (references)=>cleanOptionalArray(references, referenceKey);
const cleanOptionalArray = (values, uniqueKey, other, filter)=>{
    if (!values) {
        if (!other) {
            return undefined;
        }
        values = other;
    } else if (other) {
        values = [
            ...values,
            ...other
        ];
    }
    let cleaned = values;
    if (values.length) {
        let value;
        for(let i = 0; i < values.length; i++){
            if (!(value = values[i]) || filter && value != (value = filter(value))) {
                // Clone if need (`values` is immutable).
                cleaned = values.slice(0, i++);
                if (value) {
                    cleaned.push(value);
                }
                for(; i < values.length; i++){
                    if ((value = values[i]) && (!filter || (value = filter(value)))) {
                        cleaned.push(value);
                    }
                }
                break;
            }
        }
        if (!(cleaned === null || cleaned === void 0 ? void 0 : cleaned.length)) {
            cleaned = undefined;
        } else if (cleaned.length > 1 && uniqueKey) {
            const unique = new Map();
            for (let item of cleaned){
                unique.set(uniqueKey(item), item);
            }
            if (unique.size < cleaned.length) {
                cleaned = [
                    ...unique.values()
                ];
            }
        }
    }
    return cleaned;
};
const referenceKey = getExternalReferenceKey;
const isEmptyTrackingData = (data)=>{
    var _data_view, _data_view1;
    return(// `layer` ignored here, since layer + no other property is used to remove its data in the client.
    !data || isEmpty(data.components) && isEmpty(data.content) && !data.area && !data.cart && isEmpty(data.track) && isEmpty(data.extensions) && isEmpty(data.tags) && (!data.view || !((_data_view = data.view) === null || _data_view === void 0 ? void 0 : _data_view.definition) && isEmpty((_data_view1 = data.view) === null || _data_view1 === void 0 ? void 0 : _data_view1.tags)));
};
const isIterable = (value)=>value ? typeof value !== "string" && Symbol.iterator in value : false;
const appendTrackingData = (current, other, keepEmpty = true)=>{
    if (current === other) {
        return normalizeTrackingData(current, keepEmpty);
    }
    if (!other) {
        return current || undefined;
    } else if (isIterable(other)) {
        let merged = current || undefined;
        for (const item of other){
            if (item) {
                merged = appendTrackingData(merged, item, keepEmpty);
            }
        }
        return merged;
    } else if (!current) {
        return normalizeTrackingData(other, keepEmpty) || undefined;
    }
    var _other_layer, _other_layerPriority, _cleanOptionalArray;
    return {
        components: cleanOptionalArray(current.components, referenceKey, other.components),
        content: cleanOptionalArray(current.content, referenceKey, other.content),
        area: other.area || current.area,
        cart: other.cart || current.cart,
        track: current.track ? other.track ? {
            ...current.track,
            ...other.track
        } : current.track : other.track || undefined,
        layer: (_other_layer = other.layer) !== null && _other_layer !== void 0 ? _other_layer : current.layer,
        layerPriority: (_other_layerPriority = other.layerPriority) !== null && _other_layerPriority !== void 0 ? _other_layerPriority : current.layerPriority,
        tags: cleanOptionalArray(current.tags, getTagKey, other.tags),
        view: current.view ? other.view ? {
            definition: other.view.definition || current.view.definition,
            tags: (_cleanOptionalArray = cleanOptionalArray(current.view.tags, getTagKey, other.view.tags)) !== null && _cleanOptionalArray !== void 0 ? _cleanOptionalArray : []
        } : current.view : other.view,
        extensions: current.extensions ? other.extensions ? {
            ...current.extensions,
            ...other.extensions
        } : current.extensions : other.extensions
    };
};
const normalizeTrackingData = (data, keepEmpty = false)=>{
    if (!data || !keepEmpty && isEmptyTrackingData(data)) {
        return undefined;
    }
    let updates = undefined;
    let cleanedArray;
    if ((cleanedArray = cleanOptionalArray(data.components, referenceKey)) !== data.components) {
        (updates !== null && updates !== void 0 ? updates : updates = {}).components = cleanedArray;
    }
    if ((cleanedArray = cleanOptionalArray(data.content, referenceKey)) !== data.content) {
        (updates !== null && updates !== void 0 ? updates : updates = {}).content = cleanedArray;
    }
    if ((cleanedArray = cleanOptionalArray(data.tags, getTagKey)) !== data.tags) {
        (updates !== null && updates !== void 0 ? updates : updates = {}).tags = cleanedArray;
    }
    let view = data.view;
    if (view !== undefined) {
        if (!view) {
            (updates !== null && updates !== void 0 ? updates : updates = {}).view = undefined;
        } else {
            const definition = view.definition || undefined;
            const viewTags = cleanOptionalArray(view.tags, getTagKey);
            if (definition !== view.definition || viewTags !== view.tags) {
                (updates !== null && updates !== void 0 ? updates : updates = {}).view = {
                    definition,
                    tags: viewTags
                };
            }
        }
    }
    return updates ? {
        ...data,
        ...updates
    } : data;
};
const getTagKey = (tag)=>{
    var _tag_value;
    return `${tag.tag}\0${(_tag_value = tag.value) !== null && _tag_value !== void 0 ? _tag_value : ""}\0${tag.eventType || ""}`;
};
const cleanBoundaryDataProperties = (data, eventType)=>{
    if (data == null || typeof data !== "object") {
        return data;
    }
    let cloned = data;
    for(const p in data){
        const value = data[p];
        if (value == null || typeof value !== "object") {
            continue;
        }
        let updatedValue = p === "track" ? undefined : p === "tags" ? uniqueTags(value, eventType) : cleanBoundaryDataProperties(value, eventType);
        if (value !== updatedValue) {
            if (cloned === data) {
                cloned = {
                    ...data
                };
            }
            cloned[p] = updatedValue;
        }
    }
    return data;
};
const uniqueTags = (tags, eventType = undefined, other)=>tags ? cleanOptionalArray(tags, getTagKey, other, eventType === false ? undefined : (tag)=>!tag.eventType ? tag : tag.eventType === eventType ? {
            ...tag,
            eventType: undefined
        } : undefined) : undefined;

const isPostResponse = (response)=>!!(response === null || response === void 0 ? void 0 : response.variables);

const CORE_SCHEMA_NS = "urn:tailjs:core";
const CORE_EVENT_TYPE = "urn:tailjs:core#TrackedEvent";
const CORE_EVENT_DISCRIMINATOR = "type";
const EVENT_TYPE_PATCH_POSTFIX = "_patch";

const SCHEMA_DATA_USAGE_ANONYMOUS = Object.freeze({
    readonly: false,
    visibility: "public",
    classification: "anonymous",
    purposes: {}
});
/**
 * The most restrictive setting for all the attributes.
 */ const SCHEMA_DATA_USAGE_MAX = Object.freeze({
    readonly: true,
    visibility: "trusted-only",
    classification: "sensitive",
    purposes: DATA_PURPOSES_ALL
});
const parseSchemaDataUsageKeywords = (keywords, forVariable = false)=>{
    if (!util.isArray(keywords)) {
        keywords = [
            keywords
        ];
    }
    let matched;
    let purposeNames = [];
    const usage = {};
    for (const keywordGroup of keywords){
        if (!keywordGroup) continue;
        for (const keyword of util.isArray(keywordGroup) ? keywordGroup : keywordGroup.split(/[:,\s]+/)){
            if (matched = DataClassification.parse(keyword, false)) {
                usage.classification = usage.classification ? util.throwError(`Data classification can only be specified once. It is already '${usage.classification}'`) : matched;
            } else if (matched = DataVisibility.parse(keyword, false)) {
                usage.visibility = usage.visibility ? util.throwError(`Data visibility can only be specified once. It is already '${usage.visibility}'`) : matched;
            } else if (keyword === "readonly") {
                usage.readonly = keyword === "readonly";
            } else if (keyword === "dynamic") {
                if (forVariable) {
                    usage.dynamic = true;
                } else {
                    util.throwError("Dynamic access is only valid for variables.");
                }
            } else if (keyword !== "necessary") {
                // Don't include the default, that just gives an empty purposes object.
                purposeNames.push(keyword);
            }
        }
    }
    purposeNames.length && (usage.purposes = DataPurposes.parse(purposeNames));
    return usage;
};

const SCHEMA_TYPE_PROPERTY = "@schema";
const SCHEMA_PRIVACY_PROPERTY = "@privacy";
const clearSchemaMetadata = (value, clone = true)=>{
    if (value != null && typeof value === "object") {
        if (value[SCHEMA_TYPE_PROPERTY] || value[SCHEMA_PRIVACY_PROPERTY]) {
            if (clone) {
                value = {
                    ...value
                };
            }
            value[SCHEMA_TYPE_PROPERTY] && delete value[SCHEMA_TYPE_PROPERTY];
            value[SCHEMA_PRIVACY_PROPERTY] && delete value[SCHEMA_PRIVACY_PROPERTY];
        }
    }
    return value;
};

const parseQualifiedTypeName = (qualifiedName)=>{
    var _qualifiedName_match;
    const [, namespace, name, version] = (_qualifiedName_match = qualifiedName.match(/^(?:([^#]*)#)?([^#@]+)(?:@(.*))?$/)) !== null && _qualifiedName_match !== void 0 ? _qualifiedName_match : util.throwError(`${qualifiedName} is not a valid qualified type name.`);
    return {
        namespace: namespace || undefined,
        name,
        version: version === "*" || !version ? undefined : version
    };
};
const formatQualifiedTypeName = ({ namespace, name, version })=>util.join([
        namespace && namespace + "#",
        name,
        version && "@" + version
    ]);

const sourceJsonSchemaSymbol = Symbol();
const createRootContext = (root)=>{
    const typeRefs = new Map();
    const refCallbacks = new Map();
    return {
        node: root,
        refPaths: [],
        schemas: [],
        types: new Map(),
        refs: {
            add: (ref, id, type)=>{
                var _refCallbacks_get;
                util.update(typeRefs, ref, (current)=>current ? util.throwError(`A type with the id '${id}' is already registered `) : [
                        id,
                        type
                    ]);
                util.forEach((_refCallbacks_get = refCallbacks.get(ref)) === null || _refCallbacks_get === void 0 ? void 0 : _refCallbacks_get.splice(0), (callback)=>callback(id, type));
                refCallbacks.delete(ref);
            },
            resolve: (ref, callback)=>{
                const current = typeRefs.get(ref);
                if (current) {
                    callback(current[0], current[1]);
                    return;
                }
                util.get(refCallbacks, ref, ()=>[]).push(callback);
            },
            pending: ()=>util.map(refCallbacks, ([ref])=>ref)
        }
    };
};
const getPath = (context)=>context.key ? `${getPath(context.parent)}/${context.key}` : "";
const contextError = (context, message)=>util.throwError(`${getPath(context)}: ${message}`);
const navigateContext = (parent, key, proxy)=>{
    const node = proxy !== null && proxy !== void 0 ? proxy : parent.node[key];
    if (!node || typeof node !== "object") {
        return contextError(parent, `Property '${key}' is not an object or array.`);
    }
    const ownRefPaths = parent ? [
        key
    ] : [];
    if (node["$id"]) {
        ownRefPaths.push(node["$id"]);
    }
    const childContext = {
        ...parent,
        parent: parent,
        key,
        refPaths: ownRefPaths.flatMap((fragment)=>{
            var _parent_refPaths_map;
            return (_parent_refPaths_map = parent === null || parent === void 0 ? void 0 : parent.refPaths.map((path)=>path + "/" + fragment)) !== null && _parent_refPaths_map !== void 0 ? _parent_refPaths_map : [];
        }),
        node
    };
    return childContext;
};

const PATCH_EVENT_POSTFIX = "_patch";

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

const isJsonSchema = (node)=>node["$schema"];
const parseJsonSchema = (context)=>{
    const { node } = context;
    if (!isJsonSchema(node)) {
        return contextError(context, "$schema property expected.");
    }
    var _node_$id;
    const schema = parseAnnotations(context, {
        namespace: (_node_$id = node["$id"]) !== null && _node_$id !== void 0 ? _node_$id : contextError(context, "$id property expected."),
        name: node["name"],
        description: node["description"],
        types: {},
        variables: {}
    });
    context.refPaths.push(schema.namespace + "#");
    context.schema = schema;
    parseDefinitions(context);
    context.schemas.push(schema);
};
const isScopeVariableDefinitionRoot = (key, node)=>{
    var _node_description_match, _node_description;
    return util.isObject(node) && (key === "ScopeVariables" || key === "scope_variables" || ((_node_description = node["description"]) === null || _node_description === void 0 ? void 0 : (_node_description_match = _node_description.match) === null || _node_description_match === void 0 ? void 0 : _node_description_match.call(_node_description, new RegExp(`@${TypeScriptAnnotations.variables}\\b`, "g"))));
};
const parseDefinitions = (context)=>{
    const { node } = context;
    for (const definitionsKey of [
        "definitions",
        "$defs"
    ]){
        const defs = node[definitionsKey];
        if (util.isObject(defs)) {
            const defsContext = navigateContext(context, definitionsKey);
            for(const definitionKey in defs){
                const def = defs[definitionKey];
                if (isJsonSchema(def)) {
                    parseJsonSchema(navigateContext(defsContext, definitionKey));
                    continue;
                }
                if (isScopeVariableDefinitionRoot(definitionKey, def)) {
                    const propertiesContext = navigateContext(navigateContext(defsContext, definitionKey), "properties");
                    util.forEach(def["properties"], ([name, scopeProperties])=>{
                        const scope = VariableServerScope.parse(name.toLowerCase());
                        const scopeContext = navigateContext(navigateContext(propertiesContext, name), "properties");
                        util.forEach(scopeProperties["properties"], ([name])=>{
                            var _context_schema, _ref, _scope;
                            parseJsonProperty(navigateContext(scopeContext, name), (property)=>{
                                var _variables, _;
                                return ((_ = (_ref = (_variables = (_context_schema = context.schema).variables) !== null && _variables !== void 0 ? _variables : _context_schema.variables = {})[_scope = scope]) !== null && _ !== void 0 ? _ : _ref[_scope] = {})[name] = property;
                            }, true);
                        });
                    });
                    continue;
                }
                if (isJsonObjectType(def)) {
                    parseJsonType(navigateContext(defsContext, definitionKey), true);
                } else if (!isIgnoredObject(def)) {
                    const referencedProp = navigateContext(defsContext, definitionKey);
                    parseJsonProperty(referencedProp, (property)=>{
                        let id = context.schema.namespace + "#" + definitionKey;
                        util.forEach(referencedProp.refPaths, (ref)=>context.refs.add(ref, id, property));
                    });
                }
            }
        }
    }
};

const PRIVACY_ANNOTATIONS = [
    JsonSchemaAnnotations.Classification,
    JsonSchemaAnnotations.Purposes,
    JsonSchemaAnnotations.Access
];
const parseAnnotations = (context, target, forVariable = false)=>{
    const { node } = context;
    let version;
    const keywords = [];
    const nodes = [
        context.node
    ];
    if (context.refPaths.some((refPath)=>refPath.match(/\/allOf\/\d+$/g))) {
        nodes.push(context.parent.parent.node);
    }
    for (const node of nodes){
        if (!version && (version = node[JsonSchemaAnnotations.Version])) {
            version && (target.version = version);
        }
        util.map(PRIVACY_ANNOTATIONS, (key)=>node[key] || util.skip, keywords);
        let description = node["description"];
        if (description) {
            var _description_replace;
            description = (_description_replace = description.replace) === null || _description_replace === void 0 ? void 0 : _description_replace.call(description, new RegExp(`@(?:${TypeScriptAnnotations.privacy}|${TypeScriptAnnotations.access}) ([^@]+)`, "g"), (_, body)=>{
                keywords.push(body);
                return "";
            }).trim();
            if (!target.description && description) {
                target.description = description;
            }
        }
    }
    try {
        const usage = parseSchemaDataUsageKeywords(keywords, forVariable);
        Object.assign(target, usage, target);
    } catch (e) {
        var _e_message;
        contextError(context, (_e_message = e.message) !== null && _e_message !== void 0 ? _e_message : "" + e);
    }
    if (node.$anchor) {
        var _context_schema;
        var _context_schema_namespace;
        context.refPaths.push(`${(_context_schema_namespace = (_context_schema = context.schema) === null || _context_schema === void 0 ? void 0 : _context_schema.namespace) !== null && _context_schema_namespace !== void 0 ? _context_schema_namespace : contextError(context, "$anchor property are not allowed outside schema definitions.")}#${node.$anchor}`);
    }
    return target;
};
const serializeAnnotations = (entity)=>{
    var _entity_usageOverrides;
    const usage = (_entity_usageOverrides = entity.usageOverrides) !== null && _entity_usageOverrides !== void 0 ? _entity_usageOverrides : {};
    let annotations;
    if (entity.abstract) {
        annotations !== null && annotations !== void 0 ? annotations : annotations = {
            not: {}
        };
        annotations[JsonSchemaAnnotations.Abstract] = true;
    }
    if (usage.classification) {
        (annotations !== null && annotations !== void 0 ? annotations : annotations = {})[JsonSchemaAnnotations.Classification] = usage.classification;
    }
    if (usage.purposes) {
        (annotations !== null && annotations !== void 0 ? annotations : annotations = {})[JsonSchemaAnnotations.Purposes] = DataPurposes.parse(usage.purposes, {
            names: true
        });
    }
    if (usage.readonly || usage.visibility || entity.dynamic) {
        (annotations !== null && annotations !== void 0 ? annotations : annotations = {})[JsonSchemaAnnotations.Access] = util.filter([
            usage.readonly && "readonly",
            usage.visibility,
            entity.dynamic && "dynamic"
        ], false);
    }
    return annotations;
};

const parseJsonProperty = (context, assign, forVariable = false)=>{
    var _context_parent_parent_node_required;
    let property;
    const { node } = context;
    for (const prop of [
        "anyOf",
        "type"
    ]){
        if (util.isArray(node[prop])) {
            property = {
                union: []
            };
            const unionContext = navigateContext(context, prop);
            unionContext.node.forEach((value, i)=>{
                parseJsonProperty(navigateContext(unionContext, i, typeof value === "string" ? {
                    type: value
                } : undefined), (unionType)=>property.union.push(unionType));
            });
            break;
        }
    }
    if (!property) {
        if (isJsonObjectType(node)) {
            property = parseJsonType(context, false, forVariable);
        } else {
            var _split_slice_, _this;
            var _node_type;
            const propertyTypeName = (_this = (_node_type = node.type) !== null && _node_type !== void 0 ? _node_type : node["$ref"]) === null || _this === void 0 ? void 0 : (_split_slice_ = _this.split("/").slice(-1)[0]) === null || _split_slice_ === void 0 ? void 0 : _split_slice_.toLowerCase();
            switch(propertyTypeName){
                case "string":
                    const format = node["format"];
                    switch(format){
                        case "date-time":
                            property = {
                                primitive: "datetime"
                            };
                            break;
                        case "date":
                            property = {
                                primitive: "date"
                            };
                            break;
                        case "email":
                        case "urn":
                        case "uri":
                        case "url":
                            property = {
                                primitive: "string",
                                format
                            };
                            break;
                        case "uuid":
                            property = {
                                primitive: "uuid"
                            };
                            break;
                        default:
                            property = {
                                primitive: "string"
                            };
                            break;
                    }
                    break;
                case "float":
                case "number":
                    property = {
                        primitive: "number"
                    };
                    break;
                case "percentage":
                case "decimal":
                    property = {
                        primitive: "number",
                        format: propertyTypeName
                    };
                    break;
                case "boolean":
                    property = {
                        primitive: "boolean"
                    };
                    break;
                case "integer":
                    property = {
                        primitive: "integer"
                    };
                    break;
                case "timestamp":
                    property = {
                        primitive: "timestamp"
                    };
                    break;
                case "date":
                    property = {
                        primitive: "date"
                    };
                    break;
                case "datetime":
                    property = {
                        primitive: "datetime",
                        format: "iso"
                    };
                    break;
                case "uuid":
                    property = {
                        primitive: "string"
                    };
                    break;
                case "duration":
                    property = {
                        primitive: "duration"
                    };
                    break;
                case "array":
                    property = {};
                    parseJsonProperty(navigateContext(context, "items"), (items)=>{
                        return property.item = items;
                    });
                    break;
                case "object":
                    if (util.isObject(node.additionalProperties)) {
                        property = {
                            key: {
                                primitive: "string"
                            }
                        };
                        parseJsonProperty(navigateContext(context, "additionalProperties"), (items)=>property.value = items);
                        break;
                    }
                default:
                    if (node.$ref) {
                        var _context_parent_parent_node_required1;
                        property = {};
                        if ((_context_parent_parent_node_required1 = context.parent.parent.node.required) === null || _context_parent_parent_node_required1 === void 0 ? void 0 : _context_parent_parent_node_required1.includes(context.key)) {
                            property.required = true;
                        }
                        context.refs.resolve(node.$ref, (typeId, type)=>{
                            if ("properties" in type) {
                                property.reference = typeId;
                                assign(parseAnnotations(context, property, forVariable));
                            } else {
                                assign(parseAnnotations(context, {
                                    ...type
                                }, forVariable));
                            }
                        });
                        return;
                    }
                    return contextError(context, `Unknown property type.`);
            }
            if (node.const) {
                property.enum = [
                    node.const
                ];
            } else if (node.enum) {
                property.enum = node.enum;
            }
        }
    }
    if ((_context_parent_parent_node_required = context.parent.parent.node.required) === null || _context_parent_parent_node_required === void 0 ? void 0 : _context_parent_parent_node_required.includes(context.key)) {
        property.required = true;
    }
    assign(parseAnnotations(context, property, forVariable));
};

const isIgnoredObject = (node)=>util.some(node["properties"], ([key])=>// This is a TypeScript function that has sneaked into the schema. Remove.
        key.startsWith("NamedParameters") || key.startsWith("namedArgs"));
const isJsonObjectType = (node)=>{
    let allOf;
    return node["type"] === "object" && !util.isObject(node.additionalProperties) && !isIgnoredObject(node) || (allOf = node["allOf"]) && isJsonObjectType(allOf[allOf.length - 1]);
};
const parseJsonType = (context, root, forVariable = false)=>{
    let { schema, node, key } = context;
    if (!schema) {
        contextError(context, "No schema for type definition.");
    }
    if (!isJsonObjectType(node)) {
        return contextError(context, "Object type definition expected");
    }
    const sourceNode = node;
    const allOf = node.allOf;
    if (node.type !== "object") {
        node = (context = navigateContext(navigateContext(context, "allOf"), allOf.length - 1)).node;
    }
    const description = sourceNode.description || node.description;
    let type = parseAnnotations(context, {
        abstract: sourceNode["not"] && typeof sourceNode["not"] === "object" && !Object.keys(sourceNode["not"]).length || sourceNode[JsonSchemaAnnotations.Abstract] || (description === null || description === void 0 ? void 0 : description.match(new RegExp(`${TypeScriptAnnotations.abstract}\\b`, "g"))) ? true : undefined,
        extends: undefined,
        properties: {},
        [sourceJsonSchemaSymbol]: {
            schema: schema,
            remove: ()=>{
                delete schema.types[key];
            }
        }
    }, forVariable);
    if (node.$ref) {
        context.refs.resolve(node.$ref, (id)=>{
            var _type;
            var _extends;
            ((_extends = (_type = type).extends) !== null && _extends !== void 0 ? _extends : _type.extends = []).push(id);
        });
    }
    if (node.properties) {
        const propertiesContext = navigateContext(context, "properties");
        for(const propertyName in propertiesContext.node){
            parseJsonProperty(navigateContext(propertiesContext, propertyName), (property)=>{
                type.properties[propertyName] = property;
            });
        }
    }
    if (root) {
        let id = schema.namespace + "#" + key;
        schema.types[key] = type;
        util.forEach(context.refPaths, (refPath)=>context.refs.add(refPath.replace(/\/allOf\/\d+$/g, ""), id, type));
        context.types.set(id, type);
    }
    for (const typeDef of [
        sourceNode,
        node
    ]){
        var _typeDef_description_match, _typeDef_description;
        if (typeDef[JsonSchemaAnnotations.Event] || ((_typeDef_description = typeDef.description) === null || _typeDef_description === void 0 ? void 0 : (_typeDef_description_match = _typeDef_description.match) === null || _typeDef_description_match === void 0 ? void 0 : _typeDef_description_match.call(_typeDef_description, new RegExp(`@${TypeScriptAnnotations.event}\\b`, "g")))) {
            if (!root) {
                contextError(context, "Inline object types cannot be used as events.");
            }
            type.event = true;
        }
        if (typeDef[JsonSchemaAnnotations.SystemType]) {
            type.system = typeDef[JsonSchemaAnnotations.SystemType];
        }
    }
    util.forEach(allOf, (ref)=>{
        if (ref.$ref) {
            var _type;
            context.refs.resolve(ref.$ref, (id)=>{
                var _extends;
                return ((_extends = (_type = type).extends) !== null && _extends !== void 0 ? _extends : _type.extends = []).push(id);
            });
        }
    });
    parseDefinitions(context);
    return type;
};

const getJsonRef = (entity)=>`${entity.schema.namespace}#${entity.name}`;
const serializeProperty = (type)=>{
    let jsonProperty;
    if ("primitive" in type) {
        const source = type.source;
        switch(source.primitive){
            case "datetime":
                jsonProperty = source.format === "unix" ? {
                    type: "integer"
                } : {
                    type: "string",
                    format: "date-time"
                };
                break;
            case "date":
            case "uuid":
                jsonProperty = {
                    type: "string",
                    format: source.primitive
                };
                break;
            case "string":
                jsonProperty = {
                    type: "string",
                    format: source.format
                };
                break;
            case "boolean":
            case "integer":
            case "timestamp":
            case "duration":
            case "number":
                jsonProperty = {
                    type: source.primitive
                };
                break;
            default:
                return util.throwTypeError(`Unsupported primitive type '${type.primitive}'.`);
        }
        if ("enumValues" in type && type["enumValues"]) {
            const enumValues = [
                ...type.enumValues
            ];
            if (enumValues.length === 1) {
                jsonProperty.const = enumValues[0];
            } else {
                jsonProperty.enum = enumValues;
            }
        }
    } else if ("properties" in type) {
        if (type.embedded) {
            jsonProperty = serializeType(type);
        } else {
            jsonProperty = {
                $ref: getJsonRef(type)
            };
        }
    } else if ("key" in type) {
        jsonProperty = {
            type: "object",
            additionalProperties: serializeProperty(type.value)
        };
    } else if ("item" in type) {
        jsonProperty = {
            type: "array",
            items: serializeProperty(type.item)
        };
    }
    if ("usageOverrides" in type) {
        var _serializeAnnotations;
        Object.assign(jsonProperty, (_serializeAnnotations = serializeAnnotations(type)) !== null && _serializeAnnotations !== void 0 ? _serializeAnnotations : {});
    }
    return jsonProperty;
};
const serializeType = (type)=>{
    let jsonType = {
        type: "object",
        description: type.description,
        ...serializeAnnotations(type),
        properties: {}
    };
    if (type.system) {
        jsonType["x-system-type"] = type.system;
    }
    util.forEach(type.ownProperties, ([name, property])=>{
        jsonType.properties[name] = serializeProperty(property.type);
        if (property.required) {
            var _jsonType;
            var _required;
            ((_required = (_jsonType = jsonType).required) !== null && _required !== void 0 ? _required : _jsonType.required = []).push(name);
        }
    });
    if (type.extends.length) {
        jsonType = {
            allOf: [
                ...type.extends.map((type)=>({
                        $ref: getJsonRef(type)
                    })),
                jsonType
            ]
        };
    }
    return type.embedded ? jsonType : {
        $anchor: type.name,
        ...jsonType
    };
};
const serializeSchema = (schema, subSchemas, restrictProperties)=>{
    {
        const jsonSchema = {
            $schema: "https://json-schema.org/draft/2020-12/schema",
            $id: schema.namespace,
            description: schema.description,
            $defs: {}
        };
        const defs = jsonSchema.$defs = {};
        for (const [name, type] of schema.types){
            if (type.embedded) {
                continue;
            }
            defs[name] = {
                $anchor: getJsonRef(type),
                ...serializeType(type)
            };
        }
        for (const subSchema of subSchemas){
            defs[subSchema.namespace] = serializeSchema(subSchema, []);
        }
        return jsonSchema;
    }
};

function _define_property$2(obj, key, value) {
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
class JsonSchemaAdapter {
    static parse(source) {
        return new JsonSchemaAdapter().parse(source);
    }
    parse(source) {
        const schemaRoot = typeof source === "string" ? JSON.parse(source) : source;
        const rootContext = createRootContext(schemaRoot);
        parseJsonSchema(rootContext);
        const pending = rootContext.refs.pending();
        if (pending.length) {
            util.throwError(util.itemize(pending, null, (refs, n)=>`The following $ref${n !== 1 ? "s" : ""} was not resolved: ${refs}.`));
        }
        return rootContext.schemas;
    }
    serialize(schemas) {
        if (!schemas.length) {
            return util.throwTypeError("At least one schema expected.");
        }
        if (schemas.length > 1 && !this.rootNamespace) {
            return util.throwTypeError("If more than one schema is specified, a root namespace must be specified.");
        }
        return this.rootNamespace ? serializeSchema({
            namespace: this.rootNamespace,
            types: new Map()
        }, schemas, this.restrictProperties) : serializeSchema(schemas[0], [], this.restrictProperties);
    }
    constructor(rootNamespace, restrictProperties = false){
        _define_property$2(this, "rootNamespace", void 0);
        _define_property$2(this, "restrictProperties", void 0);
        this.rootNamespace = rootNamespace;
        this.restrictProperties = restrictProperties;
    }
}

const formatTypeName = (type)=>{
    if ("primitive" in type) {
        if ("format" in type.source) {
            return type.source.format;
        }
        return type.primitive;
    }
    if ("item" in type) {
        return `Array\\<${formatTypeName(type.item)}\\>`;
    }
    if ("key" in type) {
        return `Map\\<${formatTypeName(type.key)}, ${formatTypeName(type.value)}\\>`;
    }
    if ("union" in type) {
        return type.union.map((type)=>formatTypeName(type)).join(" or ");
    }
    return typeRef(type, "link");
};
const typeRef = (type, format)=>format === "anchor" ? `{#${typeRef(type)}}` : format === "link" ? `[${type.name}](#${typeRef(type)})` : `type--${type.id.replace(/[^a-zA-Z0-9_]/g, "-")}`;
const md = (md)=>md ? md.replace(/\s*\{@link([^}]*)\}/g, "`$1`").replace(/[<>]/g, "\\$1")//.replace(/([\\`*_{}[\]#\|])/g, "\\$1")
    .trim().replace(/ +/g, " ") : "";
class MarkdownSchemaAdapter {
    parse(source) {
        throw new Error("Not supported");
    }
    serialize(schemas) {
        const lines = [];
        for (const schema of schemas){
            const types = util.topoSort(util.sort(schema.types.values(), (type)=>type.name), (type)=>type.extends);
            const eventType = types.find((type)=>type.system === "event");
            const eventTypes = [];
            const otherTypes = [];
            for (const type of types){
                (type === eventType || eventType && type.extendsAll.has(eventType) ? eventTypes : otherTypes).push(type);
            }
            const typeGroups = [
                {
                    name: "Events",
                    types: eventTypes
                },
                {
                    name: "Other types",
                    types: otherTypes
                }
            ];
            for (const { name, types } of typeGroups){
                if (!types.length) continue;
                lines.push("", `# ${name}`);
                for (const type of types){
                    if (type.system === "patch") {
                        continue;
                    }
                    lines.push("", `## ${md(type.name)} ${typeRef(type, "anchor")}`);
                    const topTable = [];
                    if (type.extends.length) {
                        topTable.push([
                            "Extends",
                            type.extends.map((type)=>typeRef(type, "link")).join(", ")
                        ]);
                    }
                    if (type.usage.classification !== "anonymous") {
                        topTable.push([
                            "privacy",
                            type.usage.classification
                        ]);
                    }
                    topTable.push([
                        "purposes",
                        DataPurposes.parse(type.usage.purposes, {
                            names: true
                        }).join(", ")
                    ]);
                    if (topTable.length) {
                        //lines.push("<table>");
                        for (const [label, value] of topTable){
                            //lines.push(`<tr><td>*${label}*</td><td>${value}</td></tr>`);
                            lines.push(`*${label}*: ${value}`);
                        }
                    //lines.push("</table>");
                    }
                    if (type.description) {
                        lines.push("", md(type.description));
                    }
                    const properties = Object.values(type.ownProperties);
                    if (properties.length) {
                        lines.push("", "|Name|Type|Privacy|Purposes|Description|", "|-|-|-|-|-|");
                        for(const property in type.ownProperties){
                            var _prop_usage, _prop_usage1, _DataPurposes_parse, _prop_usage2;
                            const prop = type.ownProperties[property];
                            var _prop_usage_classification, _DataPurposes_parse_join;
                            lines.push([
                                "",
                                md(prop.name),
                                formatTypeName(prop.type),
                                ((_prop_usage = prop.usage) === null || _prop_usage === void 0 ? void 0 : _prop_usage.classification) !== "anonymous" ? (_prop_usage_classification = (_prop_usage1 = prop.usage) === null || _prop_usage1 === void 0 ? void 0 : _prop_usage1.classification) !== null && _prop_usage_classification !== void 0 ? _prop_usage_classification : "" : "",
                                (_DataPurposes_parse_join = (_DataPurposes_parse = DataPurposes.parse((_prop_usage2 = prop.usage) === null || _prop_usage2 === void 0 ? void 0 : _prop_usage2.purposes, {
                                    names: true,
                                    includeDefault: false
                                })) === null || _DataPurposes_parse === void 0 ? void 0 : _DataPurposes_parse.join(", ")) !== null && _DataPurposes_parse_join !== void 0 ? _DataPurposes_parse_join : "",
                                md(prop.description).replace(/\r?\n/g, "<br>"),
                                ""
                            ].join("|"));
                        }
                    }
                }
            }
        }
        return lines.join("\n");
    }
}

const isSchemaArrayType = (value)=>"item" in value;

const isSchemaObjectType = (value)=>"properties" in value;

const hasEnumValues = (type)=>!!(type === null || type === void 0 ? void 0 : type.enumValues);

const isSchemaRecordType = (value)=>"key" in value && "item" in value;

const getMinimumUsage = (current, other)=>current ? other ? {
        readonly: current.readonly && other.readonly,
        visibility: DataVisibility.ranks[current.visibility] <= DataVisibility.ranks[other.visibility] ? current.visibility : other.visibility,
        classification: DataClassification.ranks[current.classification] <= DataClassification.ranks[other.classification] ? current.classification : other.classification,
        purposes: util.obj(current.purposes, ([key, value])=>value && !other.purposes[key] ? undefined : [
                key,
                value
            ])
    } : current : other;
const overrideUsage = (current, update)=>{
    var _update_readonly, _update_visibility, _update_classification, _update_purposes;
    return update ? current ? {
        readonly: (_update_readonly = update.readonly) !== null && _update_readonly !== void 0 ? _update_readonly : current.readonly,
        visibility: (_update_visibility = update.visibility) !== null && _update_visibility !== void 0 ? _update_visibility : current.visibility,
        classification: (_update_classification = update.classification) !== null && _update_classification !== void 0 ? _update_classification : current.classification,
        purposes: (_update_purposes = update.purposes) !== null && _update_purposes !== void 0 ? _update_purposes : current.purposes
    } : update : current;
};
const createCensorAction = (usage, type)=>(value, context)=>!value || !usage ? type.censor(value, context) : !context.trusted && usage.visibility === "trusted-only" ? undefined : context.consent && !validateConsent(usage, context.consent, context) ? undefined : type.censor(value, context);
const createAccessValidator = (name, type, usage, targetType = "property")=>(value, current, context, errors)=>handleValidationErrors((errors)=>{
            if (usage) {
                if (usage.readonly && current != null && value !== current) {
                    errors.push({
                        path: name,
                        type,
                        source: value,
                        message: `The ${targetType} is read-only (cannot be changed once set).`,
                        forbidden: true
                    });
                }
                if (!context.trusted && usage.visibility !== "public" && value !== current) {
                    errors.push({
                        path: name,
                        type,
                        source: value,
                        message: `The ${targetType} cannot be set from untrusted context.`,
                        forbidden: true
                    });
                }
            }
            return pushInnerErrors(name, value, current, context, errors, type);
        }, errors);

const VALIDATION_ERROR_SYMBOL = Symbol();
const joinPath = (prefix, current)=>(current === null || current === void 0 ? void 0 : current.length) ? prefix + (current[0] === "[" ? "" : ".") + current : prefix;
const pushInnerErrors = (prefix, value, current, context, errors, validatable)=>{
    const innerErrors = [];
    if ((value = validatable.validate(value, current, context, innerErrors)) === VALIDATION_ERROR_SYMBOL || innerErrors.length) {
        errors.push(...innerErrors.map((error)=>({
                ...error,
                path: joinPath(prefix, error.path)
            })));
    }
    return value;
};
class ValidationError extends Error {
    constructor(errors, message){
        super((message ? message + ":\n" : "") + formatValidationErrors(errors));
    }
}
const formatErrorSource = (value)=>value === undefined ? "undefined" : util.ellipsis(JSON.stringify(value), 40, true);
const handleValidationErrors = (action, collectedErrors, message)=>{
    const errors = collectedErrors !== null && collectedErrors !== void 0 ? collectedErrors : [];
    const result = action(errors);
    if (!collectedErrors && (result === VALIDATION_ERROR_SYMBOL || errors.length)) {
        throw new ValidationError(errors, message);
    }
    return result;
};
const formatValidationErrors = (errors, bullet = "")=>{
    if (!errors.length) return "(unspecified error)";
    const formatted = (errors.length > 10 ? errors.slice(0, 10) : errors).map(({ path, message })=>`${bullet}${path ? `${path}: ${message}` : message}`);
    if (errors.length > 10) {
        formatted.push("", `(and ${errors.length - 10} more)`);
    }
    return formatted.join("\n");
};

const REGEX_DATE = /^\d{4}-\d{2}-\d{2}(?:T00:00:00(?:\.000)?)?Z$/;
const REGEX_DATETIME = /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,7})?)?Z$/;
const REGEX_UUID = /^\{?([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})\}?$/;
const REGEX_URI = /^(?:(?:([\w+.-]+):)(\/\/)?)((?:([^:@]+)(?:\:([^@]*))?@)?(?:\[([^\]]+)\]|([0-9:]+|[^/+]+?))(?::(\d*))?)(\/[^#?]*)?(?:\?([^#]*))?(?:#(.*))?$/;
const REGEX_EMAIL = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:(\[(([0-9.]+)|([0-9a-f:]+))\])|(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9]))?$/;
const addError = (errors, value, message)=>(errors.push({
        path: "",
        type: null,
        source: value,
        message: `${formatErrorSource(value)} ${message}.`
    }), VALIDATION_ERROR_SYMBOL);
const isNumber = (value, integer, allowStrings)=>typeof value === "number" && // Only actual numbers. IEEE 754 stuff like NaN is not supported in JSON so also not here.
    (!integer && Number.isFinite(value) && !Number.isNaN(value) || Number.isInteger(value)) || allowStrings && typeof value === "string" && isNumber(integer ? parseInt(value) : parseFloat(value), integer, false);
const primitiveValidators = {};
const getPrimitiveTypeValidator = (type, allowNumericStrings = false)=>{
    var _type_enum;
    var _primitiveValidators, _ref;
    var _type_enum_, _type_primitive;
    let primitive = (_type_primitive = type.primitive) !== null && _type_primitive !== void 0 ? _type_primitive : type.primitive = typeof ((_type_enum_ = (_type_enum = type.enum) === null || _type_enum === void 0 ? void 0 : _type_enum[0]) !== null && _type_enum_ !== void 0 ? _type_enum_ : "");
    var _type_format, _;
    let validator = (_ = (_primitiveValidators = primitiveValidators)[_ref = type.primitive + "-" + ((_type_format = type["format"]) !== null && _type_format !== void 0 ? _type_format : "") + "-" + allowNumericStrings]) !== null && _ !== void 0 ? _ : _primitiveValidators[_ref] = create(type, allowNumericStrings);
    const maxLength = type["maxLength"];
    if (maxLength != null) {
        const inner = validator;
        validator = (value, errors)=>(value = inner(value, errors)) === VALIDATION_ERROR_SYMBOL ? value : value.length > maxLength ? addError(errors, value, `exceeds the maximum allowed ${maxLength} number of characters`) : value;
    }
    const min = type["min"], max = type["max"];
    if (min != null || max != null) {
        const errorMessage = min != null ? max != null ? `between ${min} and ${max}` : `at least ${min}` : `at most ${max}`;
        const inner = validator;
        validator = (value, errors)=>(value = inner(value, errors)) === VALIDATION_ERROR_SYMBOL ? value : (min == null || value >= min) && (max == null || value <= max) ? value : addError(errors, value, errorMessage);
    }
    let enumValues;
    if ("enum" in type) {
        const inner = validator;
        enumValues = new Set((Array.isArray(type.enum) ? type.enum : [
            type.enum
        ]).map((value)=>{
            const errors = [];
            if ((value = inner(value, errors)) === VALIDATION_ERROR_SYMBOL) {
                throw new TypeError(errors[0]);
            }
            return value;
        }));
        if (!enumValues.size) {
            throw new TypeError("At least one enum value to test against is required.");
        }
        const errorMessage = "is not the constant value " + util.itemize(type.enum.map((value)=>JSON.stringify(value)), "or");
        validator = (value, errors)=>(value = inner(value, errors)) === VALIDATION_ERROR_SYMBOL ? value : enumValues.has(value) ? value : addError(errors, value, errorMessage);
    }
    return {
        validator,
        primitive,
        enumValues: util.distinct(enumValues)
    };
};
function create(type, allowNumericStrings) {
    switch(type.primitive){
        case "boolean":
            return (value, errors)=>typeof value === "boolean" ? value : addError(errors, value, "is not a Boolean");
        case "date":
            return (value, errors)=>value && REGEX_DATE.test(value) && !isNaN(+new Date(value)) ? value : addError(errors, value, "is not a valid ISO 8601 UTC date (time is not allowed, and the 'Z' postfix must be added to indicate Coordinated Universal Time)");
        case "timestamp":
        case "datetime":
            const iso = "format" in type ? type.format !== "unix" : type.primitive === "datetime";
            return (value, errors)=>{
                if (!value || isNumber(value, false, allowNumericStrings)) {
                    if (!isNumber(value, true, allowNumericStrings)) {
                        return addError(errors, value, "is not a valid UNIX timestamp");
                    }
                    value = +value;
                } else if (!REGEX_DATETIME.test(value) || isNaN(+new Date(value))) {
                    return addError(errors, value, "is not a valid ISO 8601 UTC date/time (the 'Z' postfix must be added to indicate Coordinated Universal Time)");
                }
                value = new Date(value);
                return iso ? new Date(value).toISOString() : +value;
            };
        case "duration":
            return (value, errors)=>isNumber(value, true, allowNumericStrings) ? +value : addError(errors, value, "is not a valid duration (must be provided as milliseconds)");
        case "integer":
            return (value, errors)=>isNumber(value, true, allowNumericStrings) ? +value : addError(errors, value, "is not a valid integer");
        case "number":
            return (value, errors)=>isNumber(value, false, allowNumericStrings) ? value : addError(errors, value, "is not a number");
        case "string":
            switch(type.format){
                case "uri":
                    return (value, errors)=>typeof value === "string" && REGEX_URI.test(value) ? value : addError(errors, value, "is not a valid URI");
                case "url":
                    return (value, errors)=>{
                        const match = typeof value === "string" && REGEX_URI.exec(value);
                        if (!match) return addError(errors, value, "is not a valid URL");
                        return match[2] ? value : addError(errors, value, "is not a valid URL (it is a URI, but a URL is required)");
                    };
                case "urn":
                    return (value, errors)=>{
                        const match = typeof value === "string" && REGEX_URI.exec(value);
                        if (!match) return addError(errors, value, "is not a valid URN");
                        return match[1] === "urn" && !match[2] ? value : addError(errors, value, "is not a valid URN (it is a URI, but a URN is required)");
                    };
                case "email":
                    return (value, errors)=>typeof value === "string" && REGEX_EMAIL.test(value) ? value.toLowerCase() : addError(errors, value, "is not a valid email address");
            }
            return (value, errors)=>typeof value === "string" ? value : addError(errors, value, "is not a string");
        case "uuid":
            return (value, errors)=>{
                var _REGEX_UUID_exec;
                var _ref;
                return (_ref = typeof value === "string" ? (_REGEX_UUID_exec = REGEX_UUID.exec(value)) === null || _REGEX_UUID_exec === void 0 ? void 0 : _REGEX_UUID_exec[1].toLowerCase() : null) !== null && _ref !== void 0 ? _ref : addError(errors, value, "is not a valid UUID");
            };
        default:
            throw new TypeError(`'${formatErrorSource(type)}' is not a supported primitive type.`);
    }
}

const addTypeValidators = (type)=>{
    const props = type.properties;
    const requiredProperties = [];
    for(const key in props){
        const prop = props[key];
        type.usage = getMinimumUsage(type.usage, prop.usage);
        prop.required && requiredProperties.push(prop);
    }
    const censor = (target, context)=>{
        if (target == null || target === VALIDATION_ERROR_SYMBOL) {
            return target;
        }
        let censored = target;
        let privacy;
        for(const key in target){
            if (key === SCHEMA_TYPE_PROPERTY || key === SCHEMA_PRIVACY_PROPERTY) {
                continue;
            }
            const prop = props[key];
            const targetValue = target[key];
            const censoredValue = !prop ? undefined : prop.censor(targetValue, context);
            if (censoredValue != targetValue) {
                var _ref;
                var _censored;
                ((_censored = (_ref = privacy !== null && privacy !== void 0 ? privacy : privacy = {}).censored) !== null && _censored !== void 0 ? _censored : _ref.censored = []).push(prop.name);
                if (censoredValue === undefined && !context.patch && (prop === null || prop === void 0 ? void 0 : prop.required)) {
                    if (!context.forResponse) {
                        // When a required property gets completely censored away during write,
                        // the entire object becomes censored (since it would be invalid if missing a required property).
                        return undefined;
                    }
                }
                if (target === censored) {
                    // Make a shallow clone if we are changing values.
                    censored = {
                        ...target
                    };
                }
                if (censoredValue === undefined) {
                    delete censored[key];
                } else {
                    censored[key] = censoredValue;
                }
            }
        }
        if (privacy) {
            censored[SCHEMA_PRIVACY_PROPERTY] = privacy;
        }
        return censored;
    };
    const validate = (target, current, context, errors)=>handleValidationErrors((errors)=>{
            if (typeof target !== "object" || util.isArray(target) || target == null) {
                errors.push({
                    path: "",
                    type,
                    source: target,
                    message: `${formatErrorSource(target)} is not an object.`
                });
                return VALIDATION_ERROR_SYMBOL;
            }
            if (type.system === "patch") {
                context = {
                    ...context,
                    patch: true
                };
            }
            // Here we could leverage the type's `usage` that is the minimum usage defined
            // by any property. Let's do that when we have tested the rest of this code...
            const currentErrors = errors.length;
            let validated = target;
            const validateProperty = (prop)=>{
                const targetValue = target[prop.name];
                var _current_prop_name;
                const validatedValue = prop.validate(targetValue, current === undefined ? undefined : (_current_prop_name = current === null || current === void 0 ? void 0 : current[prop.name]) !== null && _current_prop_name !== void 0 ? _current_prop_name : null, context, errors);
                if (validatedValue !== targetValue) {
                    if (target === validated) {
                        // Make a shallow clone if we are changing values.
                        validated = {
                            ...target
                        };
                    }
                    validated[prop.name] = validatedValue === VALIDATION_ERROR_SYMBOL ? undefined : validatedValue;
                }
            };
            for (const required of requiredProperties){
                validateProperty(required);
            }
            for(const key in target){
                if (key === SCHEMA_TYPE_PROPERTY || key === SCHEMA_PRIVACY_PROPERTY) continue;
                const prop = props[key];
                if (!prop) {
                    errors.push({
                        path: key,
                        type,
                        source: target,
                        message: `The property is not defined for the type '${type.id}'.`
                    });
                    continue;
                } else if (!prop.required) {
                    // Required properties have already been validated.
                    validateProperty(prop);
                }
            }
            if (currentErrors < errors.length) {
                return VALIDATION_ERROR_SYMBOL;
            }
            validated[SCHEMA_TYPE_PROPERTY] = type.qualifiedName;
            return validated;
        }, errors);
    if (type.abstract) {
        if (type.referencedBy.size) {
            // Polymorphic validation only applies to abstract types that are referenced by properties.
            const { censor: polymorphicCensor, validate: polymorphicValidate } = createSchemaTypeMapper([
                type
            ]);
            type.censor = (target, context, polymorphic = true)=>(polymorphic ? polymorphicCensor : censor)(target, context);
            type.validate = (target, current, context, errors, polymorphic = true)=>(polymorphic ? polymorphicValidate : validate)(target, current, context, errors);
        } else {
            ({ censor: type.censor, validate: type.validate } = createAbstractTypeValidator(type));
        }
    } else {
        type.censor = censor;
        type.validate = validate;
    }
};

const subtypesOf = (types, orSelf = false)=>util.collect(types, (type)=>type.extendedBy, orSelf);
const anyValue = Symbol();
const createAbstractTypeValidator = (type)=>({
        censor: ()=>undefined,
        validate: (value, _current, _context, errors)=>handleValidationErrors((errors)=>{
                errors.push({
                    path: "",
                    type: null,
                    source: value,
                    message: `The abstract type ${type.id} cannot be instantiated.`
                });
                return VALIDATION_ERROR_SYMBOL;
            }, errors)
    });
const createSchemaTypeMapper = (rootTypes)=>{
    const discriminators = new Map();
    const types = util.topoSort(util.filter(subtypesOf(rootTypes, true), (type)=>!type.abstract), (type)=>type.extends);
    if (!types.length) {
        return {
            match: ()=>undefined,
            mapped: new Set(),
            unmapped: [],
            // Remember only the first abstract root type is mentioned in the error, even if there are more.
            ...createAbstractTypeValidator(rootTypes[0])
        };
    }
    let selector;
    const mapped = new Set();
    if (types.length === 1) {
        mapped.add(types[0]);
        selector = ()=>types[0];
    } else {
        util.forEach(types, (type)=>util.forEach(type.properties, ([name, prop])=>{
                var _prop_type;
                var _prop_type_enumValues;
                return util.forEach(prop.required && ((_prop_type_enumValues = (_prop_type = prop.type) === null || _prop_type === void 0 ? void 0 : _prop_type.enumValues) !== null && _prop_type_enumValues !== void 0 ? _prop_type_enumValues : [
                    anyValue
                ]), (value)=>util.get(util.get(discriminators, name, ()=>new Map()), value, ()=>[]).push(type));
            }));
        util.forEach(discriminators, ([, value])=>{
            // If there are more than 1 one value, it means there is at least one enum value.
            value.size > 1 && value.delete(anyValue);
            return util.forEach(value, ([, types])=>util.push(mapped, ...types));
        });
        const isOptional = (type, name)=>type.properties[name] && !type.properties[name].required;
        const maybeOptional = util.distinct(util.map(discriminators, ([name])=>util.some(mapped, (type)=>isOptional(type, name)) ? name : util.skip));
        const properties = util.sort(util.sort(discriminators, ([, value])=>value.size, true), ([name])=>maybeOptional.has(name));
        const mapSelector = (index, pending, pathValues = [])=>{
            if (!pending.length) {
                util.throwError("INV: types.length > 0");
            } else if (pending.length === 1) {
                return ()=>pending[0];
            }
            if (index >= properties.length) {
                const valuePath = util.join(pathValues, (value, i)=>value == null ? util.skip : `${properties[i][0]}=${typeof value === "symbol" ? "*" : util.stringify(value)}`);
                return util.throwError(`The types ${util.itemize(util.map(pending, (type)=>type.name), "and")} can not be disambiguated by${valuePath ? " additional" : ""} values of required properties${valuePath ? ` when ${valuePath}` : ""} (root type(s): ${util.itemize(rootTypes)}) - did you forget to mark a base type abstract?.`);
            }
            const [discriminatorName, discriminatorValues] = properties[index];
            const selectorMap = new Map();
            const remaining = new Set(pending);
            const mapped = new Set();
            util.forEach(discriminatorValues, ([value, typesForValue])=>{
                const remainingForValue = util.filter(typesForValue, remaining);
                if (!remainingForValue.length || util.some(pending, (pendingType)=>isOptional(pendingType, discriminatorName))) {
                    // There are no remaining types for the value, or at least one of the pending types has an optional value for the discriminator
                    // which means it is not usable on this property path.
                    return;
                }
                selectorMap.set(value, mapSelector(index + 1, remainingForValue, [
                    ...pathValues,
                    value
                ]));
                util.forEach(remainingForValue, (type)=>mapped.add(type));
            });
            const mapUnmatched = mapped.size < remaining.size ? mapSelector(index + 1, util.filter(pending, mapped, true), [
                ...pathValues,
                undefined
            ]) : undefined;
            return (value)=>{
                var _this;
                const lookupValue = value === null || value === void 0 ? void 0 : value[discriminatorName];
                var _selectorMap_get;
                return (_this = lookupValue != null && ((_selectorMap_get = selectorMap.get(lookupValue)) !== null && _selectorMap_get !== void 0 ? _selectorMap_get : selectorMap.get(anyValue)) || mapUnmatched) === null || _this === void 0 ? void 0 : _this(value);
            };
        };
        selector = mapSelector(0, types);
    }
    const errorMessage = util.itemize(types, "or", (list, n)=>` does not match the ${n > 1 ? "any of the types" : "the type"} ${list} or any of ${n > 1 ? "their" : "its"} subtypes.`);
    const unmapped = util.filter(types, mapped, true);
    return {
        match: selector,
        censor: (value, context)=>{
            var _selector;
            return value != null ? (_selector = selector(value)) === null || _selector === void 0 ? void 0 : _selector.censor(value, context, false) : value;
        },
        mapped,
        unmapped,
        validate: (value, current, context, errors)=>handleValidationErrors((errors)=>{
                if (value == null) return value;
                const type = selector(value);
                if (!type) {
                    errors.push({
                        path: "",
                        type: null,
                        source: value,
                        message: formatErrorSource(value) + errorMessage
                    });
                    return VALIDATION_ERROR_SYMBOL;
                }
                return type.validate(value, current, context, errors, false);
            }, errors)
    };
};

const parsePropertyType = (property, definition, parseContext, allowNumericStrings = false, typeNamePostfix)=>{
    const propertyType = (()=>{
        if ("primitive" in definition || "enum" in definition) {
            const { validator: inner, enumValues, primitive } = getPrimitiveTypeValidator(definition, allowNumericStrings);
            let name = primitive;
            if ("format" in definition) {
                name += " (" + definition.format + ")";
            }
            if (enumValues) {
                name += " [" + util.map(enumValues, (value)=>JSON.stringify(value)).join(", ") + "]";
            }
            const parsedType = {
                source: definition,
                primitive,
                enumValues,
                validate: (value, _current, _context, errors)=>handleValidationErrors((errors)=>(errors.forEach((error)=>error.type = parsedType), inner(value, errors)), errors),
                censor: (value)=>value,
                toString: ()=>name
            };
            return parsedType;
        }
        if ("item" in definition) {
            const itemType = parsePropertyType(property, definition.item, parseContext);
            const required = !!definition.required;
            const name = "array(" + itemType + ")";
            const parsedType = {
                source: definition,
                item: itemType,
                censor: (value, context)=>{
                    if (!util.isArray(value)) return value;
                    let censored = value;
                    let index = 0;
                    for (let item of value){
                        const censoredItem = itemType.censor(item, context);
                        if (censoredItem !== item) {
                            if (censoredItem == null && required) {
                                return undefined;
                            }
                            if (censored === value) {
                                censored = [
                                    ...censored
                                ];
                            }
                            censored[index] = censored;
                        }
                        ++index;
                    }
                    return censored;
                },
                validate: (value, current, context, errors)=>handleValidationErrors((errors)=>{
                        if (!Array.isArray(value)) {
                            errors.push({
                                path: "",
                                type: parsedType,
                                source: value,
                                message: `${formatErrorSource(value)} is not an array.`
                            });
                            return VALIDATION_ERROR_SYMBOL;
                        }
                        let initialErrors = errors.length;
                        let index = 0;
                        let validated = value;
                        for (let item of value){
                            var _current_index;
                            let validatedItem = pushInnerErrors("[" + index + "]", item, current === undefined ? undefined : (_current_index = current === null || current === void 0 ? void 0 : current[index]) !== null && _current_index !== void 0 ? _current_index : null, context, errors, itemType);
                            if (validatedItem !== item) {
                                if (validated === value) {
                                    validated = [
                                        ...value
                                    ];
                                }
                                validated[index] = validatedItem === VALIDATION_ERROR_SYMBOL ? undefined : validatedItem;
                            }
                            ++index;
                        }
                        return errors.length > initialErrors ? VALIDATION_ERROR_SYMBOL : validated;
                    }, errors),
                toString: ()=>name
            };
            return parsedType;
        }
        if ("key" in definition) {
            const keyType = parsePropertyType(property, {
                ...definition.key,
                required: true
            }, parseContext, true);
            const valueType = parsePropertyType(property, definition.value, parseContext);
            const name = "record(" + keyType + ", " + valueType + ")";
            const parsedType = {
                source: definition,
                key: keyType,
                value: valueType,
                censor: (value, context)=>{
                    if (!value || typeof value !== "object") return value;
                    let censored = value;
                    for(const key in value){
                        const propertyValue = value[key];
                        const censoredPropertyValue = valueType.censor(propertyValue, context);
                        if (censoredPropertyValue !== propertyValue) {
                            if (definition.value.required && censoredPropertyValue == null) {
                                return undefined;
                            }
                            if (censored === value) {
                                censored = {
                                    ...value
                                };
                            }
                            censored[key] = censoredPropertyValue;
                        }
                    }
                    return censored;
                },
                validate: (value, current, context, errors)=>handleValidationErrors((errors)=>{
                        if (!value || typeof value !== "object" || util.isArray(value)) {
                            errors.push({
                                path: "",
                                type: parsedType,
                                source: value,
                                message: `${formatErrorSource(value)} is not a record (JSON object).`
                            });
                            return VALIDATION_ERROR_SYMBOL;
                        }
                        let validated = value;
                        const initialErrors = errors.length;
                        for(let key in value){
                            if (pushInnerErrors("[key]", key, undefined, context, errors, keyType) === VALIDATION_ERROR_SYMBOL) {
                                continue;
                            }
                            const property = value[key];
                            var _current_key;
                            const validatedProperty = pushInnerErrors(key, value[key], current === undefined ? undefined : (_current_key = current === null || current === void 0 ? void 0 : current[key]) !== null && _current_key !== void 0 ? _current_key : null, context, errors, valueType);
                            if (validatedProperty !== property) {
                                if (validated === value) {
                                    validated = {
                                        ...value
                                    };
                                }
                                validated[key] = validatedProperty === VALIDATION_ERROR_SYMBOL ? undefined : validatedProperty;
                            }
                        }
                        return errors.length > initialErrors ? VALIDATION_ERROR_SYMBOL : validated;
                    }, errors),
                toString: ()=>name
            };
            return parsedType;
        }
        if ("properties" in definition || "reference" in definition) {
            if (!property) {
                util.throwError("Object-typed properties can only be parsed in the context of a named property (none was provided).");
            }
            const type = parseType(definition, parseContext, property, typeNamePostfix);
            return type;
        }
        if (!("union" in definition)) {
            util.throwError("Unsupported property type: " + JSON.stringify(definition));
        }
        const unionTypes = definition.union.map((type, i)=>parsePropertyType(property, type, parseContext, false, "" + i));
        if (!unionTypes.length) {
            util.throwError("Empty union types are not allowed.");
        }
        const validators = [];
        const objectTypes = [];
        for (const type of unionTypes){
            if ("properties" in type) {
                objectTypes.push(type);
            } else {
                validators.push({
                    censor: type.censor,
                    validate: type.validate
                });
            }
        }
        if (objectTypes.length) {
            validators.push(createSchemaTypeMapper(objectTypes));
        }
        const unionTypeList = unionTypes.map((type)=>"" + type).join(", ");
        const name = `union(${unionTypeList})`;
        const parsedType = {
            union: unionTypes,
            source: definition,
            censor: validators.length === 1 ? validators[0].censor : (target, context, polymorphic)=>{
                for (const { censor, validate } of validators){
                    if (validate(target, undefined, context, [], polymorphic) !== VALIDATION_ERROR_SYMBOL) {
                        return censor(target, context, polymorphic);
                    }
                    return target;
                }
            },
            validate: validators.length === 1 ? validators[0].validate : (target, current, context, errors, polymorphic)=>handleValidationErrors((errors)=>{
                    const aggregatedErrors = [];
                    for (const { validate } of validators){
                        const validated = validate(target, current, context, aggregatedErrors, polymorphic);
                        if (validated !== VALIDATION_ERROR_SYMBOL) {
                            return validated;
                        }
                    }
                    errors.push({
                        path: "",
                        type: parsedType,
                        source: target,
                        message: `${formatErrorSource(target)} does not match any of the allowed types ${unionTypeList}:\n${util.indent(formatValidationErrors(aggregatedErrors, "- "))}`
                    });
                    return VALIDATION_ERROR_SYMBOL;
                }, errors),
            toString: ()=>name
        };
        return parsedType;
    })();
    const required = property && (definition.required || property.required);
    const inner = propertyType.validate;
    propertyType.validate = (value, current, context, errors)=>handleValidationErrors((errors)=>{
            if (value == null) {
                if (required && !context.patch) {
                    errors.push({
                        path: "",
                        type: propertyType,
                        message: "A value is required",
                        source: value
                    });
                    return VALIDATION_ERROR_SYMBOL;
                }
                return value;
            }
            return inner(value, current, context, errors);
        }, errors);
    return propertyType;
};

const getTypeId = (namespace, name)=>namespace + "#" + name;
const getEntityIdProperties = ({ namespace = util.throwError("Namespace expected."), name, version }, postfix = "")=>({
        id: (namespace !== null && namespace !== void 0 ? namespace : util.throwError(`Namespace expected for ${name}`)) + "#" + name + postfix,
        namespace,
        version,
        qualifiedName: formatQualifiedTypeName({
            namespace,
            name: name + postfix,
            version
        })
    });
const resolveLocalTypeMapping = (nameOrId, context)=>{
    var _context_schema_source_localTypeMappings;
    nameOrId = nameOrId.split("#")[0];
    if (nameOrId === ((_context_schema_source_localTypeMappings = context.schema.source.localTypeMappings) === null || _context_schema_source_localTypeMappings === void 0 ? void 0 : _context_schema_source_localTypeMappings.event)) {
        var _context_systemTypes_event;
        return (_context_systemTypes_event = context.systemTypes.event) !== null && _context_systemTypes_event !== void 0 ? _context_systemTypes_event : util.throwTypeError("Schemas with a local mapping to the system event type must be included after the system schema");
    }
};
/**
 * Parses the specified type, _not_ including base types properties.
 * A separate call to {@link _parseTypeProperties} must follow,
 * when all types have been parsed.
 */ const parseType = (source, context, referencingProperty, typeNamePostfix)=>{
    let id;
    const { schema, parsedTypes, localTypes, typeAliases, systemTypes: systemTypes } = context;
    if (typeof source === "string") {
        source = {
            reference: source
        };
    }
    if ("reference" in source) {
        let { namespace, name } = parseQualifiedTypeName(source.reference);
        // Type reference.
        id = getTypeId(namespace !== null && namespace !== void 0 ? namespace : schema.namespace, name);
        var _typeAliases_get;
        id = (_typeAliases_get = typeAliases.get(id)) !== null && _typeAliases_get !== void 0 ? _typeAliases_get : id;
        var _resolveLocalTypeMapping;
        const parsed = (_resolveLocalTypeMapping = resolveLocalTypeMapping(id, context)) !== null && _resolveLocalTypeMapping !== void 0 ? _resolveLocalTypeMapping : parsedTypes.get(id);
        if (!parsed) {
            throw new Error(`The referenced type "${id}" is not defined in any schema.`);
        }
        referencingProperty && parsed.referencedBy.add(referencingProperty);
        return parsed;
    }
    let name;
    let embedded;
    if (Array.isArray(source)) {
        // Key/value pair from a definition's `types` map.
        [name, source] = source;
        embedded = false;
    } else {
        embedded = true;
        if (!referencingProperty) {
            throw new TypeError("A type must have a name or be embedded in a property.");
        }
        const namePath = [];
        while(referencingProperty){
            namePath.unshift(referencingProperty.name, "type");
            if (typeNamePostfix) {
                namePath.unshift(typeNamePostfix);
            }
            if (referencingProperty.declaringType.embedded) {
                if (!(referencingProperty = util.first(referencingProperty.declaringType.referencedBy))) {
                    throw new Error("INV: An embedded type is referenced by exactly one property (the one that embeds it).");
                }
            }
            namePath.unshift(referencingProperty.declaringType.name);
            break;
        }
        name = namePath.join("_");
    }
    const mappedType = resolveLocalTypeMapping(name, context);
    if (mappedType) {
        return mappedType;
    }
    id = getTypeId(schema.namespace, name);
    if (parsedTypes.has(id)) {
        throw new Error(`The namespace '${schema.namespace}' already contains a type with the name '${name}'.`);
    }
    if (source.name && source.name !== name) {
        name = source.name;
        const originalId = id;
        id = getTypeId(schema.namespace, name);
        if (parsedTypes.has(id)) {
            throw new Error(`The namespace '${schema.namespace}' already contains a type with the name '${name}'.`);
        }
        typeAliases.set(originalId, id);
    }
    var _source_version;
    const version = (_source_version = source.version) !== null && _source_version !== void 0 ? _source_version : schema.version;
    const stringName = "'" + id + "'";
    var _overrideUsage;
    const parsed = {
        ...getEntityIdProperties({
            namespace: schema.namespace,
            name,
            version
        }),
        schema,
        name,
        usage: null,
        usageOverrides: (_overrideUsage = overrideUsage(schema.usageOverrides, source)) !== null && _overrideUsage !== void 0 ? _overrideUsage : {},
        embedded: embedded,
        description: source.description,
        abstract: !!source.abstract,
        extends: null,
        extendsAll: new Set(),
        extendedBy: [],
        extendedByAll: new Set(),
        ownProperties: null,
        properties: {},
        referencedBy: new Set(referencingProperty ? [
            referencingProperty
        ] : []),
        system: source.system,
        ...DEFAULT_CENSOR_VALIDATE,
        source: source,
        toString: ()=>stringName
    };
    parsedTypes.set(id, parsed);
    localTypes.set(name, parsed);
    if (source.system === "event") {
        var _source_properties_CORE_EVENT_DISCRIMINATOR, _source_properties, _source_properties1;
        if (systemTypes.event) {
            throw new Error(`'${id}' tries to define itself as the base type for tracked events, yet '${systemTypes.event.id}' has already done that.`);
        }
        if (((_source_properties = source.properties) === null || _source_properties === void 0 ? void 0 : (_source_properties_CORE_EVENT_DISCRIMINATOR = _source_properties[CORE_EVENT_DISCRIMINATOR]) === null || _source_properties_CORE_EVENT_DISCRIMINATOR === void 0 ? void 0 : _source_properties_CORE_EVENT_DISCRIMINATOR.primitive) !== "string" || ((_source_properties1 = source.properties) === null || _source_properties1 === void 0 ? void 0 : _source_properties1[CORE_EVENT_DISCRIMINATOR].required) !== true) {
            throw new Error(`'${id}' tries to define itself as the base type for tracked events, but is missing the required string property '${CORE_EVENT_DISCRIMINATOR}'.`);
        }
        systemTypes.event = parsed;
    }
    if (referencingProperty != null) {
        parsed.usageOverrides = overrideUsage(referencingProperty.usageOverrides, parsed.usageOverrides);
        parsed.referencedBy.add(referencingProperty);
    }
    if (embedded) {
        parseBaseTypes(parsed, context);
        parseTypeProperties(parsed, context);
    }
    return parsed;
};

const parseProperty = (declaringType, name, definition, context, baseProperty)=>{
    const usageOverrides = overrideUsage(// Properties inherit usage from base properties, not from the type that overrides them.
    baseProperty ? baseProperty.usageOverrides : declaringType ? declaringType.usageOverrides : context.schema.usageOverrides, definition);
    const { defaultUsage } = context;
    var _declaringType_schema;
    const parsedProperty = {
        ...declaringType && getEntityIdProperties(declaringType, "." + name),
        schema: (_declaringType_schema = declaringType === null || declaringType === void 0 ? void 0 : declaringType.schema) !== null && _declaringType_schema !== void 0 ? _declaringType_schema : context.schema,
        ...declaringType && {
            declaringType
        },
        name,
        description: definition.description,
        usage: overrideUsage(defaultUsage, usageOverrides),
        usageOverrides,
        type: null,
        required: !!definition.required,
        source: definition,
        ...DEFAULT_CENSOR_VALIDATE
    };
    if (baseProperty === null || baseProperty === void 0 ? void 0 : baseProperty.required) {
        if (definition.required === false) {
            throw new Error(`A property cannot explicitly be defined as optional if its base property is required (${formatQualifiedTypeName(parsedProperty)}).`);
        }
        parsedProperty.required = true;
    }
    var _baseProperty_type;
    parsedProperty.type = definition["reference"] === "base" ? (_baseProperty_type = baseProperty === null || baseProperty === void 0 ? void 0 : baseProperty.type) !== null && _baseProperty_type !== void 0 ? _baseProperty_type : util.throwError("The property type 'base' is only valid for overriding properties") : parsePropertyType(declaringType ? parsedProperty : null, definition, {
        ...context,
        usageOverrides
    });
    const { type, usage } = parsedProperty;
    const logId = `'${declaringType ? parsedProperty.id : parsedProperty.name}'`;
    if (parsedProperty.baseProperty = baseProperty) {
        const overrideError = (message = `The types ${baseProperty.type} and ${parsedProperty.type} are not compatible.`)=>util.throwError(`The property ${logId} cannot override '${baseProperty.id}': ${message}.`);
        let baseType = baseProperty.type;
        let type = parsedProperty.type;
        while(true){
            if ("item" in baseType) {
                var _type_item;
                type = (_type_item = type["item"]) !== null && _type_item !== void 0 ? _type_item : overrideError();
                continue;
            }
            if ("value" in baseType) {
                var _type_value;
                type = (_type_value = type["value"]) !== null && _type_value !== void 0 ? _type_value : overrideError();
                continue;
            }
            break;
        }
        const baseTypes = "union" in baseType ? baseType.union.filter((type)=>"properties" in type) : "extendedBy" in baseType ? [
            baseType
        ] : null;
        const types = "union" in type ? type.union.filter((type)=>"properties" in type) : "extendedBy" in type ? [
            type
        ] : null;
        if (baseTypes && types) {
            util.forEach(types, (type)=>!baseTypes.some((baseType)=>type !== baseType && !baseType.extendedByAll.has(type)) && overrideError(`The type ${type} is not the same or an extension of the base property's ${util.itemize(baseTypes, "or")}`));
        } else if ("enumValues" in type && type.enumValues) {
            if ("enumValues" in baseType && baseType.enumValues) {
                for (const value of type.enumValues){
                    if (!baseType.enumValues.has(value)) {
                        overrideError();
                    }
                    if (baseType.enumValues.size === type.enumValues.size) {
                        // They are the same, so we enable reference equality
                        // between the types
                        parsedProperty.type = baseType;
                    }
                }
            }
        } else if ("" + baseType !== "" + type) {
            overrideError();
        } else {
            // Always merge base property type.
            // We do not handle min/max value or max-length overrides.
            parsedProperty.type = baseType;
        }
    }
    parsedProperty.censor = createCensorAction(usage, type);
    parsedProperty.validate = createAccessValidator(name, type, usage, "property");
    if (definition.default != null) {
        definition.default = handleValidationErrors((errors)=>parsedProperty.type.validate(definition.default, undefined, {
                trusted: true
            }, errors), null, `The default value does not match the property type for ${logId}.`);
    }
    return parsedProperty;
};

const addBaseType = (subtype, baseType)=>{
    util.add(baseType.extendedByAll, subtype);
    util.add(subtype.extendsAll, baseType);
    for (const baseBaseType of baseType.extends){
        addBaseType(subtype, baseBaseType);
    }
};
const parseBaseTypes = (parsedType, context)=>{
    var _source_extends;
    if (parsedType.extends) {
        return parsedType;
    }
    parsedType.extends = [];
    const { systemTypes: systemTypes, usageOverrides: baseUsageOverrides } = context;
    const source = parsedType.source;
    let usageOverrides = parsedType.usageOverrides;
    if (parsedType.source["event"] && !parsedType.extends.some((baseType)=>{
        var _systemTypes_event;
        return (_systemTypes_event = systemTypes.event) === null || _systemTypes_event === void 0 ? void 0 : _systemTypes_event.extendedByAll.has(baseType);
    })) {
        var _systemTypes_event;
        parsedType.extends.push((_systemTypes_event = systemTypes.event) !== null && _systemTypes_event !== void 0 ? _systemTypes_event : util.throwError("The system base type for tracked events has not been defined."));
    }
    (_source_extends = source.extends) === null || _source_extends === void 0 ? void 0 : _source_extends.forEach((baseType)=>{
        parsedType.extends.push(parseBaseTypes(parseType(baseType, context, null), context));
    });
    for (const parsedBaseType of parsedType.extends){
        usageOverrides = overrideUsage(parsedBaseType.source, usageOverrides);
    }
    for (const baseType of parsedType.extends){
        baseType.extendedBy.push(parsedType);
        addBaseType(parsedType, baseType);
    }
    // Don't apply context usage before we have merged the extended types' usage.
    parsedType.usageOverrides = overrideUsage(baseUsageOverrides, usageOverrides);
    parsedType.usage = overrideUsage(context.defaultUsage, parsedType.usageOverrides);
    return parsedType;
};

const parseTypeProperties = (parsedType, context)=>{
    if (parsedType.ownProperties != null) {
        return parsedType;
    }
    parsedType.ownProperties = {};
    const source = parsedType.source;
    util.forEach(parsedType.extendsAll, (baseType)=>// Make sure we have all the base type's properties.
        parseTypeProperties(baseType, context));
    for (const baseType of parsedType.extendsAll){
        for(const key in baseType.properties){
            var _parsedType_properties, _key;
            var _;
            (_ = (_parsedType_properties = parsedType.properties)[_key = key]) !== null && _ !== void 0 ? _ : _parsedType_properties[_key] = baseType.properties[key];
        }
    }
    for(const key in source.properties){
        const parsedProperty = parseProperty(parsedType, key, source.properties[key], context, parsedType.properties[key]);
        parsedType.properties[key] = parsedType.ownProperties[key] = parsedProperty;
    }
    parsedType.schema.usage = getMinimumUsage(parsedType.schema.usage, parsedType.usage);
    return parsedType;
};

const createEventPatchDefinition = (eventType, type)=>{
    return {
        version: type.version,
        description: `Patch type for ${type.id}.`,
        ...type.usage,
        extends: [
            formatQualifiedTypeName(eventType)
        ],
        properties: util.obj(type.properties, ([key, property])=>{
            var _property_type;
            return key === CORE_EVENT_DISCRIMINATOR ? [
                key,
                {
                    primitive: "string",
                    enum: util.map((_property_type = property.type) === null || _property_type === void 0 ? void 0 : _property_type.enumValues, (typeName)=>`${typeName}${PATCH_EVENT_POSTFIX}`),
                    required: true
                }
            ] : eventType.properties[key] ? util.skip : [
                key,
                {
                    ...serializePropertyType(property.type),
                    description: property.description,
                    ...property.usage,
                    required: false
                }
            ];
        })
    };
};
const serializeAsDefinitions = (schemas)=>{
    const definitions = [];
    for (const schema of schemas){
        const definition = {
            namespace: schema.namespace,
            ...schema.usage,
            description: schema.description,
            name: schema.name,
            version: schema.version
        };
        definitions.push(definition);
        util.forEach(schema.types, ([typeName, type])=>{
            if (!type.embedded) {
                var _definition;
                var _types;
                ((_types = (_definition = definition).types) !== null && _types !== void 0 ? _types : _definition.types = {})[typeName] = serializeObjectType(type);
            }
        });
        util.forEach(schema.variables, ([scope, variables])=>{
            var _definition;
            var _variables;
            const scopeVariableDefinitions = ((_variables = (_definition = definition).variables) !== null && _variables !== void 0 ? _variables : _definition.variables = {})[scope] = {};
            util.forEach(variables, ([variableKey, variable])=>{
                scopeVariableDefinitions[variableKey] = {
                    ...serializePropertyType(variable.type),
                    description: variable.description,
                    ...variable.usage,
                    dynamic: variable.dynamic
                };
            });
        });
    }
    return definitions;
};
const serializeObjectType = (type)=>({
        version: type.version,
        description: type.description,
        abstract: type.abstract,
        ...type.usage,
        extends: type.extends.map((type)=>formatQualifiedTypeName(type)),
        system: type.source.system,
        properties: util.obj(type.ownProperties, ([key, property])=>[
                key,
                {
                    ...serializePropertyType(property.type),
                    description: property.description,
                    ...property.usage,
                    required: property.required
                }
            ])
    });
const serializePropertyType = (type)=>{
    if (isSchemaObjectType(type)) {
        if (type.embedded) {
            return serializeObjectType(type);
        }
        return {
            reference: formatQualifiedTypeName(type)
        };
    }
    if ("primitive" in type) {
        return type.source;
    }
    if ("item" in type) {
        return {
            item: serializePropertyType(type.item)
        };
    }
    if ("key" in type) {
        return {
            key: serializePropertyType(type.key),
            value: serializePropertyType(type.value)
        };
    }
    if ("union" in type) {
        return {
            union: type.union.map((type)=>serializePropertyType(type))
        };
    }
    return util.throwError("Unsupported schema type.");
};

function _define_property$1(obj, key, value) {
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
const DEFAULT_CENSOR_VALIDATE = {
    validate: (value, _current, _context, _errors)=>value,
    censor: (value, _context)=>value
};
const uriValidator = getPrimitiveTypeValidator({
    primitive: "string",
    format: "uri"
});
class TypeResolver {
    getEventType(eventData) {
        return !this._eventMapper ? util.throwError("System event type has not been configured") : eventData && this._eventMapper(eventData);
    }
    getType(typeName, required = true, defaultNamespace) {
        const typeId = typeName.includes("#") ? typeName : (defaultNamespace !== null && defaultNamespace !== void 0 ? defaultNamespace : CORE_SCHEMA_NS) + "#" + typeName;
        const type = this._types.get(typeId);
        if (required && !type) {
            throw new Error(`The type '${typeId}' is not defined.`);
        }
        return type;
    }
    getVariable(scope, key, required = true) {
        var _this__variables_get;
        const variable = (_this__variables_get = this._variables.get(scope)) === null || _this__variables_get === void 0 ? void 0 : _this__variables_get.get(key);
        if (!variable && required) {
            throw new Error(`The variable '${key}' in ${scope} scope is not defined.`);
        }
        return variable;
    }
    subset(namespaces) {
        const selectedSchemas = new Set();
        for (const schemaSelector of Array.isArray(namespaces) ? namespaces : [
            namespaces
        ]){
            let matchedAny = false;
            for (const source of this._sourceDefinitions){
                if (schemaSelector === "*" || schemaSelector === source.schema.namespace || schemaSelector === source.schema.name) {
                    matchedAny = true;
                    selectedSchemas.add(source);
                }
            }
            if (!matchedAny) {
                throw new Error(`The schema selector '${schemaSelector}' did not match any schemas currently loaded in the global type resolver.`);
            }
        }
        return new TypeResolver(this._sourceDefinitions.map((source)=>selectedSchemas.has(source) ? {
                ...source,
                typesOnly: false
            } : {
                ...source,
                typesOnly: true
            }, this._defaultUsage));
    }
    constructor(definitions, defaultUsage = SCHEMA_DATA_USAGE_ANONYMOUS){
        _define_property$1(this, "_schemas", new Map());
        _define_property$1(this, "_types", new Map());
        _define_property$1(this, "_systemTypes", {});
        _define_property$1(this, "_eventMapper", void 0);
        _define_property$1(this, "_variables", new Map());
        _define_property$1(this, "schemas", void 0);
        _define_property$1(this, "_sourceDefinitions", void 0);
        _define_property$1(this, "definitions", void 0);
        _define_property$1(this, "_defaultUsage", void 0);
        _define_property$1(this, "types", void 0);
        _define_property$1(this, "variables", void 0);
        this._sourceDefinitions = definitions;
        this._defaultUsage = defaultUsage;
        const schemaContexts = definitions.map(({ schema, typesOnly })=>{
            if (!schema.namespace) {
                throw new Error(`${util.ellipsis(JSON.stringify(schema), 40, true)} is not a valid schema - namespace is missing.`);
            }
            const namespace = handleValidationErrors((errors)=>uriValidator.validator(schema.namespace, errors));
            if (this._schemas.has(namespace)) {
                throw new Error(`Only one schema can define the namespace '${namespace}'.`);
            }
            var _schema_name;
            const parsed = {
                id: namespace,
                namespace,
                source: schema,
                description: schema.description,
                name: (_schema_name = schema.name) !== null && _schema_name !== void 0 ? _schema_name : namespace,
                qualifiedName: namespace,
                typesOnly: !!typesOnly,
                version: schema.version,
                usageOverrides: schema,
                types: new Map(),
                events: new Map(),
                variables: new Map()
            };
            this._schemas.set(namespace, parsed);
            return [
                parsed,
                {
                    schema: parsed,
                    parsedTypes: this._types,
                    systemTypes: this._systemTypes,
                    defaultUsage: overrideUsage(defaultUsage, parsed.usageOverrides),
                    usageOverrides: schema,
                    typesOnly: !!typesOnly,
                    localTypes: parsed.types,
                    typeAliases: new Map()
                }
            ];
        });
        for (const [schema, context] of schemaContexts){
            // Populate the type dictionary with initial type stubs without properties and base types.
            // This allows circular references to be resolved, and schemas and their types be parsed in any order.
            util.forEach(schema.source.types, ([name, type])=>parseType([
                    name,
                    type
                ], context, null));
        }
        const eventType = this._systemTypes.event;
        for (const [schema, context] of schemaContexts){
            // Parse base types so "extendedBy" is populated for all types before we parse properties..
            util.forEach(schema.types, ([, type])=>parseBaseTypes(type, context));
        }
        for (const [schema, context] of schemaContexts){
            util.forEach(schema.types, ([, type])=>parseTypeProperties(type, context));
        }
        if (eventType) {
            // Make a copy of the original event types to avoid infinite loop (that is, patch types for patch types for patch types etc...).
            util.forEach(eventType.extendedByAll, (type)=>{
                var _type_properties_CORE_EVENT_DISCRIMINATOR;
                var _schemaContexts_find;
                const context = ((_schemaContexts_find = schemaContexts.find((context)=>context[0] === type.schema)) !== null && _schemaContexts_find !== void 0 ? _schemaContexts_find : util.throwError(`No parse context for the schema '${type.schema.name}'.`))[1];
                if (!hasEnumValues((_type_properties_CORE_EVENT_DISCRIMINATOR = type.properties[CORE_EVENT_DISCRIMINATOR]) === null || _type_properties_CORE_EVENT_DISCRIMINATOR === void 0 ? void 0 : _type_properties_CORE_EVENT_DISCRIMINATOR.type)) {
                    // Event types without a specific const value for `type` are per definition abstract.
                    type.abstract = true;
                } else if (!type.name.endsWith(PATCH_EVENT_POSTFIX) && !this._types.has(type.id + PATCH_EVENT_POSTFIX)) {
                    // Create a corresponding patch type.
                    const patchDefinition = createEventPatchDefinition(eventType, type);
                    patchDefinition.system = "patch";
                    const patchType = parseType([
                        type.name + PATCH_EVENT_POSTFIX,
                        patchDefinition
                    ], context, null);
                    parseBaseTypes(patchType, context);
                    parseTypeProperties(patchType, context);
                }
            });
        }
        util.forEach(this._types, ([, type])=>{
            // Finish the types.
            addTypeValidators(type);
            util.forEach(type.extendedBy, (subtype)=>{
                var _subtype;
                util.forEach(type.referencedBy, (prop)=>subtype.referencedBy.add(prop));
                util.forEach(type.variables, ([scope, keys])=>util.forEach(keys, (key)=>{
                        var _variables;
                        return util.get((_variables = (_subtype = subtype).variables) !== null && _variables !== void 0 ? _variables : _subtype.variables = new Map(), scope, ()=>new Set()).add(key);
                    }));
            });
        });
        if (eventType) {
            this._eventMapper = createSchemaTypeMapper([
                eventType
            ]).match;
        }
        for (const [schema, context] of schemaContexts){
            if (schema.typesOnly) {
                continue;
            }
            // Find variables.
            util.forEach(schema.source.variables, ([scope, keys])=>{
                util.forEach(keys, ([key, definition])=>{
                    if (!definition) {
                        return;
                    }
                    let variableType;
                    if ("reference" in definition) {
                        // Get the referenced type.
                        variableType = parseType(definition, context, null);
                    } else if ("properties" in definition) {
                        // Not a reference, upgrade the anonymous object types to a type definition by giving it a name.
                        variableType = parseType([
                            scope + "_" + key,
                            definition
                        ], context, null);
                        parseBaseTypes(variableType, context);
                        parseTypeProperties(variableType, context);
                        addTypeValidators(variableType);
                    }
                    const dummyProperty = parseProperty(variableType, key, definition, context);
                    variableType !== null && variableType !== void 0 ? variableType : variableType = dummyProperty.type;
                    const variable = {
                        key,
                        scope,
                        type: variableType,
                        description: dummyProperty.description,
                        usage: dummyProperty.usage,
                        validate: dummyProperty.validate,
                        censor: dummyProperty.censor,
                        dynamic: !!definition.dynamic
                    };
                    const current = util.exchange(util.get(this._variables, scope, ()=>new Map()), key, variable);
                    current && util.throwError(`The type "${variableType.toString()}" cannot be registered for the variable key "${key}" in ${scope} scope, since it is already used by "${current.type.toString}".`);
                    util.get(schema.variables, scope, ()=>new Map()).set(key, variable);
                    if ("properties" in variableType) {
                        var _variableType;
                        var _variables;
                        util.get((_variables = (_variableType = variableType).variables) !== null && _variables !== void 0 ? _variables : _variableType.variables = new Map(), scope, ()=>new Set()).add(key);
                    }
                });
            });
        }
        this.types = util.obj(this._types);
        this.variables = util.obj(this._variables, ([scope, variables])=>[
                scope,
                util.obj(variables, ([key, variable])=>{
                    const usage = variable.usage = overrideUsage(isSchemaObjectType(variable.type) ? variable.type.usage : undefined, variable.usage);
                    const innerValidator = createAccessValidator(scope + "." + key, variable.type, usage, "variable");
                    variable.validate = variable.dynamic ? (value, current, context, errors, polymorphic)=>handleValidationErrors((errors)=>{
                            if (context.forResponse) {
                                return innerValidator(value, current, context, errors, polymorphic);
                            }
                            errors.push({
                                message: "The value is dynamically calculated and cannot be set",
                                path: "",
                                type: variable.type,
                                source: value,
                                forbidden: true
                            });
                            return VALIDATION_ERROR_SYMBOL;
                        }, errors) : innerValidator;
                    variable.censor = createCensorAction(usage, variable.type);
                    return [
                        key,
                        variable
                    ];
                })
            ]);
        this.schemas = [
            ...this._schemas.values()
        ];
        this.definitions = serializeAsDefinitions(this.schemas);
    }
}

const variableScopeNames = {
    /**
   * Variables that are not bound to individuals, does not contain personal data, and not subject to censoring.
   * These may be used for purposes such as shared runtime configuration
   * or augmenting external entities with real-time data for personalization or testing.
   */ global: "global",
    /**
   * Variables that relates to an individual's current session. These are purged when the session ends.
   *
   * Session variables can only be read for the current session from untrusted contexts.
   */ session: "session",
    /**
   * Variables that relates to an individual's device.
   *
   * These variables are physically stored in the device where the available space may be very limited.
   * For example, do not exceed a total of 2 KiB if targeting web browsers.
   *
   * To prevent race conditions between concurrent requests, device data may temporarily be loaded into session storage.
   *
   * Any data stored here is per definition at least `indirect` since it is linked to a device.
   */ device: "device",
    /**
   * Variables that relates to an individual across devices.
   *
   * Associating a user ID with a session can only happen from a trusted context,
   * but data for the associated user can then be read from untrusted contexts unless a `trusted-only` restriction is put on the data.
   *
   * Any data stored here is per definition at least `direct` since it directly linked to an individual.
   */ user: "user"
};
const VariableServerScope = util.createEnumParser("variable scope", variableScopeNames);
const VARIABLE_SYNTAX_RULES_TEXT = "Variables must be lowercase, start with a letter and then only user letters, numbers, underscores, dots and hyphens. (Keys prefixed with '@' are reserved for internal use.)";
/** Validates that the syntax for a key, scope or source in a variable conforms to the allowed syntax.  */ const validateVariableKeyComponent = (syntax)=>/^[@a-z][a-z0-9_.-]{0,49}$/.test(syntax);
/**
 * Validates that spelling of the components in a variable key conforms to the allowed syntax.
 * If not, it returns the text for an error message, indicating which didn't, so be aware the truthy'ness of the return value is opposite
 * of what one might expect.
 */ const validateVariableKeySyntax = (key)=>{
    if (!key) return undefined;
    let invalidComponents = undefined;
    if (!validateVariableKeyComponent(key.key)) {
        (invalidComponents !== null && invalidComponents !== void 0 ? invalidComponents : invalidComponents = []).push("key");
    }
    if (!validateVariableKeyComponent(key.scope)) {
        (invalidComponents !== null && invalidComponents !== void 0 ? invalidComponents : invalidComponents = []).push("scope");
    }
    if (key.source && !validateVariableKeyComponent(key.source)) {
        (invalidComponents !== null && invalidComponents !== void 0 ? invalidComponents : invalidComponents = []).push("source");
    }
    return invalidComponents && `Invalid ${util.itemize(invalidComponents)}. ${VARIABLE_SYNTAX_RULES_TEXT}`;
};
/** Returns a description of a key that can be used for logging and error messages.  */ const formatVariableKey = ({ key, scope = "", entityId = "", source = "" }, error = "")=>[
        "'" + key + "'",
        source && "from '" + source + "'",
        error,
        scope && "in " + scope + " scope",
        entityId && "for '" + entityId + "'"
    ].filter((s)=>s).join(" ");
const extractKey = (value)=>value == null ? value : {
        source: value.source,
        key: value.key,
        scope: value.scope,
        entityId: value.entityId
    };
const extractVariable = (variable)=>{
    if (variable == null) return variable;
    return {
        scope: variable.scope,
        key: variable.key,
        entityId: variable.entityId,
        created: variable.created,
        modified: variable.modified,
        version: variable.version,
        expires: variable.expires,
        ttl: variable.ttl,
        value: variable.value
    };
};
const removeLocalScopedEntityId = (variable)=>{
    if (variable.scope !== "global") {
        variable.entityId = undefined;
    }
    return variable;
};

const filterSetSymbol = Symbol();
const filterKeys = (filter, values, key)=>{
    if (filter == null) {
        return values;
    }
    let cached = filter[filterSetSymbol];
    if (!cached) {
        cached = filter[filterSetSymbol] = filter.not ? {
            set: util.distinct(filter.not),
            not: true
        } : {
            set: util.distinct(filter),
            not: false
        };
    }
    const { set, not } = cached;
    return util.map(values, (value)=>set.has(key ? key(value) : value) !== not ? value : util.skip);
};
const filterRangeValue = (value, filter, rank)=>{
    if (value == null || filter == null) {
        return true;
    }
    if ("eq" in filter) {
        return value === filter.eq;
    }
    const valueRank = rank(value);
    return (filter.lt ? valueRank < rank(filter.lt) : filter.lte ? valueRank <= rank(filter.lte) : true) && (filter.gt ? valueRank > rank(filter.gt) : filter.gte ? valueRank >= rank(filter.gte) : true);
};
async function* iterateQueryResults(storage, query, batch = false) {
    let cursor;
    do {
        const { variables, cursor: nextCursor } = await storage.query(query, {
            cursor
        });
        if (variables.length) {
            if (batch) {
                yield variables;
            } else {
                yield* variables;
            }
        }
        cursor = nextCursor;
    }while (cursor)
}

var VariableResultStatus = /*#__PURE__*/ function(VariableResultStatus) {
    VariableResultStatus[VariableResultStatus["Success"] = 200] = "Success";
    VariableResultStatus[VariableResultStatus["Created"] = 201] = "Created";
    VariableResultStatus[VariableResultStatus["NotModified"] = 304] = "NotModified";
    VariableResultStatus[VariableResultStatus["BadRequest"] = 400] = "BadRequest";
    VariableResultStatus[VariableResultStatus["Forbidden"] = 403] = "Forbidden";
    VariableResultStatus[VariableResultStatus["NotFound"] = 404] = "NotFound";
    VariableResultStatus[VariableResultStatus["Conflict"] = 409] = "Conflict";
    VariableResultStatus[VariableResultStatus["Error"] = 500] = "Error";
    return VariableResultStatus;
}({});
/** The variable operation succeeded, and the result represents a variable, or undefined if not found. */ const isVariableResult = (value, requireFound = true)=>(value === null || value === void 0 ? void 0 : value.value) != null || !requireFound && (!value || value.status === 404);
/**
 * The variable existed so the result has a value,
 * or the variable did not exists, in which case the value can be interpreted as `null`.
 */ const isSuccessResult = (value, requireFound = true)=>value && (value.status < 400 || !requireFound && value.status === 404);
const isTransientError = (value)=>value === null || value === void 0 ? void 0 : value.transient;

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
const formatVariableResult = (result)=>{
    const key = formatVariableKey(result);
    const error = result.error;
    return result.status < 400 ? `${key} succeeded with status ${result.status} - ${VariableResultStatus[result.status]}.` : `${key} failed with status ${result.status} - ${VariableResultStatus[result.status]}${error ? ` (${error})` : ""}.`;
};
class VariableStorageError extends Error {
    constructor(operations, message){
        super(message !== null && message !== void 0 ? message : "One or more operations failed."), _define_property(this, "succeeded", void 0), _define_property(this, "failed", void 0);
        var _operations_filter;
        this.succeeded = (_operations_filter = operations === null || operations === void 0 ? void 0 : operations.filter((operation)=>isSuccessResult(operation, false))) !== null && _operations_filter !== void 0 ? _operations_filter : [];
        var _operations_filter1;
        this.failed = (_operations_filter1 = operations === null || operations === void 0 ? void 0 : operations.filter((operation)=>!isSuccessResult(operation, false))) !== null && _operations_filter1 !== void 0 ? _operations_filter1 : [];
    }
}
const hasCallback = (op)=>!!op["callback"];
const hasPollCallback = (op)=>!!op["poll"];
const sourceOperation = Symbol();
const createPollCallback = (op, initialResult)=>{
    let previous;
    return (result)=>{
        if (!isVariableResult(result, false)) {
            return true;
        }
        const poll = isVariableResult(result, false) ? op.poll(result.value, initialResult ? result === initialResult : result[sourceOperation] === op, previous) : true;
        previous = result.value;
        return poll;
    };
};
const toVariableResultPromise = (operationType, operations, handler, { poll, logCallbackError } = {})=>{
    const ops = util.isArray(operations) ? operations : [
        operations
    ];
    const callbackErrors = [];
    const handlerResultPromise = (async ()=>{
        const results = await handler(ops.filter((op)=>op));
        const callbacks = [];
        for (const op of ops){
            if (!op) {
                continue;
            }
            const result = results.get(op);
            if (result == null) {
                continue;
            }
            result[sourceOperation] = op;
            if (hasCallback(op)) {
                callbacks.push([
                    op,
                    result,
                    (result)=>op.callback(result) === true
                ]);
            }
            if (hasPollCallback(op)) {
                // This is only defined for get operations.
                callbacks.push([
                    op,
                    result,
                    createPollCallback(op)
                ]);
            }
        }
        for (const [op, initialResult, callback] of callbacks){
            try {
                const pollingCallback = operationType === "get" ? async (result)=>await callback(result) === true && (poll === null || poll === void 0 ? void 0 : poll(op, pollingCallback)) : callback;
                await pollingCallback(initialResult);
            } catch (error) {
                const message = `${operationType} callback for ${formatVariableKey(op)} failed: ${error}.`;
                if (logCallbackError) {
                    logCallbackError(message, op, error);
                } else {
                    callbackErrors.push(message);
                }
            }
        }
        return results;
    })();
    const mapResults = async (type, require)=>{
        // The raw results from the map function including error results.
        const handlerResults = await handlerResultPromise;
        // The results we will return if there are no errors;
        const results = [];
        const errors = [];
        for (const op of ops){
            if (!op) {
                // Falsish to undefined.
                results.push(undefined);
                continue;
            }
            const result = handlerResults.get(op);
            if (result == null) {
                errors.push(`No result for ${formatVariableKey(op)}.`);
                continue;
            }
            if (!type || isSuccessResult(result, // 404 is an error result for set operations, but not for get.
            require || operationType === "set")) {
                var _result_value;
                results.push(type && result.status === VariableResultStatus.NotFound ? undefined : type > 1 ? (_result_value = result["value"]) !== null && _result_value !== void 0 ? _result_value : undefined : result);
            } else {
                errors.push(formatVariableResult(result));
            }
        }
        errors.push(...callbackErrors);
        if (errors.length) {
            if (errors.length > 10) {
                errors.push(`\n(and ${errors.splice(10).length} more...)`);
            }
            throw new VariableStorageError(results, errors.join("\n"));
        }
        return ops === operations ? results : results[0]; // Single value if single value.
    };
    const resultPromise = Object.assign(util.deferredPromise(()=>mapResults(1, false)), {
        as: ()=>mapResults(1, false),
        all: ()=>mapResults(0, false),
        successOnly: ()=>mapResults(1, true),
        value: (require = false)=>mapResults(2, require),
        values: (require = false)=>mapResults(2, require)
    });
    return resultPromise;
};

const isTrackedEvent = (ev)=>ev && typeof ev.type === "string";

const isPassiveEvent = (value)=>{
    var _value_metadata;
    return !!((value === null || value === void 0 ? void 0 : (_value_metadata = value.metadata) === null || _value_metadata === void 0 ? void 0 : _value_metadata.passive) || (value === null || value === void 0 ? void 0 : value.patchTargetId));
};

const typeTest = (...types)=>(ev)=>(ev === null || ev === void 0 ? void 0 : ev.type) && types.some((type)=>type === (ev === null || ev === void 0 ? void 0 : ev.type));

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

const ESCAPED_CHAR = /%[A-F0-9]{2}/i;
const maybeDecode = (s)=>s && ESCAPED_CHAR.test(s) ? util.tryCatch(()=>decodeURIComponent(s), s) : s;
const mapTags = (tags, options)=>uniqueTags(collectTags(tags, options), false);
const TAG_GRAMMAR = /(?:^|[\s,&#])(?:([^\s,:="'&#~]+)::)?([^\s,='"&#~]+)(?:\s*=\s*(?:"((?:\\.|[^"\\]+)*)"?|'((?:\\.|[^'\\]+)*)'?|((?:\s*[^,~&#\s]+)+)))?(?:~\s*((?:\d*\.\d)?\d*))?/g;
const NS_AND_TAG = /^(?:([^:]+)::)?(.*)$/;
const STRIP_EXTRA_COLONS = /^:+|:+$|(:):*/g;
/**
 * Parses tags from a string or array of strings and collects them in a map to avoid duplicates.
 *
 * Syntax #?[namespace::][tag][=value][~weight][,&].
 * Namespace and tags may contain any characters except whitespace, `,`, `=`, `"`, `~` and `&`.
 * Value must be quoted (`"value"` or `'value'`) if it contains any of the characters `,`, `~`, `&` or `~`. Escape the quote character with backslash (`\"` or `\'`) if needed.
 * The score may be any floating point number.
 *
 * Multi-level tags have their levels separated by `:` by convention.
 */ const collectTags = (parsableTag, options, collected)=>{
    if (parsableTag) {
        if (util.isIterable(parsableTag)) {
            util.forEach(parsableTag, (input)=>collected = collectTags(input, options, collected));
        } else if (typeof parsableTag === "object" && !("tag" in parsableTag)) {
            collected = parseTagMap(parsableTag, options, collected);
        } else if (util.isString(parsableTag)) {
            util.match(parsableTag, TAG_GRAMMAR, (_, ns, localName, doubleQuoted, singleQuoted, unquoted, score)=>{
                var _this;
                var _replace;
                collected = addValidatedTag(collected, {
                    tag: maybeDecode(localName),
                    value: maybeDecode((_replace = (_this = doubleQuoted !== null && doubleQuoted !== void 0 ? doubleQuoted : singleQuoted) === null || _this === void 0 ? void 0 : _this.replace(/\\(.)/g, (_, p)=>p === "r" ? "\r" : p === "n" ? "\n" : p === "t" ? "\t" : p)) !== null && _replace !== void 0 ? _replace : unquoted),
                    score: score ? parseFloat(score) : undefined,
                    eventType: options === null || options === void 0 ? void 0 : options.eventType
                }, options === null || options === void 0 ? void 0 : options.prefix, maybeDecode(ns) || (options === null || options === void 0 ? void 0 : options.ns));
            });
        } else {
            collected = addValidatedTag(collected, parsableTag, options === null || options === void 0 ? void 0 : options.prefix, options === null || options === void 0 ? void 0 : options.ns);
        }
    }
    return collected;
};
const encodeTag = (tag)=>tag == null ? tag : tag.tag + (tag.value ? "=" + (/[,&,#~"]/.test(tag.value) ? '"' + tag.value.replace(/"/, '\\"') + '"' : tag.value) : "") + (tag.score && tag.score !== 1 ? "~" + tag.score : "");
const parseTagName = (qualifiedName, appendPrefix)=>{
    let [_, ns, localName] = qualifiedName.match(NS_AND_TAG);
    return [
        ns,
        (appendPrefix ? `${appendPrefix}:${localName}` : localName).replace(STRIP_EXTRA_COLONS, "$1")
    ];
};
const addValidatedTag = (target, boundaryTag, prefix, ns)=>{
    if (!boundaryTag) {
        return target;
    }
    let [localNs = ns, tag] = parseTagName(boundaryTag.tag, prefix);
    if (tag) {
        if (localNs) {
            tag = localNs + "::" + tag;
        }
        (target !== null && target !== void 0 ? target : target = []).push(tag !== boundaryTag.tag || boundaryTag.value === "" ? {
            ...boundaryTag,
            tag,
            value: boundaryTag.value || undefined
        } : boundaryTag);
    }
    return target;
};
const TAG_VALUE_PROPS = {
    value: true,
    score: true,
    eventType: true
};
const extractTags = (target, map, ns, eventType, prefix)=>{
    if (map) {
        if (util.isArray(map)) {
            for (const item of map){
                target = extractTags(target, item, ns, eventType, prefix);
            }
        } else if (typeof map !== "object") {
            target = addValidatedTag(target, {
                tag: "",
                value: typeof map === "string" ? map : undefined
            }, prefix, ns);
        } else if ("value" in map || "score" in map || "eventType" in map) {
            target = addValidatedTag(target, {
                tag: "",
                eventType,
                ...map
            }, prefix, ns);
        } else {
            for(let prop in map){
                const value = map[prop];
                if (!value || TAG_VALUE_PROPS[prop]) {
                    continue;
                }
                const [localNs = ns, localName] = parseTagName(prop);
                target = extractTags(target, value, localNs, eventType, `${prefix}:${localName}`);
            }
        }
    }
    return target;
};
const parseTagMap = (map, options, target)=>extractTags(target, map, options === null || options === void 0 ? void 0 : options.ns, options === null || options === void 0 ? void 0 : options.eventType, (options === null || options === void 0 ? void 0 : options.prefix) ? options.prefix + ":" : "");

exports.CORE_EVENT_DISCRIMINATOR = CORE_EVENT_DISCRIMINATOR;
exports.CORE_EVENT_TYPE = CORE_EVENT_TYPE;
exports.CORE_SCHEMA_NS = CORE_SCHEMA_NS;
exports.DATA_PURPOSES_ALL = DATA_PURPOSES_ALL;
exports.DEFAULT_CENSOR_VALIDATE = DEFAULT_CENSOR_VALIDATE;
exports.DataClassification = DataClassification;
exports.DataPurposes = DataPurposes;
exports.DataUsage = DataUsage;
exports.DataVisibility = DataVisibility;
exports.EVENT_TYPE_PATCH_POSTFIX = EVENT_TYPE_PATCH_POSTFIX;
exports.JsonSchemaAdapter = JsonSchemaAdapter;
exports.MarkdownSchemaAdapter = MarkdownSchemaAdapter;
exports.SCHEMA_DATA_USAGE_ANONYMOUS = SCHEMA_DATA_USAGE_ANONYMOUS;
exports.SCHEMA_DATA_USAGE_MAX = SCHEMA_DATA_USAGE_MAX;
exports.SCHEMA_PRIVACY_PROPERTY = SCHEMA_PRIVACY_PROPERTY;
exports.SCHEMA_TYPE_PROPERTY = SCHEMA_TYPE_PROPERTY;
exports.TypeResolver = TypeResolver;
exports.VALIDATION_ERROR_SYMBOL = VALIDATION_ERROR_SYMBOL;
exports.VARIABLE_SYNTAX_RULES_TEXT = VARIABLE_SYNTAX_RULES_TEXT;
exports.ValidationError = ValidationError;
exports.VariableResultStatus = VariableResultStatus;
exports.VariableServerScope = VariableServerScope;
exports.VariableStorageError = VariableStorageError;
exports.appendTrackingData = appendTrackingData;
exports.cleanBoundaryDataProperties = cleanBoundaryDataProperties;
exports.clearMetadata = clearMetadata;
exports.clearSchemaMetadata = clearSchemaMetadata;
exports.collectTags = collectTags;
exports.contextError = contextError;
exports.createPollCallback = createPollCallback;
exports.createRootContext = createRootContext;
exports.encodeTag = encodeTag;
exports.externalReferencesEqual = externalReferencesEqual;
exports.extractKey = extractKey;
exports.extractVariable = extractVariable;
exports.filterKeys = filterKeys;
exports.filterRangeValue = filterRangeValue;
exports.formatDataUsage = formatDataUsage;
exports.formatQualifiedTypeName = formatQualifiedTypeName;
exports.formatValidationErrors = formatValidationErrors;
exports.formatVariableKey = formatVariableKey;
exports.formatVariableResult = formatVariableResult;
exports.getExternalReferenceKey = getExternalReferenceKey;
exports.getPath = getPath;
exports.getTagKey = getTagKey;
exports.handleValidationErrors = handleValidationErrors;
exports.hasComponentOrContent = hasComponentOrContent;
exports.hasEnumValues = hasEnumValues;
exports.isAnchorEvent = isAnchorEvent;
exports.isCartAbandonedEvent = isCartAbandonedEvent;
exports.isCartEvent = isCartEvent;
exports.isClientLocationEvent = isClientLocationEvent;
exports.isComponentClickEvent = isComponentClickEvent;
exports.isComponentClickIntentEvent = isComponentClickIntentEvent;
exports.isComponentViewEvent = isComponentViewEvent;
exports.isConsentEvent = isConsentEvent;
exports.isEmptyTrackingData = isEmptyTrackingData;
exports.isEventPatch = isEventPatch;
exports.isFormEvent = isFormEvent;
exports.isIgnoredObject = isIgnoredObject;
exports.isImpressionEvent = isImpressionEvent;
exports.isJsonObjectType = isJsonObjectType;
exports.isJsonSchema = isJsonSchema;
exports.isNavigationEvent = isNavigationEvent;
exports.isOrderCancelledEvent = isOrderCancelledEvent;
exports.isOrderCompletedEvent = isOrderCompletedEvent;
exports.isOrderEvent = isOrderEvent;
exports.isPassiveEvent = isPassiveEvent;
exports.isPaymentAcceptedEvent = isPaymentAcceptedEvent;
exports.isPaymentRejectedEvent = isPaymentRejectedEvent;
exports.isPostResponse = isPostResponse;
exports.isResetEvent = isResetEvent;
exports.isSchemaArrayType = isSchemaArrayType;
exports.isSchemaObjectType = isSchemaObjectType;
exports.isSchemaRecordType = isSchemaRecordType;
exports.isScrollEvent = isScrollEvent;
exports.isSearchEvent = isSearchEvent;
exports.isSessionStartedEvent = isSessionStartedEvent;
exports.isSignInEvent = isSignInEvent;
exports.isSignOutEvent = isSignOutEvent;
exports.isSuccessResult = isSuccessResult;
exports.isTrackedEvent = isTrackedEvent;
exports.isTransientError = isTransientError;
exports.isUserAgentEvent = isUserAgentEvent;
exports.isVariableResult = isVariableResult;
exports.isViewEvent = isViewEvent;
exports.iterateQueryResults = iterateQueryResults;
exports.mapTags = mapTags;
exports.navigateContext = navigateContext;
exports.normalizeTrackingData = normalizeTrackingData;
exports.parseAnnotations = parseAnnotations;
exports.parseDefinitions = parseDefinitions;
exports.parseJsonProperty = parseJsonProperty;
exports.parseJsonSchema = parseJsonSchema;
exports.parseJsonType = parseJsonType;
exports.parseQualifiedTypeName = parseQualifiedTypeName;
exports.parseSchemaDataUsageKeywords = parseSchemaDataUsageKeywords;
exports.removeLocalScopedEntityId = removeLocalScopedEntityId;
exports.serializeAnnotations = serializeAnnotations;
exports.serializeSchema = serializeSchema;
exports.sourceJsonSchemaSymbol = sourceJsonSchemaSymbol;
exports.toVariableResultPromise = toVariableResultPromise;
exports.typeTest = typeTest;
exports.uniqueReferences = uniqueReferences;
exports.uniqueTags = uniqueTags;
exports.validateConsent = validateConsent;
exports.validateVariableKeyComponent = validateVariableKeyComponent;
exports.validateVariableKeySyntax = validateVariableKeySyntax;
