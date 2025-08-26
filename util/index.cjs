'use strict';

const getRootPrototype = (value)=>{
    let proto = value;
    while(proto){
        proto = Object.getPrototypeOf(value = proto);
    }
    return value;
};
const findPrototypeFrame = (frameWindow, matchPrototype)=>{
    if (!frameWindow || getRootPrototype(frameWindow) === matchPrototype) {
        return frameWindow;
    }
    for (const frame of frameWindow.document.getElementsByTagName("iframe")){
        try {
            if (frameWindow = findPrototypeFrame(frame.contentWindow, matchPrototype)) {
                return frameWindow;
            }
        } catch (e) {
        // Cross domain issue.
        }
    }
};
/**
 * When in iframes, we need to copy the prototype methods from the global scope's prototypes since,
 * e.g., `Object` in an iframe is different from `Object` in the top frame.
 */ const findDeclaringScope = (target)=>target == null ? target : typeof window !== "undefined" ? findPrototypeFrame(window, getRootPrototype(target)) : globalThis;

let stopInvoked = false;
const skip = Symbol();
const stop = (value)=>(stopInvoked = true, value);
// #region region_iterator_implementations
const forEachSymbol = Symbol();
const asyncIteratorFactorySymbol = Symbol();
const symbolIterator$1 = Symbol.iterator;
// Prototype extensions are assigned on-demand to exclude them when tree-shaking code that are not using any of the iterators.
const ensureForEachImplementations = (target, error, retry)=>{
    if (target == null || (target === null || target === void 0 ? void 0 : target[forEachSymbol])) {
        throw error;
    }
    let scope = findDeclaringScope(target);
    if (!scope) {
        throw error;
    }
    const forEachIterable = // Factory to generate separate functions for each prototype. JavaScript JIT compilers probably like that.
    ()=>(target, projection, mapped, seed, context)=>{
            let projected, i = 0;
            for (const item of target){
                if ((projected = projection ? projection(item, i++, seed, context) : item) !== skip) {
                    if (projected === stop) {
                        break;
                    }
                    seed = projected;
                    if (mapped) mapped.push(projected);
                    if (stopInvoked) {
                        stopInvoked = false;
                        break;
                    }
                }
            }
            return mapped || seed;
        };
    scope.Array.prototype[forEachSymbol] = (target, projection, mapped, seed, context)=>{
        let projected, item;
        for(let i = 0, n = target.length; i < n; i++){
            item = target[i];
            if ((projected = projection ? projection(item, i, seed, context) : item) !== skip) {
                if (projected === stop) {
                    break;
                }
                seed = projected;
                if (mapped) {
                    mapped.push(projected);
                }
                if (stopInvoked) {
                    stopInvoked = false;
                    break;
                }
            }
        }
        return mapped || seed;
    };
    const genericForEachIterable = forEachIterable();
    scope.Object.prototype[forEachSymbol] = (target, projection, mapped, seed, context)=>{
        if (target[symbolIterator$1]) {
            if (target.constructor === Object) {
                return genericForEachIterable(target, projection, mapped, seed, context);
            }
            return (Object.getPrototypeOf(target)[forEachSymbol] = forEachIterable())(target, projection, mapped, seed, context);
        }
        let projected, item, i = 0;
        for(const key in target){
            item = [
                key,
                target[key]
            ];
            if ((projected = projection ? projection(item, i++, seed, context) : item) !== skip) {
                if (projected === stop) {
                    break;
                }
                seed = projected;
                if (mapped) mapped.push(projected);
                if (stopInvoked) {
                    stopInvoked = false;
                    break;
                }
            }
        }
        return mapped || seed;
    };
    scope.Object.prototype[asyncIteratorFactorySymbol] = function() {
        if (this[symbolIterator$1] || this[symbolAsyncIterator]) {
            if (this.constructor === Object) {
                var _this_symbolAsyncIterator;
                return (_this_symbolAsyncIterator = this[symbolAsyncIterator]()) !== null && _this_symbolAsyncIterator !== void 0 ? _this_symbolAsyncIterator : this[symbolIterator$1]();
            }
            const proto = Object.getPrototypeOf(this);
            var _proto_symbolAsyncIterator;
            proto[asyncIteratorFactorySymbol] = (_proto_symbolAsyncIterator = proto[symbolAsyncIterator]) !== null && _proto_symbolAsyncIterator !== void 0 ? _proto_symbolAsyncIterator : proto[symbolIterator$1];
            return this[asyncIteratorFactorySymbol]();
        }
        return iterateEntries(this);
    };
    for (const proto of [
        scope.Map.prototype,
        scope.WeakMap.prototype,
        scope.Set.prototype,
        scope.WeakSet.prototype,
        // Generator function
        Object.getPrototypeOf(function*() {})
    ]){
        proto[forEachSymbol] = forEachIterable();
        proto[asyncIteratorFactorySymbol] = proto[symbolIterator$1];
    }
    scope.Number.prototype[forEachSymbol] = (target, projection, mapped, seed, context)=>genericForEachIterable(range(target), projection, mapped, seed, context);
    scope.Number.prototype[asyncIteratorFactorySymbol] = range;
    scope.Function.prototype[forEachSymbol] = (target, projection, mapped, seed, context)=>genericForEachIterable(traverse(target), projection, mapped, seed, context);
    scope.Function.prototype[asyncIteratorFactorySymbol] = traverse;
    return retry();
};
// #endregion
function* range(length = this) {
    for(let i = 0; i < length; i++)yield i;
}
function* traverse(next = this) {
    let item = undefined;
    while((item = next(item)) !== undefined)yield item;
}
function* iterateEntries(source) {
    for(const key in source){
        yield [
            key,
            source[key]
        ];
    }
}
const forEach = (source, projection, seed, context)=>{
    try {
        var _source_forEachSymbol;
        return source ? (_source_forEachSymbol = source[forEachSymbol](source, projection, undefined, seed, context)) !== null && _source_forEachSymbol !== void 0 ? _source_forEachSymbol : seed : source == null ? source : undefined;
    } catch (e) {
        return ensureForEachImplementations(source, e, ()=>forEach(source, projection, seed, context));
    }
};
let map = (source, projection, target = [], seed, context = source)=>{
    try {
        return !source && source !== 0 && source !== "" ? source == null ? source : undefined : source[forEachSymbol](source, projection, target, seed, context);
    } catch (e) {
        return ensureForEachImplementations(source, e, ()=>map(source, projection, target, seed, context));
    }
};
const batch = (source, batchSize)=>{
    if (source == null) return source;
    const batches = [];
    let batch = [];
    for (const item of source){
        batch.push(item);
        if (batch.length === batchSize) {
            batches.push(batch);
            batch = [];
        }
    }
    if (batch.length > 0) {
        batches.push(batch);
    }
    return batches;
};
/** Creates an array with the parameters that are not false'ish */ const truish = (...values)=>filter(values.length === 1 ? values[0] : values, false);
let filter = (items, filter = true, invert = false)=>map(items, filter === true ? (item)=>item !== null && item !== void 0 ? item : skip : !filter ? (item)=>item || skip : filter.has ? (item)=>item == null || filter.has(item) === invert ? skip : item : (item, index, prev)=>!filter(item, index, prev, items) === invert ? item : skip);
const take = (source, count, projection)=>map(source, (item, index, prev)=>(index === count + 1 && (stopInvoked = true), projection ? projection(item, index, prev) : item));
const first = (source, predicate)=>!predicate && isArray(source) ? source[0] : forEach(source, (item, index, prev)=>((!predicate || predicate(item, index, prev, source)) && (stopInvoked = true), item));
const last = (source, predicate)=>!predicate && isArray(source) ? source[source.length - 1] : forEach(source, (item, index, prev)=>!predicate || predicate(item, index, prev, source) ? item : skip);
const count = (source, predicate)=>{
    let n = 0;
    forEach(source, predicate ? (item, index, prev)=>predicate(item, index, prev, source) && ++n : ()=>++n);
    return n;
};
const flatMap = (source, projection, depth = -1, target = [], seed, context = source)=>map(source, (item, index, previous)=>(projection ? item = projection(item, index, previous) : item) != null && item[Symbol.iterator] && typeof item !== "string" && depth ? (flatMap(item, undefined, depth - 1, target, item), skip) : item, target, seed, context);
const group = (source, projection, map)=>{
    var _groups, _kv_;
    if (projection != null && typeof projection !== "function") {
        [projection, map] = [
            undefined,
            projection
        ];
    }
    let groups, kv;
    forEach(source, map !== false ? (groups = new Map(), (item, index, prev)=>{
        kv = projection ? projection(item, index, prev) : item;
        if (kv[0] !== undefined) {
            get(groups, kv[0], ()=>[]).push(kv[1]);
        }
    }) : (groups = {}, (item, index, prev)=>{
        var _;
        return (kv = projection ? projection(item, index, prev) : item) && kv[0] !== undefined && ((_ = (_groups = groups)[_kv_ = kv[0]]) !== null && _ !== void 0 ? _ : _groups[_kv_] = []).push(kv[1]);
    }));
    return groups;
};
let forEachAwait = (source, projection, seed, context)=>{
    try {
        return iterateAsync(source, projection, undefined, seed, context);
    } catch (e) {
        return ensureForEachImplementations(source, e, ()=>forEachAwait(source, projection, seed, context));
    }
};
let mapAwait = (source, projection, target = [], seed, context)=>{
    try {
        return iterateAsync(source, projection, target, seed, context);
    } catch (e) {
        return ensureForEachImplementations(source, e, ()=>mapAwait(source, projection, target, seed, context));
    }
};
const iterateAsync = async (source, projection, mapped, seed, context)=>{
    if ((source = await source) == null) return source;
    if (source === false) return undefined;
    const iterator = source[asyncIteratorFactorySymbol]();
    let result;
    let projected, i = 0;
    while(result = iterator.next()){
        if (isPromiseLike(result)) {
            result = await result;
        }
        if (result.done) {
            break;
        }
        let item = result.value;
        if (isPromiseLike(item)) {
            item = await item;
        }
        if ((projected = await (projection ? projection(item, i++, seed, context) : item)) !== skip) {
            if (projected === stop) {
                break;
            }
            seed = projected;
            mapped === null || mapped === void 0 ? void 0 : mapped.push(projected);
            if (stopInvoked) {
                stopInvoked = false;
                break;
            }
        }
    }
    return mapped || seed;
};
const collect = (source, generator, includeSelf = true, collected)=>{
    if (source == null) return source;
    const root = collected;
    collected !== null && collected !== void 0 ? collected : collected = new Set();
    if (source[symbolIterator$1] && typeof source !== "string") {
        for (const item of source){
            if (collect(item, generator, includeSelf, collected) === stop) {
                break;
            }
        }
    } else if (!collected.has(source)) {
        if (includeSelf) {
            collected.add(source);
        }
        let generated = generator(source);
        if (generated === stop) return root ? stop : collected;
        if (generated !== skip) {
            collect(generated, generator, true, collected);
        }
    }
    return collected;
};
const distinct = (source)=>source == null ? source : source instanceof Set ? source : new Set(source[symbolIterator$1] && typeof source !== "string" ? source : [
        source
    ]);
