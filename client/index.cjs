'use strict';

var util = require('@tailjs/util');
var types = require('@tailjs/types');
var transport = require('@tailjs/transport');

const levels = {
    /**
   * Variables that are only available in memory in the current view, and lost as soon as the user navigates away (without bf_cache) or closes the browser.
   *
   * Data in this scope may be used without user consent (anonymous tracking), however if it is used in logic for event tracking
   * make sure it does not contain personal information that may identify the user, hence violate the premise for the otherwise anonymously
   * collected data.
   *
   *
   */ view: "view",
    /**
   * Variables that are only available in the current tab, including between views in the same tab as navigation occurs, but lost as soon as the user closes the tab.
   *
   * Data is encrypted at rest, yet only available if the user has consented to data being stored for the variables' purposes.
   */ tab: "tab",
    /**
   * Variables that are shared between open tabs, and lost as soon as the last tab is closed.
   * These variables are kept entirely in memory and shared via messaging which means they are never persisted in the user's
   * device between browser restarts.
   *
   * Use the server-side scopes `session`, `device` or `user` if the data must be persisted for a longer duration.
   */ shared: "shared"
};
const localVariableScope = util.createEnumParser("local variable scope", levels);
const anyVariableScope = util.createEnumParser("variable scope", {
    ...localVariableScope,
    ...types.VariableServerScope
});
const maskEntityId = (key)=>(key["scope"] !== "global" && key["entityId"] && (key["entityId"] = undefined), key);
const isLocalScopeKey = (key)=>(key === null || key === void 0 ? void 0 : key.scope) ? localVariableScope.ranks[key.scope] != null : false;
const variableKeyToString = (key)=>key == null ? key : [
        key.scope,
        key.key,
        key.entityId
    ].join("\0");
const stringToVariableKey = (key)=>{
    const parts = key.split("\0");
    return {
        scope: parts[0],
        key: parts[1],
        entityId: parts[2]
    };
};

const EVENT_HUB_QUERY = "var";
const VARIABLES_QUERY = "usr";
const CONTEXT_NAV_QUERY = "mnt";
const SCOPE_INFO_KEY = "@info";
const CONSENT_INFO_KEY = "@consent";
const PATCH_EVENT_POSTFIX = "_patch";
const CLIENT_STORAGE_PREFIX = "_tail:";
const CLIENT_STATE_CHANNEL_ID = CLIENT_STORAGE_PREFIX + "state";
const CLIENT_CALLBACK_CHANNEL_ID = CLIENT_STORAGE_PREFIX + "push";

const HEARTBEAT_FREQUENCY = 5000;
const REQUEST_LOCK_KEY = CLIENT_STORAGE_PREFIX + "rq";
const VARIABLE_POLL_FREQUENCY = 3000;
const VARIABLE_CACHE_DURATION = 3000;
const EVENT_POST_FREQUENCY = 5000;
const NOT_INITIALIZED = ()=>()=>util.throwError("Not initialized.");

const win = window;
const doc = document;
let body = util.nil;
// The script may load before the body tag has been parsed.
util.waitFor(()=>document.body, (value)=>body = value);
const matchSelector = (node, selector)=>!!(node === null || node === void 0 ? void 0 : node.matches(selector));
util.toggleAnsi(!!win.chrome);

let MAX_ANCESTOR_DISTANCE = util.MAX_SAFE_INTEGER;
const forAncestorsOrSelf = (el, action, stoppingCriterion = (el, distance)=>distance >= MAX_ANCESTOR_DISTANCE)=>{
    let i = 0;
    let returnValue;
    let stop = util.F;
    let actionResult;
    while((el === null || el === void 0 ? void 0 : el["nodeType"]) === 1 && !stoppingCriterion(el, i++) && (actionResult = action(el, (value, replace)=>(value != util.nil && (returnValue = value, stop = replace !== util.T && returnValue != util.nil), util.T), i - 1)) !== util.F && actionResult !== util.stop && !stop){
        const prev = el;
        el = el.parentElement;
        if (el === null && (prev === null || prev === void 0 ? void 0 : prev.ownerDocument) !== doc) {
            var _prev_ownerDocument_defaultView;
            el = prev === null || prev === void 0 ? void 0 : (_prev_ownerDocument_defaultView = prev.ownerDocument.defaultView) === null || _prev_ownerDocument_defaultView === void 0 ? void 0 : _prev_ownerDocument_defaultView.frameElement;
        }
    }
    return returnValue;
};
const parseAttributeValue = (value, type = "z")=>{
    if (value == null || value === "null" || value === "" && type !== "b") return undefined;
    switch(type){
        case true:
        case "z":
            var _trim;
            return (_trim = ("" + value).trim()) === null || _trim === void 0 ? void 0 : _trim.toLowerCase();
        case false:
        case "r":
        case "b":
            return value === "" || util.parseBoolean(value);
        case "n":
            return parseFloat(value);
        case "j":
            return util.tryCatch(()=>JSON.parse(value), util.NOOP);
        case "h":
            return util.tryCatch(()=>httpDecode(value), util.NOOP);
        case "e":
            return util.tryCatch(()=>httpDecrypt === null || httpDecrypt === void 0 ? void 0 : httpDecrypt(value), util.NOOP);
        default:
            return util.isArray(type) ? value === "" ? undefined : ("" + value).split(",").map((value)=>value = value.trim() === "" ? undefined : parseAttributeValue(value, type[0])) : undefined;
    }
};
const attr = (node, name, type)=>parseAttributeValue(node === null || node === void 0 ? void 0 : node.getAttribute(name), type);
const scopeAttribute = (node, name, type)=>forAncestorsOrSelf(node, (el, value)=>value(attr(el, name, type)));
const attributeNames = (node)=>node === null || node === void 0 ? void 0 : node.getAttributeNames();
const cssProperty = (el, name)=>getComputedStyle(el).getPropertyValue(name) || util.nil;
const tagName = (el)=>el != util.nil ? el.tagName : util.nil;
let pos;
const relativeScrollPos = ()=>(pos = scrollPos(util.F), {
        x: pos.x / (body.offsetWidth - window.innerWidth) || 0,
        y: pos.y / (body.offsetHeight - window.innerHeight) || 0
    });
const scrollPos = (int)=>({
        x: util.round(scrollX, int),
        y: util.round(scrollY, int)
    });
