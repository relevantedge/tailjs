import {
  Transport,
  createTransport,
  defaultTransport,
  hash,
} from "@tailjs/transport";
import { CryptoProvider } from "..";

/**
 * A crypto provider based on linear feedback XOR, entropy and padding.
 */
export class DefaultCryptoProvider implements CryptoProvider {
  private readonly _currentCipherId: string;
  private readonly _ciphers: Record<string, Transport>;

  constructor(keys: string[] | null | undefined) {
    if (!keys?.length) {
      this._currentCipherId = "";
      this._ciphers = { "": defaultTransport };
      return;
    }

    this._ciphers = Object.fromEntries(
      keys.map((key) => [hash(key, 32), createTransport(key)])
    );
    this._currentCipherId = hash(keys[0], 32);
  }

  hash(value: string, numericOrBits?: any): string {
    return this._ciphers[this._currentCipherId][2](value, numericOrBits) as any;
  }

  decrypt(cipher: string): any {
    let cipherId = "";
    cipher = cipher.replace(/^(.*?)!/, (_, m1) => ((cipherId = m1), ""));
    return (this._ciphers[cipherId] ?? this._ciphers[this._currentCipherId])[1](
      cipher
    );
  }
  encrypt(source: string): string {
    return `${this._currentCipherId}!${this._ciphers[this._currentCipherId][0](
      source
    )}`;
  }
}
