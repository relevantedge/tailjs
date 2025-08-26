'use strict';

var react = require('react');
var external = require('@tailjs/client/external');
var types = require('@tailjs/types');

const { TrackingBoundary } = require("./TrackingBoundary.js");
const baseTracker = external.tail;
const FRAGMENT_SYMBOL = Symbol.for("react.fragment");
let tracker = baseTracker;
let config = null;
let stateMapper = null;
let script = null;
let customRef = null;
const clientReferenceSymbol = Symbol.for("react.client.reference");
const isClientComponentReference = (type)=>(type === null || type === void 0 ? void 0 : type.$$typeof) == clientReferenceSymbol;
const flattenStateMapperCollection = (mappers)=>!mappers ? [] : typeof mappers === "function" ? [
        mappers
    ] : mappers.flatMap(flattenStateMapperCollection);
const chainStateMappers = (collection)=>{
    const mappers = flattenStateMapperCollection(collection);
    return mappers.length > 1 ? (currentState, type, props)=>{
        let mergedState = currentState;
        for (const mapper of mappers){
            var _appendTrackingData;
            mergedState = (_appendTrackingData = types.appendTrackingData(undefined, mapper(mergedState, type, props))) !== null && _appendTrackingData !== void 0 ? _appendTrackingData : mergedState;
        }
        return mergedState === currentState ? undefined : mergedState;
    } : mappers.length > 0 ? mappers[0] : null;
};
let disabled = false;
const updateConfig = (update)=>{
    var _config_script;
    config = update(stateMapper);
    var _config_disabled;
    disabled = (_config_disabled = config === null || config === void 0 ? void 0 : config.disabled) !== null && _config_disabled !== void 0 ? _config_disabled : false;
    if (config === null || config === void 0 ? void 0 : config.map) {
        if ("state" in config.map) {
            stateMapper = chainStateMappers(config.map.state);
            var _config_map_ref;
            customRef = (_config_map_ref = config.map.ref) !== null && _config_map_ref !== void 0 ? _config_map_ref : null;
        } else {
            stateMapper = (config === null || config === void 0 ? void 0 : config.map) ? chainStateMappers(config.map) : null;
            customRef = null;
        }
    }
    script = (config === null || config === void 0 ? void 0 : (_config_script = config.script) === null || _config_script === void 0 ? void 0 : _config_script.src) || typeof (config === null || config === void 0 ? void 0 : config.script) === "function" ? config.script : false;
    var _config_trackJsx;
    const trackJsx = (_config_trackJsx = config === null || config === void 0 ? void 0 : config.trackJsx) !== null && _config_trackJsx !== void 0 ? _config_trackJsx : false;
    if (trackJsx !== false) {
        const innerMapper = stateMapper;
        stateMapper = (currentState, type, props)=>{
            var _innerMapper;
            currentState = (_innerMapper = innerMapper === null || innerMapper === void 0 ? void 0 : innerMapper(currentState, type, props)) !== null && _innerMapper !== void 0 ? _innerMapper : currentState;
            if (typeof type === "function") {
                let displayName = trackJsx === true ? type.displayName : trackJsx(type);
                if (displayName) {
                    return [
                        currentState,
                        {
                            components: [
                                {
                                    id: displayName,
                                    name: displayName,
                                    inferred: true,
                                    source: "jsx"
                                }
                            ]
                        }
                    ];
                }
            }
        };
    }
    const key = config === null || config === void 0 ? void 0 : config.key;
    tracker = key ? (...commands)=>baseTracker(key, ...commands) : baseTracker;
};
const withKey = (el, key)=>(el === null || el === void 0 ? void 0 : el.key) || !key ? el : setProperty(el, "key", key);
const withProp = (obj, prop, value)=>{
    var _obj_props;
    var _obj_props1;
    return (obj === null || obj === void 0 ? void 0 : (_obj_props = obj.props) === null || _obj_props === void 0 ? void 0 : _obj_props[prop]) === value ? obj : setProperty(obj, "props", setProperty((_obj_props1 = obj.props) !== null && _obj_props1 !== void 0 ? _obj_props1 : {}, prop, value));
};
const setProperty = (obj, name, value)=>{
    if (obj == null || typeof obj !== "object") {
        return obj;
    }
    if (Object.isFrozen(obj)) {
        if (Array.isArray(obj)) {
            return [
                ...obj
            ];
        }
        if (!(name in obj) && value == undefined) {
            return obj;
        }
        const clone = {};
        for (const prop of Object.getOwnPropertyNames(obj)){
            clone[prop] = obj[prop];
        }
        obj = clone;
    // // This only happens in debug mode, so the performance overhead doesn't matter in prod.
    // const props = Object.getOwnPropertyDescriptors(obj);
    // for (let prop in props) {
    //   if (props[prop].writable === false) {
    //     props[prop].writable = true;
    //   }
    // }
    // obj = Object.defineProperties({}, props) as T;
    }
    if (value === undefined) {
        delete obj[name];
    } else {
        obj[name] = value;
    }
    return obj;
};
/** This is allowed on all elements/components to explicitly define the boundary data. */ const EXPLICIT_STATE_PROP = "data-tailjs";
const currentElementStates = new WeakMap();
const REACT_BOUNDARY_DATA_KEY = Symbol("react boundary");
const bindState = (el, state)=>{
    if (currentElementStates.get(el) === state) {
        // Don't call the tracker more than necessary.
        return;
    }
    currentElementStates.set(el, state);
    if ((customRef === null || customRef === void 0 ? void 0 : customRef(tracker, el, state)) === false) {
        return;
    }
    const view = state.view;
    if (view) {
        tracker({
            view
        });
        state = {
            ...state,
            view: undefined
        };
    }
    var _state_layer;
    tracker({
        boundary: el,
        ...state,
        layer: (_state_layer = state.layer) !== null && _state_layer !== void 0 ? _state_layer : REACT_BOUNDARY_DATA_KEY
    });
};
const parseStateProperty = (props, prop)=>{
    let state = props === null || props === void 0 ? void 0 : props[prop];
    if (typeof state === "string") {
        try {
            return JSON.parse(state);
        } catch (e) {}
    } else if (state && typeof state === "object") {
        return state;
    }
    return undefined;
};
const getChildArray = (children)=>children == null ? [] : Array.isArray(children) ? [
        ...children.map((child, i)=>withKey(child, "__child_" + i))
    ] : [
        withKey(children, "child")
    ];