const iterable = (source)=>source === void 0 ? [] : (source === null || source === void 0 ? void 0 : source[symbolIterator$1]) && typeof source !== "string" ? source : [
        source
    ];
const array = (source)=>source == null ? source : isArray(source) ? source : source[symbolIterator$1] && typeof source !== "string" ? [
        ...source
    ] : [
        source
    ];
const some = (source, predicate)=>forEach(source, (item, index, prev)=>(predicate ? predicate(item, index, prev, source) : item) ? stopInvoked = true : item) === true;
const all = (source, predicate)=>forEach(source, (item, index, prev)=>!(predicate ? predicate(item, index, prev, source) : item) ? !(stopInvoked = true) : item) !== false;
const concat = (arg0, ...other)=>{
    if (other.length || !isIterable(arg0)) {
        arg0 = [
            arg0,
            ...other
        ];
    }
    let result;
    for (const arg of arg0){
        if (arg == null) continue;
        if (isIterable(arg)) {
            (result !== null && result !== void 0 ? result : result = []).push(...arg);
            continue;
        }
        (result !== null && result !== void 0 ? result : result = []).push(arg);
    }
    return result;
};
const sortCompare = (x, y, descending)=>(descending ? -1 : 1) * (x === y ? 0 : typeof x === "string" ? typeof y === "string" ? x.localeCompare(y) : 1 : typeof y === "string" ? -1 : x == null ? y == null ? 0 : -1 : y == null ? 1 : x - y);
const sort = (items, selector, descending)=>array(items).sort(typeof selector === "function" ? (x, y)=>sortCompare(selector(x), selector(y), descending) : isArray(selector) ? selector.length ? (x, y)=>{
        let c = 0;
        for(let i = 0; i < selector.length && !c; i++){
            c = sortCompare(selector[i](x), selector[i](y), descending);
        }
        return c;
    } : (x, y)=>sortCompare(x, y, descending) : (x, y)=>sortCompare(x, y, selector));
const topoSort = (items, dependencies, format)=>{
    if (items == null) return items;
    let clear = [];
    let mapped = [];
    const edges = new Map(map(items, (item)=>[
            item,
            [
                item,
                [],
                null
            ]
        ]));
    for (const [item, info] of edges){
        var _dependencies;
        for (const dependency of (_dependencies = dependencies(item)) !== null && _dependencies !== void 0 ? _dependencies : []){
            var // Ignore dependencies not present.
            _edges_get;
            var _info, _ref;
            var _;
            ((_edges_get = edges.get(dependency)) === null || _edges_get === void 0 ? void 0 : _edges_get[1].push(info)) && ((_ = (_info = info)[_ref = 2]) !== null && _ !== void 0 ? _ : _info[_ref] = new Set()).add(dependency);
        }
        if (!info[2]) {
            clear.push(info);
        }
    }
    for (const [item, dependents] of clear){
        mapped.push(item);
        for (const dependent of dependents){
            dependent[2].delete(item);
            if (!dependent[2].size) {
                clear.push(dependent);
            }
        }
    }
    return mapped.length === edges.size ? mapped : throwError(`Cyclic dependencies: ${itemize(map(edges, ([, info])=>{
        var _info_;
        return ((_info_ = info[2]) === null || _info_ === void 0 ? void 0 : _info_.size) ? (format = normalizeSelector(format))(info[0]) + " depends on " + itemize(info[2], format) : skip;
    }))}.`);
};
const normalizeSelector = (selector, require = false)=>typeof selector === "function" ? selector : selector != null ? (item)=>(item = item[selector]) === undefined && require ? skip : item : (item)=>item;
const reduce = (source, projection, reduce, returnItem = false)=>{
    let value;
    let result;
    forEach(source, returnItem ? (item, index, prev)=>(value = projection ? projection(item, index, prev) : item) !== undefined && prev !== (prev = reduce(prev, value)) ? (result = item, prev) : prev : (item, index, prev)=>(value = projection ? projection(item, index, prev) : item) !== undefined ? result = reduce(prev, value) : prev);
    return result;
};
const min = (source, projection, by)=>!projection && isArray(source) ? Math.min(...source) : reduce(source, projection, (prev, x)=>prev == null || x < prev ? x : prev, by);
const max = (source, projection, by)=>!projection && isArray(source) ? Math.max(...source) : reduce(source, projection, (prev, x)=>prev == null || x > prev ? x : prev, by);
const sum = (source, projection)=>reduce(source, projection, (prev = 0, x)=>{
        return prev + x;
    }) || 0;
const avg = (source, projection)=>{
    let n = 0;
    let sum = reduce(source, projection, (prev = 0, x)=>(n++, prev + x));
    return n ? sum / n : undefined;
};
const keys = Object.keys;
const hasKeys = (obj)=>!!keyCount(obj, true);
const keyCount = (obj, some = false)=>{
    if (!obj) return 0;
    let count = 0;
    for(const _ in obj){
        if (++count && some) {
            return 1;
        }
    }
    return count;
};

const setSymbol = Symbol();
const getSymbol = Symbol();
const pushSymbol = Symbol();
let ensureAssignImplementations = (target, error, retry)=>{
    if (target == null || (target === null || target === void 0 ? void 0 : target[getSymbol])) {
        throw error;
    }
    let scope = findDeclaringScope(target);
    if (!scope) {
        throw error;
    }
    if (scope.Object.prototype[setSymbol]) throw error;
    for (const { prototype } of [
        scope.Map,
        scope.WeakMap
    ]){
        prototype[setSymbol] = function(key, value) {
            return value === void 0 ? this.delete(key) : this.get(key) !== value && !!this.set(key, value);
        };
        prototype[getSymbol] = prototype.get;
    }
    for (const { prototype } of [
        scope.Set,
        scope.WeakSet
    ]){
        prototype[setSymbol] = function(key, value, add = false) {
            return value || add && value === void 0 ? this.has(key) ? false : !!this.add(key) : this.delete(key);
        };
        prototype[getSymbol] = prototype.has;
        prototype[pushSymbol] = function(...keys) {
            for (const key of keys)key !== void 0 && this.add(key);
            return this;
        };
    }
    scope.Array.prototype[pushSymbol] = scope.Array.prototype.push;
    for (const { prototype } of [
        scope.Object,
        scope.Array
    ]){
        prototype[setSymbol] = function(key, value) {
            if (value === undefined) {
                if (this[key] !== undefined) {
                    delete this[key];
                    return true;
                }
                return false;
            }
            return (this[key] = value) !== value;
        };
        prototype[getSymbol] = function(key) {
            return this[key];
        };
    }
    return retry();
};
let get = (source, key, initialize)=>{
    try {
        if (source == null) return source;
        let value = source[getSymbol](key);
        if (value === void 0 && (value = typeof initialize === "function" ? initialize() : initialize) !== void 0) {
            if (value === null || value === void 0 ? void 0 : value.then) return value.then((value)=>value === void 0 ? value : source[setSymbol](key, value));
            source[setSymbol](key, value);
        }
        return value;
    } catch (e) {
        return ensureAssignImplementations(source, e, ()=>get(source, key, initialize));
    }
};
let add = (target, key, value)=>{
    try {
        return (target === null || target === void 0 ? void 0 : target[setSymbol](key, value, true)) === true;
    } catch (e) {
        return ensureAssignImplementations(target, e, ()=>add(target, key, value));
    }
};
let trySet = (target, key, value)=>get(target, key) !== set(target, key, value);
let set = (target, key, value)=>{
    try {
        target[setSymbol](key, value);
        return value;
    } catch (e) {
        return ensureAssignImplementations(target, e, ()=>set(target, key, value));
    }
};
/** Removes the value with the specified key, and returns it. */ const remove = (target, key)=>exchange(target, key, undefined);
let exchange = (target, key, value)=>{
    try {
        const previous = target[getSymbol](key);
        target[setSymbol](key, value);
        return previous;
    } catch (e) {
        return ensureAssignImplementations(target, e, ()=>exchange(target, key, value));
    }
};
const update = (target, key, update)=>{
    let updated = update(get(target, key));
    return typeof (updated === null || updated === void 0 ? void 0 : updated.then) === "function" ? updated.then((value)=>set(target, key, value)) : set(target, key, updated);
};
const clone = (template, depth = -1)=>{
    const ctor = template === null || template === void 0 ? void 0 : template.constructor;
    if (ctor === Object || ctor === Array) {
        const cloned = ctor();
        for(const p in template){
            const propValue = template[p];
            cloned[p] = depth && ((propValue === null || propValue === void 0 ? void 0 : propValue.constructor) === Object || isArray(propValue)) ? clone(propValue, depth - 1) : propValue;
        }
        return cloned;
    }
    return template;
};
let push = (target, ...items)=>{
    try {
        return target == null ? target : (target[pushSymbol](...items), target);
    } catch (e) {
        return ensureAssignImplementations(target, e, ()=>push(target, ...items));
    }
};
const dict = (source, projection)=>{
    const target = new Map();
    forEach(source, projection ? (item, index, seed)=>(item = projection(item, index, seed)) && (typeof item !== "symbol" || item !== skip && item !== stop) ? target.set(item[0], item[1]) : item : (item)=>item && (typeof item !== "symbol" || item !== skip && item !== stop) ? target.set(item[0], item[1]) : item);
    return target;
};
const obj = (source, projection)=>{
    const target = {};
    forEach(source, projection ? (item, index, seed)=>(item = projection(item, index, seed)) && (typeof item !== "symbol" || item !== skip && item !== stop) ? target[item[0]] = item[1] : item : (item)=>item && (typeof item !== "symbol" || item !== skip && item !== stop) ? target[item[0]] = item[1] : item);
    return target;
};
const assignSingle = (target, source, clone = false)=>{
    try {
        if (target.constructor === Object) {
            if (clone) {
                const originalTarget = target;
                // Clone target if any property differs.
                forEach(source, (kv)=>{
                    if (!kv || (kv[1] === undefined ? !(kv[0] in target) : target[kv[0]] === kv[1])) {
                        return;
                    }
                    if (originalTarget === target) {
                        target = {
                            ...originalTarget
                        };
                    }
                    if (kv[1] === undefined) {
                        delete target[kv[0]];
                    } else {
                        target[kv[0]] = kv[1];
                    }
                });
            } else {
                forEach(source, (kv)=>kv && (kv[1] === undefined ? delete target[kv[0]] : target[kv[0]] = kv[1]));
            }
        } else {
            forEach(source, (kv)=>kv && target[setSymbol](kv[0], kv[1]));
        }
        return target;
    } catch (e) {
        return ensureAssignImplementations(target, e, ()=>assignSingle(target, source, clone));
    }
};
let assign = (target, ...sources)=>{
    if (!target || !sources.length) {
        return target;
    }
    if (typeof sources[0] === "boolean") {
        if (sources.length > 1) {
            const originalTarget = target;
            let clone = sources[0];
            sources.length > 2 ? forEach(sources, (source, ix)=>ix > 0 && (target = assignSingle(target, source, clone && target === originalTarget))) : target = assignSingle(target, sources[1], clone);
        }
    } else {
        sources.length > 1 ? forEach(sources, (source)=>assignSingle(target, source, true)) : assignSingle(target, sources[0]);
    }
    return target;
};
const merge = (target, sources, options = {})=>{
    if (target == null) {
        return target;
    }
    const { deep = true, overwrite = true, nulls = false } = options;
    for (const source of iterable(sources)){
        forEach(source, (kv)=>{
            if (!kv) return;
            const [key, value] = kv;
            const current = target[key];
            if (nulls ? current == null : current === void 0) {
                target[key] = value;
                return;
            }
            if (deep && (value === null || value === void 0 ? void 0 : value.constructor) === Object && (current === null || current === void 0 ? void 0 : current.constructor) === Object) {
                merge(current, value, options);
            } else if (overwrite) {
                target[key] = value;
            }
        });
    }
    return target;
};
const pick = (target, keys)=>target == null ? target : obj(keys, (key)=>// The first check is presumably faster than the `in` operator.
        target[key] !== void 0 || key in target ? [
            key,
            target[key]
        ] : skip);

