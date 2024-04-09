import { isDefined, isFunction } from ".";
export class ResetablePromise {
    _promise;
    constructor() {
        this.reset();
    }
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
}
export class OpenPromise {
    _promise;
    resolve;
    reject;
    value;
    error;
    pending = true;
    constructor() {
        let captured;
        this._promise = new Promise((...args) => {
            captured = args.map((inner, i) => (value, ifPending) => {
                if (!this.pending) {
                    if (ifPending)
                        return this;
                    throw new TypeError("Promise already resolved/rejected.");
                }
                this.pending = false;
                this[i ? "error" : "value"] = !isDefined(value) || value;
                inner(value);
                return this;
            });
        });
        [this.resolve, this.reject] = captured;
    }
    then(onfulfilled, onrejected) {
        return this._promise.then(onfulfilled, onrejected);
    }
}
export const delay = (ms, action) => new Promise((resolve) => setTimeout(() => resolve(action?.()), ms));
export const promise = (resetable) => resetable ? new ResetablePromise() : new OpenPromise();
export const waitAll = (args) => Promise.all(args.map((arg) => (isFunction(arg) ? arg() : arg)));
export const race = (args) => Promise.race(args.map((arg) => (isFunction(arg) ? arg() : arg)));
//# sourceMappingURL=concurrency.js.map