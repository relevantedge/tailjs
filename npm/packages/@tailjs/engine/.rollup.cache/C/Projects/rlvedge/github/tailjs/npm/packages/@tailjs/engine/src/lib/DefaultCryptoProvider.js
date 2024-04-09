import { createTransport, defaultTransport, hash, } from "@tailjs/util/transport";
/**
 * A crypto provider based on linear feedback XOR, entropy and padding.
 */
export class DefaultCryptoProvider {
    _currentCipherId;
    _ciphers;
    constructor(keys) {
        if (!keys?.length) {
            this._currentCipherId = "";
            this._ciphers = { "": defaultTransport };
            return;
        }
        this._ciphers = Object.fromEntries(keys.map((key) => [hash(key, 32), createTransport(key)]));
        this._currentCipherId = hash(keys[0], 32);
    }
    hash(value, numericOrBits) {
        return this._ciphers[this._currentCipherId][2](value, numericOrBits);
    }
    decrypt(cipher) {
        let cipherId = "";
        cipher = cipher.replace(/^(.*?)!/, (_, m1) => ((cipherId = m1), ""));
        return (this._ciphers[cipherId] ?? this._ciphers[this._currentCipherId])[1](cipher);
    }
    encrypt(source) {
        return `${this._currentCipherId}!${this._ciphers[this._currentCipherId][0](source)}`;
    }
}
//# sourceMappingURL=DefaultCryptoProvider.js.map