const unwrap = (value)=>typeof value === "function" ? value() : value;
/**
 * Calculates the difference between the current version of an object, and the changed values specified.
 * If an updated property is numeric, the delta will be the difference between the updated and current number.
 * If an updated property is the same as the current value, it will not be included in the diff result,
 * otherwise this algorithm is no more sophisticated than just returning the new value in the diff (e.g. nothing special about strings).
 *
 * @returns A tuple with the first element being the differences between the updates and the current version,
 *  and the second element a clone of the current value with the changes applied.
 *  The latter should be passed as the second argument, next time the diff is calculated.
 */ const diff = (updated, previous)=>{
    if (!updated) return undefined;
    if (!isPlainObject(previous)) return [
        updated,
        updated
    ];
    const delta = {};
    let patchedValue;
    // If there are changes, this will be a clone of the previous value with the delta changes applied.
    let patched;
    if (isPlainObject(updated)) {
        forEach(updated, ([key, value])=>{
            if (structuralEquals(value, previous[key], -1)) {
                // No changes.
                return;
            }
            if (isPlainObject(patchedValue = value)) {
                // deltaValue will be undefined if there are no changes in the child object.
                if (!(value = diff(value, previous[key]))) {
                    return;
                }
                [value, patchedValue] = value;
            }
            delta[key] = value;
            (patched !== null && patched !== void 0 ? patched : patched = clone(previous))[key] = patchedValue;
        });
        return patched ? [
            delta,
            patched
        ] : undefined;
    }
    return undefined;
};
const createIntervals = (cmp = (x, y)=>x - y, width = (interval)=>interval[1] - interval[0])=>{
    const ranges = [];
    return Object.assign(ranges, {
        push (start, end) {
            let pending = [
                start,
                end
            ];
            const finalize = (update = true)=>update ? ranges.width = ranges.reduce((sum, interval)=>sum + width(interval), 0) : ranges.width;
            let changed;
            for(let i = 0; i < ranges.length; i++){
                let current = ranges[i];
                if (cmp(pending[1], current[0]) < 0) {
                    // Ends before next start. Insert before.
                    return finalize(ranges.splice(i, 0, pending));
                } else if (cmp(pending[0], current[1]) <= 0) {
                    var _ranges_;
                    if (cmp(pending[0], current[0]) < 0) {
                        // Expand left (changed).
                        changed = current[0] = pending[0];
                    }
                    if (cmp(pending[1], current[1]) > 0) {
                        // Expand right (changed).
                        changed = current[1] = pending[1];
                    }
                    if (((_ranges_ = ranges[i + 1]) === null || _ranges_ === void 0 ? void 0 : _ranges_[0]) < current[1]) {
                        // Detach the current range since it is to be merged with the next.
                        changed = pending = ranges.splice(i--, 1)[0];
                    } else {
                        // Only update the total width if the current range was expanded or merged.
                        return finalize(changed != null);
                    }
                }
            }
            // If there still is a pending range it means its start comes after the current end.
            // Only update width in that case.
            return finalize(pending && (ranges[ranges.length] = pending));
        },
        width: 0
    });
};

/** Used to identify the properties that contains a value type that should be transferred to another type.  */ const valueTypeMarker = Symbol();

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
const throwError = (error, transform = (message)=>new Error(message))=>{
    throw isString(error = unwrap(error)) ? transform(error) : error;
};
const throwTypeError = (message)=>throwError(new TypeError(message));
const validate = (value, validate, validationError, undefinedError)=>(isArray(validate) ? validate.every((test)=>test(value)) : isFunction(validate) ? validate(value) : validate) ? value : required(value, undefinedError !== null && undefinedError !== void 0 ? undefinedError : validationError) && throwError(validationError !== null && validationError !== void 0 ? validationError : "Validation failed.");
class InvariantViolatedError extends Error {
    constructor(invariant){
        super(invariant ? "INV: " + invariant : "An invariant was violated.");
    }
}
const structuralEquals = (value1, value2, depth = -1)=>{
    if (value1 === value2) return true;
    // interpret `null` and `undefined` as the same.
    if ((value1 !== null && value1 !== void 0 ? value1 : value2) == null) return true;
    if ((isArray(value1) || isPlainObject(value1)) && (isArray(value2) || isPlainObject(value2)) && value1.length === value2.length) {
        let n = 0;
        for(const key in value1){
            if (value1[key] !== value2[key] && !structuralEquals(value1[key], value2[key], depth - 1)) {
                return false;
            }
            ++n;
        }
        return n === Object.keys(value2).length;
    }
    return false;
};
/** Tests whether a value equals at least one of some other values.  */ const equalsAny = (target, singleValue, ...otherValues)=>target === singleValue || otherValues.length > 0 && otherValues.some((value)=>equalsAny(target, value));
/**
 * States an invariant.
 */ const invariant = (test, description)=>{
    const valid = unwrap(test);
    return valid != null && valid !== false ? valid : throwError(new InvariantViolatedError(description));
};
const required = (value, error)=>value != null ? value : throwError(error !== null && error !== void 0 ? error : "A required value is missing", (text)=>new TypeError(text.replace("...", " is required.")));
const tryCatch = (expression, errorHandler = true, always)=>{
    try {
        return expression();
    } catch (e) {
        return isFunction(errorHandler) ? isError(e = errorHandler(e)) ? throwError(e) : e : isBoolean(errorHandler) ? console.error(errorHandler ? throwError(e) : e) : errorHandler;
    } finally{
        always === null || always === void 0 ? void 0 : always();
    }
};
const resolveDeferred = (value)=>{
    var _value_resolved;
    return isFunction(value) ? (_value_resolved = value === null || value === void 0 ? void 0 : value.resolved) !== null && _value_resolved !== void 0 ? _value_resolved : value() : value;
};
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
const asDeferred = (deferredOrResolved)=>isFunction(deferredOrResolved) ? deferredOrResolved : Object.assign(()=>deferredOrResolved, {
        resolved: isAwaitable(deferredOrResolved) ? undefined : deferredOrResolved
    });
class DeferredPromise extends Promise {
    get initialized() {
        return this._result != null;
    }
    then(onfulfilled, onrejected) {
        var _this__result;
        return ((_this__result = this._result) !== null && _this__result !== void 0 ? _this__result : this._result = this._action()).then(onfulfilled, onrejected);
    }
    catch(onrejected) {
        var _this__result;
        return ((_this__result = this._result) !== null && _this__result !== void 0 ? _this__result : this._result = this._action()).catch(onrejected);
    }
    finally(onfinally) {
        var _this__result;
        return ((_this__result = this._result) !== null && _this__result !== void 0 ? _this__result : this._result = this._action()).finally(onfinally);
    }
    constructor(action){
        super(()=>{}), _define_property$1(this, "_action", void 0), _define_property$1(this, "_result", void 0);
        this._action = action;
    }
}
/**
 * A promise that is initialized lazily on-demand.
 * For promises this is more convenient than {@link deferred}, since it just returns a promise instead of a function.
 */ const deferredPromise = (expression)=>new DeferredPromise(async ()=>unwrap(expression));