const getStateFromProps = (el)=>{
    if (!el.props) {
        return undefined;
    }
    const { type, props } = el;
    let state = parseStateProperty(props, EXPLICIT_STATE_PROP);
    if (stateMapper && el.type) {
        const mappedState = types.appendTrackingData(undefined, stateMapper(undefined, isClientComponentReference(type) ? {
            $$typeof: type.$$typeof,
            $$id: type.$$id
        } // Copy type to free the consumer from handling weird "server can't call client" errors.
         : type, props));
        state = state ? types.appendTrackingData(mappedState, state) : mappedState;
    }
    state = types.normalizeTrackingData(state, true);
    return state;
};
const visit = (factory, original)=>{
    if (disabled || !(original === null || original === void 0 ? void 0 : original.props)) {
        return;
    }
    var _tryInjectScript;
    original = (_tryInjectScript = tryInjectScript(factory, original)) !== null && _tryInjectScript !== void 0 ? _tryInjectScript : original;
    if (!stateMapper) {
        return original;
    }
    let state;
    if (typeof original.type === "string") {
        if (original.props && EXPLICIT_STATE_PROP in original.props) {
            state = types.normalizeTrackingData(parseStateProperty(original.props, EXPLICIT_STATE_PROP));
            original = withProp(original, EXPLICIT_STATE_PROP, undefined);
            if (state) {
                return withKey(factory(TrackingBoundary, {
                    state,
                    children: [
                        withKey(original, "wrapped")
                    ]
                }), original.key);
            }
        }
    } else if (original.type !== FRAGMENT_SYMBOL) {
        const state = getStateFromProps(original);
        if (state || isClientComponentReference(original.type)) {
            return withKey(factory(TrackingBoundary, {
                state,
                children: [
                    withKey(original, "wrapped")
                ]
            }), original.key);
        }
    }
    return original;
};
const withTracking = (component, mapState)=>(props)=>{
        const mapped = mapState(props);
        return mapped // Empty object will also create a TrackingBoundary to support state that depends on a parameter (e.g., sometimes returns `{}` sometimes return `{tags: ...}`)
         ? react.createElement(TrackingBoundary, {
            state: types.appendTrackingData(null, mapped),
            children: [
                react.createElement(component, props)
            ]
        }) : react.createElement(component, props);
    };
