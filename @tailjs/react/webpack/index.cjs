'use strict';

var path = require('path');
var resolveFrom = require('resolve-from');

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
class TailJsPlugin {
    apply(compiler) {
        // const {  customReactPackage, originalReactPackage, packagePath } = this.options;
        const context = compiler.context;
        const mappings = {
            react: "@tailjs/react/jsx",
            "react/jsx-runtime": "@tailjs/react/jsx/jsx-runtime",
            "react/jsx-dev-runtime": "@tailjs/react/jsx/jsx-dev-runtime"
        };
        // Everything in the @tailjs/react package.
        const packagePath = path.resolve(path.join(//@ts-ignore
        __dirname, ".."));
        const isPackageContext = (context)=>context === packagePath || path.dirname(context).startsWith(packagePath);
        const tryMapRequest = (request, context)=>{
            if (this.config.disable || context && isPackageContext(context)) {
                return undefined;
            }
            const aliased = request.replace(RegExp("(?<=^|\\s)([^\\s]+)$"), (name)=>{
                var _mappings_name;
                return (_mappings_name = mappings[name]) !== null && _mappings_name !== void 0 ? _mappings_name : name;
            });
            return aliased !== request ? aliased : undefined;
        };
        compiler.hooks.environment.tap("TailJsPlugin", ()=>{
            let externals = compiler.options.externals;
            if (!Array.isArray(externals)) {
                externals = externals ? [
                    externals
                ] : [];
            }
            externals.push(async (data)=>{
                var _data_request;
                if ((_data_request = data.request) === null || _data_request === void 0 ? void 0 : _data_request.endsWith("/tailjs.client.config.js")) {
                    var _this_config_config;
                    return (_this_config_config = this.config.config) !== null && _this_config_config !== void 0 ? _this_config_config : "/tailjs.client.config";
                }
            });
            if (this.config.config) {
                externals.push(async (data)=>{
                    var _data_request;
                    if ((_data_request = data.request) === null || _data_request === void 0 ? void 0 : _data_request.endsWith("/tailjs.client.config")) {
                        return this.config.config;
                    }
                });
            }
            externals = externals.map((external)=>{
                if (!this.config.disable && (typeof external === "function" || typeof external === "string" && tryMapRequest(external))) {
                    return async (data)=>{
                        let calledBack = false;
                        let callbackResult = undefined;
                        let result = typeof external === "function" ? await external(data, (err, result)=>{
                            calledBack = true;
                            callbackResult = result;
                        }) : external;
                        if (calledBack) {
                            result = callbackResult;
                        }
                        const mapped = typeof result === "string" && tryMapRequest(result, data.context);
                        return mapped ? undefined : result;
                    };
                }
                return external;
            });
            externals.push({
                "@tailjs/react/webpack": "var {}"
            });
            compiler.options.externals = externals;
        });
        if (!this.config.disable) {
            compiler.hooks.normalModuleFactory.tap("TailJsPlugin", (factory)=>{
                factory.hooks.resolve.tapAsync("TailJsPlugin", (resolveData, callback)=>{
                    const { request, contextInfo: { issuer } } = resolveData;
                    let mapped = tryMapRequest(request, issuer);
                    if (mapped) {
                        resolveData.request = mapped;
                    } else if (isPackageContext(issuer) && mappings[request]) {
                        if (this.config.resolveReactFromContext) {
                            resolveData.request = resolveFrom(context, request);
                        }
                    }
                    callback();
                });
            });
        }
    }
    constructor(config = {}){
        _define_property(this, "config", void 0);
        this.config = config;
    }
}

exports.TailJsPlugin = TailJsPlugin;