const formatError = (error, includeStackTrace)=>!error ? "(unspecified error)" : includeStackTrace && (error === null || error === void 0 ? void 0 : error.stack) ? `${formatError(error, false)}\n${error === null || error === void 0 ? void 0 : error.stack}` : error.message ? `${error.name}: ${error.message}` : "" + error;
const tryCatchAsync = async (expression, errorHandler = true, always)=>{
    try {
        return await unwrap(expression);
    } catch (e) {
        if (!isBoolean(errorHandler)) {
            return await errorHandler(e);
        } else if (errorHandler) {
            throw e;
        }
        // `false` means "ignore".
        console.error(e);
    } finally{
        await (always === null || always === void 0 ? void 0 : always());
    }
    return undefined;
};
const withRetry = async (action, { retries = 3, retryDelay = 200, errorFilter, errorHandler } = {})=>{
    if (retries <= 0) {
        retries = 1;
    }
    let previousError = undefined;
    for(let i = 0; i < retries; i++){
        try {
            return await action(i, previousError);
        } catch (error) {
            previousError = error;
            const filterAction = i === retries - 1 ? "throw" : errorFilter === null || errorFilter === void 0 ? void 0 : errorFilter(error, i);
            if (filterAction === "throw") {
                if (errorHandler) {
                    return await errorHandler(error, i);
                }
                throw error;
            } else {
                await delay(typeof retryDelay === "function" ? retryDelay(i + 1) : retryDelay * (0.8 + 0.4 * Math.random()));
                if (filterAction === "reset") {
                    i = -1;
                    previousError = undefined;
                }
            }
        }
    }
    return void 0;
};

const isTruish = (value)=>!!value;
const isTrue = (value)=>value === T;
const isNotTrue = (value)=>value !== T;
/** Minify friendly version of `false`. */ const undefined$1 = void 0;
/** Caching this value potentially speeds up tests rather than using `Number.MAX_SAFE_INTEGER`. */ const MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER;
/** Caching this value potentially speeds up tests rather than using `Number.MAX_SAFE_INTEGER`. */ const MIN_SAFE_INTEGER = Number.MIN_SAFE_INTEGER;
/** Minify friendly version of `false`. */ const F = false;
/** Minify friendly version of `true`. */ const T = true;
/** Minify friendly version of `null`. */ const nil = null;
/** A function that does nothing. */ const NOOP = ()=>{};
/** The identity function (x)=>x. */ const IDENTITY = (item)=>item;
/** A function that filters out values != null. */ const FILTER_NULLISH = (item)=>item != nil;
const NULL = 0;
const UNDEFINED = 1;
const BOOLEAN = 2;
const NUMBER = 3;
const BIGINT = 4;
const STRING = 5;
const ARRAY = 6;
const OBJECT = 7;
const DATE = 8;
const SYMBOL = 9;
const FUNCTION = 10;
const ITERABLE = 11;
const MAP = 12;
const SET = 13;
const PROMISE = 14;
const T1 = {
    ["n"]: NUMBER,
    ["f"]: FUNCTION
};
const T2 = {
    ["o"]: BOOLEAN,
    ["i"]: BIGINT,
    ["t"]: STRING,
    ["y"]: SYMBOL
};
/** Using this cached value speeds up testing if an object is iterable seemingly by an order of magnitude. */ const symbolIterator = Symbol.iterator;
/** Using this cached value speeds up testing if an object is iterable seemingly by an order of magnitude. */ const symbolAsyncIterator = Symbol.asyncIterator;
const createTypeConverter = /*#__PURE__*/ (typeTester, parser)=>(value, parse = true)=>typeTester(value) ? value : parser && parse && value != null && (value = parser(value)) != null ? value : undefined$1;
const ifDefined = (value, resultOrProperty)=>isFunction(resultOrProperty) ? value !== undefined$1 ? resultOrProperty(value) : undefined$1 : (value === null || value === void 0 ? void 0 : value[resultOrProperty]) !== undefined$1 ? value : undefined$1;
const isNullish = (value)=>value == null;
const isBoolean = (value)=>typeof value === "boolean";
const parseBoolean = createTypeConverter(isBoolean, (value)=>value == 0 // Both numbers and string with the value 0 or 1
     ? false : value == 1 ? true : value === "false" || value === "no" ? false : value === "true" || value === "yes" ? true : undefined$1);
const isFalsish = (value)=>!value;
const isFalse = (value)=>value === F;
const isNotFalse = (value)=>value !== F;
const isInteger = Number.isSafeInteger;
const isNumber = (value)=>typeof value === "number";
const isFinite$1 = Number.isFinite;
const parseNumber = createTypeConverter(isNumber, (value)=>isNaN(value = parseFloat(value)) ? undefined$1 : value);
const isBigInt = (value)=>typeof value === "bigint";
const parseBigInt = createTypeConverter(isBigInt, (value)=>tryCatch(()=>BigInt(value)));
const isString = (value)=>typeof value === "string";
const toString = createTypeConverter(isString, (value)=>value === null || value === void 0 ? void 0 : value.toString());
const isArray = Array.isArray;
const isError = /*#__PURE__*/ (value)=>value instanceof Error;
const isObject = /*#__PURE__*/ (value)=>value && typeof value === "object";
const isPlainObject = /*#__PURE__*/ (value)=>(value === null || value === void 0 ? void 0 : value.constructor) === Object;
const hasProperty = /*#__PURE__*/ (value, property)=>isObject(value) && property in value;
const hasMethods = /*#__PURE__*/ (value, ...names)=>value == null ? false : names.every((name)=>typeof value[name] === "function");
const hasMethod = /*#__PURE__*/ (value, name)=>typeof (value === null || value === void 0 ? void 0 : value[name]) === "function";
const isDate = /*#__PURE__*/ (value)=>value instanceof Date;
const parseDate = createTypeConverter(isDate, (value)=>isNaN(value = Date.parse(value)) ? undefined$1 : value);
const isSymbol = /*#__PURE__*/ (value)=>typeof value === "symbol";
const isFunction = /*#__PURE__*/ (value)=>typeof value === "function";
const isPromiseLike = /*#__PURE__*/ (value)=>!!(value === null || value === void 0 ? void 0 : value["then"]);
const isIterable = /*#__PURE__*/ (value, acceptStrings = false)=>!!((value === null || value === void 0 ? void 0 : value[symbolIterator]) && (typeof value !== "string" || acceptStrings));
const isAsyncIterable = /*#__PURE__*/ (value)=>!!(value === null || value === void 0 ? void 0 : value[symbolAsyncIterator]);
const toIterable = /*#__PURE__*/ (value)=>isIterable(value) ? value : [
        value
    ];
const asMap = /*#__PURE__*/ (values)=>values == null ? undefined$1 : new Set(values);
const isMap = /*#__PURE__*/ (value)=>value instanceof Map;
const asSet = /*#__PURE__*/ (values)=>values == null ? undefined$1 : new Set(values);
const isSet = /*#__PURE__*/ (value)=>value instanceof Set;
const isAwaitable = /*#__PURE__*/ (value)=>!!(value === null || value === void 0 ? void 0 : value.then);
/**
 * If the value is a promise, it will be awaited.
 */ const awaitIfAwaitable = (value, action)=>{
    var _value_then;
    var _value_then1;
    return (_value_then1 = value === null || value === void 0 ? void 0 : (_value_then = value.then) === null || _value_then === void 0 ? void 0 : _value_then.call(value, (value)=>action(value))) !== null && _value_then1 !== void 0 ? _value_then1 : action(value);
};
const typeCode = (value, typeName = typeof value)=>{
    var _T1_typeName_, _ref;
    return value == null ? value === null ? NULL : UNDEFINED : (_ref = (_T1_typeName_ = T1[typeName[0]]) !== null && _T1_typeName_ !== void 0 ? _T1_typeName_ : T2[typeName[1]]) !== null && _ref !== void 0 ? _ref : Array.isArray(value) ? ARRAY : value instanceof Date ? DATE : OBJECT;
};
/**
 * Round a number of to the specified number of decimals.
 */ const round = (number, decimals)=>number == null ? undefined$1 : decimals === false ? number : (decimals = Math.pow(10, !decimals || decimals === true ? 0 : decimals), Math.round(number * decimals) / decimals);
const testFirstLast = (s, first, last)=>s[0] === first && s[s.length - 1] === last;
const isJsonString = (value)=>isString(value) && (testFirstLast(value, "{", "}") || testFirstLast(value, "[", "]"));
/** For when an object that contains internal state that needs to be changed is exposed as read-only public property. */ const mutate = /*#__PURE__*/ (target)=>target;

/**
 * Clones a value by its JSON representation.
 */ const jsonClone = (value)=>value == null ? null : JSON.parse(JSON.stringify(value));
/**
 * Checks if the JSON representation of two objects are equal.
 *
 * Be aware that, give or take performance overhead, this also requires that properties
 * for objects are in the same order.
 */ const jsonEquals = (comparand, value)=>JSON.stringify(comparand) === JSON.stringify(value);
const isJsonObject = (value)=>isPlainObject(value);

