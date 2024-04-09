import { isDefined, isIterable, isString, isUndefined } from "@tailjs/util";
import { VariableMap, mapKey } from "..";
export class TargetedVariableCollection {
    _scopes = new Map();
    _size = 0;
    get size() {
        return this._size;
    }
    _updateSize = (delta) => {
        this._size += delta;
    };
    constructor(values) {
        if (values) {
            this.set(values);
        }
    }
    get(key, initializer) {
        if (isUndefined(key))
            return undefined;
        if (isString(key)) {
            return this._scopes.get(key);
        }
        let targetId = key.targetId ?? "";
        let collection = this._scopes.get(targetId);
        if (initializer && !collection) {
            this._scopes.set(targetId, (collection = new VariableMap(this._updateSize)));
        }
        return collection?.get(key, initializer && ((scope, key) => initializer(mapKey(scope, key, targetId))));
    }
    has(source, scope) {
        if (isUndefined(source))
            return undefined;
        if (isString(source)) {
            return isDefined(scope)
                ? this._scopes.get(source)?.has(scope) ?? false
                : this._scopes.has(source);
        }
        return this._scopes.get(source.targetId ?? "")?.has(source) ?? false;
    }
    clear() {
        this._updateSize(-this._size);
        this._scopes.clear();
        return this;
    }
    delete(key) {
        if (isUndefined(key))
            return false;
        if (isIterable(key)) {
            let deleted = false;
            for (const item of key) {
                isDefined(item) && (deleted = this.delete(item) || deleted);
            }
            return deleted;
        }
        if (isString(key)) {
            const scopes = this._scopes.get(key);
            if (!scopes) {
                return false;
            }
            this._updateSize(-scopes.size);
            this._scopes.delete(key);
            return true;
        }
        return this._scopes.get(key.targetId ?? "")?.delete(key) ?? false;
    }
    set(key, value) {
        if (isUndefined(key))
            return this;
        if (isIterable(key)) {
            for (const item of key) {
                item && this.set(item[0], item[1]);
            }
            return this;
        }
        if (isUndefined(value)) {
            this.delete(key);
            return this;
        }
        const targetId = key.targetId ?? "";
        let scopes = this._scopes.get(targetId);
        if (!this._scopes.has(targetId)) {
            this._scopes.set(targetId, (scopes = new VariableMap(this._updateSize)));
        }
        scopes?.set(key, value);
        return this;
    }
    update(key, update) {
        if (!key)
            return undefined;
        let newValue = update(this.get(key));
        this.set(key, newValue);
        return newValue;
    }
    targets(keys) {
        return keys ? this._scopes.keys() : this._scopes.entries();
    }
    *[Symbol.iterator]() {
        for (const [targetId, scopes] of this._scopes) {
            for (const [[scope, key], value] of scopes) {
                yield [mapKey(scope, key, targetId), value];
            }
        }
    }
}
//# sourceMappingURL=TargetedVariableMap.js.map