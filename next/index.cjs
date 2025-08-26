'use strict';

var version = require('@tailjs/client/version');
require('react');

const createClientConfiguration = (config)=>{
    var _config;
    var _tracker;
    (_tracker = (_config = config).tracker) !== null && _tracker !== void 0 ? _tracker : _config.tracker = {};
    let script = config.tracker.script;
    let appendRevision = true;
    if (typeof script === "object") {
        var _script_appendRevision;
        appendRevision = (_script_appendRevision = script.appendRevision) !== null && _script_appendRevision !== void 0 ? _script_appendRevision : true;
        script = script.route;
    }
    if (script !== false) {
        if (!script || typeof script !== "string") {
            script = "/api/tailjs";
        }
        if (appendRevision) {
            script = version.appendClientScriptRevision(script);
        }
        config.tracker.script = {
            src: script
        };
    }
    return config;
};

/**
 * @deprecated Use the TailJsPlugin from @tailjs/react/webpack instead.
 */ const bakeTracker = (props, clientTracker, react)=>{
    console.warn("This component is obsolete. Use the `TailJsPlugin` from `@tailjs/react/webpack` instead.");
    return (props)=>props.children;
};

exports.bakeTracker = bakeTracker;
exports.createClientConfiguration = createClientConfiguration;