const MILLISECOND = 1;
const SECOND = MILLISECOND * 1000;
const MINUTE = SECOND * 60;
const HOUR = MINUTE * 60;
const DAY = HOUR * 24;
const FOREVER = MAX_SAFE_INTEGER;
let now = typeof performance !== "undefined" ? (round = T)=>round ? Math.trunc(now(F)) : performance.timeOrigin + performance.now() : Date.now;
const reset = Symbol();
const createTimer = (started = true, timeReference = ()=>now())=>{
    let t0 = +started * timeReference();
    let elapsed = 0;
    let capturedElapsed;
    return (toggle = started, reset)=>{
        capturedElapsed = started ? elapsed += -t0 + (t0 = timeReference()) : elapsed;
        reset && (elapsed = 0);
        (started = toggle) && (t0 = timeReference());
        return capturedElapsed;
    };
};
const formatTimestamp = (value, formatOptions, locale)=>value == null ? value : formatOptions ? new Date(value.valueOf()).toLocaleString(locale, formatOptions) : new Date(value.valueOf()).toISOString();
const formatDuration = (ms)=>{
    if (ms == null) {
        return ms;
    }
    const h = Math.floor(ms / 3600000);
    const m = Math.floor(ms % 3600000 / 60000);
    const s = Math.floor(ms % 60000 / 1000);
    return h ? `${h}h ${m}m ${s}s` : m ? `${m}m ${s}s` : `${s}s`;
};
/** Light-weight version of {@link clock}. The trigger and cancel overloads returns true to enable chaining like `timeout(false)&&...` */ const createTimeout = (defaultTimeout = 0)=>{
    let handle;
    let currentCallback;
    const stickyTimeout = (arg, timeout = defaultTimeout)=>{
        if (arg === undefined) {
            return !!currentCallback;
        }
        clearTimeout(handle);
        if (isBoolean(arg)) {
            arg && (timeout < 0 ? isNotFalse : isTrue)(currentCallback === null || currentCallback === void 0 ? void 0 : currentCallback()) ? stickyTimeout(currentCallback, timeout) : currentCallback = undefined;
        } else {
            currentCallback = arg;
            handle = setTimeout(()=>stickyTimeout(true, timeout), timeout < 0 ? -timeout : timeout);
        }
    };
    return stickyTimeout;
};
const waitFor = (selector, arg0, arg1)=>{
    if (typeof arg0 === "function") {
        return waitFor(selector, {
            ...arg1,
            then: arg0
        });
    }
    const { then, timeout = -1, pollInterval = 25 } = arg0 !== null && arg0 !== void 0 ? arg0 : {};
    const t0 = now();
    let selected = selector();
    if (selected) {
        then === null || then === void 0 ? void 0 : then(selected, 0);
        return selected;
    }
    return (async ()=>{
        while(!(selected = selector()) && (timeout <= 0 || now() - t0 < timeout)){
            await delay(pollInterval);
        }
        return selected ? (then === null || then === void 0 ? void 0 : then(selected, now() - t0), selected) : throwError(`Target not resolved after ${timeout} ms.`);
    })();
};
const clock = (callbackOrSettings, frequency = 0)=>{
    const settings = isFunction(callbackOrSettings) ? {
        frequency,
        callback: callbackOrSettings
    } : callbackOrSettings;
    let { queue = true, paused = false, trigger = false, once = false, callback = ()=>{}, raf } = settings;
    var _settings_frequency;
    frequency = (_settings_frequency = settings.frequency) !== null && _settings_frequency !== void 0 ? _settings_frequency : 0;
    let timeoutId = 0;
    const mutex = promise(true).resolve();
    const timer = createTimer(!paused);
    let delta = timer();
    const outerCallback = async (skipQueue)=>{
        if (!timeoutId || !queue && mutex.pending && skipQueue !== true) {
            return false;
        }
        instance.busy = true;
        if (skipQueue !== true) {
            while(mutex.pending){
                await mutex;
            }
        }
        !skipQueue && mutex.reset();
        if (await tryCatchAsync(()=>callback(timer(), -delta + (delta = timer())), false, ()=>!skipQueue && mutex.resolve()) === false || frequency <= 0 || once) {
            reset(false);
        }
        return !(instance.busy = false);
    };
    const updateTimeout = ()=>timeoutId = setTimeout(()=>raf ? requestAnimationFrame(timeoutCallback) : timeoutCallback(), frequency < 0 ? -frequency : frequency);
    const timeoutCallback = ()=>{
        instance.active && outerCallback();
        instance.active && updateTimeout();
    };
    const reset = (start, resetTimer = !start)=>{
        timer(start, resetTimer);
        clearTimeout(timeoutId);
        instance.active = !!(timeoutId = start ? updateTimeout() : 0);
        return instance;
    };
    const instance = {
        active: false,
        busy: false,
        restart: (newFrequency, newCallback)=>{
            frequency = newFrequency !== null && newFrequency !== void 0 ? newFrequency : frequency;
            callback = newCallback !== null && newCallback !== void 0 ? newCallback : callback;
            return reset(true, true);
        },
        toggle: (start, trigger)=>start !== instance.active ? start ? trigger ? (reset(true), instance.trigger(), instance) : reset(true) : reset(false) : instance,
        trigger: async (skipQueue)=>await outerCallback(skipQueue) && (reset(instance.active), true)
    };
    return instance.toggle(!paused, trigger);
};

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
class ResettablePromise {
    get value() {
        return this._promise.value;
    }
    get error() {
        return this._promise.error;
    }
    get pending() {
        return this._promise.pending;
    }
    resolve(value, ifPending = false) {
        this._promise.resolve(value, ifPending);
        return this;
    }
    reject(value, ifPending = false) {
        this._promise.reject(value, ifPending);
        return this;
    }
    reset() {
        this._promise = new OpenPromise();
        return this;
    }
    signal(value) {
        this.resolve(value);
        this.reset();
        return this;
    }
    then(onfulfilled, onrejected) {
        return this._promise.then(onfulfilled, onrejected);
    }
    constructor(){
        _define_property(this, "_promise", void 0);
        this.reset();
    }
}
class OpenPromise {
    then(onfulfilled, onrejected) {
        return this._promise.then(onfulfilled, onrejected);
    }
    constructor(){
        _define_property(this, "_promise", void 0);
        _define_property(this, "resolve", void 0);
        _define_property(this, "reject", void 0);
        _define_property(this, "value", void 0);
        _define_property(this, "error", void 0);
        _define_property(this, "pending", true);
        let captured;
        this._promise = new Promise((...args)=>{
            captured = args.map((inner, i)=>(value, ifPending)=>{
                    if (!this.pending) {
                        if (ifPending) return this;
                        throw new TypeError("Promise already resolved/rejected.");
                    }
                    this.pending = false;
                    this[i ? "error" : "value"] = value === undefined$1 || value;
                    inner(value);
                    return this;
                });
        });
        [this.resolve, this.reject] = captured;
    }
}
const createLock = (timeout)=>{
    const semaphore = promise(true);
    let state;
    const wait = async (arg1, arg2, arg3)=>{
        if (isFunction(arg1)) {
            const release = await wait(arg2, arg3);
            return release ? await tryCatchAsync(arg1, true, release) : undefined$1;
        }
        const ownerId = arg2;
        let ms = arg1;
        let renewInterval = 0;
        var _state_;
        while(state && ownerId !== state[0] && ((_state_ = state[1]) !== null && _state_ !== void 0 ? _state_ : 0) < now()){
            if (await (ms >= 0 ? race(delay(ms), semaphore) : semaphore) === undefined$1) {
                return undefined$1;
            }
        // If the above did not return undefined we got the semaphore.
        }
        const release = ()=>{
            clearTimeout(renewInterval);
            state = undefined$1;
            semaphore.signal(false);
        };
        const renew = ()=>{
            state = [
                ownerId !== null && ownerId !== void 0 ? ownerId : true,
                timeout ? now() - timeout : undefined$1
            ];
            timeout && (renewInterval = setTimeout(()=>state && renew(), timeout / 2));
        };
        renew();
        return release;
    };
    return wait;
};
const defer = (f, ms = 0)=>ms > 0 ? setTimeout(f, ms) : window.queueMicrotask(f);
const delay = (ms, value)=>ms == null || isFinite(ms) ? !ms || ms <= 0 ? unwrap(value) : new Promise((resolve)=>setTimeout(async ()=>resolve(await unwrap(value)), ms)) : throwError(`Invalid delay ${ms}.`);
const promise = (resettable)=>resettable ? new ResettablePromise() : new OpenPromise();
const waitAll = (...args)=>Promise.all(args.map((arg)=>isFunction(arg) ? arg() : arg));
const race = (...args)=>Promise.race(args.map((arg)=>isFunction(arg) ? arg() : arg));

const createEventBinders = (listener, attach, detach)=>{
    let bound = false;
    const outerListener = (...args)=>listener(...args, unbind);
    const unbind = ()=>bound !== (bound = false) && (detach(outerListener), true);
    const rebind = ()=>bound !== (bound = true) && (attach(outerListener), true);
    rebind();
    return [
        unbind,
        rebind
    ];
};
const joinEventBinders = (...binders)=>(binders = filter(binders), [
        ()=>forEach(binders, (binder, _, changed)=>binder[0]() || changed, false),
        ()=>forEach(binders, (binder, _, changed)=>binder[1]() || changed, false)
    ]);
const createEvent = ()=>{
    const listeners = new Set();
    let dispatchedArgs;
    return [
        (handler, trigger)=>{
            const binders = createEventBinders(handler, (handler)=>listeners.add(handler), (handler)=>listeners.delete(handler));
            trigger && dispatchedArgs && handler(...dispatchedArgs, binders[0]);
            return binders;
        },
        (...payload)=>(dispatchedArgs = payload, listeners.forEach((handler)=>handler(...payload)))
    ];
};
const createChainedEvent = ()=>{
    let head;
    let tail;
    let next;
    var _tail__;
    const register = (handler, // Make sure that handler gets rebound at their previous priority without jumping discrete increments.
    // (It is desirable to be able to specify priority 0 or  10 without having to think about how many 0s there are)
    priority = ((_tail__ = tail === null || tail === void 0 ? void 0 : tail[1][1]) !== null && _tail__ !== void 0 ? _tail__ : 0) + 0.000001)=>{
        const registerNode = (node)=>{
            let bound = true;
            node !== null && node !== void 0 ? node : node = [
                undefined,
                [
                    handler,
                    priority,
                    [
                        ()=>{
                            if (!bound) return false;
                            node[0] ? node[0][2] = node[2] : head = node[2];
                            node[2] ? node[2][0] = node[0] : tail = node[0];
                            node[0] = node[2] = undefined;
                            return !(bound = false);
                        },
                        ()=>bound ? false : (registerNode(node), bound = true)
                    ]
                ],
                undefined
            ];
            next = head;
            if (!next) {
                head = tail = node;
            } else if (priority >= tail[1][1]) {
                node[0] = tail;
                tail = tail[2] = node;
            } else {
                // INV: priority < tail.priority, so next will be non-null after loop;
                while(next[1][1] <= priority){
                    next = next[2];
                }
                (node[0] = (node[2] = next)[0]) ? node[0][2] = node : head = node;
                next[0] = node;
            }
            return node[1][2];
        };
        return registerNode();
    };
    const invoke = (node, args)=>(next = node === null || node === void 0 ? void 0 : node[2], node ? node[1][0](...args, (...nextArgs)=>invoke(next, nextArgs.length ? nextArgs : args), node[1][2][0]) : undefined);
    return [
        register,
        (...args)=>invoke(head, args)
    ];
};

