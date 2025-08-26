'use strict';

require('react');
var external = require('@tailjs/client/external');
var jsx = require('@tailjs/react/jsx');
var util = require('@tailjs/util');
var client = require('./client.cjs');

const MapState = (props)=>{
    console.warn("The `MapState` component is obsolete. Use the `TailJsPlugin` from `@tailjs/react/webpack` instead.");
    return (props)=>props.children;
};

const parseRules = (rules, invert = false)=>{
    if (rules == null) return undefined;
    let expressions;
    let names;
    let matchers;
    let set;
    for (const rule of rules){
        if (!rule) continue;
        if (typeof rule === "string") {
            (names !== null && names !== void 0 ? names : names = new Set()).add(rule);
        } else if (rule instanceof RegExp) {
            (expressions !== null && expressions !== void 0 ? expressions : expressions = []).push(rule);
        } else if ("match" in rule) {
            (matchers !== null && matchers !== void 0 ? matchers : matchers = []).push(rule.match);
        } else {
            (set !== null && set !== void 0 ? set : set = new Set()).add(rule);
        }
    }
    if (!expressions && !names && !set && !matchers) {
        return undefined;
    }
    return (type)=>!!(invert ^ (type && ((set === null || set === void 0 ? void 0 : set.has(type)) || (typeof type === "string" ? names === null || names === void 0 ? void 0 : names.has(type) : (names === null || names === void 0 ? void 0 : names.has(type.name)) || (names === null || names === void 0 ? void 0 : names.has(type.displayName))) || (expressions === null || expressions === void 0 ? void 0 : expressions.some((matcher)=>{
            var _type_name, _type_displayName;
            return typeof type === "string" ? type.match(matcher) : (((_type_name = type.name) === null || _type_name === void 0 ? void 0 : _type_name.match(matcher)) || ((_type_displayName = type.displayName) === null || _type_displayName === void 0 ? void 0 : _type_displayName.match(matcher))) && (set !== null && set !== void 0 ? set : set = new Set()).add(type);
        })) || (matchers === null || matchers === void 0 ? void 0 : matchers.some((matcher)=>matcher(type))) || false)));
};
const concatRules = (first, second)=>first || second ? util.concat(first, second) : undefined;
const compileIncludeExcludeRules = (include, exclude)=>{
    const includeRule = parseRules(include, true);
    const excludeRule = parseRules(exclude, false);
    if (!includeRule) return excludeRule !== null && excludeRule !== void 0 ? excludeRule : undefined;
    if (!excludeRule) return includeRule;
    return (el)=>!includeRule(el) || excludeRule(el);
};

const Tracker = (props)=>{
    console.warn("The `Tracker~ component is obsolete. Use the `TailJsPlugin` from `@tailjs/react/webpack` instead.");
    return (props)=>props.children;
};

function useTracking(data) {
    // TODO: Add a tracker component.
    console.warn("The `useTracking` hook is currently not available due to the JSX visitor changes in v0.39.3. Use the `TrackerBoundary` component for now.");
    return;
// if (currentContext) {
//   currentContext.state = mergeStates(
//     currentContext.state,
//     typeof data === "function"
//       ? data(currentContext.state)
//       : { ...currentContext.state, ...data }
//   );
// }
}

let config;
const isComponent = ()=>{};
const updateConfig = (update)=>{
    config = update(config);
    jsx.updateConfig(()=>config === null || config === void 0 ? void 0 : config.tracker);
};
const TrackingBoundary = jsx.TrackingBoundary;
const withTracking = jsx.withTracking;
const tracking = (track)=>({
        "data-tailjs": {
            track
        }
    });
tracking.form = (values, privacy)=>tracking(!values ? {
        forms: false
    } : {
        forms: true,
        formFields: {
            values,
            privacy
        }
    });
tracking.field = (values, privacy)=>tracking({
        formFields: {
            values,
            privacy
        }
    });

Object.defineProperty(exports, 'tail', {
  enumerable: true,
  get: function () { return external.tail; }
});
exports.useConsent = client.useConsent;
exports.useTrackerVariable = client.useTrackerVariable;
exports.MapState = MapState;
exports.Tracker = Tracker;
exports.TrackingBoundary = TrackingBoundary;
exports.compileIncludeExcludeRules = compileIncludeExcludeRules;
exports.concatRules = concatRules;
exports.isComponent = isComponent;
exports.tracking = tracking;
exports.updateConfig = updateConfig;
exports.useTracking = useTracking;
exports.withTracking = withTracking;
