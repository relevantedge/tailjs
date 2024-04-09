export class InsideOutPromise {
    _error = undefined;
    _promise;
    _reject;
    _resolve;
    _value = undefined;
    constructor() {
        this._promise = new Promise((resolve, reject) => {
            this._resolve = resolve;
            this._reject = reject;
        });
    }
    get error() {
        return this._error;
    }
    get value() {
        return this._value;
    }
    reject(error) {
        this._reject(error);
    }
    resolve(value) {
        this._resolve(value);
    }
    then(onfulfilled, onrejected) {
        return this._promise.then(onfulfilled, onrejected);
    }
}
//# sourceMappingURL=InsideOutPromise.js.map