const parent = (i)=>(i + 1 >>> 1) - 1;
const left = (i)=>(i << 1) + 1;
const right = (i)=>i + 1 << 1;
const priorityQueue = ()=>{
    const heap = [];
    const map = new Map();
    const set = (item, index)=>(map.set(item[0], index), item);
    const swap = (i, j)=>([heap[i], heap[j]] = [
            set(heap[j], i),
            set(heap[i], j)
        ]);
    const gt = (i, j)=>i < size() && heap[i][1] > heap[j][1];
    const siftUp = (node = size() - 1)=>{
        while(node > 0 && gt(node, parent(node)))swap(node, node = parent(node));
    };
    let selected, l, r;
    const siftDown = (node = 0)=>{
        while(l = left(node), r = right(node), gt(l, node) || gt(r, node))swap(node, node = gt(r, l) ? r : l);
        heap[node][1] < 0 && pop();
    };
    const size = ()=>heap.length;
    const peek = ()=>heap[0];
    const push = (value, priority)=>(selected = map.get(value)) != null ? priority > (heap[selected][1] = priority) ? siftUp(selected) : siftDown(selected && parent(selected)) : priority > 0 && map.set(value, heap.push([
            value,
            priority
        ]) - 1) && siftUp();
    const pop = ()=>{
        const poppedValue = peek();
        const bottom = size() - 1;
        if (bottom > 0) {
            swap(0, bottom);
        }
        heap.pop();
        map.delete(poppedValue[0]);
        siftDown();
        return poppedValue;
    };
    return {
        size,
        //  peek,
        push,
        pop,
        expand: ()=>[
                ...heap
            ]
    };
};

const changeCase = (s, upper)=>s == null ? s : upper ? s.toUpperCase() : s.toLowerCase();
const changeIdentifierCaseStyle = (identifier, type)=>identifier.replace(/([_-]*)(\$*(?:[A-Z]+|[a-z]))([a-z0-9]*)/g, (_, underscores, initial, rest, index)=>(underscores && (!index || type === "kebab" || type === "snake") ? underscores.replace(/./g, type === "snake" ? "-" : "_") : "") + ((index && (type === "kebab" || type === "snake") && !underscores ? type === "snake" ? "-" : "_" : "") + changeCase(initial, type === "pascal" || type === "camel" && index) + changeCase(type === "kebab" || type === "snake" ? rest.replace(RegExp("(?<=\\D)\\d|(?<=\\d)\\D", "g"), type === "kebab" ? "_$&" : "-$&") : rest, false)));
/**
 * Pluralizes a noun using standard English rules.
 * It is not very smart, so if the plural form is not just adding an "s" in the end unless the singular form already ends with "s",
 * it must be specified manually.
 *
 * @param singular - The singular form of the noun
 * @param n - The number of items that decides if the noun should be pluralized. If given an array the number will be postfixed.
 * @param plural - The plural form if it is different from adding an "s" to the singular form.
 * @returns The noun, pluralized if needed.
 */ const pluralize = (singular, n, plural)=>singular == null ? undefined$1 : isArray(n) ? (n = n[0]) == null ? undefined$1 : n + " " + pluralize(singular, n, plural) : n == null ? undefined$1 : n === 1 ? singular : plural !== null && plural !== void 0 ? plural : singular === "is" ? "are" : singular + "s";
let ansiSupported = true;
/** Enables or disables ANSI formatting in console output. */ const toggleAnsi = (toggle = true)=>ansiSupported = toggle;
/**
 * Can colorize text using ANSI escape sequences.
 * See e.g. https://developer.chrome.com/docs/devtools/console/format-style for options.
 */ const ansi = (value, ps, buffer)=>buffer ? (ansiSupported && buffer.push("\x1B[", ps + "", "m"), isArray(value) ? buffer.push(...value) : buffer.push(value), ansiSupported && buffer.push("\x1B[m"), buffer) : ansi(value, ps, []).join("");
const snakeCase = (s)=>replace(s, /(.)?([A-Z])/g, (_, prev, p)=>((prev ? prev + "-" : "") + p).toLowerCase());
const quote = (item, quoteChar = "'")=>item == null ? undefined$1 : item[symbolIterator] ? map(item, (item)=>quote(item, quoteChar)) : quoteChar + item + quoteChar;
const ellipsis = (text, maxLength, debug = false)=>text && (text.length > maxLength ? debug ? `${text.slice(0, maxLength)}... [and ${text.length - maxLength} more]` : text.slice(0, maxLength - 1) + "…" : text);
const getTextStats = (text, boundaryLimits = [
    0,
    0.25,
    0.5,
    0.75,
    1
])=>{
    let charMatcher = RegExp("[\\p{L}\\p{N}][\\p{L}\\p{N}'’]*|([.!?]+)", "gu");
    let match;
    let chars = 0;
    let words = 0;
    let longWords = 0;
    let sentences = 0;
    let hasWord = false;
    while(match = charMatcher.exec(text)){
        if (match[1]) {
            hasWord && ++sentences;
            hasWord = false;
        } else {
            hasWord = true;
            chars += match[0].length;
            match[0].length > 6 && ++longWords;
            ++words;
        }
    }
    hasWord && ++sentences;
    charMatcher = RegExp("[\\p{L}\\p{N}]|([^\\p{L}\\p{N}]+)", "gu");
    const limits = boundaryLimits.map((boundary)=>boundary * chars | 0);
    const boundaries = [];
    let index = 0;
    let prevIndex;
    let wordsBefore = 0;
    let inSentence = false;
    do {
        match = charMatcher.exec(text);
        if (match === null || match === void 0 ? void 0 : match[1]) {
            // Word delimiter
            inSentence && ++wordsBefore;
        } else {
            index = match === null || match === void 0 ? void 0 : match.index;
            let wasBoundary = false;
            for(let i = 0; i < limits.length; i++){
                if (!limits[i]--) {
                    boundaries[i] = {
                        offset: prevIndex !== null && prevIndex !== void 0 ? prevIndex : index,
                        wordsBefore,
                        readTime: round(MINUTE * (wordsBefore / 238))
                    };
                    wasBoundary = true;
                }
            }
            (inSentence = !wasBoundary) || (wordsBefore = 0);
            prevIndex = index + 1;
        }
    }while (match)
    return {
        text: ellipsis(text, 50),
        length: text.length,
        characters: chars,
        words,
        sentences,
        lix: round(words / sentences + 100 * longWords / words),
        readTime: round(MINUTE * (words / 238)),
        boundaries
    };
};
const isEmptyString = (s)=>s == null || typeof s === "boolean" || s.toString() === "";
const join = (source, arg1, arg2)=>source == null ? source : typeof source === "string" ? source : source[symbolIterator] ? filter(typeof arg1 === "function" ? map(source, arg1) : (arg2 = arg1, source), isEmptyString, true).join(arg2 !== null && arg2 !== void 0 ? arg2 : "") : typeof source === "boolean" ? "" : source.toString();
const indent = (text, indent = "  ")=>{
    if (text == null) return text;
    let i = 0;
    let baseIndent = 0;
    return replace(text, /( *)([^\r\n]*)(\r?\n?)/g, (_, lineIndent, text, br)=>{
        if (!text) {
            return br;
        }
        if (!i++) {
            baseIndent = lineIndent.length;
        }
        return `${indent}${lineIndent.length >= baseIndent ? lineIndent.slice(baseIndent) : ""}${text}${br}`;
    });
};
const stringify = JSON.stringify;
const parseJson = (value, undefinedIfInvalid = false)=>value == null || value === "" ? undefined$1 : typeof value === "object" ? value : undefinedIfInvalid ? tryCatch(()=>JSON.parse(value + ""), ()=>{}) : JSON.parse(value + "");
/**
 * Itemizes an array of items by separating them with commas and a conjunction like "and" or "or".
 */ const itemize = (values, separators, result, rest)=>{
    if (!values && values !== 0) return values == null ? values : undefined$1;
    if (typeof separators === "function") {
        return itemize(map(values, separators), result, rest);
    }
    const first = [];
    const last = forEach(values, (item, _, prev)=>isEmptyString(item) ? skip : (prev && first.push(prev), item.toString()));
    let [separator, conjunction] = isArray(separators) ? separators : [
        ,
        separators
    ];
    separator !== null && separator !== void 0 ? separator : separator = ",";
    conjunction = (conjunction !== null && conjunction !== void 0 ? conjunction : conjunction = "and")[0] === separator ? conjunction + " " : " " + // Don't add two spaces if the conjunction is the empty string.
    (conjunction ? conjunction + " " : "");
    const enumerated = first.length ? `${first.join(separator + " ")}${conjunction}${last}` : last !== null && last !== void 0 ? last : "";
    return result ? result(enumerated, first.length + +(last != null)) : enumerated;
};