const matchExHash = (href1, href2)=>util.replace(href1, /#.*$/, "") === util.replace(href2, /#.*$/, "");
let screenPos;
const getScreenPos = (el, mouseEvent, includeFold = util.T)=>(screenPos = getPos(el, mouseEvent)) && {
        xpx: screenPos.x,
        ypx: screenPos.y,
        x: util.round(screenPos.x / body.offsetWidth, 4),
        y: util.round(screenPos.y / body.offsetHeight, 4),
        pageFolds: includeFold ? screenPos.y / window.innerHeight : undefined
    };
let x;
let y;
const getPos = (el, mouseEvent)=>{
    return !!(mouseEvent === null || mouseEvent === void 0 ? void 0 : mouseEvent["pointerType"]) && (mouseEvent === null || mouseEvent === void 0 ? void 0 : mouseEvent.pageY) != util.nil ? {
        x: mouseEvent.pageX,
        y: mouseEvent.pageY
    } : el ? ({ x, y } = getRect(el), {
        x,
        y
    }) : undefined;
};
const isVisible = (el)=>{
    if (!el || !el.isConnected || getRect(el, false).width <= 0) return false;
    while(el){
        var _el_ownerDocument_defaultView;
        const style = (_el_ownerDocument_defaultView = el.ownerDocument.defaultView) === null || _el_ownerDocument_defaultView === void 0 ? void 0 : _el_ownerDocument_defaultView.getComputedStyle(el);
        if (style.visibility === "hidden" || style.opacity === "0") {
            return false;
        }
        el = el.parentElement;
    }
    return true;
};
let rect;
const getRect = (el, includeScroll = true)=>el ? (rect = el.getBoundingClientRect(), pos = includeScroll ? scrollPos(util.F) : {
        x: 0,
        y: 0
    }, {
        x: util.round(rect.left + pos.x),
        y: util.round(rect.top + pos.y),
        width: util.round(rect.width),
        height: util.round(rect.height)
    }) : undefined;
const listen = (target, name, listener, options = {
    capture: true,
    passive: true
})=>{
    name = util.array(name);
    return util.createEventBinders(listener, (listener)=>util.forEach(name, (name)=>target.addEventListener(name, listener, options)), (listener)=>util.forEach(name, (name)=>target.removeEventListener(name, listener, options)));
};
const parseDomain = (href)=>{
    const { host, scheme, port } = util.parseUri(href, {
        delimiters: false,
        requireAuthority: true
    });
    return {
        host: host + (port ? ":" + port : ""),
        scheme
    };
};
const getViewport = ()=>(pos = scrollPos(util.T), {
        ...pos,
        width: window.innerWidth,
        height: window.innerHeight,
        totalWidth: body.offsetWidth,
        totalHeight: body.offsetHeight
    });

const boundaryData = new WeakMap();
const getBoundaryData = (el)=>{
    var _boundaryData_get;
    if (el == null) {
        return undefined;
    }
    let data = (_boundaryData_get = boundaryData.get(el)) === null || _boundaryData_get === void 0 ? void 0 : _boundaryData_get.merged;
    if (!data && el.getAttribute && (data = types.normalizeTrackingData(util.parseJson(el.getAttribute("data-tailjs"), true)))) {
        boundaryData.set(el, {
            merged: data,
            layers: new Map([
                [
                    null,
                    data
                ]
            ])
        });
    }
    return data;
};
const updateBoundaryData = (el, data, layer = null, debug = false)=>{
    if (el == null) {
        return;
    }
    let current = boundaryData.get(el);
    if (typeof data === "function") {
        data = data(current === null || current === void 0 ? void 0 : current.merged);
    } else if (data && "clear" in data) {
        boundaryData.delete(el);
        return undefined;
    }
    layer !== null && layer !== void 0 ? layer : layer = data === null || data === void 0 ? void 0 : data.layer;
    const normalized = types.normalizeTrackingData(data);
    if (current) {
        if (util.trySet(current.layers, layer, normalized !== null && normalized !== void 0 ? normalized : undefined)) {
            if (!current.layers.size) {
                boundaryData.delete(el);
                current = undefined;
            } else {
                current.merged = types.appendTrackingData(undefined, util.sort(current.layers.values(), (layer)=>{
                    var _layer_layerPriority;
                    return (_layer_layerPriority = layer.layerPriority) !== null && _layer_layerPriority !== void 0 ? _layer_layerPriority : 0;
                }));
            }
        }
    } else if (normalized) {
        boundaryData.set(el, current = {
            merged: normalized,
            layers: new Map([
                [
                    layer,
                    normalized
                ]
            ])
        });
    }
    flushPropertyCache();
    return current === null || current === void 0 ? void 0 : current.merged;
};
const trackerPropertyName = (name, css = util.F)=>(css ? "--track-" : "data-track-") + name;
/**
 * Extracts an element's tags given an attribute name, and a list of rules about how to match..
 * Since this function is external, its local variables are added as local parameters. Don't tamper.
 *
 * An optional `eligibleCache` can be passed along to speed up rejecting attribute names that definitely don't match anything.
 */ const matchAttributeNames = (el, cached, tags, prefix, value, eligible)=>((cached === null || cached === void 0 ? void 0 : cached[1]) && util.forEach(attributeNames(el), (name)=>{
        var _cached_, _name;
        var _;
        return (_ = (_cached_ = cached[0])[_name = name]) !== null && _ !== void 0 ? _ : _cached_[_name] = (eligible = util.F, util.isString(prefix = // No cache. Let's loop through them then.
        util.forEach(cached[1], ([match, selector, prefix], _)=>util.testRegex(name, match) && // Sneakily we "delete" the eligible flag, so the skipNameCache's `??=` assignment will always be reevaluated.
            // If this code branch is never hit, we return the initial value `false`, and this check will never be performed again.
            // We do this check before the selector check, since this result is not generally cacheable.
            (eligible = undefined, !selector || matchSelector(el, selector)) && util.stop(prefix !== null && prefix !== void 0 ? prefix : name))) && // The empty string is also "true" since it means presence of the attribute without a value (as in `<div tag-yes />).
        (!(value = el.getAttribute(name)) || util.parseBoolean(value)) && (tags = types.collectTags(value, prefix ? {
            prefix: util.replace(prefix, /\-/g, ":")
        } : undefined, tags)), eligible);
    }), tags);
// We cache the tracker configuration's rules for tag mappings.
let cachedTagMapper;
let cachedMappings;
const parseTagAttributes = (el, tags)=>{
    if (cachedMappings === (cachedMappings = trackerConfig.tags)) {
        return cachedTagMapper(el, tags);
    }
    const parse = (rule)=>!rule ? [] : util.isRegEx(rule) ? [
            [
                rule
            ]
        ] : util.isIterable(rule) ? util.flatMap(rule, parse, 1) : [
            util.isPlainObject(rule) ? [
                util.parseRegex(rule.match),
                rule.selector,
                rule.prefix
            ] : [
                util.parseRegex(rule)
            ]
        ], cache = [
        {},
        // Start by checking whether we have any of the good ol', documented, "tail.js official" tag attributes.
        [
            [
                /^(?:track\-)?tags?(?:$|\-)(.*)/
            ],
            ...parse(util.flatMap(cachedMappings, ([, value])=>value, 1))
        ]
    ];
    return (cachedTagMapper = (el, tags)=>matchAttributeNames(el, cache, tags))(el, tags);
};
const cssPropertyWithBase = (el, name)=>util.join(util.concat(cssProperty(el, trackerPropertyName(name, util.T)), cssProperty(el, trackerPropertyName("base-" + name, util.T))), " ");
// We cannot cache as broadly for CSS based rules, so we cache per selector instead.
const parsedCssRules = {};
const parseCssMappingRules = (el, tags, rulesString = cssPropertyWithBase(el, "attributes"))=>{
    var _parsedCssRules, _rulesString;
    var _;
    rulesString && matchAttributeNames(el, (_ = (_parsedCssRules = parsedCssRules)[_rulesString = rulesString]) !== null && _ !== void 0 ? _ : _parsedCssRules[_rulesString] = [
        {},
        util.matches(rulesString, /(?:(\S+)\:\s*)?(?:\((\S+)\)|([^\s,:]+))\s*(?!\S*\:)/g, (_, prefix, rule1, rule2)=>[
                util.parseRegex(rule1 || rule2),
                ,
                prefix
            ])
    ], tags);
    return tags = types.collectTags(cssPropertyWithBase(el, "tags"), undefined, tags);
};
let currentBoundaryData;
let boundaryDataValue;
let trackerPropertyCache = new WeakMap();
setInterval(()=>flushPropertyCache, 500); // Flush cache.
const flushPropertyCache = ()=>trackerPropertyCache = new WeakMap();
let propertyValue;
const trackerFlag = (el, name, inherit = util.F, boundaryData)=>(propertyValue = trackerProperty(el, name, inherit, boundaryData)) === "" || (propertyValue == util.nil ? undefined : util.parseBoolean(propertyValue));
const trackerProperty = (el, name, inherit = util.F, boundaryData)=>{
    var _trackerPropertyCache_get;
    if (!el) {
        return undefined;
    }
    let cached = (_trackerPropertyCache_get = trackerPropertyCache.get(el)) === null || _trackerPropertyCache_get === void 0 ? void 0 : _trackerPropertyCache_get[+inherit].get(name);
    if (cached) {
        return cached.value;
    }
    return util.set(util.get(trackerPropertyCache, el, ()=>[
            new Map(),
            new Map()
        ])[+inherit], name, cached = {
        value: boundaryData && (currentBoundaryData = getBoundaryData(el)) && (boundaryDataValue = boundaryData(currentBoundaryData)) != null ? boundaryDataValue : (inherit ? forAncestorsOrSelf(el, (el, r)=>r(trackerProperty(el, name, util.F, boundaryData)), util.isFunction(inherit) ? inherit : undefined) : attr(el, trackerPropertyName(name)) || cssProperty(el, trackerPropertyName(name, util.T))) || undefined
    }).value;
};
const getBoundaryTags = (sourceEl, eventType, tags)=>{
    if (sourceEl) {
        const parentStack = [];
        // Initialize element stack, so we can process it top/down.
        // This is required for tags from deeper levels to override values.
        forAncestorsOrSelf(sourceEl, (el)=>parentStack.unshift(el));
        tags = parseCssMappingRules(sourceEl, tags);
        util.forEach(parentStack, (el)=>{
            var _getBoundaryData;
            tags = types.collectTags((_getBoundaryData = getBoundaryData(el)) === null || _getBoundaryData === void 0 ? void 0 : _getBoundaryData.tags, undefined, tags = parseTagAttributes(el, tags));
        });
        if (tags === null || tags === void 0 ? void 0 : tags.length) {
            return {
                tags: types.uniqueTags(tags, eventType)
            };
        }
    }
    return {};
};

const isTracker = "__isTracker";
const trackerConfig = {
    name: "tail",
    src: "/_t.js",
    disabled: false,
    postEvents: true,
    postFrequency: 2000,
    requestTimeout: 5000,
    encryptionKey: null,
    key: null,
    apiKey: null,
    json: false,
    /**
   * Log events to the browser's developer console.
   */ impressionThreshold: 1000,
    captureContextMenu: true,
    tags: {
        default: [
            "data-id",
            "data-name"
        ]
    },
    defaultTracking: {
        clicks: true,
        disable: false,
        formFields: {
            values: "checkbox-only",
            privacy: "anonymous"
        },
        forms: true,
        impressions: false,
        region: false
    }
};

var _parseUri;
const ERR_INVALID_COMMAND = "invalid-command";
const ERR_INTERNAL_ERROR = "internal-error";
const src = util.split("" + doc.currentScript["src"], "#");
const args = util.split("" + (src[1] || ""), ";");
const SCRIPT_SRC = src[0];
const TRACKER_DOMAIN = args[1] || ((_parseUri = util.parseUri(SCRIPT_SRC, {
    delimiters: false
})) === null || _parseUri === void 0 ? void 0 : _parseUri.host);
const isInternalUrl = (url)=>{
    var _parseUri_host, _parseUri;
    return !!(TRACKER_DOMAIN && ((_parseUri = util.parseUri(url, {
        delimiters: false
    })) === null || _parseUri === void 0 ? void 0 : (_parseUri_host = _parseUri.host) === null || _parseUri_host === void 0 ? void 0 : _parseUri_host.endsWith(TRACKER_DOMAIN)) === util.T);
};
const mapUrl = (...urlParts)=>util.replace(util.join(urlParts), /(^(?=\?))|(^\.(?=\/))/, SCRIPT_SRC.split("?")[0]);
const VAR_URL = mapUrl("?", EVENT_HUB_QUERY);
const MNT_URL = mapUrl("?", CONTEXT_NAV_QUERY);
mapUrl("?", VARIABLES_QUERY);
const groupValue = Symbol();
const childGroups = Symbol();
const debug = (value, group, collapsed = util.T, nested = util.F)=>{
    group && (collapsed ? console.groupCollapsed : console.group)((nested ? "" : util.ansi("tail.js: ", "90;3")) + group);
    const children = value === null || value === void 0 ? void 0 : value[childGroups];
    children && (value = value[groupValue]);
    value != null && console.log(util.isObject(value) ? util.ansi(transport.jsonEncode(value), "94") : //   ? prettyPrint(value).join("")
    //   : JSON.stringify(value, null, 2)
    util.isFunction(value) ? "" + value : value);
    children && children.forEach(([value, group, collapsed])=>debug(value, group, collapsed, true));
    group && console.groupEnd();
};

const [httpEncode, httpDecode] = transport.createTransport();
let [httpEncrypt, httpDecrypt] = [
    NOT_INITIALIZED,
    NOT_INITIALIZED
];
let USE_ENCRYPTION = true;
const [addEncryptionNegotiatedListener, dispatchEncryptionNegotiated] = util.createEvent();
const setStorageKey = (key)=>{
    if (httpDecrypt !== NOT_INITIALIZED) return;
    [httpEncrypt, httpDecrypt] = transport.createTransport(key, {
        json: !key,
        prettify: false
    });
    USE_ENCRYPTION = !!key;
    dispatchEncryptionNegotiated(httpEncrypt, httpDecrypt);
};

const errorLogger = (source)=>(error)=>logError(source, error);
const logError = (...args)=>{
    let source = args.shift();
    let message;
    if (args[1] instanceof Error) {
        message = args[1].message;
    } else {
        var _args_;
        var _args__message;
        message = util.isString(args[1]) ? args.shift() : (_args__message = (_args_ = args[1]) === null || _args_ === void 0 ? void 0 : _args_.message) !== null && _args__message !== void 0 ? _args__message : "An error occurred";
    }
    var _source_id;
    console.error(message, (_source_id = source.id) !== null && _source_id !== void 0 ? _source_id : source, ...args);
};

const [addPageLoadedListener, dispatchPageLoaded] = util.createEvent();
const [addPageVisibleListener, dispatchPageVisible] = util.createEvent();
const maybeDispatchPageLoaded = (newLoaded)=>loaded !== (loaded = newLoaded) && dispatchPageLoaded(loaded, sleepTimer(true, true));
const maybeDispatchPageVisible = (loaded)=>visible !== (visible = loaded ? document.visibilityState === "visible" : false) && dispatchPageVisible(visible, !loaded, visibleTimer(true, true));
// A visibilitychange event may not be triggered if the page BF cache loads/unloads.
addPageLoadedListener(maybeDispatchPageVisible);
let loaded = true;
let visible = false;
let visibleTimer = util.createTimer(false);
let sleepTimer = util.createTimer(false);
listen(window, [
    "pagehide",
    "freeze",
    "beforeunload"
], ()=>maybeDispatchPageLoaded(false));
listen(window, [
    "pageshow",
    "resume"
], ()=>maybeDispatchPageLoaded(true));
listen(document, "visibilitychange", ()=>(maybeDispatchPageVisible(true), visible && maybeDispatchPageLoaded(true)));
dispatchPageLoaded(loaded, sleepTimer(true, true));
let activated = false;
let activeTime = util.createTimer(false);
const [addPageActivatedListener, dispatchPageActivated] = util.createEvent();
const activationTimeout = util.clock({
    callback: ()=>activated && dispatchPageActivated(activated = false, activeTime(false)),
    frequency: 20000,
    once: true,
    paused: true
});
const setActivated = ()=>!activated && (dispatchPageActivated(activated = true, activeTime(true)), activationTimeout.restart());
listen(window, [
    "focus",
    "scroll"
], setActivated);
listen(window, "blur", ()=>activationTimeout.trigger());
util.waitFor(()=>document.body, (body)=>{
    // Document's BODY might not be available immediately when the script load.
    listen(body, [
        "keydown",
        "pointerdown",
        "pointermove",
        "scroll"
    ], setActivated);
    setActivated();
});
const getActiveTime = ()=>activeTime();

let localId = 0;
let TAB_ID = undefined;
const nextId = ()=>(TAB_ID !== null && TAB_ID !== void 0 ? TAB_ID : NOT_INITIALIZED()) + "_" + nextLocalId();
const nextLocalId = ()=>(util.now(true) - (parseInt(TAB_ID.slice(0, -2), 36) || 0)).toString(36) + "_" + (++localId).toString(36);
const randomValues = (arg)=>crypto.getRandomValues(arg);
const uuidv4 = ()=>util.replace([
        1e7
    ] + -1e3 + -4e3 + -8e3 + -1e11, /[018]/g, (c)=>(c *= 1, (c ^ randomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)));
/** All variables, both local and others. */ let tabVariables = new Map();
const tabState = {
    id: TAB_ID,
    heartbeat: util.now()
};
const state = {
    knownTabs: new Map([
        [
            TAB_ID,
            tabState
        ]
    ]),
    variables: new Map()
};
const [addStateListener, dispatchState] = util.createEvent();
const [addVariablesChangedListener, dispatchVariablesChanged] = util.createEvent();
let post = NOT_INITIALIZED;
const tryGetVariable = (key, timestamp = util.now())=>{
    const variable = tabVariables.get(util.isString(key) ? key : variableKeyToString(key));
    return (variable === null || variable === void 0 ? void 0 : variable.cache) && variable.cache[0] + variable.cache[1] <= timestamp ? undefined : variable;
};
const setLocalVariables = (...variables)=>{
    const timestamp = util.now();
    return updateVariableState(util.map(variables, (variable)=>{
        variable.cache = [
            timestamp
        ];
        return [
            types.extractKey(variable),
            {
                ...variable,
                created: timestamp,
                modified: timestamp,
                version: "0"
            }
        ];
    }));
};
const getVariableChanges = (variables)=>{
    var _map;
    return (_map = util.map(variables, (current)=>{
        if (!current) return util.skip;
        const key = variableKeyToString(current[0]);
        const previous = tabVariables.get(key);
        return previous !== current[1] ? [
            key,
            current[1],
            previous,
            current[0]
        ] : util.skip;
    })) !== null && _map !== void 0 ? _map : [];
};
const updateVariableState = (updates)=>{
    // Collect now before updating the state, but dispatch after the state has changed.
    const changes = getVariableChanges(updates);
    if (!(changes === null || changes === void 0 ? void 0 : changes.length)) return;
    const timestamp = util.now();
    util.forEach(changes, ([, current, previous])=>{
        if (current && !current.cache) {
            var _previous_cache;
            current.cache = (_previous_cache = previous === null || previous === void 0 ? void 0 : previous.cache) !== null && _previous_cache !== void 0 ? _previous_cache : [
                timestamp,
                VARIABLE_CACHE_DURATION
            ];
        }
    });
    util.assign(tabVariables, changes);
    const sharedChanges = util.filter(changes, ([, , , key])=>anyVariableScope.compare(key.scope, "tab") > 0);
    if (sharedChanges.length) {
        post({
            type: "patch",
            payload: util.obj(sharedChanges)
        });
    }
    dispatchVariablesChanged(util.map(changes, ([, current, previous, key])=>[
            key,
            current,
            previous
        ]), tabVariables, true);
};
addEncryptionNegotiatedListener((httpEncrypt, httpDecrypt)=>{
    // Keep tab ID and variables between pages in the same tab.
    addPageLoadedListener((loaded)=>{
        if (loaded) {
            const localState = httpDecrypt(sessionStorage.getItem(CLIENT_STATE_CHANNEL_ID));
            sessionStorage.removeItem(CLIENT_STATE_CHANNEL_ID);
            var _localState_;
            TAB_ID = (_localState_ = localState === null || localState === void 0 ? void 0 : localState[0]) !== null && _localState_ !== void 0 ? _localState_ : util.now(true).toString(36) + Math.trunc(1296 * Math.random()).toString(36).padStart(2, "0");
            tabVariables = new Map(util.concat(util.filter(tabVariables, ([, variable])=>(variable === null || variable === void 0 ? void 0 : variable.scope) === "view"), util.map(localState === null || localState === void 0 ? void 0 : localState[1], (variable)=>[
                    variableKeyToString(variable),
                    variable
                ])));
        } else {
            sessionStorage.setItem(CLIENT_STATE_CHANNEL_ID, httpEncrypt([
                TAB_ID,
                util.map(tabVariables, ([, variable])=>variable && variable.scope !== "view" ? variable : util.skip)
            ]));
        }
    }, true);
    post = (message, target)=>{
        if (!httpEncrypt) return;
        localStorage.setItem(CLIENT_STATE_CHANNEL_ID, httpEncrypt([
            TAB_ID,
            message,
            target
        ]));
        localStorage.removeItem(CLIENT_STATE_CHANNEL_ID);
    };
    listen(window, "storage", (ev)=>{
        if (ev.key === CLIENT_STATE_CHANNEL_ID) {
            const message = httpDecrypt === null || httpDecrypt === void 0 ? void 0 : httpDecrypt(ev.newValue);
            if (!message || message[2] && message[2] !== TAB_ID) return;
            const [sender, { type, payload }] = message;
            if (type === "query") {
                !initTimeout.active && post({
                    type: "set",
                    payload: [
                        util.map(state.knownTabs),
                        util.map(state.variables)
                    ]
                }, sender);
            } else if (type === "set" && initTimeout.active) {
                state.knownTabs = new Map(payload[0]);
                state.variables = new Map(payload[1]);
                tabVariables = new Map(payload[1]);
                initTimeout.trigger();
            } else if (type === "patch") {
                // Collect now before updating the state, but dispatch after the state has changed.
                const changedEventData = getVariableChanges(util.map(payload, ([key, value])=>[
                        stringToVariableKey(key),
                        value
                    ]));
                util.assign(state.variables, payload);
                util.assign(tabVariables, payload);
                dispatchVariablesChanged(util.map(changedEventData, ([, current, previous, key])=>[
                        key,
                        current,
                        previous
                    ]), tabVariables, false);
            } else if (type === "tab") {
                util.set(state.knownTabs, sender, payload);
                payload && dispatchState("tab", payload, false);
            }
        }
    });
    // Add a short delay to allow other tabs to share their information (if any).
    const initTimeout = util.clock(()=>// We're not ready before the body tag has parsed by the browser.
        util.waitFor(()=>document.body, ()=>dispatchState("ready", state, true)), -25);
    const heartbeat = util.clock({
        callback: ()=>{
            const timeout = util.now() - HEARTBEAT_FREQUENCY * 2;
            util.forEach(state.knownTabs, // Remove tabs that no longer responds (presumably closed but may also have been frozen).
            ([tabId, tabState])=>tabState[0] < timeout && util.set(state.knownTabs, tabId, undefined));
            tabState.heartbeat = util.now();
            post({
                type: "tab",
                payload: tabState
            });
        },
        frequency: HEARTBEAT_FREQUENCY,
        paused: true
    });
    const toggleTab = (loading)=>{
        post({
            type: "tab",
            payload: loading ? tabState : undefined
        });
        if (loading) {
            initTimeout.restart();
            post({
                type: "query"
            });
        } else {
            initTimeout.toggle(false);
        }
        heartbeat.toggle(loading);
    };
    addPageLoadedListener((loaded)=>toggleTab(loaded), true);
}, true);

/**
 * A lock that is shared between all tabs.
 * It would seem tempting to use the browser's native LockManager, yet that disables bf_cache, so we don't.
 */ const sharedLock = (lockId, { timeout = 1000, encrypt = true, retries: defaultRetries = 50 } = {})=>{
    const get = ()=>(encrypt ? httpDecrypt : httpDecode)(localStorage.getItem(lockId));
    let intervalId = 0;
    const renew = ()=>localStorage.setItem(lockId, (encrypt ? httpEncrypt : httpEncode)([
            TAB_ID,
            util.now() + timeout
        ]));
    return async (action, localTimeout, retries = localTimeout != null ? 1 : defaultRetries)=>{
        while(retries--){
            let current = get();
            if (!current || current[1] < util.now()) {
                var _get;
                renew();
                if (((_get = get()) === null || _get === void 0 ? void 0 : _get[0]) === TAB_ID) {
                    // Keep lock alive while the action executes.
                    timeout > 0 && (intervalId = setInterval(()=>renew(), timeout / 2));
                    return await util.tryCatchAsync(action, true, ()=>{
                        clearInterval(intervalId);
                        localStorage.removeItem(lockId);
                    });
                }
            }
            let waitHandle = util.promise();
            const [unbind] = listen(window, "storage", (ev)=>{
                if (ev.key === lockId && !ev.newValue) {
                    waitHandle.resolve();
                }
            });
            await util.race(util.delay(localTimeout !== null && localTimeout !== void 0 ? localTimeout : timeout), waitHandle);
            unbind();
        }
        localTimeout == null && util.throwError(lockId + " could not be acquired.");
    };
};

const [addRequestHandler, dispatchRequest] = util.createEvent();
const [addResponseHandler, dispatchResponse] = util.createEvent();
const requestLock = sharedLock(REQUEST_LOCK_KEY);
const request = async (url, data, { beacon = false, encrypt = true } = {})=>{
    encrypt = encrypt && USE_ENCRYPTION;
    let cancel = false;
    let currentData;
    let serialized;
    const prepareRequestData = (retry)=>{
        const prepareResult = util.isFunction(data) ? data === null || data === void 0 ? void 0 : data(currentData, retry) : data;
        if (prepareResult === false) {
            return false;
        }
        prepareResult != null && prepareResult !== true && (currentData = prepareResult);
        dispatchRequest(url, currentData, retry, (newData)=>(cancel = currentData === util.undefined, currentData = newData));
        const payload = cancel ? false : serialized = encrypt ? httpEncrypt(currentData, true) : JSON.stringify(currentData);
        return payload && payload.length ? payload : false;
    };
    if (beacon) {
        if (!prepareRequestData(0)) return;
        !navigator.sendBeacon(url, new Blob(currentData != null ? [
            serialized
        ] : [], {
            // This content type avoids the overhead of the "preflight" request that is otherwise made by browsers in cross-domain scenarios.
            // (application/x-www-form-urlencoded could also work).
            type: "text/plain; charset=iso-8859-1"
        })) && util.throwError("Beacon send failed.");
    } else {
        let retries = 1;
        return await requestLock(()=>util.forEachAwait(1, async (retry)=>{
                var _this;
                if (!prepareRequestData(retry)) return util.stop;
                const response = await fetch(url, {
                    method: currentData != null ? "POST" : "GET",
                    cache: "no-cache",
                    credentials: "include",
                    mode: "cors",
                    headers: {
                        "Content-Type": "text/plain; charset=iso-8859-1"
                    },
                    body: serialized
                });
                if (response.status >= 400) {
                    return retry === retries - 1 ? util.stop(util.throwError(`Invalid response: ${await response.text()}`)) : (console.warn(`Request to ${url} failed on attempt ${retry + 1}/${3}.`), await util.delay((1 + retry) * 200));
                }
                const body = encrypt ? new Uint8Array(await response.arrayBuffer()) : await response.text();
                const parsed = (body === null || body === void 0 ? void 0 : body.length) ? (_this = encrypt ? httpDecrypt : JSON.parse) === null || _this === void 0 ? void 0 : _this(body) : util.undefined;
                if (parsed != null) {
                    dispatchResponse(parsed);
                }
                return util.stop(parsed);
            }));
    }
};

function scanAttributes(attributeName, references) {
    if (!references) return [];
    const commands = [];
    const seen = new Set();
    document.querySelectorAll(`[${attributeName}]`).forEach((el)=>{
        if (seen.has(el)) {
            return;
        }
        const stack = [];
        while(attr(el, attributeName) != util.nil){
            util.add(seen, el);
            const delta = util.split(attr(el, attributeName), "|");
            attr(el, attributeName, util.nil);
            for(let i = 0; i < delta.length; i++){
                let item = delta[i];
                if (item === "") {
                    continue; // If the attribute starts with "|" it means "keep stack". Splitting the array on "|" will give an empty item.
                }
                var _toString;
                const number = item === "-" ? -1 : parseInt((_toString = util.toString(item)) !== null && _toString !== void 0 ? _toString : "", 36);
                if (number < 0) {
                    stack.length += number;
                    continue;
                } else if (i === 0) {
                    stack.length = 0; // The first item has a value to replace the stack since not preceded by neither "|" nor a negative number (pop).
                }
                if (isNaN(number) && /^["\[{]/.test(item)) {
                    // Poor man's parser. If the JSON contains '|'s keep going until it works.
                    let json = "";
                    for(; i < delta.length; i++){
                        try {
                            item = JSON.parse(json += delta[i]);
                            break;
                        } catch (e) {}
                    }
                }
                if (number >= 0 && references[number]) {
                    item = references[number];
                }
                util.push(stack, item);
            }
            util.push(commands, ...util.map(stack, (data)=>({
                    add: util.T,
                    ...data,
                    boundary: el
                })));
            const next = el.nextElementSibling; // Ignore TS null error.
            if (el.tagName === "WBR") {
                var _el_parentNode;
                (_el_parentNode = el.parentNode) === null || _el_parentNode === void 0 ? void 0 : _el_parentNode.removeChild(el);
            }
            el = next;
        }
    });
    return commands;
}

const KEY_PROPS = [
    "scope",
    "key",
    "entityId",
    "source"
];
const GETTER_REQUEST_PROPS = [
    ...KEY_PROPS,
    "purpose",
    "ifModifiedSince",
    "ifNoneMatch",
    "passive"
];
const SETTER_REQUEST_PROPS = [
    ...KEY_PROPS,
    "value",
    "force",
    "ttl",
    "version"
];
const callbackSourceSymbol = Symbol();
const activeCallbacks = new Map();
const createVariableStorage = (endpoint, context)=>{
    const pollVariables = util.clock(async ()=>{
        const getters = util.map(activeCallbacks, ([key, callbacks])=>// Only request the variable if one or more callbacks originally requested the variable to be refreshed.
            util.some(callbacks, (callback)=>{
                var _callback_callbackSourceSymbol;
                return (_callback_callbackSourceSymbol = callback[callbackSourceSymbol]) === null || _callback_callbackSourceSymbol === void 0 ? void 0 : _callback_callbackSourceSymbol.refresh;
            }) ? {
                ...stringToVariableKey(key),
                refresh: true
            } : util.skip);
        getters.length && await vars.get(getters);
    }, VARIABLE_POLL_FREQUENCY);
    const registerCallback = (mappedKey, callback)=>callback && !!util.get(activeCallbacks, mappedKey, ()=>new Set()).add(callback);
    const invokeCallbacks = (result)=>{
        if (!result) return;
        const key = variableKeyToString(result);
        const callbacks = util.remove(activeCallbacks, key);
        if (!(callbacks === null || callbacks === void 0 ? void 0 : callbacks.size)) return;
        util.forEach(callbacks, (callback)=>callback(result) === true && registerCallback(key, callback));
    };
    addPageLoadedListener((loaded, stateDuration)=>pollVariables.toggle(loaded, loaded && stateDuration >= VARIABLE_POLL_FREQUENCY), true);
    addVariablesChangedListener((changes)=>util.forEach(changes, ([key, current])=>{
            if (current === null || current === void 0 ? void 0 : current.passive) {
                delete current.passive;
                return;
            }
            invokeCallbacks(current ? {
                status: types.VariableResultStatus.Success,
                ...current
            } : {
                status: types.VariableResultStatus.NotFound,
                ...key
            });
        }));
    const registerPollCallback = (source, callback)=>{
        callback[callbackSourceSymbol] = source;
        return registerCallback(variableKeyToString(source), callback);
    };
    const vars = {
        get: (getters)=>types.toVariableResultPromise("get", getters, async (getters)=>{
                var _variables, _this;
                let key;
                if (!getters[0] || util.isString(getters[0])) {
                    key = getters[0];
                    getters = getters.slice(1);
                }
                context === null || context === void 0 ? void 0 : context.validateKey(key);
                const results = new Map();
                const newLocal = [];
                const requestGetters = util.map(getters, (getter)=>{
                    var _current_schema;
                    const key = variableKeyToString(getter);
                    const current = tryGetVariable(key);
                    const purpose = getter.purpose;
                    if (purpose && (current === null || current === void 0 ? void 0 : (_current_schema = current.schema) === null || _current_schema === void 0 ? void 0 : _current_schema.usage.purposes[purpose]) !== true) {
                        results.set(getter, {
                            ...getter,
                            status: types.VariableResultStatus.Forbidden,
                            error: `No consent for '${purpose}'.`
                        });
                    } else if (!getter.refresh && current) {
                        results.set(getter, {
                            status: types.VariableResultStatus.Success,
                            ...current
                        });
                    } else if (isLocalScopeKey(getter)) {
                        var _getter_init;
                        const value = (_getter_init = getter.init) === null || _getter_init === void 0 ? void 0 : _getter_init.call(getter);
                        if (value) {
                            var _getter_ttl;
                            const local = {
                                ...types.extractKey(getter),
                                version: "1",
                                created: timestamp,
                                modified: timestamp,
                                value: value,
                                cache: [
                                    timestamp,
                                    (_getter_ttl = getter.ttl) !== null && _getter_ttl !== void 0 ? _getter_ttl : current === null || current === void 0 ? void 0 : current.ttl
                                ]
                            };
                            util.push(newLocal, [
                                types.extractKey(local),
                                local
                            ]);
                            results.set(getter, {
                                status: types.VariableResultStatus.Success,
                                ...local
                            });
                        } else {
                            results.set(getter, {
                                status: types.VariableResultStatus.NotFound,
                                ...types.extractKey(getter)
                            });
                        }
                    } else {
                        return [
                            util.pick(getter, GETTER_REQUEST_PROPS),
                            getter
                        ];
                    }
                    return util.skip;
                });
                util.forEach(results, ([getter, result])=>{
                    if (getter.poll) {
                        const callback = types.createPollCallback(getter, result);
                        const pollingCallback = async (result)=>await callback(result) === true && (registerPollCallback === null || registerPollCallback === void 0 ? void 0 : registerPollCallback(getter, pollingCallback));
                        pollingCallback(result);
                    }
                });
                const timestamp = util.now();
                const response = requestGetters.length && ((_this = await request(endpoint, {
                    variables: {
                        get: util.map(requestGetters, ([getter])=>getter)
                    },
                    deviceSessionId: context === null || context === void 0 ? void 0 : context.deviceSessionId
                })) === null || _this === void 0 ? void 0 : (_variables = _this.variables) === null || _variables === void 0 ? void 0 : _variables.get) || [];
                const initSetters = [];
                util.forEach(response, (result, i)=>{
                    const getter = requestGetters[i][1];
                    if ((result === null || result === void 0 ? void 0 : result.status) === types.VariableResultStatus.NotFound && getter.init) {
                        const initValue = getter.init();
                        if (initValue != null) {
                            initSetters.push([
                                getter,
                                {
                                    ...types.extractKey(getter),
                                    value: initValue
                                }
                            ]);
                        }
                    } else {
                        results.set(requestGetters[i][1], maskEntityId(result));
                    }
                });
                if (initSetters.length) {
                    util.forEach(await vars.set(util.map(initSetters, ([, setter])=>setter)).all(), (result, i)=>{
                        return results.set(initSetters[i][0], maskEntityId(result.status === types.VariableResultStatus.Conflict ? {
                            ...result,
                            status: types.VariableResultStatus.Success
                        } : result.status === types.VariableResultStatus.Success && result.value == null ? {
                            ...result,
                            status: types.VariableResultStatus.NotFound
                        } : result));
                    });
                }
                if (newLocal.length) {
                    // Update state first before invoking getter callbacks,
                    // since polling callbacks only get success or not found results.
                    //
                    // The actual result must be used for the callback first time it is called.
                    updateVariableState(newLocal);
                }
                return results;
            }, {
                poll: registerPollCallback,
                logCallbackError: (message, operation, error)=>logError("Variables.get", message, {
                        operation,
                        error
                    })
            }),
        set: (setters)=>types.toVariableResultPromise("set", setters, async (setters)=>{
                let key;
                if (!setters[0] || util.isString(setters[0])) {
                    key = setters[0];
                    setters = setters.slice(1);
                }
                context === null || context === void 0 ? void 0 : context.validateKey(key);
                const localResults = [];
                const results = new Map();
                const timestamp = util.now();
                let pendingPatches = [];
                // Only request non-null setters, and use the most recent version we have already read, if any.
                const requestVariables = util.map(setters, (setter)=>{
                    const key = variableKeyToString(setter);
                    const current = tryGetVariable(key);
                    if (isLocalScopeKey(setter)) {
                        const value = setter.patch ? setter.patch(current === null || current === void 0 ? void 0 : current.value) : setter.value;
                        if ((current === null || current === void 0 ? void 0 : current.value) != null && (value === (current === null || current === void 0 ? void 0 : current.value) || util.structuralEquals(value, current === null || current === void 0 ? void 0 : current.value))) {
                            return util.skip;
                        }
                        var _current_created;
                        let local = value == null ? undefined : {
                            ...types.extractKey(setter),
                            created: (_current_created = current === null || current === void 0 ? void 0 : current.created) !== null && _current_created !== void 0 ? _current_created : timestamp,
                            modified: timestamp,
                            version: (current === null || current === void 0 ? void 0 : current.version) ? "" + (parseInt(current.version) + 1) : "1",
                            scope: setter.scope,
                            key: setter.key,
                            value,
                            cache: [
                                timestamp,
                                setter.ttl
                            ]
                        };
                        if (local) {
                            var _setter_ttl;
                            local.cache = [
                                timestamp,
                                (_setter_ttl = setter.ttl) !== null && _setter_ttl !== void 0 ? _setter_ttl : VARIABLE_CACHE_DURATION
                            ];
                        }
                        results.set(setter, !local ? {
                            status: types.VariableResultStatus.Success,
                            ...types.extractKey(setter)
                        } : {
                            status: current ? types.VariableResultStatus.Success : types.VariableResultStatus.Created,
                            ...local
                        });
                        util.push(localResults, [
                            types.extractKey(setter),
                            local
                        ]);
                        return util.skip;
                    }
                    if (setter.patch) {
                        pendingPatches.push(setter);
                        return util.skip;
                    }
                    if ((setter === null || setter === void 0 ? void 0 : setter.version) === undefined) {
                        setter.version = current === null || current === void 0 ? void 0 : current.version;
                    }
                    return [
                        util.pick(setter, SETTER_REQUEST_PROPS),
                        setter
                    ];
                });
                let attempts = 0;
                while(!attempts++ || pendingPatches.length){
                    var _variables;
                    const current = await vars.get(util.map(pendingPatches, (patch)=>types.extractKey(patch))).all();
                    util.forEach(current, (result, i)=>{
                        const setter = pendingPatches[i];
                        if (types.isSuccessResult(result, false)) {
                            util.push(requestVariables, [
                                {
                                    ...setter,
                                    patch: undefined,
                                    value: pendingPatches[i].patch(result === null || result === void 0 ? void 0 : result.value),
                                    version: result.version
                                },
                                setter
                            ]);
                        } else {
                            results.set(setter, result);
                        }
                    });
                    pendingPatches = [];
                    const response = !requestVariables.length ? [] : util.required((_variables = (await request(endpoint, {
                        variables: {
                            set: util.map(requestVariables, ([setter])=>setter)
                        },
                        deviceSessionId: context === null || context === void 0 ? void 0 : context.deviceSessionId
                    })).variables) === null || _variables === void 0 ? void 0 : _variables.set, "No result.");
                    util.forEach(response, (result, index)=>{
                        const [, setter] = requestVariables[index];
                        if (attempts <= 3 && setter.patch && ((result === null || result === void 0 ? void 0 : result.status) === types.VariableResultStatus.Conflict || (result === null || result === void 0 ? void 0 : result.status) === types.VariableResultStatus.NotFound)) {
                            util.push(pendingPatches, setter);
                            return;
                        }
                        results.set(setter, maskEntityId(result));
                    });
                }
                if (localResults.length) {
                    updateVariableState(localResults);
                }
                return results;
            }, {
                logCallbackError: (message, operation, error)=>logError("Variables.set", message, {
                        operation,
                        error
                    })
            })
    };
    addResponseHandler(({ variables })=>{
        if (!variables) return;
        const changed = util.concat(util.map(variables.get, (result)=>types.isVariableResult(result) ? result : util.skip), util.map(variables.set, (result)=>types.isSuccessResult(result) ? result : util.skip));
        (changed === null || changed === void 0 ? void 0 : changed.length) && updateVariableState(util.map(changed, (result)=>[
                types.extractKey(result),
                types.isSuccessResult(result) ? result : undefined
            ]));
    });
    return vars;
};

var _ev, _postCallbacks;
const postCallbacks = Symbol();
const registerPostCallback = (ev, callback)=>{
    var _;
    return ((_ = (_ev = ev)[_postCallbacks = postCallbacks]) !== null && _ !== void 0 ? _ : _ev[_postCallbacks] = new Set()).add(callback), ev;
};
const createEventQueue = (url, context, postFrequency = EVENT_POST_FREQUENCY)=>{
    const queue = [];
    const snapshots = new WeakMap();
    const patchSources = new Map();
    const mapPatchTarget = (sourceEvent, patch)=>{
        var _sourceEvent_metadata;
        return !((_sourceEvent_metadata = sourceEvent.metadata) === null || _sourceEvent_metadata === void 0 ? void 0 : _sourceEvent_metadata.queued) ? util.throwError("Source event not queued.") : util.merge(patch, {
            type: sourceEvent.type + PATCH_EVENT_POSTFIX,
            patchTargetId: sourceEvent.clientId
        });
    };
    const updateSnapshot = (ev)=>{
        snapshots.set(ev, util.clone(ev));
    };
    const registerEventPatchSource = (sourceEvent, source, initialPost = false, relatedNode)=>{
        if (initialPost) {
            post(sourceEvent);
        }
        let unbinding = false;
        const unbind = ()=>{
            unbinding = true;
        };
        updateSnapshot(sourceEvent);
        registerPostCallback(sourceEvent, updateSnapshot);
        const factory = ()=>{
            if ((relatedNode === null || relatedNode === void 0 ? void 0 : relatedNode.isConnected) === false) {
                unbind();
            } else {
                const snapshot = snapshots.get(sourceEvent);
                const patched = source(snapshot, unbind);
                var _diff;
                //debug({ diff: { snapshot, patched } }, "Patch " + snapshot.type);
                let [delta, current] = (_diff = util.diff(patched, snapshot)) !== null && _diff !== void 0 ? _diff : [];
                if (delta && !util.structuralEquals(current, snapshot)) {
                    // The new "current" differs from the previous.
                    snapshots.set(sourceEvent, util.clone(current));
                    // Add patch target ID and the correct event type to the delta data before we return it.
                    return [
                        mapPatchTarget(sourceEvent, delta),
                        unbinding
                    ];
                }
            }
            return [
                undefined,
                unbinding
            ];
        };
        util.get(patchSources, sourceEvent, ()=>new Set()).add(factory);
        return unbind;
    };
    const postEvents = async (events, beacon = true, variables)=>{
        let key;
        if (!events[0] || util.isString(events[0])) {
            key = events[0];
            events = events.slice(1);
        }
        events = util.map(events, (ev)=>{
            context === null || context === void 0 ? void 0 : context.validateKey(key !== null && key !== void 0 ? key : ev.key);
            // Update metadata in the source event,
            // and send a clone of the event without client metadata, and its timestamp in relative time
            // (the server expects this, and will adjust accordingly to its own time).
            util.merge(ev, {
                metadata: {
                    posted: true
                }
            });
            if (ev[postCallbacks]) {
                const abort = util.forEach(ev[postCallbacks], (callback, _, abort)=>callback(ev) === false || abort, false);
                if (abort) {
                    return undefined;
                }
                delete ev[postCallbacks];
            }
            return util.merge(types.clearMetadata(util.clone(ev), true), {
                timestamp: ev.timestamp - util.now()
            });
        });
        debug({
            [childGroups]: util.map(events, (ev)=>[
                    ev,
                    ev.type,
                    util.F
                ])
        }, "Posting " + util.itemize([
            util.pluralize("new event", [
                util.count(events, (ev)=>!types.isEventPatch(ev)) || undefined
            ]),
            util.pluralize("event patch", [
                util.count(events, (ev)=>types.isEventPatch(ev)) || undefined
            ])
        ]) + (beacon ? " asynchronously" : " synchronously") + ".");
        return request(url, {
            events,
            variables,
            deviceSessionId: context === null || context === void 0 ? void 0 : context.deviceSessionId
        }, {
            beacon: beacon
        });
    };
    const post = async (events, { flush = false, async = true, variables } = {})=>{
        const newEvents = [];
        events = util.map(util.array(events), (event)=>{
            var _event_metadata;
            var _merge;
            return !((_event_metadata = event.metadata) === null || _event_metadata === void 0 ? void 0 : _event_metadata.queued) && newEvents.push(event), (_merge = util.merge(context.applyEventExtensions(event), {
                metadata: {
                    queued: true
                }
            })) !== null && _merge !== void 0 ? _merge : util.skip;
        });
        util.forEach(newEvents, (event)=>debug(event, event.type));
        if (!async) {
            return postEvents(events, false, variables);
        }
        if (!flush) {
            events.length && queue.push(...events);
            return;
        }
        if (queue.length) {
            events.unshift(...queue.splice(0));
        }
        if (!events.length) return;
        await postEvents(events, true, variables);
    };
    postFrequency > 0 && util.clock(()=>post([], {
            flush: true
        }), postFrequency);
    addPageVisibleListener((visible, unloading, delta)=>{
        // Don't do anything if the tab has only been visible for less than a second and a half.
        // More than that the user is probably just switching between tabs moving past this one.
        // NOTE: (This number should preferably be better qualified. We could also look into user activation events).
        if (!visible && (queue.length || unloading || delta > 1500)) {
            const updatedEvents = util.map(patchSources, ([sourceEvent, factories])=>{
                let merged = null;
                util.forEach(factories, (source)=>{
                    const [patch, unbinding] = source();
                    if (unbinding) {
                        factories.delete(source);
                        if (!factories.size) {
                            patchSources.delete(sourceEvent);
                            snapshots.delete(sourceEvent);
                        }
                    }
                    if (patch) {
                        merged = merged ? {
                            ...merged,
                            ...patch
                        } : patch;
                    }
                });
                return merged !== null && merged !== void 0 ? merged : util.skip;
            });
            if (queue.length || updatedEvents.length) {
                post(util.concat(queue.splice(0), updatedEvents), {
                    flush: true
                });
            }
        }
    });
    return {
        post,
        postPatch: (target, patch, flush = true)=>post(mapPatchTarget(target, patch), {
                flush
            }),
        registerEventPatchSource
    };
};

const intersectionHandler = Symbol();
const intersectionConfiguration = Symbol();
const INTERSECTION_POLL_INTERVAL = 250;
/** The amount of the component that must be visible for the impression to count. */ const IMPRESSION_START = [
    0.75,
    0.33
];
/** The impression stops when only this amount of the component is visible. */ const IMPRESSION_STOP = [
    0.25,
    0.33
];
/** The percentage of the total number of characters contained in the top region. */ const TEXT_REGION_TOP = 0.25;
/* The percentage of the total number of characters before the bottom region. */ const TEXT_REGION_BOTTOM = 0.75;
const initialState = ()=>({
        active: false,
        pendingActive: false,
        activeTime: util.createTimer(false, getActiveTime),
        viewDuration: createViewDurationTimer(false),
        impressions: 0
    });
const parseConfiguration = (configuration)=>(typeof configuration === "string" && (configuration = util.parseBoolean(configuration)), configuration ? {
        delay: configuration === true || configuration.delay == null ? trackerConfig.impressionThreshold : configuration.delay
    } : false);
const createImpressionObserver = (tracker)=>{
    const observer = new IntersectionObserver((els)=>util.forEach(els, (args)=>{
            var _args_target_intersectionHandler, _args_target;
            return (_args_target_intersectionHandler = (_args_target = args.target)[intersectionHandler]) === null || _args_target_intersectionHandler === void 0 ? void 0 : _args_target_intersectionHandler.call(_args_target, args);
        }));
    const currentIntersections = new Set();
    util.clock({
        callback: ()=>util.forEach(currentIntersections, (handler)=>handler()),
        frequency: INTERSECTION_POLL_INTERVAL,
        raf: true
    });
    const constrain = (point, max, min = 0)=>point < min ? min : point > max ? max : point;
    const probeRange = doc.createRange();
    return (el, trackingData)=>{
        var _trackingData_track, _impressionConfiguration_components, _el_intersectionConfiguration, _el_intersectionConfiguration1, _trackingData_track1;
        if (!trackingData) {
            return false;
        }
        const impressionConfiguration = {
            components: util.map(trackingData.components, (cmp)=>{
                var _cmp_track, _cmp_track1;
                return ((_cmp_track = cmp.track) === null || _cmp_track === void 0 ? void 0 : _cmp_track.impressions) ? {
                    key: types.getExternalReferenceKey(cmp),
                    config: (_cmp_track1 = cmp.track) === null || _cmp_track1 === void 0 ? void 0 : _cmp_track1.impressions
                } : util.skip;
            }),
            config: trackingData === null || trackingData === void 0 ? void 0 : (_trackingData_track = trackingData.track) === null || _trackingData_track === void 0 ? void 0 : _trackingData_track.impressions
        };
        const configurationKey = impressionConfiguration.config || ((_impressionConfiguration_components = impressionConfiguration.components) === null || _impressionConfiguration_components === void 0 ? void 0 : _impressionConfiguration_components.length) ? util.stringify(impressionConfiguration) : "";
        if (((_el_intersectionConfiguration = el[intersectionConfiguration]) === null || _el_intersectionConfiguration === void 0 ? void 0 : _el_intersectionConfiguration[0]) === configurationKey) {
            // Nothing changed
            return;
        }
        if (!configurationKey) {
            var // Nothing tracked.
            _el_intersectionHandler;
            (_el_intersectionHandler = el[intersectionHandler]) === null || _el_intersectionHandler === void 0 ? void 0 : _el_intersectionHandler.call(el, false);
            delete el[intersectionConfiguration];
            observer.unobserve(el);
            return;
        }
        const previousComponents = (_el_intersectionConfiguration1 = el[intersectionConfiguration]) === null || _el_intersectionConfiguration1 === void 0 ? void 0 : _el_intersectionConfiguration1[1];
        const cache = el[intersectionConfiguration] = [
            configurationKey,
            new Map()
        ];
        const globalConfiguration = parseConfiguration((_trackingData_track1 = trackingData.track) === null || _trackingData_track1 === void 0 ? void 0 : _trackingData_track1.impressions);
        let components = util.map(trackingData === null || trackingData === void 0 ? void 0 : trackingData.components, (cmp)=>{
            var _cmp_track;
            var _cmp_track_impressions;
            const config = parseConfiguration((_cmp_track_impressions = cmp === null || cmp === void 0 ? void 0 : (_cmp_track = cmp.track) === null || _cmp_track === void 0 ? void 0 : _cmp_track.impressions) !== null && _cmp_track_impressions !== void 0 ? _cmp_track_impressions : globalConfiguration);
            var // Continue state from previous configuration (if any).
            _get;
            return config ? [
                cmp,
                config,
                util.set(cache[1], types.getExternalReferenceKey(cmp), (_get = util.get(previousComponents, types.getExternalReferenceKey(cmp))) !== null && _get !== void 0 ? _get : // Nope, the component is new.
                initialState())
            ] : util.skip;
        });
        util.forEach(previousComponents, // Unbind previous components not tracked this time.
        ([key, state])=>{
            var _state_unbindPassiveEventSource;
            return !cache[1].has(key) && ((_state_unbindPassiveEventSource = state.unbindPassiveEventSource) === null || _state_unbindPassiveEventSource === void 0 ? void 0 : _state_unbindPassiveEventSource.call(state));
        });
        if (!(components === null || components === void 0 ? void 0 : components.length)) {
            return;
        }
        const siblingData = getBoundaryData(el.previousElementSibling);
        if (siblingData) {
            components = util.filter(components, (cmp)=>// When a React component returns a fragment with multiple DOM elements, we only look at the first.
                // TODO: Refine. This may cause inaccuracies but is considered an edge case (a component with tracked impressions will presumably have a single container most of the time).
                !util.some(types.uniqueReferences(siblingData.components), (siblingCmp)=>types.externalReferencesEqual(cmp[0], siblingCmp)));
        }
        let visiblePercentage = 0;
        let regions;
        const updateRegion = (index, top, bottom, readTime)=>{
            var _ref, _index;
            var _;
            const region = (_ = (_ref = regions !== null && regions !== void 0 ? regions : regions = [])[_index = index]) !== null && _ !== void 0 ? _ : _ref[_index] = [
                {
                    duration: 0,
                    impressions: 0
                },
                util.createTimer(false, getActiveTime),
                false,
                false,
                0,
                0,
                0,
                util.createIntervals()
            ];
            region[4] = top;
            region[5] = bottom;
            region[6] = readTime;
        };
        const visible = [
            util.createIntervals(),
            util.createIntervals()
        ];
        let prevHeight = -1;
        let boundaries;
        let stats;
        const poll = ()=>{
            const rect = el.getBoundingClientRect();
            const viewWidth = window.innerWidth;
            const viewHeight = window.innerHeight;
            const intersection = [
                constrain(rect.top, viewHeight),
                constrain(rect.right, viewWidth),
                constrain(rect.bottom, viewHeight),
                constrain(rect.left, viewWidth)
            ];
            const intersectionHeight = intersection[2] - intersection[0];
            const intersectionWidth = intersection[1] - intersection[3];
            const verticalIntersection = intersectionHeight / rect.height || 0;
            const horizontalIntersection = intersectionWidth / rect.width || 0;
            util.forEach(components, ([cmp, { delay }, state])=>{
                /**
         * The threshold for when an impression becomes active/inactive.
         * They depend on whether the impression is currently active.
         */ const thresholds = state.active ? IMPRESSION_STOP : IMPRESSION_START;
                /**
         * The smallest of the horizontal and vertical intersection percentage. If this is smaller than the threshold,
         * the component is intuitively not visible (or "impressed", lol).
         */ const qualified = (intersectionHeight > thresholds[0] * viewHeight || verticalIntersection > thresholds[0]) && (intersectionWidth > thresholds[0] * viewWidth || horizontalIntersection > thresholds[0]);
                if (state.pendingActive !== qualified) {
                    state.activeTime(state.pendingActive = qualified, true);
                }
                if (state.active !== (state.active = state.pendingActive && state.activeTime() >= delay - INTERSECTION_POLL_INTERVAL)) {
                    ++state.impressions;
                    state.viewDuration(state.active);
                    if (!state.impressionEvent) {
                        var _filteredComponentContext_components;
                        const contextData = getComponentContext(el, {
                            directOnly: util.T,
                            eventType: "impression"
                        });
                        const filteredComponentContext = {
                            ...contextData,
                            components: util.filter(contextData === null || contextData === void 0 ? void 0 : contextData.components, (activatedComponent)=>types.externalReferencesEqual(cmp, activatedComponent))
                        };
                        if (!((_filteredComponentContext_components = filteredComponentContext.components) === null || _filteredComponentContext_components === void 0 ? void 0 : _filteredComponentContext_components.length)) {
                            return util.skip;
                        }
                        state.impressionEvent = {
                            type: "impression",
                            pos: getScreenPos(el),
                            viewport: getViewport(),
                            timeOffset: getViewTimeOffset(),
                            impressions: state.impressions,
                            element: getElementInfo(el),
                            ...filteredComponentContext
                        };
                    }
                    if (state.impressionEvent) {
                        const duration = state.viewDuration();
                        state.unbindPassiveEventSource = tracker.events.registerEventPatchSource(state.impressionEvent, ()=>({
                                duration,
                                impressions: state.impressions,
                                regions: regions && {
                                    top: regions[0][0],
                                    middle: regions[1][0],
                                    bottom: regions[2][0]
                                },
                                seen: visiblePercentage,
                                text: stats,
                                read: duration.activeTime && stats && constrain(duration.activeTime / stats.readTime, visiblePercentage)
                            }), true);
                    }
                }
            });
            const someActive = util.some(components, (cmp)=>cmp[2].active);
            if (rect.height !== prevHeight) {
                prevHeight = rect.height;
                const text = el.textContent;
                ({ boundaries, ...stats } = util.getTextStats(text !== null && text !== void 0 ? text : "", [
                    0,
                    TEXT_REGION_TOP,
                    TEXT_REGION_BOTTOM,
                    1
                ]));
                if (regions || rect.height >= 1.25 * viewHeight) {
                    const nodes = doc.createTreeWalker(el, NodeFilter.SHOW_TEXT);
                    let node;
                    let length = 0;
                    let boundaryIndex = 0;
                    regions !== null && regions !== void 0 ? regions : regions = [];
                    while(boundaryIndex < boundaries.length && (node = nodes.nextNode())){
                        var _node_textContent, _boundaries_boundaryIndex;
                        var _node_textContent_length;
                        let nodeLength = (_node_textContent_length = (_node_textContent = node.textContent) === null || _node_textContent === void 0 ? void 0 : _node_textContent.length) !== null && _node_textContent_length !== void 0 ? _node_textContent_length : 0;
                        length += nodeLength;
                        while(length >= ((_boundaries_boundaryIndex = boundaries[boundaryIndex]) === null || _boundaries_boundaryIndex === void 0 ? void 0 : _boundaries_boundaryIndex.offset)){
                            // While loop because two boundaries may have the same offset.
                            probeRange[boundaryIndex % 2 ? "setEnd" : "setStart"](node, boundaries[boundaryIndex].offset - length + nodeLength);
                            if (boundaryIndex++ % 2) {
                                const { top, bottom } = probeRange.getBoundingClientRect();
                                const offset = rect.top;
                                if (boundaryIndex < 3) {
                                    updateRegion(0, top - offset, bottom - offset, boundaries[1].readTime);
                                } else {
                                    updateRegion(1, regions[0][4], top - offset, boundaries[2].readTime);
                                    updateRegion(2, top - offset, bottom - offset, boundaries[3].readTime);
                                }
                            }
                        }
                    }
                }
            }
            let horizontalOffset = rect.left < 0 ? -rect.left : 0;
            let verticalOffset = rect.top < 0 ? -rect.top : 0;
            const area = rect.width * rect.height;
            if (someActive) {
                visiblePercentage = visible[0].push(verticalOffset, verticalOffset + intersectionHeight) * visible[1].push(horizontalOffset, horizontalOffset + intersectionWidth) / area;
            }
            if (regions) {
                util.forEach(regions, (region)=>{
                    const intersectionTop = constrain(rect.top < 0 ? -rect.top : 0, region[5], region[4]);
                    const intersectionBottom = constrain(rect.bottom > viewHeight ? viewHeight : rect.bottom, region[5], region[4]);
                    // Zero height, nothing to do.
                    let qualified = someActive && intersectionBottom - intersectionTop > 0;
                    const data = region[0];
                    data.duration = region[1](qualified);
                    if (qualified) {
                        region[3] !== (region[3] = qualified) && ++region[0].impressions;
                        data.seen = region[7].push(intersectionTop, intersectionBottom) / (region[5] - region[4]);
                        data.read = constrain(data.duration / region[6], data.seen);
                    }
                });
            }
        };
        el[intersectionHandler] = ({ isIntersecting })=>{
            util.set(currentIntersections, poll, isIntersecting);
            !isIntersecting && (util.forEach(components, ([, , { unbindPassiveEventSource }])=>unbindPassiveEventSource === null || unbindPassiveEventSource === void 0 ? void 0 : unbindPassiveEventSource()), poll());
        };
        observer.observe(el);
    };
};

const formatVariables = (variables)=>{
    return util.map(util.sort(variables, [
        (variable)=>variable.scope,
        (variable)=>variable.key
    ]), (variable)=>{
        var _variable_schema;
        return variable ? [
            variable,
            `${types.formatVariableKey(variable)}, ${isLocalScopeKey(variable) ? "client-side memory only" : types.formatDataUsage((_variable_schema = variable.schema) === null || _variable_schema === void 0 ? void 0 : _variable_schema.usage)})`,
            util.F
        ] : util.skip;
    });
};
const addDebugListeners = ()=>{
    addVariablesChangedListener((changes, all, local)=>{
        const variables = util.concat(formatVariables(util.map(changes, ([, current])=>current ? current : util.skip)), [
            [
                {
                    [childGroups]: formatVariables(util.map(all, ([, current])=>current ? current : util.skip))
                },
                "All variables",
                util.T
            ]
        ]);
        debug({
            [childGroups]: variables
        }, util.ansi(`Variables changed${!local ? " - merging changes from another tab" : ""} (${changes.length} changed, ${all.size} in total).`, "2;3"));
    });
} ;

const detectDeviceType = ()=>{
    // Common thresholds based on https://yesviz.com/viewport/
    const screen = win === null || win === void 0 ? void 0 : win.screen;
    if (!screen) return {};
    let { width: w, height: h, orientation: o } = screen; // Get's the resolution in logical (CSS) pixels.
    const landscape = w < h;
    var _o_angle, _ref;
    const angle = (_ref = (_o_angle = o === null || o === void 0 ? void 0 : o.angle) !== null && _o_angle !== void 0 ? _o_angle : win["orientation"]) !== null && _ref !== void 0 ? _ref : 0;
    (angle === -90 || angle === 90) && ([w, h] = [
        h,
        w
    ]);
    return {
        deviceType: w < 480 ? "mobile" : w <= 1024 ? "tablet" : "desktop",
        screen: {
            dpr: win.devicePixelRatio,
            width: w,
            height: h,
            landscape
        }
    };
};

const postUserAgentEvent = (tracker)=>tracker({
        type: "user_agent",
        hasTouch: navigator.maxTouchPoints > 0,
        userAgent: navigator.userAgent,
        view: exports.currentViewEvent === null || exports.currentViewEvent === void 0 ? void 0 : exports.currentViewEvent.clientId,
        languages: util.map(navigator.languages, (id, i)=>{
            const [language, region] = id.split("-");
            return {
                id,
                language,
                region,
                primary: i === 0,
                preference: i + 1
            };
        }),
        timezone: {
            iana: Intl.DateTimeFormat().resolvedOptions().timeZone,
            offset: new Date().getTimezoneOffset()
        },
        webdriver: navigator.webdriver,
        ...detectDeviceType()
    });

const isLinkElement = (el, href = tagName(el) === "A" && attr(el, "href"))=>href && href != "#" && !href.startsWith("javascript:");
const isFormElement = (el, t = tagName(el))=>t === "INPUT" || t === "SELECT" || t == "TEXTAREA" || t === "LABEL";
const isClickable = (el, t = tagName(el), isButton = trackerFlag(el, "button"), type = attr(el, "type"))=>isButton === util.T || isButton !== util.F && (t === "A" || t === "BUTTON" || t === "INPUT" && ((type = type === null || type === void 0 ? void 0 : type.toLowerCase()) === "button" || type === "submit" || type === "checkbox" && !el.form));
const getElementInfo = (el, includeRect = false)=>{
    var _attr, _attr1, _el_innerText, _el_href;
    return {
        tagName: el.tagName === "INPUT" && el["type"] ? `${el.tagName}[type=${el["type"]}]` : el.tagName,
        text: util.ellipsis(((_attr = attr(el, "title")) === null || _attr === void 0 ? void 0 : _attr.trim()) || ((_attr1 = attr(el, "alt")) === null || _attr1 === void 0 ? void 0 : _attr1.trim()) || ((_el_innerText = el.innerText) === null || _el_innerText === void 0 ? void 0 : _el_innerText.trim()), 50),
        className: el.className || undefined,
        href: (_el_href = el.href) === null || _el_href === void 0 ? void 0 : _el_href.toString(),
        rect: includeRect ? getRect(el) : undefined
    };
};
const getElementLabel = (el, container, includeRect = false)=>{
    let info;
    forAncestorsOrSelf(el !== null && el !== void 0 ? el : container, (el)=>tagName(el) === "IMG" || el === container ? (info = {
            element: getElementInfo(el, includeRect)
        }, util.F) : util.T);
    return info;
};
const userInteraction = {
    id: "navigation",
    setup (tracker) {
        // The tracked click positions for click events that has already been posted once.
        const activeEventClicks = new WeakMap();
        const trackDocument = (document1)=>{
            listen(document1, [
                "click",
                "contextmenu",
                "auxclick",
                "pointerdown"
            ], (ev)=>{
                if (!checkTrackingEnabled(ev.target)) {
                    return;
                }
                // The pointerdown event is only used to detect "app" links, e.g. "mailto:" or "tel:".
                // The reason is, that they may open native browser pop-ups such as which app to use,
                // in which case the normal click event is not fired (like context menu).
                const isPointerEvent = ev.type === "pointerdown";
                let trackClicks;
                let trackRegion;
                let clickableElement;
                let containerElement;
                // Used to decide whether there can be a click intent. If the user clicks a form element, click intent is not the case.
                let formElement = null;
                let nav = util.F;
                let clickables;
                forAncestorsOrSelf(ev.target, (el)=>{
                    isClickable(el) && (clickableElement !== null && clickableElement !== void 0 ? clickableElement : clickableElement = el);
                    isFormElement(el) && (formElement !== null && formElement !== void 0 ? formElement : formElement = el);
                    nav = nav || tagName(el) === "NAV";
                    const boundary = getBoundaryData(el);
                    const components = types.uniqueReferences(boundary === null || boundary === void 0 ? void 0 : boundary.components);
                    if (!ev.button && (components === null || components === void 0 ? void 0 : components.length) && !clickables) {
                        util.forEach(el.querySelectorAll("a,button"), (clickable)=>isClickable(clickable) && ((clickables !== null && clickables !== void 0 ? clickables : clickables = []).length > 3 ? (clickables = undefined, util.stop // If there are more than three clickables, there is presumably not any missed click intent.
                            ) : clickables.push({
                                ...getElementInfo(clickable, true),
                                component: forAncestorsOrSelf(clickable, (child, r, _, childComponents = (()=>{
                                    var _getBoundaryData;
                                    return types.uniqueReferences((_getBoundaryData = getBoundaryData(child)) === null || _getBoundaryData === void 0 ? void 0 : _getBoundaryData.components);
                                })())=>childComponents && r(childComponents[0]), (child)=>child === el)
                            })));
                        if (clickables) {
                            containerElement !== null && containerElement !== void 0 ? containerElement : containerElement = el;
                        }
                    }
                    var _trackerFlag;
                    trackClicks !== null && trackClicks !== void 0 ? trackClicks : trackClicks = (_trackerFlag = trackerFlag(el, "clicks", util.T, (data)=>{
                        var _data_track;
                        return (_data_track = data.track) === null || _data_track === void 0 ? void 0 : _data_track.clicks;
                    })) !== null && _trackerFlag !== void 0 ? _trackerFlag : components && util.some(components, (cmp)=>{
                        var _cmp_track;
                        return ((_cmp_track = cmp.track) === null || _cmp_track === void 0 ? void 0 : _cmp_track.clicks) !== util.F;
                    });
                    var _trackerFlag1;
                    trackRegion !== null && trackRegion !== void 0 ? trackRegion : trackRegion = (_trackerFlag1 = trackerFlag(el, "region", util.T, (data)=>{
                        var _data_track;
                        return (_data_track = data.track) === null || _data_track === void 0 ? void 0 : _data_track.region;
                    })) !== null && _trackerFlag1 !== void 0 ? _trackerFlag1 : components && util.some(components, (cmp)=>{
                        var _cmp_track;
                        return (_cmp_track = cmp.track) === null || _cmp_track === void 0 ? void 0 : _cmp_track.region;
                    });
                });
                if (!(containerElement !== null && containerElement !== void 0 ? containerElement : containerElement = clickableElement)) {
                    return;
                }
                const clickIntent = (clickables === null || clickables === void 0 ? void 0 : clickables.length) > 0 && !clickableElement && !formElement && trackClicks;
                const componentContext = (eventType)=>getComponentContext(clickableElement !== null && clickableElement !== void 0 ? clickableElement : containerElement, {
                        includeRegion: clickIntent,
                        eventType
                    });
                trackClicks !== null && trackClicks !== void 0 ? trackClicks : trackClicks = !nav;
                trackRegion !== null && trackRegion !== void 0 ? trackRegion : trackRegion = util.T;
                const sharedEventProperties = {
                    ...trackRegion ? {
                        pos: getScreenPos(clickableElement, ev),
                        viewport: getViewport()
                    } : util.nil,
                    ...getElementLabel(ev.target, clickableElement !== null && clickableElement !== void 0 ? clickableElement : containerElement),
                    timeOffset: getViewTimeOffset()
                };
                if (!clickableElement) {
                    !isPointerEvent && clickIntent && util.update(activeEventClicks, containerElement, (current)=>{
                        const pos = getPos(containerElement, ev);
                        if (!current) {
                            // Reuse the same event and only add the new click coordinates
                            // if the element is clicked again to reduce data.
                            const intentEvent = {
                                type: "component_click_intent",
                                ...sharedEventProperties,
                                ...componentContext("component_click_intent"),
                                clicks: current = [
                                    pos
                                ],
                                elements: clickables
                            };
                            tracker.events.registerEventPatchSource(intentEvent, ()=>({
                                    clicks: activeEventClicks.get(containerElement)
                                }), true, containerElement);
                        } else {
                            current.push(pos);
                        }
                        return current;
                    });
                    return;
                }
                if (isLinkElement(clickableElement)) {
                    const link = clickableElement;
                    const external = link.hostname !== location.hostname;
                    const elementHRef = link.href || link.getAttribute("href") || "";
                    if (!elementHRef) {
                        return;
                    }
                    if (link.host === location.host && link.pathname === location.pathname && link.search === location.search) {
                        if (link.hash === "#") {
                            // Don't care about that one.
                            return;
                        }
                        if (link.hash !== location.hash) {
                            if (ev.button === 0 && !isPointerEvent) tracker({
                                type: "anchor_navigation",
                                anchor: link.hash,
                                ...sharedEventProperties,
                                ...componentContext("anchor_navigation")
                            });
                        }
                        return;
                    }
                    let parsed = util.parseUri(elementHRef, {
                        delimiters: false,
                        requireAuthority: true
                    });
                    if (!parsed) {
                        const schemeMatch = elementHRef.match(/^([^:]+):(?:\/\/)?(.+)/);
                        parsed = {
                            source: elementHRef,
                            scheme: schemeMatch === null || schemeMatch === void 0 ? void 0 : schemeMatch[1]
                        };
                    }
                    let { host, scheme, source: href } = parsed;
                    if (!href) {
                        return;
                    }
                    scheme = scheme === null || scheme === void 0 ? void 0 : scheme.toLowerCase();
                    const isHttpNavigation = !!(scheme === null || scheme === void 0 ? void 0 : scheme.match(/^https?/));
                    if (isHttpNavigation && isPointerEvent || !isHttpNavigation && !isPointerEvent) {
                        // Only trap "mailto:", "tel:" etc. via pointer down.
                        return;
                    }
                    const navigationEvent = {
                        clientId: nextId(),
                        type: "navigation",
                        href: external ? link.href : href,
                        external,
                        domain: host || scheme ? {
                            host,
                            scheme
                        } : undefined,
                        self: util.T,
                        anchor: link.hash || undefined,
                        ...sharedEventProperties,
                        ...componentContext("navigation")
                    };
                    // There does not seem to be any way to detect when the user clicks
                    // "Open link in new tab/window", so we need to do a little extra gymnastics to capture it.
                    if (ev.type === "contextmenu") {
                        if (isHttpNavigation) {
                            const originalUrl = link.href;
                            const internalUrl = isInternalUrl(originalUrl);
                            if (internalUrl) {
                                // If the page loads in a new tab, it will pick up this value as the referrer,
                                //   and we will know navigation happened.
                                pushNavigationSource(navigationEvent.clientId, ()=>tracker(navigationEvent));
                                return;
                            }
                            // Detecting external navigation is _much_ harder.
                            // Unfortunately we need to rewrite the URL to redirect via the request handler, and poll for a local storage key.
                            // This is only a problem if the user decides to copy the link from the context menu and share it,
                            // since some may argue the link looks "obscure".
                            var requestId = ("" + Math.random()).replace(".", "").substring(1, 8);
                            if (!internalUrl) {
                                if (!trackerConfig.captureContextMenu) return;
                                link.href = MNT_URL + "=" + requestId + encodeURIComponent(originalUrl);
                                // Poll for the storage key where the request handler will write the request ID before it redirects
                                // the user if the link is opened.
                                listen(window, "storage", (ev, unbind)=>{
                                    var _JSON_parse;
                                    return ev.key === CLIENT_CALLBACK_CHANNEL_ID && (ev.newValue && ((_JSON_parse = JSON.parse(ev.newValue)) === null || _JSON_parse === void 0 ? void 0 : _JSON_parse.requestId) === requestId && tracker(navigationEvent), unbind());
                                });
                                // Switch the link back when the context menu closes.
                                listen(document1, [
                                    "keydown",
                                    "keyup",
                                    "visibilitychange",
                                    "pointermove"
                                ], (_, unbind)=>{
                                    unbind();
                                    link.href = originalUrl;
                                });
                            }
                        }
                        return;
                    }
                    if (ev.button <= 1) {
                        if (!isHttpNavigation) {
                            navigationEvent.self = util.F;
                            tracker(navigationEvent);
                        } else if (ev.button === 1 || //Middle-click: new tab.
                        ev.ctrlKey || // New tab
                        ev.shiftKey || // New window
                        ev.altKey || // Download
                        attr(link, "target") && attr(link, "target") !== window.name) {
                            navigationEvent.self = util.F;
                            tracker(navigationEvent);
                            pushNavigationSource(navigationEvent.clientId);
                            return;
                        } else if (!matchExHash(location.href, link.href)) {
                            // No "real" navigation will happen if it is only the hash changing.
                            navigationEvent.exit = navigationEvent.external;
                            tracker(navigationEvent);
                            pushNavigationSource(navigationEvent.clientId);
                        }
                    }
                    return;
                }
                if (!isPointerEvent) {
                    const cart = tryGetCartEventData(ev.target);
                    (cart || trackClicks) && tracker(cart ? {
                        type: "cart_updated",
                        ...sharedEventProperties,
                        ...componentContext("cart_updated"),
                        ...cart
                    } : {
                        type: "component_click",
                        ...sharedEventProperties,
                        ...componentContext("component_click")
                    });
                }
                return;
            });
        };
        trackDocument(document);
        onFrame((frame)=>frame.contentDocument && trackDocument(frame.contentDocument));
    }
};

exports.tracker = void 0;
const initializeTracker = (config)=>{
    var _window_trackerConfig_name, _window_trackerConfig_name1;
    if (exports.tracker) return exports.tracker;
    let clientEncryptionKey;
    if (util.isString(config)) {
        // Decode the temporary key for decrypting the configuration payload.
        [clientEncryptionKey, config] = httpDecode(config);
        // Decrypt
        config = transport.createTransport(clientEncryptionKey, {
            decodeJson: true
        })[1](config);
    }
    util.merge(trackerConfig, [
        config
    ], {
        overwrite: true
    });
    if ((_window_trackerConfig_name = win[trackerConfig.name]) === null || _window_trackerConfig_name === void 0 ? void 0 : _window_trackerConfig_name[isTracker]) {
        exports.tracker = win[trackerConfig.name];
        return exports.tracker;
    }
    setStorageKey(util.remove(trackerConfig, "encryptionKey"));
    const apiProtectionKey = util.remove(trackerConfig, "key");
    var _window_trackerConfig_name__;
    const queuedCommands = (_window_trackerConfig_name__ = (_window_trackerConfig_name1 = win[trackerConfig.name]) === null || _window_trackerConfig_name1 === void 0 ? void 0 : _window_trackerConfig_name1._) !== null && _window_trackerConfig_name__ !== void 0 ? _window_trackerConfig_name__ : [];
    if (!util.isArray(queuedCommands)) {
        util.throwError(`The global variable for the tracker "${trackerConfig.name}" is used for something else than an array of queued commands.`);
        return;
    }
    // Extensions / listeners
    const extensions = [];
    let listeners = [];
    // Extensions may post commands when constructed and while the tracker is initializing
    const callListeners = (event, ...args)=>{
        let keep = util.T;
        listeners = util.filter(listeners, (listener)=>util.tryCatch(()=>{
                var _listener_event;
                return (_listener_event = listener[event]) === null || _listener_event === void 0 ? void 0 : _listener_event.call(listener, ...args, {
                    tracker: exports.tracker,
                    unsubscribe: ()=>keep = util.F
                }), keep // Will be set synchronously in the unsubscribe handler before this value is returned.
                ;
            }, errorLogger(listener)));
    };
    const pendingPostConfigurationCommands = [];
    const trackerContext = {
        applyEventExtensions (event) {
            var _event, _event1;
            var _clientId;
            (_clientId = (_event = event).clientId) !== null && _clientId !== void 0 ? _clientId : _event.clientId = nextId();
            var _timestamp;
            (_timestamp = (_event1 = event).timestamp) !== null && _timestamp !== void 0 ? _timestamp : _event1.timestamp = util.now();
            insertArgs = util.T;
            const skip = util.forEach(extensions, ([, extension])=>{
                var _extension_decorate;
                return ((_extension_decorate = extension.decorate) === null || _extension_decorate === void 0 ? void 0 : _extension_decorate.call(extension, event)) === util.F && util.stop(true);
            });
            return skip ? undefined : event;
        },
        validateKey: (key, throwIfInvalid = true)=>!apiProtectionKey && !key || key === apiProtectionKey || (throwIfInvalid ? util.throwError(`'${key}' is not a valid key.`) : false)
    };
    // Variables
    const variables = createVariableStorage(VAR_URL, trackerContext);
    // Main
    const events = createEventQueue(VAR_URL, trackerContext);
    let boundaryDataDefaults = {
        track: {
            ...trackerConfig.defaultTracking
        },
        layer: "default",
        layerPriority: -10
    };
    if (!checkTrackingEnabled(document.body)) {
        var _ref;
        var _track;
        ((_track = (_ref = boundaryDataDefaults !== null && boundaryDataDefaults !== void 0 ? boundaryDataDefaults : boundaryDataDefaults = {}).track) !== null && _track !== void 0 ? _track : _ref.track = {}).disable = true;
        trackerConfig.disabled = true;
    }
    let mainArgs = util.nil;
    let currentArg = 0;
    let insertArgs = util.F;
    let globalStateResolved = util.F;
    let ready = false;
    exports.tracker = (...commands)=>{
        if (!ready) {
            queuedCommands.push([
                commands
            ]);
            return;
        }
        if (!commands.length) {
            return;
        }
        let key;
        if (commands.length > 1 && (!commands[0] || util.isString(commands[0]))) {
            key = commands[0];
            commands = commands.slice(1);
        }
        if (util.isString(commands[0])) {
            const payload = commands[0];
            commands = !payload ? [] : util.isJsonString(payload) ? JSON.parse(payload) : httpDecode(payload);
        }
        let flush = util.F; // // Flush after these commands, optionally without waiting for other requests to finish (because the page is unloading and we have no better option even though it may split sessions.)
        commands = util.filter(util.flatMap(commands, (command)=>command && util.isString(command) ? httpDecode(command) : command), (command)=>{
            if (!command) return util.F;
            if (isTagAttributesCommand(command)) {
                trackerConfig.tags = util.assign({}, trackerConfig.tags, command.tagAttributes);
            } else if (isToggleCommand(command)) {
                trackerConfig.disabled = command.disable;
                return util.F;
            } else if (isConfigurationCommand(command)) {
                var _boundaryDataDefaults_track;
                boundaryDataDefaults = types.appendTrackingData(boundaryDataDefaults, {
                    track: command.track
                });
                if ((boundaryDataDefaults === null || boundaryDataDefaults === void 0 ? void 0 : (_boundaryDataDefaults_track = boundaryDataDefaults.track) === null || _boundaryDataDefaults_track === void 0 ? void 0 : _boundaryDataDefaults_track.disable) != null) {
                    trackerConfig.disabled = boundaryDataDefaults.track.disable;
                }
                if (boundaryDataDefaults) {
                    boundaryDataDefaults.layer = "defaults";
                    boundaryDataDefaults.layerPriority = -10;
                }
                updateBoundaryData(document.body, boundaryDataDefaults);
            } else if (isFlushCommand(command)) {
                flush = util.T;
                return util.F;
            } else if (isTrackerAvailableCommand(command)) {
                command(exports.tracker);
                return util.F;
            }
            if (!globalStateResolved && !isListenerCommand(command) && !isExtensionCommand(command)) {
                pendingPostConfigurationCommands.push(command);
                return util.F;
            }
            // #endregion
            return util.T;
        });
        if (!commands || !commands.length && !flush || trackerConfig.disabled) {
            return;
        }
        const getCommandRank = (cmd)=>isExtensionCommand(cmd) ? -100 : isListenerCommand(cmd) ? -50 : isSetCommand(cmd) ? -10 : types.isTrackedEvent(cmd) ? 90 : 0;
        // Put events last to allow listeners and interceptors from the same batch to work on them.
        // Sets come before gets to avoid unnecessary waiting
        // Extensions then listeners are first so they can evaluate the rest.
        const expanded = util.sort(commands, getCommandRank);
        // Allow nested calls to tracker.push from listeners and interceptors. Insert commands in the currently processed main batch.
        if (mainArgs && mainArgs.splice(insertArgs ? currentArg + 1 : mainArgs.length, 0, ...expanded)) return;
        mainArgs = expanded;
        try {
            for(currentArg = 0; currentArg < mainArgs.length; currentArg++){
                const command = mainArgs[currentArg];
                if (!command) continue;
                trackerContext.validateKey(key !== null && key !== void 0 ? key : command.key), util.tryCatch(()=>{
                    const command = mainArgs[currentArg];
                    callListeners("command", command);
                    insertArgs = util.F;
                    if (types.isTrackedEvent(command)) {
                        events.post(command);
                    } else if (isGetCommand(command)) {
                        variables.get(util.array(command.get));
                    } else if (isSetCommand(command)) {
                        variables.set(util.array(command.set));
                    } else if (isListenerCommand(command)) {
                        listeners.push(command.listener);
                    } else if (isExtensionCommand(command)) {
                        let extension;
                        if (extension = util.tryCatch(()=>command.extension.setup(exports.tracker), (e)=>logError(command.extension.id, e))) {
                            var _command_priority;
                            extensions.push([
                                (_command_priority = command.priority) !== null && _command_priority !== void 0 ? _command_priority : 100,
                                extension,
                                command.extension
                            ]);
                            util.sort(extensions, ([priority])=>priority);
                        }
                    } else if (isTrackerAvailableCommand(command)) {
                        command(exports.tracker); // Variables have already been loaded once.
                    } else {
                        let success = util.F;
                        for (const [, extension] of extensions){
                            var _extension_processCommand;
                            var _extension_processCommand1;
                            if (success = (_extension_processCommand1 = (_extension_processCommand = extension.processCommand) === null || _extension_processCommand === void 0 ? void 0 : _extension_processCommand.call(extension, command)) !== null && _extension_processCommand1 !== void 0 ? _extension_processCommand1 : util.F) {
                                break;
                            }
                        }
                        !success && logError(ERR_INVALID_COMMAND, command, "Loaded extensions:", util.map(extensions, (extension)=>extension[2].id));
                    }
                }, (e)=>logError(exports.tracker, ERR_INTERNAL_ERROR, e));
            }
        } finally{
            mainArgs = util.nil;
        }
        if (flush) {
            events.post([], {
                flush
            });
        }
    };
    Object.defineProperty(win, trackerConfig.name, {
        value: Object.freeze(Object.assign(exports.tracker, {
            id: "tracker_" + nextId(),
            events,
            variables,
            [isTracker]: util.T
        })),
        configurable: false,
        writable: false
    });
    // TODO: Add conditional compiler flag.
    addDebugListeners();
    addStateListener(async (event, _1, _2, unbind)=>{
        // Make sure we have a session on the server before posting anything.
        // As part of this, we also get the device session ID.
        if (event === "ready") {
            const [session, consent, deviceInfo] = await variables.get([
                {
                    scope: "session",
                    key: SCOPE_INFO_KEY,
                    refresh: true
                },
                {
                    scope: "session",
                    key: CONSENT_INFO_KEY,
                    // Refresh the consent status at every new page view in the case the server made changes in the background.
                    // After that, cache it indefinitely since it is presumably only changed by the client until the next page view (in any tab).
                    refresh: true,
                    cache: util.FOREVER
                },
                {
                    scope: "device",
                    key: SCOPE_INFO_KEY,
                    cache: true
                }
            ]).values(false);
            if (!session) {
                console.warn("No session. Tracking is disabled;");
                return;
            }
            debug({
                consent: types.clearSchemaMetadata(consent),
                session: {
                    firstSeenDate: util.formatTimestamp(session.firstSeen),
                    lastSeenDate: util.formatTimestamp(session.lastSeen),
                    duration: util.formatDuration(session.lastSeen - session.firstSeen),
                    ...types.clearSchemaMetadata(session)
                },
                device: deviceInfo ? {
                    firstSeenDate: util.formatTimestamp(deviceInfo.firstSeen),
                    lastSeenDate: util.formatTimestamp(deviceInfo.lastSeen),
                    duration: util.formatDuration(deviceInfo.lastSeen - deviceInfo.firstSeen),
                    ...types.clearSchemaMetadata(deviceInfo)
                } : "(anonymous session)"
            }, "Session and device info");
            trackerContext.deviceSessionId = session.deviceSessionId;
            unbind();
            updateBoundaryData(document.body, boundaryDataDefaults);
            // Now we accept commands.
            ready = true;
            exports.tracker(...util.map(defaultExtensions, (extension)=>({
                    extension
                })));
            // Now we also accept command unrelated to configuration, listeners and extensions.
            globalStateResolved = true;
            if (!session.hasUserAgent) {
                postUserAgentEvent(exports.tracker);
                session.hasUserAgent = true;
            }
            pendingPostConfigurationCommands.length && exports.tracker(pendingPostConfigurationCommands);
            for (const commandGroup of queuedCommands){
                if (commandGroup.length) {
                    exports.tracker(...commandGroup);
                }
            }
            exports.tracker({
                set: {
                    scope: "view",
                    key: "loaded",
                    value: true
                }
            });
        }
    }, true);
    return exports.tracker;
};

exports.currentViewEvent = void 0;
let unbindViewEventPatcher;
const getCurrentViewId = ()=>exports.currentViewEvent === null || exports.currentViewEvent === void 0 ? void 0 : exports.currentViewEvent.clientId;
let pushPopNavigation;
let pushPopNavigationType;
const referrerKey = {
    scope: "shared",
    key: "referrer"
};
const pushNavigationSource = (navigationEventId, consumed)=>{
    exports.tracker.variables.set({
        ...referrerKey,
        value: [
            getCurrentViewId(),
            navigationEventId
        ]
    });
    consumed && exports.tracker.variables.get({
        // Grr! Intellisense won't use the constant scope and key values if `...referrerKey`.
        scope: referrerKey.scope,
        key: referrerKey.key,
        poll: (current, _, previous)=>current ? true : (previous === null || previous === void 0 ? void 0 : previous[1]) === navigationEventId && consumed() && false
    });
};
const totalDuration = util.createTimer();
const visibleDuration = util.createTimer();
let activations = 1;
const getVisibleDuration = ()=>visibleDuration();
const [addViewChangedListener, dispatchViewChanged] = util.createEvent();
const createViewDurationTimer = (started)=>{
    const totalTime = util.createTimer(started, totalDuration);
    const visibleTime = util.createTimer(started, visibleDuration);
    const activeTime = util.createTimer(started, getActiveTime);
    const activationsCounter = util.createTimer(started, ()=>activations);
    return (toggle, reset)=>({
            totalTime: totalTime(toggle, reset),
            visibleTime: visibleTime(toggle, reset),
            activeTime: activeTime(toggle, reset),
            activations: activationsCounter(toggle, reset)
        });
};
const timer = createViewDurationTimer();
const getViewTimeOffset = ()=>timer();
const [addFrameListenerInternal, callOnFrame] = util.createEvent();
const onFrame = (listener, triggerCurrent)=>{
    triggerCurrent && util.forEach(frames, (frame)=>listener(frame, ()=>false));
    return addFrameListenerInternal(listener);
};
//export { addFrameListener as onFrame };
const knownFrames = new WeakSet();
const frames = document.getElementsByTagName("iframe");
const context = {
    id: "context",
    setup (tracker) {
        var _tryGetVariable, _tryGetVariable1;
        util.clock(()=>util.forEach(frames, (frame)=>util.add(knownFrames, frame) && callOnFrame(frame)), 500).trigger();
        // View definitions may be loaded asynchronously both before and after navigation happens.
        // This means the `definition` property of the current view event is updated independently of its creation.
        // If the event has already been sent, and additional patch event is sent with the definition.
        // When a definition has been associated with the current view event, it will not be changed.
        // Instead any new view definition that arrives before the next navigation is assumed to be for the next view event.
        let pendingViewDefinition;
        var _tryGetVariable_value;
        let viewIndex = (_tryGetVariable_value = (_tryGetVariable = tryGetVariable({
            scope: "tab",
            key: "viewIndex"
        })) === null || _tryGetVariable === void 0 ? void 0 : _tryGetVariable.value) !== null && _tryGetVariable_value !== void 0 ? _tryGetVariable_value : 0;
        let tabIndex = (_tryGetVariable1 = tryGetVariable({
            scope: "tab",
            key: "tabIndex"
        })) === null || _tryGetVariable1 === void 0 ? void 0 : _tryGetVariable1.value;
        if (tabIndex == null) {
            var _tryGetVariable2, // If we are the only tab, we'll see if we can get the number of previous tabs in the session
            // from the session info variable.
            _tryGetVariable_value1, _tryGetVariable3;
            var _tryGetVariable_value2, _ref;
            tabIndex = (_ref = (_tryGetVariable_value2 = (_tryGetVariable2 = tryGetVariable({
                scope: "shared",
                key: "tabIndex"
            })) === null || _tryGetVariable2 === void 0 ? void 0 : _tryGetVariable2.value) !== null && _tryGetVariable_value2 !== void 0 ? _tryGetVariable_value2 : (_tryGetVariable3 = tryGetVariable({
                scope: "session",
                key: SCOPE_INFO_KEY
            })) === null || _tryGetVariable3 === void 0 ? void 0 : (_tryGetVariable_value1 = _tryGetVariable3.value) === null || _tryGetVariable_value1 === void 0 ? void 0 : _tryGetVariable_value1.tabs) !== null && _ref !== void 0 ? _ref : 0;
            setLocalVariables({
                scope: "tab",
                key: "tabIndex",
                value: tabIndex
            }, {
                scope: "shared",
                key: "tabIndex",
                value: tabIndex + 1
            });
        }
        let currentLocation = util.nil;
        const postView = (force = util.F)=>{
            var _currentViewEvent, _currentViewEvent1;
            if (matchExHash("" + currentLocation, currentLocation = location.href) && !force) {
                return;
            }
            unbindViewEventPatcher === null || unbindViewEventPatcher === void 0 ? void 0 : unbindViewEventPatcher();
            var _parseUri;
            const { source: href, scheme, host, query } = (_parseUri = util.parseUri(location.href + "", {
                requireAuthority: true
            })) !== null && _parseUri !== void 0 ? _parseUri : {};
            exports.currentViewEvent = {
                type: "view",
                timestamp: util.now(),
                clientId: nextId(),
                tab: TAB_ID,
                href,
                path: location.pathname,
                hash: location.hash || undefined,
                domain: {
                    scheme,
                    host
                },
                queryString: util.obj(query, ([key, value])=>util.isArray(value) ? [
                        key,
                        value
                    ] : [
                        key,
                        [
                            value
                        ]
                    ]),
                tabNumber: tabIndex + 1,
                tabViewNumber: viewIndex + 1,
                viewport: getViewport(),
                duration: timer(undefined, true)
            };
            tabIndex === 0 && (exports.currentViewEvent.firstTab = util.T);
            tabIndex === 0 && viewIndex === 0 && (exports.currentViewEvent.landingPage = util.T);
            setLocalVariables({
                scope: "tab",
                key: "viewIndex",
                value: ++viewIndex
            });
            util.map([
                "source",
                "medium",
                "campaign",
                "term",
                "content"
            ], (p, _)=>{
                var _array, _currentViewEvent_queryString;
                var _utm, _ref;
                return (_ref = ((_utm = (_currentViewEvent = exports.currentViewEvent).utm) !== null && _utm !== void 0 ? _utm : _currentViewEvent.utm = {})[p] = (_array = util.array(exports.currentViewEvent === null || exports.currentViewEvent === void 0 ? void 0 : (_currentViewEvent_queryString = exports.currentViewEvent.queryString) === null || _currentViewEvent_queryString === void 0 ? void 0 : _currentViewEvent_queryString[`utm_${p}`])) === null || _array === void 0 ? void 0 : _array[0]) !== null && _ref !== void 0 ? _ref : util.skip;
            });
            !(exports.currentViewEvent.navigationType = pushPopNavigation) && performance && util.forEach(performance.getEntriesByType("navigation"), (entry)=>{
                exports.currentViewEvent.redirects = entry.redirectCount;
                exports.currentViewEvent.navigationType = util.replace(entry.type, /\_/g, "-");
            });
            if (pushPopNavigationType) {
                exports.currentViewEvent.clientNavigation = pushPopNavigationType;
            }
            pushPopNavigation = pushPopNavigationType = undefined;
            var _navigationType;
            if (((_navigationType = (_currentViewEvent1 = exports.currentViewEvent).navigationType) !== null && _navigationType !== void 0 ? _navigationType : _currentViewEvent1.navigationType = "navigate") === "navigate") {
                var _tryGetVariable;
                // Try find related event and parent tab context if any.
                // And only if navigating (not back/forward/refresh)
                const referrer = (_tryGetVariable = tryGetVariable(referrerKey)) === null || _tryGetVariable === void 0 ? void 0 : _tryGetVariable.value;
                if (referrer && isInternalUrl(document.referrer)) {
                    exports.currentViewEvent.view = referrer === null || referrer === void 0 ? void 0 : referrer[0];
                    exports.currentViewEvent.relatedEventId = referrer === null || referrer === void 0 ? void 0 : referrer[1];
                    tracker.variables.set({
                        ...referrerKey,
                        value: undefined
                    });
                }
            }
            // Referrer
            const referrer = document.referrer || util.nil;
            referrer && !isInternalUrl(referrer) && (exports.currentViewEvent.externalReferrer = {
                href: referrer,
                domain: parseDomain(referrer)
            });
            // If we already have a view definition ready, set this on the event, and reset the buffer.
            exports.currentViewEvent.definition = pendingViewDefinition;
            pendingViewDefinition = undefined;
            tracker.events.post(exports.currentViewEvent);
            unbindViewEventPatcher = tracker.events.registerEventPatchSource(exports.currentViewEvent, ()=>({
                    duration: getViewTimeOffset(),
                    tags: exports.currentViewEvent.tags
                }));
            dispatchViewChanged(exports.currentViewEvent);
        };
        addPageVisibleListener((visible)=>{
            if (visible) {
                visibleDuration(util.T);
                ++activations;
            } else {
                visibleDuration(util.F);
            }
        });
        listen(window, "popstate", ()=>(pushPopNavigation = "back-forward", postView()));
        util.forEach([
            "push",
            "replace"
        ], (name)=>{
            const methodName = name + "State";
            const inner = history[methodName];
            history[methodName] = (...args)=>{
                inner.apply(history, args);
                pushPopNavigation = "navigate";
                pushPopNavigationType = name;
                postView();
            };
        });
        postView();
        return {
            processCommand: (command)=>{
                if (isChangeUserCommand(command)) {
                    tracker(command.username ? {
                        type: "login",
                        username: command.username
                    } : {
                        type: "logout"
                    });
                    return true;
                } else if (isViewCommand(command)) {
                    const view = command.view;
                    const viewTags = view === null || view === void 0 ? void 0 : view.tags;
                    if (viewTags) {
                        if (exports.currentViewEvent) {
                            var _updateBoundaryData;
                            var _updateBoundaryData_view_tags;
                            const newTags = (_updateBoundaryData_view_tags = (_updateBoundaryData = updateBoundaryData(exports.currentViewEvent, {
                                view: {
                                    tags: viewTags
                                }
                            }, view.layer)) === null || _updateBoundaryData === void 0 ? void 0 : _updateBoundaryData.view.tags) !== null && _updateBoundaryData_view_tags !== void 0 ? _updateBoundaryData_view_tags : [];
                            if (!util.structuralEquals(exports.currentViewEvent.tags, newTags)) {
                                exports.currentViewEvent.tags = newTags;
                            }
                        }
                    }
                    const definition = (view === null || view === void 0 ? void 0 : view.id) ? view : (view === null || view === void 0 ? void 0 : view.definition) || undefined;
                    if (definition && !util.structuralEquals(definition, exports.currentViewEvent === null || exports.currentViewEvent === void 0 ? void 0 : exports.currentViewEvent.definition)) {
                        if (exports.currentViewEvent == null || exports.currentViewEvent.definition) {
                            pendingViewDefinition = definition;
                            if (definition.navigation) {
                                postView(true);
                            }
                        } else {
                            var _currentViewEvent_metadata;
                            exports.currentViewEvent.definition = definition;
                            let patchMessage = "";
                            if ((_currentViewEvent_metadata = exports.currentViewEvent.metadata) === null || _currentViewEvent_metadata === void 0 ? void 0 : _currentViewEvent_metadata.posted) {
                                patchMessage = " via patch";
                                // Send the definition as a patch because the view event has already been posted.
                                tracker.events.postPatch(exports.currentViewEvent, {
                                    definition: exports.currentViewEvent.definition
                                });
                            }
                            debug(exports.currentViewEvent, `${exports.currentViewEvent.type} (definition updated${patchMessage})`);
                        }
                        tracker({
                            set: {
                                scope: "view",
                                key: "view",
                                value: definition !== null && definition !== void 0 ? definition : null
                            }
                        });
                    }
                    return true;
                }
                return false;
            },
            decorate: (event)=>{
                exports.currentViewEvent && !types.isViewEvent(event) && !types.isEventPatch(event) && (event.view = exports.currentViewEvent.clientId);
            }
        };
    }
};

const parseCartEventData = (data)=>(data == util.nil ? undefined : (data === util.T || data === "") && (data = "add"), util.isString(data) && util.equalsAny(data, "add", "remove", "update", "clear") ? {
        action: data
    } : util.isObject(data) ? data : undefined);
function normalizeCartEventData(data) {
    if (!data) return undefined;
    if (data.units != util.nil && util.equalsAny(data.action, util.nil, "add", "remove")) {
        if (data.units === 0) return undefined;
        data.action = data.units > 0 ? "add" : "remove";
    }
    return data;
}
function tryGetCartEventData(sourceElement) {
    // Find cart. Look for cart attributes and/or data until the first content is met.
    let contextCart;
    forAncestorsOrSelf(sourceElement, (el, r)=>{
        var _getBoundaryData, _getBoundaryData1;
        var _getBoundaryData_cart;
        return !!(contextCart !== null && contextCart !== void 0 ? contextCart : contextCart = parseCartEventData((_getBoundaryData_cart = (_getBoundaryData = getBoundaryData(el)) === null || _getBoundaryData === void 0 ? void 0 : _getBoundaryData.cart) !== null && _getBoundaryData_cart !== void 0 ? _getBoundaryData_cart : trackerProperty(el, "cart"))) && !contextCart.item && (contextCart.item = util.last(types.uniqueReferences((_getBoundaryData1 = getBoundaryData(el)) === null || _getBoundaryData1 === void 0 ? void 0 : _getBoundaryData1.content))) && r(contextCart);
    });
    return normalizeCartEventData(contextCart);
}
const commerce = {
    id: "cart",
    setup (tracker) {
        return {
            processCommand (command) {
                if (isCartCommand(command)) {
                    let cart = command.cart;
                    cart === "clear" ? tracker({
                        type: "cart_updated",
                        action: "clear"
                    }) : (cart = normalizeCartEventData(cart)) && tracker({
                        ...cart,
                        type: "cart_updated"
                    });
                    return util.T;
                }
                if (isOrderCommand(command)) {
                    tracker({
                        type: "order",
                        ...command.order
                    });
                    return util.T;
                }
                return util.F;
            }
        };
    }
};

const componentDomConfiguration = Symbol("DOM configuration");
const parseBoundaryTags = (el, eventType)=>{
    const parsed = getBoundaryTags(el, eventType);
    return (parsed === null || parsed === void 0 ? void 0 : parsed.tags) && parsed;
};
let content;
const stripRects = (component, keep)=>keep ? component : {
        ...component,
        rect: undefined,
        content: (content = component.content) && util.map(content, (content)=>({
                ...content,
                rect: undefined
            }))
    };
const checkTrackingEnabled = (el)=>forAncestorsOrSelf(el, (el, returnValue)=>{
        var _getBoundaryData_track, _getBoundaryData;
        let disabledSetting = ((_getBoundaryData = getBoundaryData(el)) === null || _getBoundaryData === void 0 ? void 0 : (_getBoundaryData_track = _getBoundaryData.track) === null || _getBoundaryData_track === void 0 ? void 0 : _getBoundaryData_track.disable) || trackerFlag(el, "disable");
        if (disabledSetting != null) {
            returnValue(disabledSetting);
        }
    }) !== true;
const getComponentContext = (el, { directOnly, includeRegion, eventType, previous } = {})=>{
    var _tags_tags;
    if (!el.isConnected) {
        return undefined;
    }
    let collectedContent = undefined;
    let collected = [];
    let includeState = 0;
    let rect;
    forAncestorsOrSelf(el, (el)=>{
        const entry = getBoundaryData(el);
        if (!entry) {
            return;
        }
        if (types.hasComponentOrContent(entry)) {
            var _filter;
            const components = (_filter = util.filter(types.uniqueReferences(entry.components), (entry)=>{
                var _entry_track, _entry_track1;
                return entry && (includeState === 0 || !directOnly && (includeState === 1 && ((_entry_track = entry.track) === null || _entry_track === void 0 ? void 0 : _entry_track.secondary) !== util.T || ((_entry_track1 = entry.track) === null || _entry_track1 === void 0 ? void 0 : _entry_track1.promote)));
            })) !== null && _filter !== void 0 ? _filter : [];
            rect = (includeRegion !== null && includeRegion !== void 0 ? includeRegion : util.some(components, (item)=>{
                var _item_track;
                return (_item_track = item.track) === null || _item_track === void 0 ? void 0 : _item_track.region;
            })) && getRect(el) || undefined;
            entry.content && (collectedContent !== null && collectedContent !== void 0 ? collectedContent : collectedContent = []).unshift(...util.map(entry.content, (item)=>item ? {
                    ...item,
                    rect
                } : util.skip));
            (components === null || components === void 0 ? void 0 : components.length) && (collected.unshift(...util.map(components, (item)=>{
                var _item_track;
                return includeState = util.max([
                    includeState,
                    ((_item_track = item.track) === null || _item_track === void 0 ? void 0 : _item_track.secondary // INV: Secondary components are only included here if we did not have any components from a child element.
                    ) ? 1 : 2
                ]), stripRects({
                    ...item,
                    track: undefined,
                    content: types.uniqueReferences(collectedContent),
                    rect
                }, !!rect);
            })), collectedContent = undefined);
        }
        const area = entry.area || trackerProperty(el, "area");
        area && collected.unshift(area);
    });
    let areaPath;
    let components;
    util.forEach(collected, (item)=>{
        if (util.isString(item)) {
            (areaPath !== null && areaPath !== void 0 ? areaPath : areaPath = []).push(item);
        } else {
            var _item;
            var _area;
            (_area = (_item = item).area) !== null && _area !== void 0 ? _area : _item.area = util.join(areaPath, "/");
            (components !== null && components !== void 0 ? components : components = []).unshift(item);
        }
    });
    let tags = parseBoundaryTags(el, eventType);
    if (!(tags === null || tags === void 0 ? void 0 : (_tags_tags = tags.tags) === null || _tags_tags === void 0 ? void 0 : _tags_tags.length) && (previous === null || previous === void 0 ? void 0 : previous.tags)) {
        // If a previous context is specified, it is probably for event diffing.
        // Include an empty tag array to tell diffing that the tags were removed.
        tags = {
            tags: []
        };
    }
    return components || areaPath || collectedContent || (tags === null || tags === void 0 ? void 0 : tags.tags) ? types.cleanBoundaryDataProperties({
        components: types.uniqueReferences(components),
        area: util.join(areaPath, "/"),
        content: types.uniqueReferences(collectedContent),
        ...tags
    }, eventType) : undefined;
};
const components = {
    id: "components",
    setup (tracker) {
        const impressions = createImpressionObserver(tracker);
        const registerComponent = ({ boundary: el, ...command })=>{
            var _command_update;
            const data = updateBoundaryData(el, (_command_update = command === null || command === void 0 ? void 0 : command["update"]) !== null && _command_update !== void 0 ? _command_update : command);
            impressions(el, data);
        };
        return {
            decorate (eventData) {
                // Strip tracking configuration.
                util.forEach(eventData.components, (component)=>{
                    component.track && delete component.track;
                    util.forEach(eventData.elements, (clickable)=>clickable.track && delete clickable.track);
                });
            },
            processCommand (cmd) {
                return isTrackingDataCommand(cmd) ? (registerComponent(cmd), util.T) : isScanComponentsCommand(cmd) ? (util.forEach(scanAttributes(cmd.scan.attribute, cmd.scan.components), registerComponent), util.T) : util.F;
            }
        };
    }
};

const scroll = {
    id: "scroll",
    setup (tracker) {
        let emitted = {};
        let initialScroll = scrollPos(util.T);
        addViewChangedListener(()=>util.defer(()=>(emitted = {}, initialScroll = scrollPos(util.T)), 250));
        listen(window, "scroll", ()=>{
            const scroll = scrollPos();
            const offset = relativeScrollPos();
            if (scroll.y >= initialScroll.y) {
                const types = [];
                !emitted["fold"] && scroll.y >= initialScroll.y + 200 && (emitted["fold"] = util.T, types.push("fold"));
                !emitted["page-middle"] && offset.y >= 0.5 && (emitted["page-middle"] = util.T, types.push("page-middle"));
                !emitted["page-end"] && offset.y >= 0.99 && (emitted["page-end"] = util.T, types.push("page-end"));
                const mapped = util.map(types, (scrollType)=>({
                        type: "scroll",
                        scrollType,
                        offset
                    }));
                mapped.length && tracker(mapped);
            }
        });
    }
};

const currentValue = Symbol();
const VALIDATION_POLL_INTERVAL = 1000;
/** The time waited after a form submit event to test if it still there, which is assumed to indicate that there are validation errors. */ const VALIDATION_ERROR_TIMEOUT = 10000;
const forms = {
    id: "forms",
    setup (tracker) {
        const formEvents = new Map();
        const pendingFormSubmits = [];
        // Trap fetch() to check whether there are pending (AJAX) submit requests when the user leaves the page.
        const originalFetch = window.fetch;
        window.fetch = async (...args)=>{
            const pendingFormSubmit = util.last(pendingFormSubmits);
            if (!pendingFormSubmit || pendingFormSubmit.requestState || util.now() - pendingFormSubmit.started > 100 // More than 100 ms must be something else.
            ) {
                // This request is probably about something else.
                return await originalFetch(...args);
            }
            pendingFormSubmit.requestState = 1;
            try {
                const response = await originalFetch(...args);
                if (!response.ok) {
                    debug(`Request for pending form failed (status ${response.status}). ${util.ansi("Form not submitted", 1)}.`);
                    pendingFormSubmit.cancel(false);
                }
                const contentType = response.headers.get("content-type");
                if (contentType && contentType.includes("application/json")) {
                    try {
                        var // GraphQL
                        _json_errors;
                        const json = await response.json();
                        if (// Qualified guessing
                        (json === null || json === void 0 ? void 0 : json.error) || (json === null || json === void 0 ? void 0 : (_json_errors = json.errors) === null || _json_errors === void 0 ? void 0 : _json_errors.length)) {
                            debug(`Request for pending form (presumably) failed with an error response ('${util.stringify(json)}'). ${util.ansi("Form not submitted", 1)}.`);
                            pendingFormSubmit.cancel(false);
                        }
                    } catch (e) {
                        debug(`Request for pending form failed (invalid JSON). ${util.ansi("Form not submitted", 1)}.`);
                        pendingFormSubmit.cancel(false);
                    }
                }
                if (pendingFormSubmit.pending) {
                    debug(`Request for pending form succeeded. ${util.ansi("Form submitted", 1)}.`);
                    pendingFormSubmit.complete(false);
                }
                return response;
            } catch (error) {
                debug(`Request for pending form failed ('${error.toString()}'). ${util.ansi("Form not submitted", 1)}.`);
                pendingFormSubmit.cancel(false);
                throw error;
            } finally{
                pendingFormSubmit.requestState = 2;
            }
        };
        let currentConsent;
        tracker({
            consent: {
                get: (consent)=>{
                    currentConsent = consent;
                    return true;
                }
            }
        });
        const getFormFieldValue = (element, forTracking = false)=>{
            var _trackerProperty;
            //let include = true as any;
            let include = !forTracking || ((_trackerProperty = trackerProperty(element, "field", true, (data)=>{
                var _data_track_formFields, _data_track;
                return (_data_track = data.track) === null || _data_track === void 0 ? void 0 : (_data_track_formFields = _data_track.formFields) === null || _data_track_formFields === void 0 ? void 0 : _data_track_formFields.values;
            })) !== null && _trackerProperty !== void 0 ? _trackerProperty : "checkbox-only");
            if (forTracking) {
                include = include === true || include === "checkbox-only" && element.type === "checkbox";
                if (include) {
                    var _trackerProperty1;
                    const privacy = (_trackerProperty1 = trackerProperty(element, "field-privacy", true, (data)=>{
                        var _data_track_formFields, _data_track;
                        return (_data_track = data.track) === null || _data_track === void 0 ? void 0 : (_data_track_formFields = _data_track.formFields) === null || _data_track_formFields === void 0 ? void 0 : _data_track_formFields.privacy;
                    })) !== null && _trackerProperty1 !== void 0 ? _trackerProperty1 : "anonymous";
                    if (privacy) {
                        var _currentConsent_classification;
                        // Check privacy.
                        const consentLevel = (_currentConsent_classification = currentConsent === null || currentConsent === void 0 ? void 0 : currentConsent.classification) !== null && _currentConsent_classification !== void 0 ? _currentConsent_classification : "anonymous";
                        include = types.DataClassification.compare(privacy, consentLevel) <= 0;
                    }
                }
            }
            let value = element.selectedOptions ? [
                ...element.selectedOptions
            ].map((option)=>option.value).join(",") : element.type === "checkbox" ? element.checked ? "true" : "false" : element.value;
            if (forTracking && value) {
                value = util.ellipsis(value, 200);
            }
            return include ? value : undefined;
        };
        const getFormState = (el)=>{
            const formElement = el.form;
            if (!formElement || trackerFlag(formElement, "disable", true, (data)=>{
                var _data_track;
                return (_data_track = data.track) === null || _data_track === void 0 ? void 0 : _data_track.forms;
            }) === false || trackerFlag(formElement, "form", true, (data)=>{
                var _data_track;
                return (_data_track = data.track) === null || _data_track === void 0 ? void 0 : _data_track.forms;
            }) == false) {
                return; // Don't care if we started with an element that didn't map to a field.
            }
            const refName = scopeAttribute(formElement, trackerPropertyName("ref")) || "track_ref";
            let anonymousId = 0;
            const parseElements = ()=>{
                util.forEach(formElement.querySelectorAll("INPUT,SELECT,TEXTAREA,BUTTON"), (el, i)=>{
                    var _el_labels_, _el_labels;
                    var _state__fields, _name;
                    if (el.tagName === "BUTTON" && el.type !== "submit") {
                        return;
                    }
                    const name = el.name || `(unnamed ${++anonymousId})`;
                    if (el.type === "hidden") {
                        if (el.type === "hidden" && (el.name === refName || trackerFlag(el, "ref"))) {
                            !el.value && (el.value = uuidv4());
                            state[0].ref = el.value;
                        }
                        return;
                    }
                    var _el_labels__innerText, _el_type, _;
                    const field = (_ = (_state__fields = state[0].fields)[_name = name]) !== null && _ !== void 0 ? _ : _state__fields[_name] = {
                        id: el.id || name,
                        name,
                        label: util.replace((_el_labels__innerText = (_el_labels = el.labels) === null || _el_labels === void 0 ? void 0 : (_el_labels_ = _el_labels[0]) === null || _el_labels_ === void 0 ? void 0 : _el_labels_.innerText) !== null && _el_labels__innerText !== void 0 ? _el_labels__innerText : name, /^\s*(.*?)\s*\*?\s*$/g, "$1"),
                        activeTime: 0,
                        totalTime: 0,
                        type: (_el_type = el.type) !== null && _el_type !== void 0 ? _el_type : "unknown",
                        [currentValue]: getFormFieldValue(el),
                        value: getFormFieldValue(el, true)
                    };
                    state[0].fields[field.name] = field;
                    state[1].set(el, field);
                });
            };
            let capturedContext;
            const isFormVisible = ()=>formElement.isConnected && getRect(formElement).width;
            const state = util.get(formEvents, formElement, ()=>{
                const fieldMap = new Map();
                const ev = {
                    type: "form",
                    name: scopeAttribute(formElement, trackerPropertyName("form-name")) || attr(formElement, "name") || formElement.id || undefined,
                    ...getComponentContext(formElement, {
                        eventType: "form"
                    }),
                    activeTime: 0,
                    totalTime: 0,
                    fields: {}
                };
                tracker.events.post(ev);
                tracker.events.registerEventPatchSource(ev, (previous)=>({
                        ...ev,
                        ...getComponentContext(formElement, {
                            eventType: "form",
                            previous
                        }),
                        timeOffset: getViewTimeOffset()
                    }));
                let state;
                const commitEvent = (explicit = false)=>{
                    if (!explicit && state[3] === 1) {
                        // The final form event has already been submitted.
                        return false;
                    }
                    handleChange(); // focusout or change events may not be called when the user leaves the page while a field has focus.
                    // If the form has disappeared it is heuristically assumed it was submitted successfully.
                    if (state[3] >= 2 || explicit) {
                        ev.completed = explicit || state[3] === 3 || !isFormVisible();
                        if (explicit) {
                            debug(`Form explicitly submitted. ${util.ansi("Form submitted", 1)}.`);
                        }
                    }
                    tracker.events.postPatch(ev, {
                        ...capturedContext !== null && capturedContext !== void 0 ? capturedContext : getComponentContext(formElement, {
                            eventType: "form"
                        }),
                        completed: ev.completed,
                        totalTime: util.now(util.T) - state[4]
                    });
                    capturedContext = undefined;
                    state[3] = 1;
                    return true;
                };
                const commitTimeout = util.createTimeout();
                const isReCaptchaActive = ()=>{
                    let probeDoc = formElement.ownerDocument;
                    while(probeDoc){
                        if (util.some(probeDoc.querySelectorAll("iframe"), (frame)=>frame.src.match(// reCAPTCHA challenge URLs are like `https://www.google.com/recaptcha/(something)/bframe?(something)`
                            // There may be other iframes with `recaptcha` in the URL, but that is typically the "badge" shown in some forms.
                            RegExp("https:\\/\\/www.google.com\\/.*(?<=\\/)recaptcha\\/.*(?<=\\/)bframe", "gi")) && isVisible(frame))) {
                            return true;
                        }
                        // Walk up the frames. The dialog may have been injected into the main window.
                        probeDoc = util.tryCatch(()=>{
                            var _probeDoc_defaultView_frameElement, _probeDoc_defaultView;
                            return (_probeDoc_defaultView = probeDoc.defaultView) === null || _probeDoc_defaultView === void 0 ? void 0 : (_probeDoc_defaultView_frameElement = _probeDoc_defaultView.frameElement) === null || _probeDoc_defaultView_frameElement === void 0 ? void 0 : _probeDoc_defaultView_frameElement.ownerDocument;
                        }, ()=>undefined);
                    }
                    return false;
                };
                let unbindNavigationListener;
                let pendingFormSubmit = null;
                let currentFormSubmitEvent = null;
                const submitHandler = (submitEvent)=>{
                    if (submitEvent.target === formElement) {
                        currentFormSubmitEvent = submitEvent;
                    }
                    if (state[3] !== 2) {
                        return;
                    }
                    capturedContext = getComponentContext(formElement, {
                        eventType: "form"
                    });
                    state[3] = 3;
                    const clearPendingSubmit = ()=>{
                        if (!pendingFormSubmit) {
                            return false;
                        }
                        pendingFormSubmit.pending = false;
                        const index = pendingFormSubmits.indexOf(pendingFormSubmit);
                        if (index > -1) {
                            pendingFormSubmits.splice(index, 1);
                        }
                        pendingFormSubmit = null;
                        unbindNavigationListener === null || unbindNavigationListener === void 0 ? void 0 : unbindNavigationListener();
                        commitTimeout(false);
                        return true;
                    };
                    clearPendingSubmit();
                    pendingFormSubmit = {
                        started: util.now(),
                        requestState: 0,
                        pending: true,
                        formElement: formElement,
                        defaultPrevented: false,
                        cancel (explicit) {
                            if (!clearPendingSubmit()) {
                                return false;
                            }
                            state[3] = 2;
                            if (explicit) {
                                debug(`Form submit explicitly cancelled. ${util.ansi("Form not submitted", 1)}.`);
                            }
                            return true;
                        },
                        complete (explicit) {
                            if (!clearPendingSubmit()) {
                                return false;
                            }
                            if (explicit) {
                                debug(`Form explicitly submitted. ${util.ansi("Form submitted", 1)}.`);
                                if (state[3] === 2) {
                                    state[3] = 3;
                                }
                            }
                            commitEvent();
                            return true;
                        }
                    };
                    pendingFormSubmits.push(pendingFormSubmit);
                    // Add a short timeout make sure we get the correct value of event.defaultPrevent if we are not the last event handler.
                    setTimeout(()=>{
                        if (submitEvent.defaultPrevented || (currentFormSubmitEvent === null || currentFormSubmitEvent === void 0 ? void 0 : currentFormSubmitEvent.defaultPrevented)) {
                            if (pendingFormSubmit) {
                                pendingFormSubmit.defaultPrevented = true;
                            }
                            currentFormSubmitEvent = null;
                            // Might be XHR. If so, the default would have been prevented.
                            // However, we must wait and see if the form disappears, otherwise, it could also be validation errors.
                            [unbindNavigationListener] = addPageLoadedListener((loaded, _)=>{
                                if (loaded) return;
                                // If the browser navigates while waiting, this is also considered a submit.
                                if (recaptcha) {
                                    if (pendingFormSubmit === null || pendingFormSubmit === void 0 ? void 0 : pendingFormSubmit.cancel(false)) {
                                        debug(`The browser is navigating to another page after submit leaving a reCAPTCHA challenge. ${util.ansi("Form not submitted", 1)}.`);
                                    }
                                } else if (state[3] === 3) {
                                    if (!(pendingFormSubmit === null || pendingFormSubmit === void 0 ? void 0 : pendingFormSubmit.pending)) {
                                        return;
                                    }
                                    const delta = util.now() - pendingFormSubmit.started;
                                    if (!pendingFormSubmit.requestState && delta < 1500) {
                                        (pendingFormSubmit === null || pendingFormSubmit === void 0 ? void 0 : pendingFormSubmit.complete(false)) && debug(`The browser is navigating to another page shortly after submit, and no requests are pending. ${util.ansi("Form (quite likely) submitted", 1)}.`);
                                    } else if (!pendingFormSubmit.defaultPrevented) {
                                        (pendingFormSubmit === null || pendingFormSubmit === void 0 ? void 0 : pendingFormSubmit.complete(false)) && debug(`The browser is navigating to another page before ${VALIDATION_ERROR_TIMEOUT / 1000}s after submit. ${util.ansi(delta < 3000 ? "Form submitted" : "Form (quite likely) submitted", 1)}.`);
                                    } else if (pendingFormSubmit === null || pendingFormSubmit === void 0 ? void 0 : pendingFormSubmit.cancel(false)) {
                                        debug(`The browser is navigating to another page before submit has completed. Note to developers: You may need to do an explicit \`tail({form:"submit", ref: (submit event/form element)})\` if you think this is wrong. ${util.ansi("Form state uncertain", 1)}.`);
                                    }
                                } else if (state[3] !== 1) {
                                    if (pendingFormSubmit === null || pendingFormSubmit === void 0 ? void 0 : pendingFormSubmit.cancel(false)) {
                                        debug(`The browser is navigating to another page after submit, but submit was cancelled earlier because of validation errors. ${util.ansi("Form not submitted.", 1)}.`);
                                    }
                                }
                            });
                            let recaptcha = false;
                            let started = util.now();
                            commitTimeout(()=>{
                                const elapsed = util.now() - started;
                                if (isReCaptchaActive()) {
                                    state[3] = 2;
                                    debug("reCAPTCHA challenge is active.");
                                    recaptcha = true;
                                    return true;
                                }
                                if (recaptcha) {
                                    recaptcha = false;
                                    debug("reCAPTCHA challenge ended (for better or worse).");
                                    state[3] = 3;
                                }
                                if (formElement.isConnected && getRect(formElement).width > 0) {
                                    if (elapsed >= VALIDATION_ERROR_TIMEOUT) {
                                        //if (pendingFormSubmit?.cancel(false)) {
                                        state[3] = 2;
                                        debug(`Form is still visible after ${elapsed} ms, validation errors assumed. Logic for auto-detecting submit is suspended. ${util.ansi("Form not submitted", 1)}.`);
                                        return false;
                                    }
                                } else {
                                    if (pendingFormSubmit === null || pendingFormSubmit === void 0 ? void 0 : pendingFormSubmit.complete(false)) {
                                        debug(`Form is no longer visible ${elapsed} ms after submit. ${util.ansi("Form submitted", 1)}.`);
                                    }
                                }
                                // Check again until elapsed < error timeout.
                                return true;
                            }, VALIDATION_POLL_INTERVAL);
                            return;
                        } else {
                            if (pendingFormSubmit === null || pendingFormSubmit === void 0 ? void 0 : pendingFormSubmit.complete(false)) {
                                debug(`Submit event triggered and default not prevented. ${util.ansi("Form submitted", 1)}.`);
                            }
                        }
                    }, 1);
                };
                listen(formElement.ownerDocument.body, "submit", submitHandler);
                util.forEach(formElement.querySelectorAll("BUTTON,INPUT"), (el)=>{
                    if (el.type === "submit") {
                        listen(el, "click", submitHandler);
                    }
                });
                return state = [
                    ev,
                    fieldMap,
                    formElement,
                    0,
                    util.now(util.T),
                    1,
                    commitEvent,
                    ()=>{
                        var _pendingFormSubmit_cancel;
                        return (_pendingFormSubmit_cancel = pendingFormSubmit === null || pendingFormSubmit === void 0 ? void 0 : pendingFormSubmit.cancel(false)) !== null && _pendingFormSubmit_cancel !== void 0 ? _pendingFormSubmit_cancel : false;
                    }
                ];
            });
            if (!state[1].get(el)) {
                // This will also be the case if a new field was added to the DOM.
                parseElements();
            }
            return [
                el,
                state
            ];
        };
        var _getFormState;
        const getFieldInfo = (el, [formElement, state] = (_getFormState = getFormState(el)) !== null && _getFormState !== void 0 ? _getFormState : [], field = state === null || state === void 0 ? void 0 : state[1].get(formElement))=>field && [
                state[0],
                field,
                formElement,
                state
            ];
        let currentField = util.nil;
        const handleChange = ()=>{
            if (!currentField) return;
            const [form, field, el, state] = currentField;
            const active = -(tv0 - (tv0 = getVisibleDuration()));
            const total = -(t0 - (t0 = util.now(util.T)));
            const previousValue = field[currentValue];
            const newValue = field[currentValue] = getFormFieldValue(el);
            if (newValue !== previousValue) {
                var _field;
                // If a submit is in progress, we cancel it.
                if (state[7]()) {
                    debug(`Field got changed, assuming validation error correction. ${util.ansi("Form not submitted", 1)}.`);
                }
                var _fillOrder;
                (_fillOrder = (_field = field).fillOrder) !== null && _fillOrder !== void 0 ? _fillOrder : _field.fillOrder = state[5]++;
                if (field.filled) {
                    var _field_corrections;
                    field.corrections = ((_field_corrections = field.corrections) !== null && _field_corrections !== void 0 ? _field_corrections : 0) + 1;
                }
                field.filled = util.T;
                state[3] = 2;
                util.forEach(form.fields, ([name, value])=>value.lastField = name === field.name);
            }
            field.value = getFormFieldValue(el, true);
            field.activeTime += active;
            field.totalTime += total;
            form.activeTime += active;
            form.totalTime += total;
            currentField = util.nil;
        };
        let tv0 = 0;
        let t0 = 0;
        const wireFormFields = (document1)=>document1 && listen(document1, [
                "focusin",
                "focusout",
                "change"
            ], (ev, _, current = ev.target && getFieldInfo(ev.target))=>{
                if (current) {
                    currentField = current;
                    if (ev.type === "focusin") {
                        t0 = util.now(util.T), tv0 = getVisibleDuration();
                    } else {
                        handleChange();
                    }
                }
            });
        wireFormFields(document);
        onFrame((frame)=>frame.contentDocument && wireFormFields(frame.contentDocument), true);
        return {
            processCommand: (command)=>{
                if (isFormCommand(command)) {
                    let { ref, form: action } = command;
                    if (ref) {
                        ref = forAncestorsOrSelf(typeof ref["nodeType"] === "number" ? ref : ref.target, (el, r)=>{
                            tagName(el) === "FORM" && r(el);
                        });
                        if (!ref) {
                            logError(command, "Neither the reference or its ancestors is a `<form>` element.");
                            return true;
                        }
                    }
                    const pendingFormSubmit = ref ? pendingFormSubmits.find((submit)=>submit.formElement === ref) : pendingFormSubmits.pop();
                    if (!pendingFormSubmit) {
                        if (ref && action === "submit") {
                            var _formEvents_get;
                            let manualSubmit = (_formEvents_get = formEvents.get(ref)) === null || _formEvents_get === void 0 ? void 0 : _formEvents_get[6];
                            if (manualSubmit) {
                                manualSubmit(true);
                                return true;
                            }
                        }
                        debug(`No pending submit for the form command '${command.form}'${ref ? " with the specified element reference" : ""}.`);
                    } else if (action === "validation-error") {
                        pendingFormSubmit.cancel(true);
                    } else if (action === "submit") {
                        pendingFormSubmit.complete(true);
                    }
                    return true;
                }
                return false;
            }
        };
    }
};

const consent = {
    id: "consent",
    setup (tracker) {
        const getCurrentConsent = async (callback)=>{
            return await tracker.variables.get({
                scope: "session",
                key: CONSENT_INFO_KEY,
                poll: callback,
                refresh: !callback,
                passive: !callback
            }).value();
        };
        const updateConsent = async (consent)=>{
            if (!consent) return undefined;
            let current = await getCurrentConsent();
            if (!current || types.DataUsage.equals(current, consent)) {
                return [
                    false,
                    current
                ];
            }
            await tracker.events.post({
                type: "consent",
                consent
            }, {
                async: false,
                variables: {
                    get: [
                        {
                            scope: "session",
                            key: CONSENT_INFO_KEY
                        }
                    ]
                }
            });
            return [
                true,
                consent
            ];
        };
        (()=>{
            // TODO: Make injectable to support other than GCMv2 compatible cookie disclaimers.
            // Ideally, it could be injected in the init script from the request handler.
            // However, hooking into the main categories of Google's consent mode v2 should cover most cases.
            // Since the data layer is a capped buffer that may get rotated
            // we detect changes by keeping track of the last element in the array.
            // This also handles the situation where someone replaces the data layer.
            const GCMv2Mappings = {
                // Performance
                analytics_storage: "performance",
                // Functionality
                functionality_storage: "functionality",
                // This should be covered with normal "functionality".
                // No distinction between functionality and personalization in common cookie CMP, e.g. CookieBot.
                // Not sure why Google thinks this is a different, but tail.js can be configured to treat this purpose separately.
                //
                personalization_storage: "personalization",
                ad_storage: "marketing",
                security_storage: "security"
            };
            let dataLayerHead;
            tracker({
                consent: {
                    externalSource: {
                        key: "Google Consent Mode v2",
                        frequency: 250,
                        poll: ()=>{
                            const layer = win["dataLayer"];
                            const previousHead = dataLayerHead;
                            let n = layer === null || layer === void 0 ? void 0 : layer.length;
                            if (!n || dataLayerHead === (dataLayerHead = layer[n - 1]) && dataLayerHead // Also check that the last item has a value, otherwise an empty element could trick us.
                            ) {
                                return;
                            }
                            let item;
                            while(n-- && ((item = layer[n]) !== previousHead || !previousHead // Check all items if we have not captured the previous head.
                            )){
                                const purposes = {};
                                let anonymous = true;
                                // Read from the end of the buffer to see if there is any ["consent", "update", ...] entry
                                // since last time we checked.
                                if ((item === null || item === void 0 ? void 0 : item[0]) === "consent" && item[1] === "update") {
                                    util.map(GCMv2Mappings, ([key, code])=>item[2][key] === "granted" && (purposes[code] = true, anonymous && (anonymous = // Security is considered "necessary" by tail.js,
                                        // and does not deactivate anonymous tracking by itself.
                                        code === "security" || code === "necessary")));
                                    return {
                                        classification: anonymous ? "anonymous" : "direct",
                                        purposes
                                    };
                                }
                            }
                        }
                    }
                }
            });
        })();
        const externalConsentSources = {};
        return {
            processCommand (command) {
                if (isUpdateConsentCommand(command)) {
                    const getter = command.consent.get;
                    if (getter) {
                        getCurrentConsent((current, _, previous)=>current ? getter(current, previous) : true);
                    }
                    const setter = command.consent.set;
                    setter && (async ()=>{
                        if ("consent" in setter) {
                            var _setter_callback;
                            const [updated, consent] = await updateConsent(setter.consent);
                            (_setter_callback = setter.callback) === null || _setter_callback === void 0 ? void 0 : _setter_callback.call(setter, updated, consent);
                        } else {
                            updateConsent(setter);
                        }
                    })();
                    const externalSource = command.consent.externalSource;
                    if (externalSource) {
                        var _externalConsentSources, _key;
                        const key = externalSource.key;
                        var _externalSource_frequency, _;
                        const poller = (_ = (_externalConsentSources = externalConsentSources)[_key = key]) !== null && _ !== void 0 ? _ : _externalConsentSources[_key] = util.clock({
                            frequency: (_externalSource_frequency = externalSource.frequency) !== null && _externalSource_frequency !== void 0 ? _externalSource_frequency : 1000
                        });
                        let previousConsent;
                        const pollConsent = async ()=>{
                            if (!doc.hasFocus()) return;
                            const newConsent = externalSource.poll(previousConsent);
                            if (!newConsent) return;
                            if (newConsent && !types.DataUsage.equals(previousConsent, newConsent)) {
                                var _newConsent;
                                var _source;
                                (_source = (_newConsent = newConsent).source) !== null && _source !== void 0 ? _source : _newConsent.source = key;
                                const [updated, current] = await updateConsent(newConsent);
                                if (updated) {
                                    debug(current, "Consent was updated from " + key);
                                }
                                previousConsent = newConsent;
                            }
                        };
                        poller.restart(externalSource.frequency, pollConsent).trigger();
                    }
                    return util.T;
                }
                return util.F;
            }
        };
    }
};

const defaultExtensions = [
    context,
    components,
    userInteraction,
    scroll,
    commerce,
    forms,
    consent
];

const commandTest = (...name)=>(command)=>command === name[0] || name.some((name)=>typeof name === "string" && (command === null || command === void 0 ? void 0 : command[name]) !== undefined);

const isCartCommand = commandTest("cart");

const isChangeUserCommand = commandTest("username");

const isTagAttributesCommand = commandTest("tagAttributes");

const isToggleCommand = commandTest("disable");

const isTrackingDataCommand = commandTest("boundary");

const isExtensionCommand = commandTest("extension");

const isFlushCommand = commandTest(util.T, "flush");

const isFormCommand = commandTest("form");

const isGetCommand = commandTest("get");

const isListenerCommand = commandTest("listener");

const isOrderCommand = commandTest("order");

const isScanComponentsCommand = commandTest("scan");

const isSetCommand = commandTest("set");

const isTrackerAvailableCommand = (command)=>typeof command === "function";

const isViewCommand = commandTest("view");

const isUpdateConsentCommand = commandTest("consent");

const isConfigurationCommand = commandTest("track");

exports.addViewChangedListener = addViewChangedListener;
exports.anyVariableScope = anyVariableScope;
exports.checkTrackingEnabled = checkTrackingEnabled;
exports.commerce = commerce;
exports.componentDomConfiguration = componentDomConfiguration;
exports.components = components;
exports.consent = consent;
exports.context = context;
exports.createViewDurationTimer = createViewDurationTimer;
exports.defaultExtensions = defaultExtensions;
exports.detectDeviceType = detectDeviceType;
exports.forms = forms;
exports.getComponentContext = getComponentContext;
exports.getCurrentViewId = getCurrentViewId;
exports.getElementInfo = getElementInfo;
exports.getViewTimeOffset = getViewTimeOffset;
exports.getVisibleDuration = getVisibleDuration;
exports.initializeTracker = initializeTracker;
exports.isCartCommand = isCartCommand;
exports.isChangeUserCommand = isChangeUserCommand;
exports.isConfigurationCommand = isConfigurationCommand;
exports.isExtensionCommand = isExtensionCommand;
exports.isFlushCommand = isFlushCommand;
exports.isFormCommand = isFormCommand;
exports.isGetCommand = isGetCommand;
exports.isListenerCommand = isListenerCommand;
exports.isLocalScopeKey = isLocalScopeKey;
exports.isOrderCommand = isOrderCommand;
exports.isScanComponentsCommand = isScanComponentsCommand;
exports.isSetCommand = isSetCommand;
exports.isTagAttributesCommand = isTagAttributesCommand;
exports.isToggleCommand = isToggleCommand;
exports.isTrackerAvailableCommand = isTrackerAvailableCommand;
exports.isTrackingDataCommand = isTrackingDataCommand;
exports.isUpdateConsentCommand = isUpdateConsentCommand;
exports.isViewCommand = isViewCommand;
exports.localVariableScope = localVariableScope;
exports.maskEntityId = maskEntityId;
exports.onFrame = onFrame;
exports.parseCartEventData = parseCartEventData;
exports.postUserAgentEvent = postUserAgentEvent;
exports.pushNavigationSource = pushNavigationSource;
exports.scroll = scroll;
exports.stringToVariableKey = stringToVariableKey;
exports.tryGetCartEventData = tryGetCartEventData;
exports.userInteraction = userInteraction;
exports.variableKeyToString = variableKeyToString;