let hasHead = false;
const TrackingScript = react.memo(({ head })=>{
    if (locallyDisabled || disabled || !script || !script.src) {
        return null;
    }
    if (hasHead && head) {
        // Reset (child under html element comes last).
        hasHead = false;
        if (head) {
            return null;
        }
    }
    var _script_async;
    const scriptElement = react.createElement("script", {
        src: script.src,
        async: (_script_async = script.async) !== null && _script_async !== void 0 ? _script_async : true,
        ...script.attrs
    });
    return head ? react.createElement("head", {
        children: [
            withKey(scriptElement, "__tailjs")
        ]
    }) : scriptElement;
}, ()=>true);
const EnsureScript = ({ children })=>{
    const htmlChildren = getChildArray(children);
    const bodyIndex = htmlChildren.findIndex((el)=>{
        if (el.type === "body") {
            var _parseStateProperty_track, _parseStateProperty;
            if (((_parseStateProperty = parseStateProperty(el.props, EXPLICIT_STATE_PROP)) === null || _parseStateProperty === void 0 ? void 0 : (_parseStateProperty_track = _parseStateProperty.track) === null || _parseStateProperty_track === void 0 ? void 0 : _parseStateProperty_track.disable) === true) {
                locallyDisabled = true;
            }
            return true;
        }
        return false;
    });
    htmlChildren.splice(bodyIndex === -1 ? htmlChildren.length : bodyIndex, 0, // Utilize that react components are rendered depth-first, so our "EnsureHeadScript" component will not be rendered
    // before any preceding components might have created a `<head />` element which we capture in `tryInjectScript`.
    react.createElement(TrackingScript, {
        head: true
    }));
    return htmlChildren;
};
let locallyDisabled = false;
const tryInjectScript = (factory, original)=>{
    if (!script || disabled) {
        return;
    }
    switch(original.type){
        case "html":
            var _parseStateProperty_track, _parseStateProperty, _original_props;
            // Reset state
            hasHead = false;
            locallyDisabled = ((_parseStateProperty = parseStateProperty(original.props, EXPLICIT_STATE_PROP)) === null || _parseStateProperty === void 0 ? void 0 : (_parseStateProperty_track = _parseStateProperty.track) === null || _parseStateProperty_track === void 0 ? void 0 : _parseStateProperty_track.disable) === true;
            const wrapper = factory(EnsureScript, {
                children: getChildArray((_original_props = original.props) === null || _original_props === void 0 ? void 0 : _original_props.children)
            });
            return withProp(original, "children", [
                withKey(wrapper, "wrapped")
            ]);
        case "head":
            var _original_props1;
            hasHead = true;
            var _original_props_children;
            const headChildren = getChildArray((_original_props_children = (_original_props1 = original.props) === null || _original_props1 === void 0 ? void 0 : _original_props1.children) !== null && _original_props_children !== void 0 ? _original_props_children : []);
            let insertIndex = 0;
            headChildren.forEach((child, index)=>{
                if (child.type === "title" || child.type === "meta" && [
                    "description",
                    "charset",
                    "viewport"
                ].includes(child.props.name)) {
                    insertIndex = index + 1;
                }
            });
            headChildren.splice(insertIndex, 0, withKey(factory(TrackingScript, {}), "__tailjs"));
            return withProp(original, "children", headChildren);
    }
};

exports.bindState = bindState;
exports.getStateFromProps = getStateFromProps;
exports.updateConfig = updateConfig;
exports.visit = visit;
exports.withTracking = withTracking;