const createEnumParser = (name, values)=>{
    const levels = [];
    const ranks = {};
    const parser = {};
    let rank = 0;
    for(let key in values){
        if (key === values[key]) {
            Object.defineProperty(parser, key, {
                value: key,
                writable: false,
                enumerable: true,
                configurable: false
            });
            ranks[key] = rank++;
            levels.push(key);
        }
    }
    const parse = (value, validate = true)=>value == null ? undefined$1 : ranks[value] != null ? value : validate ? throwError(`The ${name} "${value}" is not defined.`) : undefined$1;
    const propertySettings = {
        writable: false,
        enumerable: false,
        configurable: false
    };
    Object.defineProperties(parser, {
        parse: {
            value: parse,
            ...propertySettings
        },
        ranks: {
            value: ranks,
            ...propertySettings
        },
        levels: {
            value: levels,
            ...propertySettings
        },
        compare: {
            value: (lhs, rhs)=>{
                const rank1 = ranks[parse(lhs)], rank2 = ranks[parse(rhs)];
                return rank1 < rank2 ? -1 : rank1 > rank2 ? 1 : 0;
            },
            ...propertySettings
        }
    });
    return parser;
};

const parameterListSymbol = Symbol();
const uriEncode = (value)=>value != nil ? encodeURIComponent(value) : undefined$1;
const parseKeyValue = (value, { delimiters = [
    "|",
    ";",
    ","
], decode = true, lowerCase } = {})=>{
    var _parts, _ref;
    if (!value) return undefined$1;
    const parts = value.split("=").map((v)=>{
        v = decode ? decodeURIComponent(v.trim()).replaceAll("+", " ") : v.trim();
        return lowerCase ? v.toLowerCase() : v;
    });
    let split;
    var _;
    (_ = (_parts = parts)[_ref = 1]) !== null && _ !== void 0 ? _ : _parts[_ref] = "";
    parts[2] = parts[1] && (isString(delimiters) && (delimiters = [
        delimiters
    ]) || isArray(delimiters)) && forEach(delimiters, (delim)=>(split = parts[1].split(delim)).length > 1 ? stop(split) : undefined$1) || (parts[1] ? [
        parts[1]
    ] : []);
    return parts;
};
// // Browsers accepts `//` as "whatever the protocol is" is links.
// // A scheme can only be letters, digits, `+`, `-` and `.`.
// // The slashes are captured so we can put the parsed URI correctly back together.
// // https://datatracker.ietf.org/doc/html/rfc3986#section-3.1
// Scheme (group 1 and 2) = `//` or `name:` or `name://` = (?:(?:([\w+.-]+):)?(\/\/)?)
// // https://datatracker.ietf.org/doc/html/rfc3986#section-3.2.1
// User Information (groups 4 and 5) = `user@` or `user:password@` = (?:([^:@]+)(?:\:([^@]*))?@)
// // If an IPv6 address is used with a port it is wrapped in square brackets.
// // Otherwise a host is anything until port, path or query string.
// // Se also https://serverfault.com/questions/205793/how-can-one-distinguish-the-host-and-the-port-in-an-ipv6-url about the brackets.
// // https://datatracker.ietf.org/doc/html/rfc3986#section-3.2.2
// Host (group 6 or 7) = `[ IPv6 or IPvFuture ]:port` or IPv6 or `IPv4:port` or `domain:port`  = (?:\[([^\]]+)\]|([0-9:]+|[^/+]+?))
// //Port is included in the optional host group to separate `about:blank` like schemes from `localhost:1337` like hosts
// // https://datatracker.ietf.org/doc/html/rfc3986#section-3.2.3
// Port (group 8) = (?::(\d*))?
// Authority (group 3) = User Information + Host + Port
// // Anything until an optional query or fragment
// // https://datatracker.ietf.org/doc/html/rfc3986#section-3.3
// Path and  (group 9) = (\/[^#?]*)
// // Anything following a `?` until an optional fragment.
// // https://datatracker.ietf.org/doc/html/rfc3986#section-3.4
// Query (group 10) = (?:\?([^#]*))
// // Anything following a pound sign until end.
// // https://datatracker.ietf.org/doc/html/rfc3986#section-3.5
// Fragment (group 11) = (?:#.*)
// Everything put together
// ^(?:(?:([\w+.-]+):)?(?:\/\/)?)?((?:([^:@]+)(?:\:([^@]*))?@)?(?:\[([^\]]+)\]|([0-9:]+|[^/+]+?))?(?::(\d*))?)?(\/[^#?]*)?(?:\?([^#]*))?(?:#(.*))?$
/**
 * Parses an URI according to https://www.rfc-editor.org/rfc/rfc3986#section-2.1.
 * The parser is not pedantic about the allowed characters in each group
 *
 * @param uri The URI to parse
 * @param query Whether to parse the query into a record with each parameter and its value(s) or just the string.
 *  If an array is provided these are the characters that are used to split query string values. If this is empty, arrays are not parsed.
 * @returns A record with the different parts of the URI.
 */ const parseUri = (uri, { delimiters = true, requireAuthority, ...options } = {})=>uri == nil ? undefined$1 : match(uri, /^(?:(?:([\w+.-]+):)?(\/\/)?)?((?:([^:@]+)(?:\:([^@]*))?@)?(?:\[([^\]]+)\]|([0-9:]+|[^/+]+?))?(?::(\d*))?)?(\/[^#?]*)?(?:\?([^#]*))?(?:#(.*))?$/g, (source, scheme, slashes, authority, user, password, bracketHost, host, port, path, queryString, fragment)=>{
        const parsed = {
            source,
            scheme,
            urn: scheme ? !slashes : slashes ? false : undefined$1,
            authority,
            user,
            password,
            host: bracketHost !== null && bracketHost !== void 0 ? bracketHost : host,
            port: port != null ? parseInt(port) : undefined$1,
            path,
            query: delimiters === false ? queryString : queryString ? parseQueryString(queryString, {
                ...options,
                delimiters
            }) : undefined$1,
            fragment
        };
        parsed.path = parsed.path || (parsed.authority ? parsed.urn ? "" : "/" : undefined$1);
        return parsed;
    });
