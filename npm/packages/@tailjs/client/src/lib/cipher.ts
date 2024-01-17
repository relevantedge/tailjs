import { type Nullish, createTransport } from "@tailjs/util";

export const [httpEncode, httpDecode] = createTransport();

export let [httpEncrypt, httpDecrypt] = [null, null] as any; // [httpEncode, httpDecode];

export const setStorageKey = (key: string | Nullish) =>
  ([httpEncrypt, httpDecrypt] = createTransport(key));
