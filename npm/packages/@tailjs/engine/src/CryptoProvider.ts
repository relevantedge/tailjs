import type { HashFunction } from "@tailjs/transport";

export interface CryptoProvider {
  hash: HashFunction<string>;
  decrypt(cipher: string): any;
  encrypt(source: any): string;
}