const parseHttpHeader = (query, options)=>parseParameters(query, "; ", options);
const parseQueryString = (query, options)=>parseParameters(query, "&", options);
const parseParameters = (query, separator, { delimiters = true, ...options } = {})=>{
    var _query_match_, _query_match;
    const parameters = map(query === null || query === void 0 ? void 0 : (_query_match = query.match(/(?:^.*?\?|^)([^#]*)/)) === null || _query_match === void 0 ? void 0 : (_query_match_ = _query_match[1]) === null || _query_match_ === void 0 ? void 0 : _query_match_.split(separator), (part)=>{
        var _parseKeyValue;
        let [key, value, values] = (_parseKeyValue = parseKeyValue(part, {
            ...options,
            delimiters: delimiters === false ? [] : delimiters === true ? undefined$1 : delimiters
        })) !== null && _parseKeyValue !== void 0 ? _parseKeyValue : [];
        return (key = key === null || key === void 0 ? void 0 : key.replace(/\[\]$/, "")) != null ? delimiters !== false ? [
            key,
            values.length > 1 ? values : value
        ] : [
            key,
            value
        ] : skip;
    });
    const results = obj(group(parameters, false), ([key, values])=>[
            key,
            delimiters !== false ? values.length > 1 ? concat(values) : values[0] : values.join(",")
        ]);
    return results ? (results[parameterListSymbol] = parameters, results) : results;
};
const toQueryString = (parameters, delimiter = ",")=>{
    var _map;
    return parameters == nil ? undefined$1 : (_map = map(parameters, ([key, value])=>{
        var _uriEncode;
        return isString(key) ? key + "=" + (isArray(value) ? map(value, uriEncode).join(delimiter) : (_uriEncode = uriEncode(value)) !== null && _uriEncode !== void 0 ? _uriEncode : "") : undefined$1;
    })) === null || _map === void 0 ? void 0 : _map.join("&");
};
const appendQueryString = (baseUri, parameters)=>{
    if (!baseUri) return undefined$1;
    const qs = toQueryString(parameters);
    return baseUri.match(/^[^?]*/)[0] + (qs ? "?" + qs : "");
};
const mergeQueryString = (currentUri, parameters)=>{
    if (!currentUri) return undefined$1;
    const current = parseQueryString(currentUri);
    forEach(parameters, ([key, value])=>{
        var _current_key;
        return current[key] = (_current_key = current[key]) !== null && _current_key !== void 0 ? _current_key : value;
    });
    return appendQueryString(currentUri, current);
};
const formatUri = (uri)=>uri == nil ? undefined$1 : join([
        uri.scheme || uri.urn === false ? (uri.scheme ? uri.scheme + ":" : "") + (!uri.urn ? "//" : "") : "",
        uri.user,
        uri.password ? ":" + uri.password : undefined$1,
        uri.user && "@",
        uri.host,
        uri.port ? ":" + uri.port : undefined$1,
        uri.path === "/" ? "" : uri.path,
        uri.query && "?" + (isString(uri.query) ? uri.query : toQueryString(uri.query)),
        uri.fragment && "#" + uri.fragment
    ], "") || undefined$1;

var _stringRuleCache, _input;
const testRegex = (s, match)=>!match || s == null ? undefined$1 : match.test(s);
const matches = (s, regex, projection)=>match(s, regex, projection, true);
/**
 * Matches a regular expression against a string and projects the matched parts, if any.
 */ const match = (s, regex, projection, map = false)=>{
    regex.lastIndex = 0;
    let lastMatch = regex.exec(s);
    if (!projection) {
        return lastMatch;
    }
    let returnValue = map ? [] : undefined$1;
    while(lastMatch){
        const value = projection(...lastMatch);
        if (value === stop) {
            break;
        }
        if (value !== skip) {
            if (map) {
                returnValue.push(value);
            } else {
                returnValue = value;
            }
        }
        lastMatch = regex.global ? regex.exec(s) : null;
        if (!(lastMatch === null || lastMatch === void 0 ? void 0 : lastMatch[0].length) && ++regex.lastIndex >= s.length) {
            break;
        }
    }
    return returnValue;
};
/**
 * Replaces reserved characters to get a regular expression that matches the string.
 */ const escapeRegEx = (input)=>input === null || input === void 0 ? void 0 : input.replace(/[\^$\\.*+?()[\]{}|]/g, "\\$&");
const REGEX_NEVER = /\z./g;
const unionOrNever = (parts, joined)=>(joined = join(distinct(filter(parts, (part)=>part === null || part === void 0 ? void 0 : part.length)), "|")) ? new RegExp(joined, "gu") : REGEX_NEVER;
const stringRuleCache = {};
const isRegEx = (value)=>value instanceof RegExp;
/**
 * Tests or parses a regular expression accepting the {@link ParsableRegExp} format.
 *
 * Strings are cached, so there is no need to do additional caching outside this function (as far as the caching would only concern strings).
 */ const parseRegex = (input, separators = [
    ",",
    " "
])=>{
    var _;
    return isRegEx(input) ? input : isArray(input) // Parse individual specifiers, and join them into one long regex. An empty array is interpreted as "never".
     ? unionOrNever(map(input, (part)=>{
        var _parseRegex;
        return (_parseRegex = parseRegex(part, separators)) === null || _parseRegex === void 0 ? void 0 : _parseRegex.source;
    })) : isBoolean(input) ? input // `true` is "always", `false` is "never"
     ? /./g : REGEX_NEVER // Matches nothing. End of string followed by something is never the case.
     : isString(input) ? (_ = (_stringRuleCache = stringRuleCache)[_input = input]) !== null && _ !== void 0 ? _ : _stringRuleCache[_input] = match(input || "", /^(?:\/(.+?)\/?|(.*))$/gu, (_, regex, text)=>regex ? new RegExp(regex, "gu") : unionOrNever(map(split(text, new RegExp(`(?<!(?<!\\\\)\\\\)[${join(separators, escapeRegEx)}]`)), (text)=>text && `^${join(// Split on non-escaped asterisk (Characterized by a leading backslash that is not itself an escaped backslash).
            split(text, RegExp("(?<!(?<!\\\\)\\\\)\\*")), (part)=>escapeRegEx(// Remove backslashes used for escaping.
                replace(part, /\\(.)/g, "$1")), // Join the parts separated by non-escaped asterisks with the regex wildcard equivalent.
            ".*")}$`))) : undefined$1;
};
/**
 * Better minifyable version of `String`'s `split` method that allows a null'ish parameter.
 */ const split = (s, separator, trim = true)=>s == null ? undefined$1 : trim ? filter(split(s, separator, false)) : s.split(separator);
/**
 * Better minifyable version of `String`'s `replace` method that allows a null'ish parameter.
 */ const replace = (s, match, replaceValue)=>{
    var _s_replace;
    return (_s_replace = s === null || s === void 0 ? void 0 : s.replace(match, replaceValue)) !== null && _s_replace !== void 0 ? _s_replace : s;
};
/**
 * Constructs a regex where whitespace is ignored in the pattern (like .NET's RegexOptions.IgnorePatternWhitespace)
 * 
 * e.g. `
  \\b    # word boundary
  (\\w+) # one or more word chars
  \\s*   # optional whitespace
  =      # equals sign
  \\s*   # optional whitespace
  (\\d+) # one or more digits
`
 */ const regex = (pattern, flags)=>new RegExp(pattern.replace(/(^|\n)\s*#.*$/gm, "") // Remove comments
    .replace(/\s+/g, ""), flags);

exports.ARRAY = ARRAY;
exports.BIGINT = BIGINT;
exports.BOOLEAN = BOOLEAN;
exports.DATE = DATE;
exports.DAY = DAY;
exports.F = F;
exports.FILTER_NULLISH = FILTER_NULLISH;
exports.FOREVER = FOREVER;
exports.FUNCTION = FUNCTION;
exports.HOUR = HOUR;
exports.IDENTITY = IDENTITY;
exports.ITERABLE = ITERABLE;
exports.InvariantViolatedError = InvariantViolatedError;
exports.MAP = MAP;
exports.MAX_SAFE_INTEGER = MAX_SAFE_INTEGER;
exports.MILLISECOND = MILLISECOND;
exports.MINUTE = MINUTE;
exports.MIN_SAFE_INTEGER = MIN_SAFE_INTEGER;
exports.NOOP = NOOP;
exports.NULL = NULL;
exports.NUMBER = NUMBER;
exports.OBJECT = OBJECT;
exports.OpenPromise = OpenPromise;
exports.PROMISE = PROMISE;
exports.ResettablePromise = ResettablePromise;
exports.SECOND = SECOND;
exports.SET = SET;
exports.STRING = STRING;
exports.SYMBOL = SYMBOL;
exports.T = T;
exports.UNDEFINED = UNDEFINED;
exports.add = add;
exports.all = all;
exports.ansi = ansi;
exports.appendQueryString = appendQueryString;
exports.array = array;
exports.asDeferred = asDeferred;
exports.asMap = asMap;
exports.asSet = asSet;
exports.assign = assign;
exports.avg = avg;
exports.awaitIfAwaitable = awaitIfAwaitable;
exports.batch = batch;
exports.changeCase = changeCase;
exports.changeIdentifierCaseStyle = changeIdentifierCaseStyle;
exports.clock = clock;
exports.clone = clone;
exports.collect = collect;
exports.concat = concat;
exports.count = count;
exports.createChainedEvent = createChainedEvent;
exports.createEnumParser = createEnumParser;
exports.createEvent = createEvent;
exports.createEventBinders = createEventBinders;
exports.createIntervals = createIntervals;
exports.createLock = createLock;
exports.createTimeout = createTimeout;
exports.createTimer = createTimer;
exports.createTypeConverter = createTypeConverter;
exports.defer = defer;
exports.deferred = deferred;
exports.deferredPromise = deferredPromise;
exports.delay = delay;
exports.dict = dict;
exports.diff = diff;
exports.distinct = distinct;
exports.ellipsis = ellipsis;
exports.equalsAny = equalsAny;
exports.escapeRegEx = escapeRegEx;
exports.exchange = exchange;
exports.filter = filter;
exports.first = first;
exports.flatMap = flatMap;
exports.forEach = forEach;
exports.forEachAwait = forEachAwait;
exports.formatDuration = formatDuration;
exports.formatError = formatError;
exports.formatTimestamp = formatTimestamp;
exports.formatUri = formatUri;
exports.get = get;
exports.getTextStats = getTextStats;
exports.group = group;
exports.hasKeys = hasKeys;
exports.hasMethod = hasMethod;
exports.hasMethods = hasMethods;
exports.hasProperty = hasProperty;
exports.ifDefined = ifDefined;
exports.indent = indent;
exports.invariant = invariant;
exports.isArray = isArray;
exports.isAsyncIterable = isAsyncIterable;
exports.isAwaitable = isAwaitable;
exports.isBigInt = isBigInt;
exports.isBoolean = isBoolean;
exports.isDate = isDate;
exports.isError = isError;
exports.isFalse = isFalse;
exports.isFalsish = isFalsish;
exports.isFinite = isFinite$1;
exports.isFunction = isFunction;
exports.isInteger = isInteger;
exports.isIterable = isIterable;
exports.isJsonObject = isJsonObject;
exports.isJsonString = isJsonString;
exports.isMap = isMap;
exports.isNotFalse = isNotFalse;
exports.isNotTrue = isNotTrue;
exports.isNullish = isNullish;
exports.isNumber = isNumber;
exports.isObject = isObject;
exports.isPlainObject = isPlainObject;
exports.isPromiseLike = isPromiseLike;
exports.isRegEx = isRegEx;
exports.isSet = isSet;
exports.isString = isString;
exports.isSymbol = isSymbol;
exports.isTrue = isTrue;
exports.isTruish = isTruish;
exports.itemize = itemize;
exports.iterable = iterable;
exports.join = join;
exports.joinEventBinders = joinEventBinders;
exports.jsonClone = jsonClone;
exports.jsonEquals = jsonEquals;
exports.keyCount = keyCount;
exports.keys = keys;
exports.last = last;
exports.map = map;
exports.mapAwait = mapAwait;
exports.match = match;
exports.matches = matches;
exports.max = max;
exports.merge = merge;
exports.mergeQueryString = mergeQueryString;
exports.min = min;
exports.mutate = mutate;
exports.nil = nil;
exports.now = now;
exports.obj = obj;
exports.parameterListSymbol = parameterListSymbol;
exports.parseBigInt = parseBigInt;
exports.parseBoolean = parseBoolean;
exports.parseDate = parseDate;
exports.parseHttpHeader = parseHttpHeader;
exports.parseJson = parseJson;
exports.parseKeyValue = parseKeyValue;
exports.parseNumber = parseNumber;
exports.parseParameters = parseParameters;
exports.parseQueryString = parseQueryString;
exports.parseRegex = parseRegex;
exports.parseUri = parseUri;
exports.pick = pick;
exports.pluralize = pluralize;
exports.priorityQueue = priorityQueue;
exports.promise = promise;
exports.push = push;
exports.quote = quote;
exports.race = race;
exports.range = range;
exports.regex = regex;
exports.remove = remove;
exports.replace = replace;
exports.required = required;
exports.reset = reset;
exports.resolveDeferred = resolveDeferred;
exports.round = round;
exports.set = set;
exports.skip = skip;
exports.snakeCase = snakeCase;
exports.some = some;
exports.sort = sort;
exports.split = split;
exports.stop = stop;
exports.stringify = stringify;
exports.structuralEquals = structuralEquals;
exports.sum = sum;
exports.symbolAsyncIterator = symbolAsyncIterator;
exports.symbolIterator = symbolIterator;
exports.take = take;
exports.testRegex = testRegex;
exports.throwError = throwError;
exports.throwTypeError = throwTypeError;
exports.toIterable = toIterable;
exports.toQueryString = toQueryString;
exports.toString = toString;
exports.toggleAnsi = toggleAnsi;
exports.topoSort = topoSort;
exports.traverse = traverse;
exports.truish = truish;
exports.tryCatch = tryCatch;
exports.tryCatchAsync = tryCatchAsync;
exports.trySet = trySet;
exports.typeCode = typeCode;
exports.undefined = undefined$1;
exports.unwrap = unwrap;
exports.update = update;
exports.uriEncode = uriEncode;
exports.validate = validate;
exports.valueTypeMarker = valueTypeMarker;
exports.waitAll = waitAll;
exports.waitFor = waitFor;
exports.withRetry = withRetry;
