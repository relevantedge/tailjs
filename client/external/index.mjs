import { T, createEnumParser } from '@tailjs/util';
import { VariableServerScope } from '@tailjs/types';

const PLACEHOLDER_SCRIPT = (trackerName = "tail", quote)=>{
    var _globalThis, _trackerName;
    if (quote) {
        const reference = `window[${JSON.stringify(trackerName)}]`;
        return `(${reference}??=(...c)=>${reference}._?.push([c]) ?? ${reference}(...c))._=[];`;
    }
    var _;
    return ((_ = (_globalThis = globalThis)[_trackerName = trackerName]) !== null && _ !== void 0 ? _ : _globalThis[_trackerName] = (...c)=>{
        var _globalThis_trackerName__;
        var _globalThis_trackerName___push;
        return (_globalThis_trackerName___push = (_globalThis_trackerName__ = globalThis[trackerName]._) === null || _globalThis_trackerName__ === void 0 ? void 0 : _globalThis_trackerName__.push(c)) !== null && _globalThis_trackerName___push !== void 0 ? _globalThis_trackerName___push : globalThis[trackerName](...c);
    })._ = [];
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

const CLIENT_CONFIG = trackerConfig;
// Don't pollute globalThis in server context.
let ssrTracker;
const setTrackerName = (name)=>{
    if (typeof window === "undefined") {
        return ssrTracker !== null && ssrTracker !== void 0 ? ssrTracker : ssrTracker = ()=>{};
    }
    const prop = Object.getOwnPropertyDescriptor(globalThis, CLIENT_CONFIG.name);
    if ((prop === null || prop === void 0 ? void 0 : prop.value) && prop.writable) {
        Object.defineProperty(globalThis, name, {
            value: prop.value,
            writable: prop.value[isTracker]
        });
    } else if (!globalThis[name]) {
        PLACEHOLDER_SCRIPT(name);
    }
    return globalThis[CLIENT_CONFIG.name = name];
};
let tail = setTrackerName(CLIENT_CONFIG.name);
tail((actualTail)=>tail = actualTail);

const commandTest = (...name)=>(command)=>command === name[0] || name.some((name)=>typeof name === "string" && (command === null || command === void 0 ? void 0 : command[name]) !== undefined);

const isCartCommand = commandTest("cart");

const isChangeUserCommand = commandTest("username");

const isTagAttributesCommand = commandTest("tagAttributes");

const isToggleCommand = commandTest("disable");

const isTrackingDataCommand = commandTest("boundary");

const isExtensionCommand = commandTest("extension");

const isFlushCommand = commandTest(T, "flush");

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
const localVariableScope = createEnumParser("local variable scope", levels);
const anyVariableScope = createEnumParser("variable scope", {
    ...localVariableScope,
    ...VariableServerScope
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

export { CLIENT_CONFIG, anyVariableScope, isCartCommand, isChangeUserCommand, isConfigurationCommand, isExtensionCommand, isFlushCommand, isFormCommand, isGetCommand, isListenerCommand, isLocalScopeKey, isOrderCommand, isScanComponentsCommand, isSetCommand, isTagAttributesCommand, isToggleCommand, isTrackerAvailableCommand, isTrackingDataCommand, isUpdateConsentCommand, isViewCommand, localVariableScope, maskEntityId, setTrackerName, stringToVariableKey, tail, variableKeyToString };
