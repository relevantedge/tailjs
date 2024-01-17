import { HashFunction } from "@tailjs/util";

export interface CryptoProvider {
  hash: HashFunction<string>;
  decrypt(cipher: string): any;
  encrypt(source: any): string;
}
