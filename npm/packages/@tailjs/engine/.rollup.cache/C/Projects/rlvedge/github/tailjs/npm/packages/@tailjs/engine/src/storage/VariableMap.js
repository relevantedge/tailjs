import { variableScope, } from "@tailjs/types";
import { isDefined, isFunction, isIterable, isObject, isUndefined, } from "@tailjs/util";
export const mapKey = (scope, key, targetId) => scope === 0 /* VariableScope.Global */ ? { scope, key } : { scope, key, targetId };
export class VariableMap {
    _values = new Map();
    _onSizeChanged;
    constructor(arg) {
        if (isFunction(arg)) {
            this._onSizeChanged = arg;
        }
        else if (arg) {
            this.set(arg);
        }
    }
    _size = 0;
    get size() {
        return this._size;
    }
    _updateSize(delta) {
        this._size += delta;
        this._onSizeChanged?.(delta);
    }
    get(source, arg2, initializer) {
        if (source == null)
            return undefined;
        let scope, key;
        if (isObject(source, true)) {
            scope = variableScope.parse(source.scope, false);
            key = source.key;
            initializer = arg2;
        }
        else {
            scope = variableScope.parse(source, false);
            key = arg2;
        }
        let values = this._values.get(scope);
        if (isDefined(key)) {
            let value = values?.get(key);
            if (initializer && isUndefined(value)) {
                if (!values) {
                    this._values.set(scope, (values = new Map()));
                }
                this._updateSize(1);
                values.set(key, (value = initializer(scope, key)));
            }
            return value;
        }
        return values;
    }
    has(source, key) {
        if (source == null)
            return undefined;
        if (isObject(source, true)) {
            return (this._values
                .get(variableScope.parse(source.scope, false))
                ?.has(source.key) ?? false);
        }
        const scope = variableScope.parse(source, false);
        return isDefined(key)
            ? this._values.get(scope)?.has(key) ?? false
            : this._values.has(scope);
    }
    clear() {
        this._updateSize(-this._size);
        this._values?.clear();
        return this;
    }
    delete(arg1, arg2) {
        if (arg1 == null)
            return false;
        let scope, key;
        if (isObject(arg1, true)) {
            if (isIterable(arg1)) {
                let deleted = false;
                for (const key of arg1) {
                    if (!key)
                        continue;
                    deleted =
                        (isIterable(key)
                            ? this.delete(key[0], key[1])
                            : this.delete(key)) || deleted;
                }
                return deleted;
            }
            scope = variableScope.parse(arg1.scope, false);
            key = arg1.key;
        }
        else {
            scope = variableScope.parse(arg1, false);
            key = arg2;
        }
        const values = this._values.get(scope);
        if (!values)
            return false;
        if (isDefined(key)) {
            if (!values.has(key))
                return false;
            this._updateSize(-1);
            values.delete(key);
            if (values.size)
                return true;
            // If no more keys, delete the scope.
        }
        this._updateSize(-values.size);
        this._values.delete(scope);
        return true;
    }
    set(arg1, arg2, arg3) {
        if (arg1 == null)
            return this;
        let scope, key, value;
        if (isObject(arg1, true)) {
            if (isIterable(arg1)) {
                for (const item of arg1) {
                    if (!item)
                        continue;
                    const [key, value] = item;
                    isIterable(key)
                        ? this.set(key[0], key[1], value)
                        : this.set(key, value);
                }
                return this;
            }
            scope = variableScope.parse(arg1.scope, true);
            key = arg1.key;
            value = arg2;
        }
        else {
            scope = variableScope.parse(arg1, true);
            key = arg2;
            value = arg3;
        }
        if (isUndefined(value)) {
            this.delete(scope, key);
            return this;
        }
        let values = this._values.get(scope);
        if (!values) {
            this._values.set(scope, (values = new Map()));
        }
        if (!values.has(key)) {
            this._updateSize(1);
        }
        values.set(key, value);
        return this;
    }
    update(arg1, arg2, update) {
        if (arg1 == null)
            return undefined;
        let scope, key;
        if (isObject(arg1, true)) {
            scope = variableScope.parse(arg1.scope);
            key = arg1.key;
            update = arg2;
        }
        else {
            scope = variableScope.parse(arg1);
            key = arg2;
        }
        let newValue = update(this.get(scope, key));
        this.set(scope, key, newValue);
        return newValue;
    }
    scopes(keys) {
        return keys ? this._values.keys() : this._values.entries();
    }
    *[Symbol.iterator]() {
        for (const [scope, values] of this._values) {
            for (const [key, value] of values) {
                yield [[scope, key], value];
            }
        }
    }
}
//# sourceMappingURL=VariableMap.js.map